import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.goal.findMany();
  }
}
