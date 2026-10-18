/* eslint-disable @typescript-eslint/unbound-method --
 * Rule báo sai trên idiom chuẩn của Vitest mocking: tham chiếu trực tiếp 1
 * method của object mock (vd `expect(mocks.x.method).toHaveBeenCalledWith(...)`,
 * `vi.mocked(mocks.x.method)`) để assert — các method này là `vi.fn()`
 * không dùng `this`, không có rủi ro mất ngữ cảnh `this` thật như rule giả định. */
import type { CurrentRoleReader } from './current-role-reader.interface.js';
import { UnauthenticatedException } from './exceptions/unauthenticated.exception.js';
import type { SessionRecord, SessionRepository } from './session-repository.interface.js';
import { SessionService } from './session.service.js';
import type { UserStatusReader } from './user-status-reader.interface.js';

function createSessionRecord(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: 'session-id-1',
    userId: 'user-id-1',
    roleSnapshot: 'USER',
    createdAt: new Date('2099-01-01T00:00:00.000Z'),
    expiresAt: new Date('2099-01-08T00:00:00.000Z'),
    revokedAt: null,
    ...overrides,
  };
}

interface Mocks {
  sessionRepository: SessionRepository;
  currentRoleReader: CurrentRoleReader;
  userStatusReader: UserStatusReader;
}

function createService(): { service: SessionService; mocks: Mocks } {
  const mocks: Mocks = {
    sessionRepository: {
      create: vi.fn(),
      findById: vi.fn(),
      revokeById: vi.fn(),
      revokeAllActiveForUser: vi.fn(),
    },
    currentRoleReader: {
      getCurrentRoleName: vi.fn(),
    },
    userStatusReader: {
      getStatus: vi.fn(),
    },
  };

  const service = new SessionService(
    mocks.sessionRepository,
    mocks.currentRoleReader,
    mocks.userStatusReader,
  );

  return { service, mocks };
}

