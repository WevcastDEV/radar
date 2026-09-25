// ============================================
// Radar de Oportunidades — Seed Data
// Dados fictícios para demonstração (região de São Paulo)
// ============================================

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  VISIT_SCHEDULED = 'VISIT_SCHEDULED',
  PROPOSAL_SENT = 'PROPOSAL_SENT',
  NEGOTIATION = 'NEGOTIATION',
  WON = 'WON',
  LOST = 'LOST',
  INACTIVE = 'INACTIVE',
}

enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

enum ContactType {
  PHONE = 'PHONE',
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  WEBSITE = 'WEBSITE',
  OTHER = 'OTHER',
}

enum ScoreLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  GOOD = 'GOOD',
  HIGH = 'HIGH',
  PRIORITY = 'PRIORITY',
}

enum GoalType {
  SALES_COUNT = 'SALES_COUNT',
  SALES_VALUE = 'SALES_VALUE',
  VISITS = 'VISITS',
  CALLS = 'CALLS',
  PROPOSALS = 'PROPOSALS',
  CONVERSION = 'CONVERSION',
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do Radar de Oportunidades...\n');

  // ============================
  // ROLES
  // ============================
  console.log('👥 Criando roles...');
  const roles = await Promise.all([
    prisma.role.create({ data: { name: 'Administrador', slug: 'admin', description: 'Acesso total ao sistema' } }),
    prisma.role.create({ data: { name: 'Gestor Comercial', slug: 'manager', description: 'Gerencia equipe e metas' } }),
    prisma.role.create({ data: { name: 'Supervisor', slug: 'supervisor', description: 'Supervisiona operações' } }),
    prisma.role.create({ data: { name: 'Vendedor', slug: 'seller', description: 'Prospecção e vendas' } }),
    prisma.role.create({ data: { name: 'SDR', slug: 'sdr', description: 'Qualificação de leads' } }),
    prisma.role.create({ data: { name: 'Consulta', slug: 'viewer', description: 'Apenas visualização' } }),
  ]);

  // ============================
  // PERMISSIONS
  // ============================
  console.log('🔐 Criando permissões...');
  const modules = ['leads', 'pipeline', 'visits', 'calls', 'proposals', 'products', 'customers', 'teams', 'goals', 'reports', 'users', 'settings'];
  const actions = ['create', 'read', 'update', 'delete'];
  const permissions = [];
  for (const mod of modules) {
    for (const action of actions) {
      const perm = await prisma.permission.create({
        data: {
          name: `${action}_${mod}`,
          slug: `${mod}.${action}`,
          module: mod,
          action: action,
          description: `Pode ${action} ${mod}`,
        },
      });
      permissions.push(perm);
    }
  }

  // Assign all permissions to admin
  const adminRole = roles[0];
  for (const perm of permissions) {
    await prisma.rolePermission.create({
      data: { roleId: adminRole.id, permissionId: perm.id },
    });
  }

  // Assign read + limited write to seller
  const sellerRole = roles[3];
  const sellerModules = ['leads', 'pipeline', 'visits', 'calls', 'proposals', 'customers'];
  for (const perm of permissions) {
    if (sellerModules.includes(perm.module)) {
      await prisma.rolePermission.create({
        data: { roleId: sellerRole.id, permissionId: perm.id },
      });
    } else if (perm.action === 'read') {
      await prisma.rolePermission.create({
        data: { roleId: sellerRole.id, permissionId: perm.id },
      });
    }
  }

  // ============================
  // TEAM
  // ============================
  console.log('👨‍💼 Criando equipe...');
  const team = await prisma.team.create({
    data: { name: 'Equipe São Paulo' },
  });

