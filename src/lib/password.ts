import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto"

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex")
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`
}

export function verifyPassword(password: string, stored: string): boolean {
  if (/^[a-f0-9]{64}$/i.test(stored)) {
    return timingSafeEqual(
      createHash("sha256").update(password).digest(),
      Buffer.from(stored, "hex"),
    )
  }
  const [scheme, salt, digest] = stored.split("$")
  if (
    scheme !== "scrypt" ||
    !/^[a-f0-9]{32}$/i.test(salt || "") ||
    !/^[a-f0-9]{128}$/i.test(digest || "")
  )
    return false
  return timingSafeEqual(
    scryptSync(password, salt, 64),
    Buffer.from(digest, "hex"),
  )
}
