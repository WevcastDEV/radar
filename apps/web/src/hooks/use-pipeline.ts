import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PipelineStageData, MovePipelineRequest, ApiResponse } from '@radar/types';
import toast from 'react-hot-toast';

const getInitialStages = (): PipelineStageData[] => {
  const defaultStages: PipelineStageData[] = [
    { id: 'stage-3', name: 'Contato', slug: 'contato', color: '#8B5CF6', order: 3, count: 0, totalValue: 0, leads: [] },
    { id: 'stage-4', name: 'Visita', slug: 'visita', color: '#F59E0B', order: 4, count: 0, totalValue: 0, leads: [] },
    { id: 'stage-5', name: 'Proposta', slug: 'proposta', color: '#EC4899', order: 5, count: 0, totalValue: 0, leads: [] },
    { id: 'stage-6', name: 'Negociação', slug: 'negociacao', color: '#EF4444', order: 6, count: 0, totalValue: 0, leads: [] },
    { id: 'stage-7', name: 'Fechado', slug: 'fechado', color: '#10B981', order: 7, count: 0, totalValue: 0, leads: [] },
  ];

  if (typeof window !== 'undefined' && localStorage.getItem('system_reset') === 'true') {
    return [
      { id: 'stage-1', name: 'Novo Lead', slug: 'novo', color: '#6B7280', order: 1, count: 0, totalValue: 0, leads: [] },
      { id: 'stage-2', name: 'Qualificado', slug: 'qualificado', color: '#3B82F6', order: 2, count: 0, totalValue: 0, leads: [] },
      ...defaultStages
    ];
  }

  return [
    {
      id: 'stage-1', name: 'Novo Lead', slug: 'novo', color: '#6B7280', order: 1, count: 5, totalValue: 10000,
      leads: Array.from({ length: 5 }).map((_, i) => ({
        id: `l1-${i}`, name: `Novo Lead ${i}`, score: { total: 50, level: 'MEDIUM' as any }, potentialValue: 2000, segment: { name: 'Comércio', color: '#3B82F6', id: 's1', icon: 'Store' }, priority: 'MEDIUM' as any, status: 'NEW' as any, createdAt: ''
      }))
    },
    {
      id: 'stage-2', name: 'Qualificado', slug: 'qualificado', color: '#3B82F6', order: 2, count: 3, totalValue: 15000,
      leads: Array.from({ length: 3 }).map((_, i) => ({
        id: `l2-${i}`, name: `Qualificado ${i}`, score: { total: 70, level: 'GOOD' as any }, potentialValue: 5000, segment: { name: 'Indústria', color: '#F59E0B', id: 's2', icon: 'Factory' }, priority: 'HIGH' as any, status: 'QUALIFIED' as any, createdAt: ''
      }))
    },
    ...defaultStages
  ];
};

let MOCK_STAGES: PipelineStageData[] = getInitialStages();

export function usePipeline() {
  return useQuery({
    queryKey: ['pipeline'],
    queryFn: async () => {
      // Retorna uma cópia para o React Query detectar a mudança
      return JSON.parse(JSON.stringify(MOCK_STAGES)) as PipelineStageData[];
    },
  });
}

export function useMoveLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, stageId }: MovePipelineRequest) => {
      let leadToMove: any = null;
      let sourceStageId: string | null = null;

      // 1. Encontra e remove o lead da coluna atual
      for (const stage of MOCK_STAGES) {
        const leadIndex = stage.leads.findIndex((l) => l.id === leadId);
        if (leadIndex !== -1) {
          leadToMove = stage.leads[leadIndex];
          stage.leads.splice(leadIndex, 1);
          stage.count--;
          stage.totalValue -= leadToMove.potentialValue || 0;
          sourceStageId = stage.id;
          break;
        }
      }

      // 2. Adiciona o lead na nova coluna
      if (leadToMove) {
        const targetStage = MOCK_STAGES.find((s) => s.id === stageId);
        if (targetStage) {
          targetStage.leads.push(leadToMove);
          targetStage.count++;
          targetStage.totalValue += leadToMove.potentialValue || 0;
        }
      }
      
      return { success: true, leadToMove, sourceStageId, targetStageId: stageId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      toast.success('Lead movido com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao mover lead');
    }
  });
}
