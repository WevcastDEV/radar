import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const totalLeads = await this.prisma.lead.count({ where: { deletedAt: null } });
    const priorityLeads = await this.prisma.lead.count({ where: { deletedAt: null, priority: { in: ['HIGH', 'URGENT'] } } });
    const scheduledVisits = await this.prisma.visit.count({ where: { status: 'SCHEDULED' } });
    const openProposals = await this.prisma.proposal.count({ where: { status: 'SENT', deletedAt: null } });
    
    return {
      totalLeads,
      priorityLeads,
      scheduledVisits,
      openProposals,
    };
  }
}
