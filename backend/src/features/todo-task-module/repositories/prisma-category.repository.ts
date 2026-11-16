import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { CATEGORY_DEFAULT_COLOR, CATEGORY_DEFAULT_ICON } from '../category-appearance.constants.js';

import { CategoryRecord } from './category-record.interface.js';
import {
  CategoryRepository,
  CreateCategoryData,
  UpdateCategoryData,
} from './category-repository.interface.js';

@Injectable()
export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<CategoryRecord | null> {
    return this.prisma.category.findUnique({ where: { id } });
  }

  async findManyByUser(userId: string): Promise<CategoryRecord[]> {
    return this.prisma.category.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  }

  async create(userId: string, data: CreateCategoryData): Promise<CategoryRecord> {
    return this.prisma.category.create({
      data: {
        userId,
        name: data.name,
        color: data.color ?? CATEGORY_DEFAULT_COLOR,
        icon: data.icon ?? CATEGORY_DEFAULT_ICON,
      },
    });
  }

  async update(id: string, data: UpdateCategoryData): Promise<CategoryRecord> {
    return this.prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        color: data.color,
        icon: data.icon,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.category.delete({ where: { id } });
  }
}
