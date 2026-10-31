> Current status (2026-10-31): see [PROJECT_STATUS.md](PROJECT_STATUS.md). This document retains historical October 20 evidence; its remaining-work lists are superseded.

# API Test Report

Location-key/seed recheck (2026-10-20): npx tsc --noEmit PASS; two consecutive seed runs preserved location/category counts and duplicate groups (14 locations, 5 categories). UI uses DB IDs for Properties category/location keys and deduplicates location display names. Live DB still contains Chiang Mai twice and has no uq_locations_name index/constraint; this contradicts the operator-reported state for the inspected connection. No existing DB records were deleted. Raw inspection: LOCATION_KEY_FIX_RESULTS.json. Browser console was not independently inspected.

Latest role-registration evidence (2026-10-20): **45/45** actual development registration/OTP/password/cookie/role-dashboard/logout/revocation checks PASS for Owner, Admin, Buyer and Seller, with all temporary accounts cleaned. Regression **83/83 PASS**, including unsupported-role rejection (the earlier Owner-rejection probe was replaced because the operator explicitly requested Owner/Admin self-registration). OTP digest column widened to 64 characters; hashed OTP and five-attempt enforcement retained. Details: REGISTRATION_ROLE_CHANGE.md and REGISTRATION_VERIFICATION_RESULTS.json. Earlier claims that valid login/OTP/cookie/revocation were untested are superseded for this flow. SMS delivery and browser interaction remain unverified.

Latest contact verification (2026-10-20): HTTP 83/83 and expanded Phase 2 checks 41/41 PASS; npm run build PASS. Ten seed listings have all Phone/Email/LINE fields. Public list/detail omit contactPhone, Seller reveal is denied 403, Buyer reveal returns persisted listing phone 200, published Email/LINE and adapter mapping verified. Seed rerun preserves counts; temporary reveal test records cleaned. Details: CONTACT_INFORMATION_PLAN.md; raw PHASE2_VERIFICATION_RESULTS.json and SYSTEM_RECHECK_RESULTS.json. Previous 35-check totals are historical.

## Current Phase 2 verification — supersedes earlier results

2026-10-20: **83/83 HTTP regression probes PASS**, plus **35/35 seed/idempotence/ownership/business-flow checks PASS**. Seed persisted 10 users, 10 listings, 31 images, 4 inquiries and 2 favorites; trigger notifications plus explicit fixtures total 6. Populated favorites serialize; Buyer A cannot read/post/update Buyer B inquiries; seeded profile updates persist; create/edit/image-URL attach/submit/approve/favorite/SOLD workflow succeeds and temporary records are cleaned up. Category API/search/detail return `Single house`. Invalid UUID and pagination return 400; placeholder returns 200. Build and TypeScript passed. These runs use signed test sessions, not password login, and no browser E2E was performed. RLS remains deferred. See [PHASE2_IMPLEMENTATION_REPORT.md](PHASE2_IMPLEMENTATION_REPORT.md), SYSTEM_RECHECK_RESULTS.json and PHASE2_VERIFICATION_RESULTS.json. Earlier sections are historical.

## Authoritative current recheck — 2026-10-20 20:39 Asia/Bangkok

**83 HTTP probes: 77 PASS, 6 FAIL.** All 31 required contracts exist (38 HTTP handlers / 30 route files). Prisma reads work as `postgres`; `AUTH_SECRET` is available in the final run. Public categories/locations/approved listing list/detail work. Signed test-session Profile/Notifications reads work for all roles; Admin queue and Owner reads work. Seller list returns 500 (BigInt serialization). Other failed probes: malformed listing UUID 500, missing fallback image 404, and three integer-pagination rejection checks.

`npm run build` and `npx tsc --noEmit` passed. Raw final results: [SYSTEM_RECHECK_RESULTS.json](SYSTEM_RECHECK_RESULTS.json). Detailed API/workflow findings, source-only risks, and untested successful writes: [SYSTEM_RECHECK.md](SYSTEM_RECHECK.md). Signed test sessions are not proof of password login; empty inquiries/favorites/notifications are not proof of populated cross-account isolation. RLS remains deferred by user instruction. No business records, schema, grants, or environment secrets were changed. **Every earlier status section below is historical and superseded by this recheck.**

Application ownership filter review (2026-10-20): Inquiries GET and PUT filter by the authenticated buyer/seller; inquiry-message reads now also filter through the parent inquiry's authenticated participant, including nested previews. Seller reply updates include `sellerId` in the update predicate. Notifications GET/PUT filter `userId`; Favorites reads/upserts/deletes filter the session user; Profile GET/PUT/DELETE target the session user ID. Message creation checks participant ownership inside the transaction and derives sender ID from the session. `npx tsc --noEmit` passed after these changes. Cross-account HTTP regression tests were not executed in this review; RLS verification remains deferred by user instruction.

Latest recheck (2026-10-20): the current Prisma connection now uses `postgres`, with `superuser=true` and `bypass_rls=true`. Read-only model counts succeeded: categories 5, locations 4, listings 7, users 8. This confirms model reads under the current connection only; RLS isolation is not validated because this role bypasses RLS. An explicit privilege check for `propertylink_app` still shows no SELECT/INSERT/UPDATE/DELETE privileges on all 20 public tables. No grants, environment values, or database rows were changed during the recheck. This result supersedes earlier statements about the active connection role.

