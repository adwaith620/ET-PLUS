'use client';

import React, { useState } from 'react';
import { Assignment } from '@/types';
import {
  Calendar,
  ExternalLink,
  Award,
  Search,
} from 'lucide-react';

interface AssignmentsClientProps {
  assignments: Assignment[];
}

export function AssignmentsClient({ assignments }: AssignmentsClientProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = assignments.filter((asg) => {
    const matchesSearch =
      asg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asg.subjectCode.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === 'all') return true;
    return asg.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Assignments & Submissions
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track coursework deadlines, evaluation rubrics, and submission status
          </p>
        </div>

        <a
          href="https://tkmce.etlab.in/student/assignments"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm shadow-blue-500/20 self-start sm:self-auto"
        >
          <span>Open in ETLAB Portal</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search assignments by title or course..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'pending', label: 'Pending' },
            { id: 'submitted', label: 'Submitted' },
            { id: 'graded', label: 'Graded' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as typeof filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        {filtered.map((asg) => {
          const isPending = asg.status === 'pending';
          const isSubmitted = asg.status === 'submitted';
          const isGraded = asg.status === 'graded';

          return (
            <div
              key={asg.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                        {asg.subjectCode}
                      </span>
                      <span className="text-xs text-slate-400">{asg.subject}</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">
                      {asg.title}
                    </h3>
                  </div>

                  <span
                    className={`self-start sm:self-auto px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                      isPending
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                        : isSubmitted
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                    }`}
                  >
                    {asg.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed">
                  {asg.description}
                </p>
              </div>

              {/* Card Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-4 text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Due: <strong className="text-slate-700 dark:text-slate-200">{asg.dueDate}</strong>
                  </span>
                  <span>Faculty: {asg.faculty}</span>
                </div>

                <div className="flex items-center gap-3">
                  {isGraded && (
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" />
                      Score: {asg.obtainedMarks} / {asg.maxMarks}
                    </span>
                  )}
                  <a
                    href={asg.externalUrl || 'https://tkmce.etlab.in/student/assignments'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
                  >
                    <span>View on ETLAB</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
