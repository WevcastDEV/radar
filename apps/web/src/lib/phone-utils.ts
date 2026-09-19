/**
 * Utilitarios de Tratamento, Normalizacao e Formatacao de Telefones Brasileiros.
 * 
 * Regras:
 * 1. Remove qualquer DDI '55' ou '+55' no inicio para armazenamento e exibicao,
 *    deixando estritamente no padrao brasileiro: (DD) 9XXXX-XXXX ou (DD) XXXX-XXXX.
 * 2. Trata e corrige numeros importados do Google Places API, planilhas CSV/JSON e cadastros manuais.
 * 3. Garante que disparos do robo WhatsApp recebam o numero correto no Baileys sem duplicidade de DDI.
 */

/**
 * Remove todos os caracteres nao numericos de uma string
 */
export function cleanPhoneDigits(raw: string | undefined | null): string {
  if (!raw) return '';
  return String(raw).replace(/\D/g, '');
}

/**
 * Normaliza qualquer formato de telefone brasileiro para os digitos nacionais (DDD + Numero),
 * removendo com seguranca o DDI 55 do inicio.
 * 
 * @param raw Numero bruto em qualquer formato (ex: +55 11 98888-7777, 5592981223344, 99356-0683)
 * @param fallbackDDD DDD padrao se o numero nao tiver DDD (padrao: '92' para Manaus/AM)
 * @returns String de 10 ou 11 digitos nacionais (ex: "92981223344")
 */
export function extractBrazilianNationalDigits(raw: string | undefined | null, fallbackDDD = '92'): string {
  if (!raw) return '';
  let digits = cleanPhoneDigits(raw);
  if (!digits) return '';

  // Remove repeticoes acidentais de 55 no inicio (ex: 5555...)
  while (digits.startsWith('5555') && digits.length >= 14) {
    digits = digits.slice(2);
  }

  // Se tem 12 ou 13 digitos e comeca com 55: e 55 + DDD (2 digitos) + 8 ou 9 digitos
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }
  // Se tem 11 digitos, comeca com 55 e o terceiro digito e 9 (ex: 55993560683 -> 55 + 9 digitos sem DDD)
  else if (digits.startsWith('55') && digits.length === 11 && fallbackDDD !== '55') {
    // E o caso de 55 (DDI) + celular de 9 digitos onde faltou o DDD
    const nineDigits = digits.slice(2);
    digits = `${fallbackDDD}${nineDigits}`;
  }

  // Se faltar o DDD (numero com 8 ou 9 digitos)
  if (digits.length === 8) {
    // 8 digitos: adiciona nono digito se for celular movel (comeca com 6, 7, 8, 9)
    const first = digits[0];
    const local = ['6', '7', '8', '9'].includes(first) ? `9${digits}` : digits;
    digits = `${fallbackDDD}${local}`;
  } else if (digits.length === 9) {
    digits = `${fallbackDDD}${digits}`;
  }

  // Se tem 10 digitos (DDD + 8 digitos) e comeca com celular (6, 7, 8, 9), adiciona o nono digito 9
  if (digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const firstDigit = digits[2];
    if (['6', '7', '8', '9'].includes(firstDigit)) {
      digits = `${ddd}9${digits.slice(2)}`;
    }
  }

  return digits;
}

/**
 * Formata qualquer telefone para a exibicao limpa sem 55 no inicio:
 * Exemplo: (DD) 9XXXX-XXXX ou (DD) XXXX-XXXX
 */
export function formatBrazilianPhone(raw: string | undefined | null, fallbackDDD = '92'): string {
  if (!raw) return '';
  const national = extractBrazilianNationalDigits(raw, fallbackDDD);
  if (!national) return String(raw);

  // Celular com 9 digitos: (DD) 9XXXX-XXXX (11 digitos)
  if (national.length === 11) {
    const ddd = national.slice(0, 2);
    const p1 = national.slice(2, 7);
    const p2 = national.slice(7);
    return `(${ddd}) ${p1}-${p2}`;
  }

  // Fixo ou celular legado de 8 digitos: (DD) XXXX-XXXX (10 digitos)
  if (national.length === 10) {
    const ddd = national.slice(0, 2);
    const p1 = national.slice(2, 6);
    const p2 = national.slice(6);
    return `(${ddd}) ${p1}-${p2}`;
  }

  return String(raw);
}

/**
 * Prepara o telefone para o envio via Baileys WhatsApp no formato canonico:
 * Retorna sempre "55" + 2 digitos de DDD + 8 ou 9 digitos (12 ou 13 digitos)
 * SEM duplicar o 55 e SEM omitir o DDD.
 */
export function toWhatsAppJidDigits(raw: string | undefined | null, fallbackDDD = '92'): string {
  if (!raw) return '';
  const national = extractBrazilianNationalDigits(raw, fallbackDDD);
  if (!national || national.length < 10) {
    const clean = cleanPhoneDigits(raw);
    if (clean.startsWith('55')) return clean;
    return `55${clean}`;
  }
  return `55${national}`;
}

/**
 * Extrai todas as variantes numericas de um telefone (com 55, sem 55, com/sem 9o digito)
 * para busca, comparacao e protecao anti-reenvio.
 */
export function extractPhoneVariants(raw: string | undefined | null, fallbackDDD = '92'): string[] {
  if (!raw) return [];
  const national = extractBrazilianNationalDigits(raw, fallbackDDD);
  const clean = cleanPhoneDigits(raw);

  const variants = new Set<string>();
  if (clean) variants.add(clean);
  if (national) {
    variants.add(national);
    variants.add(`55${national}`);

    // Celular de 11 digitos com 9
    if (national.length === 11 && national[2] === '9') {
      const eightDigit = national.slice(0, 2) + national.slice(3);
      variants.add(eightDigit);
      variants.add(`55${eightDigit}`);
    } else if (national.length === 10) {
      const nineDigit = national.slice(0, 2) + '9' + national.slice(2);
      variants.add(nineDigit);
      variants.add(`55${nineDigit}`);
    }
  }

  return Array.from(variants).filter(Boolean);
}
