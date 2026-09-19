// ============================================
// Radar de Oportunidades — Shared Types
// ============================================

// ============================
// ENUMS
// ============================

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  SUPERVISOR = 'supervisor',
  SELLER = 'seller',
  SDR = 'sdr',
  VIEWER = 'viewer',
}

export enum LeadStatus {
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

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum ScoreLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  GOOD = 'GOOD',
  HIGH = 'HIGH',
  PRIORITY = 'PRIORITY',
}

export enum VisitStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
  RESCHEDULED = 'RESCHEDULED',
}

export enum ProposalStatus {
  CREATED = 'CREATED',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  NEGOTIATION = 'NEGOTIATION',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export enum ContactType {
  PHONE = 'PHONE',
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  WEBSITE = 'WEBSITE',
}

export enum ActivityType {
  NOTE = 'NOTE',
  CALL = 'CALL',
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  VISIT = 'VISIT',
  PROPOSAL = 'PROPOSAL',
  STATUS_CHANGE = 'STATUS_CHANGE',
  SCORE_UPDATE = 'SCORE_UPDATE',
  ASSIGNMENT = 'ASSIGNMENT',
  TASK = 'TASK',
}

export enum CallStatus {
  COMPLETED = 'COMPLETED',
  NO_ANSWER = 'NO_ANSWER',
  BUSY = 'BUSY',
  VOICEMAIL = 'VOICEMAIL',
  CALLBACK = 'CALLBACK',
  WRONG_NUMBER = 'WRONG_NUMBER',
}

export enum MessageChannel {
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
}

export enum GoalType {
  SALES_COUNT = 'SALES_COUNT',
  SALES_VALUE = 'SALES_VALUE',
  VISITS = 'VISITS',
  CALLS = 'CALLS',
  PROPOSALS = 'PROPOSALS',
  CONVERSION = 'CONVERSION',
}

export enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELED = 'CANCELED',
}

// ============================
// API RESPONSE TYPES
// ============================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================
// AUTH TYPES
// ============================

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  role: {
    id: string;
    name: string;
    slug: string;
  };
  team?: {
    id: string;
    name: string;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// ============================
// LEAD TYPES
// ============================

export interface LeadListItem {
  id: string;
  name: string;
  tradeName?: string;
  cnpj?: string;
  segment?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
  status: LeadStatus;
  priority: Priority;
  score?: {
    total: number;
    level: ScoreLevel;
  };
  address?: {
    neighborhood?: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
  };
  responsible?: {
    id: string;
    name: string;
  };
  potentialValue?: number;
  lastContactAt?: string;
  distance?: number;
  createdAt: string;
}

export interface LeadDetail extends LeadListItem {
  companyName?: string;
  estimatedEmployees?: number;
  estimatedArea?: number;
  operatingHours?: string;
  isNightOperation: boolean;
  is24hOperation: boolean;
  hasHighTraffic: boolean;
  hasLargeExterior: boolean;
  isNewBusiness: boolean;
  hasMultipleBranches: boolean;
  foundedAt?: string;
  nextAction?: string;
  nextActionAt?: string;
  notes?: string;
  source?: string;
  address?: AddressDetail;
  contacts: ContactInfo[];
  scoreFactors: ScoreFactorInfo[];
  pipelineStage?: {
    id: string;
    name: string;
    color: string;
  };
}

export interface AddressDetail {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
}

export interface ContactInfo {
  id: string;
  type: ContactType;
  value: string;
  label?: string;
  isPrimary: boolean;
}

export interface ScoreFactorInfo {
  factor: string;
  points: number;
  label: string;
}

export interface LeadFilters {
  search?: string;
  city?: string;
  state?: string;
  neighborhood?: string;
  segmentId?: string;
  status?: LeadStatus;
  priority?: Priority;
  scoreMin?: number;
  scoreMax?: number;
  responsibleId?: string;
  minEmployees?: number;
  maxEmployees?: number;
  createdAfter?: string;
  createdBefore?: string;
  lastContactAfter?: string;
  lastContactBefore?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}

export interface CreateLeadRequest {
  name: string;
  tradeName?: string;
  companyName?: string;
  cnpj?: string;
  segmentId?: string;
  responsibleId?: string;
  status?: LeadStatus;
  priority?: Priority;
  source?: string;
  estimatedEmployees?: number;
  estimatedArea?: number;
  operatingHours?: string;
  isNightOperation?: boolean;
  is24hOperation?: boolean;
  hasHighTraffic?: boolean;
  hasLargeExterior?: boolean;
  isNewBusiness?: boolean;
  potentialValue?: number;
  notes?: string;
  address?: CreateAddressRequest;
  contacts?: CreateContactRequest[];
}

export interface CreateAddressRequest {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
}

export interface CreateContactRequest {
  type: ContactType;
  value: string;
  label?: string;
  isPrimary?: boolean;
}

// ============================
// MAP TYPES
// ============================

export interface MapMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  segment?: string;
  segmentIcon?: string;
  segmentColor?: string;
  score: number;
  scoreLevel: ScoreLevel;
  status: LeadStatus;
  priority: Priority;
}

export interface HeatmapPoint {
  latitude: number;
  longitude: number;
  intensity: number;
}

