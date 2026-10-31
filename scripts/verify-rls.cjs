// Exercises existing policies under a temporary non-bypass role. Everything rolls back.
const assert = require("node:assert/strict")
const { randomUUID } = require("node:crypto")
require("@next/env").loadEnvConfig(process.cwd())
const { PrismaClient } = require("@prisma/client")
const p = new PrismaClient()
let passed = 0
const rollback = new Error("ROLLBACK_RLS_VERIFICATION")
function check(label, value) {
  assert.ok(value, label)
  passed++
  console.log(`PASS ${label}`)
}
async function main() {
  const buyers = await p.user.findMany({
    where: {
      status: "active",
      deleted_at: null,
      userRoles: { some: { role: { code: "buyer" } } },
    },
    take: 2,
  })
  if (buyers.length !== 2) throw Error("Two active buyers required")
  const owner = await p.user.findFirstOrThrow({
    where: {
      status: "active",
      deleted_at: null,
      userRoles: { some: { role: { code: "owner" } } },
    },
  })
  const allInquiries = await p.inquiry.findMany({
    select: { id: true, buyerId: true, sellerId: true },
  })
  const auditCount = await p.audit_logs.count()
  const role = "propertylink_rls_verify_" + randomUUID().replaceAll("-", "")
  try {
    await p.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(
          `CREATE ROLE "${role}" NOLOGIN NOSUPERUSER NOBYPASSRLS`,
        )
        await tx.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO "${role}"`)
        await tx.$executeRawUnsafe(
          `GRANT SELECT ON ALL TABLES IN SCHEMA public TO "${role}"`,
        )
        await tx.$executeRawUnsafe(`GRANT INSERT ON user_consents TO "${role}"`)
        for (const buyer of buyers)
          await tx.user_consents.create({
            data: {
              user_id: buyer.id,
              consent_type: "pdpa",
              version: "rls-test",
              is_accepted: true,
              accepted_at: new Date(),
            },
          })
        await tx.$executeRawUnsafe(`SET LOCAL ROLE "${role}"`)
        const [flags] =
          await tx.$queryRaw`SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user`
        check(
          "RLS executes without superuser/BYPASSRLS",
          !flags.rolsuper && !flags.rolbypassrls,
        )
        for (const [index, buyer] of buyers.entries()) {
          await tx.$queryRaw`SELECT set_config('app.user_id',${buyer.id},true)`
          const inquiries = await tx.inquiry.findMany({
            select: { id: true, buyerId: true, sellerId: true },
          })
          const expected = allInquiries.filter(
            (row) => row.buyerId === buyer.id || row.sellerId === buyer.id,
          )
          check(
            `Buyer ${index + 1} sees only participating inquiries`,
            inquiries.length === expected.length &&
              inquiries.every(
                (row) => row.buyerId === buyer.id || row.sellerId === buyer.id,
              ),
          )
          const consents = await tx.user_consents.findMany()
          check(
            `Buyer ${index + 1} sees own consent fixture and no other buyer consent`,
            consents.some((row) => row.version === "rls-test") &&
              consents.every((row) => row.user_id === buyer.id),
          )
          check(
            `Buyer ${index + 1} cannot read audit logs`,
            (await tx.audit_logs.count()) === 0,
          )
        }
        await tx.$executeRawUnsafe("SAVEPOINT denied_consent")
        let denied = false
        try {
          await tx.user_consents.create({
            data: {
              user_id: buyers[0].id,
              consent_type: "pdpa",
              version: "rls-denied",
              is_accepted: true,
              accepted_at: new Date(),
            },
          })
        } catch (error) {
          denied =
            /row.level security/i.test(error.message) ||
            error.meta?.code === "42501"
        }
        await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT denied_consent")
        check("Buyer cannot write another buyer consent", denied)
        await tx.$queryRaw`SELECT set_config('app.user_id',${owner.id},true)`
        check(
          "Owner audit read allowed",
          (await tx.audit_logs.count()) === auditCount,
        )
        check(
          "Owner inquiry oversight allowed",
          (await tx.inquiry.count()) === allInquiries.length,
        )
        throw rollback
      },
      { timeout: 15000 },
    )
  } catch (error) {
    if (error !== rollback) throw error
  }
  console.log(
    `Completed ${passed} RLS checks. Temporary role, grants and consent fixtures rolled back.`,
  )
}
main()
  .catch((error) => {
    console.error("RLS verification failed:", error.message)
    process.exitCode = 1
  })
  .finally(() => p.$disconnect())
