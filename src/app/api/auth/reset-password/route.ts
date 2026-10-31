import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { resetSubject, verifyPasswordReset } from "@/lib/password-reset"
import { hashPassword } from "@/lib/password"
import { authCookieOptions } from "@/lib/auth-guard"

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json()
    if (
      typeof token !== "string" ||
      typeof newPassword !== "string" ||
      newPassword.length < 8 ||
      newPassword.length > 128
    )
      return NextResponse.json(
        {
          error:
            "A valid reset link and password of 8–128 characters are required.",
        },
        { status: 400 },
      )
    const id = resetSubject(token)
    if (!id)
      return NextResponse.json({ error: "Reset link is invalid or expired." }, {
        status: 400,
      })
    const account = await prisma.user.findFirst({
      where: { id, status: "active", deleted_at: null },
    })
    if (!account || !verifyPasswordReset(token, account))
      return NextResponse.json({ error: "Reset link is invalid or expired." }, {
        status: 400,
      })
    const result = await prisma.user.updateMany({
      where: {
        id,
        status: "active",
        deleted_at: null,
        password_hash: account.password_hash,
        token_version: account.token_version,
      },
      data: {
        password_hash: hashPassword(newPassword),
        token_version: { increment: 1 },
      },
    })
    if (!result.count)
      return NextResponse.json({ error: "Reset link has already been used." }, {
        status: 400,
      })
    const response = NextResponse.json({
      message: "Password reset. Please sign in with your new password.",
    })
    response.cookies.set("propertylink_session", "", {
      ...authCookieOptions(),
      maxAge: 0,
    })
    return response
  } catch {
    return NextResponse.json({ error: "Unable to reset password." }, {
      status: 400,
    })
  }
}
