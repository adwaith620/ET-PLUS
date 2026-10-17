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
import { getCourseFullName } from '@/lib/course-catalog';

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
    { title: 'Settings', subtitle: 'Theme appearance, active session, and preferences', url: '/dashboard/settings' },
  ];

  if (q.length > 0) {
    // Subjects
    DEMO_SUBJECTS.forEach((sub) => {
      const fullName = getCourseFullName(sub.code, sub.name);
      if (fullName.toLowerCase().includes(q) || sub.code.toLowerCase().includes(q) || sub.faculty.toLowerCase().includes(q)) {
        results.push({
          id: `sub-${sub.code}`,
          title: fullName,
          subtitle: `${sub.code} • Faculty: ${sub.faculty} • Attendance: ${Math.round((sub.attendedHours / sub.totalHours) * 100)}%`,
          category: 'Subject',
          url: '/dashboard/attendance',
        });
      }
    });

    // Assignments
    DEMO_ASSIGNMENTS.forEach((asg) => {
      const courseName = getCourseFullName(asg.subjectCode, asg.subject);
      if (asg.title.toLowerCase().includes(q) || courseName.toLowerCase().includes(q) || asg.subjectCode.toLowerCase().includes(q) || asg.description.toLowerCase().includes(q)) {
        results.push({
          id: asg.id,
          title: asg.title,
          subtitle: `${courseName} (${asg.subjectCode}) • Due: ${asg.dueDate} • Status: ${asg.status}`,
          category: 'Assignment',
          url: '/dashboard/assignments',
        });
      }
    });

    // Materials
    DEMO_MATERIALS.forEach((mat) => {
      const courseName = getCourseFullName(mat.subjectCode, mat.subject);
      if (mat.title.toLowerCase().includes(q) || courseName.toLowerCase().includes(q) || mat.subjectCode.toLowerCase().includes(q) || mat.topic?.toLowerCase().includes(q)) {
        results.push({
          id: mat.id,
          title: mat.title,
          subtitle: `${courseName} (${mat.subjectCode}) • ${mat.fileType.toUpperCase()} (${mat.fileSize || ''})`,
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-[#1b1d22] rounded-xl shadow-lg border border-[#e7e4de] dark:border-[#2a2d35] overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-[#e7e4de] dark:border-[#2a2d35]">
          <Search className="w-4 h-4 text-[#78716c] dark:text-[#9ca3af] mr-3 shrink-0" />
          <input
            type="text"
            className="flex-1 bg-transparent border-0 outline-none text-[#1c1917] dark:text-[#f3f4f6] placeholder:text-[#a8a29e] dark:placeholder:text-[#6b7280] text-sm"
            placeholder="Search subjects, assignments, materials, announcements... (Press Esc to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-[#78716c] hover:text-[#1c1917] dark:text-[#9ca3af] dark:hover:text-[#f3f4f6] mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-flex items-center text-[10px] font-medium text-[#78716c] dark:text-[#9ca3af] bg-[#f4f1eb] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35] px-1.5 py-0.5 rounded">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-[#e7e4de]/60 dark:divide-[#2a2d35]/60">
          {results.length === 0 ? (
            <div className="py-12 text-center text-[#78716c] dark:text-[#9ca3af] text-xs">
              No results found for &ldquo;<span className="font-semibold text-[#1c1917] dark:text-[#f3f4f6]">{query}</span>&rdquo;
            </div>
          ) : (
            results.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item.url)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left hover:bg-[#f9f8f5] dark:hover:bg-[#202227] transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="w-7 h-7 rounded-md bg-[#f4f1eb] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35] flex items-center justify-center shrink-0 text-[#1c1917] dark:text-[#f3f4f6]">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#1c1917] dark:text-[#f3f4f6] truncate group-hover:underline">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-[#78716c] dark:text-[#9ca3af] truncate">
                      {item.subtitle}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded bg-[#f4f1eb] dark:bg-[#202227] text-[#78716c] dark:text-[#9ca3af] border border-[#e7e4de] dark:border-[#2a2d35]">
                    {item.category}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#a8a29e] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-[#fdfcfb] dark:bg-[#181a1f] border-t border-[#e7e4de] dark:border-[#2a2d35] flex items-center justify-between text-[11px] text-[#78716c] dark:text-[#9ca3af]">
          <span>Navigate with mouse or keyboard</span>
          <span>TKMCE ETLAB Search</span>
        </div>
      </div>
    </div>
  );
}
