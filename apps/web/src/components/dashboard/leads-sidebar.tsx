'use client';

import { LeadListItem } from '@radar/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation } from 'lucide-react';
import Link from 'next/link';

interface LeadsSidebarProps {
  leads: LeadListItem[];
  isLoading: boolean;
}

export function LeadsSidebar({ leads, isLoading }: LeadsSidebarProps) {
  return (
    <div className="flex flex-col h-full border border-border rounded-xl bg-card overflow-hidden">
      <div className="p-4 border-b border-border bg-card/50">
        <h3 className="font-bold flex items-center gap-2">
          <Navigation className="w-4 h-4 text-primary" />
          Leads em Potencial
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {leads.length} oportunidades encontradas na região
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-accent/50 animate-pulse rounded-lg border border-border" />
          ))
        ) : (
          leads.map((lead) => (
            <Link key={lead.id} href={`/leads/${lead.id}`}>
              <Card className="p-3 border-border hover:bg-accent/50 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-2">
                  <div className="max-w-[70%]">
                    <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                      {lead.name}
                    </h4>
                    {lead.segment && (
                      <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: lead.segment.color }}>
                        {lead.segment.name}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold" 
                         style={{ borderColor: getScoreColor(lead.score?.total || 0), color: getScoreColor(lead.score?.total || 0) }}>
                      {lead.score?.total || 0}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1 truncate max-w-[75%]">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{lead.address?.neighborhood || lead.address?.city}</span>
                  </div>
                  <span className="font-medium whitespace-nowrap">{lead.distance} km</span>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function getScoreColor(score: number) {
  if (score >= 80) return '#EF4444'; // PRIORITY
  if (score >= 60) return '#10B981'; // HIGH
  if (score >= 40) return '#3B82F6'; // GOOD
  if (score >= 20) return '#F59E0B'; // MEDIUM
  return '#6B7280'; // LOW
}
