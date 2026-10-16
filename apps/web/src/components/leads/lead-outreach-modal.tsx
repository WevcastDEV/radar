'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  Send,
  Copy,
  Sparkles,
  X,
  Flame,
  FileText,
  Check,
  Building,
  Phone,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { formatBrazilianPhone, toWhatsAppJidDigits } from '@/lib/phone-utils';
import { useBrandingStore } from '@/stores/branding-store';
import { useAuthStore } from '@/stores/auth-store';

export interface LeadOutreachModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id: string;
    name: string;
    contactName?: string;
    phone?: string;
    segment?: any;
    address?: any;
    isCold?: boolean;
    status?: string;
  } | null;
  defaultTemplate?: 'apresentacao' | 'orcamento' | 'followup' | 'reaquecimento';
}

export function LeadOutreachModal({
  isOpen,
  onClose,
  lead,
  defaultTemplate = 'apresentacao'
}: LeadOutreachModalProps) {
  const router = useRouter();
  const { companyName } = useBrandingStore();
  const currentUser = useAuthStore((s) => s.user);

  const [message, setMessage] = useState('');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>(defaultTemplate);
  const [copied, setCopied] = useState(false);

  const businessName = companyName || 'CRIART BRASIL';
  const attendantName = currentUser?.name ? currentUser.name.split(' ')[0] : 'Consultor Comercial';

  const rawPhone = lead?.phone || '';
  const formattedPhone = formatBrazilianPhone(rawPhone);
  const cleanDigits = toWhatsAppJidDigits(rawPhone);
  const firstName = (lead?.contactName || lead?.name || 'Cliente').split(' ')[0];
  const companyTitle = lead?.name || 'sua empresa';

  const templates: Record<string, { title: string; icon: any; text: string }> = {
    apresentacao: {
      title: 'Apresentação Comercial',
      icon: Sparkles,
      text: `Olá, ${firstName}! Tudo bem?\n\nMe chamo ${attendantName} e faço parte da equipe comercial da ${businessName}.\n\nAcompanhamos o trabalho da ${companyTitle} e gostaríamos de apresentar nossas soluções personalizadas que podem gerar excelentes resultados para o seu negócio.\n\nTeria alguns minutinhos para conversarmos por aqui hoje?`
    },
    orcamento: {
      title: 'Proposta & Orçamento',
      icon: FileText,
      text: `Olá, ${firstName}! Tudo bem?\n\nEstou entrando em contato pela ${businessName} sobre as propostas e soluções sob medida para a ${companyTitle}.\n\nQual seria o melhor dia ou horário para alinharmos os detalhes do seu projeto?`
    },
    followup: {
      title: 'Follow-up / Retorno',
      icon: MessageSquare,
      text: `Olá, ${firstName}! Tudo bem?\n\nPassando para saber como estão as coisas na ${companyTitle} e se podemos apoiar nas demandas deste mês com condições especiais da ${businessName}.\n\nComo posso ajudar você hoje?`
    },
    reaquecimento: {
      title: 'Reaquecimento de Contato',
      icon: Flame,
      text: `Olá, ${firstName}! Tudo bem?\n\nTentei contato anteriormente sobre nossas soluções para a ${companyTitle}. Como não tive seu retorno, imagino que sua rotina esteja bem corrida.\n\nAinda faz sentido batermos um papo rápido ou prefere que eu encerre as tentativas por enquanto?\n\nFico no seu aguardo!`
    },
    personalizado: {
      title: 'Em Branco / Livre',
      icon: MessageSquare,
      text: `Olá, ${firstName}! Tudo bem? Gostaria de conversar com você sobre a ${companyTitle}.`
    }
  };

  // Atualiza mensagem quando o lead ou o template selecionado muda
  useEffect(() => {
    if (lead && isOpen) {
      const tpl = templates[selectedTemplateKey] || templates.apresentacao;
      setMessage(tpl.text);
    }
  }, [lead, selectedTemplateKey, isOpen, businessName, attendantName]);

  if (!isOpen || !lead) return null;

  const handleSelectTemplate = (key: string) => {
    setSelectedTemplateKey(key);
    if (templates[key]) {
      setMessage(templates[key].text);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success('Mensagem copiada para a área de transferência!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar mensagem');
    }
  };

  const handleStartInChat = () => {
    if (!cleanDigits) {
      toast.error('Este lead não possui um telefone válido para WhatsApp');
      return;
    }

    onClose();

    // Redireciona diretamente para o Chat Comercial interno com o contato e a mensagem
    const url = `/chat-comercial?phone=${cleanDigits}&name=${encodeURIComponent(lead.name)}&text=${encodeURIComponent(message)}`;
    toast.success(`Abrindo Chat Comercial com ${lead.name}...`);
    router.push(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                Chamar no Chat Comercial
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  Vendas
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Personalize a mensagem e inicie a negociação diretamente no Chat de Vendas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card do Lead Selecionado */}
        <div className="px-5 pt-4 pb-2">
          <div className="bg-accent/40 border border-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Empresa / Lead
              </span>
              <p className="font-bold text-sm text-foreground truncate flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-primary shrink-0" />
                {lead.name}
              </p>
              {lead.contactName && (
                <p className="text-xs text-muted-foreground">
                  Contato: <strong className="text-foreground">{lead.contactName}</strong>
                </p>
              )}
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                WhatsApp
              </span>
              <p className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1 justify-end">
                <Phone className="w-3 h-3 text-emerald-400" />
                {formattedPhone || 'Sem telefone'}
              </p>
            </div>
          </div>
        </div>

        {/* Seleção de Modelos / Templates */}
        <div className="px-5 py-2 space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground block">
            Escolha um Modelo de Abordagem:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(templates).map(([key, tpl]) => {
              const IconComp = tpl.icon;
              const isSelected = selectedTemplateKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectTemplate(key)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{tpl.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Textarea da Mensagem Personalizada */}
        <div className="px-5 py-2 flex-1 flex flex-col min-h-0 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-muted-foreground">
              Mensagem Personalizada a ser Enviada:
            </label>
            <span className="text-[10px] font-mono text-muted-foreground">
              {message.length} caracteres
            </span>
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            placeholder="Digite ou personalize sua mensagem de abordagem aqui..."
            className="w-full rounded-xl border border-border bg-background p-3 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-y font-sans transition-all text-foreground"
          />
          <p className="text-[11px] text-muted-foreground">
            💡 <strong>Dica:</strong> A mensagem será direcionada diretamente para o Chat Comercial de Vendas com o contato já selecionado.
          </p>
        </div>

        {/* Rodapé e Botões de Ação */}
        <div className="p-4 sm:p-5 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2.5 mt-auto">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyToClipboard}
              className="text-xs h-9 gap-1.5 font-semibold text-muted-foreground hover:text-foreground"
              title="Copiar texto para área de transferência"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs h-9 text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleStartInChat}
              disabled={!cleanDigits}
              className="text-xs h-9 px-4 font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Chamar no Chat Comercial</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
