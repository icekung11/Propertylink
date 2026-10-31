# PropertyLink Implementation Plan

สถานะนี้ตั้งต้นจาก static review/Phase 0 เท่านั้น. ห้ามแก้ source, schema, migration หรือข้อมูลก่อนปิดรายการตรวจตามลำดับ.

## Findings / Gaps (เรียงตามความเสี่ยงและ dependency)

1. **P0 Authentication/RBAC ไม่เชื่อถือได้:** `src/lib/auth-guard.ts` ยอมรับ Base64 JSON แบบไม่มี signature/expiry validation และ `x-user-id`; login ออก token แบบเดียวกัน. Role ใช้ claims ที่ client สร้าง/แก้ได้. กระทบ endpoint ที่ใช้ `tryAuth`/`tryRole` ทั้งระบบ.
2. **P0 Mock production behavior:** `POST /api/listings` ใช้ seller ID จาก body, ค้น OR ด้วยเงื่อนไขกว้าง และสร้าง demo seller ด้วย password hash ปลอม/ข้อมูล hardcoded. ต้องตัดสินใจแก้หลัง API contract/auth review.
3. **P0 Password/registration:** plain SHA-256, login ยอมรับ password literal `password`, register รับ role จาก body และ OTP ไม่มี provider; verify-otp ตั้ง PDPA consent โดยไม่มีหลักฐาน consent จากผู้ใช้.
4. **P1 Public visibility:** `GET /api/listings` รับ status query จาก client; detail route ต้องยืนยัน approved/visibility; frontend listing/detail ยังใช้ sample data หรือไม่มี fetch ที่พบ.
5. **P1 Missing endpoint:** `POST /api/inquiries` ไม่พบ. ต้องตรวจ schema/trigger เพื่อไม่สร้าง notification/contact-history ซ้ำ.
6. **P1 Database rules unverified:** migrations สองชุดไม่แสดง trigger/function/RLS/policy; ต้องตรวจฐานข้อมูลจริงก่อนสรุปหรือเพิ่ม logic.
7. **P1 Upload:** ตรวจ storage จริง, MIME/size, ownership, จำนวน 3–15, persistence compensation; ยังไม่ยืนยัน provider.
8. **P1 Authz/data ownership:** ตรวจ route ทั้งหมด, one-user-one-role, admin self-approval, owner-only admin assignment, soft delete, seller status, listing transitions และ RLS transaction context.
9. **P2 Frontend integration:** fetch พบเฉพาะ LoginModal และ Seller workflow; audit page-by-page ว่าข้อมูลจริงหรือ sample, เพิ่ม states เฉพาะจุดตามจำเป็น.
10. **P2 Error contract and QA:** ตรวจ `db-errors.ts`, validation และ test setup; ไม่มี test/typecheck script ใน package.json.

## Dependency Order

1. Phase 0 inventory (เสร็จ): `API_INVENTORY.md` และเอกสารนี้.
2. Phase 1 DB/schema audit: ตรวจ connection แบบไม่แสดง secrets; introspect objects จริง ถ้าเชื่อมต่อไม่ได้ใช้ migrations/schema และระบุข้อจำกัด.
3. Phase 1 auth/RBAC/RLS: สรุป trusted identity, one-role invariant, session context และ security test plan. การเปลี่ยน auth เป็น high impact; ทำ patch แบบรักษา compatibility และรายงานความเสี่ยงก่อน rollout.
4. Phase 2 error contract; จากนั้น Group 1 Auth/Profile, Group 2 Public, Group 3 Seller, Group 4 Admin, Group 5 Buyer (รวม Inquiry POST), Group 6 System/Owner.
5. เชื่อม frontend ตาม API contract; คง UI เดิม.
6. Phase 3 tests/build/lint/typecheck/workflow/UI regression ตามเครื่องมือที่มี.
7. Phase 4 ส่งรายงาน compliance, change log และหลักฐานจริง.

## Files in Scope

- API: `src/app/api/**/route.ts` (31 route contracts; Inquiry POST missing).
- Auth/data/errors: `src/lib/auth-guard.ts`, `src/lib/db-session.ts`, `src/lib/db-errors.ts`, `src/lib/prisma.ts`.
- Frontend consumers: `src/components/LoginModal.tsx`, `src/app/seller/page.tsx`; inspect `src/app/properties/**`, buyer/admin/owner pages and `src/data/sampleData.ts` during Phase 2.
- Database evidence: `prisma/schema.prisma`, both current migration SQL files, `prisma.config.ts`.
- Do not modify `.env` or expose secret values.

## Database Objects to Verify

Tables/models: users, roles, user_roles, otp_verifications, user_consents, categories, locations, listings, listing_images, favorites, inquiries, inquiry_messages, notifications, contact_history, phone_reveals, listing_status_history, moderation_actions, audit_logs. Inspect all 20-table claim against live DB; constraints, indexes, views, enums, functions, triggers, RLS policies, seed rows and migration state. Specifically verify OTP gating, image 3–15, admin self-approval, submit rate 10/day, owner-only admin assignment, active account, ownership/status transitions, public visibility, inquiry side effects, soft delete.

