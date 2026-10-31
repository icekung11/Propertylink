import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleDatabaseError } from '@/lib/db-errors';
import { withUserContext } from '@/lib/db-session';
import { NextRequest } from 'next/server';
import { tryRole } from '@/lib/auth-guard';
import { jsonSafe } from '@/lib/json-safe';
import { readPagination } from '@/lib/pagination';

export async function POST(request: NextRequest) {
  try {
    const [user, authError] = await tryRole(request, ['seller']);
    if (authError) return authError;
    const body = await request.json();
    const {
      categoryId, locationId, title, description, price,
      bedrooms, bathrooms, landAreaSqwa, usableAreaSqm
    } = body;

    // 1. ตรวจสอบข้อมูลบังคับ
    if (!categoryId || typeof title !== 'string' || !title.trim() || price === undefined || price === null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. ดำเนินการผ่าน Transaction พร้อมเซ็ต RLS User Context
    const result = await withUserContext(user!.userId, async (tx) => {
      // ตรวจสอบว่าผู้ขายคนนี้มีตัวตนไหม
      const seller = await tx.user.findUnique({ where: { id: user!.userId } });
      if (!seller) {
        throw new Error('Seller not found');
      }

      // ถ้าไม่มี locationId ให้ดึง location ตัวแรกมาใช้เป็น default
      let locId = locationId ? BigInt(locationId) : null;
      if (!locId) {
        const firstLoc = await tx.location.findFirst();
        if (firstLoc) {
          locId = firstLoc.id;
        }
      }

      if (!locId) {
        throw new Error('No location found. Please seed locations first.');
      }

      const timestamp = Date.now().toString().slice(-6);
      const listingNo = `L${new Date().getFullYear().toString().slice(-2)}${timestamp}`;
      const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${listingNo}`;

      const newListing = await tx.listing.create({
        data: {
          listingNo,
          sellerId: user!.userId,
          categoryId: BigInt(categoryId),
          location_id: locId,
          title,
          slug,
          description: description || '',
          price: price,
          bedrooms: bedrooms ? parseInt(bedrooms) : 0,
          bathrooms: bathrooms ? parseInt(bathrooms) : 0,
          landAreaSqwa: landAreaSqwa ? landAreaSqwa : null,
          usableAreaSqm: usableAreaSqm ? usableAreaSqm : null,
          status: 'DRAFT',
        },
      });

      return {
        ...newListing,
        categoryId: Number(newListing.categoryId),
        location_id: Number(newListing.location_id),
      };
    });

    return NextResponse.json(
      { message: 'Listing created successfully', listing: result },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message === 'Seller not found') {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }
    return handleDatabaseError(error);
  }
}

export async function GET(request: NextRequest) {
  const [user, error] = await tryRole(request, ['seller']); if (error) return error;
  const page = readPagination(request.url);
  if (!page) return NextResponse.json({ error: 'limit must be an integer 1-100 and offset a non-negative integer.' }, { status: 400 });
  const { searchParams } = new URL(request.url); const take = page.limit; const skip = page.offset;
  const status = searchParams.get('status');
  const listings = await withUserContext(user!.userId, tx => tx.listing.findMany({ where: { sellerId: user!.userId, ...(status ? { status } : {}) }, include: { images: { orderBy: { sortOrder: 'asc' } }, category: true, locations: true }, orderBy: { updatedAt: 'desc' }, take, skip }));
  return NextResponse.json(jsonSafe({ listings, limit: take, offset: skip }));
}
