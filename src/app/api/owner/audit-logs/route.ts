import { NextRequest, NextResponse } from 'next/server';
import { tryRole } from '@/lib/auth-guard';
import { withUserContext } from '@/lib/db-session';
import { readPagination } from '@/lib/pagination';
import { jsonSafe } from '@/lib/json-safe';
import { handleDatabaseError } from '@/lib/db-errors';

export async function GET(request: NextRequest) {
  const [owner, authError] = await tryRole(request, ['owner']);
  if (authError) return authError;
  const page = readPagination(request.url, 50);
  if (!page) return NextResponse.json({ error: 'limit must be an integer 1-100 and offset a non-negative integer.' }, { status: 400 });
  try {
    const logs = await withUserContext(owner!.userId, tx => tx.audit_logs.findMany({
      orderBy: { created_at: 'desc' }, take: page.limit, skip: page.offset,
    }));
    return NextResponse.json(jsonSafe({ logs, ...page }));
  } catch (error) { return handleDatabaseError(error); }
}