export interface NearbyQuery {
  latitude: number;
  longitude: number;
  radiusKm: number;
  segmentId?: string;
  scoreMin?: number;
  limit?: number;
}

// ============================
// DASHBOARD TYPES
// ============================

export interface DashboardStats {
  totalLeads: number;
  priorityLeads: number;
  scheduledVisits: number;
  openProposals: number;
  monthlySales: number;
  conversionRate: number;
  avgTicket: number;
  totalNegotiation: number;
}

// ============================
// PIPELINE TYPES
// ============================

export interface PipelineStageData {
  id: string;
  name: string;
  slug: string;
  color: string;
  order: number;
  leads: LeadListItem[];
  count: number;
  totalValue: number;
}

export interface MovePipelineRequest {
  leadId: string;
  stageId: string;
  order?: number;
}

// ============================
// VISIT TYPES
// ============================

export interface CreateVisitRequest {
  leadId: string;
  scheduledAt: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

// ============================
// CALL TYPES
// ============================

export interface CreateCallRequest {
  leadId: string;
  phone: string;
  direction?: string;
  status?: CallStatus;
  duration?: number;
  result?: string;
  notes?: string;
  nextAction?: string;
  nextActionAt?: string;
}

// ============================
// PROPOSAL TYPES
// ============================

export interface CreateProposalRequest {
  leadId: string;
  title: string;
  description?: string;
  items: CreateProposalItemRequest[];
  installationFee?: number;
  monthlyFee?: number;
  contractMonths?: number;
  validUntil?: string;
  notes?: string;
}

export interface CreateProposalItemRequest {
  productId?: string;
  serviceId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

// ============================
// AI TYPES
// ============================

export interface AIRecommendation {
  leadId: string;
  leadName: string;
  score: number;
  distance: number;
  segment: string;
  reasons: string[];
  priority: number;
}

export interface AIRouteRequest {
  startLatitude: number;
  startLongitude: number;
  maxDistance: number;
  maxVisits: number;
  segmentId?: string;
  minScore?: number;
}

export interface AIRouteStop {
  leadId: string;
  leadName: string;
  address: string;
  latitude: number;
  longitude: number;
  score: number;
  distanceFromPrevious: number;
  order: number;
}

export interface AIRoute {
  stops: AIRouteStop[];
  totalDistance: number;
  estimatedTime: number;
  totalScore: number;
}

export interface RegionRanking {
  neighborhood: string;
  leadCount: number;
  avgScore: number;
  distance?: number;
  opportunities: number;
  previousSales: number;
  conversionPotential: number;
}

// ============================
// REPORT TYPES
// ============================

export interface TeamMemberStats {
  userId: string;
  userName: string;
  leads: number;
  calls: number;
  visits: number;
  proposals: number;
  sales: number;
  conversion: number;
  revenue: number;
  avgTicket: number;
}

export interface GoalProgress {
  id: string;
  type: GoalType;
  target: number;
  current: number;
  percentage: number;
  month: number;
  year: number;
  userName?: string;
  teamName?: string;
}

// ============================
// SEGMENT MAP (for icons)
// ============================

export const SEGMENT_ICONS: Record<string, string> = {
  'comercio': 'Store',
  'condominio': 'Building2',
  'residencia-alto-padrao': 'Home',
  'galpao': 'Warehouse',
  'clinica': 'Stethoscope',
  'hospital': 'Hospital',
  'escola': 'GraduationCap',
  'faculdade': 'BookOpen',
  'restaurante': 'UtensilsCrossed',
  'bar': 'Wine',
  'posto-combustivel': 'Fuel',
  'supermercado': 'ShoppingCart',
  'empresa': 'Briefcase',
  'loja': 'ShoppingBag',
  'farmacia': 'Pill',
  'academia': 'Dumbbell',
  'hotel': 'Hotel',
  'industria': 'Factory',
  'transportadora': 'Truck',
  'centro-logistico': 'Package',
  'construtora': 'HardHat',
  'novo-empreendimento': 'Building',
};

export const SCORE_COLORS: Record<ScoreLevel, string> = {
  [ScoreLevel.LOW]: '#6B7280',
  [ScoreLevel.MEDIUM]: '#F59E0B',
  [ScoreLevel.GOOD]: '#3B82F6',
  [ScoreLevel.HIGH]: '#10B981',
  [ScoreLevel.PRIORITY]: '#EF4444',
};

export const STATUS_LABELS: Record<LeadStatus, string> = {
  [LeadStatus.NEW]: 'Novo',
  [LeadStatus.CONTACTED]: 'Contato Realizado',
  [LeadStatus.QUALIFIED]: 'Qualificado',
  [LeadStatus.VISIT_SCHEDULED]: 'Visita Agendada',
  [LeadStatus.PROPOSAL_SENT]: 'Proposta Enviada',
  [LeadStatus.NEGOTIATION]: 'Negociação',
  [LeadStatus.WON]: 'Fechado',
  [LeadStatus.LOST]: 'Perdido',
  [LeadStatus.INACTIVE]: 'Inativo',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.LOW]: 'Baixa',
  [Priority.MEDIUM]: 'Média',
  [Priority.HIGH]: 'Alta',
  [Priority.URGENT]: 'Urgente',
};
