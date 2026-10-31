import { createHash, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleDatabaseError } from '@/lib/db-errors';

const MAX_ATTEMPTS = 5;

function hashOtp(code: string): Buffer {
  return createHash('sha256').update(code).digest();
}

function matchesOtp(code: string, storedHash: string): boolean {
  if (!/^[0-9a-f]{64}$/i.test(storedHash)) return false;
  return timingSafeEqual(hashOtp(code), Buffer.from(storedHash, 'hex'));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = typeof body.userId === 'string' ? body.userId : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const otpCode = typeof body.otpCode === 'string' ? body.otpCode.trim() : '';
    if ((!userId && !phone) || !/^\d{6}$/.test(otpCode)) {
      return NextResponse.json({ error: 'Provide a valid phone or userId and a 6-digit OTP.' }, { status: 400 });
    }

    const otp = await prisma.otp_verifications.findFirst({
      where: {
        ...(userId ? { user_id: userId } : { phone }),
        purpose: 'register',
        is_used: false,
        attempts: { lt: MAX_ATTEMPTS },
      },
      orderBy: { created_at: 'desc' },
    });
    if (!otp || otp.expires_at <= new Date()) {
      return NextResponse.json({ error: 'OTP is invalid or expired.' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.otp_verifications.findUnique({ where: { id: otp.id } });
      if (!current || current.is_used || current.attempts >= MAX_ATTEMPTS || current.expires_at <= new Date()) {
        return 'invalid' as const;
      }
      if (!matchesOtp(otpCode, current.otp_code)) {
        await tx.otp_verifications.updateMany({
          where: { id: current.id, is_used: false, attempts: { lt: MAX_ATTEMPTS } },
          data: { attempts: { increment: 1 } },
        });
        return 'invalid' as const;
      }

      const used = await tx.otp_verifications.updateMany({
        where: { id: current.id, is_used: false, attempts: { lt: MAX_ATTEMPTS } },
        data: { is_used: true, used_at: new Date() },
      });
      if (used.count !== 1) return 'invalid' as const;

      await tx.$queryRaw`SELECT set_config('app.user_id', ${current.user_id}, true)`;
      const user = await tx.user.updateMany({
        where: { id: current.user_id, status: 'pending_verification', deleted_at: null },
        data: { status: 'active', phone_verified_at: new Date() },
      });
      return user.count === 1 ? 'verified' as const : 'invalid' as const;
    });

    if (result !== 'verified') return NextResponse.json({ error: 'OTP is invalid or expired.' }, { status: 400 });
    return NextResponse.json({ message: 'Phone verified successfully.', status: 'active' });
  } catch (error) {
    return handleDatabaseError(error);
  }
}
