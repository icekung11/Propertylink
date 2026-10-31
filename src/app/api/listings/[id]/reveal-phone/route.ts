import { NextRequest, NextResponse } from 'next/server';
import { tryRole } from '@/lib/auth-guard';
import { withUserContext } from '@/lib/db-session';
import { handleDatabaseError } from '@/lib/db-errors';

export async function POST(request: NextRequest, { params }: { params: Promise<{id:string}> }) {
  const [user, authError] = await tryRole(request, ['buyer']);
  if (authError) return authError;
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'A valid UUID listing id is required.' }, { status: 400 });
  }
  try {
    const phone = await withUserContext(user!.userId, async tx => {
      const listing = await tx.listing.findFirst({where:{id,status:'APPROVED'},select:{contactPhone:true,seller:{select:{phone:true}}}});
      if (!listing) return null;
      const contact = listing.contactPhone || listing.seller.phone;
      if (!contact) return null;
      await tx.phone_reveals.create({data:{buyer_id:user!.userId,listing_id:id}});
      return contact;
    });
    return phone ? NextResponse.json({phone}) : NextResponse.json({error:'Listing not found'},{status:404});
  } catch (error) { return handleDatabaseError(error); }
}
