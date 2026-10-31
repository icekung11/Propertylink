# PropertyLink Change Log

## Duplicate location keys and seed reuse — 2026-10-20

- Properties filters retain DB IDs for category/location keys. Name-based location filtering renders each display name once. Homepage static category metadata uses stable code IDs for its keys; Seller category options already use DB IDs.
- Location seed looks up existing name and reuses its ID in upsert. A transaction advisory lock serializes seed runs; category upserts by unique code remain intact. No existing location/category rows were deleted.
- TypeScript passed. Two consecutive seed runs preserved 14 locations and 5 categories without increasing duplicate groups. Live inspection still shows two Chiang Mai rows and no uq_locations_name constraint/index in the connected database; see LOCATION_KEY_FIX_RESULTS.json. Prisma schema was not falsely marked unique while the live constraint is absent.

## Restore Owner/Admin Register — 2026-10-20

- Restored both role choices and allowed all four roles in Register per explicit operator request. Added the matching narrow Admin self-registration exception to fn_check_assign_admin; preserved Owner requirements for existing-account Admin assignment.
- Fixed existing OTP storage mismatch by widening otp_code to varchar(64), regenerated Prisma Client, and kept hashed verification/attempt checks. No invitations or new signup wizard added.
- Real registration/OTP/password/cookie/dashboard/logout/revocation verification passed 45/45 for all four roles; temporary accounts cleaned. Regression passed 83/83. See REGISTRATION_ROLE_CHANGE.md and raw registration verification results.

## Missing seed contact information — 2026-10-20

- Inspected schema and added optional listing contact_phone/contact_email/contact_line via explicit idempotent additive SQL. Regenerated Prisma Client and populated original sample contact channels on all 10 seed listings; authentication identities preserved.
- Mapped published Email/LINE to Detail, wired Show phone number to Buyer-only reveal, and omitted phone from public list/detail/Favorites. Seed rerun and contact privacy checks pass. Build PASS, HTTP 83/83, expanded verification 41/41; temporary reveal fixtures cleaned.

## Phase 2 seed and fixes — 2026-10-20

- Added explicit idempotent `npm run seed` from sampleData and ran it against propertylink_db. Stable seed identities isolate sample accounts/records; house upsert plus SQL UPDATE enforce `Single house`. 10 users, 10 listings, 31 images, 4 inquiries, 2 explicit + 4 trigger notifications, 2 favorites persisted; repeat seed counts verified unchanged.
- Fixed nested BigInt JSON responses, malformed listing UUID handling, integer pagination, image_url mapping, missing SVG fallback and detail image fallback. Aligned category spelling in sample data/types/cards/Footer.
- Connected Account save to real profile PUT with saving/error handling; replaced fake Forgot email success with the requested unavailable message.
- HTTP regression improved from 77/83 to 83/83; 35 targeted ownership/seed/write checks pass. Build/type checking pass. Added PHASE2_IMPLEMENTATION_REPORT.md and raw evidence. Verification restored seed profile and cleaned temporary listing data. Schema/grants/migrations/environment secrets were not changed.

## System recheck — 2026-10-20

- Added scripts/recheck-system.cjs and SYSTEM_RECHECK.md with raw sanitized HTTP results. All 31 required contracts exist; 83 HTTP probes produced 77 passes and 6 failures. No successful business writes, DB/schema/grant changes or environment secret edits were performed.
- Restarted the dev server to load current environment; verified final postgres connection and configured AUTH_SECRET. npm run build and npx tsc --noEmit passed.
- Documented Seller BigInt 500, invalid UUID 500, fallback image 404, pagination validation gaps, wrong image adapter field, false Account/Forgot success, post-login hydration gap, unavailable providers/UI actions and remaining verification. Production behavior was not changed by this recheck.

## Implementation update — 2026-10-20

- Added signed HS256 sessions with DB-checked account status and roles; removed trust in `x-user-id`. Login requires an operator managed `AUTH_SECRET`; none was generated or written.
- Hardened login, registration, OTP verification, logout, role protected routes, listing creation/submission/images, favorites, and owner admin assignment.
- Implemented `POST /api/inquiries` and API persistence for app context inquiries, favorites, and notifications.
- Public listings now filter to `APPROVED`; homepage and properties listing read API data. Removed unsupported hard-coded totals and category counts.
- Added Suspense wrappers to pages using `useSearchParams`.
- No database schema, migrations, live records, or environment secrets changed.

### Verification

- `npm run build`: PASS; all 30 pages generated, type checking passed.
- `npm run lint`: BLOCKED; no ESLint config exists and the command requests interactive setup.
- HTTP API/E2E checks: BLOCKED; preview server is unreachable from this shell and no test harness exists.
- Remaining sample data in buyer/seller/admin/owner/detail/favorite views means end-to-end API coverage is not complete.

## Phase 2/3 continuation — 2026-10-20

- Replaced sample-data consumers in all requested pages and Favorites drawer with API reads; added data loading/error/empty states and removed unsupported hard-coded totals.
- Connected Admin approve/reject, Seller submit/mark-sold, profile name updates, Buyer favorites, and inquiry status/replies to backend APIs. Unsupported actions show errors rather than success messages.
- Added owner-admin listing API; used transaction-local user context for owner aggregates and admin moderation; disabled unsafe mock seed route; made unhandled DB errors generic.
- `npm run build` passes (30 static pages). Anonymous auth/RBAC probes return 401, forged `x-user-id` returns 401, and mock seed returns 410.
- Actual database tests are blocked: Prisma CLI returns P1000 for the current `propertylink_app` credentials. Therefore login, data reads, RLS, and Buyer A/B privacy tests are not claimed as passed.

## 2026-10-20 — Baseline audit documentation

### Files added

- `API_INVENTORY.md` — inventories all 31 requested contracts, source files, auth/database findings, and frontend consumers.
- `IMPLEMENTATION_PLAN.md` — records risk-ranked gaps, dependencies, live database audit, object/rule findings, and blockers.
- `API_TEST_REPORT.md` — records database introspection and attempted HTTP checks with actual outcomes and blockers.
- `SRS_COMPLIANCE_MATRIX.md` — maps requested behaviors to code/database evidence and current gaps.
- `CHANGELOG_PROPERTYLINK.md` — this audit log.

### Reason and effect

The master prompt requires Phase 0 inventory before source edits. Live read-only introspection then confirmed schema/security details that cannot be inferred from checked-in migrations. These reports preserve that evidence and identify prerequisites for safe implementation.

### Source/runtime changes

- No source code, schema, migrations, database records, or environment secrets were modified.
- No API writes were run.

### Verification

- Live DB metadata queries succeeded against `propertylink_db.public`.
- HTTP API checks could not connect to `localhost:8443`; outcome is documented as blocked, not passed.
- Build, lint, type checks, automated tests, and UI regression have not yet run.

### Open risks

- No signing secret configured; the pending user choice is needed before implementing secure sessions.
- No SMS/storage provider configuration was found.
- Live schema diverges from checked-in migrations and has no `_prisma_migrations` table.
- Current application DB connection is superuser/BYPASSRLS, so existing RLS policies do not protect it.
- Workspace has no usable Git metadata to compare against prior changes.
