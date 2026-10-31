import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleDatabaseError } from '@/lib/db-errors';

/** GET /api/locations — ดึงทำเลทั้งหมด (ไม่ต้อง Login) */
export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { id: 'asc' },
    });

    const formatted = locations.map((l) => ({
      ...l,
      id: Number(l.id),
      parentId: l.parentId ? Number(l.parentId) : null,
    }));

    return NextResponse.json({ locations: formatted });
  } catch (error) {
    return handleDatabaseError(error);
  }
}
