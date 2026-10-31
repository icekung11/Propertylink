import { NextRequest, NextResponse } from "next/server"
import { tryRole } from "@/lib/auth-guard"
import { withUserContext } from "@/lib/db-session"
import { handleDatabaseError } from "@/lib/db-errors"
import { jsonSafe } from "@/lib/json-safe"
import { removeStoredImage } from "@/lib/image-storage"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const [user, error] = await tryRole(request, ["seller"])
  if (error) return error
  const { id } = await params
  if (!/^[a-f0-9-]{36}$/i.test(id))
    return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 })
  try {
    const listing = await withUserContext(user!.userId, (tx) =>
      tx.listing.findFirst({
        where: { id, sellerId: user!.userId },
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          category: true,
          locations: true,
          listing_status_history: { orderBy: { created_at: "asc" } },
        },
      }),
    )
    return listing
      ? NextResponse.json(jsonSafe({ listing }))
      : NextResponse.json({ error: "Listing not found" }, { status: 404 })
  } catch (e) {
    return handleDatabaseError(e)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const [user, error] = await tryRole(request, ["seller"])
  if (error) return error
  const { id } = await params
  if (!/^[a-f0-9-]{36}$/i.test(id))
    return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 })
  try {
    const deleted = await withUserContext(user!.userId, async (tx) => {
      await tx.$queryRaw`SELECT id FROM listings WHERE id = ${id}::uuid FOR UPDATE`
      const draft = await tx.listing.findFirst({
        where: { id, sellerId: user!.userId, status: "DRAFT" },
        include: { images: true },
      })
      if (!draft) return null
      await tx.listing.delete({
        where: { id, sellerId: user!.userId, status: "DRAFT" },
      })
      return draft
    })
    if (!deleted)
      return NextResponse.json({ error: "Draft listing not found" }, {
        status: 404,
      })
    await Promise.all(
      deleted.images.map((image) => removeStoredImage(image.storage_key)),
    )
    return NextResponse.json({ message: "Draft deleted" })
  } catch (e) {
    return handleDatabaseError(e)
  }
}
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const [user, error] = await tryRole(request, ["seller"])
  if (error) return error
  const { id } = await params
  try {
    const b = await request.json()
    if (!/^[a-f0-9-]{36}$/i.test(id))
      return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 })
    for (const [key, max] of [
      ["title", 255],
      ["description", 20000],
      ["contactPhone", 30],
      ["contactEmail", 254],
      ["contactLine", 100],
    ] as const) {
      if (
        b[key] !== undefined &&
        (typeof b[key] !== "string" ||
          b[key].length > max ||
          (key === "title" && !b[key].trim()))
      )
        return NextResponse.json({ error: `Invalid ${key}` }, { status: 400 })
    }
    for (const key of [
      "price",
      "bedrooms",
      "bathrooms",
      "landAreaSqwa",
      "usableAreaSqm",
    ]) {
      if (b[key] !== undefined) {
        const n = Number(b[key])
        if (
          b[key] === "" ||
          b[key] === null ||
          !Number.isFinite(n) ||
          n < 0 ||
          (["bedrooms", "bathrooms"].includes(key) &&
            (!Number.isInteger(n) || n > 32767))
        )
          return NextResponse.json({ error: `Invalid ${key}` }, { status: 400 })
        b[key] = n
      }
    }
    for (const key of ["categoryId", "locationId"])
      if (b[key] !== undefined && !/^[1-9]\d{0,17}$/.test(String(b[key])))
        return NextResponse.json({ error: `Invalid ${key}` }, { status: 400 })
    const result = await withUserContext(user!.userId, async (tx) => {
      await tx.$queryRaw`SELECT id FROM listings WHERE id = ${id}::uuid FOR UPDATE`
      const item = await tx.listing.findFirst({
        where: { id, sellerId: user!.userId },
      })
      if (!item) return null
      if (!["DRAFT", "REVISION_REQUIRED"].includes(item.status))
        throw new Error("LISTING_LOCKED")
      const data: any = {}
      for (const key of [
        "title",
        "description",
        "price",
        "bedrooms",
        "bathrooms",
        "contactPhone",
        "contactEmail",
        "contactLine",
      ])
        if (b[key] !== undefined) data[key] = b[key]
      if (b.categoryId !== undefined) data.categoryId = BigInt(b.categoryId)
      if (b.locationId !== undefined) data.location_id = BigInt(b.locationId)
      if (b.landAreaSqwa !== undefined) data.landAreaSqwa = b.landAreaSqwa
      if (b.usableAreaSqm !== undefined) data.usableAreaSqm = b.usableAreaSqm
      return tx.listing.update({ where: { id, sellerId: user!.userId }, data })
    })
    if (!result)
      return NextResponse.json({ error: "Listing not found" }, { status: 404 })
    return NextResponse.json(jsonSafe({ listing: result }))
  } catch (e: any) {
    if (e.message === "LISTING_LOCKED")
      return NextResponse.json(
        { error: "Only draft or revision required listings can be edited" },
        { status: 409 },
      )
    return handleDatabaseError(e)
  }
}
