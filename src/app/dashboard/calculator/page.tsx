import React from 'react';
import { getCreditCalculatorPageData } from '@/lib/data-service';
import { CalculatorClient } from './calculator-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Credit Calculator',
  description: 'Interactive grade predictor and continuous assessment (CIA) credit calculator for TKMCE students.',
};

export default async function CalculatorPage() {
  const data = await getCreditCalculatorPageData();
  if (!data) return null;

  return (
    <CalculatorClient
      assessmentRecords={data.assessmentRecords || []}
      results={data.results || []}
      academicStanding={data.academicStanding}
      sourceHealth={data.sourceHealth}
      resultsError={data.resultsError}
      mode={data.mode}
      lastSynced={data.lastSynced}
      profile={data.profile}
      currentSemester={data.currentSemester}
    />
  );
}
