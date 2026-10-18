export const ROLE_NAME = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;

export type RoleName = (typeof ROLE_NAME)[keyof typeof ROLE_NAME];
