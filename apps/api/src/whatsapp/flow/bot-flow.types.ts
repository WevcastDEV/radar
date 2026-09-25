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
  message: string;        // Mensagem a enviar (suporta variáveis como {{nome_cliente}} e spintax {Olá|Oi})
  options?: FlowOption[]; // Usado para 'question_choice'
  freeTextNextStepId?: string; // Usado para 'question_text' ou resposta livre
  saveToField?: string;   // Ex: 'nome', 'servico', 'horario_preferido', 'observacao'
  isEnd?: boolean;        // Se for o encerramento automático
  action?: 'none' | 'qualify_lead' | 'transfer_human' | 'mark_hot' | 'end';
}

export interface FaqRule {
  id: string;
  keywords: string[];     // Ex: ["preco", "valor", "quanto custa", "tabela"]
  reply: string;          // Resposta imediata
  action?: 'continue' | 'transfer_human' | 'end';
}

export interface BotFlow {
  id: string;
  name: string;
  segment: string;        // Ex: "Clínicas & Saúde", "Pet Shop", "TI & Software", "Restaurantes", etc.
  companyName: string;    // Nome da empresa utilizado nos diálogos
  description: string;
  isActive: boolean;
  isTemplate?: boolean;
  createdAt: number;
  updatedAt: number;
  steps: BotStep[];
  faqRules?: FaqRule[];
  rejectionMessage?: string;
}

export interface UserFlowSession {
  flowId: string;
  currentStepId: string;
  collectedData: Record<string, string>;
  lastInteractionAt: number;
  history: Array<{ sender: 'bot' | 'user'; text: string; timestamp: number }>;
}
