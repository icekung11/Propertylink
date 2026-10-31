import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleDatabaseError } from '@/lib/db-errors';
import { withUserContext } from '@/lib/db-session';
import { tryRole } from '@/lib/auth-guard';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [user, authError] = await tryRole(request, ['seller']);
  if (authError) return authError;

  try {
    const { id } = await params;
    const listing = await prisma.listing.findFirst({
      where: { id, sellerId: user!.userId },
      include: { images: { select: { id: true } }, seller: { select: { status: true, phone_verified_at: true } } },
    });
    if (!listing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    if (!['DRAFT', 'REVISION_REQUIRED'].includes(listing.status)) {
      return NextResponse.json({ error: 'Only draft or revision-required listings can be submitted.' }, { status: 409 });
    }
    if (listing.seller.status !== 'active') {
      return NextResponse.json({ error: 'Your account is not active.', code: 'P0007' }, { status: 403 });
    }
    if (!listing.seller.phone_verified_at) {
      return NextResponse.json({ error: 'Verify your phone before submitting a listing.', code: 'P0006' }, { status: 403 });
    }
    if (listing.images.length < 3) {
      return NextResponse.json({ error: 'A listing needs at least 3 images before submission.', code: 'P0002' }, { status: 400 });
    }

    const updated = await withUserContext(user!.userId, (tx) => tx.listing.update({
      where: { id },
      data: { status: 'PENDING', submitted_at: new Date() },
    }));
    return NextResponse.json({
      message: 'Listing submitted for review.',
      listing: { id: updated.id, listingNo: updated.listingNo, status: updated.status, submittedAt: updated.submitted_at },
    });
  } catch (error) {
    return handleDatabaseError(error);
  }
}
