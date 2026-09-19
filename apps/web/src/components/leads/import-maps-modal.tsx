'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, X, Copy, CheckCircle2, Search, Loader2, Plus, Check, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { useLeads, useCreateLead, useBatchCreateLeads } from '@/hooks/use-leads';
import { detectCategory } from '@/lib/categories';
import { BRAZIL_STATES, getStateByUF, detectStateAndCity } from '@/lib/brazil-states';
import { formatBrazilianPhone } from '@/lib/phone-utils';

interface ImportMapsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport?: (data: any) => void;
}

export function ImportMapsModal({ isOpen, onClose, onImport }: ImportMapsModalProps) {
  const { data: currentLeads } = useLeads();
  const { mutateAsync: createLead } = useCreateLead();
  const { mutateAsync: batchCreateLeads } = useBatchCreateLeads();

  const [activeTab, setActiveTab] = useState<'search' | 'paste'>('search');
  const [pastedText, setPastedText] = useState('');
  const [parsed, setParsed] = useState<any | null>(null);

  // Search State & Brazilian State Filter
  const [selectedUF, setSelectedUF] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isImportingAll, setIsImportingAll] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [providerName, setProviderName] = useState<string>('');
  const [customKey, setCustomKey] = useState<string>(() => {
    return typeof window !== 'undefined' ? (localStorage.getItem('google_places_api_key') || '') : '';
  });
  const [showKeyConfig, setShowKeyConfig] = useState(false);

  if (!isOpen) return null;

  // Check if a place is already imported
  const checkIfImported = (placeName: string) => {
    if (!currentLeads || currentLeads.length === 0) return false;
    const clean = placeName.trim().toLowerCase();
    return currentLeads.some(l => l.name.trim().toLowerCase() === clean);
  };

  // Manual Paste Logic
  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setPastedText(text);
    if (text.trim().length > 0) setParsed(parseGoogleMapsData(text));
    else setParsed(null);
  };

  const parseGoogleMapsData = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const result: any = { name: lines.length > 0 ? lines[0] : '', segment: '', address: '', phone: '', website: '' };
    const phoneRegex = /\(?\d{2}\)?\s?\d{4,5}-?\d{4}/;
    const webRegex = /^(http|www\.)|(\.com|\.br)/i;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (phoneRegex.test(line)) result.phone = line;
      else if (webRegex.test(line) && !line.includes(' ')) result.website = line;
      else if (line.includes('·') && !result.segment) result.segment = line.split('·')[1]?.trim() || '';
      else if (!result.address && line.length > 5 && !line.includes('Aberto') && !line.includes('Fecha')) result.address = line;
    }
    const catInfo = detectCategory(result.name, [result.segment], result.address);
    result.category = catInfo.category;
    result.subcategory = catInfo.subcategory;
    result.categoryBadge = catInfo.badge;
    return result;
  };

  const handleConfirmPaste = async () => {
    if (parsed && parsed.name) {
      await createLead({
        name: parsed.name,
        address: parsed.address,
        phone: formatBrazilianPhone(parsed.phone || ''),
        website: parsed.website,
        segment: parsed.subcategory || parsed.segment,
        category: parsed.category,
        subcategory: parsed.subcategory,
      });
      if (onImport) onImport(parsed);
      toast.success(`Lead "${parsed.name}" cadastrado na pasta ${parsed.subcategory || 'Geral'}!`);
      setPastedText('');
      setParsed(null);
      onClose();
    }
  };

  // Automated Search Logic
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    setProviderName('');
    
    try {
      const keyParam = customKey.trim() ? `&key=${encodeURIComponent(customKey.trim())}` : '';
      const res = await fetch(`/api/places?q=${encodeURIComponent(searchQuery)}${keyParam}`);
      const data = await res.json();
      
      if (data.success && Array.isArray(data.data)) {
        setSearchResults(data.data);
        setProviderName(data.providerName || 'Busca Concluída');
        if (data.data.length === 0) {
          toast('Nenhum estabelecimento encontrado. Tente especificar a cidade (ex: Padarias em Manaus)', { icon: 'ℹ️' });
        }
      } else {
        toast.error('Erro na busca: ' + (data.error || 'Falha ao buscar'));
      }
    } catch (error) {
      toast.error('Erro de conexão ao buscar locais.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveKey = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('google_places_api_key', customKey.trim());
      toast.success('Chave da API salva com sucesso!');
      setShowKeyConfig(false);
    }
  };

  const handleImportSingle = async (place: any) => {
    const catInfo = detectCategory(place.name, place.types || [], place.formatted_address);
    const detected = detectStateAndCity(place.formatted_address, place.phone);
    const targetUF = selectedUF !== 'TODOS' ? selectedUF : (place.state || detected.state);
    const stObj = getStateByUF(targetUF);
    const targetCity = place.city || (selectedUF !== 'TODOS' && stObj ? stObj.capital : detected.city);
    const cleanPhone = formatBrazilianPhone(place.phone || '', stObj?.ddds?.[0] || '92');

    await createLead({
      id: place.place_id,
      name: place.name,
      address: {
        neighborhood: place.neighborhood || '',
        city: targetCity,
        state: targetUF,
        formattedAddress: place.formatted_address || `${targetCity} - ${targetUF}`,
        latitude: place.lat || stObj?.coordinates.lat || -23.5505,
        longitude: place.lng || stObj?.coordinates.lng || -46.6333,
      },
      phone: cleanPhone,
      website: place.website || '',
      rating: place.rating || 4.5,
      segment: catInfo.subcategory,
      category: catInfo.category,
      subcategory: catInfo.subcategory,
    });

    if (onImport) onImport(place);
    toast.success(`Lead "${place.name}" adicionado na pasta [${catInfo.subcategory}] (${targetUF})!`);
  };

  const handleImportAll = async () => {
    const notImported = searchResults.filter(p => !checkIfImported(p.name));
    if (notImported.length === 0) {
      toast('Todos os locais desta pesquisa já estão na sua lista de leads!', { icon: 'ℹ️' });
      return;
    }

    setIsImportingAll(true);
    try {
      const enriched = notImported.map(place => {
        const detected = detectStateAndCity(place.formatted_address, place.phone);
        const targetUF = selectedUF !== 'TODOS' ? selectedUF : (place.state || detected.state);
        const stObj = getStateByUF(targetUF);
        const targetCity = place.city || (selectedUF !== 'TODOS' && stObj ? stObj.capital : detected.city);
        const cleanPhone = formatBrazilianPhone(place.phone || '', stObj?.ddds?.[0] || '92');
        return {
          ...place,
          phone: cleanPhone,
          state: targetUF,
          city: targetCity,
        };
      });
      await batchCreateLeads(enriched);
      toast.success(`${notImported.length} leads importados com sucesso com categorias automáticas!`);
      onClose();
    } catch (err) {
      toast.error('Erro ao importar lista de leads');
    } finally {
      setIsImportingAll(false);
    }
  };

  const unimportedCount = searchResults.filter(p => !checkIfImported(p.name)).length;

  // Exemplos dinâmicos por estado
  const currentSt = selectedUF !== 'TODOS' ? getStateByUF(selectedUF) : null;
  const quickTags = currentSt
    ? [
        `Padarias em ${currentSt.capital}`,
        `Pet Shops em ${currentSt.capital}`,
        `Barbearias em ${currentSt.capital}`,
        `Clínicas em ${currentSt.capital}`,
        `Restaurantes em ${currentSt.capital}`,
      ]
    : [
        'Padarias em São Paulo',
        'Restaurantes no Rio de Janeiro',
        'Clínicas em Belo Horizonte',
        'Barbearias em Curitiba',
        'Pet Shops em Salvador',
        'Padarias em Manaus',
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card w-full max-w-3xl rounded-xl border border-border shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2 text-primary">
            <MapPin className="w-5 h-5" />
            <h2 className="font-semibold text-lg text-foreground">Prospecção & Importação Nacional de Leads</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button 
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'search' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/20'}`}
            onClick={() => setActiveTab('search')}
          >
            Busca Automática no Google Places (API)
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'paste' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/20'}`}
            onClick={() => setActiveTab('paste')}
          >
            Colar Manual (Ctrl+C / Ctrl+V)
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'search' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-4">
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    🇧🇷 Estado / DDD Alvo:
                  </label>
                  <select
                    value={selectedUF}
                    onChange={(e) => {
                      const newUF = e.target.value;
                      setSelectedUF(newUF);
                      if (newUF !== 'TODOS') {
                        const s = getStateByUF(newUF);
                        if (s) setSearchQuery(`Padarias em ${s.capital}`);
                      }
                    }}
                    className="w-full h-11 px-3 rounded-md bg-background border border-input text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="TODOS">🇧🇷 Todo o Brasil (Qualquer UF)</option>
                    <optgroup label="Sudeste">
                      {BRAZIL_STATES.filter(s => s.region === 'Sudeste').map(s => (
                        <option key={s.uf} value={s.uf}>{s.uf} - {s.name} (DDD {s.ddds.slice(0, 3).join(',')})</option>
                      ))}
                    </optgroup>
                    <optgroup label="Sul">
                      {BRAZIL_STATES.filter(s => s.region === 'Sul').map(s => (
                        <option key={s.uf} value={s.uf}>{s.uf} - {s.name} (DDD {s.ddds.slice(0, 3).join(',')})</option>
                      ))}
                    </optgroup>
                    <optgroup label="Nordeste">
                      {BRAZIL_STATES.filter(s => s.region === 'Nordeste').map(s => (
                        <option key={s.uf} value={s.uf}>{s.uf} - {s.name} (DDD {s.ddds.slice(0, 3).join(',')})</option>
                      ))}
                    </optgroup>
                    <optgroup label="Centro-Oeste">
                      {BRAZIL_STATES.filter(s => s.region === 'Centro-Oeste').map(s => (
                        <option key={s.uf} value={s.uf}>{s.uf} - {s.name} (DDD {s.ddds.join(',')})</option>
                      ))}
                    </optgroup>
                    <optgroup label="Norte">
                      {BRAZIL_STATES.filter(s => s.region === 'Norte').map(s => (
                        <option key={s.uf} value={s.uf}>{s.uf} - {s.name} (DDD {s.ddds.join(',')})</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div className="sm:col-span-8">
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    Termo de Prospecção Comercial:
                  </label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder={
                        currentSt 
                          ? `Ex: Padarias em ${currentSt.capital} / Pet Shops / Barbearias` 
                          : "Ex: Padarias em São Paulo / Pet Shops no Rio / Barbearias em Curitiba"
                      }
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="h-11 text-sm"
                    />
                    <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()} className="h-11 px-5">
                      {isSearching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                      Buscar
                    </Button>
                  </div>
                </div>
              </div>

              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-1.5 text-xs items-center">
                <span className="text-muted-foreground font-medium">
                  {currentSt ? `Exemplos rápidos em ${currentSt.name}:` : 'Exemplos rápidos pelo Brasil:'}
                </span>
                {quickTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => { setSearchQuery(tag); }}
                    className="px-2 py-0.5 rounded bg-accent/40 hover:bg-accent text-muted-foreground hover:text-foreground border border-border"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* API Key Status */}
              <div className="text-xs flex items-center justify-between text-muted-foreground pt-1 border-t border-border">
                <span>
                  {customKey ? '🔑 Chave Google Places configurada' : '⚡ Google Places API V1 Ativa no Sistema'}
                </span>
                <button 
                  type="button" 
                  onClick={() => setShowKeyConfig(!showKeyConfig)}
                  className="text-primary hover:underline"
                >
                  {showKeyConfig ? 'Ocultar Configuração' : '⚙️ Alterar Chave Google'}
                </button>
              </div>

              {showKeyConfig && (
                <div className="p-3 rounded-lg bg-accent/30 border border-border space-y-2">
                  <label className="text-xs font-medium text-foreground">
                    Chave de API do Google Cloud:
                  </label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="AIzaSy..." 
                      value={customKey}
                      onChange={(e) => setCustomKey(e.target.value)}
                      className="text-xs font-mono"
                    />
                    <Button size="sm" onClick={handleSaveKey}>Salvar</Button>
                  </div>
                </div>
              )}

              {/* Action Bar when results are present */}
              {searchResults.length > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-accent/30 rounded-lg border border-border">
                  <div className="text-sm">
                    <span className="font-bold text-foreground">{searchResults.length} estabelecimentos encontrados</span>
                    <span className="text-muted-foreground ml-2">({unimportedCount} novos para importar)</span>
                  </div>
                  
                  {unimportedCount > 0 && (
                    <Button 
                      onClick={handleImportAll} 
                      disabled={isImportingAll}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 shadow-md"
                    >
                      {isImportingAll ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                      ) : (
                        <Download className="w-4 h-4 mr-1.5" />
                      )}
                      Importar Todos os Novos Leads ({unimportedCount})
                    </Button>
                  )}
                </div>
              )}

              {/* Results List */}
              {searchResults.length > 0 && (
                <div className="space-y-3">
                  {searchResults.map((place, idx) => {
                    const isImported = checkIfImported(place.name);
                    const catInfo = detectCategory(place.name, place.types || [], place.formatted_address);

                    return (
                      <div 
                        key={place.place_id || idx} 
                        className={`p-3.5 border rounded-lg transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                          isImported 
                            ? 'bg-emerald-950/20 border-emerald-800/40 hover:bg-emerald-950/30' 
                            : 'bg-card border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-foreground text-base truncate">{place.name}</h4>
                            <span 
                              className="text-xs px-2 py-0.5 rounded font-semibold border"
                              style={{ 
                                backgroundColor: `${catInfo.color}15`, 
                                color: catInfo.color,
                                borderColor: `${catInfo.color}40`
                              }}
                            >
                              {catInfo.badge}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium">
                              ★ {place.rating || 4.5}
                            </span>
                          </div>
                          
                          <p className="text-xs text-muted-foreground truncate">{place.formatted_address}</p>
                          
                          <div className="flex flex-wrap gap-4 pt-0.5 text-xs">
                            {place.phone ? (
                              <span className="text-emerald-400 font-medium">📞 {formatBrazilianPhone(place.phone)}</span>
                            ) : (
                              <span className="text-muted-foreground">Telefone não listado</span>
                            )}
                            {place.website && (
                              <a href={place.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                🌐 Website
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="self-end sm:self-center">
                          {isImported ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              Já na Lista
                            </div>
                          ) : (
                            <Button 
                              size="sm" 
                              onClick={() => handleImportSingle(place)}
                              className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" />
                              Adicionar Lead
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Copy className="w-4 h-4" />
                  Cole aqui o texto copiado de um local no Maps
                </label>
                <textarea
                  className="w-full h-32 bg-background border border-border rounded-md p-3 text-sm resize-none focus:outline-none focus:border-primary font-mono"
                  placeholder="Exemplo:&#10;Padaria Central&#10;4,5 (120) · Padaria&#10;Rua das Flores, 123 - Centro&#10;(11) 99999-9999"
                  value={pastedText}
                  onChange={handlePaste}
                />
              </div>

              {parsed && (
                <div className="bg-accent/30 p-4 rounded-lg space-y-3 border border-border">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <div className="flex items-center gap-2 text-emerald-400 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Dados Reconhecidos Automaticamente</span>
                    </div>
                    {parsed.categoryBadge && (
                      <span className="text-xs px-2.5 py-1 rounded font-bold bg-primary/20 text-primary">
                        {parsed.categoryBadge}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="col-span-2">
                      <span className="text-muted-foreground block text-xs">Empresa:</span>
                      <span className="font-semibold text-foreground">{parsed.name || '-'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground block text-xs">Endereço:</span>
                      <span>{parsed.address || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Telefone:</span>
                      <span className="text-emerald-400">{parsed.phone || 'Não detectado'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Categoria / Pasta:</span>
                      <span className="font-medium text-foreground">{parsed.subcategory || 'Geral'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'paste' && (
          <div className="p-4 border-t border-border flex justify-end gap-3 bg-accent/10">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleConfirmPaste} disabled={!parsed || !parsed.name}>
              Criar Lead na Pasta
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
