import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"

type ResetAccount = {
  id: string
  password_hash: string
  token_version: number
}
function signature(payload: string, account: ResetAccount) {
  const secret = process.env.AUTH_SECRET
  if (!secret || Buffer.byteLength(secret) < 32)
    throw new Error("Authentication is not configured.")
  return createHmac("sha256", secret)
    .update(
      `password-reset:${account.password_hash}:${account.token_version}:${payload}`,
    )
    .digest()
}
export function createPasswordReset(account: ResetAccount) {
  const payload = Buffer.from(
    JSON.stringify({
      sub: account.id,
      exp: Math.floor(Date.now() / 1000) + 900,
      nonce: randomBytes(16).toString("hex"),
    }),
  ).toString("base64url")
  return `${payload}.${signature(payload, account).toString("base64url")}`
}
export function resetSubject(token: string): string | null {
  try {
    if (token.length > 1000 || token.split(".").length !== 2) return null
    const payload = JSON.parse(
      Buffer.from(token.split(".")[0], "base64url").toString(),
    )
    const now = Math.floor(Date.now() / 1000)
    return typeof payload.sub === "string" &&
      /^[a-f0-9-]{36}$/i.test(payload.sub) &&
      Number.isInteger(payload.exp) &&
      payload.exp > now &&
      payload.exp <= now + 900
      ? payload.sub
      : null
  } catch {
    return null
  }
}
export function verifyPasswordReset(token: string, account: ResetAccount) {
  if (resetSubject(token) !== account.id) return false
  try {
    const [payload, digest] = token.split(".")
    const received = Buffer.from(digest, "base64url")
    const expected = signature(payload, account)
    return (
      received.length === expected.length && timingSafeEqual(received, expected)
    )
  } catch {
    return false
  }
}

// Best-effort process-local abuse guard. Use a shared gateway limiter for multiple replicas.
const attempts = new Map<string, {
  count: number
  expires: number
}>()
export function allowPasswordReset(key: string) {
  const now = Date.now()
  for (const [stored, value] of attempts)
    if (value.expires < now) attempts.delete(stored)
  const current = attempts.get(key) || {
    count: 0,
    expires: now + 15 * 60 * 1000,
  }
  if (current.count >= 5 || (attempts.size >= 10000 && !attempts.has(key)))
    return false
  current.count += 1
  attempts.set(key, current)
  return true
}
