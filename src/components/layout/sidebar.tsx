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
} from 'lucide-react';
import { StudentProfile } from '@/types';

interface SidebarProps {
  profile?: StudentProfile;
  mode?: 'live' | 'demo';
  overallPercentage?: number;
  hasShortage?: boolean;
  pendingAssignmentsCount?: number;
}

export function Sidebar({
  profile,
  mode = 'demo',
  overallPercentage = 83.2,
  hasShortage = true,
  pendingAssignmentsCount = 0,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      if (typeof window !== 'undefined') {
        const savedTheme = localStorage.getItem('etlab_theme');
        sessionStorage.clear();
        localStorage.removeItem('etlab_target');
        if (profile?.admissionNo) {
          localStorage.removeItem(`etlab_target_${profile.admissionNo}`);
        }
        if (savedTheme) {
          localStorage.setItem('etlab_theme', savedTheme);
        }
      }
      router.push('/login');
      router.refresh();
    }
  };

  const navItems = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    {
      label: 'Attendance',
      href: '/dashboard/attendance',
      icon: PieChart,
      badge: hasShortage ? 'Alert' : undefined,
      badgeColor: 'bg-amber-100 dark:bg-[#2b2210] text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-[#423418]',
    },
    { label: 'Timetable', href: '/dashboard/timetable', icon: CalendarDays },
    {
      label: 'Assignments',
      href: '/dashboard/assignments',
      icon: FileCheck2,
      badge: pendingAssignmentsCount > 0 ? `${pendingAssignmentsCount} Due` : undefined,
      badgeColor: 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700',
    },
    { label: 'Study Materials', href: '/dashboard/materials', icon: FolderDown },
    { label: 'Results', href: '/dashboard/results', icon: ClipboardList },
    { label: 'Announcements', href: '/dashboard/announcements', icon: BellRing },
    { label: 'Profile', href: '/dashboard/profile', icon: User },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  const isSafe = overallPercentage >= 75;

  return (
    <aside className="w-60 shrink-0 hidden md:flex flex-col bg-white dark:bg-[#18191d] border-r border-[#e7e4de] dark:border-[#26282f] h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="h-14 px-5 flex items-center justify-between border-b border-[#e7e4de] dark:border-[#26282f]">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#1c1917] dark:bg-stone-100 text-white dark:text-stone-900 flex items-center justify-center">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-semibold text-sm tracking-tight text-stone-900 dark:text-stone-100">
              ETPlus
            </span>
            <span className="text-[10px] font-medium text-stone-500 dark:text-stone-400">
              TKMCE
            </span>
          </div>
        </Link>

        {/* Mode Indicator Pill */}
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider ${
            mode === 'live'
              ? 'bg-emerald-50 dark:bg-[#14281c] text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-[#1e3d29]'
              : 'bg-stone-100 dark:bg-[#23262c] text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-[#2e3138]'
          }`}
          title={mode === 'live' ? 'Connected to live TKMCE ETLAB' : 'Running in Interactive Demo Mode'}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${mode === 'live' ? 'bg-emerald-500' : 'bg-stone-400 dark:bg-stone-500'}`} />
          {mode}
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={item.href !== '/dashboard/results'}
              className={`flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-[#f4f1eb] dark:bg-[#23262c] text-stone-900 dark:text-stone-100 font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-[#faf8f5] dark:hover:bg-[#1e2026]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-stone-900 dark:text-stone-100' : 'text-stone-400 dark:text-stone-500'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Attendance Quick Metric in Sidebar */}
      <div className="px-3 py-2.5 mx-2.5 my-2 rounded-md bg-[#f9f8f5] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35]">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">Attendance</span>
          <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">{overallPercentage}%</span>
        </div>
        <div className="w-full bg-[#e7e4de] dark:bg-[#2b2e37] h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isSafe ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-amber-600 dark:bg-amber-500'
            }`}
            style={{ width: `${Math.min(100, overallPercentage)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5 text-[10px]">
          <span className="text-stone-500 dark:text-stone-400">Target 75%</span>
          <span className={`font-medium ${isSafe ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
            {isSafe ? 'Eligible' : 'Shortage'}
          </span>
        </div>
      </div>

      {/* User Footer Profile & Sign Out */}
      <div className="p-2.5 border-t border-[#e7e4de] dark:border-[#26282f] flex items-center justify-between">
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-2 min-w-0 pr-1 group hover:opacity-85 transition-opacity"
        >
          <div className="w-7 h-7 rounded-md bg-stone-800 text-stone-100 dark:bg-stone-700 dark:text-stone-100 text-xs font-medium flex items-center justify-center shrink-0">
            {profile?.name ? profile.name.charAt(0) : 'S'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-stone-900 dark:text-stone-100 truncate">
              {profile?.name || 'Student'}
            </p>
            <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate font-mono">
              {profile?.registerNo || 'TKMCE'}
            </p>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          title="Sign out"
          className="p-1.5 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-[#f4f1eb] dark:hover:bg-[#23262c] transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
}
