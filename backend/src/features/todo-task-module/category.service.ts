import { Inject, Injectable } from '@nestjs/common';

import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { CategoryForbiddenException } from './exceptions/category-forbidden.exception.js';
import { CategoryNotFoundException } from './exceptions/category-not-found.exception.js';
import { CategoryRecord } from './repositories/category-record.interface.js';
import {
  CATEGORY_REPOSITORY,
  type CategoryRepository,
} from './repositories/category-repository.interface.js';
import { CategoryResult } from './category-result.interface.js';

@Injectable()
export class CategoryService {
  constructor(@Inject(CATEGORY_REPOSITORY) private readonly categoryRepository: CategoryRepository) {}

  async create(userId: string, dto: CreateCategoryDto): Promise<CategoryResult> {
    const category = await this.categoryRepository.create(userId, {
      name: dto.name,
      color: dto.color,
      icon: dto.icon,
    });
    return this.toResult(category);
  }

  async list(userId: string): Promise<CategoryResult[]> {
    const categories = await this.categoryRepository.findManyByUser(userId);
    return categories.map((category) => this.toResult(category));
  }

  async update(userId: string, categoryId: string, dto: UpdateCategoryDto): Promise<CategoryResult> {
    await this.findOwnedCategoryOrThrow(userId, categoryId);
    const updated = await this.categoryRepository.update(categoryId, {
      name: dto.name,
      color: dto.color,
      icon: dto.icon,
    });
    return this.toResult(updated);
  }

  async remove(userId: string, categoryId: string): Promise<void> {
    await this.findOwnedCategoryOrThrow(userId, categoryId);
    await this.categoryRepository.delete(categoryId);
  }

  /**
   * Dùng bởi TaskService khi validate `categoryId` gửi kèm task — xem
   * docs/Task_Category_ToDo.md mục 4.5. Tách riêng khỏi [findOwnedCategoryOrThrow] vì ngữ nghĩa lỗi
   * khác nhau: ở đây là validate INPUT (400), không phải thao tác trực tiếp lên resource qua URL
   * (403/404) — nên chỉ trả `CategoryRecord | null`, để TaskService tự quyết định map lỗi.
   */
  async findOwnedOrNull(userId: string, categoryId: string): Promise<CategoryRecord | null> {
    const category = await this.categoryRepository.findById(categoryId);
    if (category === null || category.userId !== userId) {
      return null;
    }
    return category;
  }

  /** Tách 404 (không tồn tại) vs 403 (tồn tại nhưng thuộc user khác) — cùng pattern TaskService. */
  private async findOwnedCategoryOrThrow(userId: string, categoryId: string): Promise<CategoryRecord> {
    const category = await this.categoryRepository.findById(categoryId);
    if (category === null) {
      throw new CategoryNotFoundException();
    }
    if (category.userId !== userId) {
      throw new CategoryForbiddenException();
    }
    return category;
  }

  private toResult(category: CategoryRecord): CategoryResult {
    return {
      id: category.id,
      name: category.name,
      color: category.color,
      icon: category.icon,
      createdAt: category.createdAt,
    };
  }
}
