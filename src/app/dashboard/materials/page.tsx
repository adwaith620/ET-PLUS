import React from 'react';
import { getDashboardData } from '@/lib/data-service';
import { getCombinedMaterials } from '@/lib/materials-service';
import { getSession } from '@/lib/auth';
import { MaterialsClient } from './materials-client';

export const metadata = {
  title: 'Study Materials | ETLAB TKMCE',
  description: 'Course study notes, syllabus references, and shared cohort resources for Computer Science (AI)',
};

export default async function MaterialsPage() {
  const session = await getSession();
  const data = await getDashboardData();
  if (!data) return null;

  const combinedMaterials = await getCombinedMaterials(data.materials);
  const currentUserName = session?.displayName || session?.username || 'Adwaith Krishna M H';
  const currentUsername = session?.username || 'demo';

  return (
    <MaterialsClient
      materials={combinedMaterials}
      currentUserName={currentUserName}
      currentUsername={currentUsername}
    />
  );
}
