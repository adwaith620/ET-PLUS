import React from 'react';
import { getDashboardData } from '@/lib/data-service';
import { TimetableClient } from './timetable-client';

export default async function TimetablePage() {
  const data = await getDashboardData(75);
  if (!data) return null;

  return <TimetableClient slots={data.timetable} />;
}