Date: 2026-10-20 (Asia/Bangkok)

## Execution Summary

| Check | Expected | Actual | Result | Evidence / blocker |
|---|---|---|---|---|
| Read-only DB connection | Connect to `propertylink_db.public` without modifying data | Connected | PASS | Prisma read-only catalog queries succeeded; secret values were not printed |
| Database inventory | Identify tables/functions/triggers/RLS/policies | 20 tables, 10 functions, 11 triggers, 3 policies | VERIFIED — catalog metadata | `API_INVENTORY.md`, `IMPLEMENTATION_PLAN.md` |
| Database migration registry | Inspect deployed migration history | `_prisma_migrations` relation absent | BLOCKED | Cannot verify which migration process produced live schema |
| API `GET /api/categories` | HTTP response with active categories | No response | BLOCKED | `fetch` to `http://localhost:8443` failed with `TypeError`; server is not reachable from the command environment |
| API `GET /api/locations` | HTTP response with locations | No response | BLOCKED | Same local preview connectivity blocker |
| API `GET /api/listings` | HTTP response containing only public listings | No response | BLOCKED | Same local preview connectivity blocker; current source statically filters `APPROVED` |
| API `GET /api/admin/listings/pending` without auth | 401/403 | No response | BLOCKED | Same local preview connectivity blocker; do not infer test result from source |
| API `GET /api/users/me` without auth | 401 | No response | BLOCKED | Same local preview connectivity blocker; auth guard static review found unsigned token and `x-user-id` fallback |
| Automated tests | Report actual test outcomes | Not run | BLOCKED | No project test script/config found (excluding dependency-owned tests under `node_modules`) |
| `npm run build` | Compile, type check and prerender pages | Succeeded | PASS | Next.js 15.1.0 production build completed; all 30 pages generated |
| `npm run lint` | Lint source | Interactive prompt; not completed | BLOCKED | No ESLint configuration; `next lint` asks to create one interactively; no config was generated |
| Automated tests | Report actual test outcomes | Not run | BLOCKED | No project test script/config found (excluding dependency-owned tests under `node_modules`) |
| UI workflows / E2E | Verify login, seller, buyer, admin and owner flows | Not run | BLOCKED | No reachable local preview server and no E2E harness found |

## Database Rule Checks

| Scenario / rule | Expected | Observed | Result |
|---|---|---|---|
| Table/function/trigger/policy counts | Inspect live DB rather than assume prompt's counts | 20 / 10 / 11 / 3 | VERIFIED — catalog metadata only |
| OTP and active seller before listing insert | DB rejects unverified/inactive seller | `trg_listings_check_seller_verified` calls function checking `phone_verified_at` and active status | VERIFIED — definition inspected; write test not executed |
| Listing image bounds | Minimum 3 for submit/approved listing; maximum 15 | Submit trigger checks minimum; image trigger checks maximum and approved minimum | VERIFIED — definitions inspected; write test not executed |
| Admin self-approval | DB rejects approval when actor equals seller | Trigger uses `app.user_id` and raises P0001 | VERIFIED — definition inspected; write test not executed; actor context depends on app auth |
| Listing rate limit | Maximum 10 submissions per day if DB enforces it | Trigger counts listing INSERTs over rolling 24 hours | PARTIAL — does not count submit events or calendar days |
| Owner-only admin assignment | DB rejects non-owner assignment | Trigger checks actor role via `app.user_id` | VERIFIED — definition inspected; write test not executed |
| One user / one role | DB rejects second role for a user | No unique constraint on `user_roles.user_id`; current data has 0 multi-role users | FAIL — current data is clean, invariant is not enforced |
| RLS execution context | RLS policies restrict application queries | Current `.env` database role is superuser, has `BYPASSRLS`, and owns protected tables | FAIL — active application connection bypasses RLS |
| Listing transition matrix | DB rejects invalid status transition | Trigger writes history only | FAIL — no transition enforcement confirmed |
| Public listing visibility | Non-public listing cannot be read publicly | Detail route filters APPROVED; list route accepts requested status; no listing RLS | FAIL — public list can query drafts/other states |
| Inquiry side effects | Contact history and seller notification are created once | Two `AFTER INSERT` triggers exist | VERIFIED — definitions inspected; write test not executed |

## Required Follow-up

- Make the preview/API server reachable to this shell or provide an approved test URL/environment; rerun actual HTTP status/body checks.
- Set `AUTH_SECRET` (at least 32 bytes) in the deployment secret manager before enabling login. Audit found no secure auth to reuse; no secret was generated or written.
- Confirm SMS/OTP and image storage providers before claiming delivery or production upload support.
- Review and approve a migration plan before changing live-schema constraints or modifying migrations; the live DB has no `_prisma_migrations` table and diverges from checked-in migration SQL.

## Phase 2/3 execution evidence (2026-10-20)

