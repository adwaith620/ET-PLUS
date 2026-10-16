'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/theme-provider';
import {
  Sun,
  Moon,
  Laptop,
  LogOut,
  Check,
} from 'lucide-react';

interface SettingsClientProps {
  mode: 'live' | 'demo';
  username: string;
}

export function SettingsClient({ mode, username }: SettingsClientProps) {
  const { theme, setTheme } = useTheme();
  const [defaultTarget, setDefaultTarget] = useState<number>(75);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const router = useRouter();

  const handleSave = () => {
    localStorage.setItem('etlab_default_target', defaultTarget.toString());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

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
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Application Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Customize dashboard theme, target thresholds, and manage your local session
        </p>
      </div>

      {/* Theme Appearance Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Interface Appearance & Theme
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Select light, dark, or automatic system preference
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'light', label: 'Light', icon: Sun },
            { id: 'dark', label: 'Dark', icon: Moon },
            { id: 'system', label: 'System', icon: Laptop },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = theme === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTheme(item.id as typeof theme)}
                className={`p-4 rounded-xl border text-center flex flex-col items-center justify-center gap-2 transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Default Target Setting Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Default Attendance Target
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Set your initial target percentage when opening attendance calculators
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[75, 80, 85, 90].map((t) => (
            <button
              key={t}
              onClick={() => setDefaultTarget(t)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                defaultTarget === t
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {t}%
            </button>
          ))}
        </div>

        <div className="pt-2">
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-colors shadow-xs"
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Saved successfully!</span>
              </>
            ) : (
              <span>Save Target Preference</span>
            )}
          </button>
        </div>
      </div>

      {/* Session Management Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Active Session & Authentication
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your local cookie session and connection state
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Mode: <strong className="uppercase">{mode}</strong>
              </span>
              <span className="text-slate-400">• User: {username}</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5">
              {mode === 'live'
                ? 'Authenticated via official TKMCE ETLAB handshake with encrypted session.'
                : 'Interactive demo environment with local state.'}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 hover:bg-red-100 flex items-center gap-1.5 shrink-0 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
