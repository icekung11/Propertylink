// Replays migrations in a newly-created disposable database, never the app DB.
const { randomUUID } = require("node:crypto")
const { spawnSync } = require("node:child_process")
require("@next/env").loadEnvConfig(process.cwd())
const { PrismaClient } = require("@prisma/client")
const p = new PrismaClient()
const name = `propertylink_verify_${randomUUID().replaceAll("-", "")}`
const url = new URL(process.env.DATABASE_URL)
url.pathname = `/${name}`
let created = false
async function main() {
  if (!/^propertylink_verify_[a-f0-9]{32}$/.test(name))
    throw new Error("Unexpected test database name")
  await p.$executeRawUnsafe(`CREATE DATABASE "${name}"`)
  created = true
  const result = spawnSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    { env: { ...process.env, DATABASE_URL: url.toString() }, encoding: "utf8" },
  )
  if (result.status !== 0)
    throw new Error(`Migration replay failed: ${result.stderr}`)
  const test = new PrismaClient({
    datasources: { db: { url: url.toString() } },
  })
  try {
    const [{ tables }] =
      await test.$queryRaw`SELECT count(*)::int AS tables FROM information_schema.tables WHERE table_schema='public' AND table_name <> '_prisma_migrations'`
    if (tables !== 21) throw new Error("Expected 21 application tables including user settings")
    const [{ count }] =
      await test.$queryRaw`SELECT count(*)::int AS count FROM pg_indexes WHERE indexname='uq_user_single_role'`
    if (count !== 1) throw new Error("Single-role constraint absent")
    console.log(
      "PASS migration chain replays on an empty database (21 tables, single-role unique index).",
    )
    for (let run = 0; run < 2; run++) {
      const seeded = spawnSync(process.execPath, ["scripts/seed-db.cjs"], {
        env: {
          ...process.env,
          DATABASE_URL: url.toString(),
          SEED_TEST_DATABASE_NAME: name,
          SEED_WRITE_REPORT: "0",
        },
        encoding: "utf8",
      })
      if (seeded.status !== 0)
        throw new Error("Fresh database seed failed: " + seeded.stderr)
    }
    if ((await test.user.count()) !== 10 || (await test.listing.count()) !== 10)
      throw new Error("Fresh seed is not idempotent")
    const grants = await test.role_permissions.count({
      where: { roles: { code: "admin" } },
    })
    if (grants !== 3)
      throw new Error("Fresh Admin moderation permissions are missing")
    console.log(
      "PASS fresh seed reruns preserve 10 users/10 listings and bootstrap Admin moderation permissions.",
    )
  } finally {
    await test.$disconnect()
  }
}
main()
  .catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    if (created)
      await p.$executeRawUnsafe(`DROP DATABASE "${name}" WITH (FORCE)`)
    await p.$disconnect()
    console.log("Disposable migration database removed.")
  })
