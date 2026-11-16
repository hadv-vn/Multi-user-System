/* eslint-disable @typescript-eslint/unbound-method --
 * Rule báo sai trên idiom chuẩn của Vitest mocking: tham chiếu trực tiếp 1
 * method của object mock (vd `expect(mocks.x.method).toHaveBeenCalledWith(...)`,
 * `vi.mocked(mocks.x.method)`) để assert — các method này là `vi.fn()`
 * không dùng `this`, không có rủi ro mất ngữ cảnh `this` thật như rule giả định. */
import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import type { CategoryService } from './category.service.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { TaskForbiddenException } from './exceptions/task-forbidden.exception.js';
import { TaskNotFoundException } from './exceptions/task-not-found.exception.js';
import type { TaskRecord } from './repositories/task-record.interface.js';
import type { TaskRepository } from './repositories/task-repository.interface.js';
import { TaskService } from './task.service.js';

const OWNER_ID = 'owner-id-1';
const OTHER_USER_ID = 'other-user-id';
const TASK_ID = 'task-id-1';

function createTaskRecord(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: TASK_ID,
    userId: OWNER_ID,
    title: 'Mua sữa',
    description: 'Mua sữa không đường',
    status: 'open',
    priority: 'medium',
    sortKey: 1000,
    categoryId: null,
    dueDate: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

/** Dùng cho test `reorder` — mock findById trả về đúng record theo id trong `recordsById`. */
function mockFindByIdFrom(
  repository: TaskRepository,
  recordsById: Record<string, TaskRecord>,
): void {
  vi.mocked(repository.findById).mockImplementation((id: string) =>
    Promise.resolve(recordsById[id] ?? null),
  );
}

function createService(): {
  service: TaskService;
  repository: TaskRepository;
  categoryService: CategoryService;
} {
  const repository: TaskRepository = {
    findById: vi.fn().mockResolvedValue(createTaskRecord()),
    findManyByUser: vi.fn().mockResolvedValue([createTaskRecord()]),
    create: vi.fn().mockResolvedValue(createTaskRecord()),
    updateDetails: vi.fn().mockResolvedValue(createTaskRecord()),
    updateStatus: vi.fn().mockResolvedValue(createTaskRecord({ status: 'done' })),
    updateSortKey: vi.fn().mockResolvedValue(createTaskRecord({ sortKey: 500 })),
    findSortKeyRange: vi.fn().mockResolvedValue({ min: 1000, max: 1000 }),
    delete: vi.fn().mockResolvedValue(undefined),
  };
  // Chỉ cần đúng method TaskService thực sự gọi (findOwnedOrNull) — xem task.service.ts.
  const categoryService = {
    findOwnedOrNull: vi.fn().mockResolvedValue({ id: 'category-id-1', userId: OWNER_ID }),
  } as unknown as CategoryService;

  const service = new TaskService(repository, categoryService);
  return { service, repository, categoryService };
}

describe('TaskService', () => {
  describe('create', () => {
    it('tạo task cho đúng userId, trả về TaskResult không có userId/sortKey', async () => {
      const { service, repository } = createService();

      const result = await service.create(OWNER_ID, {
        title: 'Mua sữa',
        description: 'Mua sữa không đường',
      });

      expect(repository.create).toHaveBeenCalledWith(OWNER_ID, {
        title: 'Mua sữa',
        description: 'Mua sữa không đường',
        sortKey: 0, // range.min (1000) - SORT_KEY_GAP (1000), mặc định insertPosition 'top'
      });
      expect(result).not.toHaveProperty('userId');
      expect(result).not.toHaveProperty('sortKey');
      expect(result.id).toBe(TASK_ID);
    });

    it('insertPosition "bottom" -> sortKey = max + GAP', async () => {
      const { service, repository } = createService();

      await service.create(OWNER_ID, { title: 'Mua sữa', insertPosition: 'bottom' });

      expect(repository.create).toHaveBeenCalledWith(
        OWNER_ID,
        expect.objectContaining({ sortKey: 2000 }), // range.max (1000) + SORT_KEY_GAP (1000)
      );
    });

    it('user chưa có task nào -> sortKey = SORT_KEY_GAP, không đọc range', async () => {
      const { service, repository } = createService();
      vi.mocked(repository.findSortKeyRange).mockResolvedValue(null);

      await service.create(OWNER_ID, { title: 'Mua sữa' });

      expect(repository.create).toHaveBeenCalledWith(
        OWNER_ID,
        expect.objectContaining({ sortKey: 1000 }),
      );
    });

    it('categoryId hợp lệ (thuộc đúng user) -> tạo thành công, truyền categoryId xuống repository', async () => {
      const { service, repository } = createService();

      await service.create(OWNER_ID, { title: 'Mua sữa', categoryId: 'category-id-1' });

      expect(repository.create).toHaveBeenCalledWith(
        OWNER_ID,
        expect.objectContaining({ categoryId: 'category-id-1' }),
      );
    });

    it('categoryId không tồn tại/không thuộc user -> BadRequestException, không gọi repository.create', async () => {
      const { service, repository, categoryService } = createService();
      vi.mocked(categoryService.findOwnedOrNull).mockResolvedValue(null);

      await expect(
        service.create(OWNER_ID, { title: 'Mua sữa', categoryId: 'category-khong-ton-tai' }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('có dueDate -> truyền đúng Date xuống repository', async () => {
      const { service, repository } = createService();

      await service.create(OWNER_ID, { title: 'Mua sữa', dueDate: '2026-11-20' });

      expect(repository.create).toHaveBeenCalledWith(
        OWNER_ID,
        expect.objectContaining({ dueDate: new Date('2026-11-20') }),
      );
    });

    it('không có dueDate -> không gửi field này xuống repository (undefined)', async () => {
      const { service, repository } = createService();

      await service.create(OWNER_ID, { title: 'Mua sữa' });

      const callArgs = vi.mocked(repository.create).mock.calls[0][1];
      expect(callArgs.dueDate).toBeUndefined();
    });

    it('có priority -> truyền đúng xuống repository', async () => {
      const { service, repository } = createService();

      await service.create(OWNER_ID, { title: 'Mua sữa', priority: 'high' });

      expect(repository.create).toHaveBeenCalledWith(OWNER_ID, expect.objectContaining({ priority: 'high' }));
    });

    it('không có priority -> repository tự mặc định medium (PrismaTaskRepository), service không gửi field', async () => {
      const { service, repository } = createService();

      await service.create(OWNER_ID, { title: 'Mua sữa' });

      const callArgs = vi.mocked(repository.create).mock.calls[0][1];
      expect(callArgs.priority).toBeUndefined();
    });
  });

  describe('reorder', () => {
    it('có cả after và before -> sortKey mới là trung điểm', async () => {
      const { service, repository } = createService();
      mockFindByIdFrom(repository, {
        [TASK_ID]: createTaskRecord({ sortKey: 1500 }),
        'after-id': createTaskRecord({ id: 'after-id', sortKey: 1000 }),
        'before-id': createTaskRecord({ id: 'before-id', sortKey: 2000 }),
      });

      await service.reorder(OWNER_ID, TASK_ID, { afterTaskId: 'after-id', beforeTaskId: 'before-id' });

      expect(repository.updateSortKey).toHaveBeenCalledWith(TASK_ID, 1500);
    });

    it('chỉ có after -> sortKey mới = after + GAP', async () => {
      const { service, repository } = createService();
      mockFindByIdFrom(repository, {
        [TASK_ID]: createTaskRecord({ sortKey: 1500 }),
        'after-id': createTaskRecord({ id: 'after-id', sortKey: 1000 }),
      });

      await service.reorder(OWNER_ID, TASK_ID, { afterTaskId: 'after-id' });

      expect(repository.updateSortKey).toHaveBeenCalledWith(TASK_ID, 2000);
    });

    it('chỉ có before -> sortKey mới = before - GAP', async () => {
      const { service, repository } = createService();
      mockFindByIdFrom(repository, {
        [TASK_ID]: createTaskRecord({ sortKey: 1500 }),
        'before-id': createTaskRecord({ id: 'before-id', sortKey: 2000 }),
      });

      await service.reorder(OWNER_ID, TASK_ID, { beforeTaskId: 'before-id' });

      expect(repository.updateSortKey).toHaveBeenCalledWith(TASK_ID, 1000);
    });

    it('afterTaskId không tồn tại -> BadRequestException, không gọi updateSortKey', async () => {
      const { service, repository } = createService();
      mockFindByIdFrom(repository, { [TASK_ID]: createTaskRecord({ sortKey: 1500 }) });

      await expect(
        service.reorder(OWNER_ID, TASK_ID, { afterTaskId: 'khong-ton-tai' }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.updateSortKey).not.toHaveBeenCalled();
    });

    it('afterTaskId thuộc user khác -> BadRequestException', async () => {
      const { service, repository } = createService();
      mockFindByIdFrom(repository, {
        [TASK_ID]: createTaskRecord({ sortKey: 1500 }),
        'after-id': createTaskRecord({ id: 'after-id', userId: OTHER_USER_ID, sortKey: 1000 }),
      });

      await expect(
        service.reorder(OWNER_ID, TASK_ID, { afterTaskId: 'after-id' }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.updateSortKey).not.toHaveBeenCalled();
    });

    it('task đang kéo không tồn tại -> TaskNotFoundException', async () => {
      const { service, repository } = createService();
      vi.mocked(repository.findById).mockResolvedValue(null);

      await expect(service.reorder(OWNER_ID, TASK_ID, {})).rejects.toThrow(TaskNotFoundException);
    });

    it('task đang kéo thuộc user khác -> TaskForbiddenException', async () => {
      const { service, repository } = createService();
      vi.mocked(repository.findById).mockResolvedValue(createTaskRecord({ userId: OTHER_USER_ID }));

      await expect(service.reorder(OWNER_ID, TASK_ID, {})).rejects.toThrow(TaskForbiddenException);
    });
  });

  describe('list', () => {
    it('forward status filter xuống repository, map toàn bộ kết quả', async () => {
      const { service, repository } = createService();

      const result = await service.list(OWNER_ID, 'open');

      expect(repository.findManyByUser).toHaveBeenCalledWith(OWNER_ID, 'open');
      expect(result).toHaveLength(1);
    });
  });

  describe('getById', () => {
    it('task không tồn tại -> TaskNotFoundException', async () => {
      const { service, repository } = createService();
      vi.mocked(repository.findById).mockResolvedValue(null);

      await expect(service.getById(OWNER_ID, TASK_ID)).rejects.toThrow(TaskNotFoundException);
    });

    it('task thuộc user khác -> TaskForbiddenException', async () => {
      const { service, repository } = createService();
      vi.mocked(repository.findById).mockResolvedValue(createTaskRecord({ userId: OTHER_USER_ID }));

      await expect(service.getById(OWNER_ID, TASK_ID)).rejects.toThrow(TaskForbiddenException);
    });

    it('task thuộc đúng user -> trả về TaskResult', async () => {
      const { service } = createService();

      const result = await service.getById(OWNER_ID, TASK_ID);

      expect(result.id).toBe(TASK_ID);
    });

    it('dueDate serialize đúng dạng YYYY-MM-DD, không có phần giờ', async () => {
      const { service, repository } = createService();
      vi.mocked(repository.findById).mockResolvedValue(
        createTaskRecord({ dueDate: new Date('2026-11-20T00:00:00.000Z') }),
      );

      const result = await service.getById(OWNER_ID, TASK_ID);

      expect(result.dueDate).toBe('2026-11-20');
    });

    it('không có dueDate -> trả về null', async () => {
      const { service } = createService();

      const result = await service.getById(OWNER_ID, TASK_ID);

      expect(result.dueDate).toBeNull();
    });
  });

  describe('update', () => {
    it('gửi title+description -> chỉ gọi updateDetails, không gọi updateStatus', async () => {
      const { service, repository } = createService();

      await service.update(OWNER_ID, TASK_ID, { title: 'Mua sữa đậu nành', description: null });

      expect(repository.updateDetails).toHaveBeenCalledWith(TASK_ID, {
        title: 'Mua sữa đậu nành',
        description: null,
        categoryId: null,
        dueDate: null,
        priority: 'medium',
      });
      expect(repository.updateStatus).not.toHaveBeenCalled();
    });

    it('gửi status -> chỉ gọi updateStatus, không gọi updateDetails', async () => {
      const { service, repository } = createService();

      const result = await service.update(OWNER_ID, TASK_ID, { status: 'done' });

      expect(repository.updateStatus).toHaveBeenCalledWith(TASK_ID, 'done');
      expect(repository.updateDetails).not.toHaveBeenCalled();
      expect(result.status).toBe('done');
    });

    it('gửi categoryId hợp lệ -> updateDetails nhận đúng categoryId mới', async () => {
      const { service, repository } = createService();

      await service.update(OWNER_ID, TASK_ID, { title: 'Mua sữa', categoryId: 'category-id-1' });

      expect(repository.updateDetails).toHaveBeenCalledWith(TASK_ID, {
        title: 'Mua sữa',
        description: 'Mua sữa không đường',
        categoryId: 'category-id-1',
        dueDate: null,
        priority: 'medium',
      });
    });

    it('gửi categoryId không hợp lệ -> BadRequestException, không gọi updateDetails', async () => {
      const { service, repository, categoryService } = createService();
      vi.mocked(categoryService.findOwnedOrNull).mockResolvedValue(null);

      await expect(
        service.update(OWNER_ID, TASK_ID, { title: 'Mua sữa', categoryId: 'category-khong-ton-tai' }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.updateDetails).not.toHaveBeenCalled();
    });

    it('gửi categoryId: null tường minh -> bỏ danh mục, KHÔNG validate (null hợp lệ luôn)', async () => {
      const { service, repository, categoryService } = createService();

      await service.update(OWNER_ID, TASK_ID, { title: 'Mua sữa', categoryId: null });

      expect(categoryService.findOwnedOrNull).not.toHaveBeenCalled();
      expect(repository.updateDetails).toHaveBeenCalledWith(TASK_ID, {
        title: 'Mua sữa',
        description: 'Mua sữa không đường',
        categoryId: null,
        dueDate: null,
        priority: 'medium',
      });
    });

    // DTO thật do ValidationPipe tạo là instance class — với target ES2023,
    // field không gửi vẫn là own property `undefined`. Dùng plainToInstance
    // để tái hiện đúng (regression: toggle status từng xoá mất description).
    describe('với DTO là instance qua class-transformer', () => {
      function toDto(body: object): UpdateTaskDto {
        return plainToInstance(UpdateTaskDto, body);
      }

      it('chỉ gửi status -> không gọi updateDetails, giữ nguyên description', async () => {
        const { service, repository } = createService();

        await service.update(OWNER_ID, TASK_ID, toDto({ status: 'done' }));

        expect(repository.updateDetails).not.toHaveBeenCalled();
        expect(repository.updateStatus).toHaveBeenCalledWith(TASK_ID, 'done');
      });

      it('chỉ gửi title -> giữ nguyên description hiện có', async () => {
        const { service, repository } = createService();

        await service.update(OWNER_ID, TASK_ID, toDto({ title: 'Mua sữa đậu nành' }));

        expect(repository.updateDetails).toHaveBeenCalledWith(TASK_ID, {
          title: 'Mua sữa đậu nành',
          description: 'Mua sữa không đường',
          categoryId: null,
          dueDate: null,
          priority: 'medium',
        });
      });

      it('gửi description: null tường minh -> xoá mô tả', async () => {
        const { service, repository } = createService();

        await service.update(OWNER_ID, TASK_ID, toDto({ title: 'Mua sữa', description: null }));

        expect(repository.updateDetails).toHaveBeenCalledWith(TASK_ID, {
          title: 'Mua sữa',
          description: null,
          categoryId: null,
          dueDate: null,
          priority: 'medium',
        });
      });

      it('gửi title: null -> coi như không gửi title, không ghi null vào DB', async () => {
        const { service, repository } = createService();

        await service.update(OWNER_ID, TASK_ID, toDto({ title: null }));

        expect(repository.updateDetails).not.toHaveBeenCalled();
      });
    });

    it('gửi dueDate mới -> updateDetails nhận đúng Date mới', async () => {
      const { service, repository } = createService();

      await service.update(OWNER_ID, TASK_ID, { title: 'Mua sữa', dueDate: '2026-11-20' });

      expect(repository.updateDetails).toHaveBeenCalledWith(TASK_ID, {
        title: 'Mua sữa',
        description: 'Mua sữa không đường',
        categoryId: null,
        dueDate: new Date('2026-11-20'),
        priority: 'medium',
      });
    });

    it('gửi dueDate: null tường minh -> xóa hạn', async () => {
      const { service, repository } = createService();
      vi.mocked(repository.findById).mockResolvedValue(createTaskRecord({ dueDate: new Date('2026-11-20') }));

      await service.update(OWNER_ID, TASK_ID, { title: 'Mua sữa', dueDate: null });

      expect(repository.updateDetails).toHaveBeenCalledWith(TASK_ID, {
        title: 'Mua sữa',
        description: 'Mua sữa không đường',
        categoryId: null,
        dueDate: null,
        priority: 'medium',
      });
    });

    it('không gửi dueDate -> giữ nguyên hạn hiện có', async () => {
      const { service, repository } = createService();
      const existingDueDate = new Date('2026-11-20');
      vi.mocked(repository.findById).mockResolvedValue(createTaskRecord({ dueDate: existingDueDate }));

      await service.update(OWNER_ID, TASK_ID, { title: 'Mua sữa đậu nành' });

      expect(repository.updateDetails).toHaveBeenCalledWith(TASK_ID, {
        title: 'Mua sữa đậu nành',
        description: 'Mua sữa không đường',
        categoryId: null,
        dueDate: existingDueDate,
        priority: 'medium',
      });
    });

    it('gửi priority mới -> updateDetails nhận đúng priority mới', async () => {
      const { service, repository } = createService();

      await service.update(OWNER_ID, TASK_ID, { title: 'Mua sữa', priority: 'high' });

      expect(repository.updateDetails).toHaveBeenCalledWith(TASK_ID, {
        title: 'Mua sữa',
        description: 'Mua sữa không đường',
        categoryId: null,
        dueDate: null,
        priority: 'high',
      });
    });

    it('không gửi priority -> giữ nguyên priority hiện có', async () => {
      const { service, repository } = createService();
      vi.mocked(repository.findById).mockResolvedValue(createTaskRecord({ priority: 'low' }));

      await service.update(OWNER_ID, TASK_ID, { title: 'Mua sữa đậu nành' });

      expect(repository.updateDetails).toHaveBeenCalledWith(TASK_ID, {
        title: 'Mua sữa đậu nành',
        description: 'Mua sữa không đường',
        categoryId: null,
        dueDate: null,
        priority: 'low',
      });
    });

    it('task không tồn tại -> TaskNotFoundException, không gọi repository update nào', async () => {
      const { service, repository } = createService();
      vi.mocked(repository.findById).mockResolvedValue(null);

      await expect(service.update(OWNER_ID, TASK_ID, { status: 'done' })).rejects.toThrow(
        TaskNotFoundException,
      );
      expect(repository.updateStatus).not.toHaveBeenCalled();
    });

    it('task thuộc user khác -> TaskForbiddenException', async () => {
      const { service, repository } = createService();
      vi.mocked(repository.findById).mockResolvedValue(createTaskRecord({ userId: OTHER_USER_ID }));

      await expect(service.update(OWNER_ID, TASK_ID, { status: 'done' })).rejects.toThrow(
        TaskForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('task không tồn tại -> TaskNotFoundException, không gọi delete', async () => {
      const { service, repository } = createService();
      vi.mocked(repository.findById).mockResolvedValue(null);

      await expect(service.remove(OWNER_ID, TASK_ID)).rejects.toThrow(TaskNotFoundException);
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('task thuộc user khác -> TaskForbiddenException, không gọi delete', async () => {
      const { service, repository } = createService();
      vi.mocked(repository.findById).mockResolvedValue(createTaskRecord({ userId: OTHER_USER_ID }));

      await expect(service.remove(OWNER_ID, TASK_ID)).rejects.toThrow(TaskForbiddenException);
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('task thuộc đúng user -> gọi delete đúng id', async () => {
      const { service, repository } = createService();

      await service.remove(OWNER_ID, TASK_ID);

      expect(repository.delete).toHaveBeenCalledWith(TASK_ID);
    });
  });
});
