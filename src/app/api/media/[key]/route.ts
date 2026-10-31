import { readFile } from "node:fs/promises"
import path from "node:path"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { tryAuth } from "@/lib/auth-guard"
import { imageDirectory } from "@/lib/image-storage"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(key))
    return new NextResponse(null, { status: 404 })
  try {
    const image = await prisma.listingImage.findFirst({
      where: { storage_key: key },
      select: { listing: { select: { status: true, sellerId: true } } },
    })
    if (!image) return new NextResponse(null, { status: 404 })
    const isPublic = image.listing.status === "APPROVED"
    if (!isPublic) {
      const [user] = await tryAuth(request)
      if (
        !user ||
        (user.userId !== image.listing.sellerId &&
          !user.roles.some((role) => ["admin", "owner"].includes(role)))
      )
        return new NextResponse(null, { status: 404 })
    }
    const data = await readFile(path.join(imageDirectory(), key))
    return new NextResponse(data, {
      headers: {
        "Content-Type": key.endsWith(".jpg")
          ? "image/jpeg"
          : key.endsWith(".png")
            ? "image/png"
            : "image/webp",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
