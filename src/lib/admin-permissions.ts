import { prisma } from "@/lib/prisma"
import type { AuthUser } from "@/lib/auth-guard"

export const MODERATION_PERMISSIONS = [
  "listing.approve",
  "listing.reject",
  "listing.request_revision",
  "listing.hide",
] as const
export async function canModerate(user: AuthUser, code: string) {
  if (user.roles.includes("owner")) return true
  return !!(await prisma.role_permissions.findFirst({
    where: { roles: { code: "admin" }, permissions: { code } },
    select: { permission_id: true },
  }))
}
