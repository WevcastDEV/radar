'use client';

import React, { useState, useMemo } from 'react';
import { 
  Folder, 
  Search, 
  X, 
  Check,
  LayoutGrid,
  Filter,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCategoryMeta } from '@/lib/categories';

export interface FolderTabItem {
  id: string;
  label: string;
  icon: string;
  count: number;
  color?: string;
  topic?: string;
}

interface FolderTopicSelectorProps {
  folders: FolderTabItem[];
  selectedFolder: string;
  onSelectFolder: (folderId: string) => void;
  className?: string;
}

const TOPIC_ORDER = [
  '📌 Pastas do Sistema & Filtros',
  '🍽️ Alimentação',
  '💊 Saúde & Clínicas',
  '✂️ Beleza & Estética',
  '🛒 Varejo & Comércio',
  '🚗 Automotivo',
  '🏋️ Esportes & Lazer',
  '🏨 Turismo & Hotelaria',
  '🎓 Educação & Escolas',
  '👗 Moda & Vestuário',
  '🏢 Imóveis & Condomínios',
  '💼 Serviços Profissionais',
  '📱 Tecnologia & Celulares',
  '🏗️ Construção Civil',
  '🛋️ Casa & Decoração',
  '🖨️ Gráfica & B2B',
  '🧺 Serviços Gerais',
  '📂 Outros Segmentos',
];

function resolveTopicName(item: FolderTabItem): string {
  if (['all', 'no_phone', 'whatsapp_dispatched', 'cold_list'].includes(item.id)) {
    return '📌 Pastas do Sistema & Filtros';
  }
  if (item.topic) return item.topic;

  const meta = getCategoryMeta(item.id);
  const macro = meta.category || 'Outros';

  if (macro.includes('Alimentação')) return '🍽️ Alimentação';
  if (macro.includes('Saúde')) return '💊 Saúde & Clínicas';
  if (macro.includes('Beleza')) return '✂️ Beleza & Estética';
  if (macro.includes('Varejo') || macro.includes('Pet')) return '🛒 Varejo & Comércio';
  if (macro.includes('Automotivo')) return '🚗 Automotivo';
  if (macro.includes('Esportes')) return '🏋️ Esportes & Lazer';
  if (macro.includes('Turismo') || macro.includes('Hotel')) return '🏨 Turismo & Hotelaria';
  if (macro.includes('Educação')) return '🎓 Educação & Escolas';
  if (macro.includes('Moda')) return '👗 Moda & Vestuário';
  if (macro.includes('Imóveis')) return '🏢 Imóveis & Condomínios';
  if (macro.includes('Profissionais') || macro.includes('Jurídico')) return '💼 Serviços Profissionais';
  if (macro.includes('Tecnologia')) return '📱 Tecnologia & Celulares';
  if (macro.includes('Construção')) return '🏗️ Construção Civil';
  if (macro.includes('Decoração') || macro.includes('Casa')) return '🛋️ Casa & Decoração';
  if (macro.includes('B2B') || macro.includes('Impressão')) return '🖨️ Gráfica & B2B';
  if (macro.includes('Gerais') || macro.includes('Lavanderia')) return '🧺 Serviços Gerais';

  return '📂 Outros Segmentos';
}

