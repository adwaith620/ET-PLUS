import React from 'react';
import { getProfilePageData } from '@/lib/data-service';
import {
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

export default async function ProfilePage() {
  const data = await getProfilePageData();
  if (!data) return null;

  const { profile, mode } = data;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1c1917] dark:text-[#f3f4f6]">
          Student Profile
        </h1>
        <p className="text-xs text-[#78716c] dark:text-[#9ca3af] mt-1">
          Official academic enrollment record from TKM College of Engineering
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="p-6 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs space-y-6">
        {/* User Identity Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-6 border-b border-[#e7e4de] dark:border-[#2a2d35]">
          <div className="w-14 h-14 rounded-xl bg-[#f4f1eb] dark:bg-[#202227] text-[#1c1917] dark:text-[#f3f4f6] font-bold text-xl flex items-center justify-center border border-[#e7e4de] dark:border-[#2a2d35] shrink-0">
            {profile.name ? profile.name.charAt(0) : 'S'}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#1c1917] dark:text-[#f3f4f6]">
                {profile.name}
              </h2>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded border border-[#e7e4de] dark:border-[#2a2d35] uppercase tracking-wider ${
                  mode === 'live'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-[#f4f1eb] text-[#1c1917] dark:bg-[#202227] dark:text-[#f3f4f6]'
                }`}
              >
                {mode === 'live' ? 'Verified ETLAB' : 'Demo Profile'}
              </span>
            </div>
            <p className="text-xs font-medium text-[#44403c] dark:text-[#d1d5db]">
              {profile.programme}
            </p>
            <p className="text-xs text-[#78716c] dark:text-[#9ca3af]">
              {profile.institution}
            </p>
          </div>
        </div>

        {/* Academic Details Grid */}
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#78716c] dark:text-[#9ca3af] mb-3">
            Academic Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-lg bg-[#fdfcfb] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35]">
              <span className="text-[11px] font-medium text-[#78716c] dark:text-[#9ca3af] block">University Reg. No</span>
              <span className="text-xs font-semibold text-[#1c1917] dark:text-[#f3f4f6] font-mono mt-0.5 block">
                {profile.registerNo}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-[#fdfcfb] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35]">
              <span className="text-[11px] font-medium text-[#78716c] dark:text-[#9ca3af] block">Admission Number</span>
              <span className="text-xs font-semibold text-[#1c1917] dark:text-[#f3f4f6] font-mono mt-0.5 block">
                {profile.admissionNo}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-[#fdfcfb] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35]">
              <span className="text-[11px] font-medium text-[#78716c] dark:text-[#9ca3af] block">Department</span>
              <span className="text-xs font-semibold text-[#1c1917] dark:text-[#f3f4f6] mt-0.5 block">
                {profile.department}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-[#fdfcfb] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35]">
              <span className="text-[11px] font-medium text-[#78716c] dark:text-[#9ca3af] block">Current Semester</span>
              <span className="text-xs font-semibold text-[#1c1917] dark:text-[#f3f4f6] mt-0.5 block">
                Semester {profile.semester}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-[#fdfcfb] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35] sm:col-span-2 lg:col-span-2">
              <span className="text-[11px] font-medium text-[#78716c] dark:text-[#9ca3af] block">Academic Batch</span>
              <span className="text-xs font-semibold text-[#1c1917] dark:text-[#f3f4f6] mt-0.5 block">
                {profile.batch} ({profile.academicYear})
              </span>
            </div>
          </div>
        </div>

        {/* Personal Details Grid */}
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#78716c] dark:text-[#9ca3af] mb-3">
            Personal & Contact Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-lg bg-[#fdfcfb] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35]">
              <span className="text-[11px] font-medium text-[#78716c] dark:text-[#9ca3af] block">Date of Birth / Gender</span>
              <span className="text-xs font-semibold text-[#1c1917] dark:text-[#f3f4f6] mt-0.5 block">
                {profile.dob || '–'} • {profile.gender || '–'}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-[#fdfcfb] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35]">
              <span className="text-[11px] font-medium text-[#78716c] dark:text-[#9ca3af] block">Institutional Email</span>
              <span className="text-xs font-semibold text-[#1c1917] dark:text-[#f3f4f6] mt-0.5 block">
                {profile.email || '–'}
              </span>
            </div>
          </div>
        </div>

        {/* Read-only verification notice */}
        <div className="p-3.5 rounded-lg bg-[#f9f8f5] dark:bg-[#181a1f] border border-[#e7e4de] dark:border-[#2a2d35] flex items-center justify-between text-xs text-[#78716c] dark:text-[#9ca3af]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Profile records are read-only and synchronized from original ETLAB.</span>
          </div>
          <a
            href="https://tkmce.etlab.in/student/profile"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#1c1917] dark:text-[#f3f4f6] hover:underline flex items-center gap-1 font-medium shrink-0"
          >
            <span>ETLAB Source</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#78716c] dark:text-[#9ca3af]" />
          </a>
        </div>
      </div>
    </div>
  );
}
