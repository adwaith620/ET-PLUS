import React from 'react';
import { getTimetablePageData } from '@/lib/data-service';
import { TimetableClient } from './timetable-client';

export const metadata = {
  title: 'Timetable',
};

export default async function TimetablePage() {
  const data = await getTimetablePageData();
  return <TimetableClient slots={data.timetable} subjects={data.subjects} />;
}
