import { 
  Controller, Get, Post, Put, Delete, Body, Param, Query, 
  BadRequestException, NotFoundException 
} from '@nestjs/common';
import { GoalsService, GoalItem, GoalSale } from './goals.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Goals')
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get('summary')
  getSummary(@Query('month') month?: number, @Query('year') year?: number) {
    const summary = this.goalsService.getSummary({ month, year });
    return { success: true, data: summary };
  }

  @Get('sales')
  findAllSales(
    @Query('seller') seller?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number
  ) {
    const sales = this.goalsService.findAllSales({ seller, category, search, limit });
    return { success: true, data: sales, total: sales.length };
  }

  @Post('sales')
  registerSale(
    @Body()
    body: {
      goalId?: string;
      sellerName: string;
      sellerId?: string;
      clientName: string;
      clientPhone: string;
      value: number;
      category: string;
      notes?: string;
      createdAt?: number;
    }
  ) {
    try {
      const result = this.goalsService.registerSale(body);
      return { success: true, message: 'Venda registrada com sucesso!', ...result };
    } catch (e: any) {
      throw new BadRequestException(e.message || 'Erro ao registrar venda.');
    }
  }

  @Delete('sales/:id')
  deleteSale(@Param('id') id: string) {
    const result = this.goalsService.deleteSale(id);
    if (!result.success) {
      throw new NotFoundException(`Venda ${id} não encontrada.`);
    }
    return { success: true, message: 'Venda estornada com sucesso!', data: result.removedSale };
  }

  @Put('sales/:id')
  updateSale(@Param('id') id: string, @Body() body: Partial<GoalSale>) {
    try {
      const result = this.goalsService.updateSale(id, body);
      return { success: true, message: 'Venda atualizada com sucesso!', ...result };
    } catch (e: any) {
      throw new BadRequestException(e.message || 'Erro ao atualizar venda.');
    }
  }

  @Get()
  findAll(
    @Query('seller') seller?: string,
    @Query('category') category?: string,
    @Query('month') month?: number,
    @Query('year') year?: number
  ) {
    const items = this.goalsService.findAll({ seller, category, month, year });
    return { success: true, data: items, total: items.length };
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    const goal = this.goalsService.findById(id);
    if (!goal) {
      throw new NotFoundException(`Meta ${id} não encontrada.`);
    }
    return { success: true, data: goal };
  }

  @Post()
  createGoal(@Body() body: Partial<GoalItem>) {
    try {
      const created = this.goalsService.createGoal(body);
      return { success: true, message: 'Meta criada com sucesso!', data: created };
    } catch (e: any) {
      throw new BadRequestException(e.message || 'Erro ao criar meta.');
    }
  }

  @Put(':id')
  updateGoal(@Param('id') id: string, @Body() body: Partial<GoalItem>) {
    try {
      const updated = this.goalsService.updateGoal(id, body);
      return { success: true, message: 'Meta atualizada com sucesso!', data: updated };
    } catch (e: any) {
      throw new BadRequestException(e.message || 'Erro ao atualizar meta.');
    }
  }

  @Delete(':id')
  deleteGoal(@Param('id') id: string) {
    const removed = this.goalsService.deleteGoal(id);
    if (!removed) {
      throw new NotFoundException(`Meta ${id} não encontrada.`);
    }
    return { success: true, message: 'Meta removida com sucesso!' };
  }
}
