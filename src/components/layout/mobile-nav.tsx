'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  PieChart,
  CalendarDays,
  FileCheck2,
  FolderDown,
  Award,
  BellRing,
  User,
  Settings,
  LogOut,
  X,
  GraduationCap,
} from 'lucide-react';
import { StudentProfile } from '@/types';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: StudentProfile;
  mode?: 'live' | 'demo';
}

export function MobileNav({
  isOpen,
  onClose,
  profile,
  mode = 'demo',
}: MobileNavProps) {
  const pathname = usePathname();
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

  const navItems = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Attendance', href: '/dashboard/attendance', icon: PieChart },
    { label: 'Timetable', href: '/dashboard/timetable', icon: CalendarDays },
    { label: 'Assignments', href: '/dashboard/assignments', icon: FileCheck2 },
    { label: 'Study Materials', href: '/dashboard/materials', icon: FolderDown },
    { label: 'Marks & Results', href: '/dashboard/results', icon: Award },
    { label: 'Announcements', href: '/dashboard/announcements', icon: BellRing },
    { label: 'Profile', href: '/dashboard/profile', icon: User },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Bottom Quick-Access Bar (Always visible on mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-30 px-2 flex items-center justify-around">
        {[
          { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
          { label: 'Attendance', href: '/dashboard/attendance', icon: PieChart },
          { label: 'Timetable', href: '/dashboard/timetable', icon: CalendarDays },
          { label: 'Assignments', href: '/dashboard/assignments', icon: FileCheck2 },
          { label: 'Profile', href: '/dashboard/profile', icon: User },
        ].map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Slide-over Drawer for all pages on mobile */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in"
            onClick={onClose}
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-[80vw] bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-sm text-slate-900 dark:text-white">ETLAB TKMCE</span>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">{mode} Mode</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav list */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Drawer User Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="min-w-0 pr-2">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {profile?.name || 'Student'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {profile?.registerNo || 'TKMCE'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
