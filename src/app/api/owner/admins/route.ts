import { NextRequest, NextResponse } from "next/server"
import { tryRole } from "@/lib/auth-guard"
import { withUserContext } from "@/lib/db-session"
import { handleDatabaseError } from "@/lib/db-errors"

export async function GET(request: NextRequest) {
  const [owner, authError] = await tryRole(request, ["owner"])
  if (authError) return authError
  try {
    const admins = await withUserContext(owner!.userId, (tx) =>
      tx.user.findMany({
        where: {
          deleted_at: null,
          userRoles: { some: { role: { code: "admin" } } },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    )
    return NextResponse.json({ admins })
  } catch (error) {
    return handleDatabaseError(error)
  }
}

export async function POST(request: NextRequest) {
  const [owner, authError] = await tryRole(request, ["owner"])
  if (authError) return authError

  try {
    const body = await request.json()
    const targetUserId = typeof body.userId === "string" ? body.userId : ""
    if (!/^[0-9a-f-]{36}$/i.test(targetUserId)) {
      return NextResponse.json({ error: "A valid userId is required." }, {
        status: 400,
      })
    }
    if (targetUserId === owner!.userId) {
      return NextResponse.json(
        {
          error: "An Owner cannot assign the Admin role to their own account.",
        },
        { status: 400 },
      )
    }

    const result = await withUserContext(owner!.userId, async (tx) => {
      const [target, adminRole] = await Promise.all([
        tx.user.findFirst({
          where: {
            id: targetUserId,
            status: "active",
            deleted_at: null,
            userRoles: { none: { role: { code: "owner" } } },
          },
          select: { id: true },
        }),
        tx.role.findUnique({ where: { code: "admin" } }),
      ])
      if (!target) return { error: "USER_NOT_FOUND" as const }
      if (!adminRole) return { error: "ADMIN_ROLE_MISSING" as const }

      // Enforce one role at a time and invalidate existing sessions after assignment.
      await tx.userRole.deleteMany({ where: { userId: targetUserId } })
      const assigned = await tx.userRole.create({
        data: {
          userId: targetUserId,
          roleId: adminRole.id,
          assigned_by: owner!.userId,
        },
      })
      await tx.user.update({
        where: { id: targetUserId },
        data: { token_version: { increment: 1 } },
      })
      return { assigned }
    })

    if ("error" in result) {
      if (result.error === "ADMIN_ROLE_MISSING")
        return NextResponse.json({ error: "Admin role is not configured." }, {
          status: 500,
        })
      return NextResponse.json({ error: "Active user not found." }, {
        status: 404,
      })
    }
    return NextResponse.json({ admin: result.assigned }, { status: 201 })
  } catch (error) {
    return handleDatabaseError(error)
  }
}
