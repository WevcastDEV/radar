import { Controller, Get, UseGuards } from '@nestjs/common';
import { CallsService } from './calls.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Calls')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Get()
  findAll() {
    return this.callsService.findAll();
  }
}
