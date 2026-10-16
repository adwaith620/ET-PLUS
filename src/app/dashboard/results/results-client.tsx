'use client';

import React, { useState } from 'react';
import { SemesterResult } from '@/types';
import { Award, TrendingUp, BookOpen } from 'lucide-react';

interface ResultsClientProps {
  results: SemesterResult[];
}

export function ResultsClient({ results }: ResultsClientProps) {
  const [activeSem, setActiveSem] = useState<number>(results[0]?.semester || 6);

  const selectedResult = results.find((r) => r.semester === activeSem) || results[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Academic Marks & KTU Results
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Internal assessment test scores, continuous evaluations, SGPA, and cumulative CGPA records
        </p>
      </div>

      {/* GPA Highlights Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Cumulative CGPA
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-white block mt-0.5">
              8.78 <span className="text-xs text-slate-400 font-normal">/ 10</span>
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Latest SGPA (S5)
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-white block mt-0.5">
              8.92 <span className="text-xs text-slate-400 font-normal">/ 10</span>
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Credits Earned
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-white block mt-0.5">
              88 <span className="text-xs text-slate-400 font-normal">Credits</span>
            </span>
          </div>
        </div>
      </div>

      {/* Semester Selection Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {results.map((res) => (
          <button
            key={res.semester}
            onClick={() => setActiveSem(res.semester)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeSem === res.semester
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Semester {res.semester} {res.status === 'In Progress' && '(Current)'}
          </button>
        ))}
      </div>

      {/* Selected Semester Grade & Internal Marks Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Semester {selectedResult.semester} Scorecard ({selectedResult.academicYear})
            </h3>
            <p className="text-xs text-slate-400">Status: {selectedResult.status}</p>
          </div>
          {selectedResult.sgpa > 0 && (
            <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-3 py-1 rounded-full self-start sm:self-auto">
              SGPA: {selectedResult.sgpa}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
                <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Course Code</th>
                <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Course Name</th>
                <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-center">Credits</th>
                {selectedResult.status === 'In Progress' ? (
                  <>
                    <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-center">Series 1 (/50)</th>
                    <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-center">Series 2 (/50)</th>
                    <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-center">Assign (/15)</th>
                    <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-center">Attend (/10)</th>
                    <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-center">Total Internal (/50)</th>
                  </>
                ) : (
                  <>
                    <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-center">Grade</th>
                    <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-center">Grade Points</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {selectedResult.subjects.map((sub) => (
                <tr key={sub.code} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="p-3 font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                    {sub.code}
                  </td>
                  <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                    {sub.name}
                  </td>
                  <td className="p-3 text-center font-bold text-slate-700 dark:text-slate-300">
                    {sub.credits}
                  </td>
                  {selectedResult.status === 'In Progress' ? (
                    <>
                      <td className="p-3 text-center text-slate-600 dark:text-slate-400">{sub.internalTest1 ?? '–'}</td>
                      <td className="p-3 text-center text-slate-600 dark:text-slate-400">{sub.internalTest2 ?? '–'}</td>
                      <td className="p-3 text-center text-slate-600 dark:text-slate-400">{sub.assignmentMarks ?? '–'}</td>
                      <td className="p-3 text-center text-slate-600 dark:text-slate-400">{sub.attendanceMarks ?? '–'}</td>
                      <td className="p-3 text-center font-black text-emerald-600 dark:text-emerald-400">
                        {sub.totalInternal ?? '–'}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-3 text-center">
                        <span className="font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
                          {sub.grade}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-slate-700 dark:text-slate-300">
                        {sub.gradePoints}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
