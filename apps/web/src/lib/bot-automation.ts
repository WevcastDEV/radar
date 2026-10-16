import type { BotFlow } from './bot-flow';

type BotClient = {
  get: (path: string) => Promise<{ data: any }>;
  post: (path: string, body?: any) => Promise<{ data: any }>;
};

function confirmedData(response: { data: any }) {
  if (!response.data || response.data.success === false) {
    throw new Error(response.data?.message || 'O serviço não confirmou a alteração do robô.');
  }
  return response.data.data ?? response.data;
}

export async function activateBotAutomation(client: BotClient, flow: BotFlow) {
  if (!flow?.id || !flow.steps?.length) throw new Error('Escolha um fluxo com etapas de atendimento.');
  // Synchronize drafts created in this browser before requesting activation.
  // Editing content cannot change the server's activation state.
  const { isActive, ...content } = flow;
  confirmedData(await client.post('/flows', content));
  const active = confirmedData(await client.post(`/flows/${encodeURIComponent(flow.id)}/activate`));
  if (active.id !== flow.id || active.isActive !== true) {
    throw new Error('O serviço não confirmou a ativação do fluxo escolhido.');
  }
  const status = confirmedData(await client.get('/status?fresh=1'));
  if (status.isFlowActive !== true || status.activeFlowId !== flow.id || status.autoReplyEnabled !== true) {
    throw new Error('A ativação ainda não foi confirmada. Atualize o conector do WhatsApp e tente novamente.');
  }
  return status;
}

export async function deactivateBotAutomation(client: BotClient) {
  confirmedData(await client.post('/flows/all/deactivate'));
  const status = confirmedData(await client.get('/status?fresh=1'));
  if (status.isFlowActive !== false || status.activeFlowId) {
    throw new Error('O serviço não confirmou que o robô foi silenciado.');
  }
  return status;
}
