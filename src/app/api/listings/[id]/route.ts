import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleDatabaseError } from '@/lib/db-errors';
import { jsonSafe } from '@/lib/json-safe';
import { publicListing } from '@/lib/public-listing';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'A valid UUID listing id is required.' }, { status: 400 });
    }
    const listing = await prisma.listing.findFirst({
      where: { id, status: 'APPROVED' },
      include: { seller: { select: { id: true, firstName: true, lastName: true } }, category: true, locations: true, images: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    return NextResponse.json(jsonSafe({ listing: publicListing(listing) }));
  } catch (error) { return handleDatabaseError(error); }
}
