/* eslint-disable @typescript-eslint/unbound-method --
 * Cùng lý do đã ghi ở task.service.spec.ts — idiom chuẩn Vitest mocking. */
import { CategoryService } from './category.service.js';
import { CategoryForbiddenException } from './exceptions/category-forbidden.exception.js';
import { CategoryNotFoundException } from './exceptions/category-not-found.exception.js';
import type { CategoryRecord } from './repositories/category-record.interface.js';
import type { CategoryRepository } from './repositories/category-repository.interface.js';

const OWNER_ID = 'owner-id-1';
const OTHER_USER_ID = 'other-user-id';
const CATEGORY_ID = 'category-id-1';

function createCategoryRecord(overrides: Partial<CategoryRecord> = {}): CategoryRecord {
  return {
    id: CATEGORY_ID,
    userId: OWNER_ID,
    name: 'Công việc',
    color: '#1E88E5',
    icon: '📁',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createService(): { service: CategoryService; repository: CategoryRepository } {
  const repository: CategoryRepository = {
    findById: vi.fn().mockResolvedValue(createCategoryRecord()),
    findManyByUser: vi.fn().mockResolvedValue([createCategoryRecord()]),
    create: vi.fn().mockResolvedValue(createCategoryRecord()),
    update: vi.fn().mockResolvedValue(createCategoryRecord({ name: 'Cá nhân' })),
    delete: vi.fn().mockResolvedValue(undefined),
  };

  const service = new CategoryService(repository);
  return { service, repository };
}

describe('CategoryService', () => {
  describe('create', () => {
    it('tạo category cho đúng userId, trả về CategoryResult không có userId', async () => {
      const { service, repository } = createService();

      const result = await service.create(OWNER_ID, { name: 'Công việc' });

      expect(repository.create).toHaveBeenCalledWith(OWNER_ID, {
        name: 'Công việc',
        color: undefined,
        icon: undefined,
      });
      expect(result).not.toHaveProperty('userId');
      expect(result.id).toBe(CATEGORY_ID);
    });
  });

  describe('list', () => {
    it('trả về toàn bộ category của user', async () => {
      const { service, repository } = createService();

      const result = await service.list(OWNER_ID);

      expect(repository.findManyByUser).toHaveBeenCalledWith(OWNER_ID);
      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('category thuộc đúng user -> gọi repository.update đúng field gửi lên', async () => {
      const { service, repository } = createService();

      await service.update(OWNER_ID, CATEGORY_ID, { name: 'Cá nhân' });

      expect(repository.update).toHaveBeenCalledWith(CATEGORY_ID, {
        name: 'Cá nhân',
        color: undefined,
        icon: undefined,
      });
    });

    it('category không tồn tại -> CategoryNotFoundException, không gọi update', async () => {
      const { service, repository } = createService();
      vi.mocked(repository.findById).mockResolvedValue(null);

      await expect(service.update(OWNER_ID, CATEGORY_ID, { name: 'Cá nhân' })).rejects.toThrow(
        CategoryNotFoundException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('category thuộc user khác -> CategoryForbiddenException, không gọi update', async () => {
      const { service, repository } = createService();
      vi.mocked(repository.findById).mockResolvedValue(createCategoryRecord({ userId: OTHER_USER_ID }));

      await expect(service.update(OWNER_ID, CATEGORY_ID, { name: 'Cá nhân' })).rejects.toThrow(
        CategoryForbiddenException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('category thuộc đúng user -> gọi delete đúng id', async () => {
      const { service, repository } = createService();

      await service.remove(OWNER_ID, CATEGORY_ID);

      expect(repository.delete).toHaveBeenCalledWith(CATEGORY_ID);
    });

    it('category không tồn tại -> CategoryNotFoundException, không gọi delete', async () => {
      const { service, repository } = createService();
      vi.mocked(repository.findById).mockResolvedValue(null);

      await expect(service.remove(OWNER_ID, CATEGORY_ID)).rejects.toThrow(CategoryNotFoundException);
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('category thuộc user khác -> CategoryForbiddenException, không gọi delete', async () => {
      const { service, repository } = createService();
      vi.mocked(repository.findById).mockResolvedValue(createCategoryRecord({ userId: OTHER_USER_ID }));

      await expect(service.remove(OWNER_ID, CATEGORY_ID)).rejects.toThrow(CategoryForbiddenException);
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });

  describe('findOwnedOrNull', () => {
    it('category thuộc đúng user -> trả về record', async () => {
      const { service } = createService();

      const result = await service.findOwnedOrNull(OWNER_ID, CATEGORY_ID);

      expect(result?.id).toBe(CATEGORY_ID);
    });

    it('category không tồn tại -> null (KHÔNG throw)', async () => {
      const { service, repository } = createService();
      vi.mocked(repository.findById).mockResolvedValue(null);

      const result = await service.findOwnedOrNull(OWNER_ID, CATEGORY_ID);

      expect(result).toBeNull();
    });

    it('category thuộc user khác -> null (KHÔNG throw 403)', async () => {
      const { service, repository } = createService();
      vi.mocked(repository.findById).mockResolvedValue(createCategoryRecord({ userId: OTHER_USER_ID }));

      const result = await service.findOwnedOrNull(OWNER_ID, CATEGORY_ID);

      expect(result).toBeNull();
    });
  });
});
