'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { EtlabAssessmentRecord, SemesterResult } from '@/types';
import {
  FileText,
  Layers,
  FolderKanban,
  FileCheck2,
  BookOpen,
  Mic,
  Calculator,
  FlaskConical,
  ExternalLink,
  Eye,
  X,
  CheckCircle2,
  Award,
} from 'lucide-react';

interface ResultsClientProps {
  assessmentRecords?: EtlabAssessmentRecord[];
  results?: SemesterResult[];
  mode?: 'live' | 'demo';
}

const SEMESTERS = ['IIIrd Semester', 'IInd Semester', 'Ist Semester'] as const;
type SemesterOption = typeof SEMESTERS[number];

const CATEGORIES: { label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { label: 'Sessional Exams', icon: FileText },
  { label: 'Module Test', icon: Layers },
  { label: 'Class Projects', icon: FolderKanban },
  { label: 'Assignments', icon: FileCheck2 },
  { label: 'Tutorials', icon: BookOpen },
  { label: 'Seminars', icon: Mic },
  { label: 'Internal Marks', icon: Calculator },
  { label: 'Lab Evaluation', icon: FlaskConical },
  { label: 'Lab Internal Test', icon: FlaskConical },
];

export function ResultsClient({
  assessmentRecords = [],
  results = [],
}: ResultsClientProps) {
  const [selectedSem, setSelectedSem] = useState<SemesterOption>('IIIrd Semester');
  const [selectedCategory, setSelectedCategory] = useState<string>('Sessional Exams');
  const [selectedRecord, setSelectedRecord] = useState<EtlabAssessmentRecord | null>(null);

  // Filter records by selected semester and category
  const filteredRecords = assessmentRecords.filter(
    (rec) => rec.semester === selectedSem && rec.category === selectedCategory
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* 1. Breadcrumb navigation: Home > Results */}
      <nav className="flex items-center gap-2 text-xs text-[#78716c] dark:text-[#9ca3af]">
        <Link
          href="/dashboard"
          className="hover:text-[#1c1917] dark:hover:text-[#f3f4f6] transition-colors"
        >
          Home
        </Link>
        <span>&gt;</span>
        <span className="text-[#1c1917] dark:text-[#f3f4f6] font-medium">Results</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1c1917] dark:text-[#f3f4f6]">
            Results
          </h1>
          <p className="text-xs text-[#78716c] dark:text-[#9ca3af] mt-1">
            Continuous internal evaluations, sessional series tests, lab practicals, and coursework marks
          </p>
        </div>

        <a
          href="https://tkmce.etlab.in/student/results"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1c1917] hover:bg-[#292524] text-white dark:bg-[#f3f4f6] dark:hover:bg-white dark:text-[#141518] transition-colors shadow-xs self-start sm:self-auto"
        >
          <span>Open ETLAB Portal</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* 2. Centered Semester Selector */}
      <div className="flex justify-center items-center py-1">
        <div className="inline-flex items-center bg-[#f4f1eb] dark:bg-[#202227] p-1 rounded-xl border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs">
          {SEMESTERS.map((sem) => (
            <button
              key={sem}
              onClick={() => setSelectedSem(sem)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedSem === sem
                  ? 'bg-white dark:bg-[#1b1d22] text-[#1c1917] dark:text-[#f3f4f6] shadow-xs'
                  : 'text-[#78716c] dark:text-[#9ca3af] hover:text-[#1c1917] dark:hover:text-[#f3f4f6]'
              }`}
            >
              {sem}
            </button>
          ))}
        </div>
      </div>

      {/* 3. 9 Category Tabs with Icons */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs scrollbar-none">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.label;
          return (
            <button
              key={cat.label}
              onClick={() => setSelectedCategory(cat.label)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#1c1917] text-white dark:bg-[#f3f4f6] dark:text-[#141518] shadow-xs font-semibold'
                  : 'text-[#78716c] dark:text-[#9ca3af] hover:bg-[#f4f1eb] dark:hover:bg-[#202227]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Total count indicator: "Total X results." */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-[#78716c] dark:text-[#9ca3af]">
          Total <strong className="text-[#1c1917] dark:text-[#f3f4f6]">{filteredRecords.length}</strong> results.
        </p>
      </div>

      {/* 5. Main Results Table */}
      <div className="overflow-x-auto rounded-xl border border-[#e7e4de] dark:border-[#2a2d35] bg-white dark:bg-[#1b1d22] shadow-xs animate-fade-in-up animate-delay-1">
        <table className="w-full text-xs text-left border-collapse min-w-[780px]">
          <thead>
            <tr className="bg-[#f9f8f5] dark:bg-[#181a1f] border-b border-[#e7e4de] dark:border-[#2a2d35]">
              <th className="p-3.5 font-semibold text-[#78716c] dark:text-[#9ca3af] uppercase tracking-wider text-[11px]">
                SUBJECT
              </th>
              <th className="p-3.5 font-semibold text-[#78716c] dark:text-[#9ca3af] uppercase tracking-wider text-[11px] whitespace-nowrap">
                SEMESTER
              </th>
              <th className="p-3.5 font-semibold text-[#78716c] dark:text-[#9ca3af] uppercase tracking-wider text-[11px] whitespace-nowrap">
                EXAM
              </th>
              <th className="p-3.5 font-semibold text-[#78716c] dark:text-[#9ca3af] uppercase tracking-wider text-right text-[11px] whitespace-nowrap">
                MAXIMUM MARKS
              </th>
              <th className="p-3.5 font-semibold text-[#78716c] dark:text-[#9ca3af] uppercase tracking-wider text-right text-[11px] whitespace-nowrap">
                MARKS OBTAINED
              </th>
              <th className="p-3.5 font-semibold text-[#78716c] dark:text-[#9ca3af] uppercase tracking-wider text-center text-[11px] whitespace-nowrap">
                VIEW RESPONSE
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e7e4de] dark:divide-[#2a2d35]">
            {filteredRecords.length > 0 ? (
              filteredRecords.map((rec) => (
                <tr
                  key={rec.id}
                  className="hover:bg-[#fdfcfb] dark:hover:bg-[#202227]/50 transition-colors"
                >
                  <td className="p-3.5 font-medium text-[#1c1917] dark:text-[#f3f4f6]">
                    <span className="font-mono font-semibold">{rec.subjectCode}</span> - {rec.subjectName}
                  </td>
                  <td className="p-3.5 text-[#78716c] dark:text-[#9ca3af] whitespace-nowrap">
                    {rec.semester}
                  </td>
                  <td className="p-3.5 font-medium text-[#1c1917] dark:text-[#f3f4f6] whitespace-nowrap">
                    {rec.examName}
                  </td>
                  <td className="p-3.5 text-right font-mono text-[#78716c] dark:text-[#9ca3af]">
                    {rec.maxMarks}
                  </td>
                  <td className="p-3.5 text-right font-mono font-bold text-[#1c1917] dark:text-[#f3f4f6]">
                    {rec.obtainedMarks}
                  </td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => setSelectedRecord(rec)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-[#f4f1eb] dark:bg-[#202227] hover:bg-[#e7e4de] dark:hover:bg-[#2a2d35] text-[#1c1917] dark:text-[#f3f4f6] border border-[#e7e4de] dark:border-[#2a2d35] transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#78716c] dark:text-[#9ca3af]" />
                      <span>View Response</span>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-10 text-center text-[#78716c] dark:text-[#9ca3af] space-y-2">
                  <p className="font-medium text-[#1c1917] dark:text-[#f3f4f6]">
                    No records found for {selectedCategory} in {selectedSem}.
                  </p>
                  <p className="text-xs text-[#a8a29e] dark:text-[#6b7280]">
                    Evaluations will appear here once published by the academic department.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 6. View Response Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[#e7e4de] dark:border-[#2a2d35] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-[#1c1917] dark:text-[#f3f4f6]">
                  Assessment Response Sheet
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-md text-[#78716c] dark:text-[#9ca3af] hover:bg-[#f4f1eb] dark:hover:bg-[#202227]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#78716c] dark:text-[#9ca3af] block">
                  Course
                </span>
                <p className="text-sm font-semibold text-[#1c1917] dark:text-[#f3f4f6] mt-0.5">
                  {selectedRecord.subjectCode} — {selectedRecord.subjectName}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-[#f9f8f5] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#282b33]">
                  <span className="text-[10px] text-[#78716c] dark:text-[#9ca3af] block">Examination</span>
                  <span className="text-xs font-bold text-[#1c1917] dark:text-[#f3f4f6] mt-0.5 block">
                    {selectedRecord.examName}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#f9f8f5] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#282b33]">
                  <span className="text-[10px] text-[#78716c] dark:text-[#9ca3af] block">Semester</span>
                  <span className="text-xs font-bold text-[#1c1917] dark:text-[#f3f4f6] mt-0.5 block">
                    {selectedRecord.semester}
                  </span>
                </div>
              </div>

              {/* Score Display Card */}
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium block">
                    Marks Obtained
                  </span>
                  <span className="text-2xl font-extrabold text-emerald-800 dark:text-emerald-300 font-mono">
                    {selectedRecord.obtainedMarks} <span className="text-sm font-normal text-emerald-700/80 dark:text-emerald-400/80">/ {selectedRecord.maxMarks}</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 block">
                    {((selectedRecord.obtainedMarks / selectedRecord.maxMarks) * 100).toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1 justify-end mt-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Evaluated & Verified
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#f9f8f5] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#282b33] text-xs text-[#78716c] dark:text-[#9ca3af] space-y-1">
                <p className="font-semibold text-[#1c1917] dark:text-[#f3f4f6]">Official Evaluation Verification:</p>
                <p>
                  Marks awarded and entered directly into the institutional examination records by the course faculty. All evaluation keys and rubrics verified by the department academic committee.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[#e7e4de] dark:border-[#2a2d35] flex items-center justify-between bg-[#f9f8f5] dark:bg-[#181a1f]">
              <a
                href={selectedRecord.viewResponseUrl || 'https://tkmce.etlab.in/student/results'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-[#1c1917] dark:text-[#f3f4f6] hover:underline flex items-center gap-1"
              >
                <span>View on ETLAB Portal</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <button
                onClick={() => setSelectedRecord(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1c1917] hover:bg-[#292524] text-white dark:bg-[#f3f4f6] dark:hover:bg-white dark:text-[#141518] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
