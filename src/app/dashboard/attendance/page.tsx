import React from 'react';
import { getDashboardData } from '@/lib/data-service';
import { AttendanceClient } from './attendance-client';

export default async function AttendancePage() {
  const data = await getDashboardData(75);
  if (!data) return null;

  return (
    <AttendanceClient
      initialSubjects={data.attendance.subjects}
      timetable={data.timetable}
      dayHistory={data.dayHistory}
    />
  );
}
