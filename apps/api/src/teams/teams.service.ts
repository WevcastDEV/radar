import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface TeamMember {
  id: string;
  rank: number;
  name: string;
  role: string;
  leads: number;
  calls: number;
  visits: number;
  proposals: number;
  sales: number;
  conversion: number;
  revenue: number;
  ticket: number;
  avatar: string;
}

const DEFAULT_TEAM_MEMBERS: TeamMember[] = [];

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);
  private members: TeamMember[] = [];

  constructor() {
    this.loadData();
  }

  private getDataDir(): string {
    let dir = path.join(process.cwd(), 'apps', 'api', 'data');
    if (!fs.existsSync(dir)) {
      if (fs.existsSync(path.join(process.cwd(), 'data'))) {
        dir = path.join(process.cwd(), 'data');
      } else {
        try {
          fs.mkdirSync(dir, { recursive: true });
        } catch {}
      }
    }
    return dir;
  }

  private getTeamFilePath(): string {
    return path.join(this.getDataDir(), 'team_database.json');
  }

  private loadData() {
    try {
      const filePath = this.getTeamFilePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        try {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            // Preserva exatamente a lista do disco, mesmo que vazia []
            this.members = list;
          } else {
            this.members = [...DEFAULT_TEAM_MEMBERS];
            this.saveData();
          }
        } catch {
          this.members = [...DEFAULT_TEAM_MEMBERS];
          this.saveData();
        }
      } else {
        this.members = [...DEFAULT_TEAM_MEMBERS];
        this.saveData();
      }
    } catch (e: any) {
      this.logger.error(`Erro ao carregar team_database.json: ${e?.message}`);
      this.members = [];
    }
  }

  private saveData() {
    try {
      const mainPath = this.getTeamFilePath();
      const content = JSON.stringify(this.members, null, 2);
      fs.writeFileSync(mainPath, content, 'utf8');

      const altDir = mainPath.includes('apps')
        ? path.join(process.cwd(), 'data')
        : path.join(process.cwd(), 'apps', 'api', 'data');
      if (fs.existsSync(altDir)) {
        try {
          fs.writeFileSync(path.join(altDir, 'team_database.json'), content, 'utf8');
        } catch {}
      }
    } catch (e: any) {
      this.logger.error(`Erro ao salvar team_database.json: ${e?.message}`);
    }
  }

  findAll(): TeamMember[] {
    this.loadData();
    return [...this.members];
  }

  findById(id: string): TeamMember | undefined {
    this.loadData();
    return this.members.find((m) => m.id === id);
  }

  create(dto: Partial<TeamMember>): TeamMember {
    this.loadData();
    const id = dto.id || Date.now().toString();
    const parts = (dto.name || 'Novo').split(' ');
    const avatar = dto.avatar || (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : (dto.name || 'NN').substring(0, 2).toUpperCase());
    
    const newMember: TeamMember = {
      id,
      rank: dto.rank || this.members.length + 1,
      name: dto.name || 'Novo Funcionário',
      role: dto.role || 'Vendedor',
      leads: Number(dto.leads) || 0,
      calls: Number(dto.calls) || 0,
      visits: Number(dto.visits) || 0,
      proposals: Number(dto.proposals) || 0,
      sales: Number(dto.sales) || 0,
      conversion: Number(dto.conversion) || 0,
      revenue: Number(dto.revenue) || 0,
      ticket: Number(dto.ticket) || 0,
      avatar,
    };

    this.members.push(newMember);
    this.saveData();
    return newMember;
  }

  update(id: string, dto: Partial<TeamMember>): TeamMember {
    this.loadData();
    const index = this.members.findIndex((m) => m.id === id);
    if (index === -1) {
      throw new Error(`Membro da equipe com ID ${id} não encontrado.`);
    }

    this.members[index] = {
      ...this.members[index],
      ...dto,
    };

    this.saveData();
    return this.members[index];
  }

  delete(id: string): boolean {
    this.loadData();
    const initialLen = this.members.length;
    this.members = this.members.filter((m) => m.id !== id);
    if (this.members.length !== initialLen) {
      this.saveData();
      return true;
    }
    return false;
  }
}
