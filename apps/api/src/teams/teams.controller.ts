import { Controller, Get, Post, Put, Delete, Body, Param, NotFoundException, BadRequestException } from '@nestjs/common';
import { TeamsService, TeamMember } from './teams.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Teams')
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  findAll() {
    const list = this.teamsService.findAll();
    return { success: true, data: list, total: list.length };
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    const item = this.teamsService.findById(id);
    if (!item) {
      throw new NotFoundException(`Membro ${id} não encontrado.`);
    }
    return { success: true, data: item };
  }

  @Post()
  create(@Body() body: Partial<TeamMember>) {
    try {
      const created = this.teamsService.create(body);
      return { success: true, message: 'Funcionário cadastrado com sucesso!', data: created };
    } catch (e: any) {
      throw new BadRequestException(e.message || 'Erro ao cadastrar funcionário.');
    }
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<TeamMember>) {
    try {
      const updated = this.teamsService.update(id, body);
      return { success: true, message: 'Funcionário atualizado com sucesso!', data: updated };
    } catch (e: any) {
      throw new BadRequestException(e.message || 'Erro ao atualizar funcionário.');
    }
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    const removed = this.teamsService.delete(id);
    if (!removed) {
      throw new NotFoundException(`Funcionário ${id} não encontrado.`);
    }
    return { success: true, message: 'Funcionário removido com sucesso!' };
  }
}
