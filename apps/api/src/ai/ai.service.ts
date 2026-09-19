import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  async getRecommendations() {
    return [];
  }
  
  async getRoute() {
    return { stops: [] };
  }
  
  async getRegions() {
    return [];
  }
}
