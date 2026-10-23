'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AttendanceTargetContextType {
  target: number;
  setTarget: (target: number) => void;
}

const AttendanceTargetContext = createContext<AttendanceTargetContextType>({
  target: 75,
  setTarget: () => {},
});

export function AttendanceTargetProvider({
  initialTarget = 75,
  username = 'default',
  children,
}: {
  initialTarget?: number;
  username?: string;
  children: React.ReactNode;
}) {
  const [target, setTargetState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const storageKey = username ? `etlab_target_${username}` : 'etlab_target';
      const local = localStorage.getItem(storageKey) || localStorage.getItem('etlab_target');
      if (local) {
        const parsed = parseFloat(local);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
          return parsed;
        }
      }
    }
    return initialTarget > 0 && initialTarget <= 100 ? initialTarget : 75;
  });

  // Keep in sync with server API and localStorage
  const setTarget = useCallback(
    (newTarget: number) => {
      const valid = Math.min(100, Math.max(0.1, Math.round(newTarget * 10) / 10));
      setTargetState(valid);

      if (typeof window !== 'undefined') {
        const storageKey = username ? `etlab_target_${username}` : 'etlab_target';
        localStorage.setItem(storageKey, valid.toString());
        localStorage.setItem('etlab_target', valid.toString());

        // Send to server-side cookie endpoint
        fetch('/api/user/target', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: valid }),
        }).catch(() => {
          // Ignore network errors; local persistence is active
        });
      }
    },
    [username]
  );

  // Sync on client mount if server initialTarget was default but localStorage had saved preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storageKey = username ? `etlab_target_${username}` : 'etlab_target';
      const saved = localStorage.getItem(storageKey) || localStorage.getItem('etlab_target');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 100 && parsed !== target) {
          queueMicrotask(() => {
            setTargetState(parsed);
          });
          // Sync cookie as well
          fetch('/api/user/target', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target: parsed }),
          }).catch(() => {});
        }
      }
    }
  }, [username, target]);

  return (
    <AttendanceTargetContext.Provider value={{ target, setTarget }}>
      {children}
    </AttendanceTargetContext.Provider>
  );
}

export function useAttendanceTarget() {
  return useContext(AttendanceTargetContext);
}
