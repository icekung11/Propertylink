// Idempotent sample fixtures. Run explicitly: npm run seed
// Optional SEED_PASSWORD enables password login for newly created seed users.
const fs = require("node:fs")
const path = require("node:path")
const Module = require("node:module")
const ts = require("typescript")
const { createHash, randomBytes, scryptSync } = require("node:crypto")
require("@next/env").loadEnvConfig(process.cwd())
const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()
const file = path.resolve("src/data/sampleData.ts")
const compiled = new Module(file)
compiled._compile(
  ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  file,
)
const sample = compiled.exports
const idFor = (key) => {
  const b = createHash("sha256")
    .update(`propertylink-seed-v1:${key}`)
    .digest()
    .subarray(0, 16)
  b[6] = (b[6] & 15) | 80
  b[8] = (b[8] & 63) | 128
  const h = b.toString("hex")
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
function passwordHash() {
  const password = process.env.SEED_PASSWORD
  if (!password) return "!seed-password-login-disabled!"
  if (password.length < 8 || password.length > 128)
    throw new Error("SEED_PASSWORD must contain 8-128 characters.")
  const salt = randomBytes(16).toString("hex")
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`
}
const categoryCode = (name) =>
  ({
    "single house": "house",
    house: "house",
    condominium: "condo",
    townhouse: "townhouse",
    land: "land",
    "commercial building": "commercial",
  })[name.toLowerCase()]
async function main() {
  const [identity] =
    await prisma.$queryRaw`SELECT current_database() AS database`
  const testDatabase = process.env.SEED_TEST_DATABASE_NAME
  if (testDatabase && !/^propertylink_verify_[a-f0-9]{32}$/.test(testDatabase))
    throw new Error("Invalid disposable seed database name.")
  if (identity.database !== (testDatabase || "propertylink_db"))
    throw new Error(
      "Seed requires propertylink_db or the explicitly named disposable verification database.",
    )
  const counts = await prisma.$transaction(
    async (tx) => {
      // Serialize concurrent seed runs, including databases not yet carrying the
      // operator's unique-name constraint. Reuse rows by name before upserting.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(730021, 1)`
      const now = new Date()
      const roles = {}
      const newRoles = new Set()
      for (const code of ["owner", "admin", "seller", "buyer"]) {
        if (!(await tx.role.findUnique({ where: { code } }))) newRoles.add(code)
        roles[code] = await tx.role.upsert({
          where: { code },
          create: { code, name: code[0].toUpperCase() + code.slice(1) },
          update: {},
        })
      }
      // Bootstrap permissions only for newly created roles; preserve all existing
      // Owner customizations, including an Admin role with every grant revoked.
      if (newRoles.size) {
        for (const code of [
          "listing.approve",
          "listing.reject",
          "listing.request_revision",
          "listing.hide",
        ]) {
          const permission = await tx.permissions.upsert({
            where: { code },
            create: { code, module: "listing" },
            update: {},
          })
          for (const roleCode of ["owner", "admin"])
            if (
              newRoles.has(roleCode) &&
              (roleCode === "owner" || code !== "listing.hide")
            ) {
              await tx.role_permissions.upsert({
                where: {
                  role_id_permission_id: {
                    role_id: roles[roleCode].id,
                    permission_id: permission.id,
                  },
                },
                create: {
                  role_id: roles[roleCode].id,
                  permission_id: permission.id,
                },
                update: {},
              })
            }
        }
      }
      const categories = {}
      for (const [code, name] of Object.entries({
        house: "Single house",
        condo: "Condominium",
        townhouse: "Townhouse",
        land: "Land",
        commercial: "Commercial Building",
      })) {
        categories[code] = await tx.category.upsert({
          where: { code },
          create: { code, name, slug: code, is_active: true },
          update: code === "house" ? { name: "Single house" } : {},
        })
      }
      // Explicitly update an existing house category as requested.
      await tx.$executeRaw`UPDATE categories SET name = 'Single house' WHERE code = 'house'`
      const users = new Map()
      let userIndex = 0
      async function seedUser(key, name, role) {
        if (users.has(key)) return users.get(key)
        const id = idFor(`user:${key}`)
        const email = `seed.${key}@propertylink.example.invalid`
        const existing = await tx.user.findUnique({
          where: { id },
          select: {
            email: true,
            password_hash: true,
            userRoles: { select: { role: { select: { code: true } } } },
          },
        })
        if (
          existing &&
          (existing.email !== email ||
            existing.userRoles.some((r) => r.role.code !== role))
        )
          throw new Error(`Seed identity conflict: ${key}`)
        const [firstName, ...last] = name.split(" ")
        const user = await tx.user.upsert({
          where: { id },
          create: {
            id,
            email,
            phone: `+6699000${String(++userIndex).padStart(4, "0")}`,
            firstName,
            lastName: last.join(" ") || "Sample",
            password_hash: passwordHash(),
            status: "active",
            phone_verified_at: now,
            pdpa_accepted_at: now,
          },
          update:
            process.env.SEED_PASSWORD &&
            existing?.password_hash === "!seed-password-login-disabled!"
              ? { password_hash: passwordHash() }
              : {},
        })
        await tx.userRole.upsert({
          where: { userId_roleId: { userId: id, roleId: roles[role].id } },
          create: { userId: id, roleId: roles[role].id },
          update: {},
        })
        users.set(key, user)
        return user
      }
      const owner = await seedUser(
        sample.SAMPLE_USER_OWNER.id,
        `${sample.SAMPLE_USER_OWNER.firstName} ${sample.SAMPLE_USER_OWNER.lastName}`,
        "owner",
      )
      await tx.$queryRaw`SELECT set_config('app.user_id', ${owner.id}, true)`
      await seedUser(
        sample.SAMPLE_USER_ADMIN.id,
        `${sample.SAMPLE_USER_ADMIN.firstName} ${sample.SAMPLE_USER_ADMIN.lastName}`,
        "admin",
      )
      await seedUser(
        sample.SAMPLE_USER_BUYER.id,
        `${sample.SAMPLE_USER_BUYER.firstName} ${sample.SAMPLE_USER_BUYER.lastName}`,
        "buyer",
      )
      for (const row of sample.SAMPLE_PROPERTIES)
        await seedUser(row.sellerId, row.sellerName, "seller")
      for (const row of sample.SAMPLE_INQUIRIES)
        await seedUser(row.buyerId, row.buyerName, "buyer")
      let imageCount = 0
      for (const row of sample.SAMPLE_PROPERTIES) {
        const code = categoryCode(row.category)
        if (!categories[code])
          throw new Error(`Unknown sample category: ${row.category}`)
        const existingLocation = await tx.location.findFirst({
          where: { name: row.location.displayAddress },
          orderBy: { id: "asc" },
          select: { id: true },
        })
        const location = await tx.location.upsert({
          where: {
            id:
              existingLocation?.id ??
              BigInt(
                "0x" +
                  createHash("sha256")
                    .update(`seed-location:${row.location.displayAddress}`)
                    .digest("hex")
                    .slice(0, 12),
              ),
          },
          create: {
            id: BigInt(
              "0x" +
                createHash("sha256")
                  .update(`seed-location:${row.location.displayAddress}`)
                  .digest("hex")
                  .slice(0, 12),
            ),
            location_type: "district",
            name: row.location.displayAddress,
            postal_code: row.location.postalCode,
          },
          update: {},
        })
        const data = {
          title: row.title,
          description: row.description,
          contactPhone: row.sellerPhone ?? null,
          contactEmail: row.sellerEmail ?? null,
          contactLine: row.sellerLine ?? null,
          price: row.price,
          categoryId: categories[code].id,
          location_id: location.id,
          sellerId: users.get(row.sellerId).id,
          bedrooms: row.bedrooms ?? null,
          bathrooms: row.bathrooms ?? null,
          landAreaSqwa: row.landArea ?? null,
          usableAreaSqm: row.usableArea ?? null,
        }
        const listing = await tx.listing.upsert({
          where: { id: idFor(`listing:${row.id}`) },
          create: {
            id: idFor(`listing:${row.id}`),
            listingNo: `SEED-${row.reference}`,
            slug: `seed-${row.id}`,
            status: "DRAFT",
            ...data,
          },
          update: data,
        })
        // Supplement two-photo mocks from the same sample photo pool to satisfy DB minimum 3.
        const candidates = [
          ...row.images,
          ...sample.SAMPLE_PROPERTIES.filter(
            (p) => categoryCode(p.category) === code,
          ).flatMap((p) => p.images),
          ...sample.SAMPLE_PROPERTIES.flatMap((p) => p.images),
        ]
        const seen = new Set()
        const images = []
        for (const url of candidates) {
          const photo = new URL(url).pathname
          if (seen.has(photo)) continue
          seen.add(photo)
          images.push(url)
          if (images.length >= Math.max(3, row.images.length)) break
        }
        for (const [index, url] of images.entries()) {
          await tx.listingImage.upsert({
            where: { id: idFor(`image:${row.id}:${index}`) },
            create: {
              id: idFor(`image:${row.id}:${index}`),
              listingId: listing.id,
              storage_key: `seed/${row.id}/${index}`,
              image_url: url,
              isCover: index === 0,
              sortOrder: index,
            },
            update: { image_url: url, isCover: index === 0, sortOrder: index },
          })
          imageCount++
        }
        if (listing.status !== row.status)
          await tx.listing.update({
            where: { id: listing.id },
            data: {
              status: row.status,
              submitted_at: now,
              ...(row.status === "APPROVED"
                ? {
                    approved_at: now,
                    publishedAt: new Date(row.publishedAt || row.createdAt),
                  }
                : {}),
            },
          })
      }
      for (const row of sample.SAMPLE_INQUIRIES) {
        await tx.inquiry.upsert({
          where: { id: idFor(`inquiry:${row.id}`) },
          create: {
            id: idFor(`inquiry:${row.id}`),
            listingId: idFor(`listing:${row.propertyId}`),
            buyerId: users.get(row.buyerId).id,
            sellerId: users.get(row.sellerId).id,
            message: row.message,
            status:
              row.status === "NEW"
                ? "PENDING"
                : row.status === "CONTACTED"
                  ? "REPLIED"
                  : row.status,
            createdAt: new Date(row.createdAt),
          },
          update: {},
        })
      }
      let notificationCount = 0
      for (const row of sample.SAMPLE_NOTIFICATIONS) {
        // Inquiry triggers already produce seller notifications and contact history.
        if (row.type === "buyer_inquiry") continue
        await tx.notification.upsert({
          where: { id: idFor(`notification:${row.id}`) },
          create: {
            id: idFor(`notification:${row.id}`),
            userId: users.get(row.userId).id,
            type: row.type,
            title: row.title,
            body: row.message,
            isRead: row.read,
            createdAt: new Date(row.createdAt),
          },
          update: {},
        })
        notificationCount++
      }
      for (const [buyerKey, propertyKey] of [
        ["buyer-001", "prop-001"],
        ["buyer-002", "prop-002"],
      ])
        await tx.favorite.upsert({
          where: {
            userId_listingId: {
              userId: users.get(buyerKey).id,
              listingId: idFor(`listing:${propertyKey}`),
            },
          },
          create: {
            userId: users.get(buyerKey).id,
            listingId: idFor(`listing:${propertyKey}`),
          },
          update: {},
        })
      const contactListings = await tx.listing.count({
        where: {
          listingNo: { startsWith: "SEED-" },
          contactPhone: { not: null },
          contactEmail: { not: null },
          contactLine: { not: null },
        },
      })
      return {
        users: users.size,
        listings: sample.SAMPLE_PROPERTIES.length,
        images: imageCount,
        inquiries: sample.SAMPLE_INQUIRIES.length,
        explicitNotifications: notificationCount,
        favorites: 2,
        contactListings,
      }
    },
    { timeout: 60000 },
  )
  const report = {
    seed: "PASS",
    at: new Date().toISOString(),
    database: "propertylink_db",
    category: { code: "house", name: "Single house" },
    fixtures: counts,
    seedPasswordProvisioning: process.env.SEED_PASSWORD
      ? "enabled for new/disabled seed accounts"
      : "disabled (set SEED_PASSWORD and rerun to enable disabled seed accounts)",
  }
  if (process.env.SEED_WRITE_REPORT !== "0")
    fs.writeFileSync(
      "SEED_RESULTS.json",
      JSON.stringify(report, null, 2) + "\n",
    )
  console.log(JSON.stringify(report, null, 2))
}
main()
  .catch((e) => {
    console.error(
      "Seed failed:",
      e.code || e.name,
      e.name === "Error"
        ? e.message
        : "Database rejected the seed transaction; no partial fixture changes committed.",
    )
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
