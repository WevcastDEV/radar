import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const STAGE_STATUS_MAP: Record<string, string> = {
  'novo-lead': 'NEW',
  'novo': 'NEW',
  'qualificado': 'QUALIFIED',
  'contato-realizado': 'CONTACTED',
  'contato': 'CONTACTED',
  'visita-agendada': 'VISIT_SCHEDULED',
  'visita': 'VISIT_SCHEDULED',
  'proposta-enviada': 'PROPOSAL_SENT',
  'proposta': 'PROPOSAL_SENT',
  'negociacao': 'NEGOTIATION',
  'cliente-fechado': 'WON',
  'fechado': 'WON',
};

@Injectable()
export class PipelineService {
  constructor(private prisma: PrismaService) {}

  async getPipeline() {
    let pipeline = await this.prisma.pipeline.findFirst({
      where: { isDefault: true },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: {
            leads: {
              where: { deletedAt: null },
              include: {
                segment: true,
                address: true,
                score: true,
                contacts: true,
                responsible: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    // Se não existir pipeline padrão, cria um
    if (!pipeline) {
      pipeline = await this.prisma.pipeline.create({
        data: {
          name: 'Pipeline Comercial',
          isDefault: true,
          stages: {
            create: [
              { name: 'Novo Lead', slug: 'novo-lead', color: '#6B7280', order: 1 },
              { name: 'Qualificado', slug: 'qualificado', color: '#3B82F6', order: 2 },
              { name: 'Contato Realizado', slug: 'contato-realizado', color: '#8B5CF6', order: 3 },
              { name: 'Visita Agendada', slug: 'visita-agendada', color: '#F59E0B', order: 4 },
              { name: 'Proposta Enviada', slug: 'proposta-enviada', color: '#F97316', order: 5 },
              { name: 'Negociação', slug: 'negociacao', color: '#EF4444', order: 6 },
              { name: 'Cliente Fechado', slug: 'cliente-fechado', color: '#10B981', order: 7 },
            ],
          },
        },
        include: {
          stages: {
            orderBy: { order: 'asc' },
            include: {
              leads: {
                where: { deletedAt: null },
                include: {
                  segment: true,
                  address: true,
                  score: true,
                  contacts: true,
                  responsible: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      });
    }

    // Auto-recuperação: se houver leads ativos sem pipelineStageId, vincula-os ao primeiro estágio
    const firstStage = pipeline.stages[0];
    if (firstStage) {
      await this.prisma.lead.updateMany({
        where: {
          pipelineStageId: null,
          deletedAt: null,
        },
        data: {
          pipelineStageId: firstStage.id,
        },
      });
    }

    return pipeline;
  }

  async moveLead(leadId: string, stageId: string) {
    const stage = await this.prisma.pipelineStage.findUnique({
      where: { id: stageId },
    });

    const newStatus = stage?.slug ? STAGE_STATUS_MAP[stage.slug] : undefined;

    return this.prisma.lead.update({
      where: { id: leadId },
      data: {
        pipelineStageId: stageId,
        ...(newStatus ? { status: newStatus } : {}),
      },
      include: {
        segment: true,
        address: true,
        score: true,
        contacts: true,
      },
    });
  }
}
