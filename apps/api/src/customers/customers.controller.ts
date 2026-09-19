import { Controller, Get, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAll() {
    return this.customersService.findAll();
  }
}
