import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
    });
  }

  async create(data: {
    name: string;
    sku?: string;
    category: string;
    description?: string;
    price: number;
    cost?: number;
    brand?: string;
    model?: string;
    isActive?: boolean;
    imageUrl?: string;
  }) {
    return this.prisma.product.create({
      data: {
        name: data.name,
        sku: data.sku || `SKU-${Date.now().toString().slice(-6)}`,
        category: data.category || 'Geral',
        description: data.description || '',
        price: Number(data.price) || 0,
        cost: data.cost ? Number(data.cost) : null,
        brand: data.brand || null,
        model: data.model || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
        imageUrl: data.imageUrl || null,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.product.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.sku && { sku: data.sku }),
        ...(data.category && { category: data.category }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: Number(data.price) }),
        ...(data.cost !== undefined && { cost: Number(data.cost) }),
        ...(data.brand !== undefined && { brand: data.brand }),
        ...(data.model !== undefined && { model: data.model }),
        ...(data.isActive !== undefined && { isActive: Boolean(data.isActive) }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
      },
    });
  }

  async remove(id: string) {
    return this.prisma.product.delete({
      where: { id },
    });
  }

  async clearAll() {
    return this.prisma.product.deleteMany({});
  }
}
