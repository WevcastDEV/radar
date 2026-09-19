import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ScoreService } from './score.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Score')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('score')
export class ScoreController {
  constructor(private readonly scoreService: ScoreService) {}

  @Get(':leadId')
  getScore(@Param('leadId') leadId: string) {
    return this.scoreService.getScore(leadId);
  }

  @Post(':leadId/calculate')
  calculateScore(@Param('leadId') leadId: string) {
    return this.scoreService.calculateScore(leadId);
  }
}
