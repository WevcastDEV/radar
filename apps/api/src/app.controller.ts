import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      online: true,
      service: 'Radar de Oportunidades API',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('status')
  getStatus() {
    return {
      status: 'ok',
      online: true,
      database: 'connected',
      timestamp: new Date().toISOString(),
    };
  }
}
