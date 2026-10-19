'use client';

import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react';
import type { AuthenticatedUser } from './authenticated-user.types';

export interface SessionContextValue {
  currentUser: AuthenticatedUser | null;
  /** `true` cho tới khi `useSessionBootstrap` (features/session) xác minh phiên lần đầu. */
  isInitializing: boolean;
  setSession: (user: AuthenticatedUser) => void;
  clearSession: () => void;
  completeInitializing: () => void;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const completeInitializing = useCallback(() => setIsInitializing(false), []);

  const value = useMemo<SessionContextValue>(
    () => ({
      currentUser,
      isInitializing,
      setSession: setCurrentUser,
      clearSession: () => setCurrentUser(null),
      completeInitializing,
    }),
    [currentUser, isInitializing, completeInitializing],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
