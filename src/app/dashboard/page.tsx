import React from 'react';
import Link from 'next/link';
import { getDashboardData } from '@/lib/data-service';
import { getCourseFullName } from '@/lib/course-catalog';
import {
  FolderDown,
  ArrowRight,
  AlertTriangle,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { OverviewRadialGauge } from '@/components/dashboard/overview-radial-gauge';
import { isUpcomingAssignment, getDeadlineCountdown } from '@/lib/assignment-utils';

export const metadata = {
  title: 'Overview',
};

export default async function DashboardOverviewPage() {
  const data = await getDashboardData();
  if (!data) return null;

  const { profile, attendance, timetable, assignments, materials, mode, lastSynced, targetPercentage } = data;

  const activeTarget = targetPercentage || 75;
  const shortageCourses = attendance.subjects.filter((s) => s.percentage < activeTarget);

  const currentDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const activeDay = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(currentDayName)
    ? currentDayName
    : 'Monday';

  const todayClasses = timetable
    .filter((slot) => slot.day === activeDay)
    .sort((a, b) => a.period - b.period);

  const isSafe = attendance.overallPercentage >= activeTarget;
  const isWarning = !isSafe && attendance.overallPercentage >= activeTarget - 5;

  // Filter strictly for upcoming assignments whose deadlines are in the future and not yet submitted
  const upcomingAssignments = assignments.filter((a) => isUpcomingAssignment(a));

  return (
    <div className="space-y-6">
      {/* Editorial Student Welcome Banner */}
      <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#f4f1eb] dark:bg-[#23262c] text-stone-800 dark:text-stone-200 border border-[#e7e4de] dark:border-[#2f323c]">
              {profile.department}
            </span>
            <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
              Semester {profile.semester} • Batch {profile.batch}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Welcome back, {profile.name}
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            {profile.institution} • Reg No: <span className="font-mono text-stone-700 dark:text-stone-300">{profile.registerNo}</span> • Email: <span className="font-mono text-stone-700 dark:text-stone-300">{profile.email}</span>
          </p>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end gap-1.5 text-right shrink-0">
          <span className="text-[11px] font-medium px-2.5 py-1 rounded bg-[#f7f6f3] dark:bg-[#23262c] text-stone-600 dark:text-stone-400 border border-[#e7e4de] dark:border-[#2a2d35]">
            Mode: <strong className="uppercase font-semibold text-stone-800 dark:text-stone-200">{mode}</strong>
          </span>
          <span className="text-[10px] text-stone-400 font-mono">
            Synced {lastSynced}
          </span>
        </div>
      </div>

      {/* Attendance Shortage Alert */}
      {shortageCourses.length > 0 && (
        <div className="p-3.5 rounded-lg bg-[#fef9ed] dark:bg-[#251e12] border border-[#fde5a5] dark:border-[#423519] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-stone-900 dark:text-stone-100">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-amber-900 dark:text-amber-300">
                Attendance Shortage in {shortageCourses.length} course{shortageCourses.length > 1 ? 's' : ''} (Target: {activeTarget}%)
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-400/90 mt-0.5">
                {shortageCourses.map((c) => `${c.code}: ${getCourseFullName(c.code, c.name)} (${c.percentage}%)`).join(' • ')}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/attendance"
            className="px-3 py-1.5 rounded-md bg-[#b45309] hover:bg-[#92400e] dark:bg-[#fbbf24] dark:hover:bg-[#f59e0b] text-white dark:text-stone-900 text-xs font-semibold shrink-0 transition-colors"
          >
            Review Simulation →
          </Link>
        </div>
      )}

      {/* Hero 2-Column Section: Left = Assignments | Right = Attendance Radial */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column: Assignments */}
        <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#e7e4de] dark:border-[#2a2d35]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-stone-600 dark:text-stone-400" />
                <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
                  Upcoming Assignments
                </h3>
                {upcomingAssignments.length > 0 && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-[#2b2210] text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-[#423519]">
                    {upcomingAssignments.length} Due
                  </span>
                )}
              </div>
              <Link
                href="/dashboard/assignments"
                className="text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {upcomingAssignments.length > 0 ? (
                upcomingAssignments.slice(0, 3).map((asg) => {
                  const countdown = getDeadlineCountdown(asg.dueDate);
                  const fullCourseName = getCourseFullName(asg.subjectCode, asg.subject);

                  return (
                    <div
                      key={asg.id}
                      className="p-3.5 rounded-lg bg-[#f9f8f5] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#282b33] flex flex-col justify-between gap-2.5 transition-colors hover:border-stone-400 dark:hover:border-stone-600"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-white dark:bg-[#18191d] border border-[#e7e4de] dark:border-[#2c2f37] text-stone-700 dark:text-stone-300 shrink-0">
                              {asg.subjectCode}
                            </span>
                            <span className="text-xs font-medium text-stone-500 dark:text-stone-400 truncate">
                              {fullCourseName}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-medium text-stone-500 dark:text-stone-400 bg-white dark:bg-[#18191d] px-1.5 py-0.5 rounded border border-[#e7e4de] dark:border-[#2a2d35]">
                              {asg.submissionMode || 'Submission mode not specified'}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded border shrink-0 flex items-center gap-1 bg-amber-50 text-amber-800 border-amber-200 dark:bg-[#2b2210] dark:text-amber-400 dark:border-[#423519]">
                              <Clock className="w-3 h-3" />
                              <span>{countdown.text}</span>
                            </span>
                          </div>
                        </div>

                        <h4 className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 mt-1.5 leading-snug">
                          {asg.title}
                        </h4>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5">
                          {asg.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-[#eae7e1] dark:border-[#292c35] flex items-center justify-between text-xs">
                        <span className="text-[11px] text-stone-500 dark:text-stone-400">
                          Due: <strong className="text-stone-800 dark:text-stone-200">{asg.dueDate}</strong>
                          {asg.maxMarks && <> • Max: <strong className="text-stone-800 dark:text-stone-200">{asg.maxMarks}</strong></>}
                        </span>
                        <Link
                          href={`/dashboard/assignments`}
                          className="px-2.5 py-1 rounded bg-white dark:bg-[#18191d] border border-[#e7e4de] dark:border-[#2a2d35] hover:bg-[#f4f1eb] dark:hover:bg-[#272a31] text-[11px] font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1 transition-colors"
                        >
                          <span>Details</span>
                          <ArrowRight className="w-3 h-3 text-stone-400" />
                        </Link>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 rounded-lg bg-[#f9f8f5] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#282b33] text-center space-y-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                    No Upcoming Assignment Deadlines
                  </h4>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 max-w-xs mx-auto">
                    All coursework submissions for Semester 3 are currently up to date.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#e7e4de] dark:border-[#2a2d35] flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
            <span>{upcomingAssignments.length > 0 ? `${upcomingAssignments.length} upcoming submission${upcomingAssignments.length === 1 ? '' : 's'}` : 'No pending submissions'}</span>
            <Link href="/dashboard/assignments" className="font-semibold text-stone-800 dark:text-stone-200 hover:underline">
              Open assignments inbox →
            </Link>
          </div>
        </div>

        {/* Right Column: Attendance Overview with Enlarged Radial Gauge */}
        <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#e7e4de] dark:border-[#2a2d35]">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-stone-600 dark:text-stone-400" />
                <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
                  Attendance Overview
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                  Target: <strong className="text-stone-800 dark:text-stone-200">{activeTarget}%</strong>
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                    isSafe
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-[#14281c] dark:text-emerald-400 dark:border-[#1e3d29]'
                      : isWarning
                      ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-[#2b2210] dark:text-amber-400 dark:border-[#423519]'
                      : 'bg-red-50 text-red-800 border-red-200 dark:bg-[#2c1618] dark:text-red-400 dark:border-[#441f23]'
                  }`}
                >
                  {isSafe ? 'Eligible' : isWarning ? 'Warning' : 'Shortage'}
                </span>
              </div>
            </div>

            {/* Noticeably Larger Circular Radial Gauge */}
            <div className="py-4 flex flex-col items-center justify-center">
              <OverviewRadialGauge
                percentage={attendance.overallPercentage}
                targetPercentage={activeTarget}
                attended={attendance.totalAttended}
                total={attendance.totalConducted}
              />
            </div>

            {/* Attended & Conducted Hours Grid Below the Chart */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 rounded-lg bg-[#f9f8f5] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#282b33]">
                <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">Attended Hours</span>
                <span className="text-base font-bold text-stone-900 dark:text-stone-100 mt-0.5 block">{attendance.totalAttended} hrs</span>
              </div>
              <div className="p-3 rounded-lg bg-[#f9f8f5] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#282b33]">
                <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">Conducted Hours</span>
                <span className="text-base font-bold text-stone-900 dark:text-stone-100 mt-0.5 block">{attendance.totalConducted} hrs</span>
              </div>
            </div>

            {/* Safe-absence summary beneath those figures */}
            <div className="mt-3 p-3.5 rounded-lg bg-[#f9f8f5] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#282b33]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                  {isSafe ? 'Safe Absence Cushion' : 'Classes Required to Recover'}
                </span>
                <span
                  className={`text-xs font-bold ${
                    isSafe ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {isSafe ? `${attendance.safeBunks} classes` : `${attendance.classesToRecover} classes`}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                {isSafe
                  ? `You can safely miss ${attendance.safeBunks} more classes while maintaining ≥${activeTarget}%.`
                  : `Must attend next ${attendance.classesToRecover} consecutive classes to restore ${activeTarget}%.`}
              </p>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#e7e4de] dark:border-[#2a2d35] flex items-center justify-between gap-3">
            <span className="text-xs text-stone-500 dark:text-stone-400">
              KTU minimum requirement: <strong>75%</strong>
            </span>
            <Link
              href="/dashboard/attendance"
              className="px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white dark:bg-[#f3f4f6] dark:hover:bg-white dark:text-stone-900 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <span>Analyze Attendance</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Timetable Table Section */}
      <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#e7e4de] dark:border-[#2a2d35]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-stone-600 dark:text-stone-400" />
            <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
              Today&apos;s Academic Schedule ({activeDay})
            </h3>
            <span className="text-xs text-stone-400 font-medium">• Semester 3</span>
          </div>
          <Link
            href="/dashboard/timetable"
            className="text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white flex items-center gap-1 transition-colors self-start sm:self-auto"
          >
            <span>Full Weekly Timetable</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {todayClasses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e7e4de] dark:border-[#2a2d35] text-stone-500 dark:text-stone-400 bg-[#f9f8f5] dark:bg-[#18191d]">
                  <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-[10px]">Period</th>
                  <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-[10px]">Time</th>
                  <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-[10px]">Course Code</th>
                  <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-[10px]">Course Name</th>
                  <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-[10px]">Faculty</th>
                  <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-[10px]">Room</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#efece6] dark:divide-[#262831]">
                {todayClasses.map((slot) => {
                  const fullCourseName = getCourseFullName(slot.subjectCode, slot.subjectName);

                  return (
                    <tr
                      key={slot.period}
                      className="hover:bg-[#fbfaf8] dark:hover:bg-[#202228] transition-colors"
                    >
                      <td className="py-3 px-3 font-semibold text-stone-900 dark:text-stone-100 font-mono">
                        <span className="w-6 h-6 rounded-full bg-[#f4f1eb] dark:bg-[#252830] border border-[#e7e4de] dark:border-[#2c2f37] inline-flex items-center justify-center text-[11px]">
                          {slot.period}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-stone-600 dark:text-stone-300 whitespace-nowrap">
                        {slot.startTime} – {slot.endTime}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <span className="px-2 py-0.5 rounded bg-[#f4f1eb] dark:bg-[#22252c] text-stone-700 dark:text-stone-300 border border-[#e7e4de] dark:border-[#2c2f37] font-semibold text-[11px]">
                          {slot.subjectCode}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-stone-900 dark:text-stone-100">
                        {fullCourseName}
                      </td>
                      <td className="py-3 px-3 text-stone-600 dark:text-stone-400">
                        {slot.faculty}
                      </td>
                      <td className="py-3 px-3 font-mono text-stone-600 dark:text-stone-300">
                        <span className="px-1.5 py-0.5 rounded bg-[#f7f6f3] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#2a2d35]">
                          {slot.room}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-stone-500">
            No classes scheduled for {activeDay}. Enjoy your break or study time.
          </div>
        )}
      </div>

      {/* Recent Study Materials Preview */}
      <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#1b1d22] border border-[#e7e4de] dark:border-[#2a2d35] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#e7e4de] dark:border-[#2a2d35]">
          <div className="flex items-center gap-2">
            <FolderDown className="w-4 h-4 text-stone-600 dark:text-stone-400" />
            <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
              Recent Course Study Materials
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f4f1eb] dark:bg-[#252830] text-stone-700 dark:text-stone-300 border border-[#e7e4de] dark:border-[#2c2f37]">
              Semester 3
            </span>
          </div>
          <Link
            href="/dashboard/materials"
            className="text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>Browse repository</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {materials.slice(0, 6).map((mat) => {
            const fullCourseName = getCourseFullName(mat.subjectCode, mat.subject);

            return (
              <div
                key={mat.id}
                className="p-3.5 rounded-lg bg-[#f9f8f5] dark:bg-[#202227] border border-[#e7e4de] dark:border-[#272a31] flex flex-col justify-between gap-3 hover:border-stone-400 dark:hover:border-stone-600 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-[10px] font-medium text-stone-500 dark:text-stone-400">
                    <span className="font-mono font-semibold text-stone-700 dark:text-stone-300 px-1.5 py-0.2 rounded bg-white dark:bg-[#18191d] border border-[#e7e4de] dark:border-[#2c2f37]">
                      {mat.subjectCode}
                    </span>
                    <span>{mat.uploadedDate}</span>
                  </div>

                  <p className="text-[11px] font-medium text-stone-600 dark:text-stone-400 mt-1 truncate">
                    {fullCourseName}
                  </p>

                  <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 mt-1 line-clamp-1">
                    {mat.title}
                  </h4>

                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                    {mat.faculty} • {mat.topic}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#eae7e1] dark:border-[#292c35] flex items-center justify-between text-xs">
                  <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.2 rounded bg-white dark:bg-[#18191d] border border-[#e7e4de] dark:border-[#2a2d35] text-stone-600 dark:text-stone-300">
                    {mat.fileType}
                  </span>
                  <a
                    href={mat.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded bg-white dark:bg-[#18191d] border border-[#e7e4de] dark:border-[#2a2d35] hover:bg-[#f4f1eb] dark:hover:bg-[#272a31] text-[11px] font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1 transition-colors"
                  >
                    <span>Download</span>
                    <ExternalLink className="w-3 h-3 text-stone-400" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
