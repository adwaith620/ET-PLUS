import React from 'react';
import { getTimetablePageData } from '@/lib/data-service';
import { TimetableClient } from './timetable-client';

export default function TimetablePage() {
  const { timetable } = getTimetablePageData();
  return <TimetableClient slots={timetable} />;
}
