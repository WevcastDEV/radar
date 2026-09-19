import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScoreService {
  constructor(private prisma: PrismaService) {}

  async calculateScore(leadId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId }, include: { segment: true } });
    if (!lead) return null;
    
    let total = 0;
    if (lead.isNightOperation) total += 20;
    if (lead.is24hOperation) total += 30;
    if (lead.hasHighTraffic) total += 15;
    if (lead.hasLargeExterior) total += 15;
    
    const level = total >= 80 ? 'PRIORITY' : total >= 60 ? 'HIGH' : total >= 40 ? 'GOOD' : total >= 20 ? 'MEDIUM' : 'LOW';

    return this.prisma.score.upsert({
      where: { leadId },
      update: { total, level },
      create: { leadId, total, level }
    });
  }

  async getScore(leadId: string) {
    return this.prisma.score.findUnique({ where: { leadId } });
  }
}
