import { CategoryRecord } from './category-record.interface.js';

export interface CreateCategoryData {
  name: string;
  color?: string;
  icon?: string;
}

export interface UpdateCategoryData {
  name?: string;
  color?: string;
  icon?: string;
}

export interface CategoryRepository {
  findById(id: string): Promise<CategoryRecord | null>;
  findManyByUser(userId: string): Promise<CategoryRecord[]>;
  create(userId: string, data: CreateCategoryData): Promise<CategoryRecord>;
  update(id: string, data: UpdateCategoryData): Promise<CategoryRecord>;
  delete(id: string): Promise<void>;
}

export const CATEGORY_REPOSITORY = Symbol('CategoryRepository');