| Check | Observed result | Status | Evidence / limitation |
|---|---|---|---|
| Dev API reachability | `http://localhost:3000` responds | PASS | Dev server was restarted after production build replaced its `.next` artifacts |
| Anonymous `GET /api/users/me` | 401 | PASS | `Authentication required` |
| Forged `x-user-id` on `GET /api/users/me` | 401 | PASS | Header does not authenticate the request |
| Anonymous `GET /api/inquiries` | 401 | PASS | No session; buyer privacy test still requires two real accounts |
| Anonymous Admin pending, Owner dashboard/admins/audit logs | 401 | PASS | Protected routes reject unauthenticated requests |
| Anonymous moderation `PUT` | 401 | PASS | Body-supplied admin ID does not authorize the action |
| Anonymous `POST /api/listings` with body sellerId | 401 | PASS | Session is required; no listing write occurred |
| Public `GET /api/listings?status=DRAFT` | 500 generic error | BLOCKED | Database initialization fails before response data can verify filtering; source review confirms `status: 'APPROVED'` is fixed in the query |
| `GET /api/categories`, `GET /api/locations` | 500 generic error | BLOCKED | Same Prisma connection failure |
| Login probe with invalid test identity | 500 generic error | BLOCKED | Not a valid user credential test; DB connection fails before credential verification |
| Prisma read-only `SELECT current_user, current_database()` | Connected as `propertylink_app` to `propertylink_db` | PASS (connection only; supersedes prior result) | Query succeeded on 2026-10-20; no secret value was read or printed |
| Signed login, `GET /api/users/me` with session, Buyer A vs Buyer B inquiry isolation | Not executable | BLOCKED | Cannot authenticate while DB connection fails; no user credentials supplied |
| Runtime RLS policy test | Not executable | BLOCKED | Same DB connection failure; source review confirms user-scoped RLS queries use `withUserContext` (`set_config('app.user_id', ..., true)`) or transaction-local setup in registration/OTP |
| `GET /api/seed-mock` | 410 | PASS | Mutating unauthenticated mock seed is disabled |
| `npm run build` | Completed; all 30 pages generated | PASS | Next.js build includes TypeScript checking |

No database rows were written in this test pass. The prior connection failure above is superseded by the 2026-10-20 recheck below. `AUTH_SECRET` is present in `.env`; its value was not inspected or printed.

## Phase 2/3 recheck (2026-10-20)

| Check | Observed result | Status | Evidence / limitation |
|---|---|---|---|
| Prisma connection and identity | Connected as `propertylink_app` to `propertylink_db` | PASS (connection only) | Read-only Prisma queries for `current_user` and `current_database`; no writes |
| Prisma model read (`locations`) | PostgreSQL `42501 permission denied for table locations` | BLOCKED | Prisma Client model query; `information_schema.table_privileges` returned no grants for `propertylink_app` |
| `GET /api/locations` | 500 before error normalization | BLOCKED | `propertylink_app` lacks required table grants |
| `GET /api/listings?status=DRAFT` | 500 before error normalization | BLOCKED | Runtime filtering cannot be confirmed while table access is denied; source query hardcodes `APPROVED` |
| `GET /api/categories` | 404 on the current dev process | BLOCKED | Route exists in source and production build route manifest; dev process needs restart after build regenerated `.next` |
| Anonymous `GET /api/users/me`, `/api/inquiries`, `/api/admin/listings/pending` | 401 | PASS | Protected routes reject requests without a signed session |
| `GET /api/seed-mock` | 410 | PASS | Mock seed endpoint is disabled |
| `npm run build` | Completed; all 30 pages generated | PASS | Next.js production build and TypeScript validation completed on 2026-10-20 |

The application database login succeeds, but application table access does not. Configure reviewed least-privilege grants for required tables/sequences and verify intended RLS policies before claiming API/database integration works. Runtime signed login, authenticated user reads, Buyer A/B inquiry isolation, and RLS policy tests remain blocked until table access is corrected. No database rows or privileges were changed during this check.

## Database privilege inspection (read-only, 2026-10-20)

| Scope | Observed result |
|---|---|
| Role identity | `propertylink_app` on `propertylink_db`; CONNECT and `public` schema USAGE are true |
| Role flags | `rolsuper=false`; `rolbypassrls=false` |
| Table grants | No SELECT/INSERT/UPDATE/DELETE on any of the 20 public tables |
| Sequence grants | No USAGE/SELECT/UPDATE on any of the 6 public sequences |
| RLS-enabled tables | `audit_logs`, `inquiries`, `user_consents`; `FORCE ROW LEVEL SECURITY` is false on all 3 |
| RLS policies | 3 policies exist: audit_logs SELECT, inquiries ALL, user_consents ALL; each is assigned to `public` |
| Function EXECUTE | `propertylink_app` can execute all 10 inspected public functions |

Conclusion: the role meets the non-superuser/non-BYPASSRLS requirement, but it currently has no direct application table or sequence grants, so API database operations cannot work. RLS policy presence does not grant table privileges; grant the minimum required privileges and then verify policy behavior under the app role. No grants or database records were changed.
