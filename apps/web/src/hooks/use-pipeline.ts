import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PipelineStageData, MovePipelineRequest, LeadListItem, ScoreLevel, Priority, LeadStatus } from '@radar/types';
import { getStoredLeads, saveStoredLeads, calculateLeadScore } from '@/hooks/use-leads';
import { detectCategory } from '@/lib/categories';
import { detectStateAndCity, getStateByUF } from '@/lib/brazil-states';
import { formatBrazilianPhone } from '@/lib/phone-utils';
import toast from 'react-hot-toast';

export interface PipelineStageConfig {
  id: string;
  name: string;
  slug: string;
  color: string;
  order: number;
  status: string;
}

export const PIPELINE_STAGES: PipelineStageConfig[] = [
  { id: 'stage-1', name: 'Novo Lead', slug: 'novo', color: '#6B7280', order: 1, status: 'NEW' },
  { id: 'stage-2', name: 'Qualificado', slug: 'qualificado', color: '#3B82F6', order: 2, status: 'QUALIFIED' },
  { id: 'stage-3', name: 'Contato Realizado', slug: 'contato', color: '#8B5CF6', order: 3, status: 'CONTACTED' },
  { id: 'stage-4', name: 'Visita Agendada', slug: 'visita', color: '#F59E0B', order: 4, status: 'VISIT_SCHEDULED' },
  { id: 'stage-5', name: 'Proposta Enviada', slug: 'proposta', color: '#EC4899', order: 5, status: 'PROPOSAL_SENT' },
  { id: 'stage-6', name: 'Negociação', slug: 'negociacao', color: '#EF4444', order: 6, status: 'NEGOTIATION' },
  { id: 'stage-7', name: 'Cliente Fechado', slug: 'fechado', color: '#10B981', order: 7, status: 'WON' },
];

export function usePipeline() {
  return useQuery({
    queryKey: ['pipeline'],
    queryFn: async () => {
      const allLeads = getStoredLeads();
      const validStageIds = new Set(PIPELINE_STAGES.map((s) => s.id));

      const stages: PipelineStageData[] = PIPELINE_STAGES.map((stage) => {
        // Encontra leads pertencentes a esta etapa
        const stageLeads = allLeads.filter((lead: any) => {
          // Se o lead tem um pipelineStageId explicitamente atribuído
          if (lead.pipelineStageId && validStageIds.has(lead.pipelineStageId)) {
            return lead.pipelineStageId === stage.id;
          }

          // Se não tem pipelineStageId, mapeia pelo status comercial do lead
          if (lead.status === stage.status) {
            return true;
          }

          // Se for o primeiro estágio (Novo Lead), captura quaisquer leads sem status definido
          if (stage.order === 1) {
            const hasMatchedAnotherStage = PIPELINE_STAGES.some(
              (other) => other.order !== 1 && (lead.pipelineStageId === other.id || lead.status === other.status)
            );
            return !hasMatchedAnotherStage;
          }

          return false;
        });

        const totalValue = stageLeads.reduce(
          (acc, l) => acc + (Number(l.potentialValue) || 0),
          0
        );

        return {
          id: stage.id,
          name: stage.name,
          slug: stage.slug,
          color: stage.color,
          order: stage.order,
          count: stageLeads.length,
          totalValue,
          leads: stageLeads,
        };
      });

      return stages;
    },
  });
}

export function useMoveLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, stageId }: MovePipelineRequest) => {
      const leads = getStoredLeads();
      const targetStage = PIPELINE_STAGES.find((s) => s.id === stageId);
      const newStatus = targetStage?.status || 'NEW';

      const updated = leads.map((l: any) => {
        if (l.id === leadId) {
          return {
            ...l,
            pipelineStageId: stageId,
            status: newStatus as any,
            updatedAt: new Date().toISOString(),
          };
        }
        return l;
      });

      saveStoredLeads(updated);

      // Notifica o backend em background
      try {
        await api.put('/pipeline/move', { leadId, stageId }, { timeout: 3000 });
      } catch (err) {
        // Modo local seguro
      }

      return { leadId, stageId, newStatus, targetStageName: targetStage?.name };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(`Lead movido para "${result.targetStageName || 'nova etapa'}"!`);
    },
    onError: () => {
      toast.error('Erro ao mover lead no CRM');
    },
  });
}

