import React from 'react';
import Link from 'next/link';
import { getDashboardData } from '@/lib/data-service';
import {
  FolderDown,
  BellRing,
  ArrowRight,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

export default async function DashboardOverviewPage() {
  const data = await getDashboardData(75);
  if (!data) return null;

  const { profile, attendance, timetable, assignments, materials, announcements, mode, lastSynced } = data;

  const shortageCourses = attendance.subjects.filter((s) => s.percentage < 75);
  const pendingAssignments = assignments.filter((a) => a.status === 'pending');

  // Today's day name (or default to Monday for demonstration on weekends)
  const currentDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const activeDay = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(currentDayName)
    ? currentDayName
    : 'Monday';

  const todayClasses = timetable
    .filter((slot) => slot.day === activeDay)
    .sort((a, b) => a.period - b.period);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
              {profile.department}
            </span>
            <span className="text-xs font-semibold text-blue-100">
              Semester {profile.semester} • Batch {profile.batch}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {profile.name}!
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-xl">
            {profile.institution} • Reg No: <span className="font-mono font-semibold">{profile.registerNo}</span>
          </p>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end gap-2 text-right">
          <span className="text-[11px] font-semibold bg-white/10 px-3 py-1 rounded-xl backdrop-blur-sm">
            Mode: <strong className="uppercase">{mode}</strong>
          </span>
          <span className="text-[11px] text-blue-200">
            Synced: {lastSynced}
          </span>
        </div>
      </div>

      {/* Attendance Shortage Warning Banner (if applicable) */}
      {shortageCourses.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold">
                Attendance Shortage Alert in {shortageCourses.length} course{shortageCourses.length > 1 ? 's' : ''}
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                {shortageCourses.map((c) => `${c.code} (${c.percentage}%)`).join(', ')} is currently below the 75% KTU minimum.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/attendance"
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-colors"
          >
            Open Attendance Simulator →
          </Link>
        </div>
      )}

      {/* Top 3 Core Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Attendance Ring Quick Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Overall Attendance
            </span>
            <Link
              href="/dashboard/attendance"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
            >
              Analyze <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="my-4 flex items-center justify-between">
            <div>
              <span className="text-4xl font-black text-slate-900 dark:text-white">
                {attendance.overallPercentage}%
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                {attendance.totalAttended} attended of {attendance.totalConducted} hrs
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                attendance.overallPercentage >= 75
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
              }`}
            >
              {attendance.overallPercentage >= 75 ? 'On Track' : 'Shortage'}
            </span>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Target: 75%</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {attendance.safeBunks > 0 ? `Can bunk ${attendance.safeBunks} classes` : 'Attend all classes'}
            </span>
          </div>
        </div>

        {/* Today's Schedule Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Schedule ({activeDay})
            </span>
            <Link
              href="/dashboard/timetable"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
            >
              Full Timetable <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="my-3 space-y-2">
            {todayClasses.slice(0, 3).map((slot) => (
              <div
                key={slot.period}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                    P{slot.period}
                  </span>
                  <div className="min-w-0 truncate">
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{slot.subjectName}</p>
                    <p className="text-[10px] text-slate-400">{slot.room} • {slot.startTime}</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 shrink-0">{slot.subjectCode}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
            {todayClasses.length} conducted periods scheduled today
          </div>
        </div>

        {/* Assignments Quick Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Pending Tasks
            </span>
            <Link
              href="/dashboard/assignments"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
            >
              All Assignments <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="my-3 space-y-2">
            {pendingAssignments.slice(0, 2).map((asg) => (
              <div
                key={asg.id}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1"
              >
                <p className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                  {asg.title}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{asg.subjectCode}</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">Due: {asg.dueDate}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
            {pendingAssignments.length} assignments awaiting submission
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Announcements & Recent Materials */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Announcements */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellRing className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Official Announcements
              </h3>
            </div>
            <Link
              href="/dashboard/announcements"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {announcements.slice(0, 3).map((ann) => (
              <div
                key={ann.id}
                className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-[10px] uppercase px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                    {ann.category}
                  </span>
                  <span className="text-slate-400">{ann.date}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 line-clamp-1">
                  {ann.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                  {ann.content}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Study Materials */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderDown className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Course Study Materials
              </h3>
            </div>
            <Link
              href="/dashboard/materials"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {materials.slice(0, 3).map((mat) => (
              <div
                key={mat.id}
                className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                    <span className="text-blue-600 dark:text-blue-400">{mat.subjectCode}</span>
                    <span>• {mat.uploadedDate}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                    {mat.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {mat.faculty} • {mat.topic}
                  </p>
                </div>

                <a
                  href={mat.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 shrink-0"
                >
                  <span>{mat.fileType.toUpperCase()}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
