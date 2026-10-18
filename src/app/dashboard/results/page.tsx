import React from 'react';
import { getResultsPageData } from '@/lib/data-service';
import { ResultsClient } from './results-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export default async function ResultsPage() {
  const data = await getResultsPageData();
  if (!data) return null;

  return (
    <ResultsClient
      results={data.results}
      assessmentRecords={data.assessmentRecords || []}
      resultsError={data.resultsError}
      mode={data.mode}
    />
  );
}

