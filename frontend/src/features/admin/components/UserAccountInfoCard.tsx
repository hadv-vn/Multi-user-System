import { GlassCard } from '@/components/ui/GlassCard';
import type { AdminUserDetail } from '@/lib/admin/admin-api';
import { formatDateTime } from '@/lib/utils/format-date-time';
import { UserDetailField } from './UserDetailField';

export interface UserAccountInfoCardProps {
  user: AdminUserDetail;
}

export function UserAccountInfoCard({ user }: UserAccountInfoCardProps) {
  return (
    <GlassCard className="p-6">
      <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-neon-cyan">
        Thông tin tài khoản
      </h2>
      <dl>
        <UserDetailField label="Họ tên">
          {user.name ?? <span className="text-slate-500">Chưa đặt</span>}
        </UserDetailField>
        <UserDetailField label="Xác thực email">
          {formatDateTime(user.emailVerifiedAt, 'Chưa xác thực')}
        </UserDetailField>
        <UserDetailField label="Ngày tạo">{formatDateTime(user.createdAt)}</UserDetailField>
        <UserDetailField label="Cập nhật lần cuối">{formatDateTime(user.updatedAt)}</UserDetailField>
      </dl>
    </GlassCard>
  );
}
