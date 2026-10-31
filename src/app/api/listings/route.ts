import { randomBytes } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { handleDatabaseError } from "@/lib/db-errors"
import { withUserContext } from "@/lib/db-session"
import { tryRole } from "@/lib/auth-guard"
import { publicListing } from "@/lib/public-listing"

function parseBigIntId(value: unknown): bigint | null {
  const input =
    typeof value === "number"
      ? String(value)
      : typeof value === "string"
        ? value
        : ""
  if (!/^\d+$/.test(input) || BigInt(input) < 1n) return null
  return BigInt(input)
}

function toOptionalInt(value: unknown, field: string): number | null {
  if (value === undefined || value === null || value === "") return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 32767)
    throw new Error(`${field} must be a non-negative integer.`)
  return parsed
}

export async function POST(request: NextRequest) {
  const [user, authError] = await tryRole(request, ["seller"])
  if (authError) return authError

  try {
    const body = await request.json()
    const title = typeof body.title === "string" ? body.title.trim() : ""
    const description =
      typeof body.description === "string" ? body.description.trim() : ""
    const price = Number(body.price)
    const categoryId = parseBigIntId(body.categoryId ?? body.category_id)
    const locationId = parseBigIntId(body.locationId ?? body.location_id)
    if (!title || title.length > 255 || description.length > 20000) {
      return NextResponse.json(
        {
          error:
            "Title is required (up to 255 characters); description must be at most 20,000 characters.",
        },
        { status: 400 },
      )
    }
    if (
      body.price === undefined ||
      body.price === null ||
      body.price === "" ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      return NextResponse.json(
        { error: "price must be a non-negative number." },
        { status: 400 },
      )
    }
    if (!categoryId || !locationId) {
      return NextResponse.json(
        { error: "A valid categoryId and locationId are required." },
        { status: 400 },
      )
    }

    const bedrooms = toOptionalInt(body.bedrooms, "bedrooms")
    const bathrooms = toOptionalInt(body.bathrooms, "bathrooms")
    const landAreaSqwa =
      body.landAreaSqwa === undefined || body.landAreaSqwa === ""
        ? null
        : Number(body.landAreaSqwa)
    const usableAreaSqm =
      body.usableAreaSqm === undefined || body.usableAreaSqm === ""
        ? null
        : Number(body.usableAreaSqm)
    if (
      (landAreaSqwa !== null &&
        (!Number.isFinite(landAreaSqwa) || landAreaSqwa < 0)) ||
      (usableAreaSqm !== null &&
        (!Number.isFinite(usableAreaSqm) || usableAreaSqm < 0))
    ) {
      return NextResponse.json(
        { error: "Areas must be non-negative numbers." },
        { status: 400 },
      )
    }

    const result = await withUserContext(user!.userId, async (tx) => {
      const [category, location] = await Promise.all([
        tx.category.findFirst({
          where: { id: categoryId, is_active: true },
          select: { id: true },
        }),
        tx.location.findUnique({
          where: { id: locationId },
          select: { id: true },
        }),
      ])
      if (!category || !location) return null

      const listingNo = `L${new Date().getFullYear().toString().slice(-2)}${randomBytes(5).toString("hex").toUpperCase()}`
      const slugBase =
        title
          .toLowerCase()
          .normalize("NFKD")
          .replace(/[^\p{L}\p{N}]+/gu, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 180) || "property"
      const slug = `${slugBase}-${listingNo}`
      const listing = await tx.listing.create({
        data: {
          listingNo,
          sellerId: user!.userId,
          categoryId,
          location_id: locationId,
          title,
          slug,
          description: description || null,
          price,
          bedrooms,
          bathrooms,
          landAreaSqwa,
          usableAreaSqm,
          status: "DRAFT",
        },
      })
      return listing
    })

    if (!result)
      return NextResponse.json(
        { error: "The selected category or location was not found." },
        { status: 400 },
      )
    return NextResponse.json(
      {
        message: "Draft listing created.",
        listing: {
          ...result,
          categoryId: Number(result.categoryId),
          location_id: Number(result.location_id),
        },
      },
      { status: 201 },
    )
  } catch (error) {
    if (
      error instanceof Error &&
      /must be a non-negative integer/.test(error.message)
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return handleDatabaseError(error)
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const parseAmount = (name: string): number | undefined => {
      const value = searchParams.get(name)
      if (value === null || value.trim() === "") return undefined
      const parsed = Number(value)
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : NaN
    }

    const limitValue = searchParams.get("limit")
    const offsetValue = searchParams.get("offset")
    const limit = limitValue === null ? 20 : Number(limitValue)
    const offset = offsetValue === null ? 0 : Number(offsetValue)
    const minPrice = parseAmount("priceMin")
    const maxPrice = parseAmount("priceMax")
    const keyword = searchParams.get("keyword")?.trim()
    const category = searchParams.get("category")?.trim()
    const location = searchParams.get("location")?.trim()
    const sort = searchParams.get("sort") || "newest"
    const bedroomsValue = searchParams.get("bedrooms")
    const bedrooms = bedroomsValue ? Number(bedroomsValue) : undefined
    if (
      bedrooms !== undefined &&
      (!Number.isInteger(bedrooms) || bedrooms < 0 || bedrooms > 32767)
    )
      return NextResponse.json(
        { error: "bedrooms must be a non-negative integer." },
        { status: 400 },
      )

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "limit must be an integer between 1 and 100" },
        { status: 400 },
      )
    }
    if (!Number.isInteger(offset) || offset < 0) {
      return NextResponse.json(
        { error: "offset must be a non-negative integer" },
        { status: 400 },
      )
    }
    if (Number.isNaN(minPrice) || Number.isNaN(maxPrice)) {
      return NextResponse.json(
        { error: "priceMin and priceMax must be non-negative numbers" },
        { status: 400 },
      )
    }
    if (
      minPrice !== undefined &&
      maxPrice !== undefined &&
      minPrice > maxPrice
    ) {
      return NextResponse.json(
        { error: "priceMin cannot be greater than priceMax" },
        { status: 400 },
      )
    }
    if (
      (keyword && keyword.length > 120) ||
      (category && category.length > 200) ||
      (location && location.length > 200)
    ) {
      return NextResponse.json({ error: "Search filters are too long" }, {
        status: 400,
      })
    }
    if (!["newest", "price-asc", "price-desc"].includes(sort)) {
      return NextResponse.json(
        { error: "sort must be newest, price-asc, or price-desc" },
        { status: 400 },
      )
    }

    const categoryFilter: Prisma.CategoryWhereInput | undefined = category
      ? /^\d+$/.test(category)
        ? { id: BigInt(category) }
        : {
            OR: [
              { code: { equals: category, mode: "insensitive" } },
              { slug: { equals: category, mode: "insensitive" } },
              { name: { equals: category, mode: "insensitive" } },
            ],
          }
      : undefined
    const locationFilter: Prisma.LocationWhereInput | undefined = location
      ? /^\d+$/.test(location)
        ? { id: BigInt(location) }
        : { name: { contains: location, mode: "insensitive" } }
      : undefined
    const where: Prisma.ListingWhereInput = {
      status: "APPROVED",
      ...(keyword
        ? {
            OR: [
              { title: { contains: keyword, mode: "insensitive" } },
              { description: { contains: keyword, mode: "insensitive" } },
              {
                locations: { name: { contains: keyword, mode: "insensitive" } },
              },
            ],
          }
        : {}),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            price: {
              ...(minPrice !== undefined ? { gte: minPrice } : {}),
              ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
            },
          }
        : {}),
      ...(categoryFilter ? { category: categoryFilter } : {}),
      ...(locationFilter ? { locations: locationFilter } : {}),
      ...(bedrooms !== undefined ? { bedrooms: { gte: bedrooms } } : {}),
    }
    const orderBy: Prisma.ListingOrderByWithRelationInput =
      sort === "price-asc"
        ? { price: "asc" }
        : sort === "price-desc"
          ? { price: "desc" }
          : { createdAt: "desc" }
    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          category: true,
          locations: true,
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.listing.count({ where }),
    ])

    const formatted = listings.map((listing) => ({
      ...publicListing(listing),
      categoryId: Number(listing.categoryId),
      location_id: Number(listing.location_id),
      category: {
        ...listing.category,
        id: Number(listing.category.id),
        parent_id: listing.category.parent_id
          ? Number(listing.category.parent_id)
          : null,
      },
      locations: {
        ...listing.locations,
        id: Number(listing.locations.id),
        parentId: listing.locations.parentId
          ? Number(listing.locations.parentId)
          : null,
      },
    }))
    return NextResponse.json({ total, limit, offset, listings: formatted })
  } catch (error) {
    return handleDatabaseError(error)
  }
}
