'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { UserRole } from '@/lib/session/authenticated-user.types';

export interface SidebarProps {
  role: UserRole;
}

const LINK_CLASS = 'block rounded-lg px-3 py-2 text-sm transition-colors';
const ACTIVE_CLASS = 'bg-white/10 text-neon-cyan';
const INACTIVE_CLASS = 'text-slate-300 hover:bg-white/5';

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Điều hướng chính" className="w-56 border-r border-white/10 p-4">
      <ul className="flex flex-col gap-1">
        <li>
          <Link
            href="/profile"
            className={`${LINK_CLASS} ${pathname === '/profile' ? ACTIVE_CLASS : INACTIVE_CLASS}`}
          >
            Hồ sơ cá nhân
          </Link>
        </li>
        {role === 'ADMIN' ? (
          <li>
            <Link
              href="/admin/users"
              className={`${LINK_CLASS} ${
                pathname === '/admin/users' ? ACTIVE_CLASS : INACTIVE_CLASS
              }`}
            >
              Quản trị
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
