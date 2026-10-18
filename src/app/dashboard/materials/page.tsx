import React from 'react';
import { getMaterialsPageData } from '@/lib/data-service';
import { MaterialsClient } from './materials-client';

export const metadata = {
  title: 'Study Materials',
  description: 'Course study notes, syllabus references, and shared cohort resources for Computer Science (AI)',
};

export default async function MaterialsPage() {
  const data = await getMaterialsPageData();
  if (!data) return null;

  return (
    <MaterialsClient
      materials={data.materials}
      currentUserName={data.currentUserName}
      currentUsername={data.currentUsername}
    />
  );
}
