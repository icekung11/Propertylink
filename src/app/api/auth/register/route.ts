import { createHash, randomInt, randomBytes, scryptSync } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
}

function hashOtp(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const roleCode = typeof body.role === 'string' ? body.role.trim().toLowerCase() : 'buyer';
    const consentAccepted = body.termsAccepted === true;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }
    if (password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: 'Password must be between 8 and 128 characters.' }, { status: 400 });
    }
    if (!firstName || firstName.length > 100 || !lastName || lastName.length > 100) {
      return NextResponse.json({ error: 'First name and last name are required.' }, { status: 400 });
    }
    if (!/^\+?[0-9]{8,15}$/.test(phone)) {
      return NextResponse.json({ error: 'Enter a valid phone number.' }, { status: 400 });
    }
    if (!['buyer', 'seller', 'owner', 'admin'].includes(roleCode)) {
      return NextResponse.json({ error: 'Choose Buyer, Seller, Owner or Admin.' }, { status: 400 });
    }
    if (!consentAccepted) {
      return NextResponse.json({ error: 'Accept the Terms of Use and Privacy Policy to continue.' }, { status: 400 });
    }

    // No SMS provider is configured in this project. Never create a production account
    // while implying an OTP was delivered when there is no delivery integration.
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Phone verification is temporarily unavailable.' }, { status: 503 });
    }

    const targetRole = await prisma.role.findUnique({ where: { code: roleCode } });
    if (!targetRole) return NextResponse.json({ error: 'The selected account type is unavailable.' }, { status: 503 });
    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { phone }] }, select: { email: true, phone: true } });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email or phone number already exists.' }, { status: 409 });
    }

    const otpCode = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const acceptedAt = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password_hash: hashPassword(password),
          firstName,
          lastName,
          phone,
          status: 'pending_verification',
          pdpa_accepted_at: acceptedAt,
        },
      });
      await tx.$queryRaw`SELECT set_config('app.user_id', ${user.id}, true)`;
      await tx.otp_verifications.create({
        data: {
          user_id: user.id,
          phone,
          otp_code: hashOtp(otpCode),
          purpose: 'register',
          expires_at: expiresAt,
        },
      });
      await tx.userRole.create({ data: { userId: user.id, roleId: targetRole.id } });
      await tx.user_consents.createMany({
        data: ['terms_of_service', 'pdpa'].map((consent_type) => ({
          user_id: user.id,
          consent_type,
          version: '1.0',
          is_accepted: true,
          accepted_at: acceptedAt,
        })),
      });
      return user;
    });

    return NextResponse.json({
      message: 'Account created. Enter the development OTP to verify your phone.',
      userId: result.id,
      phone: result.phone,
      status: result.status,
      deliveryConfigured: false,
      devOtp: otpCode,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Register failed]', error?.name, error?.code);
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'An account with this email or phone number already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Unable to register right now.' }, { status: 503 });
  }
}