## Blockers / Risks

- Live database connection/credentials and deployed schema state not verified. `.env` exists but its contents were intentionally not displayed. Next step can test connectivity without printing connection strings; if blocked, report DB findings as migration/schema-derived only.
- No Git repository metadata is available from this workspace, so change baseline and user-owned modifications cannot be determined via `git diff`.
- Authentication change affects all protected routes and browser session behavior; keep compatibility considerations explicit.
- SMS/OTP provider and image storage provider are not evident from package/dependency inspection; no claim of delivery/storage success until verified.
- Phase 0 source edits are prohibited; only these two reports were added.

## Phase 0 Exit

- [x] `API_INVENTORY.md` covers all 31 required endpoints.
- [x] `IMPLEMENTATION_PLAN.md` records gaps, dependencies, risks, source files, DB objects.
- [x] No source/API/schema changes made in Phase 0.

## Implementation progress (2026-10-20)

- Secure signed sessions, DB-backed role/status checks, route role gates, login/registration/OTP/logout hardening, inquiry creation, and API-backed app context interactions have been implemented. Login requires operator-provided `AUTH_SECRET` (at least 32 bytes); it was not generated or saved.
- Homepage and `/properties` now read approved listings from the API; unsupported hard-coded platform totals/category counts were removed. `useSearchParams` pages now have Suspense boundaries.
- `npm run build` passes, including type checking and generation of all pages. `npm run lint` is blocked because no ESLint config exists and `next lint` opens interactive setup.
- HTTP/API integration and E2E checks remain blocked because the preview is unreachable from this shell; no automated test harness exists.
- Remaining sample-data consumers include buyer/seller/admin/owner views, listing details and favorites display. API completeness and frontend workflows are therefore still partial.
- Schema, migrations, live database records, and environment secrets were not modified. Do not change schema/migrations until the live/check-in mismatch and missing `_prisma_migrations` registry have an operator-reviewed plan.

## Phase 2/3 follow-up execution (2026-10-20)

- Target UI pages no longer import sample data; homepage/public listings, seller listings, Buyer favorites/inquiries, Admin queue/moderation and Owner metrics/admins/audit logs consume API results. Loading/error/empty states were added where the UI loads those collections.
- Added persistent inquiry status/reply API operations and wired InquiryCard actions to responses. Profile name updates call `PUT /api/users/me`. Seller submit/sold actions call APIs; unsupported image upload, password change, hide/revision/delete actions now show unavailable errors instead of success.
- Disabled unauthenticated mock seeding (`GET /api/seed-mock` returns 410). Sanitized generic database errors so Prisma internals are not returned to HTTP clients.
- Static source audit confirms RLS-protected user operations execute via `withUserContext` or explicit transaction-local context. This does not establish that the operator's role/constraint changes are live because the current connection cannot authenticate.
- HTTP probes confirm anonymous requests to `/api/users/me`, inquiries, admin queue/moderation and owner endpoints return 401; forged `x-user-id` also returns 401. `seed-mock` returns 410.
- Current `.env` includes `AUTH_SECRET`, but read-only Prisma CLI and public data APIs fail authentication for `propertylink_app` at localhost. No actual login or Buyer A/B isolation test is possible until this connection works.
- `npm run build` passes after the changes. Build used the shared `.next` directory and invalidated the running dev process; the process was restarted successfully on port 3000.
- [x] Live DB/security audit completed with read-only introspection. API/runtime verification remains for subsequent phases.

## Phase 1 Database Audit (live read-only introspection, 2026-10-20)

Connection succeeded to `propertylink_db.public`; no connection string or secret was emitted. Observed live state:

- 20 base tables, 10 public functions, 11 distinct user triggers, 3 RLS policies, no views. This confirms the “20 tables” claim but corrects “10 triggers” to 11.
- RLS enabled (not forced) on `audit_logs`, `inquiries`, `user_consents` only. The 3 policies are `audit_logs_owner_only`, `inquiries_access_policy`, and `user_consents_self`; they depend on transaction-local `app.user_id`. No RLS policies exist on listings, favorites, notifications, user_roles, images, etc. The DB role used by this workspace connection is a superuser with BYPASSRLS and owns RLS tables; therefore RLS policies are bypassed for this application connection and cannot currently be treated as an effective security boundary.
- 4 allowed role codes exist (`owner`, `admin`, `seller`, `buyer`); 0 current users have multiple role assignments. However, `user_roles` has only composite PK `(user_id, role_id)` and has no unique-per-user constraint, so the one-role invariant is not enforced by schema. No DB change proposed yet.
- Business checks observed: OTP verified and account active on listing INSERT; image maximum 15, minimum 3 at submit and for approved listings; self-approval prevented when `app.user_id` equals seller; owner-only admin assignment; inquiry contact-history and seller-notification triggers; status history logging; listing INSERT rate count.
- Important differences: submit rate check is attached to listing INSERT and counts a rolling 24 hours, not submission events/day. Status-history trigger records transitions but does not itself enforce an allowed transition matrix. Admin self-approval and owner assignment trust `app.user_id`; ensure every API write sets verified actor context.
- Counts checked without PII: users 8, listings 7 (2 APPROVED, 5 DRAFT), categories 5, locations 4, roles 4, inquiries 0. Role multiplicity currently 0.
- No `_prisma_migrations` table exists. Current live schema materially differs from both repository migrations (e.g. listings location columns; listing image URL/storage columns; roles code/name). The migrations cannot be treated as a faithful recreation of this database. Do not generate/apply migration or reset DB; schema change would need a separately reviewed plan.
- `.env` key-name inspection found only `DATABASE_URL`; no signing secret or SMS/storage provider configuration is present. Secret values were not printed. Auth/session implementation therefore has a deployment configuration blocker; SMS OTP delivery and production image storage also remain unverified.