describe('SessionService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createSession', () => {
    it('snapshot ĐÚNG role hiện tại đọc từ ICurrentRoleReader vào session mới tạo', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.currentRoleReader.getCurrentRoleName).mockResolvedValue('ADMIN');
      const createdRecord = createSessionRecord({ roleSnapshot: 'ADMIN' });
      vi.mocked(mocks.sessionRepository.create).mockResolvedValue(createdRecord);

      const result = await service.createSession('user-id-1');

      expect(mocks.currentRoleReader.getCurrentRoleName).toHaveBeenCalledWith('user-id-1');
      expect(mocks.sessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-id-1', roleSnapshot: 'ADMIN' }),
      );
      expect(result).toEqual(createdRecord);
    });

    it('expiresAt = thời điểm tạo + 7 ngày (C-7)', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-01T10:00:00.000Z'));

      const { service, mocks } = createService();
      vi.mocked(mocks.currentRoleReader.getCurrentRoleName).mockResolvedValue('USER');
      vi.mocked(mocks.sessionRepository.create).mockImplementation((record) =>
        Promise.resolve({ ...record, createdAt: new Date(), revokedAt: null }),
      );

      await service.createSession('user-id-1');

      const callArg = vi.mocked(mocks.sessionRepository.create).mock.calls[0][0];
      expect(callArg.expiresAt.toISOString()).toBe('2026-03-08T10:00:00.000Z');
    });

    it('sinh id ngẫu nhiên, khác nhau giữa 2 lần tạo session liên tiếp', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.currentRoleReader.getCurrentRoleName).mockResolvedValue('USER');
      vi.mocked(mocks.sessionRepository.create).mockImplementation((record) =>
        Promise.resolve({ ...record, createdAt: new Date(), revokedAt: null }),
      );

      await service.createSession('user-id-1');
      await service.createSession('user-id-1');

      const firstId = vi.mocked(mocks.sessionRepository.create).mock.calls[0][0].id;
      const secondId = vi.mocked(mocks.sessionRepository.create).mock.calls[1][0].id;
      expect(firstId).not.toBe(secondId);
      expect(firstId.length).toBeGreaterThan(0);
    });

    it('edge case: user không có role nào gán → ném lỗi nội bộ, KHÔNG tạo session', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.currentRoleReader.getCurrentRoleName).mockResolvedValue(null);

      await expect(service.createSession('user-without-role')).rejects.toThrow(
        /không có role nào được gán/,
      );
      expect(mocks.sessionRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getActiveSessionContext', () => {
    it('trả đúng AuthenticatedUserContext khi session hợp lệ và user ACTIVE', async () => {
      const { service, mocks } = createService();
      const record = createSessionRecord();
      vi.mocked(mocks.sessionRepository.findById).mockResolvedValue(record);
      vi.mocked(mocks.userStatusReader.getStatus).mockResolvedValue('ACTIVE');

      const context = await service.getActiveSessionContext('session-id-1');

      expect(context).toEqual({
        userId: record.userId,
        role: record.roleSnapshot,
        sessionId: record.id,
      });
    });

    it('session không tồn tại → UnauthenticatedException', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.sessionRepository.findById).mockResolvedValue(null);

      await expect(service.getActiveSessionContext('missing')).rejects.toBeInstanceOf(
        UnauthenticatedException,
      );
    });

    it('session đã bị revoke → UnauthenticatedException', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.sessionRepository.findById).mockResolvedValue(
        createSessionRecord({ revokedAt: new Date('2026-01-02T00:00:00.000Z') }),
      );

      await expect(service.getActiveSessionContext('session-id-1')).rejects.toBeInstanceOf(
        UnauthenticatedException,
      );
    });

    it('session đã hết hạn → UnauthenticatedException', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-01T00:00:00.000Z'));
      const { service, mocks } = createService();
      vi.mocked(mocks.sessionRepository.findById).mockResolvedValue(
        createSessionRecord({ expiresAt: new Date('2026-01-08T00:00:00.000Z') }),
      );

      await expect(service.getActiveSessionContext('session-id-1')).rejects.toBeInstanceOf(
        UnauthenticatedException,
      );
    });

    it('user không ACTIVE (bị khóa/disabled) → UnauthenticatedException', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.sessionRepository.findById).mockResolvedValue(createSessionRecord());
      vi.mocked(mocks.userStatusReader.getStatus).mockResolvedValue('LOCKED');

      await expect(service.getActiveSessionContext('session-id-1')).rejects.toBeInstanceOf(
        UnauthenticatedException,
      );
    });

    it('user không còn tồn tại (status null) → UnauthenticatedException', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.sessionRepository.findById).mockResolvedValue(createSessionRecord());
      vi.mocked(mocks.userStatusReader.getStatus).mockResolvedValue(null);

      await expect(service.getActiveSessionContext('session-id-1')).rejects.toBeInstanceOf(
        UnauthenticatedException,
      );
    });

    it('role trong context lấy từ roleSnapshot, KHÔNG join lại qua ICurrentRoleReader (C-11)', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.sessionRepository.findById).mockResolvedValue(
        createSessionRecord({ roleSnapshot: 'ADMIN' }),
      );
      vi.mocked(mocks.userStatusReader.getStatus).mockResolvedValue('ACTIVE');

      const context = await service.getActiveSessionContext('session-id-1');

      expect(context.role).toBe('ADMIN');
      expect(mocks.currentRoleReader.getCurrentRoleName).not.toHaveBeenCalled();
    });
  });

  describe('revokeSession', () => {
    it('gọi sessionRepository.revokeById với đúng sessionId', async () => {
      const { service, mocks } = createService();
      await service.revokeSession('session-id-1');
      expect(mocks.sessionRepository.revokeById).toHaveBeenCalledWith('session-id-1');
    });
  });

  describe('revokeAllSessionsForUser', () => {
    it('gọi sessionRepository.revokeAllActiveForUser với đúng userId (không có tx)', async () => {
      const { service, mocks } = createService();
      await service.revokeAllSessionsForUser('user-id-1');
      expect(mocks.sessionRepository.revokeAllActiveForUser).toHaveBeenCalledWith(
        'user-id-1',
        undefined,
      );
    });

    it('chuyển tiếp tham số tx (optional) cho sessionRepository — Phase 2 revoke trong cùng transaction', async () => {
      const { service, mocks } = createService();
      const fakeTx = {} as never;
      await service.revokeAllSessionsForUser('user-id-1', fakeTx);
      expect(mocks.sessionRepository.revokeAllActiveForUser).toHaveBeenCalledWith(
        'user-id-1',
        fakeTx,
      );
    });
  });
});
