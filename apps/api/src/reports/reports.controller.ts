import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  getSales() {
    return this.reportsService.getSales();
  }
  
  @Get('leads')
  getLeads() {
    return this.reportsService.getLeads();
  }
  
  @Get('conversion')
  getConversion() {
    return this.reportsService.getConversion();
  }
  
  @Get('team-performance')
  getTeamPerformance() {
    return this.reportsService.getTeamPerformance();
  }
}
