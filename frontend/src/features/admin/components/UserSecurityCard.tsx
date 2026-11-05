import { GlassCard } from '@/components/ui/GlassCard';
import type { AdminUserDetail } from '@/lib/admin/admin-api';
import { formatDateTime } from '@/lib/utils/format-date-time';
import { UserDetailField } from './UserDetailField';

export interface UserSecurityCardProps {
  user: AdminUserDetail;
}

export function UserSecurityCard({ user }: UserSecurityCardProps) {
  const hasFailedAttempts = user.failedLoginAttempts > 0;

  return (
    <GlassCard className="p-6">
      <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-neon-cyan">
        Bảo mật &amp; phiên đăng nhập
      </h2>
      <dl>
        <UserDetailField label="Đăng nhập sai liên tiếp">
          <span className={hasFailedAttempts ? 'text-neon-warning' : undefined}>
            {user.failedLoginAttempts}
          </span>
        </UserDetailField>
        <UserDetailField label="Khóa tạm đến">{formatDateTime(user.lockedUntil)}</UserDetailField>
        <UserDetailField label="Phiên đang hoạt động">{user.activeSessionCount}</UserDetailField>
        <UserDetailField label="Đăng nhập gần nhất">
          {formatDateTime(user.lastLoginAt, 'Chưa từng đăng nhập')}
        </UserDetailField>
      </dl>
    </GlassCard>
  );
}
