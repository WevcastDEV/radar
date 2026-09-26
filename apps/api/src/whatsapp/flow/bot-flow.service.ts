import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { BotFlow, BotStep, UserFlowSession } from './bot-flow.types';
import { DEFAULT_BOT_FLOWS } from './default-flows';

function parseSpintax(text: string): string {
  if (!text) return '';
  return text.replace(/\{([^{}]+)\}/g, (_match, group) => {
    const choices = group.split('|').map((s: string) => s.trim());
    return choices[Math.floor(Math.random() * choices.length)] || '';
  });
}

function normalizeText(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

@Injectable()
export class BotFlowService {
  private readonly logger = new Logger(BotFlowService.name);
  private flows: BotFlow[] = [];
  private activeFlowId: string = 'flow-clinica-saude';
  private sessions: Map<string, UserFlowSession> = new Map();

  constructor() {
    this.loadFlows();
  }

  private getFlowsFilePath(): string {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    return path.join(dataDir, 'bot_flows.json');
  }

  private loadFlows() {
    try {
      const file = this.getFlowsFilePath();
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.flows = parsed;
          // Mescla novos templates adicionados ao sistema preservando customizações do usuário
          for (const defaultFlow of DEFAULT_BOT_FLOWS) {
            const exists = this.flows.some(f => f.id === defaultFlow.id);
            if (!exists) {
              this.flows.push(defaultFlow);
            }
          }
          const active = this.flows.find(f => f.isActive);
          if (active) this.activeFlowId = active.id;
          this.saveFlowsToDisk();
          this.logger.log(`Carregados ${this.flows.length} fluxos de conversação. Fluxo ativo: "${this.activeFlowId}".`);
          return;
        }
      }
    } catch (e: any) {
      this.logger.error(`Erro ao carregar bot_flows.json: ${e?.message}`);
    }

    // Inicializa com templates padrão
    this.flows = [...DEFAULT_BOT_FLOWS];
    const active = this.flows.find(f => f.isActive);
    if (active) this.activeFlowId = active.id;
    this.saveFlowsToDisk();
  }

  private saveFlowsToDisk() {
    try {
      fs.writeFileSync(this.getFlowsFilePath(), JSON.stringify(this.flows, null, 2), 'utf8');
    } catch (e: any) {
      this.logger.error(`Erro ao salvar bot_flows.json: ${e?.message}`);
    }
  }

  getAllFlows(): BotFlow[] {
    return this.flows;
  }

  getFlowById(id: string): BotFlow | null {
    return this.flows.find(f => f.id === id) || null;
  }

  getActiveFlow(): BotFlow | null {
    return this.flows.find(f => f.id === this.activeFlowId) || this.flows[0] || null;
  }

  setActiveFlow(id: string): BotFlow | null {
    const found = this.flows.find(f => f.id === id);
    if (!found) return null;

    this.flows = this.flows.map(f => ({
      ...f,
      isActive: f.id === id,
    }));
    this.activeFlowId = id;
    this.saveFlowsToDisk();
    this.logger.log(`Fluxo ativado para o robô: "${found.name}" (${found.id})`);
    return found;
  }

  saveFlow(flowData: Partial<BotFlow>): BotFlow {
    const now = Date.now();
    let flow: BotFlow;

    if (flowData.id) {
      const idx = this.flows.findIndex(f => f.id === flowData.id);
      if (idx >= 0) {
        flow = {
          ...this.flows[idx],
          ...flowData,
          updatedAt: now,
        } as BotFlow;
        this.flows[idx] = flow;
      } else {
        flow = {
          id: flowData.id,
          name: flowData.name || 'Novo Fluxo de Conversação',
          segment: flowData.segment || 'Geral',
          companyName: flowData.companyName || 'Nossa Empresa',
          description: flowData.description || '',
          isActive: Boolean(flowData.isActive),
          createdAt: now,
          updatedAt: now,
          steps: flowData.steps || [],
          faqRules: flowData.faqRules || [],
          rejectionMessage: flowData.rejectionMessage,
        };
        this.flows.push(flow);
      }
    } else {
      const newId = `flow-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      flow = {
        id: newId,
        name: flowData.name || 'Novo Fluxo de Conversação',
        segment: flowData.segment || 'Geral',
        companyName: flowData.companyName || 'Nossa Empresa',
        description: flowData.description || '',
        isActive: Boolean(flowData.isActive),
        createdAt: now,
        updatedAt: now,
        steps: flowData.steps || [],
        faqRules: flowData.faqRules || [],
        rejectionMessage: flowData.rejectionMessage,
      };
      this.flows.push(flow);
    }

    if (flow.isActive) {
      this.activeFlowId = flow.id;
      this.flows = this.flows.map(f => ({ ...f, isActive: f.id === flow.id }));
    }

    this.saveFlowsToDisk();
    return flow;
  }

  deleteFlow(id: string): boolean {
    const initialLen = this.flows.length;
    this.flows = this.flows.filter(f => f.id !== id);
    if (this.flows.length !== initialLen) {
      if (this.activeFlowId === id && this.flows.length > 0) {
        this.flows[0].isActive = true;
        this.activeFlowId = this.flows[0].id;
      }
      this.saveFlowsToDisk();
      return true;
    }
    return false;
  }

  resetSession(senderId: string) {
    this.sessions.delete(senderId);
  }

  getSession(senderId: string): UserFlowSession | undefined {
    return this.sessions.get(senderId);
  }

  private compileText(templateText: string, flow: BotFlow, leadInfo?: any, collectedData?: Record<string, string>): string {
    let text = templateText || '';
    const leadName = leadInfo?.name || leadInfo?.leadName || collectedData?.nome || collectedData?.nome_paciente || 'Cliente';
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

  /**
   * Processa uma mensagem recebida de um cliente WhatsApp no contexto do fluxo ativo
   */
  processMessage(senderId: string, incomingText: string, leadInfo?: any): {
    reply: string | null;
    action?: string;
    isEnd?: boolean;
    stepTitle?: string;
  } {
    const flow = this.getActiveFlow();
    if (!flow || !flow.steps || flow.steps.length === 0) {
      return { reply: null };
    }

    const cleanInput = (incomingText || '').trim();
    const norm = normalizeText(cleanInput);

    // Se o cliente digitar comando explícito para reiniciar
    if (norm === 'menu' || norm === 'inicio' || norm === 'iniciar' || norm === 'comecar' || norm === 'reiniciar') {
      this.resetSession(senderId);
    }

    // 1. Dúvidas Frequentes (FAQ) Globais do Fluxo
    if (flow.faqRules && flow.faqRules.length > 0) {
      for (const rule of flow.faqRules) {
        const matches = rule.keywords.some(k => norm.includes(normalizeText(k)));
        if (matches) {
          const compiledReply = this.compileText(rule.reply, flow, leadInfo);
          return {
            reply: compiledReply,
            action: rule.action,
            isEnd: rule.action === 'end',
            stepTitle: 'Dúvida Frequente (FAQ)',
          };
        }
      }
    }

    let session = this.sessions.get(senderId);

    // Se a sessão expirou por inatividade (mais de 2 horas) ou foi finalizada, reinicia para acolher nova mensagem
    if (session) {
      const isExpired = session.lastInteractionAt && (Date.now() - session.lastInteractionAt > 2 * 60 * 60 * 1000);
      const isFinished = session.currentStepId === 'FINALIZADO';
      const isRestartCmd = norm === 'menu' || norm === 'inicio' || norm === 'iniciar' || norm === 'comecar' || norm === 'reiniciar';

      if (isExpired || isFinished || isRestartCmd) {
        this.resetSession(senderId);
        session = undefined;
      }
    }

    // Se não há sessão iniciada, envia o primeiro passo do fluxo
    if (!session) {
      const firstStep = flow.steps[0];
      session = {
        flowId: flow.id,
        currentStepId: firstStep.id,
        collectedData: {},
        lastInteractionAt: Date.now(),
        history: [{ sender: 'user', text: cleanInput, timestamp: Date.now() }],
      };
      this.sessions.set(senderId, session);

      const compiled = this.compileText(firstStep.message, flow, leadInfo, session.collectedData);
      return {
        reply: compiled,
        action: firstStep.action,
        isEnd: firstStep.isEnd,
        stepTitle: firstStep.title,
      };
    }

    // Se já há sessão, localiza o passo atual
    const currentStep = flow.steps.find(s => s.id === session!.currentStepId) || flow.steps[0];
    session.history.push({ sender: 'user', text: cleanInput, timestamp: Date.now() });
    session.lastInteractionAt = Date.now();

    // Se o passo atual era de encerramento, o robô encerra ou silencia
    if (currentStep.isEnd) {
      return { reply: null, isEnd: true, action: 'transfer_human' };
    }

    let nextStep: BotStep | null = null;
    let actionTriggered: string | undefined = undefined;

    // Cenário A: Pergunta de Múltipla Escolha (options)
    if (currentStep.options && currentStep.options.length > 0) {
      // 1. Tenta correspondência exata por chave (ex: "1", "2")
      let matchedOpt = currentStep.options.find(opt => normalizeText(opt.key) === norm);

      // 2. Se não bateu com a chave, tenta correspondência de texto no rótulo da opção
      if (!matchedOpt) {
        matchedOpt = currentStep.options.find(opt => {
          const optLabelNorm = normalizeText(opt.label);
          return norm.includes(optLabelNorm) || optLabelNorm.includes(norm);
        });
      }

      if (matchedOpt) {
        actionTriggered = matchedOpt.action;
        nextStep = flow.steps.find(s => s.id === matchedOpt!.nextStepId) || null;
        if (currentStep.saveToField) {
          session.collectedData[currentStep.saveToField] = matchedOpt.label;
        }
      } else {
        // Se a pessoa respondeu texto livre ou opção inválida:
        if (currentStep.freeTextNextStepId) {
          nextStep = flow.steps.find(s => s.id === currentStep.freeTextNextStepId) || null;
          if (currentStep.saveToField) {
            session.collectedData[currentStep.saveToField] = cleanInput;
          }
        } else {
          // Repete as opções disponíveis de maneira amigável
          const optionsPrompt = currentStep.options.map(o => `*${o.key}* - ${o.label}`).join('\n');
          return {
            reply: `Por favor, digite o número da opção desejada:\n\n${optionsPrompt}`,
            stepTitle: currentStep.title,
          };
        }
      }
    } else {
      // Cenário B: Pergunta de Texto Livre (question_text ou greeting sem opções)
      if (currentStep.saveToField) {
        session.collectedData[currentStep.saveToField] = cleanInput;
      }
      if (currentStep.freeTextNextStepId) {
        nextStep = flow.steps.find(s => s.id === currentStep.freeTextNextStepId) || null;
      } else {
        // Se não tem próximo passo explícito, pega o próximo elemento do array
        const currentIndex = flow.steps.findIndex(s => s.id === currentStep.id);
        if (currentIndex >= 0 && currentIndex + 1 < flow.steps.length) {
          nextStep = flow.steps[currentIndex + 1];
        }
      }
    }

    if (!nextStep) {
      // Fim do fluxo atingido
      session.currentStepId = 'FINALIZADO';
      return {
        reply: 'Muito obrigado pelas informações! Nossa equipe especializada já assumirá o atendimento aqui para te passar todos os detalhes.',
        isEnd: true,
        action: 'transfer_human',
      };
    }

    session.currentStepId = nextStep.id;
    const compiled = this.compileText(nextStep.message, flow, leadInfo, session.collectedData);

    return {
      reply: compiled,
      action: actionTriggered || nextStep.action,
      isEnd: nextStep.isEnd,
      stepTitle: nextStep.title,
    };
  }

  /**
   * Simulação virtual de conversa para o widget de smartphone no navegador
   */
  simulateStep(
    flowId: string, 
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
    const flow = this.getFlowById(flowId) || this.getActiveFlow();
    if (!flow || !flow.steps || flow.steps.length === 0) {
      return {
        nextStepId: '',
        botReply: 'Fluxo não configurado ou sem etapas.',
        isEnd: true,
        updatedData: collectedData,
      };
    }

    const norm = normalizeText(userMessage);

    // FAQ check
    if (flow.faqRules && flow.faqRules.length > 0) {
      for (const rule of flow.faqRules) {
        if (rule.keywords.some(k => norm.includes(normalizeText(k)))) {
          return {
            nextStepId: currentStepId || flow.steps[0].id,
            botReply: this.compileText(rule.reply, flow, undefined, collectedData),
            isEnd: rule.action === 'end',
            action: rule.action,
            updatedData: collectedData,
          };
        }
      }
    }

    if (!currentStepId) {
      const first = flow.steps[0];
      return {
        nextStepId: first.id,
        botReply: this.compileText(first.message, flow, undefined, collectedData),
        isEnd: Boolean(first.isEnd),
        action: first.action,
        updatedData: collectedData,
      };
    }

    const step = flow.steps.find(s => s.id === currentStepId) || flow.steps[0];
    const data = { ...collectedData };

    if (step.options && step.options.length > 0) {
      let opt = step.options.find(o => normalizeText(o.key) === norm);
      if (!opt) {
        opt = step.options.find(o => norm.includes(normalizeText(o.label)));
      }

      if (opt) {
        if (step.saveToField) data[step.saveToField] = opt.label;
        const next = flow.steps.find(s => s.id === opt!.nextStepId);
        if (next) {
          return {
            nextStepId: next.id,
            botReply: this.compileText(next.message, flow, undefined, data),
            isEnd: Boolean(next.isEnd),
            action: opt.action || next.action,
            updatedData: data,
          };
        }
      }
    }

    // Texto livre
    if (step.saveToField) data[step.saveToField] = userMessage;
    const next = step.freeTextNextStepId 
      ? flow.steps.find(s => s.id === step.freeTextNextStepId)
      : flow.steps[flow.steps.findIndex(s => s.id === step.id) + 1];

    if (next) {
      return {
        nextStepId: next.id,
        botReply: this.compileText(next.message, flow, undefined, data),
        isEnd: Boolean(next.isEnd),
        action: next.action,
        updatedData: data,
      };
    }

    return {
      nextStepId: 'FINAL',
      botReply: 'Atendimento concluído! Um especialista humano entrará em contato em instantes.',
      isEnd: true,
      action: 'transfer_human',
      updatedData: data,
    };
  }
}
