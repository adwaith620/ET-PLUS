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
  ClipboardList,
  GraduationCap,
  BellRing,
  User,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { StudentProfile } from '@/types';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: StudentProfile;
  mode?: 'live' | 'demo';
  pendingAssignmentsCount?: number;
}

export function MobileNav({
  isOpen,
  onClose,
  profile,
  mode = 'demo',
  pendingAssignmentsCount = 0,
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
    {
      label: 'Assignments',
      href: '/dashboard/assignments',
      icon: FileCheck2,
      badge: pendingAssignmentsCount > 0 ? `${pendingAssignmentsCount} Due` : undefined,
    },
    { label: 'Study Materials', href: '/dashboard/materials', icon: FolderDown },
    { label: 'Results', href: '/dashboard/results', icon: ClipboardList },
    { label: 'Announcements', href: '/dashboard/announcements', icon: BellRing },
    { label: 'Profile', href: '/dashboard/profile', icon: User },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Bottom Quick-Access Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white/95 dark:bg-[#18191d]/95 backdrop-blur-md border-t border-[#e7e4de] dark:border-[#26282f] z-30 px-2 flex items-center justify-around">
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
              className={`flex flex-col items-center justify-center w-14 py-1 rounded transition-colors ${
                isActive
                  ? 'text-stone-900 dark:text-white font-semibold'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              <Icon className="w-4 h-4" />
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
            className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-in fade-in"
            onClick={onClose}
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-[80vw] bg-white dark:bg-[#18191d] h-full shadow-xl flex flex-col z-10 animate-in slide-in-from-left duration-150">
            {/* Header */}
            <div className="p-4 border-b border-[#e7e4de] dark:border-[#26282f] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-[#1c1917] dark:bg-stone-100 text-white dark:text-stone-900 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-xs text-stone-900 dark:text-stone-100">ETLAB TKMCE</span>
                  <p className="text-[10px] text-stone-400 uppercase font-mono">{mode} Mode</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nav list */}
            <nav className="flex-1 overflow-y-auto p-2.5 space-y-0.5">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-[#f4f1eb] dark:bg-[#23262c] text-stone-900 dark:text-stone-100 font-semibold'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-[#faf8f5] dark:hover:bg-[#1e2026]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Drawer User Footer */}
            <div className="p-3 border-t border-[#e7e4de] dark:border-[#26282f] flex items-center justify-between bg-[#f9f8f5] dark:bg-[#1f2127]">
              <div className="min-w-0 pr-2">
                <p className="text-xs font-medium text-stone-900 dark:text-stone-100 truncate">
                  {profile?.name || 'Student'}
                </p>
                <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate font-mono">
                  {profile?.registerNo || 'TKMCE'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
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
