'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { RoleBadge } from '@/components/ui/RoleBadge';
import type { AuthenticatedUser } from '@/lib/session/authenticated-user.types';

export interface UserMenuProps {
  user: AuthenticatedUser;
  onLogout: () => void;
}

export function UserMenu({ user, onLogout }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const displayName = user.name ?? user.email.split('@')[0];
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    function handlePointerDown(event: MouseEvent): void {
      if (menuRef.current?.contains(event.target as Node)) return;
      if (triggerRef.current?.contains(event.target as Node)) return;
      setIsOpen(false);
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-1.5 text-sm text-slate-200 hover:border-neon-cyan/40"
      >
        <span>{displayName}</span>
        <RoleBadge role={user.role} />
      </button>

      {isOpen ? (
        <div
          ref={menuRef}
          role="menu"
          className="absolute right-0 mt-2 w-48 rounded-xl border border-border-glass bg-surface-glass p-1.5 shadow-lg backdrop-blur-xl"
        >
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
          >
            Hồ sơ cá nhân
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neon-danger hover:bg-white/5"
          >
            Đăng xuất
          </button>
        </div>
      ) : null}
    </div>
  );
}
