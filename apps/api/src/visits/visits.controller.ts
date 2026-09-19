import { Controller, Get, UseGuards } from '@nestjs/common';
import { VisitsService } from './visits.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Visits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('visits')
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Get()
  findAll() {
    return this.visitsService.findAll();
  }
}
