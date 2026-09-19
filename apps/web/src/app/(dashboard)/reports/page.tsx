'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Download, FileDown, Bot, Phone, Users, CheckCircle2, 
  TrendingUp, Building2, MapPin, Send, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { useLeads, getDispatchedHistory } from '@/hooks/use-leads';
import { getCategoryMeta } from '@/lib/categories';

export default function ReportsPage() {
  const { data: leads = [], isLoading } = useLeads();
  const [exporting, setExporting] = useState(false);

  const stats = useMemo(() => {
    const dispatched = getDispatchedHistory();
    const dispatchedSet = new Set(dispatched.map(d => d.leadId));

    const totalLeads = leads.length;
    const leadsWithPhoneList = leads.filter(l => {
      const p = (l as any).phone || (l as any).contacts?.[0]?.value;
      return !!p;
    });
    const leadsWithPhone = leadsWithPhoneList.length;
    const leadsWithoutPhone = Math.max(0, totalLeads - leadsWithPhone);

    const dispatchedLeads = dispatched.length;
    const pendingDispatch = leadsWithPhoneList.filter(l => !dispatchedSet.has(l.id)).length;
    const highScoreLeads = leads.filter(l => (l.score?.total || 0) >= 70).length;
    
    const coverageRate = leadsWithPhone > 0 
      ? Math.min(100, +((dispatchedLeads / leadsWithPhone) * 100).toFixed(1))
      : 0;

    // Funnel Data
    const funnelData = [
      { name: '1. Mapeados', value: totalLeads, fill: '#3B82F6' },
      { name: '2. Com Telefone', value: leadsWithPhone, fill: '#06B6D4' },
      { name: '3. Score Alto (≥70)', value: highScoreLeads, fill: '#6366F1' },
      { name: '4. Fila Pronta', value: pendingDispatch, fill: '#F59E0B' },
      { name: '5. Disparados Whats', value: dispatchedLeads, fill: '#10B981' },
    ];

    // Segment Distribution
    const segmentMap: Record<string, number> = {};
    leads.forEach(l => {
      const cat = (l as any).subcategory || l.segment?.name || 'Comércio Geral';
      segmentMap[cat] = (segmentMap[cat] || 0) + 1;
    });

    const categoryColors = ['#0066FF', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#14B8A6'];
    const segmentData = Object.entries(segmentMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value], i) => ({
        name,
        value,
        color: categoryColors[i % categoryColors.length],
      }));

    // Status Distribution
    const statusData = [
      { name: 'Acionados Robô', value: dispatchedLeads, color: '#10B981' },
      { name: 'Fila Pronta', value: pendingDispatch, color: '#0066FF' },
      { name: 'Sem Telefone', value: leadsWithoutPhone, color: '#F59E0B' },
    ].filter(d => d.value > 0);

    // Neighborhoods Data
    const neighborhoodMap: Record<string, { total: number; dispatched: number }> = {};
    leads.forEach(l => {
      const b = l.address?.neighborhood || 'Manaus (Centro)';
      if (!neighborhoodMap[b]) neighborhoodMap[b] = { total: 0, dispatched: 0 };
      neighborhoodMap[b].total += 1;
      if (dispatchedSet.has(l.id)) {
        neighborhoodMap[b].dispatched += 1;
      }
    });

    const neighborhoodData = Object.entries(neighborhoodMap)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 6)
      .map(([name, data]) => ({
        name: name.length > 14 ? name.slice(0, 12) + '...' : name,
        fullName: name,
        total: data.total,
        dispatched: data.dispatched,
      }));

    return {
      totalLeads,
      leadsWithPhone,
      dispatchedLeads,
      pendingDispatch,
      coverageRate,
      highScoreLeads,
      funnelData,
      segmentData,
      statusData,
      neighborhoodData,
      recentDispatches: dispatched.slice(0, 6),
    };
  }, [leads]);

  const handleExportCSV = () => {
    setExporting(true);
    try {
      const dispatched = getDispatchedHistory();
      const dispatchedSet = new Set(dispatched.map(d => d.leadId));
      const dispatchedMap = new Map(dispatched.map(d => [d.leadId, d]));

      const headers = ['Nome', 'Telefone', 'Categoria', 'Bairro', 'Cidade', 'Score', 'Status Whats', 'Data Disparo'];
      const rows = leads.map(l => {
        const phone = (l as any).phone || (l as any).contacts?.[0]?.value || '';
        const cat = (l as any).subcategory || l.segment?.name || 'Geral';
        const neighborhood = l.address?.neighborhood || '';
        const city = l.address?.city || 'Manaus';
        const score = l.score?.total || 0;
        const isDisp = dispatchedSet.has(l.id);
        const record = dispatchedMap.get(l.id);
        const status = isDisp ? 'Acionado' : (phone ? 'Fila de Disparo' : 'Sem Telefone');
        const dateDisp = record ? `${record.date} ${record.time}` : '-';

        return [
          `"${(l.name || '').replace(/"/g, '""')}"`,
          `"${phone}"`,
          `"${cat}"`,
          `"${neighborhood}"`,
          `"${city}"`,
          score,
          `"${status}"`,
          `"${dateDisp}"`,
        ].join(';');
      });

      const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio_leads_manaus_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Erro ao exportar CSV:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Relatórios e Métricas Operacionais</h1>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
              100% Dados Reais
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            Monitoramento em tempo real de prospecção, qualificação e automação de disparos em Manaus
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 border-border/80 hover:bg-white/5"
            onClick={handleExportCSV}
            disabled={exporting || leads.length === 0}
          >
            <Download className="w-4 h-4 text-primary" /> 
            {exporting ? 'Exportando...' : 'Exportar Leads (CSV)'}
          </Button>
        </div>
      </div>

      {/* Real Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Leads Mapeados</p>
              <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <h4 className="text-2xl font-bold mt-2 text-foreground">{stats.totalLeads}</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Empresas capturadas e salvas
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Com Telefone Comercial</p>
              <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400">
                <Phone className="w-4 h-4" />
              </div>
            </div>
            <h4 className="text-2xl font-bold mt-2 text-cyan-400">{stats.leadsWithPhone}</h4>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalLeads > 0 ? `${Math.round((stats.leadsWithPhone / stats.totalLeads) * 100)}% de validade cadastral` : 'Aguardando leads'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Acionados pelo Robô</p>
              <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
                <Bot className="w-4 h-4" />
              </div>
            </div>
            <h4 className="text-2xl font-bold mt-2 text-emerald-400">{stats.dispatchedLeads}</h4>
            <p className="text-xs text-emerald-400/80 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Disparos confirmados
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Taxa de Cobertura WhatsApp</p>
              <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <h4 className="text-2xl font-bold mt-2 text-amber-400">{stats.coverageRate}%</h4>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.pendingDispatch} contatos aguardando na fila
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real Pipeline / Funnel */}
        <Card className="flex flex-col border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Funil Operacional Real
            </CardTitle>
            <CardDescription>Fluxo real do mapeamento à ativação via WhatsApp</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" horizontal={false} />
                <XAxis type="number" stroke="#9CA3AF" />
                <YAxis dataKey="name" type="category" width={120} stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#1F2937', color: '#F9FAFB', borderRadius: '8px' }}
                  formatter={(val: number) => [`${val} empresas`, 'Total']}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22}>
                  {stats.funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Categories Distribution */}
        <Card className="flex flex-col border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Leads por Ramo / Categoria
            </CardTitle>
            <CardDescription>Principais nichos comerciais mapeados em Manaus</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px] flex items-center justify-center">
            {stats.segmentData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum segmento registrado ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.segmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stats.segmentData.map((entry, index) => (
                      <Cell key={`cat-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#1F2937', color: '#F9FAFB', borderRadius: '8px' }}
                    formatter={(val: number) => [`${val} leads`, 'Quantidade']}
                  />
                  <Legend verticalAlign="bottom" height={40} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Neighborhoods Manaus */}
        <Card className="flex flex-col border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Mapeamento por Bairro (Manaus)
            </CardTitle>
            <CardDescription>Volume de leads encontrados vs disparados por região</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            {stats.neighborhoodData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Nenhum bairro registrado ainda.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.neighborhoodData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                  <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#9CA3AF" />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#1F2937', color: '#F9FAFB', borderRadius: '8px' }}
                    formatter={(val: any, name: any) => [
                      `${val} leads`,
                      name === 'total' ? 'Total Mapeados' : 'Acionados WhatsApp'
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="total" name="Total Mapeados" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="dispatched" name="Acionados WhatsApp" fill="#10B981" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* WhatsApp Bot Status Pie */}
        <Card className="flex flex-col border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-400" />
              Status de Cobertura do Robô
            </CardTitle>
            <CardDescription>Proporção atual da base de contatos em relação ao robô</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px] flex items-center justify-center">
            {stats.statusData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados disponíveis.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stats.statusData.map((entry, index) => (
                      <Cell key={`status-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#1F2937', color: '#F9FAFB', borderRadius: '8px' }}
                    formatter={(val: number) => [`${val} contatos`, 'Total']}
                  />
                  <Legend verticalAlign="bottom" height={40} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Dispatches from Robot */}
        <Card className="flex flex-col lg:col-span-2 border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Últimos Acionamentos Confirmados do Robô WhatsApp
            </CardTitle>
            <CardDescription>Registro auditável das mensagens reais disparadas para leads</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentDispatches.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Bot className="w-8 h-8 mx-auto mb-2 opacity-40 text-primary" />
                <p className="text-sm font-medium">Nenhum disparo registrado no histórico ainda.</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Selecione os clientes na aba WhatsApp e inicie os envios para alimentar este registro operacional.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {stats.recentDispatches.map((record, i) => (
                  <div key={`${record.leadId}-${i}`} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{record.leadName}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span>{record.phone}</span>
                        <span>•</span>
                        <span className="text-primary/90">{record.category || 'Lead'}</span>
                        <span>•</span>
                        <span>Template: {record.templateName || 'Padrão'}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{record.date} às {record.time}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Enviado
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

