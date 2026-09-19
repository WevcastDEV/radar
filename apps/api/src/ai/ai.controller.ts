import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('recommendations')
  getRecommendations() {
    return this.aiService.getRecommendations();
  }
  
  @Post('route')
  getRoute() {
    return this.aiService.getRoute();
  }
  
  @Get('regions')
  getRegions() {
    return this.aiService.getRegions();
  }
}
