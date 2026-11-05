'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { RoleBadge } from '@/components/ui/RoleBadge';
import { StatusResultCard } from '@/components/ui/StatusResultCard';
import type { AdminUserDetail } from '@/lib/admin/admin-api';
import { useAdminUserDetail } from '../hooks/use-admin-user-detail';
import type { LockUnlockAction } from '../hooks/use-lock-unlock-user';
import { AccountStatusIndicator } from './AccountStatusIndicator';
import { ChangeRoleDialog } from './ChangeRoleDialog';
import { LockUnlockConfirmDialog } from './LockUnlockConfirmDialog';
import { UserAccountInfoCard } from './UserAccountInfoCard';
import { UserSecurityCard } from './UserSecurityCard';

export interface AdminUserDetailPageProps {
  userId: string;
}

const USERS_LIST_PATH = '/admin/users';
const ACTION_BUTTON_CLASS =
  'rounded-lg border border-white/15 px-3 py-1.5 text-sm text-slate-200 transition-colors hover:border-neon-cyan/50 hover:shadow-[0_0_12px_rgba(34,211,238,0.25)] disabled:cursor-not-allowed disabled:opacity-40';

export function AdminUserDetailPage({ userId }: AdminUserDetailPageProps) {
  const router = useRouter();
  const { viewState, retry, refresh } = useAdminUserDetail(userId);
  const [lockUnlockAction, setLockUnlockAction] = useState<LockUnlockAction | null>(null);
  const [isChangeRoleOpen, setIsChangeRoleOpen] = useState(false);

  const backToList = { label: 'Về danh sách người dùng', onClick: () => router.push(USERS_LIST_PATH) };

  if (viewState.kind === 'loading') {
    return <StatusResultCard icon="loading" title="Đang tải" description="Đang tải thông tin người dùng…" />;
  }
  if (viewState.kind === 'forbidden') {
    return (
      <StatusResultCard
        icon="error"
        title="Không đủ quyền truy cập"
        description="Bạn không có quyền truy cập trang này."
        primaryAction={{ label: 'Về trang hồ sơ cá nhân', onClick: () => router.push('/profile') }}
      />
    );
  }
  if (viewState.kind === 'not-found') {
    return (
      <StatusResultCard
        icon="warning"
        title="Không tìm thấy người dùng"
        description="Tài khoản này không tồn tại hoặc đường dẫn không hợp lệ."
        primaryAction={backToList}
      />
    );
  }
  if (viewState.kind === 'error') {
    return (
      <StatusResultCard
        icon="error"
        title="Không thể tải thông tin người dùng"
        description={viewState.message}
        primaryAction={{ label: 'Thử lại', onClick: retry }}
        secondaryAction={backToList}
      />
    );
  }

  const user = viewState.user;

  return (
    <div className="flex flex-col gap-4">
      <Link href={USERS_LIST_PATH} className="w-fit text-sm text-slate-400 transition-colors hover:text-neon-cyan">
        ← Quay lại danh sách
      </Link>

      <UserDetailHeader
        user={user}
        onRequestLockUnlock={() => setLockUnlockAction(user.status === 'LOCKED' ? 'unlock' : 'lock')}
        onRequestChangeRole={() => setIsChangeRoleOpen(true)}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <UserAccountInfoCard user={user} />
        <UserSecurityCard user={user} />
      </div>

      <LockUnlockConfirmDialog
        isOpen={lockUnlockAction !== null}
        userId={user.id}
        email={user.email}
        action={lockUnlockAction ?? 'lock'}
        onCancel={() => setLockUnlockAction(null)}
        onSuccess={() => {
          setLockUnlockAction(null);
          // Khóa thu hồi mọi phiên → tải lại để số phiên/trạng thái khớp server.
          refresh();
        }}
      />

      <ChangeRoleDialog
        isOpen={isChangeRoleOpen}
        userId={user.id}
        email={user.email}
        currentRole={user.role}
        onCancel={() => setIsChangeRoleOpen(false)}
        onSuccess={() => {
          setIsChangeRoleOpen(false);
          refresh();
        }}
      />
    </div>
  );
}

interface UserDetailHeaderProps {
  user: AdminUserDetail;
  onRequestLockUnlock: () => void;
  onRequestChangeRole: () => void;
}

function UserDetailHeader({ user, onRequestLockUnlock, onRequestChangeRole }: UserDetailHeaderProps) {
  const isDeactivated = user.status === 'DEACTIVATED';

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-xl font-semibold text-slate-100">{user.email}</h1>
        <RoleBadge role={user.role} />
        <span className="text-sm text-slate-300">
          <AccountStatusIndicator status={user.status} />
        </span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isDeactivated}
          onClick={onRequestLockUnlock}
          title={isDeactivated ? 'Tài khoản đã vô hiệu hóa, không áp dụng khóa/mở khóa.' : undefined}
          className={ACTION_BUTTON_CLASS}
        >
          {user.status === 'LOCKED' ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
        </button>
        <button type="button" disabled={isDeactivated} onClick={onRequestChangeRole} className={ACTION_BUTTON_CLASS}>
          Đổi vai trò
        </button>
      </div>
    </div>
  );
}
