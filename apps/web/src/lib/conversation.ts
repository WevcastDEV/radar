export interface CustomFaqRule {
  id: string;
  title: string;
  keywords: string[];
  answer: string;
  action?: 'continue' | 'transfer_human' | 'qualify_lead';
}

export interface ConversationConfig {
  businessName: string;
  ownerName: string;
  segment: string;
  description: string;
  priceInfo: string;
  paymentMethods: string;
  pixKey: string;
  address: string;
  workingHours: string;
  websiteUrl: string;
  phoneSupport: string;
  toneOfVoice: 'amigavel' | 'consultivo' | 'direto';
  botName: string;
  customFaq: CustomFaqRule[];
  typingDelayEnabled: boolean;
  welcomeMessageVariation: boolean;
}

export interface ClientMessage {
  id: string;
  sender: 'client' | 'bot' | 'human';
  text: string;
  timestamp: number;
  intentDetected?: string;
}

export interface ClientConversation {
  id: string;
  jid: string;
  name: string;
  phone: string;
  status: 'novo' | 'em_andamento' | 'qualificado' | 'atendimento_humano' | 'recusado' | 'concluido';
  interestScore: number;
  leadTemperature: 'frio' | 'morno' | 'quente' | 'fechando';
  detectedIntents: string[];
  businessContext: {
    askedPrice?: boolean;
    askedLocation?: boolean;
    askedPayment?: boolean;
    askedServices?: boolean;
    askedSchedule?: boolean;
    askedGuarantee?: boolean;
    preferredService?: string;
    preferredDate?: string;
    clientBudget?: string;
  };
  lastMessageSnippet: string;
  lastMessageSender: 'client' | 'bot' | 'human';
  lastInteractionAt: number;
  createdAt: number;
  messagesCount: number;
  messages: ClientMessage[];
}

export interface ConversationStats {
  totalConversations: number;
  totalMessages: number;
  hotLeadsCount: number;
  intentsRanking: Record<string, number>;
}

export const DEFAULT_CONVERSATION_CONFIG: ConversationConfig = {
  businessName: 'Radar de Oportunidades & Soluções Comerciais',
  ownerName: 'Weverton',
  segment: 'Tecnologia, Vendas & Prospecção B2B',
  description: 'Somos especialistas em geração de oportunidades, automação comercial, WhatsApp inteligente e aceleração de vendas para empresas.',
  priceInfo: 'Nossos planos e soluções partem de condições especiais com excelente retorno sobre investimento (a partir de R$ 97/mês com teste e demonstração).',
  paymentMethods: 'Aceitamos Pix (com liberação imediata), Cartão de Crédito em até 12x e Boleto Bancário.',
  pixKey: 'comercial@radardeoportunidades.com.br',
  address: 'Atendimento comercial digital para todo o Brasil com suporte direto e consultoria personalizada.',
  workingHours: 'De Segunda a Sexta das 08h às 18h e Sábados das 08h às 12h (horário de Brasília).',
  websiteUrl: 'https://radardeoportunidades.com.br',
  phoneSupport: '(92) 99292-0233',
  toneOfVoice: 'amigavel',
  botName: 'Assistente Virtual Comercial',
  typingDelayEnabled: true,
  welcomeMessageVariation: true,
  customFaq: [
    {
      id: 'faq-preco',
      title: 'Tabela de Preços e Valores',
      keywords: ['preco', 'quanto custa', 'quanto e', 'qual o valor', 'tabela', 'valores', 'orcamento', 'quanto que ta', 'precinho', 'desconto'],
      answer: '{Olá|Oi|Opa}! Nossos valores são super acessíveis e personalizados para o porte do seu negócio: {{preco_info}} 🚀 Aceitamos {{formas_pagamento}}. Gostaria que eu te apresentasse uma proposta sob medida?',
      action: 'continue',
    },
    {
      id: 'faq-localizacao',
      title: 'Endereço e Localização',
      keywords: ['onde fica', 'qual o endereco', 'onde voces ficam', 'onde e a loja', 'qual o bairro', 'ponto de referencia', 'tem estacionamento', 'como faco pra chegar'],
      answer: 'Nosso endereço / base de atendimento é: {{endereco}} 📍 Atendemos de {{horario_atendimento}}. Você gostaria de agendar uma conversa ou prefere tirar suas dúvidas por aqui mesmo?',
      action: 'continue',
    },
    {
      id: 'faq-pagamento',
      title: 'Formas de Pagamento e Pix',
      keywords: ['aceita pix', 'passa cartao', 'divide no cartao', 'parcela', 'quantas vezes', 'tem desconto no pix', 'chave pix', 'boleto', 'como pago'],
      answer: 'Facilitamos bastante o pagamento! Trabalhamos com: {{formas_pagamento}} 💳 Se preferir pagar no Pix, nossa chave é: {{chave_pix}}. Deseja que eu gere o link ou código Pix pra você agora?',
      action: 'continue',
    },
    {
      id: 'faq-horario',
      title: 'Horário de Funcionamento',
      keywords: ['ta aberto', 'abre sabado', 'funciona hoje', 'atende agora', 'horario de funcionamento', 'que horas abre', 'que horas fecha'],
      answer: 'Nosso horário de funcionamento é: {{horario_atendimento}} ⏰ Se você mandar mensagem fora do horário, nossa equipe responde logo na primeira hora útil!',
      action: 'continue',
    },
    {
      id: 'faq-servicos',
      title: 'Serviços e O Que Fazem',
      keywords: ['o que voces fazem', 'quais os servicos', 'como funciona', 'me explica', 'portfolio', 'catalogo', 'manda fotos', 'fotos', 'detalhes'],
      answer: '{{descricao_negocio}} ✨ Você também pode conferir mais detalhes e referências no link: {{link_site}}. Me conta: qual é a principal necessidade da sua empresa hoje?',
      action: 'continue',
    },
    {
      id: 'faq-garantia',
      title: 'Garantia e Confiança',
      keywords: ['e seguro', 'e confiavel', 'tem garantia', 'tem contrato', 'nota fiscal', 'posso confiar', 'e golpe'],
      answer: 'Pode ficar 100% tranquilo! Somos uma empresa séria e comprometida com a transparência e qualidade. Oferecemos garantia, suporte direto e você pode falar com o {{responsavel}} a qualquer momento!',
      action: 'continue',
    },
    {
      id: 'faq-humano',
      title: 'Falar com Atendente Humano / Weverton',
      keywords: ['falar com humano', 'atendente', 'pessoa', 'weverton', 'me liga', 'ligar', 'responsavel', 'falar com atendente', 'chamar alguem'],
      answer: 'Com certeza! Já estou transferindo seu atendimento para o {{responsavel}} assumir aqui diretamente com você. Só um momento! 🤝',
      action: 'transfer_human',
    },
  ],
};
