import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VisitsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.visit.findMany();
  }
}
