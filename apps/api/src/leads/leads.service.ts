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
    return this.prisma.lead.create({
      data: {
        ...leadData,
        address: address ? { create: address } : undefined,
      },
      include: { address: true }
    });
  }

  async findAll(filters: LeadFiltersDto) {
    const where: Prisma.LeadWhereInput = { deletedAt: null };
    
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { companyName: { contains: filters.search, mode: 'insensitive' } },
        { cnpj: { contains: filters.search } }
      ];
    }
    if (filters.city) {
      where.address = { city: { contains: filters.city, mode: 'insensitive' } };
    }
    if (filters.status) where.status = filters.status;
    if (filters.segmentId) where.segmentId = filters.segmentId;

    if (filters.latitude && filters.longitude && filters.radiusKm) {
      const radiusMeters = filters.radiusKm * 1000;
      const leads = await this.prisma.$queryRaw`
        SELECT l.*, a.latitude, a.longitude 
        FROM leads l
        LEFT JOIN addresses a ON l.id = a.lead_id
        WHERE l.deleted_at IS NULL
          AND a.latitude IS NOT NULL
          AND a.longitude IS NOT NULL
          AND ST_DWithin(
            ST_SetSRID(ST_MakePoint(a.longitude, a.latitude), 4326)::geography,
            ST_SetSRID(ST_MakePoint(${filters.longitude}, ${filters.latitude}), 4326)::geography,
            ${radiusMeters}
          )
      `;
      return leads;
    }

    return this.prisma.lead.findMany({
      where,
      include: {
        segment: true,
        address: true,
        score: true,
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
