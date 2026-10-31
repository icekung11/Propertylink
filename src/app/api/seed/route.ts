import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sort_order: 'asc' },
    });

    // Convert BigInt id to string or number for JSON serialization
    const serialized = categories.map((cat) => ({
      ...cat,
      id: Number(cat.id),
      parent_id: cat.parent_id ? Number(cat.parent_id) : null,
    }));

    return NextResponse.json({
      message: 'Categories fetched successfully',
      categories: serialized,
    });
  } catch (error: any) {
    console.error('Category error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
