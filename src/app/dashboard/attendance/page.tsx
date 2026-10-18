import React from 'react';
import { getAttendancePageData } from '@/lib/data-service';
import { AttendanceClient } from './attendance-client';

export const metadata = {
  title: 'Attendance',
};

export default async function AttendancePage() {
  const data = await getAttendancePageData();
  if (!data) return null;

  return (
    <AttendanceClient
      initialSubjects={data.attendance.subjects}
      timetable={data.timetable}
    />
  );
}
