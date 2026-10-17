'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Assignment } from '@/types';
import { getCourseFullName } from '@/lib/course-catalog';
import { getDeadlineCountdown, getAssignmentEffectiveStatus, isUpcomingAssignment } from '@/lib/assignment-utils';
import {
  Calendar,
  ExternalLink,
  Award,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  RefreshCw,
  Filter,
  ArrowUpDown,
  BookOpen,
  Layers,
} from 'lucide-react';

interface AssignmentsClientProps {
  assignments: Assignment[];
  mode?: 'live' | 'demo';
  syncError?: string;
  lastSynced?: string;
  upcomingCount?: number;
}

type FilterTab = 'upcoming' | 'all' | 'submitted' | 'completed' | 'overdue';
type SortOption = 'deadline-asc' | 'deadline-desc' | 'code-asc' | 'title-asc';

export function AssignmentsClient({
  assignments,
  mode = 'demo',
  syncError,
  lastSynced = 'Just now',
}: AssignmentsClientProps) {
  const router = useRouter();

  // Tabs default to 'upcoming' to match the Overview page priority
  const [activeTab, setActiveTab] = useState<FilterTab>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedSemester, setSelectedSemester] = useState<string>('S3');
  const [sortBy, setSortBy] = useState<SortOption>('deadline-asc');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Derive distinct courses from synchronized dataset
  const availableCourses = useMemo(() => {
    const courseMap = new Map<string, string>();
    for (const asg of assignments) {
      if (asg.subjectCode) {
        courseMap.set(asg.subjectCode, asg.subject);
      }
    }
    return Array.from(courseMap.entries()).map(([code, name]) => ({
      code,
      name,
    }));
  }, [assignments]);

  // Compute status subsets for accurate counts
  const upcomingList = useMemo(() => assignments.filter((a) => isUpcomingAssignment(a)), [assignments]);
  const submittedList = useMemo(() => assignments.filter((a) => getAssignmentEffectiveStatus(a) === 'submitted'), [assignments]);
  const completedList = useMemo(() => assignments.filter((a) => getAssignmentEffectiveStatus(a) === 'completed'), [assignments]);
  const overdueList = useMemo(() => assignments.filter((a) => getAssignmentEffectiveStatus(a) === 'overdue'), [assignments]);

  // Filtered and sorted dataset
  const filteredAssignments = useMemo(() => {
    return assignments
      .filter((asg) => {
        const effectiveStatus = getAssignmentEffectiveStatus(asg);

        // 1. Tab status filter
        if (activeTab === 'upcoming' && !isUpcomingAssignment(asg)) return false;
        if (activeTab === 'submitted' && effectiveStatus !== 'submitted') return false;
        if (activeTab === 'completed' && effectiveStatus !== 'completed') return false;
        if (activeTab === 'overdue' && effectiveStatus !== 'overdue') return false;

        // 2. Subject filter
        if (selectedSubject !== 'ALL' && asg.subjectCode !== selectedSubject) {
          return false;
        }

        // 3. Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = (asg.title || '').toLowerCase().includes(q);
          const matchSubject = (asg.subject || '').toLowerCase().includes(q);
          const matchCode = (asg.subjectCode || '').toLowerCase().includes(q);
          const matchFaculty = (asg.faculty || '').toLowerCase().includes(q);
          const matchDesc = (asg.description || '').toLowerCase().includes(q);
          if (!matchTitle && !matchSubject && !matchCode && !matchFaculty && !matchDesc) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'deadline-asc') {
          const dateA = new Date(a.dueDate).getTime() || 0;
          const dateB = new Date(b.dueDate).getTime() || 0;
          return dateA - dateB;
        }
        if (sortBy === 'deadline-desc') {
          const dateA = new Date(a.dueDate).getTime() || 0;
          const dateB = new Date(b.dueDate).getTime() || 0;
          return dateB - dateA;
        }
        if (sortBy === 'code-asc') {
          return (a.subjectCode || '').localeCompare(b.subjectCode || '');
        }
        if (sortBy === 'title-asc') {
          return (a.title || '').localeCompare(b.title || '');
        }
        return 0;
      });
  }, [assignments, activeTab, selectedSubject, searchQuery, sortBy]);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await fetch('/api/assignments?refresh=true');
      router.refresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#f4f1eb] dark:bg-[#202227] text-stone-800 dark:text-stone-200 border border-[#e7e4de] dark:border-[#2a2d35]">
              Semester 3 · R3AI
            </span>
            <span className="text-xs text-[#78716c] dark:text-[#9ca3af]">
              Synced {lastSynced}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1c1917] dark:text-[#f3f4f6]">
            Assignments & Coursework
          </h1>
          <p className="text-xs text-[#78716c] dark:text-[#9ca3af] mt-1">
            Synchronized directly with ETLAB academic portal for Computer Science (AI)
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh assignments from ETLAB"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] text-[#1c1917] dark:text-[#f3f4f6] hover:bg-[#f9f8f5] dark:hover:bg-[#202227] flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync ETLAB'}</span>
          </button>

          <a
            href="https://tkmce.etlab.in/student/assignments"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1c1917] hover:bg-[#292524] text-white dark:bg-[#f3f4f6] dark:hover:bg-white dark:text-[#141518] flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <span>Portal Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Sync Failure Error Alert (Live Mode) */}
      {syncError && assignments.length === 0 && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200 animate-fade-in-up">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold">ETLAB Live Synchronization Notice</h4>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                {syncError} No synthetic records are fabricated in live mode.
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shrink-0 transition-colors cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Status Filter Tabs (Matching Overview Logic) */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs">
        {[
          { id: 'upcoming', label: 'Upcoming', count: upcomingList.length, highlight: true },
          { id: 'all', label: 'All Records', count: assignments.length },
          { id: 'submitted', label: 'Submitted', count: submittedList.length },
          { id: 'completed', label: 'Completed / Graded', count: completedList.length },
          { id: 'overdue', label: 'Overdue / Past', count: overdueList.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as FilterTab)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#1c1917] text-white dark:bg-[#f3f4f6] dark:text-[#141518] shadow-xs font-semibold'
                : 'text-[#78716c] dark:text-[#9ca3af] hover:bg-[#f4f1eb] dark:hover:bg-[#202227]'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black font-semibold'
                  : 'bg-[#f4f1eb] dark:bg-[#252830] text-[#78716c] dark:text-[#9ca3af]'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Controls Bar: Search, Semester, Subject, Sort */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#78716c] dark:text-[#9ca3af]" />
          <input
            type="text"
            placeholder="Search assignments, topics, faculty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-lg bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] text-[#1c1917] dark:text-[#f3f4f6] placeholder:text-[#a8a29e] dark:placeholder:text-[#6b7280] outline-none focus:border-[#1c1917] dark:focus:border-[#f3f4f6]"
          />
        </div>

        {/* Semester Filter */}
        <div className="relative">
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="w-full px-3 py-2 text-xs font-medium rounded-lg bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] text-[#1c1917] dark:text-[#f3f4f6] outline-none focus:border-[#1c1917] dark:focus:border-[#f3f4f6] cursor-pointer"
          >
            <option value="S3">Semester 3 (Current Academic Year)</option>
            <option value="ALL">All Semesters</option>
          </select>
        </div>

        {/* Subject Filter */}
        <div className="relative">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-3 py-2 text-xs font-medium rounded-lg bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] text-[#1c1917] dark:text-[#f3f4f6] outline-none focus:border-[#1c1917] dark:focus:border-[#f3f4f6] cursor-pointer"
          >
            <option value="ALL">All Enrolled Courses ({availableCourses.length})</option>
            {availableCourses.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} – {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sorting Dropdown */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="w-full px-3 py-2 text-xs font-medium rounded-lg bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] text-[#1c1917] dark:text-[#f3f4f6] outline-none focus:border-[#1c1917] dark:focus:border-[#f3f4f6] cursor-pointer"
          >
            <option value="deadline-asc">Deadline: Soonest first</option>
            <option value="deadline-desc">Deadline: Furthest first</option>
            <option value="code-asc">Course Code (A–Z)</option>
            <option value="title-asc">Assignment Title (A–Z)</option>
          </select>
        </div>
      </div>

      {/* Result Count and Active Tab Indicator */}
      <div className="flex items-center justify-between text-xs text-[#78716c] dark:text-[#9ca3af] px-1">
        <span>
          Showing <strong className="text-[#1c1917] dark:text-[#f3f4f6]">{filteredAssignments.length}</strong> {activeTab} assignment{filteredAssignments.length === 1 ? '' : 's'}
        </span>
        {activeTab === 'upcoming' && (
          <span className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>Synchronized with Overview tab upcoming count ({upcomingList.length})</span>
          </span>
        )}
      </div>

      {/* Assignments List */}
      <div className="space-y-3.5">
        {filteredAssignments.length > 0 ? (
          filteredAssignments.map((asg) => {
            const effectiveStatus = getAssignmentEffectiveStatus(asg);
            const countdown = getDeadlineCountdown(asg.dueDate);
            const fullCourseName = getCourseFullName(asg.subjectCode, asg.subject);
            const isUpcoming = effectiveStatus === 'upcoming';
            const isSubmitted = effectiveStatus === 'submitted';
            const isCompleted = effectiveStatus === 'completed';
            const isOverdue = effectiveStatus === 'overdue';

            return (
              <div
                key={asg.id}
                className="p-5 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs flex flex-col justify-between hover:border-[#d6d2cb] dark:hover:border-[#383c46] transition-all animate-fade-in-up"
              >
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[11px] font-mono font-semibold text-[#1c1917] dark:text-[#f3f4f6] bg-[#f4f1eb] dark:bg-[#202227] px-2 py-0.5 rounded border border-[#e7e4de] dark:border-[#2a2d35]">
                          {asg.subjectCode}
                        </span>
                        <span className="text-xs font-medium text-[#78716c] dark:text-[#9ca3af]">
                          {fullCourseName}
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-base font-semibold text-[#1c1917] dark:text-[#f3f4f6] leading-snug">
                        {asg.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                      {/* Submission Mode Pill */}
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#f4f1eb] dark:bg-[#202227] text-[#78716c] dark:text-[#9ca3af] border border-[#e7e4de] dark:border-[#2a2d35]">
                        {asg.submissionMode || 'Submission mode not specified'}
                      </span>

                      {/* Status / Countdown Badge */}
                      {isUpcoming ? (
                        <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{countdown.text}</span>
                        </span>
                      ) : isSubmitted ? (
                        <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Submitted</span>
                        </span>
                      ) : isCompleted ? (
                        <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          <span>Completed</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>Overdue / Expired</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-[#44403c] dark:text-[#9ca3af] mt-2.5 leading-relaxed">
                    {asg.description}
                  </p>
                </div>

                {/* Card Footer */}
                <div className="mt-4 pt-3.5 border-t border-[#e7e4de] dark:border-[#2a2d35] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                  <div className="flex items-center gap-4 text-[#78716c] dark:text-[#9ca3af] flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#a8a29e]" />
                      Submission Deadline: <strong className="text-[#1c1917] dark:text-[#f3f4f6]">{asg.dueDate}</strong>
                    </span>
                    {asg.faculty && <span>Faculty: {asg.faculty}</span>}
                    {asg.publishDate && <span>Issued: {asg.publishDate}</span>}
                    {asg.maxMarks && <span>Max: {asg.maxMarks} marks</span>}
                  </div>

                  <div className="flex items-center gap-3">
                    {asg.obtainedMarks !== undefined && (
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" />
                        Score: {asg.obtainedMarks} / {asg.maxMarks}
                      </span>
                    )}

                    {asg.attachmentUrl && (
                      <a
                        href={asg.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#78716c] dark:text-[#9ca3af] hover:text-[#1c1917] dark:hover:text-[#f3f4f6] flex items-center gap-1 font-medium transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{asg.attachmentName || 'Attachment'}</span>
                      </a>
                    )}

                    <a
                      href={asg.externalUrl || 'https://tkmce.etlab.in/student/assignments'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#1c1917] dark:text-[#f3f4f6] font-semibold hover:underline flex items-center gap-1 transition-colors"
                    >
                      <span>View on ETLAB</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#78716c] dark:text-[#9ca3af]" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-10 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] text-center space-y-2.5 animate-fade-in-up">
            <CheckCircle2 className="w-7 h-7 text-[#78716c] dark:text-[#9ca3af] mx-auto" />
            <p className="text-sm font-semibold text-[#1c1917] dark:text-[#f3f4f6]">
              {activeTab === 'upcoming'
                ? 'No Upcoming Assignment Deadlines'
                : 'No assignments found matching criteria'}
            </p>
            <p className="text-xs text-[#78716c] dark:text-[#9ca3af] max-w-sm mx-auto leading-relaxed">
              {activeTab === 'upcoming'
                ? 'All coursework submissions for Semester 3 Computer Science (AI) are currently up to date.'
                : 'Try clearing your search query or switching to another category tab.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
