import { summarizeTaskStatusCounts } from './task-status-summary.js';

describe('summarizeTaskStatusCounts', () => {
  it('không có nhóm nào → tổng 0, mọi trạng thái 0', () => {
    expect(summarizeTaskStatusCounts([])).toEqual({ total: 0, byStatus: { open: 0, done: 0 } });
  });

  it('cộng đúng theo trạng thái và tổng', () => {
    expect(
      summarizeTaskStatusCounts([
        { status: 'open', count: 3 },
        { status: 'done', count: 2 },
      ]),
    ).toEqual({ total: 5, byStatus: { open: 3, done: 2 } });
  });

  it('trạng thái lạ vẫn tính vào tổng nhưng không thêm khóa mới', () => {
    expect(
      summarizeTaskStatusCounts([
        { status: 'open', count: 1 },
        { status: 'archived', count: 4 },
      ]),
    ).toEqual({ total: 5, byStatus: { open: 1, done: 0 } });
  });
});
