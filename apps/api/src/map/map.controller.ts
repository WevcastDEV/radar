import { Controller, Get, UseGuards } from '@nestjs/common';
import { MapService } from './map.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Map')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('map')
export class MapController {
  constructor(private readonly mapService: MapService) {}

  @Get('markers')
  getMarkers() {
    return this.mapService.getMarkers();
  }

  @Get('heatmap')
  getHeatmap() {
    return this.mapService.getHeatmap();
  }
}
