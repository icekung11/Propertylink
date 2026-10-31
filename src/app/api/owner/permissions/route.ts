import { NextRequest, NextResponse } from "next/server"
import { tryRole } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { withUserContext } from "@/lib/db-session"
import { MODERATION_PERMISSIONS } from "@/lib/admin-permissions"
import { handleDatabaseError } from "@/lib/db-errors"

export async function GET(request: NextRequest) {
  const [, error] = await tryRole(request, ["owner"])
  if (error) return error
  try {
    const grants = await prisma.role_permissions.findMany({
      where: { roles: { code: "admin" } },
      include: { permissions: true },
    })
    return NextResponse.json({
      permissions: MODERATION_PERMISSIONS.map((code) => ({
        code,
        granted: grants.some((grant) => grant.permissions.code === code),
      })),
    })
  } catch (failure) {
    return handleDatabaseError(failure)
  }
}

export async function PUT(request: NextRequest) {
  const [owner, error] = await tryRole(request, ["owner"])
  if (error) return error
  try {
    const { code, granted } = await request.json()
    if (!MODERATION_PERMISSIONS.includes(code) || typeof granted !== "boolean")
      return NextResponse.json({ error: "Invalid permission change." }, {
        status: 400,
      })
    await withUserContext(owner!.userId, async (tx) => {
      const role = await tx.role.findUniqueOrThrow({ where: { code: "admin" } })
      const permission = await tx.permissions.upsert({
        where: { code },
        create: { code, module: "listing" },
        update: {},
      })
      if (granted)
        await tx.role_permissions.upsert({
          where: {
            role_id_permission_id: {
              role_id: role.id,
              permission_id: permission.id,
            },
          },
          create: { role_id: role.id, permission_id: permission.id },
          update: {},
        })
      else
        await tx.role_permissions.deleteMany({
          where: { role_id: role.id, permission_id: permission.id },
        })
      await tx.audit_logs.create({
        data: {
          actor_user_id: owner!.userId,
          actor_user_email: owner!.email,
          action: granted
            ? "ADMIN_PERMISSION_GRANTED"
            : "ADMIN_PERMISSION_REVOKED",
          entity_type: "role_permissions",
          entity_id: code,
        },
      })
    })
    return NextResponse.json({ code, granted })
  } catch (failure) {
    return handleDatabaseError(failure)
  }
}
