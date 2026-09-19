'use client';

import { useParams, useRouter } from 'next/navigation';
import { useLead } from '@/hooks/use-leads';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { STATUS_LABELS } from '@radar/types';
import { MapPin, Phone, Calendar, Target, ArrowLeft, MessageSquare, Globe, Building, CheckCircle2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import toast from 'react-hot-toast';
import { detectCategory } from '@/lib/categories';
import { formatBrazilianPhone, toWhatsAppJidDigits } from '@/lib/phone-utils';

const MapContainer = dynamic(
  () => import('@/components/map/map-container'),
  { ssr: false, loading: () => <div className="w-full h-full bg-card animate-pulse rounded-xl flex items-center justify-center text-muted-foreground text-sm">Carregando mapa...</div> }
);

export default function LeadDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const { data: lead, isLoading } = useLead(id as string);

  const marker = useMemo(() => {
    if (!lead?.address?.latitude || !lead?.address?.longitude) return [];
    return [{
      id: lead.id,
      name: lead.name,
      latitude: lead.address.latitude,
      longitude: lead.address.longitude,
      segment: (lead as any).subcategory || lead.segment?.name,
      segmentColor: lead.segment?.color,
      score: lead.score?.total || 0,
      scoreLevel: lead.score?.level || 'LOW',
      status: lead.status,
      priority: lead.priority,
    }] as any;
  }, [lead]);

  if (isLoading) {
    return <div className="p-12 text-center text-muted-foreground">Carregando detalhes do lead...</div>;
  }

  if (!lead) {
    return (
      <div className="p-12 text-center space-y-4">
        <h2 className="text-xl font-bold">Lead não encontrado</h2>
        <p className="text-muted-foreground">Este lead pode ter sido removido ou o identificador é inválido.</p>
        <Button onClick={() => router.push('/leads')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Lista de Leads
        </Button>
      </div>
    );
  }

  const subcategory = (lead as any).subcategory || lead.segment?.name || 'Comércio';
  const catInfo = detectCategory(lead.name, [subcategory], lead.address?.city || '');
  const rawPhone = (lead as any).phone || lead.contacts?.find((c: any) => c.type === 'WHATSAPP' || c.type === 'PHONE')?.value || '';
  const phone = formatBrazilianPhone(rawPhone);
  const website = (lead as any).website || '';
  const scoreFactors = lead.scoreFactors || [
    { factor: 'Estabelecimento Ativo no Google Maps', points: 30, label: 'Validação' },
    { factor: 'Telefone comercial verificado', points: 20, label: 'Contato' },
  ];

  const handleWhatsApp = () => {
    if (phone) {
      window.open(`https://wa.me/${toWhatsAppJidDigits(phone)}?text=${encodeURIComponent('Olá! Somos da equipe comercial.')}`, '_blank');
      toast.success('Abrindo conversa no WhatsApp!');
    } else {
      toast.error('Nenhum telefone/WhatsApp disponível para este lead');
    }
  };

  const handleCall = () => {
    if (phone) {
      window.open(`tel:${phone.replace(/\D/g, '')}`);
      toast.success(`Iniciando chamada para ${phone}`);
    } else {
      toast.error('Telefone não informado');
    }
  };

  const handleScheduleVisit = () => {
    router.push(`/visits?client=${encodeURIComponent(lead.name)}`);
    toast.success('Redirecionando para agendamento de visita...');
  };

  return (
    <div className="space-y-6">
      <div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-muted-foreground hover:text-foreground mb-2"
          onClick={() => router.push('/leads')}
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Voltar para Leads
        </Button>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{lead.name}</h1>
            <Badge variant="outline">{(STATUS_LABELS as Record<string, string>)[lead.status as string] || 'Novo'}</Badge>
            <span 
              className="text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider border"
              style={{ 
                backgroundColor: `${catInfo.color}20`, 
                color: catInfo.color,
                borderColor: `${catInfo.color}40`
              }}
            >
              {catInfo.badge}
            </span>
          </div>
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 shrink-0 text-primary" />
            {lead.address?.formattedAddress || `${lead.address?.neighborhood || ''} ${lead.address?.city || 'Manaus'} - ${lead.address?.state || 'AM'}`}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={handleWhatsApp} 
            className="bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold shadow-md"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Conversar no WhatsApp
          </Button>
          <Button variant="outline" onClick={handleCall}>
            <Phone className="w-4 h-4 mr-2" />
            Ligar
          </Button>
          <Button variant="outline" onClick={handleScheduleVisit}>
            <Calendar className="w-4 h-4 mr-2" />
            Agendar Visita
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Building className="w-5 h-5 text-primary" />
                Dados do Estabelecimento
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block mb-1">Categoria Principal</span>
                  <span className="font-semibold text-foreground">{catInfo.category}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Subcategoria / Pasta</span>
                  <span className="font-semibold text-foreground">{subcategory}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Telefone Principal</span>
                  <span className="font-semibold text-foreground">{phone || 'Não informado'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Website Oficial</span>
                  {website ? (
                    <a href={website} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium inline-flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" /> Acessar Link
                    </a>
                  ) : (
                    <span className="font-medium text-muted-foreground">Não informado</span>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Valor Estimado de Negócio</span>
                  <span className="font-bold text-emerald-400">R$ {(lead.potentialValue || 2500).toLocaleString('pt-BR')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Data de Cadastro / Importação</span>
                  <span className="font-medium">{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Score Comercial & Oportunidade
              </h3>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div 
                  className="w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center font-bold shrink-0" 
                  style={{ 
                    borderColor: (lead.score?.total || 50) >= 70 ? '#10B981' : '#F59E0B', 
                    color: (lead.score?.total || 50) >= 70 ? '#10B981' : '#F59E0B' 
                  }}
                >
                  <span className="text-3xl">{lead.score?.total || 50}</span>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">Pontos</span>
                </div>
                <div className="flex-1 w-full space-y-3">
                  {scoreFactors.map((factor: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-sm border-b border-border pb-2 last:border-0">
                      <div>
                        <span className="text-muted-foreground block text-xs">{factor.label || 'Critério'}</span>
                        <span className="font-medium">{factor.factor}</span>
                      </div>
                      <span className="font-bold text-emerald-400">+{factor.points} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="h-[250px] w-full relative">
              {marker.length > 0 ? (
                <MapContainer 
                  markers={marker} 
                  center={[lead.address!.latitude!, lead.address!.longitude!]} 
                  zoom={15} 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-accent/30 text-muted-foreground text-sm">
                  Sem coordenadas de mapa
                </div>
              )}
            </div>
            <CardContent className="p-4 border-t border-border bg-card">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                Localização georreferenciada via Google Maps
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <h3 className="font-bold mb-4">Canais de Contato</h3>
              <div className="space-y-3">
                {phone ? (
                  <div className="text-sm p-3 rounded-lg bg-accent/20 border border-border">
                    <span className="text-muted-foreground block text-xs">WhatsApp / Telefone</span>
                    <span className="font-bold text-emerald-400">{phone}</span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhum canal cadastrado.</p>
                )}

                {website && (
                  <div className="text-sm p-3 rounded-lg bg-accent/20 border border-border truncate">
                    <span className="text-muted-foreground block text-xs">Website</span>
                    <a href={website} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline truncate block">
                      {website}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}