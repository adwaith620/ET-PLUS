import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { deleteSharedMaterial } from '@/lib/materials-service';

import { verifySameOrigin } from '@/lib/security';

export const runtime = 'nodejs';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifySameOrigin(req)) {
      return NextResponse.json({ error: 'Forbidden: Invalid request origin.' }, { status: 403 });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Session required to delete resources.' }, { status: 401 });
    }

    const { id } = await params;
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json({ error: 'Valid resource ID is required.' }, { status: 400 });
    }

    const result = await deleteSharedMaterial(id, session.username);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to delete resource.' }, { status: 403 });
    }

    return NextResponse.json({ success: true, message: 'Resource deleted successfully.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
