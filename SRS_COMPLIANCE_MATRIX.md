> Current status (2026-10-31): see [PROJECT_STATUS.md](PROJECT_STATUS.md). This document retains historical October 20 evidence; its remaining-work lists are superseded.

# PropertyLink SRS Compliance Matrix (Audit Baseline)

Operator policy change (2026-10-20): public registration now permits Buyer/Seller/Owner/Admin as explicitly requested. UI choices and backend allowlist match. Admin role insertion permits only the new-user self-registration exception with pending status and unused registration OTP; existing-account Admin assignment retains Owner enforcement. OTP hash storage widened from 10 to 64 characters. Real development signup/OTP/password login/cookie/profile/dashboard/logout/revocation checks: 45/45 PASS; regression: 83/83 PASS. Earlier requirements denying Owner/Admin signup are superseded by this user instruction. Production SMS integration remains outstanding. See REGISTRATION_ROLE_CHANGE.md.

Latest contact update (2026-10-20): PASS for persistence of Phone/Email/LINE on all 10 seed listings, API-to-adapter Email/LINE mapping, and Buyer-only phone reveal with public phone omission. Applied three nullable listing contact columns through explicit additive SQL; login identity emails/phones unchanged. HTTP 83/83, targeted checks 41/41 and build PASS. Browser E2E remains unverified. See CONTACT_INFORMATION_PLAN.md; earlier schema-unchanged and 35-check statements are superseded.

## Current Phase 2 corrections — supersedes earlier status rows

2026-10-20: HTTP regression **83 PASS / 0 FAIL**; targeted seed/ownership/write verification **35 PASS / 0 FAIL**; build/type checking PASS. Full evidence and limitations: [PHASE2_IMPLEMENTATION_REPORT.md](PHASE2_IMPLEMENTATION_REPORT.md).

| Requirement | Current result |
|---|---|
| Mock fixtures persisted/idempotent | PASS: 10 users, 10 listings, 31 images, 4 inquiries, 6 total notifications, 2 favorites; seed rerun preserves counts |
| house category display name | PASS: upsert + SQL UPDATE set `Single house`; categories/search/detail expose DB name; UI/source labels aligned |
| Seller/Favorites BigInt serialization | PASS: nonempty reads and successful Seller edit/status/Admin moderation responses verified |
| UUID/integer pagination/fallback image | PASS: all former six HTTP probe failures resolved |
| Property image mapping | PASS: adapter accepts API image_url; placeholder exists |
| Account persistence / Forgot wording | IMPLEMENTED: real profile API and saving/error states; seed PUT/GET persistence verified; Forgot reports unavailable |
| Populated application ownership | PASS for seed Buyer A/B inquiry reads/status/messages and cross-user notification mutation denial; RLS not tested |
| Development listing/favorite workflow | PASS: create/edit/sample URL attach/submit/approve/favorite/remove/SOLD; temporary records cleaned |
| Production SMS/storage/browser E2E | Still unimplemented/unverified; sample URL attachment is not a storage integration |
| Hydration/unavailable UI/migration/single-role DB constraint | Still outstanding |

## Authoritative current status — 2026-10-20

Overall: **PARTIAL; functionality is incomplete**. Current evidence is [SYSTEM_RECHECK.md](SYSTEM_RECHECK.md) and [SYSTEM_RECHECK_RESULTS.json](SYSTEM_RECHECK_RESULTS.json). Earlier sections below are historical and superseded by this update.

