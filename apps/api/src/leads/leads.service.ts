import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadFiltersDto } from './dto/lead-filters.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateLeadDto) {
    const { address, ...leadData } = dto;

    let stageId = (leadData as any).pipelineStageId;
    if (!stageId) {
      const defaultStage = await this.prisma.pipelineStage.findFirst({
        where: { pipeline: { isDefault: true } },
        orderBy: { order: 'asc' },
      });
      if (defaultStage) {
        stageId = defaultStage.id;
      }
    }

    return this.prisma.lead.create({
      data: {
        ...leadData,
        pipelineStageId: stageId,
        address: address ? { create: address } : undefined,
      },
      include: { address: true, segment: true, score: true, contacts: true }
    });
  }

  async findAll(filters: LeadFiltersDto) {
    const where: Prisma.LeadWhereInput = { deletedAt: null };
    
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { companyName: { contains: filters.search } },
        { cnpj: { contains: filters.search } }
      ];
    }
    if (filters.city) {
      where.address = { city: { contains: filters.city } };
    }
    if (filters.status) where.status = filters.status;
    if (filters.segmentId) where.segmentId = filters.segmentId;

    if (filters.latitude && filters.longitude && filters.radiusKm) {
      const allLeads = await this.prisma.lead.findMany({
        where: {
          ...where,
          address: {
            ...((where.address as any) || {}),
            latitude: { not: null },
            longitude: { not: null },
          },
        },
        include: {
          segment: true,
          address: true,
          score: true,
          contacts: true,
          responsible: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const R = 6371; // Raio da Terra em km
      const lat1 = filters.latitude;
      const lon1 = filters.longitude;

      return allLeads.filter((l) => {
        if (!l.address?.latitude || !l.address?.longitude) return false;
        const lat2 = l.address.latitude;
        const lon2 = l.address.longitude;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = R * c;
        return distanceKm <= (filters.radiusKm || 0);
      });
    }

    return this.prisma.lead.findMany({
      where,
      include: {
        segment: true,
        address: true,
        score: true,
        contacts: true,
        responsible: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    return this.prisma.lead.findUniqueOrThrow({
      where: { id },
      include: {
        segment: true,
        address: true,
        score: true,
        scoreFactors: true,
        contacts: true,
        pipelineStage: true,
        responsible: { select: { id: true, name: true } }
      }
    });
  }

  async update(id: string, dto: UpdateLeadDto) {
    const { address, ...leadData } = dto;
    return this.prisma.lead.update({
      where: { id },
      data: {
        ...leadData,
        ...(address ? {
          address: {
            upsert: {
              create: address,
              update: address
            }
          }
        } : {})
      },
      include: { address: true }
    });
  }

  async remove(id: string) {
    return this.prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}
