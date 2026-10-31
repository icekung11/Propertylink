import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SESSION_COOKIE = 'propertylink_session';
const SESSION_TTL_SECONDS = 30 * 60;
const ALLOWED_ROLES = new Set(['owner', 'admin', 'seller', 'buyer']);

export interface AuthUser {
  userId: string;
  email?: string;
  roles: string[];
  primaryRole: string;
  tokenVersion: number;
}

interface SessionClaims {
  userId: string;
  email: string;
  primaryRole: string;
  tokenVersion: number;
  iat: number;
  exp: number;
  iss: 'propertylink';
}

class AuthConfigurationError extends Error {}

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new AuthConfigurationError('AUTH_SECRET must be configured with at least 32 bytes');
  }
  return secret;
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url');
}

export function createAuthToken(user: {
  id: string;
  email: string;
  primaryRole: string;
  tokenVersion: number;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload: SessionClaims = {
    userId: user.id,
    email: user.email,
    primaryRole: user.primaryRole.toLowerCase(),
    tokenVersion: user.tokenVersion,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
    iss: 'propertylink',
  };
  const encodedPayload = base64Url(JSON.stringify(payload));
  const unsigned = `${header}.${encodedPayload}`;
  const signature = createHmac('sha256', getAuthSecret()).update(unsigned).digest();
  return `${unsigned}.${base64Url(signature)}`;
}

function parseToken(request: NextRequest): SessionClaims | null {
  const authorization = request.headers.get('authorization');
  const bearer = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
  const token = bearer || request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'));
    if (header?.alg !== 'HS256' || header?.typ !== 'JWT') return null;

    const expected = createHmac('sha256', getAuthSecret())
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest();
    const received = Buffer.from(encodedSignature, 'base64url');
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as SessionClaims;
    const now = Math.floor(Date.now() / 1000);
    const role = typeof payload.primaryRole === 'string' ? payload.primaryRole.toLowerCase() : '';
    if (
      typeof payload.userId !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(payload.userId) ||
      typeof payload.email !== 'string' ||
      !ALLOWED_ROLES.has(role) ||
      !Number.isInteger(payload.tokenVersion) ||
      !Number.isInteger(payload.iat) ||
      !Number.isInteger(payload.exp) ||
      payload.iss !== 'propertylink' ||
      payload.iat > now + 60 ||
      payload.exp <= now ||
      payload.exp <= payload.iat ||
      payload.exp - payload.iat > SESSION_TTL_SECONDS
    ) return null;

    return { ...payload, primaryRole: role };
  } catch (error) {
    if (error instanceof AuthConfigurationError) throw error;
    return null;
  }
}

export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  const claims = parseToken(request);
  if (!claims) {
    throw NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: claims.userId },
    select: {
      id: true,
      email: true,
      status: true,
      deleted_at: true,
      token_version: true,
      userRoles: { select: { role: { select: { code: true } } } },
    },
  });
  if (!user || user.status !== 'active' || user.deleted_at || user.token_version !== claims.tokenVersion) {
    throw NextResponse.json({ error: 'Session is no longer valid. Please log in again.' }, { status: 401 });
  }

  const roles = user.userRoles.map(({ role }) => role.code.toLowerCase());
  if (roles.length !== 1 || !ALLOWED_ROLES.has(roles[0])) {
    throw NextResponse.json({ error: 'Account role is not configured correctly.' }, { status: 403 });
  }

  return {
    userId: user.id,
    email: user.email,
    roles,
    primaryRole: roles[0],
    tokenVersion: user.token_version,
  };
}

export async function requireRole(request: NextRequest, allowedRoles: string[]): Promise<AuthUser> {
  const user = await requireAuth(request);
  if (!allowedRoles.some((role) => user.roles.includes(role.toLowerCase()))) {
    throw NextResponse.json(
      { error: `Access denied. Required roles: ${allowedRoles.join(', ')}` },
      { status: 403 }
    );
  }
  return user;
}

function authError(error: unknown, fallbackMessage: string, fallbackStatus: number): NextResponse {
  if (error instanceof NextResponse) return error;
  if (error instanceof AuthConfigurationError) {
    return NextResponse.json({ error: 'Authentication is not configured on this server.' }, { status: 503 });
  }
  if (error instanceof Error) {
    return NextResponse.json({ error: 'Unable to verify the session right now.' }, { status: 503 });
  }
  return NextResponse.json({ error: fallbackMessage }, { status: fallbackStatus });
}

export async function tryAuth(request: NextRequest): Promise<[AuthUser | null, NextResponse | null]> {
  try {
    return [await requireAuth(request), null];
  } catch (error) {
    return [null, authError(error, 'Unauthorized', 401)];
  }
}

export async function tryRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<[AuthUser | null, NextResponse | null]> {
  try {
    return [await requireRole(request, allowedRoles), null];
  } catch (error) {
    return [null, authError(error, 'Forbidden', 403)];
  }
}

export function authCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}

export const AUTH_SESSION_TTL_SECONDS = SESSION_TTL_SECONDS;
