import { NextRequest, NextResponse } from 'next/server';
import { tryRole } from '@/lib/auth-guard';
import { withUserContext } from '@/lib/db-session';
import { handleDatabaseError } from '@/lib/db-errors';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [user, authError] = await tryRole(request, ['buyer', 'seller']);
  if (authError) return authError;
  try {
    const { id } = await params;
    const messages = await withUserContext(user!.userId, async (tx) => {
      const inquiry = await tx.inquiry.findFirst({ where: { id, OR: [{ buyerId: user!.userId }, { sellerId: user!.userId }] } });
      if (!inquiry) return null;
      return tx.inquiry_messages.findMany({
        where: {
          inquiry_id: id,
          inquiries: { OR: [{ buyerId: user!.userId }, { sellerId: user!.userId }] },
        },
        orderBy: { created_at: 'asc' },
        take: 200,
      });
    });
    return messages ? NextResponse.json({ messages }) : NextResponse.json({ error: 'Inquiry not found.' }, { status: 404 });
  } catch (error) {
    return handleDatabaseError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [user, authError] = await tryRole(request, ['buyer', 'seller']);
  if (authError) return authError;
  try {
    const { id } = await params;
    const body = await request.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message || message.length > 5000) return NextResponse.json({ error: 'Message is required (up to 5,000 characters).' }, { status: 400 });
    const result = await withUserContext(user!.userId, async (tx) => {
      const inquiry = await tx.inquiry.findFirst({ where: { id, OR: [{ buyerId: user!.userId }, { sellerId: user!.userId }] } });
      if (!inquiry) return null;
      const created = await tx.inquiry_messages.create({ data: { inquiry_id: id, sender_id: user!.userId, message } });
      if (user!.roles.includes('seller')) {
        await tx.inquiry.update({ where: { id, sellerId: user!.userId }, data: { status: 'REPLIED', replied_at: new Date() } });
      }
      return created;
    });
    return result ? NextResponse.json({ message: result }, { status: 201 }) : NextResponse.json({ error: 'Inquiry not found.' }, { status: 404 });
  } catch (error) {
    return handleDatabaseError(error);
  }
}
