'use client';

import { useState, useRef } from 'react';
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  FileCode, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  X, 
  Database,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportBackupJSON, exportLeadsCSV, importLeadsBackup } from '@/lib/backup-manager';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BackupModal({ isOpen, onClose, onSuccess }: BackupModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    importedCount: number;
    duplicatesSkipped: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleExportJSON = () => {
    try {
      const { filename, count } = exportBackupJSON();
      toast.success(`Backup completo gerado com sucesso! (${count} leads exportados)`);
    } catch (err: any) {
      toast.error('Erro ao exportar backup JSON: ' + err?.message);
    }
  };

  const handleExportCSV = () => {
    try {
      const { filename, count } = exportLeadsCSV();
      toast.success(`Planilha comercial CSV gerada! (${count} leads exportados)`);
    } catch (err: any) {
      toast.error('Erro ao exportar planilha CSV: ' + err?.message);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'json' && ext !== 'csv') {
      toast.error('Formato inválido. Por favor, envie um arquivo .json ou .csv');
      return;
    }

    setSelectedFile(file);
    setImportResult(null);
  };

  const handleExecuteImport = async () => {
    if (!selectedFile) {
      toast.error('Por favor, selecione um arquivo de backup antes de restaurar.');
      return;
    }

    setIsProcessing(true);
    setImportResult(null);

    try {
      const content = await selectedFile.text();
      const res = importLeadsBackup(content, importMode);

      setImportResult(res);

      if (res.success) {
        toast.success(res.message);
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      const msg = err?.message || 'Erro inesperado ao processar arquivo.';
      setImportResult({ success: false, message: msg, importedCount: 0, duplicatesSkipped: 0 });
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetModal = () => {
    setSelectedFile(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header com gradiente */}
        <div className="p-5 border-b border-border bg-gradient-to-r from-primary/10 via-background to-background flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Migração e Backup de Leads</h2>
              <p className="text-xs text-muted-foreground">
                Exporte sua base para levar a outro computador ou importe dados de nova versão
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-border bg-muted/30 px-5 pt-2 gap-2">
          <button
            onClick={() => { setActiveTab('export'); handleResetModal(); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'export'
                ? 'border-primary text-primary bg-background/50 rounded-t-lg shadow-sm'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Download className="w-4 h-4" />
            Exportar Base de Leads
          </button>
          <button
            onClick={() => { setActiveTab('import'); handleResetModal(); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'import'
                ? 'border-primary text-primary bg-background/50 rounded-t-lg shadow-sm'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Upload className="w-4 h-4" />
            Restaurar / Importar Backup
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto max-h-[70vh]">
          {activeTab === 'export' ? (
            <div className="space-y-4">
              <div className="p-3.5 bg-primary/5 rounded-xl border border-primary/20 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-foreground">Garantia de Portabilidade e Segurança</p>
                  <p className="text-muted-foreground">
                    Se você for atualizar o sistema, trocar de máquina ou formatar seu computador, basta baixar o arquivo de backup abaixo. Você poderá restaurar tudo em 1 clique depois!
                  </p>
                </div>
              </div>

              {/* Opção 1: Backup JSON Completo */}
              <div className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg shrink-0">
                    <FileCode className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Backup Completo do Sistema (.JSON)</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Exporta 100% dos dados: contatos, pastas, telefones, pontuações, histórico e modelos. <strong>Ideal para migrar para nova plataforma.</strong>
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleExportJSON}
                  size="sm"
                  className="shrink-0 text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar Backup JSON
                </Button>
              </div>

              {/* Opção 2: Planilha CSV para Excel */}
              <div className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Planilha Comercial (.CSV para Excel)</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Exporta em tabela formatada com nomes, telefones, cidades e estados para abrir no <strong>Excel, Google Sheets</strong> ou importar em outros CRMs.
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleExportCSV}
                  size="sm"
                  variant="outline"
                  className="shrink-0 text-xs font-bold gap-1.5 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/15"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar Planilha CSV
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 bg-accent/40 rounded-xl border border-border text-xs text-muted-foreground">
                Selecione o arquivo de backup gerado anteriormente (formato <strong>.json</strong> ou <strong>.csv</strong>) para restaurar os leads na sua base.
              </div>

              {/* Upload Dropzone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="p-6 border-2 border-dashed border-border hover:border-primary/60 rounded-xl bg-card/60 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-accent/20"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="p-3 bg-primary/10 text-primary rounded-full mb-2">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-foreground">
                  {selectedFile ? selectedFile.name : 'Clique para selecionar o arquivo de backup'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedFile 
                    ? `${(selectedFile.size / 1024).toFixed(1)} KB selecionados. Pronto para restaurar!` 
                    : 'Suporta arquivos de backup .JSON ou planilhas .CSV'}
                </p>
              </div>

              {/* Opções de Modo de Importação */}
              <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-2.5">
                <label className="text-xs font-bold text-foreground">Modo de Restauração:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label 
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      importMode === 'merge' 
                        ? 'border-primary bg-primary/10 text-foreground font-semibold' 
                        : 'border-border text-muted-foreground hover:bg-accent/20'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="importMode" 
                      value="merge"
                      checked={importMode === 'merge'} 
                      onChange={() => setImportMode('merge')} 
                      className="mt-0.5"
                    />
                    <div>
                      <p className="font-bold">Mesclar (Recomendado)</p>
                      <p className="text-[11px] opacity-80">Adiciona os novos leads sem apagar os que você já tem cadastrados.</p>
                    </div>
                  </label>

                  <label 
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      importMode === 'replace' 
                        ? 'border-destructive bg-destructive/10 text-destructive font-semibold' 
                        : 'border-border text-muted-foreground hover:bg-accent/20'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="importMode" 
                      value="replace"
                      checked={importMode === 'replace'} 
                      onChange={() => setImportMode('replace')} 
                      className="mt-0.5"
                    />
                    <div>
                      <p className="font-bold">Substituir Base Completa</p>
                      <p className="text-[11px] opacity-80">Substitui toda a lista existente exatamente pelos dados do arquivo.</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Resultado da Importação */}
              {importResult && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                  importResult.success 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                    : 'bg-destructive/10 border-destructive/30 text-destructive'
                }`}>
                  {importResult.success ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                  <div>
                    <p className="font-bold">{importResult.success ? 'Restauração Concluída!' : 'Erro na Importação'}</p>
                    <p className="mt-0.5 opacity-90">{importResult.message}</p>
                  </div>
                </div>
              )}

              {/* Botão de Execução */}
              <Button
                onClick={handleExecuteImport}
                disabled={!selectedFile || isProcessing}
                className="w-full h-10 font-bold gap-2 text-xs"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Restaurando Leads...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    Restaurar Base de Leads Agora
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