### Database rule matrix

| Rule | Live evidence | Result / gap |
|---|---|---|
| OTP before listing | `trg_listings_check_seller_verified` + `fn_check_seller_verified` checks phone_verified_at and `status='active'` on INSERT | Enforced when using live DB; fails closed only for inserts, not proof that a client owns the seller identity |
| 3–15 images | submit trigger checks min 3; image trigger max 15; approved listing cannot drop below 3 | Enforced by DB triggers; API image upload does not upload file bytes to a provider |
| Admin cannot self-approve | `trg_listings_prevent_self_approve` + `fn_check_admin_self_approve` | Enforced only when trusted `app.user_id` is set; spoofable app auth currently undermines identity source |
| 10 listings/day | `trg_listings_rate_limit` + `fn_check_listing_rate_limit` | Enforces at listing insert with rolling 24-hour window, not submit events/calendar day |
| Owner-only admin assignment | `trg_user_roles_assign_check` + `fn_check_assign_admin` | Enforced only if trusted `app.user_id`; DB itself permits multiple non-admin roles |
| Active seller | Same insert function checks active status | Enforced on listing INSERT |
| Listing ownership/status transitions | API ownership checks vary; DB status trigger only logs history | No complete DB transition enforcement confirmed |
| Public visibility | Detail API filters APPROVED; list API lets query status through | Not enforced by RLS; list endpoint can disclose non-public rows |
| Inquiry side effects | Two AFTER INSERT triggers write contact history and notification | Existing DB automation; Inquiry POST must avoid duplicate writes |
| Soft delete | users has `deleted_at`; listing has no deleted_at in live schema | Account endpoint can soft delete; listing soft delete not evidenced |

## Phase 1 Security / Integration Blockers

- Authentication currently has no signing secret configured (only `DATABASE_URL` key exists). Replacing the unsigned token touches every protected route and browser login flow. The impact is documented; choose a secure session signing secret/configuration before production rollout. Do not invent/store a deployment secret in this workspace.
- No SMS provider is configured; registration cannot claim OTP delivery. No storage provider is configured/evidenced; current image route stores client-supplied URLs only.
- Live schema and checked-in migrations diverge and migration registry is absent. Any schema modification is paused pending a reviewed non-destructive migration plan.
- Initial `git status` failed because this directory has no usable Git repository metadata; baseline diff cannot be audited.

### Phase 1 files reviewed

`prisma/schema.prisma`, both `prisma/migrations/*/migration.sql`, `src/lib/{prisma,db-session,auth-guard,db-errors}.ts`, all 31 route mappings and current direct fetch consumers. No source/schema/migration was modified; only Phase 0 reports have been created/updated.
## Current recheck priorities — 2026-10-20

This section supersedes earlier blocker/status notes in this file. Source coverage is 31/31 required contracts; latest HTTP run is 77 passed / 6 failed out of 83. Build/type checking passed; DB uses postgres and final AUTH_SECRET is available. See SYSTEM_RECHECK.md for evidence.

1. Fix BigInt response serialization in Seller list and raw listing responses; fix image_url mapping and missing fallback image.
2. Replace false success in Account save/Forgot Password; fix post-login collection hydration.
3. Add consistent UUID/integer pagination validation and complete unavailable Seller/Admin/Owner UI actions.
4. Integrate actual SMS OTP/image storage before claiming production register/upload works.
5. Resolve missing single-role DB constraint and migration baseline through the reviewed schema process.
6. Verify successful business writes and populated cross-account application ownership with isolated fixtures; RLS testing remains deferred by user instruction.

## Phase 2 completion update — 2026-10-20

Seed, Single house naming, BigInt/UUID/image/pagination fixes, real Account save and unavailable Forgot wording are complete. HTTP 83/83 and targeted seed/ownership/write verification 35/35 pass; build passes. See PHASE2_IMPLEMENTATION_REPORT.md. Earlier priorities marked BigInt/images/false success as pending are superseded. Remaining work: post-login hydration, real SMS/storage, unavailable Seller/Admin/Owner UI, migration baseline and single-role database enforcement. RLS tests remain deferred.
