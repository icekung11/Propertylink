import { NextRequest, NextResponse } from 'next/server';
import { tryRole } from '@/lib/auth-guard';
import { withUserContext } from '@/lib/db-session';
import { handleDatabaseError } from '@/lib/db-errors';

export async function GET(request: NextRequest) {
  const [owner, authError] = await tryRole(request, ['owner']);
  if (authError) return authError;
  try {
    const dashboard = await withUserContext(owner!.userId, async (tx) => {
      const [users, buyerUsers, sellerUsers, adminUsers, listings, approvedListings, pendingListings, soldListings, revenue, categoryRows] = await Promise.all([
        tx.user.count({ where: { deleted_at: null } }),
        tx.user.count({ where: { deleted_at: null, userRoles: { some: { role: { code: 'buyer' } } } } }),
        tx.user.count({ where: { deleted_at: null, userRoles: { some: { role: { code: 'seller' } } } } }),
        tx.user.count({ where: { deleted_at: null, userRoles: { some: { role: { code: 'admin' } } } } }),
        tx.listing.count(),
        tx.listing.count({ where: { status: 'APPROVED' } }),
        tx.listing.count({ where: { status: 'PENDING' } }),
        tx.listing.count({ where: { status: 'SOLD' } }),
        tx.listing.aggregate({ where: { status: 'SOLD' }, _sum: { price: true } }),
        tx.listing.findMany({ where: { status: 'APPROVED' }, select: { category: { select: { name: true } } } }),
      ]);
      const categoryCounts = categoryRows.reduce<Record<string, number>>((counts, row) => {
        counts[row.category.name] = (counts[row.category.name] ?? 0) + 1;
        return counts;
      }, {});
      return { users, buyerUsers, sellerUsers, adminUsers, listings, approvedListings, pendingListings, soldListings, soldValue: revenue._sum.price, categoryCounts };
    });
    return NextResponse.json({ dashboard });
  } catch (error) {
    return handleDatabaseError(error);
  }
}
