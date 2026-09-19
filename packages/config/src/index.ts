// ============================================
// Radar de Oportunidades — Shared Configuration
// ============================================

export const APP_CONFIG = {
  name: 'Radar de Oportunidades',
  version: '1.0.0',
  description: 'Plataforma SaaS de Prospecção Comercial para Segurança Eletrônica',
};

export const MAP_CONFIG = {
  defaultCenter: { lat: -23.5505, lng: -46.6333 } as const,
  defaultZoom: 12,
  maxZoom: 19,
  minZoom: 3,
  tileUrls: {
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    light: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  },
  tileAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
};

export const SCORE_CONFIG = {
  min: 0,
  max: 100,
  levels: {
    LOW: { min: 0, max: 39, label: 'Baixa oportunidade', color: '#6B7280' },
    MEDIUM: { min: 40, max: 59, label: 'Média oportunidade', color: '#F59E0B' },
    GOOD: { min: 60, max: 79, label: 'Boa oportunidade', color: '#3B82F6' },
    HIGH: { min: 80, max: 89, label: 'Alta oportunidade', color: '#10B981' },
    PRIORITY: { min: 90, max: 100, label: 'Oportunidade prioritária', color: '#EF4444' },
  },
};

export const PAGINATION_CONFIG = {
  defaultPage: 1,
  defaultLimit: 20,
  maxLimit: 100,
};

export const AUTH_CONFIG = {
  jwtExpiration: '15m',
  refreshExpiration: '7d',
  bcryptSaltRounds: 12,
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
};

export const RATE_LIMIT_CONFIG = {
  global: { ttl: 60, limit: 100 },
  login: { ttl: 60, limit: 5 },
};

export const PIPELINE_STAGES = [
  { name: 'Novo Lead', slug: 'novo-lead', color: '#6B7280', order: 1 },
  { name: 'Qualificado', slug: 'qualificado', color: '#3B82F6', order: 2 },
  { name: 'Contato Realizado', slug: 'contato-realizado', color: '#8B5CF6', order: 3 },
  { name: 'Visita Agendada', slug: 'visita-agendada', color: '#F59E0B', order: 4 },
  { name: 'Proposta Enviada', slug: 'proposta-enviada', color: '#F97316', order: 5 },
  { name: 'Negociação', slug: 'negociacao', color: '#EF4444', order: 6 },
  { name: 'Cliente Fechado', slug: 'cliente-fechado', color: '#10B981', order: 7 },
] as const;

export const WHATSAPP_TEMPLATES = {
  introduction: `Olá, {nome}.

Sou {vendedor}, consultor de segurança eletrônica.

Atuamos com soluções de CFTV, alarmes, monitoramento e proteção patrimonial.

Gostaria de entender como funciona atualmente a segurança do seu estabelecimento e verificar se podemos ajudar com uma solução personalizada.

Posso agendar uma visita técnica gratuita?`,

  followUp: `Olá, {nome}.

Tudo bem? Sou {vendedor}, da equipe de segurança eletrônica.

Estou entrando em contato para dar continuidade à nossa conversa sobre a segurança do seu {segmento}.

Tem algum horário disponível esta semana para conversarmos?`,

  proposal: `Olá, {nome}.

Seguindo nossa conversa, preparei uma proposta personalizada para a segurança do seu {segmento}.

📋 Proposta: {proposta_codigo}
💰 Valor: {valor}
📅 Válida até: {validade}

Posso enviar os detalhes por e-mail?`,
};
