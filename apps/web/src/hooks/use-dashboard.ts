import { useQuery } from '@tanstack/react-query';
import { getStoredLeads, getDispatchedHistory } from './use-leads';

export interface RealDashboardStats {
  totalLeads: number;
  priorityLeads: number;
  leadsWithPhone: number;
  dispatchedLeads: number;
  pendingDispatch: number;
  categoriesCount: number;
  highScoreLeads: number;
  dispatchRate: number;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'real-stats'],
    queryFn: async () => {
      const allLeads = getStoredLeads();
      const dispatched = getDispatchedHistory();
      const dispatchedSet = new Set(dispatched.map(d => d.leadId));

      const totalLeads = allLeads.length;
      const priorityLeads = allLeads.filter(l => l.priority === 'HIGH' || l.priority === 'URGENT').length;
      
      const leadsWithPhone = allLeads.filter(l => {
        const p = (l as any).phone || (l as any).contacts?.[0]?.value;
        return !!p;
      }).length;

      const dispatchedLeads = dispatched.length;
      
      const pendingDispatch = allLeads.filter(l => {
        const p = (l as any).phone || (l as any).contacts?.[0]?.value;
        return !!p && !dispatchedSet.has(l.id);
      }).length;

      const categoriesSet = new Set(allLeads.map(l => (l as any).subcategory || l.segment?.name || 'Geral'));
      const categoriesCount = categoriesSet.size;

      const highScoreLeads = allLeads.filter(l => (l.score?.total || 0) >= 70).length;

      const dispatchRate = leadsWithPhone > 0 ? +((dispatchedLeads / leadsWithPhone) * 100).toFixed(1) : 0;

      return {
        totalLeads,
        priorityLeads,
        leadsWithPhone,
        dispatchedLeads,
        pendingDispatch,
        categoriesCount,
        highScoreLeads,
        dispatchRate,
      } as RealDashboardStats;
    },
  });
}

