import { DEFAULT_BOT_FLOWS } from './default-flows';

export type StepType = 
  | 'greeting' 
  | 'question_choice' 
  | 'question_text' 
  | 'faq_reply' 
  | 'action_transfer' 
  | 'closing';

export interface FlowOption {
  id: string;
  key: string;            // Ex: "1", "2", "sim", "agendar"
  label: string;          // Ex: "Agendar Horário"
  nextStepId: string;     // ID do próximo passo
  action?: 'none' | 'qualify_lead' | 'transfer_human' | 'mark_hot' | 'end';
}

export interface BotStep {
  id: string;
  title: string;
  type: StepType;
  message: string;
  options?: FlowOption[];
  freeTextNextStepId?: string;
  saveToField?: string;
  isEnd?: boolean;
  action?: 'none' | 'qualify_lead' | 'transfer_human' | 'mark_hot' | 'end';
}

export interface FaqRule {
  id: string;
  keywords: string[];
  reply: string;
  action?: 'continue' | 'transfer_human' | 'end';
}

export interface BotFlow {
  id: string;
  name: string;
  segment: string;
  companyName: string;
  description: string;
  isActive: boolean;
  isTemplate?: boolean;
  createdAt: number;
  updatedAt: number;
  steps: BotStep[];
  faqRules?: FaqRule[];
  rejectionMessage?: string;
}

export const FLOWS_STORAGE_KEY = 'radar_bot_flows_v1';
export const ACTIVE_FLOW_ID_KEY = 'radar_active_flow_id_v1';

export function normalizeFlowText(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function parseSpintax(text: string): string {
  if (!text) return '';
  const spintaxRegex = /\{([^{}]+)\}/g;
  let matches = true;
  let result = text;
  while (matches) {
    const prev = result;
    result = result.replace(spintaxRegex, (_, choices) => {
      const options = choices.split('|');
      return options[Math.floor(Math.random() * options.length)];
    });
    matches = result !== prev;
  }
  return result;
}

export function compileFlowText(
  templateText: string,
  flow: BotFlow,
  leadInfo?: any,
  collectedData?: Record<string, string>
): string {
  let text = templateText || '';
  const leadName =
    leadInfo?.name ||
    leadInfo?.leadName ||
    collectedData?.nome ||
    collectedData?.nome_paciente ||
    'Cliente';
  const company = flow.companyName || 'Nossa Empresa';
  const city = leadInfo?.city || leadInfo?.address?.city || 'sua região';
  const segment = flow.segment || 'Comércio';

  text = text
    .replace(/\{\{nome_cliente\}\}/gi, leadName)
    .replace(/\{\{lead_name\}\}/gi, leadName)
    .replace(/\{\{minha_empresa\}\}/gi, company)
    .replace(/\{\{nome_empresa\}\}/gi, company)
    .replace(/\{\{cidade\}\}/gi, city)
    .replace(/\{\{segmento\}\}/gi, segment);

  if (collectedData) {
    for (const [key, val] of Object.entries(collectedData)) {
      text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), val);
    }
  }

  return parseSpintax(text);
}

export function getStoredFlows(): BotFlow[] {
  if (typeof window === 'undefined') return DEFAULT_BOT_FLOWS;
  try {
    const raw = localStorage.getItem(FLOWS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_BOT_FLOWS;
}

export function saveStoredFlows(flows: BotFlow[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FLOWS_STORAGE_KEY, JSON.stringify(flows));
  } catch {}
}

export function getActiveFlowIdFromStorage(flows: BotFlow[]): string {
  if (typeof window !== 'undefined') {
    try {
      const savedId = localStorage.getItem(ACTIVE_FLOW_ID_KEY);
      if (savedId && flows.some((f) => f.id === savedId)) {
        return savedId;
      }
    } catch {}
  }
  const active = flows.find((f) => f.isActive) || flows[0];
  return active?.id || 'flow-clinica-saude';
}

export function setActiveFlowIdInStorage(flowId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACTIVE_FLOW_ID_KEY, flowId);
  } catch {}
}

export function simulateFlowStep(
  flow: BotFlow,
  currentStepId: string | null,
  userMessage: string,
  collectedData: Record<string, string> = {}
): {
  nextStepId: string;
  botReply: string;
  isEnd: boolean;
  action?: string;
  updatedData: Record<string, string>;
} {
  if (!flow || !flow.steps || flow.steps.length === 0) {
    return {
      nextStepId: '',
      botReply: 'Fluxo não configurado ou sem etapas.',
      isEnd: true,
      updatedData: collectedData,
    };
  }

  const norm = normalizeFlowText(userMessage);

  // 1. FAQ check
  if (flow.faqRules && flow.faqRules.length > 0) {
    for (const rule of flow.faqRules) {
      if (rule.keywords.some((k) => norm.includes(normalizeFlowText(k)))) {
        return {
          nextStepId: currentStepId || flow.steps[0].id,
          botReply: compileFlowText(rule.reply, flow, undefined, collectedData),
          isEnd: rule.action === 'end',
          action: rule.action,
          updatedData: collectedData,
        };
      }
    }
  }

  // 2. Se não tem currentStepId, inicia pelo primeiro
  if (!currentStepId) {
    const first = flow.steps[0];
    return {
      nextStepId: first.id,
      botReply: compileFlowText(first.message, flow, undefined, collectedData),
      isEnd: Boolean(first.isEnd),
      action: first.action,
      updatedData: collectedData,
    };
  }

  const step = flow.steps.find((s) => s.id === currentStepId) || flow.steps[0];
  const data = { ...collectedData };

  // 3. Verifica opções
  if (step.options && step.options.length > 0) {
    let opt = step.options.find((o) => normalizeFlowText(o.key) === norm);
    if (!opt) {
      opt = step.options.find((o) => norm.includes(normalizeFlowText(o.label)));
    }

    if (opt) {
      if (step.saveToField) data[step.saveToField] = opt.label;
      const next = flow.steps.find((s) => s.id === opt!.nextStepId);
      if (next) {
        return {
          nextStepId: next.id,
          botReply: compileFlowText(next.message, flow, undefined, data),
          isEnd: Boolean(next.isEnd),
          action: opt.action || next.action,
          updatedData: data,
        };
      }
    }
  }

  // 4. Texto livre / Próximo passo
  if (step.saveToField) data[step.saveToField] = userMessage;
  const next = step.freeTextNextStepId
    ? flow.steps.find((s) => s.id === step.freeTextNextStepId)
    : flow.steps[flow.steps.findIndex((s) => s.id === step.id) + 1];

  if (next) {
    return {
      nextStepId: next.id,
      botReply: compileFlowText(next.message, flow, undefined, data),
      isEnd: Boolean(next.isEnd),
      action: next.action,
      updatedData: data,
    };
  }

  // 5. Final
  return {
    nextStepId: 'FINAL',
    botReply:
      flow.steps[flow.steps.length - 1]?.message
        ? compileFlowText(flow.steps[flow.steps.length - 1].message, flow, undefined, data)
        : 'Atendimento concluído! Um especialista humano entrará em contato em instantes.',
    isEnd: true,
    action: 'transfer_human',
    updatedData: data,
  };
}
