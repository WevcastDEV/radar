import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSales() {
    return this.prisma.sale.findMany();
  }
  
  async getLeads() {
    return this.prisma.lead.findMany();
  }
  
  async getConversion() {
    return { conversionRate: 15.5 };
  }
  
  async getTeamPerformance() {
    return [];
  }
}
