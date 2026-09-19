import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      console.warn('⚠️ Não foi possível conectar ao banco de dados (PostgreSQL não está rodando). Ignorando para permitir inicialização do WhatsApp...');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
