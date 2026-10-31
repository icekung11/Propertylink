import { NextRequest, NextResponse } from "next/server"
import { tryRole } from "@/lib/auth-guard"
import { withUserContext } from "@/lib/db-session"
import { handleDatabaseError } from "@/lib/db-errors"
import { jsonSafe } from "@/lib/json-safe"
import { canModerate } from "@/lib/admin-permissions"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const [admin, authError] = await tryRole(request, ["admin", "owner"])
  if (authError) return authError
  try {
    const { id } = await params
    const body = await request.json()
    const action = (
      typeof body.action === "string" ? body.action.toUpperCase() : ""
    ) as "APPROVE" | "REJECT" | "REQUEST_REVISION" | "HIDE"
    const reason = typeof body.reason === "string" ? body.reason.trim() : ""
    if (!["APPROVE", "REJECT", "REQUEST_REVISION", "HIDE"].includes(action))
      return NextResponse.json({ error: "Invalid moderation action." }, {
        status: 400,
      })
    if ((action !== "APPROVE" && !reason) || reason.length > 2000)
      return NextResponse.json(
        { error: "A reason of up to 2,000 characters is required." },
        { status: 400 },
      )
    const permission = {
      APPROVE: "listing.approve",
      REJECT: "listing.reject",
      REQUEST_REVISION: "listing.request_revision",
      HIDE: "listing.hide",
    }[action]!
    if (!(await canModerate(admin!, permission)))
      return NextResponse.json(
        { error: "You do not have permission for this action." },
        { status: 403 },
      )
    if (!/^[a-f0-9-]{36}$/i.test(id))
      return NextResponse.json({ error: "Invalid listing ID." }, {
        status: 400,
      })

    const result = await withUserContext(admin!.userId, async (tx) => {
      await tx.$queryRaw`SELECT id FROM listings WHERE id = ${id}::uuid FOR UPDATE`
      const listing = await tx.listing.findFirst({
        where: { id, status: action === "HIDE" ? "APPROVED" : "PENDING" },
      })
      if (!listing) return null
      if (action === "APPROVE" && listing.sellerId === admin!.userId)
        return { selfApproval: true as const }
      const now = new Date()
      const updatedListing = await tx.listing.update({
        where: { id },
        data: {
          status: {
            APPROVE: "APPROVED",
            REJECT: "REJECTED",
            REQUEST_REVISION: "REVISION_REQUIRED",
            HIDE: "HIDDEN",
          }[action],
          approved_at: action === "APPROVE" ? now : null,
          publishedAt: action === "APPROVE" ? now : null,
          rejected_at: action === "REJECT" ? now : null,
          rejection_reason: action === "REJECT" ? reason : null,
          revision_at: action === "REQUEST_REVISION" ? now : null,
        },
      })
      await tx.moderation_actions.create({
        data: {
          listing_id: id,
          admin_id: admin!.userId,
          action: action === "HIDE" ? "SUSPEND" : action,
          reason_code: action === "APPROVE" ? "VERIFIED" : "POLICY_VIOLATION",
          moderator_comment: reason || "Approved by admin",
        },
      })
      await tx.notification.create({
        data: {
          userId: listing.sellerId,
          type: {
            APPROVE: "listing_approved",
            REJECT: "listing_rejected",
            REQUEST_REVISION: "listing_revision_required",
            HIDE: "listing_hidden",
          }[action]!,
          title: {
            APPROVE: "Listing approved",
            REJECT: "Listing rejected",
            REQUEST_REVISION: "Revision requested",
            HIDE: "Listing hidden",
          }[action]!,
          body:
            action === "APPROVE"
              ? `Your listing “${listing.title}” was approved.`
              : `${listing.title}: ${reason}`,
          isRead: false,
        },
      })
      return { updatedListing }
    })
    if (!result)
      return NextResponse.json({ error: "Pending listing not found." }, {
        status: 404,
      })
    if ("selfApproval" in result)
      return NextResponse.json({ error: "Self-approval is forbidden." }, {
        status: 403,
      })
    return NextResponse.json(jsonSafe({ listing: result.updatedListing }))
  } catch (error) {
    return handleDatabaseError(error)
  }
}
