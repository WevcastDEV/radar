import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as path from 'path';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const fs = require('fs');
    const candidates = [
      path.resolve(__dirname, '../../../packages/database/prisma/radar.db'),
      path.resolve(__dirname, '../../packages/database/prisma/radar.db'),
      path.resolve(process.cwd(), 'packages/database/prisma/radar.db'),
      path.resolve(process.cwd(), 'radar.db'),
      process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('./radar.db')
        ? process.env.DATABASE_URL.replace(/^file:/, '')
        : null,
    ].filter(Boolean);

    const foundDb = candidates.find((p) => fs.existsSync(p)) || path.resolve(__dirname, '../../../packages/database/prisma/radar.db');
    const dbUrl = `file:${foundDb}`;
    console.log(`[PrismaService] Usando banco de dados SQLite em: ${foundDb}`);

    super({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ Banco de dados local conectado com sucesso (SQLite).');
    } catch (error) {
      console.error('⚠️ Falha ao conectar ao banco de dados:', error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
