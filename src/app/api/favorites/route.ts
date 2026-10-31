import { NextRequest, NextResponse } from 'next/server';
import { tryRole } from '@/lib/auth-guard';
import { withUserContext } from '@/lib/db-session';

export async function POST(request: NextRequest) {
  const [user, authError] = await tryRole(request, ['buyer']);
  if (authError) return authError;
  try {
    const body = await request.json();
    const listingId = typeof body.listingId === 'string' ? body.listingId : '';
    if (!/^[0-9a-f-]{36}$/i.test(listingId)) {
      return NextResponse.json({ error: 'A valid listingId is required.' }, { status: 400 });
    }

    const result = await withUserContext(user!.userId, async (tx) => {
      const listing = await tx.listing.findFirst({ where: { id: listingId, status: 'APPROVED' }, select: { id: true } });
      if (!listing) return null;
      return tx.favorite.upsert({
        where: { userId_listingId: { userId: user!.userId, listingId } },
        create: { userId: user!.userId, listingId },
        update: {},
      });
    });
    if (!result) return NextResponse.json({ error: 'Approved listing not found.' }, { status: 404 });
    return NextResponse.json({ favorite: result }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Unable to update favorite.' }, { status: 500 });
  }
}
