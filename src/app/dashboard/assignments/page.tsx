import React from 'react';
import { getDashboardData } from '@/lib/data-service';
import { AssignmentsClient } from './assignments-client';

export default async function AssignmentsPage() {
  const data = await getDashboardData(75);
  if (!data) return null;

  return <AssignmentsClient assignments={data.assignments} />;
}
