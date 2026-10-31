import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authCookieOptions, createAuthToken } from '@/lib/auth-guard';

const SCRYPT_BYTES = 64;

function hashPassword(password: string, salt = randomBytes(16).toString('hex')): string {
  return `scrypt$${salt}$${scryptSync(password, salt, SCRYPT_BYTES).toString('hex')}`;
}

function verifyPassword(password: string, stored: string): { valid: boolean; needsUpgrade: boolean } {
  if (stored.startsWith('scrypt$')) {
    const [, salt, expectedHex] = stored.split('$');
    if (!salt || !expectedHex || !/^[0-9a-f]{128}$/i.test(expectedHex)) return { valid: false, needsUpgrade: false };
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = scryptSync(password, salt, SCRYPT_BYTES);
    return { valid: timingSafeEqual(actual, expected), needsUpgrade: false };
  }

  // Existing accounts use SHA-256. Verify once, then upgrade the stored hash on successful login.
  if (/^[0-9a-f]{64}$/i.test(stored)) {
    const expected = Buffer.from(stored, 'hex');
    const actual = createHash('sha256').update(password).digest();
    return { valid: timingSafeEqual(actual, expected), needsUpgrade: true };
  }
  return { valid: false, needsUpgrade: false };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || !password || password.length > 200) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }
    if (!process.env.AUTH_SECRET || Buffer.byteLength(process.env.AUTH_SECRET, 'utf8') < 32) {
      return NextResponse.json({ error: 'Authentication is not configured on this server.' }, { status: 503 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });

    const passwordResult = verifyPassword(password, user.password_hash);
    if (!passwordResult.valid) return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
    if (user.status !== 'active' || user.deleted_at) {
      return NextResponse.json({ error: 'This account is not available for sign in.' }, { status: 403 });
    }

    const roles = user.userRoles.map(({ role }) => role.code.toLowerCase());
    if (roles.length !== 1 || !['owner', 'admin', 'seller', 'buyer'].includes(roles[0])) {
      return NextResponse.json({ error: 'Account role is not configured correctly.' }, { status: 403 });
    }
    const primaryRole = roles[0];

    await prisma.user.update({
      where: { id: user.id },
      data: {
        last_login_at: new Date(),
        ...(passwordResult.needsUpgrade ? { password_hash: hashPassword(password) } : {}),
      },
    });
    const token = createAuthToken({
      id: user.id,
      email: user.email,
      primaryRole,
      tokenVersion: user.token_version,
    });
    const response = NextResponse.json({
      message: 'Signed in successfully.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        status: user.status,
        roles: [primaryRole.toUpperCase()],
        primaryRole: primaryRole.toUpperCase(),
        isPhoneVerified: !!user.phone_verified_at,
      },
    });
    response.cookies.set('propertylink_session', token, authCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ error: 'Unable to sign in right now.' }, { status: 503 });
  }
}
