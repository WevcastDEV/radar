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
