'use client';

import React, { useState } from 'react';
import { StudyMaterial } from '@/types';
import {
  Search,
  Download,
} from 'lucide-react';

interface MaterialsClientProps {
  materials: StudyMaterial[];
}

export function MaterialsClient({ materials }: MaterialsClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');

  const subjects = Array.from(new Set(materials.map((m) => m.subjectCode)));

  const filtered = materials.filter((mat) => {
    const matchesSearch =
      mat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mat.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mat.faculty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mat.topic?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedSubject === 'ALL') return true;
    return mat.subjectCode === selectedSubject;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Course Study Materials
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Lecture slides, question banks, syllabi, and lab manuals uploaded by department faculties
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search materials by topic, notes title, or faculty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Subjects</option>
          {subjects.map((sub) => (
            <option key={sub} value={sub}>
              {sub}
            </option>
          ))}
        </select>
      </div>

      {/* Materials Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((mat) => (
          <div
            key={mat.id}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                    {mat.subjectCode}
                  </span>
                  <span className="text-xs text-slate-400 truncate">{mat.subject}</span>
                </div>

                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {mat.fileType} {mat.fileSize && `• ${mat.fileSize}`}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-2 leading-snug">
                {mat.title}
              </h3>

              {mat.topic && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Topic: <strong className="text-slate-700 dark:text-slate-300">{mat.topic}</strong>
                </p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">
                {mat.faculty} • {mat.uploadedDate}
              </span>

              <a
                href={mat.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-100 dark:hover:bg-blue-900/60 flex items-center gap-1.5 transition-colors"
              >
                <span>Download</span>
                <Download className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