| Requirement | Current result |
|---|---|
| Required API source coverage | PASS: 31/31 contracts, 38 exported methods, 30 route files |
| Database connectivity | PASS: Prisma reads as `postgres`; RLS testing deferred |
| Build/type checking | PASS: npm run build and npx tsc --noEmit |
| HTTP probes | 77 PASS / 6 FAIL out of 83; details in recheck report |
| Public listings visibility | PASS for inspected data: approved list/detail work; draft status override and draft detail do not disclose drafts |
| Seller list | FAIL: authenticated request returns 500 due to BigInt serialization |
| Auth and role gates | Signed test-session reads and denial checks pass; final AUTH_SECRET configured; actual password login success unverified |
| Personal data ownership | Source predicates and empty reads checked; populated A/B inquiry isolation still unverified |
| Image display | FAIL: adapter reads url instead of image_url; fallback asset 404 |
| Account / Forgot Password UI | FAIL: these two forms still claim success without backend persistence/delivery |
| Post-login shared state | PARTIAL: mount-only hydration does not reload collections on login |
| SMS/storage integration | BLOCKED: no real providers; production register/upload return 503 by source |
| Seller/Admin/Owner UI completeness | PARTIAL: edit/delete/password/revision/hide/permission workflows unavailable |
| One user / one role DB constraint | FAIL: no unique user_id constraint/index exists in inspected user_roles table |
| Migration baseline | BLOCKED: live-schema drift and missing _prisma_migrations registry |
| Successful write workflows / browser E2E | NOT VERIFIED; no business records changed by recheck |

Application ownership enforcement update (2026-10-20): Personal Inquiries, Notifications, Favorites, and Profile routes use identity predicates derived from the authenticated session. Inquiry status updates and seller reply updates include ownership in their UPDATE predicates; message reads and nested message previews include parent-inquiry participant filters. Message creation verifies participation and derives sender identity from the session. Source review and TypeScript checking passed; cross-account HTTP checks remain unverified and RLS testing is deferred by user instruction.

Latest recheck (2026-10-20): current Prisma connection uses `postgres` (superuser and BYPASSRLS), and category/location/listing/user model reads succeed. `propertylink_app` still has no SELECT/INSERT/UPDATE/DELETE grants on any of the 20 public tables. Database reads therefore pass under the active privileged connection, while least-privilege application access and runtime RLS verification remain unresolved. This supersedes earlier statements about the active connection role. No grants or database rows were changed.

วันที่ตรวจ: 2026-10-20. สถานะอิง source review และ live database metadata/function/trigger introspection; API write workflows, UI regression และ RLS under a least-privilege role ยังไม่ได้ทดสอบ. `PARTIAL` หรือ `FAIL` ไม่ควรตีความว่า production-ready.

