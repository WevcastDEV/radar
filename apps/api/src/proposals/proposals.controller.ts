import { Controller, Get, UseGuards } from '@nestjs/common';
import { ProposalsService } from './proposals.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Proposals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('proposals')
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Get()
  findAll() {
    return this.proposalsService.findAll();
  }
}
