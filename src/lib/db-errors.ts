import { NextResponse } from 'next/server';

export interface DatabaseErrorResponse {
  code: string;
  message: string;
  status: number;
}

export const PG_ERROR_MAP: Record<string, { status: number; message: string }> = {
  P0001: { status: 403, message: 'Admin self-approval is forbidden.' },
  P0002: { status: 400, message: 'Listing must have at least 3 images.' },
  P0003: { status: 400, message: 'Listing cannot have more than 15 images.' },
  P0004: { status: 401, message: 'Authentication required. Please log in.' },
  P0005: { status: 403, message: 'Only an Owner can assign Admin roles.' },
  P0006: { status: 403, message: 'Seller phone number is not verified via OTP.' },
  P0007: { status: 403, message: 'Seller account is not active or has been suspended.' },
  P0008: { status: 429, message: 'Listing rate limit exceeded (maximum 10 per day).' },
};

export function handleDatabaseError(error: any): NextResponse {
  console.error('[Database Error]:', error);

  const connectionFailure = /authentication failed|could not connect|unable to reach database|P1000|P1001|P1002/i.test(error?.message ?? '');
  const privilegeFailure = /permission denied for (table|sequence|schema|function)/i.test(error?.message ?? '');
  if (error?.name === 'PrismaClientInitializationError' || ['P1000', 'P1001', 'P1002'].includes(error?.errorCode) || ['P1000', 'P1001', 'P1002'].includes(error?.code) || connectionFailure || privilegeFailure) {
    return NextResponse.json({ error: 'Database service is unavailable.' }, { status: 503 });
  }

  // Check for Postgres custom error code (from triggers or procedures)
  const pgCode = error?.code || error?.meta?.code;
  if (pgCode && PG_ERROR_MAP[pgCode]) {
    const errorInfo = PG_ERROR_MAP[pgCode];
    return NextResponse.json(
      { error: errorInfo.message, code: pgCode },
      { status: errorInfo.status }
    );
  }

  // Check if error message contains the PG error name
  const message = error?.message || '';
  for (const [code, info] of Object.entries(PG_ERROR_MAP)) {
    if (message.includes(code)) {
      return NextResponse.json(
        { error: info.message, code },
        { status: info.status }
      );
    }
  }

  // Handle Prisma unique constraint error
  if (error?.code === 'P2002') {
    const target = Array.isArray(error?.meta?.target) ? error.meta.target.join(', ') : 'field';
    return NextResponse.json(
      { error: `A record with this ${target} already exists.`, code: 'P2002' },
      { status: 409 }
    );
  }

  return NextResponse.json(
    { error: 'The request could not be completed.' },
    { status: 500 }
  );
}
