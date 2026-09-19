import { LeadListItem, LeadStatus, Priority, ScoreLevel } from '@radar/types';
import { getStoredLeads, saveStoredLeads, getDispatchedHistory } from '@/hooks/use-leads';
import { detectCategory } from '@/lib/categories';
import { detectStateAndCity, getStateByUF } from '@/lib/brazil-states';
import { formatBrazilianPhone, extractBrazilianNationalDigits } from '@/lib/phone-utils';

export interface SystemBackupPayload {
  version: string;
  exportedAt: string;
  system: string;
  totalLeads: number;
  leads: LeadListItem[];
  whatsappHistory?: any[];
  templates?: any[];
}

/**
 * Faz download de um arquivo no navegador
 */
function triggerBrowserDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exporta backup COMPLETO em JSON (para migração 100% fiel para nova versão ou outro PC)
 */
export function exportBackupJSON(): { filename: string; count: number } {
  const leads = getStoredLeads();
  const history = getDispatchedHistory();

  let templates: any[] = [];
  try {
    const rawTpl = localStorage.getItem('whatsapp_custom_templates');
    if (rawTpl) templates = JSON.parse(rawTpl);
  } catch {}

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const filename = `backup-radar-leads-${dateStr}.json`;

  const payload: SystemBackupPayload = {
    version: '2.0',
    exportedAt: now.toISOString(),
    system: 'Radar de Oportunidades - Wev Engineer',
    totalLeads: leads.length,
    leads,
    whatsappHistory: history,
    templates,
  };

  triggerBrowserDownload(JSON.stringify(payload, null, 2), filename, 'application/json;charset=utf-8');
  return { filename, count: leads.length };
}

/**
 * Exporta planilha CSV compatível com Excel, Google Planilhas e CRMs externos
 */
export function exportLeadsCSV(): { filename: string; count: number } {
  const leads = getStoredLeads();
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const filename = `leads-comercial-${dateStr}.csv`;

  // Cabeçalhos amigáveis em português
  const headers = [
    'ID',
    'Nome da Empresa',
    'Telefone / WhatsApp',
    'Segmento / Pasta',
    'Categoria',
    'Status',
    'Score',
    'Valor Potencial (R$)',
    'Cidade',
    'Estado (UF)',
    'Bairro',
    'Endereço Completo',
    'Latitude',
    'Longitude',
    'Data de Cadastro',
  ];

  const rows = leads.map(item => {
    const l = item as any;
    const addr = l.address || {};
    const cleanPhone = formatBrazilianPhone(l.phone || '');
    const category = l.category || l.segment?.name || '';
    const subcategory = l.subcategory || l.segment?.name || '';
    const value = l.potentialValue || 0;
    const score = l.score?.total || 0;

    return [
      `"${l.id || ''}"`,
      `"${(l.name || '').replace(/"/g, '""')}"`,
      `"${cleanPhone}"`,
      `"${subcategory.replace(/"/g, '""')}"`,
      `"${category.replace(/"/g, '""')}"`,
      `"${l.status || 'NOVO'}"`,
      `"${score}"`,
      `"${value}"`,
      `"${(addr.city || '').replace(/"/g, '""')}"`,
      `"${(addr.state || '').replace(/"/g, '""')}"`,
      `"${(addr.neighborhood || '').replace(/"/g, '""')}"`,
      `"${(addr.formattedAddress || '').replace(/"/g, '""')}"`,
      `"${addr.latitude || ''}"`,
      `"${addr.longitude || ''}"`,
      `"${l.createdAt || ''}"`,
    ].join(';');
  });

  // UTF-8 BOM (\uFEFF) para garantir que o Excel abra acentos brasileiros perfeitamente
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  triggerBrowserDownload(csvContent, filename, 'text/csv;charset=utf-8');
  return { filename, count: leads.length };
}

/**
 * Importa e restaura leads de um arquivo JSON ou CSV
 */
