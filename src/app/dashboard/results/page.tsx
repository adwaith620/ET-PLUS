import React from 'react';
import { getDashboardData } from '@/lib/data-service';
import { ResultsClient } from './results-client';

export default async function ResultsPage() {
  const data = await getDashboardData();
  if (!data) return null;

  return <ResultsClient results={data.results} assessmentRecords={data.assessmentRecords || []} mode={data.mode} />;
}
