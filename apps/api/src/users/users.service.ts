import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface UserItem {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'Administrador' | 'Gestor Comercial' | 'Vendedor' | 'Técnico';
  status: 'Ativo' | 'Bloqueado';
  lastLogin: string;
}

const DEFAULT_USERS: UserItem[] = [
  { id: 'USR-00', name: 'Tom (Administrador)', email: 'tom@criart.com', role: 'Administrador', status: 'Ativo', lastLogin: 'Agora mesmo' },
  { id: 'USR-01', name: 'Weverton (Admin)', email: 'weverton@wctech.com.br', role: 'Administrador', status: 'Ativo', lastLogin: 'Agora mesmo' },
  { id: 'USR-02', name: 'Karyna', email: 'karyna@criart.com', role: 'Vendedor', status: 'Ativo', lastLogin: 'Hoje às 15:10' },
  { id: 'USR-03', name: 'Carlos Santos', email: 'carlos@radar.com', role: 'Vendedor', status: 'Ativo', lastLogin: 'Hoje às 14:20' },
  { id: 'USR-04', name: 'Rafael Costa', email: 'rafael@radar.com', role: 'Vendedor', status: 'Ativo', lastLogin: 'Hoje às 10:15' },
  { id: 'USR-05', name: 'André Lima', email: 'andre@radar.com', role: 'Vendedor', status: 'Ativo', lastLogin: 'Ontem às 18:00' },
  { id: 'USR-06', name: 'Lucas Silva', email: 'lucas@radar.com', role: 'Gestor Comercial', status: 'Ativo', lastLogin: '04/09/2026' },
  { id: 'USR-07', name: 'Camila Rocha', email: 'camila@radar.com', role: 'Vendedor', status: 'Ativo', lastLogin: 'Ontem às 11:30' },
  { id: 'USR-08', name: 'Fernanda Lima', email: 'fernanda@radar.com', role: 'Vendedor', status: 'Ativo', lastLogin: 'Ontem às 16:45' },
  { id: 'USR-09', name: 'Larissa Menezes', email: 'larissa@radar.com', role: 'Vendedor', status: 'Ativo', lastLogin: 'Hoje às 09:00' },
];

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private users: UserItem[] = [];

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

  private getUsersFilePath(): string {
    return path.join(this.getDataDir(), 'users_database.json');
  }

  private loadData() {
    try {
      const usersPath = this.getUsersFilePath();
      if (fs.existsSync(usersPath)) {
        const raw = fs.readFileSync(usersPath, 'utf8');
        try {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            // Preserva exatamente o que foi salvo no disco, mesmo que seja []
            this.users = list;
          } else {
            this.users = [...DEFAULT_USERS];
            this.saveUsers();
          }
        } catch {
          this.users = [...DEFAULT_USERS];
          this.saveUsers();
        }
      } else {
        // Primeira inicialização do sistema
        this.users = [...DEFAULT_USERS];
        this.saveUsers();
      }
    } catch (e: any) {
      this.logger.error(`Erro ao carregar users_database.json: ${e?.message}`);
      this.users = [];
    }
  }

  private saveUsers() {
    try {
      const mainPath = this.getUsersFilePath();
      const content = JSON.stringify(this.users, null, 2);
      fs.writeFileSync(mainPath, content, 'utf8');

      // Espelha para diretórios alternativos se existirem
      const altDir = mainPath.includes('apps')
        ? path.join(process.cwd(), 'data')
        : path.join(process.cwd(), 'apps', 'api', 'data');
      if (fs.existsSync(altDir)) {
        try {
          fs.writeFileSync(path.join(altDir, 'users_database.json'), content, 'utf8');
        } catch {}
      }
    } catch (e: any) {
      this.logger.error(`Erro ao salvar users_database.json: ${e?.message}`);
    }
  }

  findAll(): UserItem[] {
    this.loadData();
    return [...this.users];
  }

  findById(id: string): UserItem | undefined {
    this.loadData();
    return this.users.find((u) => u.id === id);
  }

  create(dto: Partial<UserItem>): UserItem {
    this.loadData();
    const id = dto.id || `USR-${String(this.users.length + 1).padStart(2, '0')}`;
    const newUser: UserItem = {
      id,
      name: dto.name || 'Novo Usuário',
      email: dto.email || `${id.toLowerCase()}@radar.com`,
      role: dto.role || 'Vendedor',
      status: dto.status || 'Ativo',
      avatar: dto.avatar,
      lastLogin: dto.lastLogin || 'Nunca acessou',
    };

    this.users.push(newUser);
    this.saveUsers();
    return newUser;
  }

  update(id: string, dto: Partial<UserItem>): UserItem {
    this.loadData();
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) {
      throw new Error(`Usuário ${id} não encontrado.`);
    }

    this.users[index] = {
      ...this.users[index],
      ...dto,
    };

    this.saveUsers();
    return this.users[index];
  }

  delete(id: string): boolean {
    this.loadData();
    const initialLen = this.users.length;
    this.users = this.users.filter((u) => u.id !== id);
    if (this.users.length !== initialLen) {
      this.saveUsers();
      return true;
    }
    return false;
  }
}
