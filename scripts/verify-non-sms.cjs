// Temporary, isolated fixtures only. Never prints credentials or reset tokens.
const assert = require("node:assert/strict")
const {
  randomUUID,
  randomBytes,
  scryptSync,
  createHmac,
} = require("node:crypto")
require("@next/env").loadEnvConfig(process.cwd())
const { PrismaClient } = require("@prisma/client")
const p = new PrismaClient()
const base = process.env.AUDIT_BASE_URL || "http://localhost:3000"
const users = [],
  listings = []
let passed = 0
const password = randomBytes(20).toString("hex")
const newPassword = randomBytes(20).toString("hex")
function check(label, condition) {
  assert.ok(condition, label)
  passed++
  console.log(`PASS ${label}`)
}
function token(user, role) {
  const iat = Math.floor(Date.now() / 1000)
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url")
  const payload = Buffer.from(
    JSON.stringify({
      userId: user.id,
      email: user.email,
      primaryRole: role,
      tokenVersion: user.token_version,
      iat,
      exp: iat + 1800,
      iss: "propertylink",
    }),
  ).toString("base64url")
  return `${header}.${payload}.${createHmac("sha256", process.env.AUTH_SECRET).update(`${header}.${payload}`).digest("base64url")}`
}
async function api(label, method, url, auth, expected, body) {
  const response = await fetch(base + url, {
    method,
    headers: {
      ...(auth ? { authorization: `Bearer ${auth}` } : {}),
      ...(body && !(body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60000),
  })
  const data = await response.json()
  check(`${label} (${expected})`, response.status === expected)
  return { data, response }
}
async function fixture(role) {
  const salt = randomBytes(16).toString("hex")
  const user = await p.user.create({
    data: {
      email: `workflow-${randomUUID()}@example.invalid`,
      phone: `09${Math.floor(Math.random() * 1e8)
        .toString()
        .padStart(8, "0")}`,
      firstName: "Workflow",
      lastName: "Test",
      status: "active",
      pdpa_accepted_at: new Date(),
      phone_verified_at: new Date(),
      password_hash: `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`,
    },
  })
  users.push(user.id)
  const found = await p.role.findUniqueOrThrow({ where: { code: role } })
  await p.userRole.create({ data: { userId: user.id, roleId: found.id } })
  return { ...user, auth: token(user, role) }
}
async function main() {
  const seller = await fixture("seller"),
    other = await fixture("seller"),
    buyer = await fixture("buyer")
  const owner = await p.user.findFirstOrThrow({
    where: {
      status: "active",
      deleted_at: null,
      userRoles: { some: { role: { code: "owner" } } },
    },
  })
  const ownerAuth = token(owner, "owner")
  await api(
    "Anonymous password change",
    "PUT",
    "/api/users/me/password",
    null,
    401,
    { currentPassword: password, newPassword },
  )
  await api(
    "Wrong current password",
    "PUT",
    "/api/users/me/password",
    seller.auth,
    400,
    { currentPassword: "incorrect", newPassword },
  )
  await api(
    "Password change",
    "PUT",
    "/api/users/me/password",
    seller.auth,
    200,
    { currentPassword: password, newPassword },
  )
  await api("Old session revoked", "GET", "/api/users/me", seller.auth, 401)
  await api("Old password rejected", "POST", "/api/auth/login", null, 401, {
    email: seller.email,
    password,
  })
  const login = await api(
    "New password login",
    "POST",
    "/api/auth/login",
    null,
    200,
    { email: seller.email, password: newPassword },
  )
  seller.auth = login.response.headers
    .get("set-cookie")
    .match(/propertylink_session=([^;]+)/)[1]
  const reset = await api(
    "Request password reset",
    "POST",
    "/api/auth/forgot-password",
    null,
    200,
    { email: seller.email },
  )
  check("Development reset link supplied", !!reset.data.devResetUrl)
  const resetToken = new URLSearchParams(
    reset.data.devResetUrl.split("#")[1],
  ).get("token")
  await api(
    "Tampered reset token rejected",
    "POST",
    "/api/auth/reset-password",
    null,
    400,
    { token: resetToken + "x", newPassword: password },
  )
  await api("Reset password", "POST", "/api/auth/reset-password", null, 200, {
    token: resetToken,
    newPassword: password,
  })
  await api(
    "Reset link cannot be replayed",
    "POST",
    "/api/auth/reset-password",
    null,
    400,
    { token: resetToken, newPassword },
  )
  await api(
    "Reset revokes existing session",
    "GET",
    "/api/users/me",
    seller.auth,
    401,
  )
  const fresh = await p.user.findUniqueOrThrow({ where: { id: seller.id } })
  seller.auth = token(fresh, "seller")
  const category = await p.category.findFirstOrThrow({
      where: { is_active: true },
    }),
    location = await p.location.findFirstOrThrow()
  const draft = await api(
    "Create draft",
    "POST",
    "/api/listings",
    seller.auth,
    201,
    {
      title: "Isolated workflow verification",
      price: 1000000,
      categoryId: String(category.id),
      locationId: String(location.id),
      bedrooms: 2,
      bathrooms: 1,
    },
  )
  const id = draft.data.listing.id
  listings.push(id)
  await api(
    "Owner draft read",
    "GET",
    `/api/seller/listings/${id}`,
    seller.auth,
    200,
  )
  await api(
    "Other seller cannot read draft",
    "GET",
    `/api/seller/listings/${id}`,
    other.auth,
    404,
  )
  await api(
    "Other seller cannot edit draft",
    "PUT",
    `/api/seller/listings/${id}`,
    other.auth,
    404,
    { title: "Forbidden" },
  )
  await api(
    "Invalid edit rejected",
    "PUT",
    `/api/seller/listings/${id}`,
    seller.auth,
    400,
    { bedrooms: 1.5 },
  )
  await api(
    "Draft editing persists",
    "PUT",
    `/api/seller/listings/${id}`,
    seller.auth,
    200,
    {
      title: "Edited verification listing",
      contactEmail: "listing@example.invalid",
    },
  )
  const invalid = new FormData()
  invalid.append(
    "files",
    new Blob(["not-an-image"], { type: "image/png" }),
    "bad.png",
  )
  await api(
    "Non-image upload rejected",
    "POST",
    `/api/listings/${id}/images`,
    seller.auth,
    400,
    invalid,
  )
  const cross = new FormData()
  cross.append("files", new Blob(["forbidden"]), "file.png")
  await api(
    "Other seller cannot attach images",
    "POST",
    `/api/listings/${id}/images`,
    other.auth,
    404,
    cross,
  )
  const photos = new FormData()
  const bytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    "base64",
  )
  for (let i = 0; i < 3; i++)
    photos.append(
      "files",
      new Blob([bytes], { type: "image/png" }),
      `photo-${i}.png`,
    )
  const uploaded = await api(
    "Upload real image files",
    "POST",
    `/api/listings/${id}/images`,
    seller.auth,
    201,
    photos,
  )
  check("Three persisted images", uploaded.data.totalImages === 3)
  const imageIds = uploaded.data.images.map((image) => image.id)
  await api(
    "Other seller cannot reorder images",
    "PATCH",
    `/api/listings/${id}/images`,
    other.auth,
    404,
    { imageIds },
  )
  await api(
    "Reorder images and choose cover",
    "PATCH",
    `/api/listings/${id}/images`,
    seller.auth,
    200,
    { imageIds: [...imageIds].reverse() },
  )
  await api(
    "Other seller cannot remove image",
    "DELETE",
    `/api/listings/${id}/images?imageId=${imageIds[2]}`,
    other.auth,
    404,
  )
  await api(
    "Remove own draft image",
    "DELETE",
    `/api/listings/${id}/images?imageId=${imageIds[2]}`,
    seller.auth,
    200,
  )
  const replacement = new FormData()
  replacement.append(
    "files",
    new Blob([bytes], { type: "image/png" }),
    "replacement.png",
  )
  await api(
    "Replace removed photo",
    "POST",
    `/api/listings/${id}/images`,
    seller.auth,
    201,
    replacement,
  )
  await api(
    "Invalid bedroom search rejected",
    "GET",
    "/api/listings?bedrooms=1.5",
    null,
    400,
  )
  const search = await api(
    "Server pagination and bedrooms",
    "GET",
    "/api/listings?limit=1&bedrooms=2",
    null,
    200,
  )
  check(
    "Server enforces page size and bedrooms",
    search.data.listings.length <= 1 &&
      search.data.listings.every((listing) => listing.bedrooms >= 2),
  )
  const media = uploaded.data.images[0].image_url
  check("Draft image private", (await fetch(base + media)).status === 404)
  check(
    "Seller can read draft image",
    (
      await fetch(base + media, {
        headers: { authorization: `Bearer ${seller.auth}` },
      })
    ).status === 200,
  )
  await api(
    "Submit draft",
    "PUT",
    `/api/listings/${id}/submit`,
    seller.auth,
    200,
  )
  await api(
    "Cannot edit pending listing",
    "PUT",
    `/api/seller/listings/${id}`,
    seller.auth,
    409,
    { title: "Locked" },
  )
  await api(
    "Request revision",
    "PUT",
    `/api/admin/listings/${id}/moderate`,
    ownerAuth,
    200,
    { action: "REQUEST_REVISION", reason: "Please improve the description." },
  )
  await api(
    "Edit revision",
    "PUT",
    `/api/seller/listings/${id}`,
    seller.auth,
    200,
    { description: "Updated description" },
  )
  await api("Resubmit", "PUT", `/api/listings/${id}/submit`, seller.auth, 200)
  await api(
    "Approve",
    "PUT",
    `/api/admin/listings/${id}/moderate`,
    ownerAuth,
    200,
    { action: "APPROVE" },
  )
  const visible = await fetch(base + media)
  check("Published image public", visible.status === 200)
  check(
    "Stored image bytes match",
    Buffer.from(await visible.arrayBuffer()).equals(bytes),
  )
  await api(
    "Buyer cannot moderate",
    "PUT",
    `/api/admin/listings/${id}/moderate`,
    buyer.auth,
    403,
    { action: "HIDE", reason: "Forbidden" },
  )
  await api(
    "Hide published listing",
    "PUT",
    `/api/admin/listings/${id}/moderate`,
    ownerAuth,
    200,
    { action: "HIDE", reason: "Hidden for verification" },
  )
  await api(
    "Hidden listing not public",
    "GET",
    `/api/listings/${id}`,
    null,
    404,
  )
  check("Hidden image private", (await fetch(base + media)).status === 404)
  await api(
    "Owner permission management reads",
    "GET",
    "/api/owner/permissions",
    ownerAuth,
    200,
  )
  await api(
    "Buyer cannot change permissions",
    "PUT",
    "/api/owner/permissions",
    buyer.auth,
    403,
    { code: "listing.approve", granted: false },
  )
  await api(
    "Assign isolated account as Admin",
    "POST",
    "/api/owner/admins",
    ownerAuth,
    201,
    { userId: buyer.id },
  )
  await api(
    "Assignment revokes old session",
    "GET",
    "/api/users/me",
    buyer.auth,
    401,
  )
  const admin = await p.user.findUniqueOrThrow({ where: { id: buyer.id } })
  const adminAuth = token(admin, "admin")
  await api(
    "Admin effective permissions",
    "GET",
    "/api/admin/permissions",
    adminAuth,
    200,
  )
  await api(
    "Admin cannot alter permissions",
    "PUT",
    "/api/owner/permissions",
    adminAuth,
    403,
    { code: "listing.approve", granted: false },
  )
  const deletable = await api(
    "Create deletable draft",
    "POST",
    "/api/listings",
    seller.auth,
    201,
    {
      title: "Deletion verification",
      price: 1,
      categoryId: String(category.id),
      locationId: String(location.id),
    },
  )
  listings.push(deletable.data.listing.id)
  await api(
    "Other seller cannot delete draft",
    "DELETE",
    `/api/seller/listings/${deletable.data.listing.id}`,
    other.auth,
    404,
  )
  await api(
    "Delete own draft",
    "DELETE",
    `/api/seller/listings/${deletable.data.listing.id}`,
    seller.auth,
    200,
  )
  console.log(`Completed ${passed} checks.`)
}
main()
  .catch((error) => {
    console.error("Verification failed:", error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    const { unlink } = require("node:fs/promises"),
      path = require("node:path")
    const images = await p.listingImage.findMany({
      where: { listingId: { in: listings } },
    })
    await p.listing.deleteMany({ where: { id: { in: listings } } })
    for (const image of images)
      if (/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(image.storage_key))
        await unlink(
          path.join(
            process.env.UPLOAD_DIRECTORY || ".uploads",
            image.storage_key,
          ),
        ).catch(() => {})
    await p.audit_logs.deleteMany({
      where: {
        OR: [
          { actor_user_id: { in: users } },
          { entity_id: { in: [...users, ...listings] } },
        ],
      },
    })
    await p.user.deleteMany({ where: { id: { in: users } } })
    await p.$disconnect()
    console.log("Temporary fixtures removed.")
  })
