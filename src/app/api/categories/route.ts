import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleDatabaseError } from '@/lib/db-errors';

/** GET /api/categories — ดึงหมวดหมู่ทั้งหมด (ไม่ต้อง Login) */
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { is_active: true },
      orderBy: { id: 'asc' },
    });

    const formatted = categories.map((c) => ({
      ...c,
      id: Number(c.id),
      parent_id: c.parent_id ? Number(c.parent_id) : null,
    }));

    return NextResponse.json({ categories: formatted });
  } catch (error) {
    return handleDatabaseError(error);
  }
}