export function FolderTopicSelector({
  folders,
  selectedFolder,
  onSelectFolder,
  className = '',
}: FolderTopicSelectorProps) {
  const [isGridModalOpen, setIsGridModalOpen] = useState(false);
  const [inlineFolderSearch, setInlineFolderSearch] = useState('');
  const [modalSearch, setModalSearch] = useState('');

  // Agrupamento hierárquico por Tópicos
  const groupedTopics = useMemo(() => {
    const groups: Record<string, FolderTabItem[]> = {};

    folders.forEach((folder) => {
      const topic = resolveTopicName(folder);
      if (!groups[topic]) groups[topic] = [];
      groups[topic].push(folder);
    });

    const sortedTopics: Array<{ topic: string; items: FolderTabItem[] }> = [];

    TOPIC_ORDER.forEach((topicName) => {
      if (groups[topicName] && groups[topicName].length > 0) {
        sortedTopics.push({ topic: topicName, items: groups[topicName] });
        delete groups[topicName];
      }
    });

    Object.entries(groups).forEach(([topicName, items]) => {
      if (items.length > 0) {
        sortedTopics.push({ topic: topicName, items });
      }
    });

    return sortedTopics;
  }, [folders]);

  // Resultados da busca direta pela Lupa
  const matchingInlineFolders = useMemo(() => {
    if (!inlineFolderSearch.trim()) return [];
    const q = inlineFolderSearch.toLowerCase().trim();
    return folders.filter((f) => f.label.toLowerCase().includes(q) || f.id.toLowerCase().includes(q));
  }, [folders, inlineFolderSearch]);

  // Filtragem no modal de grade
  const filteredModalTopics = useMemo(() => {
    if (!modalSearch.trim()) return groupedTopics;
    const q = modalSearch.toLowerCase().trim();

    return groupedTopics
      .map((group) => {
        const matchingItems = group.items.filter(
          (i) => i.label.toLowerCase().includes(q) || i.id.toLowerCase().includes(q)
        );
        const matchesTopic = group.topic.toLowerCase().includes(q);
        if (matchesTopic) return group;
        if (matchingItems.length > 0) return { ...group, items: matchingItems };
        return null;
      })
      .filter(Boolean) as Array<{ topic: string; items: FolderTabItem[] }>;
  }, [groupedTopics, modalSearch]);

  const activeFolderObj = folders.find((f) => f.id === selectedFolder) || folders[0];
  const isSpecialFolder = ['all', 'no_phone', 'whatsapp_dispatched', 'cold_list'].includes(selectedFolder);

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Container Principal: Dropdown por Tópicos + Lupa de Busca + Botão Ver Todas em Grade */}
      <div className="bg-card/80 border border-border/80 rounded-2xl p-3 shadow-xs backdrop-blur-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* 1. SELETOR DROPDOWN NATIVO POR TÓPICOS (Idêntico ao seletor de estados do Brasil) */}
          <div className="flex items-center gap-2 flex-1 min-w-[260px]">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5 shrink-0">
              <Folder className="w-4 h-4 text-primary" />
              Selecionar Pasta:
            </span>
            <div className="relative flex-1">
              <select
                value={selectedFolder}
                onChange={(e) => onSelectFolder(e.target.value)}
                className="h-9 w-full px-3 pr-8 rounded-xl bg-background border border-input text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs cursor-pointer hover:border-primary/60 transition-all"
                title="Selecione diretamente a pasta sem precisar arrastar nenhuma barra"
              >
                {groupedTopics.map((group) => (
                  <optgroup key={group.topic} label={group.topic}>
                    {group.items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.icon} {item.label} ({item.count} leads)
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* 2. LUPA DE PESQUISA RÁPIDA DE PASTAS */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none" />
            <input
              type="text"
              placeholder="🔍 Buscar pasta (ex: Padaria, Barbearia)..."
              value={inlineFolderSearch}
              onChange={(e) => setInlineFolderSearch(e.target.value)}
              className="h-9 w-full pl-9 pr-7 rounded-xl bg-background border border-input text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground shadow-xs"
            />
            {inlineFolderSearch && (
              <button
                type="button"
                onClick={() => setInlineFolderSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                title="Limpar busca"
              >
                ✕
              </button>
            )}
          </div>

          {/* 3. BOTÃO "VER TODAS EM GRADE" */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsGridModalOpen(true)}
            className="h-9 px-3 text-xs font-bold gap-1.5 shrink-0 bg-accent/40 hover:bg-accent border-border hover:border-primary/50 text-foreground"
            title="Abrir todas as pastas em grade visual completa"
          >
            <LayoutGrid className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">Ver Todas em Grade</span>
            <span className="sm:hidden">Grade</span>
            <span className="px-1.5 py-0.2 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
              {folders.length}
            </span>
          </Button>
        </div>

        {/* Exibição Instantânea de Resultados da Lupa */}
        {inlineFolderSearch.trim() && (
          <div className="p-2.5 rounded-xl bg-accent/40 border border-primary/25 space-y-1.5 animate-in fade-in duration-150">
            <div className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
              <Search className="w-3 h-3 text-primary" />
              Pastas encontradas para "{inlineFolderSearch}":
            </div>
            <div className="flex flex-wrap gap-1.5">
              {matchingInlineFolders.length === 0 ? (
                <span className="text-xs text-muted-foreground py-1">
                  Nenhuma pasta encontrada com esse nome.
                </span>
              ) : (
                matchingInlineFolders.map((item) => {
                  const isSelected = selectedFolder === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectFolder(item.id);
                        setInlineFolderSearch('');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-2xs ${
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-foreground hover:bg-accent hover:border-primary/50 border-border'
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-black/15 text-[10px] font-bold">
                        {item.count}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 4. PASTAS FIXAS DE ACESSO RÁPIDO (EM LINHA COM FLEX-WRAP, SEM BARRA DE ROLAGEM, SEM ARRASTAR!) */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
          <span className="text-[11px] font-bold text-muted-foreground mr-1 hidden sm:inline">
            Pastas Rápidas:
          </span>

          {/* As 4 pastas principais do sistema */}
          {folders.slice(0, 4).map((f) => {
            const isActive = selectedFolder === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onSelectFolder(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-2xs ${
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary ring-1 ring-primary/40'
                    : 'bg-card text-muted-foreground hover:text-foreground hover:bg-accent/50 border-border'
                }`}
              >
                <span>{f.icon}</span>
                <span>{f.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-primary-foreground/20 text-white' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {f.count}
                </span>
              </button>
            );
          })}

          {/* Se a pasta selecionada for um segmento específico (ex: Padaria), ela ganha um badge ativo com botão de fechar */}
          {!isSpecialFolder && activeFolderObj && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground border border-primary shadow-xs">
              <span>{activeFolderObj.icon}</span>
              <span>{activeFolderObj.label}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-primary-foreground/20 text-white text-[10px]">
                {activeFolderObj.count}
              </span>
              <button
                type="button"
                onClick={() => onSelectFolder('all')}
                className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5 text-xs transition"
                title="Voltar para Todas as Pastas"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE TODAS AS PASTAS EM GRADE (SEM ARRASTAR, TUDO VISÍVEL) */}
      {isGridModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-accent/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Todas as Pastas em Grade (Seleção Direta)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Clique em qualquer pasta para selecionar diretamente sem precisar arrastar nenhuma barra.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsGridModalOpen(false)}
                className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Lupa de Busca no Modal */}
            <div className="p-4 border-b border-border/60 bg-card flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
                <input
                  type="text"
                  placeholder="🔍 Pesquisar qualquer pasta ou segmento (ex: Padaria, Farmácia, Barbearia)..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-xl bg-background border border-input text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>
              <Button
                type="button"
                variant={selectedFolder === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  onSelectFolder('all');
                  setIsGridModalOpen(false);
                }}
                className="h-9 px-3 text-xs font-bold gap-1.5 shrink-0"
              >
                📁 Selecionar Todas as Pastas
              </Button>
            </div>

            {/* Grade de Pastas Agrupadas por Tópicos */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
              {filteredModalTopics.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Folder className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-semibold">Nenhuma pasta encontrada para a busca.</p>
                </div>
              ) : (
                filteredModalTopics.map((group) => {
                  const totalCountInTopic = group.items.reduce((acc, i) => acc + i.count, 0);
                  return (
                    <div key={group.topic} className="space-y-2.5">
                      <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                        <span className="text-xs font-black text-foreground tracking-wide flex items-center gap-1.5">
                          {group.topic}
                        </span>
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          {totalCountInTopic} {totalCountInTopic === 1 ? 'lead' : 'leads'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {group.items.map((item) => {
                          const isSelected = selectedFolder === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                onSelectFolder(item.id);
                                setIsGridModalOpen(false);
                              }}
                              className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all text-left group ${
                                isSelected
                                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                  : 'bg-background hover:bg-accent/60 border-border hover:border-primary/50 text-foreground'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate pr-2">
                                <span className="text-base shrink-0">{item.icon}</span>
                                <span className="truncate">{item.label}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isSelected
                                      ? 'bg-primary-foreground/20 text-white'
                                      : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                                  }`}
                                >
                                  {item.count}
                                </span>
                                {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer do Modal */}
            <div className="p-3 border-t border-border bg-accent/10 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Pasta selecionada:{' '}
                <strong className="text-foreground">
                  {activeFolderObj.icon} {activeFolderObj.label} ({activeFolderObj.count})
                </strong>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsGridModalOpen(false)}
                className="h-7 px-3 text-xs"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
