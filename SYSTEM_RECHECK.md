> Current status (2026-10-31): see [PROJECT_STATUS.md](PROJECT_STATUS.md). This document retains historical October 20 evidence; its remaining-work lists are superseded.

# PropertyLink system recheck — 2026-10-20

Latest key correction: Properties category/location keys now use DB IDs; duplicate location names render once for the existing name filter. Seed reuses a location by name before upsert and serializes seed runs. TypeScript passed; two seed reruns preserved 14 locations/5 categories. Connected DB still has Chiang Mai twice and lacks uq_locations_name, so operator cleanup/constraint is not confirmed on this connection. No location/category records were deleted. See LOCATION_KEY_FIX_RESULTS.json.

Latest registration change: Owner/Admin options restored alongside Buyer/Seller at the operator's explicit request. Public registration accepts all four; one role and OTP/password/session checks remain. Fixed pre-existing OTP hash storage mismatch (varchar(10) could not hold a 64-character hash). Real signup/OTP/password/cookie/dashboard/logout/revocation verification passed **45/45**; temporary accounts cleaned; regression **83/83**. See REGISTRATION_ROLE_CHANGE.md and REGISTRATION_VERIFICATION_RESULTS.json. Earlier public Owner/Admin rejection requirements and password-login-unverified statements are superseded for the tested development flow. Production SMS delivery is still unavailable.

Latest contact correction: Phone/Email/LINE are now persisted for all 10 seed listings. Email/LINE map to Detail; phone uses the Buyer-only reveal API and Show phone number button. Additive nullable contact columns and Prisma mapping were applied without changing authentication identities. Latest results: **83/83 HTTP**, **41/41 targeted checks**, build PASS. See CONTACT_INFORMATION_PLAN.md. Earlier 35-check totals below are superseded.

## Current Phase 2 result — supersedes the historical audit below

**83/83 HTTP probes PASS (0 failures)**; **35/35 seed/ownership/write checks PASS**. Seed data is persisted and reruns are idempotent. Category `house` is named `Single house` in DB and UI; BigInt responses, UUID validation, image mapping/placeholder, pagination and Account/Forgot mock-success issues are fixed. A seeded listing's development URL-attachment/submission/approval/SOLD workflow and populated Buyer A/B application ownership checks passed. Build and TypeScript pass. Current details and remaining gaps: [PHASE2_IMPLEMENTATION_REPORT.md](PHASE2_IMPLEMENTATION_REPORT.md). Raw results: [SYSTEM_RECHECK_RESULTS.json](SYSTEM_RECHECK_RESULTS.json), [PHASE2_VERIFICATION_RESULTS.json](PHASE2_VERIFICATION_RESULTS.json), [SEED_RESULTS.json](SEED_RESULTS.json). Everything below records the earlier audit and is not current status.

The required 31 method/path contracts all have exported handlers. The project contains 30 route files and 38 exported HTTP handlers including additional routes. This is source coverage, not proof of complete functionality. The system is not functionally complete.

Latest HTTP run: **77 passed / 6 failed out of 83 probes** at `http://localhost:3000`. Raw results: `SYSTEM_RECHECK_RESULTS.json`; repeat with `node scripts/recheck-system.cjs`. The script reads the database, uses signed test sessions for existing active accounts, and sends anonymous/invalid/missing-record mutation probes. It does not create business records, send inquiries to sellers, change real profiles/roles, or save secrets/tokens.

`npm run build` passed with TypeScript checks and generation of 30 pages. `npx tsc --noEmit` also passed. Dev server was restarted on port 3000 after the build to avoid sharing stale `.next` artifacts. No browser E2E was executed; no test/lint automation is configured (standalone `npm run lint` requires interactive ESLint setup).

## Current environment and database

