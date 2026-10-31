import { NextRequest, NextResponse } from "next/server"
import { tryRole } from "@/lib/auth-guard"
import { MODERATION_PERMISSIONS, canModerate } from "@/lib/admin-permissions"

export async function GET(request: NextRequest) {
  const [user, error] = await tryRole(request, ["admin", "owner"])
  if (error) return error
  try {
    const allowed = await Promise.all(
      MODERATION_PERMISSIONS.map(async (code) =>
        (await canModerate(user!, code)) ? code : null,
      ),
    )
    return NextResponse.json({ permissions: allowed.filter(Boolean) })
  } catch {
    return NextResponse.json({ error: "Unable to load permissions." }, {
      status: 503,
    })
  }
}
