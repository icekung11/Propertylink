import { randomUUID } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { handleDatabaseError } from "@/lib/db-errors"
import { withUserContext } from "@/lib/db-session"
import { tryRole } from "@/lib/auth-guard"
import { storeImage, removeStoredImage } from "@/lib/image-storage"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const [user, authError] = await tryRole(request, ["seller"])
  if (authError) return authError
  const storedKeys: string[] = []
  try {
    const { id: listingId } = await params
    if (!/^[a-f0-9-]{36}$/i.test(listingId))
      return NextResponse.json({ error: "Invalid listing ID." }, {
        status: 400,
      })
    const owned = await prisma.listing.findFirst({
      where: {
        id: listingId,
        sellerId: user!.userId,
        status: { in: ["DRAFT", "REVISION_REQUIRED"] },
      },
      select: { id: true },
    })
    if (!owned)
      return NextResponse.json({ error: "Draft listing not found." }, {
        status: 404,
      })
    const multipart = request.headers
      .get("content-type")
      ?.includes("multipart/form-data")
    if (Number(request.headers.get("content-length")) > 155 * 1024 * 1024)
      return NextResponse.json({ error: "Upload is too large." }, {
        status: 413,
      })
    const uploads = multipart ? (await request.formData()).getAll("files") : []
    if (
      multipart &&
      (!uploads.length ||
        uploads.length > 15 ||
        uploads.some(
          (file) => !(file instanceof File) || file.size > 10 * 1024 * 1024,
        ))
    )
      return NextResponse.json(
        { error: "Upload 1–15 images, up to 10 MB each." },
        { status: 400 },
      )
    if (!multipart && process.env.NODE_ENV === "production")
      return NextResponse.json(
        { error: "Upload image files using multipart/form-data." },
        { status: 400 },
      )
    const body = multipart ? { images: [] as string[] } : await request.json()
    for (const file of uploads) {
      const stored = await storeImage(file as File)
      storedKeys.push(stored.key)
      body.images.push(stored.url)
    }
    if (
      !Array.isArray(body.images) ||
      body.images.length < 1 ||
      body.images.length > 15
    ) {
      return NextResponse.json(
        { error: "Provide between 1 and 15 image URLs." },
        { status: 400 },
      )
    }
    const imageUrls: string[] = []
    for (const image of body.images) {
      const value = typeof image === "string" ? image : image?.url
      if (multipart) {
        imageUrls.push(value)
        continue
      }
      if (typeof value !== "string" || value.length > 500) {
        return NextResponse.json(
          { error: "Each image must have a valid HTTPS URL." },
          { status: 400 },
        )
      }
      let parsed: URL
      try {
        parsed = new URL(value)
      } catch {
        return NextResponse.json(
          { error: "Each image must have a valid HTTPS URL." },
          { status: 400 },
        )
      }
      if (parsed.protocol !== "https:" || !parsed.hostname) {
        return NextResponse.json(
          { error: "Each image must have a valid HTTPS URL." },
          { status: 400 },
        )
      }
      imageUrls.push(parsed.toString())
    }

    const insertedImages = await withUserContext(user!.userId, async (tx) => {
      await tx.$queryRaw`SELECT id FROM listings WHERE id = ${listingId}::uuid FOR UPDATE`
      const listing = await tx.listing.findFirst({
        where: {
          id: listingId,
          sellerId: user!.userId,
          status: { in: ["DRAFT", "REVISION_REQUIRED"] },
        },
        include: {
          images: { select: { id: true, isCover: true, sortOrder: true } },
        },
      })
      if (!listing) return null
      if (listing.images.length + imageUrls.length > 15)
        throw new Error("IMAGE_LIMIT_EXCEEDED")
      const alreadyHasCover = listing.images.some((image) => image.isCover)
      const records = []
      for (const [index, image_url] of imageUrls.entries()) {
        records.push(
          await tx.listingImage.create({
            data: {
              listingId,
              storage_key: multipart
                ? storedKeys[index]
                : `external-url/${randomUUID()}`,
              image_url,
              isCover: !alreadyHasCover && index === 0,
              sortOrder: listing.images.length + index,
            },
          }),
        )
      }
      return { records, total: listing.images.length + records.length }
    })

    if (!insertedImages) {
      await Promise.all(storedKeys.map(removeStoredImage))
      return NextResponse.json({ error: "Draft listing not found." }, {
        status: 404,
      })
    }
    return NextResponse.json(
      { images: insertedImages.records, totalImages: insertedImages.total },
      { status: 201 },
    )
  } catch (error) {
    await Promise.all(storedKeys.map(removeStoredImage))
    if (error instanceof Error && /Images must|Only JPEG/.test(error.message))
      return NextResponse.json({ error: error.message }, { status: 400 })
    if (error instanceof Error && error.message === "IMAGE_LIMIT_EXCEEDED") {
      return NextResponse.json(
        { error: "A listing cannot have more than 15 images.", code: "P0003" },
        { status: 400 },
      )
    }
    return handleDatabaseError(error)
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: listingId } = await params
    const listing = await prisma.listing.findFirst({
      where: { id: listingId, status: "APPROVED" },
      select: { id: true },
    })
    if (!listing)
      return NextResponse.json({ error: "Listing not found." }, { status: 404 })
    const images = await prisma.listingImage.findMany({
      where: { listingId },
      orderBy: { sortOrder: "asc" },
    })
    return NextResponse.json({ images })
  } catch (error) {
    return handleDatabaseError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const [user, error] = await tryRole(request, ["seller"])
  if (error) return error
  try {
    const { id } = await params
    const imageId = request.nextUrl.searchParams.get("imageId") || ""
    if (!/^[a-f0-9-]{36}$/i.test(id) || !/^[a-f0-9-]{36}$/i.test(imageId))
      return NextResponse.json({ error: "Invalid listing or image ID." }, {
        status: 400,
      })
    const removed = await withUserContext(user!.userId, async (tx) => {
      await tx.$queryRaw`SELECT id FROM listings WHERE id = ${id}::uuid FOR UPDATE`
      const listing = await tx.listing.findFirst({
        where: {
          id,
          sellerId: user!.userId,
          status: { in: ["DRAFT", "REVISION_REQUIRED"] },
        },
        include: { images: { orderBy: { sortOrder: "asc" } } },
      })
      const image = listing?.images.find((image) => image.id === imageId)
      if (!image) return null
      await tx.listingImage.delete({ where: { id: image.id } })
      const remaining = listing!.images.filter((item) => item.id !== image.id)
      for (const [index, item] of remaining.entries())
        await tx.listingImage.update({
          where: { id: item.id },
          data: { sortOrder: index, isCover: index === 0 },
        })
      return image
    })
    if (!removed)
      return NextResponse.json({ error: "Editable image not found." }, {
        status: 404,
      })
    await removeStoredImage(removed.storage_key)
    return NextResponse.json({ message: "Image removed." })
  } catch (failure) {
    return handleDatabaseError(failure)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const [user, error] = await tryRole(request, ["seller"])
  if (error) return error
  try {
    const { id } = await params
    const { imageIds } = await request.json()
    if (
      !/^[a-f0-9-]{36}$/i.test(id) ||
      !Array.isArray(imageIds) ||
      imageIds.length > 15 ||
      new Set(imageIds).size !== imageIds.length ||
      imageIds.some(
        (value) => typeof value !== "string" || !/^[a-f0-9-]{36}$/i.test(value),
      )
    )
      return NextResponse.json({ error: "Provide the complete image order." }, {
        status: 400,
      })
    const result = await withUserContext(user!.userId, async (tx) => {
      await tx.$queryRaw`SELECT id FROM listings WHERE id = ${id}::uuid FOR UPDATE`
      const listing = await tx.listing.findFirst({
        where: {
          id,
          sellerId: user!.userId,
          status: { in: ["DRAFT", "REVISION_REQUIRED"] },
        },
        include: { images: true },
      })
      if (!listing) return null
      if (
        listing.images.length !== imageIds.length ||
        listing.images.some((image) => !imageIds.includes(image.id))
      )
        throw new Error("IMAGE_ORDER_CHANGED")
      for (const [index, imageId] of imageIds.entries())
        await tx.listingImage.update({
          where: { id: imageId },
          data: { sortOrder: index, isCover: index === 0 },
        })
      return true
    })
    return result
      ? NextResponse.json({ message: "Image order saved." })
      : NextResponse.json({ error: "Draft listing not found." }, {
          status: 404,
        })
  } catch (failure) {
    if (failure instanceof Error && failure.message === "IMAGE_ORDER_CHANGED")
      return NextResponse.json(
        { error: "Images have changed. Reload and retry." },
        { status: 409 },
      )
    return handleDatabaseError(failure)
  }
}
