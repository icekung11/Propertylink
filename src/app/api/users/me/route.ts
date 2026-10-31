import { NextRequest, NextResponse } from 'next/server';
import { tryAuth } from '@/lib/auth-guard';
import { withUserContext } from '@/lib/db-session';

export async function GET(request: NextRequest) {
  const [user, error] = await tryAuth(request); if (error) return error;
  const profile = await withUserContext(user!.userId, tx => tx.user.findUnique({ where: { id: user!.userId }, select: { id: true, email: true, firstName: true, lastName: true, phone: true, status: true, kyc_status: true, createdAt: true, userRoles: { include: { role: true } } } }));
  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json({
    user: {
      id: profile.id,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      status: profile.status,
      kycStatus: profile.kyc_status,
      createdAt: profile.createdAt,
      roles: profile.userRoles.map(({ role }) => role.code.toUpperCase()),
    },
  });
}
export async function PUT(request: NextRequest) {
  const [user, error] = await tryAuth(request); if (error) return error;
  try { const body = await request.json(); const data: { firstName?: string; lastName?: string } = {};
    if (typeof body.firstName === 'string') data.firstName = body.firstName.trim(); if (typeof body.lastName === 'string') data.lastName = body.lastName.trim();
    if (!Object.keys(data).length || Object.values(data).some(v => !v || v.length > 100)) return NextResponse.json({ error: 'Provide a non-empty firstName or lastName up to 100 characters' }, { status: 400 });
    const updated = await withUserContext(user!.userId, tx => tx.user.update({ where: { id: user!.userId }, data, select: { id: true, email: true, firstName: true, lastName: true, phone: true } })); return NextResponse.json({ user: updated });
  } catch { return NextResponse.json({ error: 'Unable to update profile' }, { status: 400 }); }
}
export async function DELETE(request: NextRequest) {
  const [user, error] = await tryAuth(request); if (error) return error;
  await withUserContext(user!.userId, tx => tx.user.update({ where: { id: user!.userId }, data: { deleted_at: new Date(), status: 'inactive', token_version: { increment: 1 } } }));
  return NextResponse.json({ message: 'Account deactivated' });
}
