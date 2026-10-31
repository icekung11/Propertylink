import { NextRequest, NextResponse } from 'next/server';
import { tryAuth, authCookieOptions } from '@/lib/auth-guard';
import { withUserContext } from '@/lib/db-session';

export async function POST(request: NextRequest) {
  const [user, error] = await tryAuth(request);
  if (error?.status === 503) return error;
  if (user) {
    await withUserContext(user.userId, (tx) => tx.user.update({
      where: { id: user.userId },
      data: { token_version: { increment: 1 } },
      select: { id: true },
    }));
  }

  const response = NextResponse.json({ message: 'Signed out.' });
  response.cookies.set('propertylink_session', '', { ...authCookieOptions(), maxAge: 0 });
  return response;
}
