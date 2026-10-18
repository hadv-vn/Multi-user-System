/**
 * Interface tối giản để SessionModule tự kiểm tra trạng thái tài khoản mỗi
 * request (ADR-0001) mà KHÔNG phụ thuộc UserRepository đầy đủ của AuthModule
 * — tránh coupling chéo giữa 2 module, đúng ranh giới ở HLD.
 */
export interface UserStatusReader {
  getStatus(userId: string): Promise<string | null>;
}

export const USER_STATUS_READER = Symbol('UserStatusReader');
