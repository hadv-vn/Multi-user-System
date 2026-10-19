'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useSessionBootstrap } from '@/features/session/hooks/use-session-bootstrap';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { authApi } from '@/lib/auth/auth-api';
import { useSession } from '@/lib/session/use-session';
import { NavBar } from './NavBar';
import { ShellSkeleton } from './ShellSkeleton';
import { Sidebar } from './Sidebar';

export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const { currentUser, clearSession } = useSession();
  const { isInitializing, bootstrapError, retry } = useSessionBootstrap();

  useEffect(() => {
    if (!isInitializing && bootstrapError === null && currentUser === null) {
      router.replace('/login?reason=session_required');
    }
  }, [isInitializing, bootstrapError, currentUser, router]);

  async function handleLogout(): Promise<void> {
    try {
      await authApi.logout();
    } finally {
      clearSession();
      router.push('/login');
    }
  }

  if (isInitializing) {
    return <ShellSkeleton />;
  }

  if (bootstrapError !== null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <ErrorBanner message={bootstrapError} />
        <SecondaryButton onClick={retry} className="max-w-xs">
          Thử lại
        </SecondaryButton>
      </div>
    );
  }

  if (currentUser === null) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar user={currentUser} onLogout={() => void handleLogout()} />
      <div className="flex flex-1">
        <Sidebar role={currentUser.role} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