| Requirement | Implementation evidence | Status | Gap / next action |
|---|---|---|---|
| มี API ครบ 31 contracts | Inventory ครบทุก path ใน `API_INVENTORY.md` | PARTIAL | พบ 30 route handlers; `POST /api/inquiries` ขาด |
| สมัครผู้ใช้ด้วย role ที่อนุญาต | `auth/register` accepts body `role`; DB roles include owner/admin/seller/buyer | FAIL | ปิดการเลือก Owner/Admin จาก registration; ตอนนี้อาจ self-register Owner |
| ผู้ใช้หนึ่งคนมี role เดียว | `user_roles` has PK `(user_id,role_id)`; current data has no duplicates | FAIL | ไม่มี unique-per-user constraint; plan schema fix only after migration plan/approval |
| Authentication token/session ตรวจสอบได้ | `auth/login` returns Base64 JSON; `auth-guard` accepts same and `x-user-id` | FAIL | ไม่มี signature/expiry validation; role spoofing and user impersonation possible |
| Password hashing เหมาะสม | Login/register use SHA-256; login also accepts literal `password` | FAIL | Replace with salted adaptive hash; plan compatible verification/upgrade for existing hashes |
| OTP ใช้จริงและจำกัดความพยายาม | `auth/register` generates OTP; no SMS provider key/config; verify checks expiry/used and increments attempts | PARTIAL | OTP not delivered; no confirmed max attempts/rate limit; userId/phone target public |
| PDPA consent เกิดจากการยินยอมจริง | OTP verification automatically sets `pdpa_accepted_at` and inserts accepted consent | FAIL | Capture explicit consent from user; do not mark accepted automatically |
| Account/profile API protects identity | `users/me` routes use guard; PUT has allowlist; DELETE soft deletes `deleted_at` | PARTIAL | Guard is spoofable; runtime RLS path not effective with current superuser DB role |
| Public categories only active records | categories API filters `is_active=true`; live DB has 5 categories | PARTIAL | Static implementation supports requirement; endpoint HTTP not reachable for runtime verification |
| Public locations from DB | locations API reads live table (4 rows) | PARTIAL | No search/filter; endpoint HTTP not reachable; no frontend consumer found |
| Public listing search only approved | List API defaults APPROVED but uses query-provided `status`; detail filters APPROVED | FAIL | Client can request DRAFT/PENDING statuses from list endpoint; no listing RLS |
| Seller can only see/edit own listings | Seller list filters by guard userId; update includes sellerId ownership | FAIL | Seller list checks authentication but not SELLER role; token spoofable; create/submit/images lack dependable auth/ownership |
| Listing creation verifies seller and account | DB INSERT trigger checks phone verification and active status | PARTIAL | DB check exists, but `/api/listings` uses body identity and demo fallback; `seller/listings` POST trusts body identity |
| Submit requires 3–15 uploaded images | DB trigger enforces min on submit, max 15 on image insert; API accepts client URLs | PARTIAL | Count rules exist; no actual storage upload, MIME/size validation, or robust ownership check |
| Submit rate limit is 10/day | DB trigger counts listing inserts over rolling 24h | PARTIAL | It does not rate-limit submit operations/calendar day; trigger application differs from requirement wording |
| Admin moderation is role protected | Admin routes use `tryRole(admin)` and DB trigger blocks self-approval when actor context is seller | FAIL | Unsigned token permits forged role/userId; DB connection superuser skips RLS; runtime test absent |
| Owner alone assigns Admin | Owner endpoint requires owner; DB trigger checks `app.user_id` role | FAIL | Auth claims forgeable; app DB role bypasses RLS; DB allows multi-role assignments |
| Favorites use real user-specific data | GET/POST/DELETE use Prisma tables and userId filter | PARTIAL | Guard is spoofable; no visibility check; no frontend integration found |
| Inquiry creation, contact history, notification | DB has `AFTER INSERT` triggers for contact history and seller notification | FAIL | Required `POST /api/inquiries` missing; API implementation must not duplicate trigger effects |
| Inquiry/message access restricted to participants | GET/message routes query buyer/seller participant; `inquiries` has RLS policy | PARTIAL | Identity is spoofable and current app DB role bypasses RLS; no write-flow tests |
| Notifications are per-user | GET/read update filter by userId | PARTIAL | Guard spoofable; frontend uses sample notifications; no API consumer found |
| Owner dashboard and audit logs use real DB | Owner dashboard aggregates DB; audit logs read DB | PARTIAL | Guard spoofable; audit_logs RLS bypassed by current DB role; frontend owner page imports samples |
| No mock data in production workflows | `src/data/sampleData.ts` is imported by home, buyer, properties, seller, admin, owner, favorites and shared context; listing POST can create demo seller; seed-mock route exists | FAIL | Connect pages/components to APIs; isolate/remove mock production flows after confirming intended UX |
| Database migrations match live schema | Two checked-in migration SQL files; live DB has no `_prisma_migrations` and columns differ | FAIL | Establish authoritative migration baseline and reviewed non-destructive plan; do not reset or apply blindly |
| RLS secures application queries | RLS policies on inquiries/audit_logs/user_consents only; current DB connection is superuser/BYPASSRLS | FAIL | App runtime must use least-privilege DB role; test policies with that role and context |

## Workflow Verification

No frontend workflow is marked passed. Shell requests to `localhost:8443` received no response; no test runner or E2E harness exists in project scripts. See `API_TEST_REPORT.md` for each attempt and blocker.

## Implementation status update (2026-10-20)


## Phase 2/3 status correction (2026-10-20)

The Phase 0 rows above are historical. Current source evidence:

