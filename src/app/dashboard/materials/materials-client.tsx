'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { StudyMaterial } from '@/types';
import { getCourseFullName, SEMESTER_3_COURSES } from '@/lib/course-catalog';
import {
  Search,
  Download,
  Plus,
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  FolderDown,
  BookOpen,
  HelpCircle,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';

interface MaterialsClientProps {
  materials: StudyMaterial[];
  currentUserName?: string;
  currentUsername?: string;
}

type CategoryFilter = 'ALL' | 'courseware' | 'pyq' | 'notes';

export function MaterialsClient({
  materials: initialMaterials,
  currentUserName = 'Adwaith Krishna M H',
  currentUsername = 'demo',
}: MaterialsClientProps) {
  const router = useRouter();
  const [materials, setMaterials] = useState<StudyMaterial[]>(initialMaterials);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSubject, setUploadSubject] = useState('24MAP300');
  const [uploadCategory, setUploadCategory] = useState<'pyq' | 'notes'>('pyq');
  const [uploadDescription, setUploadDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Delete State
  const [materialToDelete, setMaterialToDelete] = useState<StudyMaterial | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleConfirmDelete = async () => {
    if (!materialToDelete) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/materials/${materialToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete resource.');
      }

      setMaterials((prev) => prev.filter((m) => m.id !== materialToDelete.id));
      setMaterialToDelete(null);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Deletion failed.';
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const subjects = Array.from(new Set(materials.map((m) => m.subjectCode)));

  const filtered = materials.filter((mat) => {
    const matchesSearch =
      mat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mat.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mat.faculty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mat.topic && mat.topic.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (mat.uploadedBy && mat.uploadedBy.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedSubject !== 'ALL' && mat.subjectCode !== selectedSubject) {
      return false;
    }

    if (categoryFilter !== 'ALL') {
      const matCat = mat.category || 'courseware';
      if (matCat !== categoryFilter) return false;
    }

    return true;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 25 * 1024 * 1024) {
        setUploadError('File exceeds maximum size limit of 25MB.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a file to upload.');
      return;
    }
    if (!uploadTitle.trim()) {
      setUploadError('Please provide a title for this resource.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', uploadTitle.trim());
      formData.append('subjectCode', uploadSubject);
      formData.append('category', uploadCategory);
      formData.append('description', uploadDescription.trim());

      const res = await fetch('/api/materials/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload resource.');
      }

      setUploadSuccess('Resource published successfully to the R3AI shared repository!');
      setMaterials((prev) => [data.material, ...prev]);

      // Reset form
      setTimeout(() => {
        setIsModalOpen(false);
        setUploadTitle('');
        setUploadDescription('');
        setSelectedFile(null);
        setUploadSuccess(null);
        router.refresh();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header with Title and Upload Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1c1917] dark:text-[#f3f4f6] flex items-center gap-2">
            <FolderDown className="w-6 h-6 text-stone-700 dark:text-stone-300" />
            <span>Course Study Materials & Cohort Repository</span>
          </h1>
          <p className="text-xs text-[#78716c] dark:text-[#9ca3af] mt-1">
            Faculty lecture slides, official syllabus references, previous year question papers (PYQs), and shared notes
          </p>
        </div>

        <button
          onClick={() => {
            setIsModalOpen(true);
            setUploadError(null);
            setUploadSuccess(null);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#1c1917] hover:bg-[#292524] text-white dark:bg-[#f3f4f6] dark:hover:bg-white dark:text-[#141518] transition-colors shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Resource</span>
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs">
        <button
          onClick={() => setCategoryFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
            categoryFilter === 'ALL'
              ? 'bg-[#1c1917] text-white dark:bg-[#f3f4f6] dark:text-[#141518] shadow-xs font-semibold'
              : 'text-[#78716c] dark:text-[#9ca3af] hover:bg-[#f4f1eb] dark:hover:bg-[#202227]'
          }`}
        >
          All Materials ({materials.length})
        </button>
        <button
          onClick={() => setCategoryFilter('courseware')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
            categoryFilter === 'courseware'
              ? 'bg-[#1c1917] text-white dark:bg-[#f3f4f6] dark:text-[#141518] shadow-xs font-semibold'
              : 'text-[#78716c] dark:text-[#9ca3af] hover:bg-[#f4f1eb] dark:hover:bg-[#202227]'
          }`}
        >
          Official Faculty Courseware ({materials.filter((m) => !m.category || m.category === 'courseware').length})
        </button>
        <button
          onClick={() => setCategoryFilter('pyq')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
            categoryFilter === 'pyq'
              ? 'bg-[#1c1917] text-white dark:bg-[#f3f4f6] dark:text-[#141518] shadow-xs font-semibold'
              : 'text-[#78716c] dark:text-[#9ca3af] hover:bg-[#f4f1eb] dark:hover:bg-[#202227]'
          }`}
        >
          PYQs (Previous Year Questions) ({materials.filter((m) => m.category === 'pyq').length})
        </button>
        <button
          onClick={() => setCategoryFilter('notes')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
            categoryFilter === 'notes'
              ? 'bg-[#1c1917] text-white dark:bg-[#f3f4f6] dark:text-[#141518] shadow-xs font-semibold'
              : 'text-[#78716c] dark:text-[#9ca3af] hover:bg-[#f4f1eb] dark:hover:bg-[#202227]'
          }`}
        >
          Student Study Notes ({materials.filter((m) => m.category === 'notes').length})
        </button>
      </div>

      {/* Search and Course Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#78716c] dark:text-[#9ca3af]" />
          <input
            type="text"
            placeholder="Search resources by title, topic, course, or contributor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] text-[#1c1917] dark:text-[#f3f4f6] placeholder:text-[#a8a29e] dark:placeholder:text-[#6b7280] outline-none focus:border-[#1c1917] dark:focus:border-[#f3f4f6]"
          />
        </div>

        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] text-[#1c1917] dark:text-[#f3f4f6] outline-none focus:border-[#1c1917] dark:focus:border-[#f3f4f6]"
        >
          <option value="ALL">All Courses ({subjects.length})</option>
          {subjects.map((sub) => (
            <option key={sub} value={sub}>
              {sub} – {getCourseFullName(sub, sub)}
            </option>
          ))}
        </select>
      </div>

      {/* Materials Cards Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((mat) => {
            const isPyq = mat.category === 'pyq';
            const isNotes = mat.category === 'notes';
            const isCourseware = !mat.category || mat.category === 'courseware';

            return (
              <div
                key={mat.id}
                className="p-5 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs flex flex-col justify-between hover:border-[#d6d2cb] dark:hover:border-[#383c46] transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {isPyq && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 dark:bg-[#2b2210] dark:text-amber-300 border border-amber-200 dark:border-[#423519]">
                            PYQ (Student Shared)
                          </span>
                        )}
                        {isNotes && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 dark:bg-[#14281c] dark:text-emerald-400 dark:border-[#1e3d29]">
                            Study Notes (Student Shared)
                          </span>
                        )}
                        {isCourseware && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#f4f1eb] text-stone-700 dark:bg-[#202227] dark:text-stone-300 border border-[#e7e4de] dark:border-[#2a2d35]">
                            Official Faculty Courseware
                          </span>
                        )}

                        <span className="text-[11px] font-mono font-medium text-[#1c1917] dark:text-[#f3f4f6] bg-[#f4f1eb] dark:bg-[#202227] px-2 py-0.5 rounded border border-[#e7e4de] dark:border-[#2a2d35]">
                          {mat.subjectCode}
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-base font-semibold text-[#1c1917] dark:text-[#f3f4f6] leading-snug">
                        {mat.title}
                      </h3>

                      <p className="text-xs font-medium text-[#78716c] dark:text-[#9ca3af] mt-1">
                        {getCourseFullName(mat.subjectCode, mat.subject)}
                      </p>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase font-mono bg-[#f4f1eb] dark:bg-[#202227] text-[#78716c] dark:text-[#9ca3af] border border-[#e7e4de] dark:border-[#2a2d35] shrink-0">
                      {mat.fileType} {mat.fileSize && `• ${mat.fileSize}`}
                    </span>
                  </div>

                  {mat.topic && (
                    <p className="text-xs text-[#78716c] dark:text-[#9ca3af] mt-2">
                      Topic / Description: <span className="text-[#1c1917] dark:text-[#f3f4f6] font-medium">{mat.topic}</span>
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#e7e4de] dark:border-[#2a2d35] flex items-center justify-between text-xs">
                  <span className="text-[#78716c] dark:text-[#9ca3af] text-[11px] truncate pr-2">
                    {mat.uploadedBy ? `Uploaded by ${mat.uploadedBy}` : mat.faculty} • {mat.uploadedDate}
                  </span>

                  <div className="flex items-center gap-2 shrink-0">
                    {mat.isShared && mat.uploaderUsername && mat.uploaderUsername === currentUsername && (
                      <button
                        type="button"
                        onClick={() => {
                          setMaterialToDelete(mat);
                          setDeleteError(null);
                        }}
                        aria-label="Delete uploaded resource"
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Delete uploaded resource"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <a
                      href={mat.downloadUrl}
                      download
                      target={mat.downloadUrl.startsWith('http') ? '_blank' : undefined}
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 min-h-[44px] rounded-lg bg-[#1c1917] hover:bg-[#292524] text-white dark:bg-[#f3f4f6] dark:hover:bg-white dark:text-[#141518] font-medium flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
                    >
                      <span>Download</span>
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-10 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] text-center space-y-2">
          <p className="text-sm font-semibold text-[#1c1917] dark:text-[#f3f4f6]">
            No Resources Found
          </p>
          <p className="text-xs text-[#78716c] dark:text-[#9ca3af] max-w-sm mx-auto">
            No study materials or question papers match your current filters. Be the first to upload a resource!
          </p>
        </div>
      )}

      {/* Modal Dialog: Upload Resource */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-material-title"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-in fade-in"
            onClick={() => !uploading && setIsModalOpen(false)}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1b1d22] rounded-xl border border-[#e7e4de] dark:border-[#2a2d35] shadow-2xl p-6 z-10 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#e7e4de] dark:border-[#2a2d35] pb-3">
              <div>
                <h2 id="modal-material-title" className="text-base font-bold text-[#1c1917] dark:text-[#f3f4f6]">
                  Upload Cohort Resource (R3AI)
                </h2>
                <p className="text-xs text-[#78716c] dark:text-[#9ca3af]">
                  Share study notes or previous year questions with your batchmates
                </p>
              </div>
              <button
                disabled={uploading}
                onClick={() => setIsModalOpen(false)}
                aria-label="Close dialog"
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-[#78716c] hover:text-[#1c1917] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Upload Feedback Alerts */}
            {uploadError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-[#14281c] border border-emerald-200 dark:border-[#1e3d29] text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              {/* Category Segmented Control */}
              <div>
                <label className="font-semibold text-[#1c1917] dark:text-[#f3f4f6] block mb-1.5">
                  Resource Category *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadCategory('pyq')}
                    className={`py-2 px-3 rounded-lg font-medium text-center border transition-all ${
                      uploadCategory === 'pyq'
                        ? 'bg-[#1c1917] text-white dark:bg-[#f3f4f6] dark:text-[#141518] border-[#1c1917] dark:border-white font-semibold'
                        : 'bg-white dark:bg-[#202227] text-stone-600 dark:text-stone-300 border-[#e7e4de] dark:border-[#2a2d35]'
                    }`}
                  >
                    Previous Year Question (PYQ)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadCategory('notes')}
                    className={`py-2 px-3 rounded-lg font-medium text-center border transition-all ${
                      uploadCategory === 'notes'
                        ? 'bg-[#1c1917] text-white dark:bg-[#f3f4f6] dark:text-[#141518] border-[#1c1917] dark:border-white font-semibold'
                        : 'bg-white dark:bg-[#202227] text-stone-600 dark:text-stone-300 border-[#e7e4de] dark:border-[#2a2d35]'
                    }`}
                  >
                    Study Notes / Summary
                  </button>
                </div>
              </div>

              {/* Course Selection */}
              <div>
                <label className="font-semibold text-[#1c1917] dark:text-[#f3f4f6] block mb-1">
                  Target Course (Semester 3) *
                </label>
                <select
                  value={uploadSubject}
                  onChange={(e) => setUploadSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35] text-[#1c1917] dark:text-[#f3f4f6] outline-none"
                >
                  {Object.entries(SEMESTER_3_COURSES).map(([code, meta]) => (
                    <option key={code} value={code}>
                      {code} – {meta.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title Input */}
              <div>
                <label className="font-semibold text-[#1c1917] dark:text-[#f3f4f6] block mb-1">
                  Resource Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2024 End-Sem Solved Question Paper with Steps"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35] text-[#1c1917] dark:text-[#f3f4f6] placeholder:text-[#a8a29e] outline-none"
                  required
                />
              </div>

              {/* Topic / Description */}
              <div>
                <label className="font-semibold text-[#1c1917] dark:text-[#f3f4f6] block mb-1">
                  Topic / Summary (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Covers Module 1 & 2 theorems and proofs"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35] text-[#1c1917] dark:text-[#f3f4f6] placeholder:text-[#a8a29e] outline-none"
                />
              </div>

              {/* File Dropzone */}
              <div>
                <label className="font-semibold text-[#1c1917] dark:text-[#f3f4f6] block mb-1">
                  File Attachment (PDF, DOCX, PPTX — Max 25MB) *
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 rounded-xl border border-dashed border-[#d6d2cb] dark:border-[#383c46] bg-[#f9f8f5] dark:bg-[#202227] hover:bg-[#f4f1eb] dark:hover:bg-[#272a32] cursor-pointer text-center space-y-1 transition-colors"
                >
                  <Upload className="w-5 h-5 text-stone-500 dark:text-stone-400 mx-auto" />
                  {selectedFile ? (
                    <div>
                      <p className="font-semibold text-[#1c1917] dark:text-[#f3f4f6]">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-[#78716c] dark:text-[#9ca3af]">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Click to change
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-[#1c1917] dark:text-[#f3f4f6]">
                        Click to select or drop a file here
                      </p>
                      <p className="text-[10px] text-[#78716c] dark:text-[#9ca3af]">
                        Supports PDF, Word (.doc, .docx), and PowerPoint (.ppt, .pptx)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Uploader Preview */}
              <div className="p-2.5 rounded-lg bg-[#f4f1eb] dark:bg-[#202227] text-[11px] text-[#78716c] dark:text-[#9ca3af] flex items-center justify-between">
                <span>Publishing as: <strong className="text-[#1c1917] dark:text-[#f3f4f6] font-semibold">{currentUserName}</strong></span>
                <span className="font-mono text-[10px]">TKMCE R3AI</span>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg font-medium text-stone-600 dark:text-stone-300 hover:bg-[#f4f1eb] dark:hover:bg-[#202227] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile || !uploadTitle}
                  className="px-4 py-2 rounded-lg font-semibold bg-[#1c1917] hover:bg-[#292524] text-white dark:bg-[#f3f4f6] dark:hover:bg-white dark:text-[#141518] disabled:opacity-50 transition-colors shadow-xs"
                >
                  {uploading ? 'Publishing...' : 'Publish to Cohort'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {materialToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-in fade-in"
            onClick={() => !deleting && setMaterialToDelete(null)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-[#1b1d22] rounded-xl border border-[#e7e4de] dark:border-[#2a2d35] shadow-2xl p-6 z-10 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200/60 dark:border-rose-900/40">
                <Trash2 className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#1c1917] dark:text-[#f3f4f6]">
                  Delete Study Resource?
                </h3>
                <p className="text-xs text-[#78716c] dark:text-[#9ca3af] leading-relaxed">
                  Are you sure you want to permanently delete <strong className="text-[#1c1917] dark:text-[#f3f4f6]">{materialToDelete.title}</strong>? This will remove the file from the shared repository.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e7e4de] dark:border-[#2a2d35]">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setMaterialToDelete(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-[#f4f1eb] dark:hover:bg-[#202227] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 transition-colors shadow-xs"
              >
                {deleting ? 'Deleting...' : 'Delete Resource'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
