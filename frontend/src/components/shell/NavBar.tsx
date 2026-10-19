import type { AuthenticatedUser } from '@/lib/session/authenticated-user.types';
import { UserMenu } from './UserMenu';

export interface NavBarProps {
  user: AuthenticatedUser;
  onLogout: () => void;
}

export function NavBar({ user, onLogout }: NavBarProps) {
  return (
    <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
      <span className="font-heading text-lg font-semibold tracking-wide text-slate-200">
        Multi-User System
      </span>
      <UserMenu user={user} onLogout={onLogout} />
    </header>
  );
}
