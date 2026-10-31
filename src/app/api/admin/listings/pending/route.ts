import { NextRequest, NextResponse } from "next/server"
import { tryRole } from "@/lib/auth-guard"
import { withUserContext } from "@/lib/db-session"
import { handleDatabaseError } from "@/lib/db-errors"

export async function GET(request: NextRequest) {
  const [admin, authError] = await tryRole(request, ["admin", "owner"])
  if (authError) return authError
  try {
    const status = request.nextUrl.searchParams.get("status") || "PENDING"
    if (!["PENDING", "APPROVED"].includes(status))
      return NextResponse.json({ error: "Invalid status." }, { status: 400 })
    const listings = await withUserContext(admin!.userId, (tx) =>
      tx.listing.findMany({
        where: { status },
        include: {
          seller: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          category: true,
          locations: true,
          images: { orderBy: { sortOrder: "asc" } },
        },
        orderBy: { submitted_at: "asc" },
      }),
    )
    const formatted = listings.map((listing) => ({
      ...listing,
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
    return NextResponse.json({ total: formatted.length, listings: formatted })
  } catch (error) {
    return handleDatabaseError(error)
  }
}
