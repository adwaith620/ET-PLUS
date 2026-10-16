import React from 'react';
import { getSession } from '@/lib/auth';
import { SettingsClient } from './settings-client';

export default async function SettingsPage() {
  const session = await getSession();

  return (
    <SettingsClient
      mode={session?.mode || 'demo'}
      username={session?.username || 'demo-student'}
    />
  );
}
