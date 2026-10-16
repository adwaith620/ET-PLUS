import React from 'react';
import { getDashboardData } from '@/lib/data-service';
import { MaterialsClient } from './materials-client';

export default async function MaterialsPage() {
  const data = await getDashboardData(75);
  if (!data) return null;

  return <MaterialsClient materials={data.materials} />;
}
