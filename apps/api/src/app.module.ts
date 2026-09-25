import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { LeadsModule } from './leads/leads.module';
import { MapModule } from './map/map.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { ScoreModule } from './score/score.module';
import { CallsModule } from './calls/calls.module';
import { VisitsModule } from './visits/visits.module';
import { ProposalsModule } from './proposals/proposals.module';
import { ProductsModule } from './products/products.module';
import { CustomersModule } from './customers/customers.module';
import { TeamsModule } from './teams/teams.module';
import { GoalsModule } from './goals/goals.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AiModule } from './ai/ai.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    LeadsModule,
    MapModule,
    DashboardModule,
    PipelineModule,
    ScoreModule,
    CallsModule,
    VisitsModule,
    ProposalsModule,
    ProductsModule,
    CustomersModule,
    TeamsModule,
    GoalsModule,
    ReportsModule,
    NotificationsModule,
    AiModule,
    WhatsappModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
