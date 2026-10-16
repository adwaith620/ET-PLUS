'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Laptop,
  RefreshCw,
  Menu,
  AlertTriangle,
  FileText,
  Calendar,
  X,
} from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { GlobalSearchDialog } from '@/components/global-search-dialog';
import { StudentProfile, NotificationItem } from '@/types';

interface HeaderProps {
  profile?: StudentProfile;
  lastSynced?: string;
  notifications?: NotificationItem[];
  onOpenMobileNav: () => void;
}

export function Header({
  profile,
  lastSynced = 'Just now',
  notifications = [],
  onOpenMobileNav,
}: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetch('/api/attendance/summary');
      router.refresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <>
      <header className="h-16 px-4 sm:px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-30">
        {/* Left Side: Mobile Menu Button & Search Trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileNav}
            className="p-2 -ml-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Quick Search Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium transition-colors w-40 sm:w-64"
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">Search records...</span>
            <kbd className="hidden sm:inline-flex ml-auto text-[10px] bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-400 font-mono">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Side: Sync status, Notifications, Theme toggle, User pill */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Sync status */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 mr-2">
            <span>Synced: {lastSynced}</span>
            <button
              onClick={handleRefresh}
              title="Refresh data from ETLAB"
              className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
            </button>
          </div>

          {/* Theme switcher */}
          <button
            onClick={cycleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={`Current theme: ${theme}. Click to switch.`}
          >
            {theme === 'dark' ? (
              <Moon className="w-4 h-4" />
            ) : theme === 'light' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Laptop className="w-4 h-4" />
            )}
          </button>

          {/* Notification Center Popover */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 relative transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>

            {isNotifOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsNotifOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">
                        Notifications
                      </span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setIsNotifOpen(false)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        No notifications right now
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <Link
                          key={notif.id}
                          href={notif.link || '/dashboard'}
                          onClick={() => setIsNotifOpen(false)}
                          className={`block px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                            !notif.read ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="shrink-0 mt-0.5">
                              {notif.type === 'attendance' ? (
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                              ) : notif.type === 'assignment' ? (
                                <Calendar className="w-4 h-4 text-blue-500" />
                              ) : (
                                <FileText className="w-4 h-4 text-emerald-500" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                {notif.title}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                                {notif.message}
                              </p>
                              <span className="text-[10px] text-slate-400 mt-1 block">
                                {notif.timestamp}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>

                  <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-center">
                    <Link
                      href="/dashboard/announcements"
                      onClick={() => setIsNotifOpen(false)}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View All Announcements →
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Mini Avatar Header */}
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold flex items-center justify-center text-xs shadow-xs">
              {profile?.name ? profile.name.charAt(0) : 'S'}
            </div>
            <span className="hidden sm:inline-block text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
              {profile?.name ? profile.name.split(' ')[0] : 'Student'}
            </span>
          </Link>
        </div>
      </header>

      {/* Global Search Dialog */}
      <GlobalSearchDialog
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}
