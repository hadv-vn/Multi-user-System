export interface AccountUserRecord {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  status: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