- Prisma connects as `postgres` to `propertylink_db`; reads work. The application uses the privileged connection as requested, and RLS tests are deferred.
- `AUTH_SECRET` is configured in the final run. During an intermediate run it was absent and login returned 503; after it became available again, unknown-identity login returned 401 and signed-session reads were tested. Final results supersede that intermediate configuration blocker.
- Data counts: users 8, listings 7, approved listings 2; inquiries, notifications and favorites each 0. Active single-role users: buyers 3, sellers 3, admin 1, owner 1.
- Read-only catalog checks still show RLS flags enabled on inquiries/audit_logs/user_consents; the `postgres` connection bypasses them. No RLS configuration was changed by this audit.
- `user_roles` currently has its composite `(user_id,role_id)` primary key and a role index. No unique constraint/index on `user_id` alone exists in this database. The earlier operator-reported `uq_user_single_role` is not present in the inspected database. Auth rejects accounts with multiple roles, but the database does not enforce one role per user.
- `_prisma_migrations` is absent. Previously identified differences between live schema and checked-in migrations remain unresolved. No schema/grants/data/environment values were changed in this recheck.

## Required API coverage and actual verification

All entries below exist in source. A 401 on an anonymous mutation verifies authentication only; it does not validate the successful business operation.

| # | Contract | Current verification / limitation |
|---:|---|---|
| 1 | POST /api/auth/register | Invalid input/Owner role rejected 400; successful registration not exercised; production returns 503 without SMS integration |
| 2 | POST /api/auth/verify-otp | Invalid input rejected 400; actual OTP success/delivery not tested |
| 3 | POST /api/auth/login | Required fields 400, unknown identity 401; valid password login not tested |
| 4 | GET /api/users/me | 200 for all four roles with signed test sessions; requested userId cannot override identity |
| 5 | PUT /api/users/me | Anonymous 401; signed empty update 400; successful profile write not tested |
| 6 | DELETE /api/users/me | Anonymous 401; real account deactivation not tested |
| 7 | GET /api/categories | 200, database categories array |
| 8 | GET /api/locations | 200, database locations array |
| 9 | GET /api/listings | 200; only APPROVED; client status=DRAFT does not expose drafts; invalid limit rejected |
| 10 | GET /api/listings/:id | Approved 200; draft/missing 404; malformed UUID incorrectly returns 500 |
| 11 | GET /api/seller/listings | Authenticated seller gets 500: BigInt serialization |
| 12 | POST /api/listings | Anonymous 401; buyer 403; signed seller invalid body 400; successful creation not tested |
| 13 | PUT /api/seller/listings/:id | Signed seller missing record 404; successful write response has a BigInt serialization risk |
| 14 | POST /api/listings/:id/images | Anonymous 401; source accepts external HTTPS URLs in dev; production 503; real upload provider absent |
| 15 | PUT /api/listings/:id/submit | Signed seller missing record 404; full image/submit workflow not tested |
| 16 | PUT /api/seller/listings/:id/status | Signed seller missing record 404; successful write response has a BigInt serialization risk |
| 17 | GET /api/admin/listings/pending | Admin 200; buyer 403; current queue empty |
| 18 | PUT /api/admin/listings/:id/moderate | Signed admin missing record 404; successful moderation response has a BigInt serialization risk |
| 19 | POST /api/favorites | Anonymous 401; signed buyer invalid body 400; successful save not tested |
| 20 | DELETE /api/favorites/:listing_id | Anonymous 401; successful removal not tested |
| 21 | GET /api/buyer/favorites | Buyer 200 with empty data; nonempty response has raw listing BigInts (source finding) |
| 22 | POST /api/inquiries | Anonymous 401; signed buyer invalid body 400; successful inquiry/trigger side effects not tested |
| 23 | GET /api/inquiries | Buyer/seller 200, participant predicates present; data empty, so populated cross-buyer isolation unverified |
| 24 | GET /api/inquiries/:id/messages | Signed buyer missing inquiry 404; populated message history unverified |
| 25 | POST /api/inquiries/:id/messages | Signed buyer missing inquiry 404; successful reply unverified |
| 26 | POST /api/listings/:id/reveal-phone | Anonymous 401; implementation exists; no frontend caller found; successful reveal not tested |
| 27 | GET /api/notifications | All roles 200 with empty data; fraction limit accepted instead of rejected |
| 28 | PUT /api/notifications/:id/read | Anonymous 401; signed missing notification 404; existing notification mutation unverified |
| 29 | GET /api/owner/dashboard | Owner 200; buyer 403 |
| 30 | GET /api/owner/audit-logs | Owner 200; fraction limit accepted instead of rejected |
| 31 | POST /api/owner/admins | Signed owner missing target user 404; actual role reassignment unverified |