  // ============================
  // USERS
  // ============================
  console.log('👤 Criando usuários...');
  const hashedPassword = await bcrypt.hash('radar123', 12);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@radar.com',
      password: hashedPassword,
      name: 'Administrador',
      phone: '(11) 99999-0000',
      roleId: adminRole.id,
      teamId: team.id,
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: 'gestor@radar.com',
      password: hashedPassword,
      name: 'Ricardo Mendes',
      phone: '(11) 99999-0001',
      roleId: roles[1].id,
      teamId: team.id,
    },
  });

  const sellers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'carlos@radar.com',
        password: hashedPassword,
        name: 'Carlos Silva',
        phone: '(11) 99999-0002',
        roleId: sellerRole.id,
        teamId: team.id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'rafael@radar.com',
        password: hashedPassword,
        name: 'Rafael Oliveira',
        phone: '(11) 99999-0003',
        roleId: sellerRole.id,
        teamId: team.id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'andre@radar.com',
        password: hashedPassword,
        name: 'André Santos',
        phone: '(11) 99999-0004',
        roleId: sellerRole.id,
        teamId: team.id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'lucas@radar.com',
        password: hashedPassword,
        name: 'Lucas Ferreira',
        phone: '(11) 99999-0005',
        roleId: sellerRole.id,
        teamId: team.id,
      },
    }),
  ]);

  // ============================
  // SEGMENTS
  // ============================
  console.log('🏢 Criando segmentos...');
  const segmentData = [
    { name: 'Comércio', slug: 'comercio', icon: 'Store', color: '#3B82F6' },
    { name: 'Condomínio', slug: 'condominio', icon: 'Building2', color: '#8B5CF6' },
    { name: 'Residência de Alto Padrão', slug: 'residencia-alto-padrao', icon: 'Home', color: '#EC4899' },
    { name: 'Galpão', slug: 'galpao', icon: 'Warehouse', color: '#F97316' },
    { name: 'Clínica', slug: 'clinica', icon: 'Stethoscope', color: '#14B8A6' },
    { name: 'Hospital', slug: 'hospital', icon: 'Hospital', color: '#EF4444' },
    { name: 'Escola', slug: 'escola', icon: 'GraduationCap', color: '#F59E0B' },
    { name: 'Faculdade', slug: 'faculdade', icon: 'BookOpen', color: '#6366F1' },
    { name: 'Restaurante', slug: 'restaurante', icon: 'UtensilsCrossed', color: '#D946EF' },
    { name: 'Bar', slug: 'bar', icon: 'Wine', color: '#A855F7' },
    { name: 'Posto de Combustível', slug: 'posto-combustivel', icon: 'Fuel', color: '#22C55E' },
    { name: 'Supermercado', slug: 'supermercado', icon: 'ShoppingCart', color: '#0EA5E9' },
    { name: 'Empresa', slug: 'empresa', icon: 'Briefcase', color: '#64748B' },
    { name: 'Loja', slug: 'loja', icon: 'ShoppingBag', color: '#F472B6' },
    { name: 'Farmácia', slug: 'farmacia', icon: 'Pill', color: '#34D399' },
    { name: 'Academia', slug: 'academia', icon: 'Dumbbell', color: '#FB923C' },
    { name: 'Hotel', slug: 'hotel', icon: 'Hotel', color: '#C084FC' },
    { name: 'Indústria', slug: 'industria', icon: 'Factory', color: '#78716C' },
    { name: 'Transportadora', slug: 'transportadora', icon: 'Truck', color: '#38BDF8' },
    { name: 'Centro Logístico', slug: 'centro-logistico', icon: 'Package', color: '#A3E635' },
    { name: 'Construtora', slug: 'construtora', icon: 'HardHat', color: '#FBBF24' },
    { name: 'Novo Empreendimento', slug: 'novo-empreendimento', icon: 'Building', color: '#2DD4BF' },
  ];

  const segments: Record<string, any> = {};
  for (const seg of segmentData) {
    segments[seg.slug] = await prisma.segment.create({ data: seg });
  }

  // ============================
  // PIPELINE
  // ============================
  console.log('📊 Criando pipeline...');
  const pipeline = await prisma.pipeline.create({
    data: {
      name: 'Pipeline Comercial',
      isDefault: true,
      stages: {
        create: [
          { name: 'Novo Lead', slug: 'novo-lead', color: '#6B7280', order: 1 },
          { name: 'Qualificado', slug: 'qualificado', color: '#3B82F6', order: 2 },
          { name: 'Contato Realizado', slug: 'contato-realizado', color: '#8B5CF6', order: 3 },
          { name: 'Visita Agendada', slug: 'visita-agendada', color: '#F59E0B', order: 4 },
          { name: 'Proposta Enviada', slug: 'proposta-enviada', color: '#F97316', order: 5 },
          { name: 'Negociação', slug: 'negociacao', color: '#EF4444', order: 6 },
          { name: 'Cliente Fechado', slug: 'cliente-fechado', color: '#10B981', order: 7 },
        ],
      },
    },
    include: { stages: true },
  });

  const stageMap: Record<string, string> = {};
  pipeline.stages.forEach(s => { stageMap[s.slug] = s.id; });

  // ============================
  // SCORE RULES
  // ============================
  console.log('📈 Criando regras de score...');
  const scoreRules = [
    { name: 'Supermercado', factor: 'segment_supermercado', points: 20, segmentId: segments['supermercado']?.id },
    { name: 'Posto de Combustível', factor: 'segment_posto', points: 20, segmentId: segments['posto-combustivel']?.id },
    { name: 'Condomínio', factor: 'segment_condominio', points: 18, segmentId: segments['condominio']?.id },
    { name: 'Clínica', factor: 'segment_clinica', points: 15, segmentId: segments['clinica']?.id },
    { name: 'Escola', factor: 'segment_escola', points: 15, segmentId: segments['escola']?.id },
    { name: 'Hospital', factor: 'segment_hospital', points: 18, segmentId: segments['hospital']?.id },
    { name: 'Indústria', factor: 'segment_industria', points: 16, segmentId: segments['industria']?.id },
    { name: 'Hotel', factor: 'segment_hotel', points: 15, segmentId: segments['hotel']?.id },
    { name: 'Funcionamento Noturno', factor: 'night_operation', points: 20 },
    { name: 'Grande Circulação de Pessoas', factor: 'high_traffic', points: 15 },
    { name: 'Área Externa Ampla', factor: 'large_exterior', points: 15 },
    { name: 'Mais de 30 Funcionários', factor: 'many_employees', points: 10 },
    { name: 'Empreendimento Recém-Aberto', factor: 'new_business', points: 15 },
    { name: 'Imóvel Grande', factor: 'large_property', points: 10 },
    { name: 'Funcionamento 24 Horas', factor: '24h_operation', points: 10 },
    { name: 'Potencial para Monitoramento', factor: 'monitoring_potential', points: 15 },
    { name: 'Região Comercial', factor: 'commercial_area', points: 10 },
    { name: 'Sem Contato Anterior', factor: 'no_previous_contact', points: 10 },
    { name: 'Múltiplas Filiais', factor: 'multiple_branches', points: 12 },
    { name: 'Alto Patrimônio Físico', factor: 'high_assets', points: 12 },
  ];

  for (const rule of scoreRules) {
    await prisma.scoreRule.create({ data: rule });
  }

  // ============================
  // PRODUCTS
  // ============================
  console.log('📦 Criando produtos...');
  const products = [
    { name: 'Câmera Bullet HD 1080p', sku: 'CAM-BUL-1080', category: 'Câmeras', price: 289.90, cost: 150.00, brand: 'Intelbras', model: 'VHD 1230 B' },
    { name: 'Câmera Dome HD 1080p', sku: 'CAM-DOM-1080', category: 'Câmeras', price: 349.90, cost: 180.00, brand: 'Intelbras', model: 'VHD 1230 D' },
    { name: 'Câmera IP 4MP', sku: 'CAM-IP-4MP', category: 'Câmeras', price: 599.90, cost: 320.00, brand: 'Intelbras', model: 'VIP 3430 B' },
    { name: 'Câmera Speed Dome PTZ', sku: 'CAM-PTZ-2MP', category: 'Câmeras', price: 2899.90, cost: 1500.00, brand: 'Intelbras', model: 'VHD 5230 SD' },
    { name: 'DVR 8 Canais', sku: 'DVR-8CH', category: 'DVR', price: 699.90, cost: 380.00, brand: 'Intelbras', model: 'MHDX 1208' },
    { name: 'DVR 16 Canais', sku: 'DVR-16CH', category: 'DVR', price: 1199.90, cost: 650.00, brand: 'Intelbras', model: 'MHDX 1216' },
    { name: 'NVR 8 Canais IP', sku: 'NVR-8CH', category: 'NVR', price: 999.90, cost: 520.00, brand: 'Intelbras', model: 'NVD 1408' },
    { name: 'Central de Alarme 18 Zonas', sku: 'ALR-18Z', category: 'Alarmes', price: 449.90, cost: 230.00, brand: 'Intelbras', model: 'AMT 2018 E' },
    { name: 'Sensor Infravermelho', sku: 'SEN-IVP', category: 'Sensores', price: 79.90, cost: 35.00, brand: 'Intelbras', model: 'IVP 3000 CF' },
    { name: 'Sensor Magnético', sku: 'SEN-MAG', category: 'Sensores', price: 29.90, cost: 12.00, brand: 'Intelbras', model: 'XAS 4010' },
    { name: 'Sirene Interna', sku: 'SIR-INT', category: 'Sirenes', price: 49.90, cost: 20.00, brand: 'Intelbras', model: 'SIR 1000' },
    { name: 'Cerca Elétrica Industrial', sku: 'CER-IND', category: 'Cerca Elétrica', price: 899.90, cost: 450.00, brand: 'Intelbras', model: 'ELC 5002' },
    { name: 'Controle de Acesso Facial', sku: 'ACC-FAC', category: 'Controle de Acesso', price: 1899.90, cost: 980.00, brand: 'Intelbras', model: 'SS 5530 MF FACE' },
    { name: 'Vídeo Porteiro Wi-Fi', sku: 'VPT-WIFI', category: 'Vídeo Porteiro', price: 799.90, cost: 420.00, brand: 'Intelbras', model: 'Allo wT7' },
    { name: 'HD 2TB Surveillance', sku: 'HD-2TB', category: 'Acessórios', price: 449.90, cost: 280.00, brand: 'Seagate', model: 'SkyHawk' },
  ];

  for (const prod of products) {
    await prisma.product.create({ data: prod });
  }

  // ============================
  // SERVICES
  // ============================
  console.log('🔧 Criando serviços...');
  const services = [
    { name: 'Monitoramento 24h', category: 'Monitoramento', price: 189.90, priceType: 'monthly', isRecurring: true },
    { name: 'Instalação Básica (até 4 câmeras)', category: 'Instalação', price: 600.00, priceType: 'fixed' },
    { name: 'Instalação Completa (até 16 câmeras)', category: 'Instalação', price: 2200.00, priceType: 'fixed' },
    { name: 'Manutenção Preventiva', category: 'Manutenção', price: 299.90, priceType: 'monthly', isRecurring: true },
    { name: 'Manutenção Corretiva', category: 'Manutenção', price: 250.00, priceType: 'per_visit' },
    { name: 'Projeto Personalizado', category: 'Projetos', price: 1500.00, priceType: 'fixed' },
    { name: 'Cerca Elétrica (por metro)', category: 'Instalação', price: 45.00, priceType: 'per_unit' },
    { name: 'Controle de Acesso (por ponto)', category: 'Instalação', price: 800.00, priceType: 'per_unit' },
  ];

  for (const svc of services) {
    await prisma.service.create({ data: svc });
  }

  // ============================
  // LEADS (50 leads fictícios em São Paulo)
  // ============================
  console.log('🎯 Criando leads...');

  const leadsData = [
    // SUPERMERCADOS
    { name: 'Supermercado Bom Preço', tradeName: 'Bom Preço', companyName: 'Bom Preço Alimentos Ltda', cnpj: '12.345.678/0001-01', segment: 'supermercado', status: LeadStatus.QUALIFIED, priority: Priority.HIGH, employees: 45, area: 800, nightOp: true, h24: false, highTraffic: true, largeExterior: true, newBiz: false, value: 15000, address: { street: 'Rua dos Pinheiros', number: '1200', neighborhood: 'Pinheiros', city: 'São Paulo', state: 'SP', zipCode: '05422-001', lat: -23.5629, lng: -46.6893 }, contacts: [{ type: ContactType.PHONE, value: '(11) 3061-1234' }, { type: ContactType.WHATSAPP, value: '(11) 99876-5432' }], stage: 'qualificado', seller: 0 },
    { name: 'Supermercado Economia Total', tradeName: 'Economia Total', companyName: 'ET Comércio de Alimentos Ltda', cnpj: '12.345.678/0001-02', segment: 'supermercado', status: LeadStatus.NEW, priority: Priority.HIGH, employees: 60, area: 1200, nightOp: true, h24: true, highTraffic: true, largeExterior: true, newBiz: false, value: 22000, address: { street: 'Av. Brigadeiro Faria Lima', number: '3500', neighborhood: 'Itaim Bibi', city: 'São Paulo', state: 'SP', zipCode: '04538-132', lat: -23.5843, lng: -46.6800 }, contacts: [{ type: ContactType.PHONE, value: '(11) 3045-6789' }], stage: 'novo-lead', seller: 1 },
    { name: 'Mercadinho do Bairro', tradeName: 'Mercadinho do Bairro', companyName: null, cnpj: '12.345.678/0001-03', segment: 'supermercado', status: LeadStatus.CONTACTED, priority: Priority.MEDIUM, employees: 12, area: 200, nightOp: false, h24: false, highTraffic: true, largeExterior: false, newBiz: false, value: 5000, address: { street: 'Rua Augusta', number: '2300', neighborhood: 'Cerqueira César', city: 'São Paulo', state: 'SP', zipCode: '01412-100', lat: -23.5568, lng: -46.6620 }, contacts: [{ type: ContactType.WHATSAPP, value: '(11) 98765-4321' }], stage: 'contato-realizado', seller: 0 },

    // CONDOMÍNIOS
    { name: 'Condomínio Reserva das Flores', tradeName: null, companyName: 'Condomínio Reserva das Flores', cnpj: '23.456.789/0001-01', segment: 'condominio', status: LeadStatus.VISIT_SCHEDULED, priority: Priority.HIGH, employees: 8, area: 5000, nightOp: false, h24: false, highTraffic: false, largeExterior: true, newBiz: false, value: 35000, address: { street: 'Rua Pedroso Alvarenga', number: '800', neighborhood: 'Itaim Bibi', city: 'São Paulo', state: 'SP', zipCode: '04531-012', lat: -23.5810, lng: -46.6770 }, contacts: [{ type: ContactType.PHONE, value: '(11) 3078-1234' }, { type: ContactType.EMAIL, value: 'sindico@reservadasflores.com.br' }], stage: 'visita-agendada', seller: 0 },
    { name: 'Condomínio Vila Park', tradeName: null, companyName: 'Condomínio Edifício Vila Park', cnpj: '23.456.789/0001-02', segment: 'condominio', status: LeadStatus.NEW, priority: Priority.MEDIUM, employees: 5, area: 3000, nightOp: false, h24: false, highTraffic: false, largeExterior: true, newBiz: true, value: 28000, address: { street: 'Rua Olimpíadas', number: '200', neighborhood: 'Vila Olímpia', city: 'São Paulo', state: 'SP', zipCode: '04551-000', lat: -23.5952, lng: -46.6862 }, contacts: [{ type: ContactType.WHATSAPP, value: '(11) 97654-3210' }], stage: 'novo-lead', seller: 2 },
    { name: 'Residencial Jardim Europa', tradeName: null, companyName: 'Condomínio Jardim Europa Premium', cnpj: '23.456.789/0001-03', segment: 'condominio', status: LeadStatus.PROPOSAL_SENT, priority: Priority.HIGH, employees: 12, area: 8000, nightOp: false, h24: false, highTraffic: false, largeExterior: true, newBiz: false, value: 55000, address: { street: 'Rua Groenlândia', number: '150', neighborhood: 'Jardim Europa', city: 'São Paulo', state: 'SP', zipCode: '01434-010', lat: -23.5720, lng: -46.6750 }, contacts: [{ type: ContactType.PHONE, value: '(11) 3064-5678' }, { type: ContactType.EMAIL, value: 'adm@jepremium.com.br' }], stage: 'proposta-enviada', seller: 1 },

    // POSTOS DE COMBUSTÍVEL
    { name: 'Posto Avenida', tradeName: 'Posto Avenida', companyName: 'Avenida Combustíveis Ltda', cnpj: '34.567.890/0001-01', segment: 'posto-combustivel', status: LeadStatus.NEGOTIATION, priority: Priority.URGENT, employees: 20, area: 600, nightOp: true, h24: true, highTraffic: true, largeExterior: true, newBiz: false, value: 18000, address: { street: 'Av. Rebouças', number: '3000', neighborhood: 'Pinheiros', city: 'São Paulo', state: 'SP', zipCode: '05402-000', lat: -23.5620, lng: -46.6830 }, contacts: [{ type: ContactType.PHONE, value: '(11) 3085-9876' }, { type: ContactType.WHATSAPP, value: '(11) 98765-1111' }], stage: 'negociacao', seller: 0 },
    { name: 'Auto Posto Shell Moema', tradeName: 'Shell Moema', companyName: 'Moema Derivados Ltda', cnpj: '34.567.890/0001-02', segment: 'posto-combustivel', status: LeadStatus.QUALIFIED, priority: Priority.HIGH, employees: 15, area: 500, nightOp: true, h24: true, highTraffic: true, largeExterior: true, newBiz: false, value: 16000, address: { street: 'Av. Moaci', number: '800', neighborhood: 'Moema', city: 'São Paulo', state: 'SP', zipCode: '04083-001', lat: -23.6010, lng: -46.6660 }, contacts: [{ type: ContactType.PHONE, value: '(11) 5051-3456' }], stage: 'qualificado', seller: 2 },

    // CLÍNICAS
    { name: 'Clínica Vida Mais', tradeName: 'Vida Mais', companyName: 'Vida Mais Saúde Ltda', cnpj: '45.678.901/0001-01', segment: 'clinica', status: LeadStatus.CONTACTED, priority: Priority.MEDIUM, employees: 25, area: 350, nightOp: false, h24: false, highTraffic: true, largeExterior: false, newBiz: false, value: 12000, address: { street: 'Rua Oscar Freire', number: '1500', neighborhood: 'Jardins', city: 'São Paulo', state: 'SP', zipCode: '01426-001', lat: -23.5630, lng: -46.6700 }, contacts: [{ type: ContactType.PHONE, value: '(11) 3062-7890' }, { type: ContactType.EMAIL, value: 'contato@vidamais.com.br' }], stage: 'contato-realizado', seller: 1 },
    { name: 'Clínica Odonto Premium', tradeName: 'Odonto Premium', companyName: 'Odonto Premium SP Ltda', cnpj: '45.678.901/0001-02', segment: 'clinica', status: LeadStatus.NEW, priority: Priority.LOW, employees: 10, area: 150, nightOp: false, h24: false, highTraffic: false, largeExterior: false, newBiz: true, value: 8000, address: { street: 'Rua Haddock Lobo', number: '900', neighborhood: 'Cerqueira César', city: 'São Paulo', state: 'SP', zipCode: '01414-001', lat: -23.5560, lng: -46.6660 }, contacts: [{ type: ContactType.WHATSAPP, value: '(11) 97777-8888' }], stage: 'novo-lead', seller: 3 },

    // ESCOLAS
    { name: 'Colégio Nova Geração', tradeName: 'Nova Geração', companyName: 'Nova Geração Educação Ltda', cnpj: '56.789.012/0001-01', segment: 'escola', status: LeadStatus.QUALIFIED, priority: Priority.HIGH, employees: 80, area: 2000, nightOp: true, h24: false, highTraffic: true, largeExterior: true, newBiz: false, value: 25000, address: { street: 'Rua Girassol', number: '300', neighborhood: 'Vila Madalena', city: 'São Paulo', state: 'SP', zipCode: '05433-000', lat: -23.5540, lng: -46.6920 }, contacts: [{ type: ContactType.PHONE, value: '(11) 3813-4567' }, { type: ContactType.EMAIL, value: 'diretoria@novageracao.edu.br' }], stage: 'qualificado', seller: 0 },
    { name: 'Escola Infantil Pequenos Brilhantes', tradeName: 'Pequenos Brilhantes', companyName: null, cnpj: '56.789.012/0001-02', segment: 'escola', status: LeadStatus.NEW, priority: Priority.MEDIUM, employees: 20, area: 400, nightOp: false, h24: false, highTraffic: true, largeExterior: true, newBiz: true, value: 10000, address: { street: 'Rua Aspicuelta', number: '500', neighborhood: 'Vila Madalena', city: 'São Paulo', state: 'SP', zipCode: '05433-010', lat: -23.5510, lng: -46.6900 }, contacts: [{ type: ContactType.WHATSAPP, value: '(11) 96666-5555' }], stage: 'novo-lead', seller: 2 },

    // RESTAURANTES
    { name: 'Restaurante Sabor & Arte', tradeName: 'Sabor & Arte', companyName: 'Sabor e Arte Gastronomia Ltda', cnpj: '67.890.123/0001-01', segment: 'restaurante', status: LeadStatus.NEW, priority: Priority.MEDIUM, employees: 30, area: 250, nightOp: true, h24: false, highTraffic: true, largeExterior: false, newBiz: false, value: 9000, address: { street: 'Rua Amauri', number: '250', neighborhood: 'Itaim Bibi', city: 'São Paulo', state: 'SP', zipCode: '04523-001', lat: -23.5790, lng: -46.6730 }, contacts: [{ type: ContactType.PHONE, value: '(11) 3079-2345' }], stage: 'novo-lead', seller: 1 },
    { name: 'Churrascaria Fogo de Chão', tradeName: 'Fogo Premium', companyName: 'Fogo Premium Restaurante Ltda', cnpj: '67.890.123/0001-02', segment: 'restaurante', status: LeadStatus.CONTACTED, priority: Priority.HIGH, employees: 50, area: 500, nightOp: true, h24: false, highTraffic: true, largeExterior: true, newBiz: false, value: 14000, address: { street: 'Rua Pamplona', number: '1100', neighborhood: 'Jardim Paulista', city: 'São Paulo', state: 'SP', zipCode: '01405-001', lat: -23.5670, lng: -46.6540 }, contacts: [{ type: ContactType.PHONE, value: '(11) 3289-6543' }, { type: ContactType.EMAIL, value: 'gerencia@fogopremium.com.br' }], stage: 'contato-realizado', seller: 3 },

    // ACADEMIAS
    { name: 'Academia Iron Fitness', tradeName: 'Iron Fitness', companyName: 'Iron Fitness Esportes Ltda', cnpj: '78.901.234/0001-01', segment: 'academia', status: LeadStatus.VISIT_SCHEDULED, priority: Priority.MEDIUM, employees: 20, area: 400, nightOp: true, h24: false, highTraffic: true, largeExterior: false, newBiz: false, value: 8000, address: { street: 'Rua Funchal', number: '400', neighborhood: 'Vila Olímpia', city: 'São Paulo', state: 'SP', zipCode: '04551-060', lat: -23.5940, lng: -46.6880 }, contacts: [{ type: ContactType.WHATSAPP, value: '(11) 95555-4444' }], stage: 'visita-agendada', seller: 0 },
    { name: 'Smart Fit Tatuapé', tradeName: 'Smart Fit', companyName: null, cnpj: '78.901.234/0001-02', segment: 'academia', status: LeadStatus.NEW, priority: Priority.LOW, employees: 10, area: 600, nightOp: false, h24: true, highTraffic: true, largeExterior: false, newBiz: true, value: 6000, address: { street: 'Rua Tuiuti', number: '2200', neighborhood: 'Tatuapé', city: 'São Paulo', state: 'SP', zipCode: '03081-000', lat: -23.5340, lng: -46.5770 }, contacts: [{ type: ContactType.PHONE, value: '(11) 2093-7654' }], stage: 'novo-lead', seller: 3 },

    // FARMÁCIAS
    { name: 'Farmácia Saúde Total', tradeName: 'Saúde Total', companyName: 'Saúde Total Drogaria Ltda', cnpj: '89.012.345/0001-01', segment: 'farmacia', status: LeadStatus.QUALIFIED, priority: Priority.MEDIUM, employees: 8, area: 120, nightOp: true, h24: true, highTraffic: true, largeExterior: false, newBiz: false, value: 7000, address: { street: 'Av. Paulista', number: '1800', neighborhood: 'Bela Vista', city: 'São Paulo', state: 'SP', zipCode: '01310-200', lat: -23.5613, lng: -46.6560 }, contacts: [{ type: ContactType.PHONE, value: '(11) 3253-8765' }], stage: 'qualificado', seller: 2 },

    // HOTÉIS
    { name: 'Hotel Grand Plaza', tradeName: 'Grand Plaza', companyName: 'Grand Plaza Hotelaria SA', cnpj: '90.123.456/0001-01', segment: 'hotel', status: LeadStatus.PROPOSAL_SENT, priority: Priority.URGENT, employees: 100, area: 3000, nightOp: true, h24: true, highTraffic: true, largeExterior: true, newBiz: false, value: 45000, address: { street: 'Alameda Santos', number: '1200', neighborhood: 'Jardim Paulista', city: 'São Paulo', state: 'SP', zipCode: '01418-100', lat: -23.5620, lng: -46.6580 }, contacts: [{ type: ContactType.PHONE, value: '(11) 3146-7890' }, { type: ContactType.EMAIL, value: 'seguranca@grandplaza.com.br' }], stage: 'proposta-enviada', seller: 0 },

    // INDÚSTRIAS
    { name: 'Metalúrgica São Paulo', tradeName: 'MSP Metalúrgica', companyName: 'Metalúrgica São Paulo Ind. Com. Ltda', cnpj: '01.234.567/0001-01', segment: 'industria', status: LeadStatus.NEGOTIATION, priority: Priority.HIGH, employees: 200, area: 5000, nightOp: true, h24: true, highTraffic: false, largeExterior: true, newBiz: false, value: 60000, address: { street: 'Av. das Nações Unidas', number: '14000', neighborhood: 'Brooklin', city: 'São Paulo', state: 'SP', zipCode: '04794-000', lat: -23.6120, lng: -46.6980 }, contacts: [{ type: ContactType.PHONE, value: '(11) 5505-1234' }, { type: ContactType.EMAIL, value: 'compras@mspmetalurgica.com.br' }], stage: 'negociacao', seller: 1 },

    // GALPÕES
    { name: 'Galpão Logístico ABC', tradeName: 'ABC Logística', companyName: 'ABC Armazéns e Logística Ltda', cnpj: '02.345.678/0001-01', segment: 'galpao', status: LeadStatus.QUALIFIED, priority: Priority.HIGH, employees: 50, area: 4000, nightOp: true, h24: true, highTraffic: false, largeExterior: true, newBiz: false, value: 40000, address: { street: 'Rua Vergueiro', number: '5000', neighborhood: 'Vila Mariana', city: 'São Paulo', state: 'SP', zipCode: '04101-000', lat: -23.5980, lng: -46.6370 }, contacts: [{ type: ContactType.PHONE, value: '(11) 5083-4567' }], stage: 'qualificado', seller: 2 },

    // LOJAS
    { name: 'Mega Store Eletrônicos', tradeName: 'Mega Store', companyName: 'Mega Store Com. Eletrônicos Ltda', cnpj: '03.456.789/0001-01', segment: 'loja', status: LeadStatus.NEW, priority: Priority.MEDIUM, employees: 15, area: 300, nightOp: true, h24: false, highTraffic: true, largeExterior: false, newBiz: false, value: 10000, address: { street: 'Rua Santa Ifigênia', number: '300', neighborhood: 'Santa Ifigênia', city: 'São Paulo', state: 'SP', zipCode: '01207-001', lat: -23.5370, lng: -46.6400 }, contacts: [{ type: ContactType.WHATSAPP, value: '(11) 94444-3333' }], stage: 'novo-lead', seller: 3 },
    { name: 'Boutique Fashion Class', tradeName: 'Fashion Class', companyName: null, cnpj: '03.456.789/0001-02', segment: 'loja', status: LeadStatus.CONTACTED, priority: Priority.LOW, employees: 5, area: 80, nightOp: false, h24: false, highTraffic: false, largeExterior: false, newBiz: true, value: 4000, address: { street: 'Rua Oscar Freire', number: '800', neighborhood: 'Jardins', city: 'São Paulo', state: 'SP', zipCode: '01426-001', lat: -23.5640, lng: -46.6720 }, contacts: [{ type: ContactType.EMAIL, value: 'contato@fashionclass.com.br' }], stage: 'contato-realizado', seller: 0 },

    // EMPRESAS
    { name: 'Tech Solutions Brasil', tradeName: 'Tech Solutions', companyName: 'Tech Solutions Informática Ltda', cnpj: '04.567.890/0001-01', segment: 'empresa', status: LeadStatus.NEW, priority: Priority.MEDIUM, employees: 80, area: 500, nightOp: false, h24: false, highTraffic: false, largeExterior: false, newBiz: false, value: 15000, address: { street: 'Rua Gomes de Carvalho', number: '1300', neighborhood: 'Vila Olímpia', city: 'São Paulo', state: 'SP', zipCode: '04547-005', lat: -23.5960, lng: -46.6830 }, contacts: [{ type: ContactType.PHONE, value: '(11) 3044-5678' }, { type: ContactType.EMAIL, value: 'facilities@techsolutions.com.br' }], stage: 'novo-lead', seller: 1 },
    { name: 'Escritório Advocacia Prado & Associados', tradeName: 'Prado & Associados', companyName: 'Prado e Associados Advocacia SS', cnpj: '04.567.890/0001-02', segment: 'empresa', status: LeadStatus.CONTACTED, priority: Priority.LOW, employees: 30, area: 200, nightOp: false, h24: false, highTraffic: false, largeExterior: false, newBiz: false, value: 8000, address: { street: 'Av. Brigadeiro Faria Lima', number: '2000', neighborhood: 'Pinheiros', city: 'São Paulo', state: 'SP', zipCode: '01451-000', lat: -23.5720, lng: -46.6890 }, contacts: [{ type: ContactType.PHONE, value: '(11) 3068-9012' }], stage: 'contato-realizado', seller: 2 },

    // TRANSPORTADORAS
    { name: 'Rápido Translog', tradeName: 'Rápido Translog', companyName: 'Rápido Translog Transportes Ltda', cnpj: '05.678.901/0001-01', segment: 'transportadora', status: LeadStatus.NEW, priority: Priority.HIGH, employees: 150, area: 3000, nightOp: true, h24: true, highTraffic: true, largeExterior: true, newBiz: false, value: 35000, address: { street: 'Marginal Tietê', number: '8000', neighborhood: 'Lapa', city: 'São Paulo', state: 'SP', zipCode: '05034-000', lat: -23.5210, lng: -46.7030 }, contacts: [{ type: ContactType.PHONE, value: '(11) 3643-2345' }, { type: ContactType.EMAIL, value: 'logistica@rapidotranslog.com.br' }], stage: 'novo-lead', seller: 3 },

    // CENTRO LOGÍSTICO
    { name: 'Hub Logístico Intermodal', tradeName: 'Hub Intermodal', companyName: 'Hub Intermodal Logística SA', cnpj: '06.789.012/0001-01', segment: 'centro-logistico', status: LeadStatus.QUALIFIED, priority: Priority.URGENT, employees: 300, area: 10000, nightOp: true, h24: true, highTraffic: true, largeExterior: true, newBiz: false, value: 80000, address: { street: 'Rodovia Anhanguera', number: 'km 25', neighborhood: 'Perus', city: 'São Paulo', state: 'SP', zipCode: '05265-900', lat: -23.4120, lng: -46.7520 }, contacts: [{ type: ContactType.PHONE, value: '(11) 3908-6789' }, { type: ContactType.EMAIL, value: 'seguranca@hubintermodal.com.br' }], stage: 'qualificado', seller: 0 },

    // CONSTRUTORAS
    { name: 'Construtora Vértice', tradeName: 'Vértice Engenharia', companyName: 'Vértice Construções e Engenharia Ltda', cnpj: '07.890.123/0001-01', segment: 'construtora', status: LeadStatus.NEW, priority: Priority.MEDIUM, employees: 40, area: 300, nightOp: false, h24: false, highTraffic: false, largeExterior: false, newBiz: false, value: 20000, address: { street: 'Rua Tabapuã', number: '700', neighborhood: 'Itaim Bibi', city: 'São Paulo', state: 'SP', zipCode: '04533-012', lat: -23.5830, lng: -46.6750 }, contacts: [{ type: ContactType.PHONE, value: '(11) 3071-3456' }], stage: 'novo-lead', seller: 1 },

    // NOVO EMPREENDIMENTO
    { name: 'Residencial Aurora Premium', tradeName: null, companyName: 'Aurora Incorporações SPE Ltda', cnpj: '08.901.234/0001-01', segment: 'novo-empreendimento', status: LeadStatus.NEW, priority: Priority.HIGH, employees: 5, area: 6000, nightOp: false, h24: false, highTraffic: false, largeExterior: true, newBiz: true, value: 50000, address: { street: 'Rua Henrique Schaumann', number: '400', neighborhood: 'Pinheiros', city: 'São Paulo', state: 'SP', zipCode: '05413-010', lat: -23.5600, lng: -46.6870 }, contacts: [{ type: ContactType.PHONE, value: '(11) 3083-7890' }, { type: ContactType.EMAIL, value: 'projetos@auroraincorp.com.br' }], stage: 'novo-lead', seller: 2 },

    // HOSPITAIS
    { name: 'Hospital Santa Lúcia', tradeName: 'Santa Lúcia', companyName: 'Hospital Santa Lúcia SA', cnpj: '09.012.345/0001-01', segment: 'hospital', status: LeadStatus.PROPOSAL_SENT, priority: Priority.URGENT, employees: 500, area: 8000, nightOp: true, h24: true, highTraffic: true, largeExterior: true, newBiz: false, value: 120000, address: { street: 'Rua Mato Grosso', number: '300', neighborhood: 'Higienópolis', city: 'São Paulo', state: 'SP', zipCode: '01239-040', lat: -23.5450, lng: -46.6580 }, contacts: [{ type: ContactType.PHONE, value: '(11) 3155-1234' }, { type: ContactType.EMAIL, value: 'infra@santalucia.com.br' }], stage: 'proposta-enviada', seller: 0 },

    // BARES
    { name: 'Bar do Alemão', tradeName: 'Bar do Alemão', companyName: null, cnpj: '10.123.456/0001-01', segment: 'bar', status: LeadStatus.NEW, priority: Priority.MEDIUM, employees: 12, area: 150, nightOp: true, h24: false, highTraffic: true, largeExterior: true, newBiz: false, value: 6000, address: { street: 'Rua Aspicuelta', number: '200', neighborhood: 'Vila Madalena', city: 'São Paulo', state: 'SP', zipCode: '05433-010', lat: -23.5530, lng: -46.6910 }, contacts: [{ type: ContactType.WHATSAPP, value: '(11) 93333-2222' }], stage: 'novo-lead', seller: 3 },

    // FACULDADE
    { name: 'Faculdade Metropolitana SP', tradeName: 'FacMetro', companyName: 'Faculdade Metropolitana de São Paulo SA', cnpj: '11.234.567/0001-01', segment: 'faculdade', status: LeadStatus.QUALIFIED, priority: Priority.HIGH, employees: 200, area: 4000, nightOp: true, h24: false, highTraffic: true, largeExterior: true, newBiz: false, value: 40000, address: { street: 'Rua Vergueiro', number: '2000', neighborhood: 'Liberdade', city: 'São Paulo', state: 'SP', zipCode: '01504-001', lat: -23.5640, lng: -46.6360 }, contacts: [{ type: ContactType.PHONE, value: '(11) 3385-6789' }, { type: ContactType.EMAIL, value: 'infraestrutura@facmetro.edu.br' }], stage: 'qualificado', seller: 1 },

    // RESIDÊNCIAS DE ALTO PADRÃO
    { name: 'Mansão Jardim Paulistano', tradeName: null, companyName: null, cnpj: null, segment: 'residencia-alto-padrao', status: LeadStatus.NEW, priority: Priority.HIGH, employees: 3, area: 1500, nightOp: false, h24: false, highTraffic: false, largeExterior: true, newBiz: false, value: 25000, address: { street: 'Rua Coronel Lisboa', number: '50', neighborhood: 'Jardim Paulistano', city: 'São Paulo', state: 'SP', zipCode: '01443-020', lat: -23.5680, lng: -46.6850 }, contacts: [{ type: ContactType.WHATSAPP, value: '(11) 92222-1111' }], stage: 'novo-lead', seller: 0 },
    { name: 'Residência Alto de Pinheiros', tradeName: null, companyName: null, cnpj: null, segment: 'residencia-alto-padrao', status: LeadStatus.CONTACTED, priority: Priority.MEDIUM, employees: 2, area: 800, nightOp: false, h24: false, highTraffic: false, largeExterior: true, newBiz: false, value: 18000, address: { street: 'Rua Professor Artur Ramos', number: '300', neighborhood: 'Alto de Pinheiros', city: 'São Paulo', state: 'SP', zipCode: '05424-010', lat: -23.5530, lng: -46.7020 }, contacts: [{ type: ContactType.PHONE, value: '(11) 3021-4567' }], stage: 'contato-realizado', seller: 2 },

    // MAIS LEADS DIVERSOS
    { name: 'Padaria Pão Dourado', tradeName: 'Pão Dourado', companyName: 'Pão Dourado Panificação Ltda', cnpj: '13.456.789/0001-01', segment: 'comercio', status: LeadStatus.NEW, priority: Priority.LOW, employees: 8, area: 100, nightOp: false, h24: false, highTraffic: true, largeExterior: false, newBiz: false, value: 4000, address: { street: 'Rua dos Pinheiros', number: '500', neighborhood: 'Pinheiros', city: 'São Paulo', state: 'SP', zipCode: '05422-010', lat: -23.5650, lng: -46.6920 }, contacts: [{ type: ContactType.PHONE, value: '(11) 3062-3456' }], stage: 'novo-lead', seller: 3 },
    { name: 'Pet Shop Amigo Fiel', tradeName: 'Amigo Fiel', companyName: null, cnpj: '14.567.890/0001-01', segment: 'comercio', status: LeadStatus.NEW, priority: Priority.LOW, employees: 5, area: 80, nightOp: false, h24: false, highTraffic: true, largeExterior: false, newBiz: true, value: 3500, address: { street: 'Rua Teodoro Sampaio', number: '1200', neighborhood: 'Pinheiros', city: 'São Paulo', state: 'SP', zipCode: '05406-100', lat: -23.5580, lng: -46.6870 }, contacts: [{ type: ContactType.WHATSAPP, value: '(11) 91111-0000' }], stage: 'novo-lead', seller: 0 },
    { name: 'Ótica Visual Center', tradeName: 'Visual Center', companyName: 'Visual Center Ótica Ltda', cnpj: '15.678.901/0001-01', segment: 'loja', status: LeadStatus.CONTACTED, priority: Priority.LOW, employees: 4, area: 60, nightOp: false, h24: false, highTraffic: true, largeExterior: false, newBiz: false, value: 3000, address: { street: 'Rua Augusta', number: '1500', neighborhood: 'Consolação', city: 'São Paulo', state: 'SP', zipCode: '01304-001', lat: -23.5520, lng: -46.6580 }, contacts: [{ type: ContactType.PHONE, value: '(11) 3256-7890' }], stage: 'contato-realizado', seller: 1 },

    // COMÉRCIOS EM MOEMA
    { name: 'Lavanderia Express Clean', tradeName: 'Express Clean', companyName: null, cnpj: '16.789.012/0001-01', segment: 'comercio', status: LeadStatus.NEW, priority: Priority.LOW, employees: 6, area: 90, nightOp: false, h24: false, highTraffic: false, largeExterior: false, newBiz: false, value: 3000, address: { street: 'Av. Ibirapuera', number: '2500', neighborhood: 'Moema', city: 'São Paulo', state: 'SP', zipCode: '04029-200', lat: -23.5990, lng: -46.6610 }, contacts: [{ type: ContactType.PHONE, value: '(11) 5052-3456' }], stage: 'novo-lead', seller: 2 },

    // TATUAPÉ
    { name: 'Supermercado Boa Compra Tatuapé', tradeName: 'Boa Compra', companyName: 'Boa Compra Alimentos SA', cnpj: '17.890.123/0001-01', segment: 'supermercado', status: LeadStatus.NEW, priority: Priority.HIGH, employees: 35, area: 700, nightOp: true, h24: false, highTraffic: true, largeExterior: true, newBiz: false, value: 14000, address: { street: 'Rua Apucarana', number: '1000', neighborhood: 'Tatuapé', city: 'São Paulo', state: 'SP', zipCode: '03311-000', lat: -23.5390, lng: -46.5810 }, contacts: [{ type: ContactType.PHONE, value: '(11) 2097-5678' }, { type: ContactType.WHATSAPP, value: '(11) 98888-7777' }], stage: 'novo-lead', seller: 3 },

    // SANTO AMARO
    { name: 'Centro Empresarial Santo Amaro', tradeName: 'CE Santo Amaro', companyName: 'CE Santo Amaro Administração SA', cnpj: '18.901.234/0001-01', segment: 'empresa', status: LeadStatus.NEW, priority: Priority.HIGH, employees: 50, area: 2000, nightOp: false, h24: false, highTraffic: true, largeExterior: true, newBiz: false, value: 30000, address: { street: 'Av. Santo Amaro', number: '5000', neighborhood: 'Santo Amaro', city: 'São Paulo', state: 'SP', zipCode: '04701-200', lat: -23.6280, lng: -46.6880 }, contacts: [{ type: ContactType.PHONE, value: '(11) 5521-7890' }, { type: ContactType.EMAIL, value: 'administracao@cesantoamaro.com.br' }], stage: 'novo-lead', seller: 0 },
    { name: 'Auto Elétrica Raio', tradeName: 'Auto Raio', companyName: null, cnpj: '19.012.345/0001-01', segment: 'comercio', status: LeadStatus.NEW, priority: Priority.LOW, employees: 4, area: 100, nightOp: false, h24: false, highTraffic: false, largeExterior: true, newBiz: false, value: 3500, address: { street: 'Rua Barão do Rio Branco', number: '800', neighborhood: 'Santo Amaro', city: 'São Paulo', state: 'SP', zipCode: '04757-000', lat: -23.6320, lng: -46.6920 }, contacts: [{ type: ContactType.WHATSAPP, value: '(11) 97777-6666' }], stage: 'novo-lead', seller: 1 },

    // MAIS LEADS PINHEIROS
    { name: 'Coworking Innovation Hub', tradeName: 'Innovation Hub', companyName: 'Innovation Hub Espaços Ltda', cnpj: '20.123.456/0001-01', segment: 'empresa', status: LeadStatus.QUALIFIED, priority: Priority.MEDIUM, employees: 10, area: 400, nightOp: false, h24: false, highTraffic: true, largeExterior: false, newBiz: true, value: 12000, address: { street: 'Rua Artur de Azevedo', number: '1200', neighborhood: 'Pinheiros', city: 'São Paulo', state: 'SP', zipCode: '05404-003', lat: -23.5570, lng: -46.6880 }, contacts: [{ type: ContactType.EMAIL, value: 'contato@innovationhub.com.br' }], stage: 'qualificado', seller: 2 },

    // MAIS LEADS VILA OLÍMPIA
    { name: 'Clínica Estética Renova', tradeName: 'Renova Estética', companyName: 'Renova Estética e Bem Estar Ltda', cnpj: '21.234.567/0001-01', segment: 'clinica', status: LeadStatus.NEW, priority: Priority.MEDIUM, employees: 15, area: 200, nightOp: false, h24: false, highTraffic: true, largeExterior: false, newBiz: true, value: 9000, address: { street: 'Rua Fidêncio Ramos', number: '300', neighborhood: 'Vila Olímpia', city: 'São Paulo', state: 'SP', zipCode: '04551-010', lat: -23.5950, lng: -46.6860 }, contacts: [{ type: ContactType.PHONE, value: '(11) 3044-2345' }, { type: ContactType.WHATSAPP, value: '(11) 96543-2109' }], stage: 'novo-lead', seller: 3 },

    // WON / CLIENTES
    { name: 'Shopping Center Plaza Sul', tradeName: 'Plaza Sul', companyName: 'Plaza Sul Shopping Center SA', cnpj: '22.345.678/0001-01', segment: 'comercio', status: LeadStatus.WON, priority: Priority.HIGH, employees: 200, area: 15000, nightOp: true, h24: false, highTraffic: true, largeExterior: true, newBiz: false, value: 90000, address: { street: 'Av. Professor Abraão de Morais', number: '2000', neighborhood: 'Saúde', city: 'São Paulo', state: 'SP', zipCode: '04101-200', lat: -23.6100, lng: -46.6350 }, contacts: [{ type: ContactType.PHONE, value: '(11) 5073-1234' }, { type: ContactType.EMAIL, value: 'seguranca@plazasul.com.br' }], stage: 'cliente-fechado', seller: 0 },
    { name: 'Banco Regional Investimentos', tradeName: 'BRI', companyName: 'Banco Regional de Investimentos SA', cnpj: '23.456.789/0001-04', segment: 'empresa', status: LeadStatus.WON, priority: Priority.URGENT, employees: 300, area: 2500, nightOp: false, h24: true, highTraffic: true, largeExterior: false, newBiz: false, value: 75000, address: { street: 'Av. Paulista', number: '1000', neighborhood: 'Bela Vista', city: 'São Paulo', state: 'SP', zipCode: '01310-100', lat: -23.5640, lng: -46.6540 }, contacts: [{ type: ContactType.PHONE, value: '(11) 3251-5678' }, { type: ContactType.EMAIL, value: 'facilities@bri.com.br' }], stage: 'cliente-fechado', seller: 1 },
  ];

  const allSellers = [sellers[0], sellers[1], sellers[2], sellers[3]];

  for (const leadInfo of leadsData) {
    const segmentObj = segments[leadInfo.segment];
    const sellerObj = allSellers[leadInfo.seller];
    const stageId = stageMap[leadInfo.stage];

    const lead = await prisma.lead.create({
      data: {
        name: leadInfo.name,
        tradeName: leadInfo.tradeName,
        companyName: leadInfo.companyName,
        cnpj: leadInfo.cnpj,
        segmentId: segmentObj?.id,
        responsibleId: sellerObj.id,
        pipelineStageId: stageId,
        status: leadInfo.status,
        priority: leadInfo.priority,
        source: 'Prospecção',
        estimatedEmployees: leadInfo.employees,
        estimatedArea: leadInfo.area,
        isNightOperation: leadInfo.nightOp,
        is24hOperation: leadInfo.h24,
        hasHighTraffic: leadInfo.highTraffic,
        hasLargeExterior: leadInfo.largeExterior,
        isNewBusiness: leadInfo.newBiz,
        potentialValue: leadInfo.value,
        lastContactAt: leadInfo.status !== LeadStatus.NEW ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
      },
    });

    // Address
    await prisma.address.create({
      data: {
        leadId: lead.id,
        street: leadInfo.address.street,
        number: leadInfo.address.number,
        neighborhood: leadInfo.address.neighborhood,
        city: leadInfo.address.city,
        state: leadInfo.address.state,
        zipCode: leadInfo.address.zipCode,
        latitude: leadInfo.address.lat,
        longitude: leadInfo.address.lng,
        formattedAddress: `${leadInfo.address.street}, ${leadInfo.address.number} - ${leadInfo.address.neighborhood}, ${leadInfo.address.city} - ${leadInfo.address.state}`,
      },
    });

    // Contacts
    for (const contact of leadInfo.contacts) {
      await prisma.contact.create({
        data: {
          leadId: lead.id,
          type: contact.type,
          value: contact.value,
          isPrimary: leadInfo.contacts.indexOf(contact) === 0,
        },
      });
    }

    // Calculate and store score
    let scoreTotal = 0;
    const factors: { factor: string; points: number; label: string }[] = [];

    // Segment score
    const segRule = scoreRules.find(r => r.segmentId === segmentObj?.id);
    if (segRule) {
      scoreTotal += segRule.points;
      factors.push({ factor: segRule.factor, points: segRule.points, label: segRule.name });
    }

    if (leadInfo.nightOp) { scoreTotal += 20; factors.push({ factor: 'night_operation', points: 20, label: 'Funcionamento Noturno' }); }
    if (leadInfo.highTraffic) { scoreTotal += 15; factors.push({ factor: 'high_traffic', points: 15, label: 'Grande Circulação de Pessoas' }); }
    if (leadInfo.largeExterior) { scoreTotal += 15; factors.push({ factor: 'large_exterior', points: 15, label: 'Área Externa Ampla' }); }
    if (leadInfo.employees > 30) { scoreTotal += 10; factors.push({ factor: 'many_employees', points: 10, label: 'Mais de 30 Funcionários' }); }
    if (leadInfo.newBiz) { scoreTotal += 15; factors.push({ factor: 'new_business', points: 15, label: 'Empreendimento Recém-Aberto' }); }
    if (leadInfo.area > 500) { scoreTotal += 10; factors.push({ factor: 'large_property', points: 10, label: 'Imóvel Grande' }); }
    if (leadInfo.h24) { scoreTotal += 10; factors.push({ factor: '24h_operation', points: 10, label: 'Funcionamento 24 Horas' }); }

    // Cap at 100
    scoreTotal = Math.min(scoreTotal, 100);

    let level: ScoreLevel;
    if (scoreTotal >= 90) level = ScoreLevel.PRIORITY;
    else if (scoreTotal >= 80) level = ScoreLevel.HIGH;
    else if (scoreTotal >= 60) level = ScoreLevel.GOOD;
    else if (scoreTotal >= 40) level = ScoreLevel.MEDIUM;
    else level = ScoreLevel.LOW;

    await prisma.score.create({
      data: { leadId: lead.id, total: scoreTotal, level },
    });

    for (const f of factors) {
      await prisma.scoreFactor.create({
        data: { leadId: lead.id, ...f },
      });
    }
  }

  // ============================
  // GOALS
  // ============================
  console.log('🎯 Criando metas...');
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  for (const seller of allSellers) {
    await prisma.goal.create({
      data: {
        userId: seller.id,
        teamId: team.id,
        type: GoalType.SALES_COUNT,
        target: 15,
        current: Math.floor(Math.random() * 12),
        month: currentMonth,
        year: currentYear,
        description: `Meta de vendas - ${seller.name}`,
      },
    });
    await prisma.goal.create({
      data: {
        userId: seller.id,
        teamId: team.id,
        type: GoalType.VISITS,
        target: 40,
        current: Math.floor(Math.random() * 35),
        month: currentMonth,
        year: currentYear,
        description: `Meta de visitas - ${seller.name}`,
      },
    });
  }

  console.log('\n✅ Seed concluído com sucesso!');
  console.log('📊 Resumo:');
  console.log(`   - ${roles.length} roles`);
  console.log(`   - ${permissions.length} permissões`);
  console.log(`   - ${1 + allSellers.length + 1} usuários`);
  console.log(`   - ${segmentData.length} segmentos`);
  console.log(`   - 1 pipeline com 7 estágios`);
  console.log(`   - ${scoreRules.length} regras de score`);
  console.log(`   - ${products.length} produtos`);
  console.log(`   - ${services.length} serviços`);
  console.log(`   - ${leadsData.length} leads`);
  console.log(`   - ${allSellers.length * 2} metas`);
  console.log('\n🔑 Credenciais de acesso:');
  console.log('   Admin: admin@radar.com / radar123');
  console.log('   Gestor: gestor@radar.com / radar123');
  console.log('   Vendedores: carlos@radar.com, rafael@radar.com, andre@radar.com, lucas@radar.com / radar123');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
