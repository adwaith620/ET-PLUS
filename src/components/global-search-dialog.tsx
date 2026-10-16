'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  BookOpen,
  Calendar,
  FileText,
  Bell,
  GraduationCap,
  X,
  ChevronRight,
} from 'lucide-react';
import { DEMO_SUBJECTS, DEMO_ASSIGNMENTS, DEMO_MATERIALS, DEMO_ANNOUNCEMENTS } from '@/lib/demo-data';

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  category: 'Subject' | 'Assignment' | 'Material' | 'Announcement' | 'Navigation';
  url: string;
}

export function GlobalSearchDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent or state
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Search items
  const results: SearchResult[] = [];
  const q = query.toLowerCase().trim();

  // Navigation pages
  const navPages = [
    { title: 'Overview Dashboard', subtitle: 'Academic summary and schedule', url: '/dashboard' },
    { title: 'Attendance Analytics', subtitle: 'Calculations, simulator, target status', url: '/dashboard/attendance' },
    { title: 'Class Timetable', subtitle: 'Daily & weekly schedule with periods', url: '/dashboard/timetable' },
    { title: 'Assignments', subtitle: 'Deadlines, tasks, and submission links', url: '/dashboard/assignments' },
    { title: 'Study Materials', subtitle: 'Course notes, slides, and syllabus', url: '/dashboard/materials' },
    { title: 'Marks & Results', subtitle: 'SGPA, CGPA, and internal marks', url: '/dashboard/results' },
    { title: 'Announcements', subtitle: 'College, KTU, and department circulars', url: '/dashboard/announcements' },
    { title: 'Student Profile', subtitle: 'Official records and academic details', url: '/dashboard/profile' },
    { title: 'Settings', subtitle: 'Theme, attendance target, preferences', url: '/dashboard/settings' },
  ];

  if (q.length > 0) {
    // Subjects
    DEMO_SUBJECTS.forEach((sub) => {
      if (sub.name.toLowerCase().includes(q) || sub.code.toLowerCase().includes(q) || sub.faculty.toLowerCase().includes(q)) {
        results.push({
          id: `sub-${sub.code}`,
          title: `${sub.code}: ${sub.name}`,
          subtitle: `Faculty: ${sub.faculty} • Attendance: ${Math.round((sub.attendedHours / sub.totalHours) * 100)}%`,
          category: 'Subject',
          url: '/dashboard/attendance',
        });
      }
    });

    // Assignments
    DEMO_ASSIGNMENTS.forEach((asg) => {
      if (asg.title.toLowerCase().includes(q) || asg.subject.toLowerCase().includes(q) || asg.description.toLowerCase().includes(q)) {
        results.push({
          id: asg.id,
          title: asg.title,
          subtitle: `${asg.subjectCode} • Due: ${asg.dueDate} • Status: ${asg.status}`,
          category: 'Assignment',
          url: '/dashboard/assignments',
        });
      }
    });

    // Materials
    DEMO_MATERIALS.forEach((mat) => {
      if (mat.title.toLowerCase().includes(q) || mat.subject.toLowerCase().includes(q) || mat.topic?.toLowerCase().includes(q)) {
        results.push({
          id: mat.id,
          title: mat.title,
          subtitle: `${mat.subjectCode} • ${mat.fileType.toUpperCase()} (${mat.fileSize || ''})`,
          category: 'Material',
          url: '/dashboard/materials',
        });
      }
    });

    // Announcements
    DEMO_ANNOUNCEMENTS.forEach((ann) => {
      if (ann.title.toLowerCase().includes(q) || ann.content.toLowerCase().includes(q) || ann.author.toLowerCase().includes(q)) {
        results.push({
          id: ann.id,
          title: ann.title,
          subtitle: `${ann.category} • ${ann.author} • ${ann.date}`,
          category: 'Announcement',
          url: '/dashboard/announcements',
        });
      }
    });

    // Navigation matching
    navPages.forEach((page) => {
      if (page.title.toLowerCase().includes(q) || page.subtitle.toLowerCase().includes(q)) {
        results.push({
          id: `nav-${page.url}`,
          title: page.title,
          subtitle: page.subtitle,
          category: 'Navigation',
          url: page.url,
        });
      }
    });
  } else {
    // Default top navigation items
    navPages.forEach((page) => {
      results.push({
        id: `nav-${page.url}`,
        title: page.title,
        subtitle: page.subtitle,
        category: 'Navigation',
        url: page.url,
      });
    });
  }

  const handleSelect = (url: string) => {
    router.push(url);
    onClose();
    setQuery('');
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Subject':
        return <BookOpen className="w-4 h-4 text-blue-500" />;
      case 'Assignment':
        return <Calendar className="w-4 h-4 text-amber-500" />;
      case 'Material':
        return <FileText className="w-4 h-4 text-emerald-500" />;
      case 'Announcement':
        return <Bell className="w-4 h-4 text-purple-500" />;
      default:
        return <GraduationCap className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
          <input
            type="text"
            className="flex-1 bg-transparent border-0 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-base"
            placeholder="Search subjects, assignments, materials, announcements... (Press Esc to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-flex items-center text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/60">
          {results.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
              No results found for &ldquo;<span className="font-semibold text-slate-700 dark:text-slate-200">{query}</span>&rdquo;
            </div>
          ) : (
            results.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item.url)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {item.subtitle}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {item.category}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Navigate with mouse or keyboard</span>
          <span>TKMCE ETLAB Search</span>
        </div>
      </div>
    </div>
  );
}
