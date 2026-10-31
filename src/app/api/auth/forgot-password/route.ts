import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { allowPasswordReset, createPasswordReset } from "@/lib/password-reset"

export async function POST(request: NextRequest) {
  const production = process.env.NODE_ENV === "production"
  if (
    production &&
    (!process.env.PASSWORD_RESET_WEBHOOK_URL ||
      !process.env.PASSWORD_RESET_WEBHOOK_TOKEN ||
      !process.env.APP_URL)
  )
    return NextResponse.json(
      { error: "Password reset email delivery is not configured." },
      { status: 503 },
    )
  try {
    const body = await request.json()
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
      return NextResponse.json({ error: "Enter a valid email address." }, {
        status: 400,
      })
    const message =
      "If an active account exists, a password reset link will be sent. The link expires in 15 minutes."
    if (!allowPasswordReset(email)) return NextResponse.json({ message })
    const account = await prisma.user.findFirst({
      where: { email, status: "active", deleted_at: null },
    })
    if (!account) return NextResponse.json({ message })
    const token = createPasswordReset(account)
    const resetPath = `/reset-password#token=${encodeURIComponent(token)}`
    if (process.env.PASSWORD_RESET_WEBHOOK_URL) {
      const destination = new URL(process.env.PASSWORD_RESET_WEBHOOK_URL)
      const origin = new URL(process.env.APP_URL || request.nextUrl.origin)
      if (
        production &&
        (destination.protocol !== "https:" || origin.protocol !== "https:")
      )
        throw new Error("HTTPS required")
      const sent = await fetch(destination, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.PASSWORD_RESET_WEBHOOK_TOKEN || ""}`,
        },
        body: JSON.stringify({
          to: email,
          template: "password-reset",
          resetUrl: new URL(resetPath, origin).toString(),
          expiresInMinutes: 15,
        }),
        signal: AbortSignal.timeout(10000),
        redirect: "error",
      })
      if (!sent.ok) throw new Error("Delivery failed")
    }
    return NextResponse.json(
      { message, ...(!production ? { devResetUrl: resetPath } : {}) },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch {
    return NextResponse.json(
      { error: "Unable to request a password reset. Please try again later." },
      { status: 503 },
    )
  }
}
