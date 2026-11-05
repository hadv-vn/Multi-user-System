import type { AccountStatus } from '@/lib/session/authenticated-user.types';

export interface AccountStatusIndicatorProps {
  status: AccountStatus;
}

const STATUS_LABEL: Record<AccountStatus, string> = {
  ACTIVE: 'Hoạt động',
  LOCKED: 'Đã khóa',
  PENDING_VERIFICATION: 'Chưa xác thực email',
  DEACTIVATED: 'Đã vô hiệu hóa',
};

const STATUS_DOT_CLASS: Record<AccountStatus, string> = {
  ACTIVE: 'bg-neon-success',
  LOCKED: 'bg-neon-danger',
  PENDING_VERIFICATION: 'bg-neon-warning',
  DEACTIVATED: 'bg-slate-500',
};

export function AccountStatusIndicator({ status }: AccountStatusIndicatorProps) {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${STATUS_DOT_CLASS[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}
