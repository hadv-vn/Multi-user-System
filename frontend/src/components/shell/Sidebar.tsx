'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { UserRole } from '@/lib/session/authenticated-user.types';

export interface SidebarProps {
  role: UserRole;
}

interface SidebarItem {
  href: string;
  label: string;
  /** Mục chỉ hiện với các role này; bỏ trống = mọi role. */
  roles?: UserRole[];
  /** Mục sáng khi pathname bắt đầu bằng prefix này (vd trang con chi tiết). */
  activePrefix?: string;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { href: '/profile', label: 'Hồ sơ cá nhân' },
  { href: '/admin/users', label: 'Quản trị', roles: ['ADMIN'], activePrefix: '/admin/users' },
  // ToDo feature extension — thống kê task (chỉ số liệu tổng hợp).
  { href: '/admin/task-stats', label: 'Thống kê công việc', roles: ['ADMIN'] },
];

const LINK_CLASS = 'block rounded-lg px-3 py-2 text-sm transition-colors';
const ACTIVE_CLASS = 'bg-white/10 text-neon-cyan';
const INACTIVE_CLASS = 'text-slate-300 hover:bg-white/5';

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Điều hướng chính" className="w-56 border-r border-white/10 p-4">
      <ul className="flex flex-col gap-1">
        {SIDEBAR_ITEMS.filter((item) => !item.roles || item.roles.includes(role)).map((item) => {
          const isActive = item.activePrefix ? pathname.startsWith(item.activePrefix) : pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`${LINK_CLASS} ${isActive ? ACTIVE_CLASS : INACTIVE_CLASS}`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
