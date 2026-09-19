import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { ApiTags, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class MoveLeadDto {
  @ApiProperty() leadId: string;
  @ApiProperty() stageId: string;
}

@ApiTags('Pipeline')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pipeline')
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Get()
  getPipeline() {
    return this.pipelineService.getPipeline();
  }

  @Put('move')
  moveLead(@Body() dto: MoveLeadDto) {
    return this.pipelineService.moveLead(dto.leadId, dto.stageId);
  }
}
