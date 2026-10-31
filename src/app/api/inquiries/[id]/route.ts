import { NextRequest, NextResponse } from 'next/server';
import { tryRole } from '@/lib/auth-guard';
import { withUserContext } from '@/lib/db-session';
import { handleDatabaseError } from '@/lib/db-errors';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [user, authError] = await tryRole(request, ['buyer', 'seller']);
  if (authError) return authError;
  try {
    const { id } = await params;
    const { status } = await request.json();
    const allowed = user!.roles.includes('seller') ? ['READ', 'CONTACTED', 'CLOSED', 'SPAM'] : ['NEW', 'CONTACTED', 'CLOSED'];
    if (typeof status !== 'string' || !allowed.includes(status)) return NextResponse.json({ error: 'Invalid inquiry status.' }, { status: 400 });
    const result = await withUserContext(user!.userId, async (tx) => {
      const where = { id, OR: [{ buyerId: user!.userId }, { sellerId: user!.userId }] };
      const inquiry = await tx.inquiry.findFirst({ where });
      if (!inquiry) return null;
      const dbStatus = status === 'NEW' ? 'PENDING' : status === 'CONTACTED' ? 'REPLIED' : status;
      return tx.inquiry.update({
        where,
        data: {
          status: dbStatus,
          ...(status === 'READ' ? { read_at: new Date() } : {}),
          ...(status === 'CLOSED' ? { closed_at: new Date() } : {}),
          ...(status === 'CONTACTED' ? { replied_at: new Date() } : {}),
        },
      });
    });
    return result ? NextResponse.json({ inquiry: result }) : NextResponse.json({ error: 'Inquiry not found.' }, { status: 404 });
  } catch (error) {
    return handleDatabaseError(error);
  }
}
