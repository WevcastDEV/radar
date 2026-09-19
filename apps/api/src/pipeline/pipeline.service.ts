import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PipelineService {
  constructor(private prisma: PrismaService) {}

  async getPipeline() {
    return this.prisma.pipeline.findFirst({
      where: { isDefault: true },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: { leads: { where: { deletedAt: null } } }
        }
      }
    });
  }

  async moveLead(leadId: string, stageId: string) {
    return this.prisma.lead.update({
      where: { id: leadId },
      data: { pipelineStageId: stageId }
    });
  }
}
