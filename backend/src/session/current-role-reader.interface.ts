export interface CurrentRoleReader {
  /** Trả tên role hiện tại của user tại đúng thời điểm gọi (join user_roles/roles). */
  getCurrentRoleName(userId: string): Promise<string | null>;
}

export const CURRENT_ROLE_READER = Symbol('CurrentRoleReader');
