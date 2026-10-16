import React from 'react';
import { getDashboardData } from '@/lib/data-service';
import {
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

export default async function ProfilePage() {
  const data = await getDashboardData(75);
  if (!data) return null;

  const { profile, mode } = data;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Student Profile
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Official academic enrollment record from TKM College of Engineering
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        {/* User Identity Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-3xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
            {profile.name ? profile.name.charAt(0) : 'S'}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                {profile.name}
              </h2>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  mode === 'live'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400'
                }`}
              >
                {mode === 'live' ? 'Verified ETLAB' : 'Demo Profile'}
              </span>
            </div>
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              {profile.programme}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {profile.institution}
            </p>
          </div>
        </div>

        {/* Academic Details Grid */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Academic Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 block">University Reg. No</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                {profile.registerNo}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 block">Admission Number</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                {profile.admissionNo}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 block">Roll Number</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {profile.rollNo || '–'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 block">Department</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {profile.department}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 block">Current Semester</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                Semester {profile.semester}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 block">Academic Batch</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {profile.batch} ({profile.academicYear})
              </span>
            </div>
          </div>
        </div>

        {/* Personal Details Grid */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Personal & Contact Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 block">Date of Birth / Gender</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {profile.dob || '–'} • {profile.gender || '–'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 block">Institutional Email</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {profile.email || '–'}
              </span>
            </div>
          </div>
        </div>

        {/* Read-only verification notice */}
        <div className="p-4 rounded-xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Profile records are read-only and synchronized from original ETLAB.</span>
          </div>
          <a
            href="https://tkmce.etlab.in/student/profile"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline flex items-center gap-1 font-semibold shrink-0"
          >
            <span>ETLAB Source</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
