import { NextRequest, NextResponse } from 'next/server';
import { tryRole } from '@/lib/auth-guard';
import { withUserContext } from '@/lib/db-session';
import { handleDatabaseError } from '@/lib/db-errors';

function pagination(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const limit = params.has('limit') ? Number(params.get('limit')) : 20;
  const offset = params.has('offset') ? Number(params.get('offset')) : 0;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0) return null;
  return { limit, offset };
}

export async function GET(request: NextRequest) {
  const [user, authError] = await tryRole(request, ['buyer', 'seller']);
  if (authError) return authError;
  const page = pagination(request);
  if (!page) return NextResponse.json({ error: 'limit must be 1-100 and offset must be a non-negative integer.' }, { status: 400 });

  try {
    const inquiries = await withUserContext(user!.userId, (tx) => tx.inquiry.findMany({
      where: { OR: [{ buyerId: user!.userId }, { sellerId: user!.userId }] },
      include: {
        listings: { select: { id: true, title: true, slug: true, images: { orderBy: { sortOrder: 'asc' }, take: 1 } } },
        buyer: { select: { id: true, firstName: true, lastName: true } },
        users_inquiries_seller_idTousers: { select: { id: true, firstName: true, lastName: true } },
        inquiry_messages: {
          where: { inquiries: { OR: [{ buyerId: user!.userId }, { sellerId: user!.userId }] } },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: page.limit,
      skip: page.offset,
    }));
    return NextResponse.json({ inquiries, ...page });
  } catch (error) {
    return handleDatabaseError(error);
  }
}

export async function POST(request: NextRequest) {
  const [user, authError] = await tryRole(request, ['buyer']);
  if (authError) return authError;
  try {
    const body = await request.json();
    const listingId = typeof body.listingId === 'string' ? body.listingId : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    if (!/^[0-9a-f-]{36}$/i.test(listingId)) return NextResponse.json({ error: 'A valid listingId is required.' }, { status: 400 });
    if (!message || message.length > 5000 || subject.length > 255) {
      return NextResponse.json({ error: 'Message is required (up to 5,000 characters); subject must be at most 255 characters.' }, { status: 400 });
    }

    const inquiry = await withUserContext(user!.userId, async (tx) => {
      const listing = await tx.listing.findFirst({ where: { id: listingId, status: 'APPROVED' }, select: { id: true, sellerId: true } });
      if (!listing || listing.sellerId === user!.userId) return null;
      return tx.inquiry.create({
        data: {
          listingId,
          buyerId: user!.userId,
          sellerId: listing.sellerId,
          subject: subject || null,
          message,
        },
      });
    });
    if (!inquiry) return NextResponse.json({ error: 'Approved listing not found.' }, { status: 404 });
    // Live DB triggers create contact_history and seller notification records.
    return NextResponse.json({ inquiry }, { status: 201 });
  } catch (error) {
    return handleDatabaseError(error);
  }
}
