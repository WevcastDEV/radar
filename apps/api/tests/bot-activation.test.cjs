const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the actual service/controller methods with transport dependencies stubbed.
// Constructors are bypassed so no production files, sockets or messages are touched.
function loadClass(relativePath, name) {
  const source = fs.readFileSync(path.join(__dirname, '../src/whatsapp', relativePath), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.CommonJS, experimentalDecorators: true },
  }).outputText;
  const exports = {};
  const dependencyStub = new Proxy({}, { get: () => function () { return () => {}; } });
  vm.runInNewContext(compiled, {
    exports, Map, Date, setTimeout, clearTimeout,
    require: (id) => id === '@nestjs/common' || id === 'fs' || id === 'path' ? require(id) : dependencyStub,
  }, { filename: relativePath });
  return exports[name];
}

const BotFlowService = loadClass('flow/bot-flow.service.ts', 'BotFlowService');
const WhatsappService = loadClass('whatsapp.service.ts', 'WhatsappService');
const WhatsappController = loadClass('whatsapp.controller.ts', 'WhatsappController');
const logger = { log() {}, warn() {}, error() {} };

function createFlowService() {
  const service = Object.create(BotFlowService.prototype);
  Object.assign(service, {
    flows: ['a', 'b'].map(id => ({ id, name: id, isActive: false, steps: [{ id: `${id}-first`, message: `Welcome ${id}` }] })),
    activeFlowId: '', sessions: new Map(), logger, saveFlowsToDisk() {},
  });
  return service;
}

test('saving drafts cannot enable automation or overwrite the active flow', () => {
  const flows = createFlowService();
  flows.saveFlow({ id: 'new', isActive: true, steps: [] });
  assert.equal(flows.getActiveFlow(), null);
  flows.setActiveFlow('a');
  flows.saveFlow({ id: 'a', name: 'Edited', isActive: false });
  flows.saveFlow({ id: 'b', isActive: true });
  assert.equal(flows.getActiveFlow().id, 'a');
  assert.equal(flows.getFlowById('a').name, 'Edited');
  flows.saveAllFlows(flows.getAllFlows().map(flow => ({ ...flow, isActive: flow.id === 'b' })));
  assert.equal(flows.getActiveFlow().id, 'a');
});

test('explicit activation validates targets and starts a new flow at its first step', () => {
  const flows = createFlowService();
  flows.setActiveFlow('a');
  assert.equal(flows.processMessage('client', 'hello').reply, 'Welcome a');
  assert.equal(flows.setActiveFlow('all'), null);
  assert.equal(flows.setActiveFlow('missing'), null);
  assert.equal(flows.getActiveFlow().id, 'a');
  flows.saveFlow({ id: 'empty', steps: [] });
  assert.equal(flows.setActiveFlow('empty'), null);
  flows.setActiveFlow('b');
  assert.equal(flows.processMessage('client', 'hello').reply, 'Welcome b');
  flows.deactivateFlow('all');
  assert.equal(flows.isBotActive(), false);
  assert.equal(flows.processMessage('client', 'hello').reply, null);
});

test('activation uses the requested device and rejects missing/empty flows before enabling replies', () => {
  const flows = createFlowService();
  const calls = [];
  const controller = new WhatsappController({ setAutoReplyEnabled: (...args) => calls.push(args) }, {}, flows, {});
  assert.throws(() => controller.activateFlow('missing', 'desktop'), /Fluxo não encontrado/);
  assert.throws(() => controller.activateFlow('all', 'desktop'), /Fluxo não encontrado/);
  flows.saveFlow({ id: 'empty', steps: [] });
  assert.throws(() => controller.activateFlow('empty', 'desktop'), /pelo menos uma etapa/);
  assert.equal(calls.length, 0);
  controller.activateFlow('a', 'desktop');
  assert.deepEqual(calls, [[true, 'desktop']]);
  assert.throws(() => controller.deactivateFlow('missing', 'desktop'), /Fluxo não encontrado/);
  controller.deactivateFlow('all', 'desktop');
  assert.deepEqual(calls[1], [false, 'desktop']);
  assert.equal(flows.isBotActive(), false);
});

test('status combines the persisted active flow with the effective device reply switch', () => {
  const flows = createFlowService();
  const service = Object.create(WhatsappService.prototype);
  const session = { deviceId: 'desktop', isConnected: true, isAutoReplyEnabled: true };
  Object.assign(service, {
    botFlowService: flows, deviceSessions: new Map(), getSession: () => session,
    refreshRateLimitCounters() {}, getQueueStatus: () => ({}), isWithinSafeHours: () => true, checkSafetyGate: () => ({}),
  });
  assert.equal(service.getStatus('desktop').isFlowActive, false);
  flows.setActiveFlow('a');
  assert.equal(service.getStatus('desktop').isFlowActive, true);
  assert.equal(service.getStatus('desktop').activeFlowId, 'a');
  session.isAutoReplyEnabled = false;
  assert.equal(service.getStatus('desktop').isFlowActive, false);
  flows.deactivateAllFlows();
  assert.equal(service.getStatus('desktop').activeFlow, null);
});

test('incoming messages stay recorded but cannot trigger replies without an active flow', async () => {
  const flows = createFlowService();
  const service = Object.create(WhatsappService.prototype);
  let recorded = 0;
  let replies = 0;
  Object.assign(service, {
    botFlowService: flows, logger, getDispatchedHistory: () => [], processIncomingLeadReply() {},
    conversationBrain: { recordClientMessage() { recorded++; }, identifyContact: () => ({ isAmigo: false }) },
    registerAttendedPhone() {}, isTestNumber: () => false,
    isPersonalOrIgnoredContact: () => ({ isIgnored: false }), isHumanHandled: () => false,
    handleBotLogic: async () => { replies++; },
  });
  const message = { key: { remoteJid: '559999999999@s.whatsapp.net' }, message: { conversation: 'Olá' } };
  const device = { isAutoReplyEnabled: true };
  await service.handleIncomingMessage(message, 'notify', device);
  assert.equal(recorded, 1);
  assert.equal(replies, 0);
  flows.setActiveFlow('a');
  await service.handleIncomingMessage(message, 'notify', device);
  assert.equal(replies, 1);
  device.isAutoReplyEnabled = false;
  await service.handleIncomingMessage(message, 'notify', device);
  assert.equal(replies, 1);
});
