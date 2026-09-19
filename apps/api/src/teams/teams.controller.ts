import { Controller, Get, UseGuards } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  findAll() {
    return this.teamsService.findAll();
  }
}
