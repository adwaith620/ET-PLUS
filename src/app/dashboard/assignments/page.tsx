import React from 'react';
import { getAssignmentsPageData } from '@/lib/data-service';
import { AssignmentsClient } from './assignments-client';

export const metadata = {
  title: 'Assignments & Coursework | ETLAB TKMCE',
  description: 'Verified coursework assignments, upcoming submission deadlines, and evaluation marks for Semester 3',
};

export default async function AssignmentsPage() {
  const data = await getAssignmentsPageData();
  if (!data) return null;

  return (
    <AssignmentsClient
      assignments={data.assignments}
      mode={data.mode}
      syncError={data.syncError}
      lastSynced={data.lastSynced}
      upcomingCount={data.upcomingCount}
    />
  );
}
