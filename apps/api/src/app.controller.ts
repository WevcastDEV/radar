import { Controller, Get } from '@nestjs/common';
import * as os from 'os';

function getLocalIp(): string {
  const ifaces = os.networkInterfaces();
  for (const dev in ifaces) {
    const list = ifaces[dev];
    if (list) {
      for (const d of list) {
        if (d.family === 'IPv4' && !d.internal && !d.address.startsWith('169.254.')) {
          return d.address;
        }
      }
    }
  }
  return '127.0.0.1';
}

@Controller()
export class AppController {
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      online: true,
      service: 'Radar de Oportunidades API',
      timestamp: new Date().toISOString(),
      serverIp: getLocalIp(),
    };
  }

  @Get('server-info')
  getServerInfo() {
    const ip = getLocalIp();
    return {
      success: true,
      data: {
        serverIp: ip,
        webPort: 3000,
        apiPort: 3001,
        localUrl: 'http://localhost:3000',
        networkUrl: `http://${ip}:3000`,
        hostname: os.hostname(),
      },
    };
  }

  @Get('status')
  getStatus() {
    return {
      status: 'ok',
      online: true,
      database: 'connected',
      timestamp: new Date().toISOString(),
      serverIp: getLocalIp(),
    };
  }
}
