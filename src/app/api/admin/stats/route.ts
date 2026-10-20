import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getCombinedAnnouncements } from '@/lib/announcements-service';
import { getSavedAssignments, getSynchronizedAssignments } from '@/lib/assignment-service';
import { getSharedMaterials, getCombinedMaterials } from '@/lib/materials-service';
import { DEMO_ANNOUNCEMENTS, DEMO_MATERIALS } from '@/lib/demo-data';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const [allAnnouncements, asgResult, allMaterials] = await Promise.all([
      getCombinedAnnouncements(DEMO_ANNOUNCEMENTS),
      getSynchronizedAssignments(null, true),
      getCombinedMaterials(DEMO_MATERIALS),
    ]);

    const totalAnnouncements = allAnnouncements.length;
    const totalAssignments = asgResult.totalCount;
    const upcomingDeadlines = asgResult.upcomingCount;
    const totalMaterials = allMaterials.length;

    // Recent activity
    const recentActivity = [
      ...allAnnouncements.slice(0, 5).map((a) => ({
        id: a.id,
        type: 'announcement' as const,
        title: a.title,
        date: a.date,
        author: a.author,
      })),
      ...asgResult.assignments.slice(0, 5).map((asg) => ({
        id: asg.id,
        type: 'assignment' as const,
        title: asg.title,
        date: asg.publishDate,
        author: asg.faculty,
      })),
      ...allMaterials.slice(0, 5).map((m) => ({
        id: m.id,
        type: 'material' as const,
        title: m.title,
        date: m.uploadedDate,
        author: m.uploadedBy || m.faculty,
      })),
    ].sort((a, b) => (b.date > a.date ? 1 : -1)).slice(0, 8);

    return NextResponse.json({
      success: true,
      stats: {
        totalAnnouncements,
        totalAssignments,
        upcomingDeadlines,
        totalMaterials,
        recentActivity,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
