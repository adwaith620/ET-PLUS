'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Bell,
  RefreshCw,
  Menu,
  AlertTriangle,
  FileText,
  Calendar,
  X,
  CheckCheck,
} from 'lucide-react';
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notifs, setNotifs] = useState<NotificationItem[]>(notifications);
  const router = useRouter();

  useEffect(() => {
    setNotifs(notifications);
  }, [notifications]);

  const unreadCount = notifs.filter((n) => !n.read).length;

  const handleOpenNotifications = () => {
    const nextOpen = !isNotifOpen;
    setIsNotifOpen(nextOpen);

    // If opening or if there are unread notifications, mark them as read immediately and persist
    if (nextOpen && unreadCount > 0) {
      const allIds = notifs.map((n) => n.id);
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
      fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: allIds }),
      }).catch(() => {});
    }
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const allIds = notifs.map((n) => n.id);
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: allIds }),
      });
    } catch {}
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetch('/api/attendance/summary');
      router.refresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  return (
    <>
      <header className="h-14 px-4 sm:px-6 bg-white dark:bg-[#18191d] border-b border-[#e7e4de] dark:border-[#26282f] flex items-center justify-between sticky top-0 z-30">
        {/* Left: Mobile trigger & Search */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileNav}
            className="p-1.5 -ml-1 rounded-md text-stone-600 dark:text-stone-300 hover:bg-[#f4f1eb] dark:hover:bg-[#23262c] md:hidden transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[#f7f6f3] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35] hover:bg-[#f0ece5] dark:hover:bg-[#262930] text-stone-500 dark:text-stone-400 text-xs font-medium transition-colors w-40 sm:w-60"
          >
            <Search className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="truncate">Search records...</span>
            <kbd className="hidden sm:inline-flex ml-auto text-[10px] bg-white dark:bg-[#18191d] px-1.5 py-0.2 rounded border border-[#e7e4de] dark:border-[#2a2d35] text-stone-500 font-mono">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Sync, Notifications, Theme, User */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Sync status */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 mr-2">
            <span>Synced {lastSynced}</span>
            <button
              onClick={handleRefresh}
              title="Refresh from ETLAB"
              className="p-1 rounded hover:bg-[#f4f1eb] dark:hover:bg-[#23262c] text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-stone-700 dark:text-stone-200' : ''}`} />
            </button>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={handleOpenNotifications}
              className="p-1.5 rounded-md text-stone-600 dark:text-stone-300 hover:bg-[#f4f1eb] dark:hover:bg-[#23262c] relative transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-600 ring-2 ring-white dark:ring-[#18191d]" />
              )}
            </button>

            {isNotifOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsNotifOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#1b1d22] rounded-lg shadow-lg border border-[#e7e4de] dark:border-[#2a2d35] z-50 overflow-hidden animate-fade-in-up">
                  <div className="px-3.5 py-2.5 border-b border-[#e7e4de] dark:border-[#2a2d35] flex items-center justify-between bg-[#f9f8f5] dark:bg-[#202227]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                        Notifications
                      </span>
                      {unreadCount > 0 ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-[#2b2210] text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-[#423519]">
                          {unreadCount} new
                        </span>
                      ) : (
                        <span className="text-[10px] text-stone-500 dark:text-stone-400">
                          All caught up
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          title="Mark all as read"
                          className="flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 px-1.5 py-0.5 rounded hover:bg-[#eae6de] dark:hover:bg-[#2a2d35] transition-colors cursor-pointer"
                        >
                          <CheckCheck className="w-3 h-3" />
                          <span>Mark read</span>
                        </button>
                      )}
                      <button
                        onClick={() => setIsNotifOpen(false)}
                        className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-[#efece6] dark:divide-[#242730]">
                    {notifs.length === 0 ? (
                      <div className="py-6 text-center text-xs text-stone-400">
                        No notifications
                      </div>
                    ) : (
                      notifs.map((notif) => (
                        <Link
                          key={notif.id}
                          href={notif.link || '/dashboard'}
                          onClick={() => setIsNotifOpen(false)}
                          className={`block px-3.5 py-2.5 hover:bg-[#faf8f5] dark:hover:bg-[#22252c] transition-colors ${
                            !notif.read ? 'bg-[#fcfbf9] dark:bg-[#1f2127]' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="shrink-0 mt-0.5">
                              {notif.type === 'attendance' ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              ) : notif.type === 'assignment' ? (
                                <Calendar className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                              ) : (
                                <FileText className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                                {notif.title}
                              </p>
                              <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2 mt-0.5 leading-relaxed">
                                {notif.message}
                              </p>
                              <span className="text-[10px] text-stone-400 mt-1 block font-mono">
                                {notif.timestamp}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>

                  <div className="px-3 py-2 bg-[#f9f8f5] dark:bg-[#202227] border-t border-[#e7e4de] dark:border-[#2a2d35] text-center">
                    <Link
                      href="/dashboard/announcements"
                      onClick={() => setIsNotifOpen(false)}
                      className="text-xs font-medium text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white"
                    >
                      View All Announcements →
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Avatar */}
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-2 pl-2 border-l border-[#e7e4de] dark:border-[#26282f]"
          >
            <div className="w-7 h-7 rounded-md bg-stone-800 text-stone-100 dark:bg-stone-700 dark:text-stone-100 font-medium flex items-center justify-center text-xs">
              {profile?.name ? profile.name.charAt(0) : 'S'}
            </div>
            <span className="hidden sm:inline-block text-xs font-medium text-stone-800 dark:text-stone-200 truncate max-w-[120px]">
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
