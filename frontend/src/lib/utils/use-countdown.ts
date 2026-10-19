'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseCountdownResult {
  secondsRemaining: number;
  isRunning: boolean;
  start: (totalSeconds: number) => void;
}

export function useCountdown(): UseCountdownResult {
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearRunningInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(
    (totalSeconds: number) => {
      clearRunningInterval();
      setSecondsRemaining(totalSeconds);
      intervalRef.current = setInterval(() => {
        setSecondsRemaining((current) => {
          if (current <= 1) {
            clearRunningInterval();
            return 0;
          }
          return current - 1;
        });
      }, 1000);
    },
    [clearRunningInterval],
  );

  useEffect(() => clearRunningInterval, [clearRunningInterval]);

  return { secondsRemaining, isRunning: secondsRemaining > 0, start };
}
