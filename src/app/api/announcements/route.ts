import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getCohortAnnouncements,
  saveCohortAnnouncement,
  getCombinedAnnouncements,
} from '@/lib/announcements-service';
import { DEMO_ANNOUNCEMENTS } from '@/lib/demo-data';
import { Announcement } from '@/types';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const combined = await getCombinedAnnouncements(DEMO_ANNOUNCEMENTS);
    return NextResponse.json({ success: true, announcements: combined });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve announcements.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: You must be logged in to post an announcement.' }, { status: 401 });
    }

    const body = await req.json();
    const { title, content, category, link, pinned } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Announcement title is required.' }, { status: 400 });
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Announcement content is required.' }, { status: 400 });
    }

    const validCategories = ['Academic', 'Exam', 'Hostel', 'Placement', 'Cohort', 'Project', 'General'];
    const chosenCategory = validCategories.includes(category) ? category : 'Cohort';

    const formattedDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }); // e.g. "18 Oct 2026"

    const newAnnouncement: Announcement = {
      id: `cohort-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim(),
      date: formattedDate,
      author: session.displayName || session.username,
      authorUsername: session.username,
      category: chosenCategory as Announcement['category'],
      content: content.trim(),
      pinned: Boolean(pinned),
      link: link && typeof link === 'string' && link.trim() ? link.trim() : undefined,
      isCohortShared: true,
      cohort: 'R3AI',
    };

    await saveCohortAnnouncement(newAnnouncement);

    return NextResponse.json({
      success: true,
      announcement: newAnnouncement,
      message: 'Announcement posted to R3AI cohort successfully.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
