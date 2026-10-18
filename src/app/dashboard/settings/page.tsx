import React from 'react';
import { getSession } from '@/lib/auth';
import { SettingsClient } from './settings-client';

export const metadata = {
  title: 'Settings',
};

export default async function SettingsPage() {
  const session = await getSession();

  return (
    <SettingsClient
      mode={session?.mode || 'demo'}
      username={session?.username || 'demo-student'}
    />
  );
}
