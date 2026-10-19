import type { UserRole } from '@/lib/session/authenticated-user.types';

export interface RoleBadgeProps {
  role: UserRole;
  className?: string;
}

const ROLE_CLASS: Record<UserRole, string> = {
  ADMIN: 'border-neon-violet/40 bg-neon-violet/10 text-neon-violet',
  USER: 'border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan',
};

export function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs ${ROLE_CLASS[role]} ${className}`}
    >
      {role}
    </span>
  );
}