export function useUpdatePipelineLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const leads = getStoredLeads();
      const index = leads.findIndex((l) => l.id === id);
      if (index === -1) throw new Error('Lead não encontrado');

      // Se alterou o estágio
      let newStatus = leads[index].status;
      if (data.pipelineStageId) {
        const stage = PIPELINE_STAGES.find((s) => s.id === data.pipelineStageId);
        if (stage) newStatus = stage.status as any;
      }

      const updatedLead = {
        ...leads[index],
        ...data,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };

      leads[index] = updatedLead;
      saveStoredLeads(leads);

      try {
        await api.put(`/leads/${id}`, data, { timeout: 3000 });
      } catch (err) {
        // Modo local seguro
      }

      return updatedLead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Oportunidade atualizada com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao atualizar oportunidade');
    },
  });
}

export function useCreatePipelineLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      contactName?: string;
      phone?: string;
      potentialValue?: number;
      priority?: 'HIGH' | 'MEDIUM' | 'LOW';
      stageId?: string;
      city?: string;
      state?: string;
      segment?: string;
      notes?: string;
    }) => {
      const leads = getStoredLeads();
      const targetStageId = data.stageId || 'stage-1';
      const stageConfig = PIPELINE_STAGES.find((s) => s.id === targetStageId) || PIPELINE_STAGES[0];

      const catInfo = detectCategory(
        data.name || '',
        [data.segment || 'Comércio & Varejo'],
        data.city || 'Manaus'
      );

      const targetState = data.state || 'AM';
      const targetCity = data.city || 'Manaus';
      const stObj = getStateByUF(targetState);
      const defaultDDD = stObj?.ddds?.[0] || '92';
      const phone = formatBrazilianPhone(data.phone || '', defaultDDD);

      const scoreCalc = calculateLeadScore({
        name: data.name,
        phone,
        subcategory: catInfo.subcategory,
      } as any);

      const newLead: any = {
        id: `lead-pipe-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: data.name.trim(),
        tradeName: data.name.trim(),
        contactName: data.contactName?.trim() || '',
        segment: {
          id: `seg-${Date.now()}`,
          name: catInfo.subcategory,
          icon: catInfo.icon,
          color: catInfo.color,
        },
        category: catInfo.category,
        subcategory: catInfo.subcategory,
        status: stageConfig.status as any,
        pipelineStageId: targetStageId,
        priority: (data.priority || 'HIGH') as Priority,
        score: {
          total: scoreCalc.total,
          level: scoreCalc.level,
        },
        scoreFactors: scoreCalc.factors,
        address: {
          neighborhood: 'Centro',
          city: targetCity,
          state: targetState,
          formattedAddress: `${targetCity} - ${targetState}`,
          latitude: (stObj?.coordinates.lat || -3.119) + (Math.random() * 0.04 - 0.02),
          longitude: (stObj?.coordinates.lng || -60.0217) + (Math.random() * 0.04 - 0.02),
        },
        phone,
        potentialValue: Number(data.potentialValue) || 2500,
        notes: data.notes?.trim() || '',
        createdAt: new Date().toISOString(),
      };

      const updated = [newLead, ...leads];
      saveStoredLeads(updated);

      try {
        await api.post('/leads', {
          name: newLead.name,
          phone: newLead.phone,
          potentialValue: newLead.potentialValue,
          pipelineStageId: targetStageId,
          status: stageConfig.status,
          priority: newLead.priority,
          address: {
            city: targetCity,
            state: targetState,
            formattedAddress: `${targetCity} - ${targetState}`,
          },
        }, { timeout: 3000 });
      } catch (err) {
        // Modo local seguro
      }

      return newLead;
    },
    onSuccess: (newLead) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(`Oportunidade "${newLead.name}" criada com sucesso no CRM!`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao criar oportunidade no CRM');
    },
  });
}
