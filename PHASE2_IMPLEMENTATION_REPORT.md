> Current status (2026-10-31): see [PROJECT_STATUS.md](PROJECT_STATUS.md). This document retains historical October 20 evidence; its remaining-work lists are superseded.

# PropertyLink Phase 2 — seed, naming and bug fixes

Contact correction (2026-10-20): added nullable contact_phone/contact_email/contact_line columns through the reviewed additive script `prisma/manual/listing-contact-information.sql`, updated Prisma mapping and seed upserts, and populated all 10 seed listings from sample sellerPhone/sellerEmail/sellerLine. Public Detail displays listing Email/LINE through the adapter; phone is excluded from public list/detail/Favorites payloads and exposed through the Buyer-only reveal endpoint/UI button. Existing authentication contacts were preserved. This supersedes earlier statements that schema was unchanged. Latest verification: HTTP 83/83, expanded Phase 2 41/41, and build PASS. No browser E2E performed. See CONTACT_INFORMATION_PLAN.md and raw result JSON files.

Completed 2026-10-20 against `propertylink_db` using the requested `postgres` connection. RLS tests remain deferred; personal-data API predicates remain in place.

## Seed

Run `npm run seed` (`scripts/seed-db.cjs`). The script reads `src/data/sampleData.ts`, uses stable UUIDs and upserts, runs in one transaction, and refuses a database other than `propertylink_db`. It updates `categories.code='house'` to `name='Single house'` through both category upsert and an explicit parameterized SQL UPDATE. Existing non-seed users and listings are preserved. The script does not delete data, disable triggers, change grants/schema/migrations, or expose credentials.

Fixtures persisted: **10 seed users, 10 listings, 31 images, 4 inquiries, 2 explicit notifications, 2 favorites**. Inquiry INSERT triggers additionally created 4 seller notifications and contact-history records, so there are 6 notifications in total. Users are isolated under `seed.*@propertylink.example.invalid`. Seed listing numbers start `SEED-`; locations use stable IDs. Historical fake audit events, view totals, and inquiry counters were not imported as real activity.

Some old mocks had only two images. Their image sets were supplemented with distinct photos from the existing mock photo pool, satisfying the database's minimum of three; no image constraint or trigger was disabled. Images are external sample HTTPS URLs, not uploads to a storage provider. Seed accounts have active/phone-verified demo flags to satisfy listing business rules; no SMS was sent.

Seed accounts have password login disabled by default. To enable disabled seed accounts, supply a private `SEED_PASSWORD` (8-128 characters) in the process environment and rerun seed. Existing enabled passwords are preserved. No shared default password, signing secret, or plaintext password is generated, logged, or stored by the script. Results: `SEED_RESULTS.json`.

Repeated seed runs completed successfully. `scripts/verify-phase2.cjs` compared counts before/after a seed rerun and verified no duplicate records were created.

## Fixes

- Added `src/lib/json-safe.ts` to encode nested BigInts as lossless strings while preserving Date/Decimal JSON behavior. Applied to Seller list/edit/status, Buyer favorites, Admin moderation, public detail, and Owner audit-log responses. Seller write predicates retain session seller ownership.
- Listing detail validates UUID syntax before querying Prisma and returns 400 for malformed IDs. The UUID detail route now uses the UUID directly instead of mixing a malformed UUID with a slug query.
- Added shared strict integer pagination checks to Seller listings, Notifications and Owner audit logs, resolving the remaining three pagination failures.
- `property-adapter.ts` reads `image.image_url`; added `/public/placeholder-property.svg` and detail-gallery fallback. Publication time now uses the API's actual timestamp fields.
- Database-driven search/filter/detail names expose `Single house`; sample source, Category type, card style key and Footer label use the same spelling. Historical imported design-prompt documents were preserved.
- Account form calls PUT /api/users/me, displays saving/error states, and updates shared profile names only after success. Phone remains read-only because this API supports name updates.
- Removed the fake password-reset email flow. Forgot Password displays exactly `ระบบกู้คืนรหัสผ่านยังไม่เปิดให้บริการ`.

## Verification

| Check | Result | Evidence |
|---|---|---|
| Existing HTTP regression suite | **83 PASS / 0 FAIL** (previously 77/6) | SYSTEM_RECHECK_RESULTS.json |
| Seed/ownership/write verification | **35 PASS / 0 FAIL** | PHASE2_VERIFICATION_RESULTS.json |
| Idempotent seed | PASS; row counts unchanged after rerun | Phase 2 verification |
| Category source | PASS: categories API, category search and seeded detail return DB name `Single house` | Phase 2 verification |
| Nonempty favorites | PASS; seeded nested listing/category/location data serializes | Phase 2 verification |
| Populated Buyer A/B isolation | PASS: lists scoped; other buyer's message read/status update/message post return 404 | Phase 2 verification |
| Notification ownership | PASS: populated seller collection scoped; Buyer cannot mark Seller notification read | Phase 2 verification |
| Account persistence API | PASS: seeded profile PUT then GET confirms saved name; original name restored | Phase 2 verification |
| Listing workflow | PASS: create -> edit -> attach sample URLs -> submit -> approve -> favorite/save/remove -> SOLD | Phase 2 verification |
| Seller identity | PASS: body sellerId cannot override the session seller | Phase 2 verification |
| Cleanup | PASS: temporary listing and associated moderation/history/notification data removed | Phase 2 verification |
| TypeScript | PASS: npx tsc --noEmit | Command execution |
| Production build | PASS: npm run build; 30 pages generated | Command execution |

The workflow verifier uses signed test sessions for seeded accounts; it does not test valid-password login or browser cookie issuance. It changes only seed profile names temporarily (then restores them) and its own temporary listing records (then removes them). Successful URL attachment in development does not establish a real storage upload integration. No browser E2E or visual inspection was performed; frontend wiring was checked in source and backend persistence was verified over HTTP. The dev server was restored on port 3000 after build.

## Remaining scope

SMS OTP delivery, real file storage, password reset implementation, post-login shared collection hydration, unavailable Seller/Admin/Owner UI actions, migration baseline, and database single-role enforcement remain outstanding. These were not implemented in this task. RLS verification remains deferred. Passing this task's probes does not establish complete production readiness.
