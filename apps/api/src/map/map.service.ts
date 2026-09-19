import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MapService {
  constructor(private prisma: PrismaService) {}

  async getMarkers() {
    return this.prisma.lead.findMany({
      where: {
        deletedAt: null,
        address: { latitude: { not: null }, longitude: { not: null } }
      },
      select: {
        id: true,
        name: true,
        status: true,
        priority: true,
        address: { select: { latitude: true, longitude: true } },
        segment: { select: { id: true, icon: true, color: true } },
        score: { select: { total: true, level: true } }
      }
    });
  }

  async getHeatmap() {
    const leads = await this.prisma.lead.findMany({
      where: { deletedAt: null, address: { latitude: { not: null }, longitude: { not: null } } },
      select: {
        address: { select: { latitude: true, longitude: true } },
        score: { select: { total: true } }
      }
    });
    return leads.map(l => ({
      latitude: l.address?.latitude,
      longitude: l.address?.longitude,
      intensity: l.score?.total || 10
    }));
  }
}
