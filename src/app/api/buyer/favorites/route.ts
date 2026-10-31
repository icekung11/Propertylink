import { NextRequest, NextResponse } from 'next/server';
import { tryRole } from '@/lib/auth-guard';
import { withUserContext } from '@/lib/db-session';
import { jsonSafe } from '@/lib/json-safe';
import { publicListing } from '@/lib/public-listing';

export async function GET(request: NextRequest) {
  const [user, authError] = await tryRole(request, ['buyer']);
  if (authError) return authError;
  const search = new URL(request.url).searchParams;
  const limit = search.has('limit') ? Number(search.get('limit')) : 20;
  const offset = search.has('offset') ? Number(search.get('offset')) : 0;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0) {
    return NextResponse.json({ error: 'limit must be 1-100 and offset must be a non-negative integer.' }, { status: 400 });
  }

  const rows = await withUserContext(user!.userId, (tx) => tx.favorite.findMany({
    where: { userId: user!.userId, listing: { status: 'APPROVED' } },
    include: { listing: { include: { images: { orderBy: { sortOrder: 'asc' } }, category: true, locations: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  }));
  return NextResponse.json(jsonSafe({ favorites: rows.map((row) => publicListing(row.listing)), limit, offset }));
}
