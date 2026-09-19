'use client';
 
 import { RealDashboardStats } from '@/hooks/use-dashboard';
 import { Card, CardContent } from '@/components/ui/card';
 import { 
   Users, 
   Target, 
   Phone, 
   MessageSquare, 
   Clock, 
   Folder, 
   Sparkles, 
   Percent 
 } from 'lucide-react';

interface StatsCardsProps {
  stats?: RealDashboardStats;
  isLoading: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse bg-card h-24 border-border" />
        ))}
      </div>
    );
  }

  const cards = [
    { title: 'Leads Encontrados', value: stats.totalLeads, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', desc: 'Total cadastrado' },
    { title: 'Leads Prioritários', value: stats.priorityLeads, icon: Target, color: 'text-red-500', bg: 'bg-red-500/10', desc: 'Alta prioridade' },
    { title: 'Com Telefone', value: stats.leadsWithPhone, icon: Phone, color: 'text-emerald-500', bg: 'bg-emerald-500/10', desc: 'Aptos para contato' },
    { title: 'Acionados WhatsApp', value: stats.dispatchedLeads, icon: MessageSquare, color: 'text-[#25D366]', bg: 'bg-[#25D366]/10', desc: 'Mensagens enviadas' },
    { title: 'Fila para Disparar', value: stats.pendingDispatch, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', desc: 'Prontos no robô' },
    { title: 'Pastas / Ramos', value: stats.categoriesCount, icon: Folder, color: 'text-indigo-500', bg: 'bg-indigo-500/10', desc: 'Segmentos criados' },
    { title: 'Alta Qualificação', value: stats.highScoreLeads, icon: Sparkles, color: 'text-purple-500', bg: 'bg-purple-500/10', desc: 'Score >= 70 pts' },
    { title: 'Taxa de Acionamento', value: `${stats.dispatchRate}%`, icon: Percent, color: 'text-pink-500', bg: 'bg-pink-500/10', desc: 'Cobertura da fila' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <Card key={i} className="border-border bg-card hover:bg-accent/20 transition-all shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${card.bg} shrink-0`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium truncate">{card.title}</p>
              <h4 className="text-xl font-bold mt-0.5 text-foreground">{card.value}</h4>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{card.desc}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

