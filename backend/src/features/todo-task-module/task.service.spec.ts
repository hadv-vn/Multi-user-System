/* eslint-disable @typescript-eslint/unbound-method --
 * Rule báo sai trên idiom chuẩn của Vitest mocking: tham chiếu trực tiếp 1
 * method của object mock (vd `expect(mocks.x.method).toHaveBeenCalledWith(...)`,
 * `vi.mocked(mocks.x.method)`) để assert — các method này là `vi.fn()`
 * không dùng `this`, không có rủi ro mất ngữ cảnh `this` thật như rule giả định. */
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
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createService(): { service: TaskService; repository: TaskRepository } {
  const repository: TaskRepository = {
    findById: vi.fn().mockResolvedValue(createTaskRecord()),
    findManyByUser: vi.fn().mockResolvedValue([createTaskRecord()]),
    create: vi.fn().mockResolvedValue(createTaskRecord()),
    updateDetails: vi.fn().mockResolvedValue(createTaskRecord()),
    updateStatus: vi.fn().mockResolvedValue(createTaskRecord({ status: 'done' })),
    delete: vi.fn().mockResolvedValue(undefined),
  };

  const service = new TaskService(repository);
  return { service, repository };
}

describe('TaskService', () => {
  describe('create', () => {
    it('tạo task cho đúng userId, trả về TaskResult không có userId', async () => {
      const { service, repository } = createService();

      const result = await service.create(OWNER_ID, { title: 'Mua sữa', description: 'Mua sữa không đường' });

      expect(repository.create).toHaveBeenCalledWith(OWNER_ID, {
        title: 'Mua sữa',
        description: 'Mua sữa không đường',
      });
      expect(result).not.toHaveProperty('userId');
      expect(result.id).toBe(TASK_ID);
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
  });

  describe('update', () => {
    it('gửi title+description -> chỉ gọi updateDetails, không gọi updateStatus', async () => {
      const { service, repository } = createService();

      await service.update(OWNER_ID, TASK_ID, { title: 'Mua sữa đậu nành', description: null });

      expect(repository.updateDetails).toHaveBeenCalledWith(TASK_ID, {
        title: 'Mua sữa đậu nành',
        description: null,
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