export function importLeadsBackup(
  rawContent: string,
  mode: 'merge' | 'replace' = 'merge'
): { success: boolean; importedCount: number; duplicatesSkipped: number; message: string } {
  try {
    const trimmed = rawContent.trim();
    if (!trimmed) {
      throw new Error('O arquivo selecionado está vazio.');
    }

    let parsedLeads: any[] = [];

    // 1. Tentar fazer parse como JSON
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      const json = JSON.parse(trimmed);

      if (Array.isArray(json)) {
        parsedLeads = json;
      } else if (json && Array.isArray(json.leads)) {
        parsedLeads = json.leads;

        // Se houver histórico de WhatsApp no backup e for modo substituição ou histórico vazio, restaura
        if (Array.isArray(json.whatsappHistory) && json.whatsappHistory.length > 0) {
          try {
            const currentHist = getDispatchedHistory();
            if (mode === 'replace' || currentHist.length === 0) {
              localStorage.setItem('whatsapp_dispatched_history', JSON.stringify(json.whatsappHistory));
            }
          } catch {}
        }

        // Se houver modelos de mensagem, restaura
        if (Array.isArray(json.templates) && json.templates.length > 0) {
          try {
            localStorage.setItem('whatsapp_custom_templates', JSON.stringify(json.templates));
          } catch {}
        }
      } else {
        throw new Error('Formato JSON não reconhecido. Certifique-se de que o arquivo contém uma lista de leads.');
      }
    } else {
      // 2. Parse como CSV
      parsedLeads = parseCsvLeads(trimmed);
    }

    if (!Array.isArray(parsedLeads) || parsedLeads.length === 0) {
      throw new Error('Nenhum lead válido foi encontrado no arquivo.');
    }

    // Normalização completa dos leads importados
    const normalizedLeads: LeadListItem[] = parsedLeads.map((item, idx) => {
      const rawName = item.name || item['Nome da Empresa'] || item['Nome'] || `Lead Importado ${idx + 1}`;
      const rawPhone = item.phone || item['Telefone / WhatsApp'] || item['Telefone'] || '';
      const rawAddress = item.address?.formattedAddress || item['Endereço Completo'] || item['Endereco'] || item.address || '';
      const detected = detectStateAndCity(typeof rawAddress === 'string' ? rawAddress : '', rawPhone);

      const state = item.address?.state || item['Estado (UF)'] || item['Estado'] || detected.state || 'SP';
      const city = item.address?.city || item['Cidade'] || detected.city || 'São Paulo';
      const neighborhood = item.address?.neighborhood || item['Bairro'] || 'Centro';
      const stObj = getStateByUF(state);
      const defaultDDD = stObj?.ddds?.[0] || '92';
      const cleanPhone = formatBrazilianPhone(rawPhone, defaultDDD);

      const catRaw = item.subcategory || item['Segmento / Pasta'] || item.segment?.name || item.segment || 'Geral';
      const catInfo = detectCategory(rawName, [catRaw], `${city} - ${state}`);

      const totalScore = Number(item.score?.total || item['Score']) || 75;
      let scoreLevel = ScoreLevel.HIGH;
      if (totalScore < 40) scoreLevel = ScoreLevel.LOW;
      else if (totalScore < 65) scoreLevel = ScoreLevel.GOOD;

      return {
        id: item.id || `lead-import-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        name: rawName,
        tradeName: item.tradeName || rawName,
        segment: {
          id: item.segment?.id || `seg-${Date.now()}-${idx}`,
          name: catInfo.subcategory,
          icon: catInfo.icon,
          color: catInfo.color,
        },
        category: catInfo.category,
        subcategory: catInfo.subcategory,
        status: item.status || LeadStatus.NEW,
        priority: item.priority || Priority.HIGH,
        score: {
          total: totalScore,
          level: scoreLevel,
        },
        address: {
          neighborhood,
          city,
          state,
          formattedAddress: typeof rawAddress === 'string' && rawAddress ? rawAddress : `${neighborhood}, ${city} - ${state}`,
          latitude: Number(item.address?.latitude || item['Latitude']) || -23.5505,
          longitude: Number(item.address?.longitude || item['Longitude']) || -46.6333,
        },
        potentialValue: Number(item.potentialValue || item['Valor Potencial (R$)'] || item['Valor Potencial']) || 3500,
        createdAt: item.createdAt || new Date().toISOString(),
        phone: cleanPhone,
      } as any;
    });

    const currentLeads = mode === 'replace' ? [] : getStoredLeads();
    const existingPhones = new Set(
      currentLeads
        .map(l => extractBrazilianNationalDigits((l as any).phone))
        .filter(Boolean)
    );
    const existingNames = new Set(
      currentLeads.map(l => l.name.trim().toLowerCase())
    );

    let importedCount = 0;
    let duplicatesSkipped = 0;
    const finalLeads = [...currentLeads];

    normalizedLeads.forEach(lead => {
      const nationalDigits = extractBrazilianNationalDigits((lead as any).phone);
      const cleanName = lead.name.trim().toLowerCase();

      // Checa duplicidade no modo merge
      if (mode === 'merge') {
        const isDuplicatePhone = nationalDigits && existingPhones.has(nationalDigits);
        const isDuplicateName = existingNames.has(cleanName);

        if (isDuplicatePhone || isDuplicateName) {
          duplicatesSkipped++;
          return;
        }
      }

      if (nationalDigits) existingPhones.add(nationalDigits);
      existingNames.add(cleanName);
      finalLeads.push(lead);
      importedCount++;
    });

    saveStoredLeads(finalLeads);
    return {
      success: true,
      importedCount,
      duplicatesSkipped,
      message: `${importedCount} leads importados com sucesso!${duplicatesSkipped > 0 ? ` (${duplicatesSkipped} duplicados ignorados)` : ''}`,
    };
  } catch (err: any) {
    return {
      success: false,
      importedCount: 0,
      duplicatesSkipped: 0,
      message: err?.message || 'Erro ao processar o arquivo de backup.',
    };
  }
}

/**
 * Utilitário para ler CSV separado por ponto e vírgula ou vírgula
 */
function parseCsvLeads(csvText: string): any[] {
  const lines = csvText.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Detecta separador (; ou ,)
  const firstLine = lines[0];
  const separator = firstLine.includes(';') ? ';' : ',';

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === separator && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(firstLine).map(h => h.replace(/^["']|["']$/g, '').trim());
  const list: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]).map(v => v.replace(/^["']|["']$/g, '').trim());
    if (values.length === 0 || values.every(v => !v)) continue;

    const obj: any = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || '';
    });
    list.push(obj);
  }

  return list;
}

export const STORAGE_KEYS_TO_CLEAR = [
  'radar_leads_data',
  'leads_storage',
  'radar_leads',
  'radar_visits_data',
  'radar_customers_data',
  'radar_proposals_data',
  'radar_goals_data',
  'radar_whatsapp_dispatched_history',
  'whatsapp_dispatched_history',
  'radar_whatsapp_selected_leads',
  'radar_whatsapp_attached_image',
  'radar_whatsapp_dispatch_config',
];

/**
 * Executa o reset completo e seguro de dados comerciais (leads, visitas, clientes, propostas e históricos)
 */
export function clearAllSystemData(): void {
  if (typeof window === 'undefined') return;

  for (const key of STORAGE_KEYS_TO_CLEAR) {
    localStorage.removeItem(key);
  }

  // Marca system_reset = true para evitar reinjeção de seeds
  localStorage.setItem('system_reset', 'true');
  localStorage.setItem('radar_leads_data', JSON.stringify([]));
  localStorage.setItem('radar_visits_data', JSON.stringify([]));
  localStorage.setItem('radar_customers_data', JSON.stringify([]));
  localStorage.setItem('radar_whatsapp_dispatched_history', JSON.stringify([]));
}
