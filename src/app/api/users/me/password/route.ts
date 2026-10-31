import { NextRequest, NextResponse } from "next/server"
import { tryAuth, authCookieOptions, createAuthToken } from "@/lib/auth-guard"
import { withUserContext } from "@/lib/db-session"
import { hashPassword, verifyPassword } from "@/lib/password"

export async function PUT(request: NextRequest) {
  const [user, error] = await tryAuth(request)
  if (error) return error
  try {
    const { currentPassword, newPassword } = await request.json()
    if (
      typeof currentPassword !== "string" ||
      currentPassword.length > 200 ||
      typeof newPassword !== "string" ||
      newPassword.length < 8 ||
      newPassword.length > 128 ||
      currentPassword === newPassword
    ) {
      return NextResponse.json(
        {
          error:
            "Provide your current password and a different new password of 8–128 characters.",
        },
        { status: 400 },
      )
    }
    const updated = await withUserContext(user!.userId, async (tx) => {
      const account = await tx.user.findUnique({ where: { id: user!.userId } })
      if (!account || !verifyPassword(currentPassword, account.password_hash))
        return null
      const changed = await tx.user.updateMany({
        where: {
          id: account.id,
          password_hash: account.password_hash,
          token_version: user!.tokenVersion,
        },
        data: {
          password_hash: hashPassword(newPassword),
          token_version: { increment: 1 },
        },
      })
      return changed.count
        ? { ...account, token_version: account.token_version + 1 }
        : null
    })
    if (!updated)
      return NextResponse.json(
        { error: "Current password is incorrect or your session has changed." },
        { status: 400 },
      )
    const response = NextResponse.json({
      message: "Password updated. Other sessions have been signed out.",
    })
    response.cookies.set(
      "propertylink_session",
      createAuthToken({
        id: updated.id,
        email: updated.email,
        primaryRole: user!.primaryRole,
        tokenVersion: updated.token_version,
      }),
      authCookieOptions(),
    )
    return response
  } catch {
    return NextResponse.json(
      { error: "Unable to change password. Please try again." },
      { status: 400 },
    )
  }
}
