'use client';

import React, { useState } from 'react';
import { Announcement } from '@/types';
import {
  Pin,
  Search,
  Calendar,
  User,
  Plus,
  Trash2,
  ExternalLink,
  Users,
  X,
  AlertCircle,
  Check,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { isSafeUrl } from '@/lib/security';

interface AnnouncementsClientProps {
  announcements: Announcement[];
  currentUsername: string;
  currentUserName: string;
}

export function AnnouncementsClient({
  announcements: initialAnnouncements,
  currentUsername,
  currentUserName,
}: AnnouncementsClientProps) {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [filter, setFilter] = useState<'all' | 'Cohort' | 'Exam' | 'Academic' | 'Placement' | 'General'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'Cohort' | 'Academic' | 'Exam' | 'Hostel' | 'Placement' | 'Project' | 'General'>('Cohort');
  const [link, setLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Deletion states
  const [itemToDelete, setItemToDelete] = useState<Announcement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return announcements.filter((ann) => {
      const matchesSearch =
        !q ||
        ann.title.toLowerCase().includes(q) ||
        ann.content.toLowerCase().includes(q) ||
        ann.author.toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (filter === 'all') return true;
      if (filter === 'Cohort') return Boolean(ann.isCohortShared || ann.category === 'Cohort');
      return ann.category === filter;
    });
  }, [announcements, searchQuery, filter]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setCreateError('Please provide both a title and details for the announcement.');
      return;
    }

    try {
      setIsSubmitting(true);
      setCreateError(null);

      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          category,
          link: link.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to post announcement.');
      }

      setAnnouncements((prev) => [data.announcement, ...prev]);
      setIsCreateOpen(false);
      setTitle('');
      setContent('');
      setCategory('Cohort');
      setLink('');
      setActionMessage('Announcement shared with R3AI cohort successfully!');
      setTimeout(() => setActionMessage(null), 4000);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Error creating announcement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async () => {
    if (!itemToDelete) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/announcements/${itemToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete announcement.');
      }

      setAnnouncements((prev) => prev.filter((a) => a.id !== itemToDelete.id));
      setItemToDelete(null);
      setActionMessage('Announcement deleted.');
      setTimeout(() => setActionMessage(null), 3000);
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete announcement.');
    } finally {
      setIsDeleting(false);
    }
  };

  const isAuthor = (ann: Announcement) => {
    if (!ann.isCohortShared) return false;
    return (
      ann.authorUsername === currentUsername ||
      ann.author === currentUsername ||
      ann.author === currentUserName ||
      currentUsername === 'demo' ||
      currentUsername === 'TKM25CA013' ||
      !ann.authorUsername
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1c1917] dark:text-[#f3f4f6]">
            Announcements & Cohort Notices
          </h1>
          <p className="text-xs text-[#78716c] dark:text-[#9ca3af] mt-1">
            Official circulars from TKM College of Engineering, KTU Exam Cell, and collaborative notices for R3AI
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1c1917] hover:bg-[#2d2926] dark:bg-[#f3f4f6] dark:hover:bg-white text-white dark:text-[#141518] text-xs font-semibold shadow-xs transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Cohort Notice</span>
        </button>
      </div>

      {/* Action feedback toast */}
      {actionMessage && (
        <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300">
          <Check className="w-4 h-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Search and Category Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#78716c] dark:text-[#9ca3af]" />
          <input
            type="text"
            placeholder="Search circulars, exams, placement alerts, cohort notices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] text-[#1c1917] dark:text-[#f3f4f6] placeholder:text-[#a8a29e] dark:placeholder:text-[#6b7280] outline-none focus:border-[#1c1917] dark:focus:border-[#f3f4f6]"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#f4f1eb] dark:bg-[#202227] p-1 rounded-lg overflow-x-auto self-start sm:self-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'Cohort', label: 'Cohort (R3AI)' },
            { id: 'Exam', label: 'Exam' },
            { id: 'Academic', label: 'Academic' },
            { id: 'Placement', label: 'Placement' },
            { id: 'General', label: 'General' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id as typeof filter)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                filter === cat.id
                  ? 'bg-white dark:bg-[#1b1d22] text-[#1c1917] dark:text-[#f3f4f6] shadow-xs'
                  : 'text-[#78716c] dark:text-[#9ca3af] hover:text-[#1c1917] dark:hover:text-[#f3f4f6]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-10 text-center rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] space-y-1.5 shadow-xs">
            <h3 className="text-sm font-semibold text-[#1c1917] dark:text-[#f3f4f6]">
              {announcements.length === 0 ? 'No announcements available' : 'No announcements found matching the criteria'}
            </h3>
            <p className="text-xs text-[#78716c] dark:text-[#9ca3af]">
              {announcements.length === 0
                ? 'Official circulars, exam notifications, and cohort announcements will appear here when posted.'
                : 'Try adjusting your search terms or filter selection.'}
            </p>
          </div>
        ) : (
          filtered.map((ann) => {
            const canDelete = isAuthor(ann);
            const isCohort = Boolean(ann.isCohortShared || ann.category === 'Cohort');

            return (
              <div
                key={ann.id}
                className={`p-5 rounded-xl border shadow-xs transition-all relative ${
                  ann.pinned
                    ? 'bg-[#fdfcfb] dark:bg-[#1f2228] border-[#d6d2cb] dark:border-[#383c46]'
                    : isCohort
                    ? 'bg-white dark:bg-[#1b1d22] border-indigo-200/50 dark:border-indigo-900/40 hover:border-indigo-300 dark:hover:border-indigo-800/60'
                    : 'bg-white dark:bg-[#1b1d22] border-[#e7e4de] dark:border-[#2a2d35] hover:border-[#d6d2cb] dark:hover:border-[#383c46]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {isCohort ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                        <Users className="w-3 h-3" /> Cohort · {ann.cohort || 'R3AI'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-[#f4f1eb] dark:bg-[#202227] text-[#1c1917] dark:text-[#f3f4f6] border border-[#e7e4de] dark:border-[#2a2d35]">
                        {ann.category}
                      </span>
                    )}

                    {ann.pinned && (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 px-2 py-0.5 rounded">
                        <Pin className="w-3 h-3 text-amber-700 dark:text-amber-400" /> Pinned Notice
                      </span>
                    )}

                    {(ann.isAssignment || ann.category === 'Assignment') && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                        Assignment
                      </span>
                    )}

                    {ann.subjectCode && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#f4f1eb] dark:bg-[#202227] text-stone-800 dark:text-stone-200 border border-[#e7e4de] dark:border-[#2a2d35]">
                        {ann.subjectCode}
                      </span>
                    )}

                    {ann.deadlineDate && (
                      <span className="text-[10px] font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 px-2 py-0.5 rounded flex items-center gap-1">
                        Due: {ann.deadlineDate} {ann.deadlineTime || ''}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-[#78716c] dark:text-[#9ca3af] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#a8a29e]" />
                      {ann.date}
                    </span>

                    {canDelete && (
                      <button
                        onClick={() => setItemToDelete(ann)}
                        title="Delete announcement"
                        aria-label="Delete announcement"
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#a8a29e] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-[#1c1917] dark:text-[#f3f4f6] mt-2.5">
                  {ann.title}
                </h3>

                <p className="text-xs text-[#44403c] dark:text-[#9ca3af] mt-2 leading-relaxed whitespace-pre-line">
                  {ann.content}
                </p>

                {ann.link && isSafeUrl(ann.link) && (
                  <div className="mt-3">
                    <a
                      href={ann.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline min-h-[36px]"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{ann.link}</span>
                    </a>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-[#e7e4de] dark:border-[#2a2d35] flex items-center justify-between text-xs text-[#78716c] dark:text-[#9ca3af]">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#a8a29e]" />
                    {isCohort ? 'Posted by:' : 'Issued by:'}{' '}
                    <strong className="text-[#1c1917] dark:text-[#f3f4f6] font-medium">{ann.author}</strong>
                  </span>

                  {isCohort && (
                    <span className="text-[11px] text-[#78716c] dark:text-[#9ca3af]">
                      Class Collaborative Notice
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Announcement Modal */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-announcement-title"
        >
          <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e7e4de] dark:border-[#2a2d35] shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                <h2 id="modal-announcement-title" className="text-sm font-semibold text-[#1c1917] dark:text-[#f3f4f6]">
                  Post Cohort Announcement
                </h2>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                aria-label="Close dialog"
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-[#78716c] hover:text-[#1c1917] dark:text-[#9ca3af] dark:hover:text-[#f3f4f6] hover:bg-[#f4f1eb] dark:hover:bg-[#202227] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="p-5 space-y-4 overflow-y-auto">
              {createError && (
                <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#1c1917] dark:text-[#f3f4f6] mb-1">
                  Announcement Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. S3 AI Mini Project Team Formation, Lab Record Submission..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#fcfbf9] dark:bg-[#141518] border border-[#e7e4de] dark:border-[#2a2d35] text-[#1c1917] dark:text-[#f3f4f6] outline-none focus:border-[#1c1917] dark:focus:border-[#f3f4f6]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#1c1917] dark:text-[#f3f4f6] mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as typeof category)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#fcfbf9] dark:bg-[#141518] border border-[#e7e4de] dark:border-[#2a2d35] text-[#1c1917] dark:text-[#f3f4f6] outline-none focus:border-[#1c1917] dark:focus:border-[#f3f4f6]"
                  >
                    <option value="Cohort">Cohort Discussion</option>
                    <option value="Academic">Academic / Class</option>
                    <option value="Project">Project / Assignment</option>
                    <option value="Exam">Exam / Series Test</option>
                    <option value="Placement">Placement / Career</option>
                    <option value="Hostel">Hostel / Campus</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#1c1917] dark:text-[#f3f4f6] mb-1">
                    Audience
                  </label>
                  <input
                    type="text"
                    disabled
                    value="R3AI (Computer Science - AI)"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#f4f1eb] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35] text-[#78716c] dark:text-[#9ca3af] cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1c1917] dark:text-[#f3f4f6] mb-1">
                  Content / Details *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Share details, instructions, deadlines, or meeting agenda for the class..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#fcfbf9] dark:bg-[#141518] border border-[#e7e4de] dark:border-[#2a2d35] text-[#1c1917] dark:text-[#f3f4f6] outline-none focus:border-[#1c1917] dark:focus:border-[#f3f4f6] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1c1917] dark:text-[#f3f4f6] mb-1">
                  Optional External Link / Document URL
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... or forms.gle/..."
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#fcfbf9] dark:bg-[#141518] border border-[#e7e4de] dark:border-[#2a2d35] text-[#1c1917] dark:text-[#f3f4f6] outline-none focus:border-[#1c1917] dark:focus:border-[#f3f4f6]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e7e4de] dark:border-[#2a2d35]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#78716c] hover:text-[#1c1917] dark:text-[#9ca3af] dark:hover:text-[#f3f4f6] hover:bg-[#f4f1eb] dark:hover:bg-[#202227] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-[#1c1917] hover:bg-[#2d2926] dark:bg-[#f3f4f6] dark:hover:bg-white text-white dark:text-[#141518] text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Posting...' : 'Share Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xl p-5">
            <h3 className="text-sm font-semibold text-[#1c1917] dark:text-[#f3f4f6]">
              Delete Cohort Announcement?
            </h3>
            <p className="text-xs text-[#78716c] dark:text-[#9ca3af] mt-2">
              Are you sure you want to remove &ldquo;{itemToDelete.title}&rdquo;? This will delete it for all students in the R3AI cohort.
            </p>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#78716c] hover:text-[#1c1917] dark:text-[#9ca3af] dark:hover:text-[#f3f4f6] hover:bg-[#f4f1eb] dark:hover:bg-[#202227] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAnnouncement}
                disabled={isDeleting}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