Additional handlers: logout POST, seller listings POST, listing images GET, inquiry status PUT, owner admins GET, seed GET and disabled mock seed GET. Mock seed returns 410; logout without a session returns 200. No mutation was performed through these endpoints.

## Failed HTTP probes

| Probe | Expected | Actual | Finding |
|---|---|---|---|
| GET /api/listings/not-a-uuid | 400 | 500 | UUID input is passed to Prisma without early validation |
| GET /placeholder-property.svg | 200 | 404 | Referenced fallback asset is missing |
| GET /api/notifications?limit=1.5 | 400 | 200 | Integer pagination validation missing |
| GET /api/seller/listings?limit=1.5 | 400 | 500 | Pagination not validated; response also has BigInt failure |
| GET /api/seller/listings (signed seller) | 200 | 500 | Server log confirms `TypeError: Do not know how to serialize a BigInt` |
| GET /api/owner/audit-logs?limit=1.5 | 400 | 200 | Integer pagination validation missing |

## Frontend and source findings

1. **Seller list is broken with real data.** Only top-level category/location IDs are converted; nested category/location BigInts remain. Buyer favorites returns raw listing objects; seller edit/status and moderation return raw updated listings. Those nonempty/write responses can fail JSON encoding. Only seller list was reproduced via HTTP; successful mutations were not attempted.
2. **Property photos do not map correctly.** `src/lib/property-adapter.ts:7` reads `image.url`, while schema/routes expose `image_url`. A synthetic database-shaped image produces an empty adapted images array. The fallback `/placeholder-property.svg` also returns 404.
3. **Account save claims success without persistence.** `src/app/account/page.tsx:56` only shows a success toast. It does not call the profile API. Buyer/Seller dashboard name forms do call PUT /api/users/me, but successful writes were not exercised here.
4. **Forgot Password claims an email was sent without an API.** `src/components/LoginModal.tsx:587` only sets `forgotSent=true`. No reset-password endpoint or email delivery implementation exists.
5. **Session data hydration only runs on initial mount.** `src/context/AppContext.tsx:52-128` restores notifications/favorite IDs/inquiries in a mount-only effect. `login()` sets the user but does not load these collections. Source indicates a user signing in from an anonymous session needs a reload to populate shared collections. No browser reproduction was performed.
6. **Seller workflow is incomplete.** Real photo uploads are unavailable; edit UI, draft deletion and password update are explicitly unsupported. Draft creation has an API and UI caller, but no complete create/upload/submit/approve workflow was exercised.
7. **Moderation and Owner management are partial.** Approve/reject APIs exist; revision/hide actions are unavailable. Owner metrics/admin list/audit reads work; permission editing is not connected to an API, and the admin assignment POST has no integrated UI workflow.
8. **Collection errors/pagination are incomplete.** Shared inquiry/notification loading errors are silently ignored; public properties fetch only the first 100 rows and filter/page locally. These cannot be treated as fully implemented loading/error/pagination behavior.
9. **Provider integration is missing.** SMS OTP delivery and real image storage are not configured/implemented. Production registration and image upload are intentionally unavailable in the current handlers.

No sampleData/SAMPLE/PUBLIC_PROPERTIES/ADMIN_USERS imports were found under app/components/context. Removing mock imports has not made all workflows complete.

## Remaining verification

Valid password login and cookie issuance; successful register/OTP; session revocation; profile update/deactivation; favorites save/remove with nonempty data; populated cross-user inquiry/message isolation; inquiry side effects; listing creation/images/submission/moderation/status; Owner admin reassignment; and browser interaction/accessibility flows remain unverified. Signed test-session GET results do not prove valid password login. RLS remains explicitly deferred.

Recommended work order: fix BigInt response encoding and image mapping/fallback; replace false Account/Forgot success; repair post-login hydration; complete provider/UI gaps; then run successful workflows and populated cross-account privacy tests using isolated fixtures.
