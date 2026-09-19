// ============================================
// Radar de Oportunidades — Shared Utilities
// ============================================

/**
 * Calcula a distância entre dois pontos usando a fórmula de Haversine
 * @returns Distância em quilômetros
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Formata valor monetário em Real brasileiro
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata data no padrão brasileiro
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

/**
 * Formata data e hora no padrão brasileiro
 */
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * Formata distância em km ou m
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Formata número com separador de milhar
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

/**
 * Formata porcentagem
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Gera código de proposta
 */
export function generateProposalCode(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PROP-${year}${month}-${random}`;
}

/**
 * Retorna o tempo relativo (ex: "2 horas atrás")
 */
export function timeAgo(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return 'agora';
  if (diffMins < 60) return `${diffMins} min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  if (diffWeeks < 4) return `${diffWeeks} sem atrás`;
  return `${diffMonths} meses atrás`;
}

/**
 * Formata CNPJ
 */
export function formatCNPJ(cnpj: string): string {
  const clean = cnpj.replace(/\D/g, '');
  return clean.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

/**
 * Formata telefone brasileiro
 */
export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }
  if (clean.length === 10) {
    return clean.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }
  return phone;
}

/**
 * Formata CEP
 */
export function formatCEP(cep: string): string {
  const clean = cep.replace(/\D/g, '');
  return clean.replace(/^(\d{5})(\d{3})$/, '$1-$2');
}

/**
 * Valida email
 */
export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Valida CNPJ
 */
export function isValidCNPJ(cnpj: string): boolean {
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(clean)) return false;

  let sum = 0;
  let weight = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (let i = 0; i < 12; i++) {
    sum += parseInt(clean[i]) * weight[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (parseInt(clean[12]) !== digit1) return false;

  sum = 0;
  weight = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (let i = 0; i < 13; i++) {
    sum += parseInt(clean[i]) * weight[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  return parseInt(clean[13]) === digit2;
}

/**
 * Trunca texto
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Gera cor para score
 */
export function getScoreColor(score: number): string {
  if (score >= 90) return '#EF4444'; // Vermelho - Prioritário
  if (score >= 80) return '#10B981'; // Verde - Alta
  if (score >= 60) return '#3B82F6'; // Azul - Boa
  if (score >= 40) return '#F59E0B'; // Amarelo - Média
  return '#6B7280'; // Cinza - Baixa
}

/**
 * Retorna label do nível do score
 */
export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Oportunidade prioritária';
  if (score >= 80) return 'Alta oportunidade';
  if (score >= 60) return 'Boa oportunidade';
  if (score >= 40) return 'Média oportunidade';
  return 'Baixa oportunidade';
}

/**
 * Calcula bounding box para busca por raio
 */
export function getBoundingBox(
  lat: number,
  lng: number,
  radiusKm: number
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const latDelta = radiusKm / 111.32;
  const lngDelta = radiusKm / (111.32 * Math.cos(toRadians(lat)));
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

/**
 * Slugify texto
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
