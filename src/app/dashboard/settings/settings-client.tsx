'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, ShieldCheck, Database, RefreshCw } from 'lucide-react';

interface SettingsClientProps {
  mode: 'live' | 'demo';
  username: string;
}

export function SettingsClient({ mode, username }: SettingsClientProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1c1917] dark:text-[#f3f4f6]">
          Application Settings
        </h1>
        <p className="text-xs text-[#78716c] dark:text-[#9ca3af] mt-1">
          Review system parameters, verified institutional connection, and manage your local session
        </p>
      </div>

      {/* Security & System Information */}
      <div className="p-6 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[#1c1917] dark:text-[#f3f4f6] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Institutional Data Security & Governance</span>
          </h3>
          <p className="text-xs text-[#78716c] dark:text-[#9ca3af] mt-0.5">
            Read-only local runtime protecting student privacy and credential safety
          </p>
        </div>

        <div className="space-y-2 text-xs text-[#78716c] dark:text-[#9ca3af]">
          <div className="p-3 rounded-lg bg-[#f9f8f5] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35] flex items-center justify-between">
            <span className="font-medium text-[#1c1917] dark:text-[#f3f4f6]">Access Model</span>
            <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">Strictly Read-Only (Non-Mutating)</span>
          </div>
          <div className="p-3 rounded-lg bg-[#f9f8f5] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35] flex items-center justify-between">
            <span className="font-medium text-[#1c1917] dark:text-[#f3f4f6]">Credential Handling</span>
            <span className="font-mono text-[11px] text-[#1c1917] dark:text-[#f3f4f6]">Ephemeral Session Handshake Only (Zero Storage)</span>
          </div>
          <div className="p-3 rounded-lg bg-[#f9f8f5] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35] flex items-center justify-between">
            <span className="font-medium text-[#1c1917] dark:text-[#f3f4f6]">UI Appearance</span>
            <span className="font-mono text-[11px] text-[#1c1917] dark:text-[#f3f4f6]">Enforced Dark Theme (#141518, #1b1d22, #202227)</span>
          </div>
        </div>
      </div>

      {/* Session Management Card */}
      <div className="p-6 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[#1c1917] dark:text-[#f3f4f6] flex items-center gap-2">
            <Database className="w-4 h-4 text-stone-600 dark:text-stone-400" />
            <span>Active Session & Authentication</span>
          </h3>
          <p className="text-xs text-[#78716c] dark:text-[#9ca3af] mt-0.5">
            Manage your local cookie session and connection state
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-[#fdfcfb] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#1c1917] dark:text-[#f3f4f6]">
                Mode: <strong className="uppercase">{mode}</strong>
              </span>
              <span className="text-[#78716c] dark:text-[#9ca3af]">• User: {username}</span>
            </div>
            <p className="text-[#78716c] dark:text-[#9ca3af] mt-0.5">
              {mode === 'live'
                ? 'Authenticated via official TKMCE ETLAB handshake with encrypted session.'
                : 'Interactive demo environment with verified Semester 3 curriculum and timetable.'}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40 hover:bg-rose-100 flex items-center gap-1.5 shrink-0 transition-colors self-start sm:self-auto"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Creator Credit Footer */}
      <div className="pt-6 pb-2 text-center border-t border-[#e7e4de] dark:border-[#2a2d35]/60">
        <p className="text-[11px] font-medium text-stone-500 dark:text-stone-400 tracking-wide">
          Created by <span className="text-stone-700 dark:text-stone-300 font-semibold">Adwaith Krishna M H</span>
        </p>
      </div>
    </div>
  );
}
