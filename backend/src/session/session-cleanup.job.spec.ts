/* eslint-disable @typescript-eslint/unbound-method --
 * Rule báo sai trên idiom chuẩn của Vitest mocking: tham chiếu trực tiếp 1
 * method của object mock (vd `expect(mocks.x.method).toHaveBeenCalledWith(...)`,
 * `vi.mocked(mocks.x.method)`) để assert — các method này là `vi.fn()`
 * không dùng `this`, không có rủi ro mất ngữ cảnh `this` thật như rule giả định. */
import type { SessionRepository } from './session-repository.interface.js';
import { SessionCleanupJob } from './session-cleanup.job.js';

function createJob(): { job: SessionCleanupJob; sessionRepository: SessionRepository } {
  const sessionRepository: SessionRepository = {
    create: vi.fn(),
    findById: vi.fn(),
    revokeById: vi.fn(),
    revokeAllActiveForUser: vi.fn(),
    deleteExpired: vi.fn(),
  };
  return { job: new SessionCleanupJob(sessionRepository), sessionRepository };
}

describe('SessionCleanupJob', () => {
  it('gọi deleteExpired với thời điểm hiện tại', async () => {
    const { job, sessionRepository } = createJob();
    vi.mocked(sessionRepository.deleteExpired).mockResolvedValue(3);

    await job.handleCleanup();

    expect(sessionRepository.deleteExpired).toHaveBeenCalledTimes(1);
    const calledWith = vi.mocked(sessionRepository.deleteExpired).mock.calls[0]?.[0];
    expect(calledWith).toBeInstanceOf(Date);
  });

  it('không throw khi không có session nào hết hạn', async () => {
    const { job, sessionRepository } = createJob();
    vi.mocked(sessionRepository.deleteExpired).mockResolvedValue(0);

    await expect(job.handleCleanup()).resolves.toBeUndefined();
  });
});
