import { NextRequest, NextResponse } from 'next/server';
import { tryAuth } from '@/lib/auth-guard';
import { withUserContext } from '@/lib/db-session';
import { readPagination } from '@/lib/pagination';
import { handleDatabaseError } from '@/lib/db-errors';

export async function GET(request: NextRequest) {
  const [user, authError] = await tryAuth(request);
  if (authError) return authError;
  const page = readPagination(request.url);
  if (!page) return NextResponse.json({ error: 'limit must be an integer 1-100 and offset a non-negative integer.' }, { status: 400 });
  try {
    const notifications = await withUserContext(user!.userId, tx => tx.notification.findMany({
      where: { userId: user!.userId }, orderBy: { createdAt: 'desc' }, take: page.limit, skip: page.offset,
    }));
    return NextResponse.json({ notifications, ...page });
  } catch (error) { return handleDatabaseError(error); }
}
