import { 
  Controller, Get, Post, Put, Delete, Body, Param, NotFoundException, BadRequestException 
} from '@nestjs/common';
import { UsersService, UserItem } from './users.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    const list = this.usersService.findAll();
    return { success: true, data: list, total: list.length };
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    const user = this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`Usuário ${id} não encontrado.`);
    }
    return { success: true, data: user };
  }

  @Post()
  create(@Body() body: Partial<UserItem>) {
    try {
      const created = this.usersService.create(body);
      return { success: true, message: 'Usuário cadastrado com sucesso!', data: created };
    } catch (e: any) {
      throw new BadRequestException(e.message || 'Erro ao criar usuário.');
    }
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<UserItem>) {
    try {
      const updated = this.usersService.update(id, body);
      return { success: true, message: 'Usuário atualizado com sucesso!', data: updated };
    } catch (e: any) {
      throw new BadRequestException(e.message || 'Erro ao atualizar usuário.');
    }
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    const removed = this.usersService.delete(id);
    if (!removed) {
      throw new NotFoundException(`Usuário ${id} não encontrado.`);
    }
    return { success: true, message: 'Usuário removido com sucesso!' };
  }
}
