const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(relative, dependencies = {}, globals = {}) {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src', relative), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 } }).outputText;
  vm.runInNewContext(compiled, { exports, require: id => dependencies[id] || require(id), process, AbortSignal, ...globals });
  return exports;
}
const { activateBotAutomation, deactivateBotAutomation } = load('lib/bot-automation.ts');
const flow = { id: 'custom', name: 'Custom', steps: [{ id: 'start' }], isActive: false };
const envelope = data => ({ data: { success: true, data } });
test('Chat Comercial saves a local draft before activating and requires runtime confirmation', async () => {
  const calls = [];
  const status = { autoReplyEnabled: true, isFlowActive: true, activeFlowId: flow.id };
  const client = {
    post: async (url, body) => { calls.push([url, body]); return envelope(url === '/flows' ? flow : { ...flow, isActive: true }); },
    get: async url => { calls.push([url]); return envelope(status); },
  };
  assert.equal(await activateBotAutomation(client, flow), status);
  assert.deepEqual(calls.map(c => c[0]), ['/flows', '/flows/custom/activate', '/status?fresh=1']);
  assert.equal(Object.hasOwn(calls[0][1], 'isActive'), false);
});
test('failed save never proceeds to activation', async () => {
  let calls = 0;
  await assert.rejects(activateBotAutomation({ post: async () => { calls++; return { data: { success: false, message: 'offline' } }; } }, flow), /offline/);
  assert.equal(calls, 1);
});
test('HTTP 200 with rejected activation or unconfirmed runtime cannot report success', async () => {
  const client = { post: async url => url === '/flows' ? envelope(flow) : { data: { success: false, message: 'missing' } } };
  await assert.rejects(activateBotAutomation(client, flow), /missing/);
  client.post = async () => envelope({ ...flow, isActive: true });
  client.get = async () => envelope({ isFlowActive: false });
  await assert.rejects(activateBotAutomation(client, flow), /ainda não foi confirmada/);
});
test('deactivation silences all flows and verifies status', async () => {
  const calls = [];
  const client = {
    post: async url => { calls.push(url); return envelope({}); },
    get: async () => envelope({ isFlowActive: false, activeFlowId: null }),
  };
  await deactivateBotAutomation(client);
  assert.deepEqual(calls, ['/flows/all/deactivate']);
  client.get = async () => envelope({ isFlowActive: true, activeFlowId: flow.id });
  await assert.rejects(deactivateBotAutomation(client), /não confirmou/);
});
const nextStub = { NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } };
const request = { method: 'POST', headers: { get: name => name === 'x-device-id' ? 'desktop' : '' }, text: async () => '' };
test('proxy forwards device and preserves backend errors', async () => {
  let forwarded;
  const { proxyWhatsAppFlows } = load('lib/whatsapp-flow-proxy.ts', { 'next/server': nextStub }, {
    fetch: async (url, options) => { forwarded = options; return { ok: false, status: 404, json: async () => ({ success: false, message: 'missing' }) }; },
  });
  const result = await proxyWhatsAppFlows(request, '/missing/activate');
  assert.equal(result.status, 404);
  assert.equal(forwarded.headers['x-device-id'], 'desktop');
});
test('unavailable backend cannot fabricate successful activation', async () => {
  const { proxyWhatsAppFlows } = load('lib/whatsapp-flow-proxy.ts', { 'next/server': nextStub }, { fetch: async () => { throw new Error('offline'); } });
  const result = await proxyWhatsAppFlows(request, '/custom/activate');
  assert.equal(result.status, 502);
  assert.equal(result.body.success, false);
});