| Requirement | Current implementation | Status | Verification |
|---|---|---|---|
| Target pages do not import sample data | Home, Properties, Buyer, Seller, Admin, Owner, Favorites drawer and Property Detail consume APIs; `rg` found no sampleData/SAMPLE/PUBLIC_PROPERTIES/ADMIN_USERS imports under app/components/context | PASS (source) | Static search |
| Public listings | API query fixes status to `APPROVED`; ignores client status parameter | PASS (source), runtime blocked | Code review; HTTP 500 occurs during Prisma connection before query result |
| Listing seller identity | Listing create APIs derive seller from signed session; frontend no longer sends sellerId | PASS (source) | Code review; anonymous POST returns 401 |
| Admin moderation | Pending queue and moderation APIs require admin/owner session; actor comes from verified session; updates/log/notification are transactional | PASS (source), runtime blocked | Anonymous GET/PUT return 401 |
| Owner dashboards/admin list/audit | Fetches dashboard, admins, logs from protected APIs; values no longer use sample counts | PARTIAL | Source review; anonymous requests return 401; authenticated reads blocked by DB credentials |
| Inquiry actions and replies | Participant scoped status/message APIs run with transaction-local RLS context; UI reports success only after API success | PASS (source), runtime blocked | Code review; unauthenticated inquiries GET returns 401 |
| RLS context | `withUserContext` sets transaction-local `app.user_id`; inquiry/favorites/notifications/audit logs/admin moderation/owner aggregation use it; register/OTP set it inside their transactions | PASS (source), runtime unverified | Static search; read-only DB connection fails P1000 |
| Login/session and Buyer A/B isolation | Signed session source exists and `AUTH_SECRET` is configured; actual login and cross-user isolation could not be tested | BLOCKED | DB URL using `propertylink_app` fails authentication |
| Mock seed | Unauthenticated mutating `/api/seed-mock` replaced with 410 response | PASS | HTTP GET returned 410 |

Production readiness is not confirmed. `DATABASE_URL` must authenticate successfully before signed login, database reads, RLS, and cross-account isolation can be tested. Image storage and SMS/OTP delivery remain unconfigured. Build passed; see `API_TEST_REPORT.md` for request-by-request evidence.

## Database/API recheck (2026-10-20)

The earlier Phase 2/3 status text above is superseded for database connectivity: Prisma now connects as `propertylink_app` to `propertylink_db`. A direct Prisma Client read then failed with PostgreSQL `42501 permission denied for table locations`; `information_schema.table_privileges` showed no table grants for the application role. Therefore:

| Requirement | Current evidence | Status | Next action |
|---|---|---|---|
| Database connection | Read-only Prisma identity query succeeded | PASS (connection only) | No change |
| Public APIs read database rows | `/api/locations` and public listings returned 500 before error normalization | BLOCKED | Apply reviewed least-privilege table/sequence grants and verify RLS |
| Listing public visibility at runtime | Source filters `APPROVED`; live request cannot read table | PARTIAL | Re-test `?status=DRAFT` after grants |
| Authentication and per-user RLS | Anonymous protected routes return 401; no authenticated request can proceed to DB data | PARTIAL | Re-test login, `/api/users/me`, and Buyer A/B isolation after grants |
| Build | `npm run build` passed and generated all 30 pages | PASS | Rebuild after future source changes |

No live database privileges or rows were modified in this recheck. `API_TEST_REPORT.md` records the exact requests and results.

### Detailed privilege result

Read-only catalog checks show `propertylink_app` can CONNECT and use the `public` schema, and is neither superuser nor `BYPASSRLS`. It has no SELECT/INSERT/UPDATE/DELETE grants on any of the 20 public tables and no USAGE/SELECT/UPDATE grants on any of the 6 public sequences. RLS is enabled on `audit_logs`, `inquiries`, and `user_consents`, but is not forced; three policies exist and are assigned to `public`. The role can execute the 10 inspected public functions. API database access remains BLOCKED until reviewed table and sequence grants are applied; RLS behavior must then be retested under this role. No live grants or rows were changed.
