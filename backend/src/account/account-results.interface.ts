export interface AccountProfileResult {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
