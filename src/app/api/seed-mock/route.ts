import { NextResponse } from 'next/server';

// This endpoint previously exposed an unauthenticated, mutating mock-data seed.
// Keep it disabled; local data setup must use an operator-controlled script.
export async function GET() {
  return NextResponse.json({ error: 'Mock data seeding is disabled.' }, { status: 410 });
}
