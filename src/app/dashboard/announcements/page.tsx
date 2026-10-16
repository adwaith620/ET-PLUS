import React from 'react';
import { getDashboardData } from '@/lib/data-service';
import { AnnouncementsClient } from './announcements-client';

export default async function AnnouncementsPage() {
  const data = await getDashboardData(75);
  if (!data) return null;

  return <AnnouncementsClient announcements={data.announcements} />;
}
