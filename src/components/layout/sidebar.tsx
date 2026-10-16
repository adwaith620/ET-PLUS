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
  GraduationCap,
} from 'lucide-react';
import { StudentProfile } from '@/types';

interface SidebarProps {
  profile?: StudentProfile;
  mode?: 'live' | 'demo';
  overallPercentage?: number;
  hasShortage?: boolean;
}

export function Sidebar({
  profile,
  mode = 'demo',
  overallPercentage = 83.2,
  hasShortage = true,
}: SidebarProps) {
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
    {
      label: 'Attendance',
      href: '/dashboard/attendance',
      icon: PieChart,
      badge: hasShortage ? 'Alert' : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
    { label: 'Timetable', href: '/dashboard/timetable', icon: CalendarDays },
    { label: 'Assignments', href: '/dashboard/assignments', icon: FileCheck2, badge: '2 Due', badgeColor: 'bg-blue-500 text-white' },
    { label: 'Study Materials', href: '/dashboard/materials', icon: FolderDown },
    { label: 'Marks & Results', href: '/dashboard/results', icon: Award },
    { label: 'Announcements', href: '/dashboard/announcements', icon: BellRing },
    { label: 'Profile', href: '/dashboard/profile', icon: User },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 shrink-0 hidden md:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">ETLAB</span>
              <span className="text-xs px-1.5 py-0.5 rounded font-semibold tracking-wide uppercase text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                TKMCE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Academic Portal</p>
          </div>
        </Link>

        {/* Live/Demo Mode Indicator Pill */}
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase ${
            mode === 'live'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
          }`}
          title={mode === 'live' ? 'Connected to live TKMCE ETLAB' : 'Running in Interactive Demo Mode'}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${mode === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-purple-500'}`} />
          {mode}
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${item.badgeColor || 'bg-slate-200 text-slate-700'}`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Attendance Quick Widget in Sidebar */}
      <div className="px-4 py-3 mx-3 my-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-medium text-slate-500 dark:text-slate-400">Overall Attendance</span>
          <span className="font-bold text-slate-900 dark:text-white">{overallPercentage}%</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              overallPercentage >= 75 ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
            style={{ width: `${Math.min(100, overallPercentage)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-[11px]">
          <span className="text-slate-400">Target: 75%</span>
          <span
            className={`font-semibold ${
              overallPercentage >= 75
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {overallPercentage >= 75 ? 'On Track' : 'Shortage'}
          </span>
        </div>
      </div>

      {/* User Footer Profile & Sign Out */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-2.5 min-w-0 pr-2 group hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold flex items-center justify-center shrink-0 shadow-sm text-sm">
            {profile?.name ? profile.name.charAt(0) : 'S'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {profile?.name || 'Student'}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {profile?.registerNo || 'TKMCE'}
            </p>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          title="Sign out"
          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
