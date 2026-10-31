# PropertyLink — FINAL 100% Figma Master Prompt

```text
PROPERTYLINK — PRODUCTION-READY FIGMA WEBSITE MASTER PROMPT

SOURCE OF TRUTH
Use the approved PropertyLink SA & System Design Final Baseline and the attached CPE230 Database System Design / Business Rules & ERD Technical Specification as the source of truth. Do not silently change confirmed requirements. Anything marked as “เสนอเพิ่มเติม” is optional/technical proposal and must be labeled as such.

BUILD ONE COMPLETE WEBSITE
Create ONE connected real-world responsive web application:
“PropertyLink — Real Estate Marketplace”

This is a Figma frontend/prototype specification. It must look like a real production website, not presentation slides, collage, poster, screenshot, or six disconnected mockups. All UI must be editable Figma layers/components.

EXACTLY 6 CORE WEBSITE AREAS
1. Home / Search
2. Property List
3. Property Detail
4. Seller / Create Listing
5. Admin / Listing Approval
6. Owner / Dashboard

Favorites, Contact History, Notifications, Audit History, Admin Permission Management, Login/Register, etc. are functions, modals, drawers, tabs, or nested sections. Do NOT make Buyer Favorites or Owner Admin Management separate core pages.

BUSINESS
PropertyLink connects Buyer and Seller. Seller creates listings. Buyer searches, views, favorites, and contacts Seller. Admin reviews listings before publication. Owner monitors business and Admin activity/permissions. System processes statuses, notifications, and histories automatically.

ACTORS
Visitor | Buyer | Seller | Admin | Owner | System

RBAC
Roles: BUYER, SELLER, ADMIN, OWNER.
Visitor and System are Actors, not RBAC roles.
One user may have multiple roles, e.g. BUYER + SELLER.

CATEGORIES
Single House
Condominium
Townhouse
Land
Commercial Building

GLOBAL PUBLIC HEADER
PropertyLink logo
Home
Properties
About Us
Contact
Favorites
Login
Register

HOME / SEARCH
Create a realistic commercial property homepage.
Hero with realistic Thai property photography.
Headline: “Find Your Perfect Property”
Supporting copy explaining trusted property search.
Search: Category, Price Minimum, Price Maximum, Location, Search.
Show the five categories.
Show 6 realistic approved/public property cards.
Card: cover image, For Sale badge, favorite, title, location, THB price, bedrooms, bathrooms, area, View Details.
Add About/Trust section and Contact section.
Footer: PropertyLink, About Us, Properties, Contact, Privacy Policy, Terms of Use, social links, copyright.
About/Contact may be scroll sections or lightweight overlays; do not invent company history.

PROPERTY LIST
Real search/results experience.
Breadcrumb Home > Properties.
Result count.
Keyword search by property title or location.
Primary filters: category, price range, location.
Location hierarchy: Country, Province, District, Subdistrict, Postal Code.
Additional UI filters: bedrooms, bathrooms, area, parking.
Default sort: newest / published_at DESC.
Optional sorts (label as proposal if used): price low-high, price high-low, most interested.
Desktop 3-column grid and optional list view.
Pagination with previous/page/next. Items-per-page may be prototype behavior, not confirmed business requirement.
Mobile: Filter button opens drawer/bottom sheet.
No-result, loading skeleton, and error/retry states.
Public results ONLY represent:
status = APPROVED
published_at <= current time
deleted_at IS NULL
category.status = ACTIVE
location.status = ACTIVE
Do not publicly show DRAFT, PENDING, REJECTED, HIDDEN, DELETED, SOLD, or CLOSED.

PROPERTY DETAIL
Breadcrumb.
Large cover image + thumbnails + photo count + previous/next + gallery overlay.
Show reference such as PROP-2026-000001.
Title, category, location, price THB, bedrooms, bathrooms, usable area, land area, parking.
Save, Share, Contact Seller.
Favorite:
- unauthenticated → login prompt
- Buyer → Save/Saved toggle
- duplicate favorite prevented
- success/removal toast
Contact Seller modal:
Buyer name, email, phone, message, Send Inquiry.
Buyer must be logged in and ACTIVE; listing must be APPROVED; message required.
Seller is determined by listing owner; Buyer does not select seller.
Successful contact creates an Inquiry linked to listing, buyer, seller, message, timestamp and notifies Seller.
Show Seller card, description, features, property details, location/map section, similar approved properties.
Map is a generic map UI unless a provider is explicitly configured.
Share: copy link / share UI and success toast.

SELLER / CREATE LISTING
Seller workspace with sidebar:
Dashboard
My Listings
Create Listing
Messages
My Profile
Settings
Logout

My Listings is a nested section/tab in the Seller workspace, not a new core page.
Show listing reference, property, category, price, status, last updated, actions.
Seller manages ONLY own listings.

Create New Listing:
Stepper:
Basic Information → Location → Photos → Features → Review & Publish

MVP IS PROPERTY SALE ONLY. Do not create a rental workflow.

Fields:
Title
Description
Price (THB)
Category
Location
Bedrooms
Bathrooms
Land Area
Usable Area
Parking
Seller/contact information

Required before PENDING:
title, description, price, category, location, seller, images.
Price > 0.
Incomplete form cannot submit; Save Draft remains available.
Show validation states and character counters. Numeric character limits are technical proposals unless confirmed.
Reference is system-generated, e.g. PROP-2026-000001; Seller cannot edit.

Location fields:
Country, Province, District, Subdistrict, Postal Code; optional map pin/coordinates UI.

Images:
multiple images, at most one cover image, upload/reorder/delete/set cover, uploading/error/retry states, validate file type and size.
JPEG/PNG/WebP, max 20 images, max 10MB may be shown only as technical proposal unless confirmed.

LISTING STATUS / TRANSITIONS
DRAFT — Seller Submit → PENDING.
PENDING — Admin with LISTING_APPROVE → APPROVED if required data complete, valid price, active category/location, policy compliant.
PENDING — Admin with LISTING_REJECT → REJECTED; reason REQUIRED.
PENDING — Admin → REVISION_REQUIRED; reason REQUIRED.
REVISION_REQUIRED — Seller edit/resubmit → PENDING.
REJECTED — Seller edit/resubmit → PENDING.
APPROVED — Seller mark sold → SOLD.
APPROVED — Seller close → CLOSED.
APPROVED — Admin with LISTING_HIDE → HIDDEN; reason REQUIRED.
HIDDEN — Admin restore → APPROVED.
HIDDEN — Admin delete → DELETED; reason REQUIRED.
APPROVED — System → EXPIRED only if an expiration rule exists; mark as proposal if not confirmed.
Every status change records from status, to status, actor, timestamp, reason/note when required.

ADMIN / LISTING APPROVAL
Sidebar:
Dashboard
Property Approvals
Manage Listings
Manage Users
Reports & Analytics
Messages
System Settings
Activity Logs
Logout

Property Approvals is the detailed core Admin area.
Nested/placeholder sections for other sidebar functions must be clearly marked as secondary prototype areas, not invented full requirements.

Show summary cards: Pending Review, Approved, Rejected, and optional Reported.
Queue search/filter.
Table: Property, Listing Reference, Seller, Category, Price, Submitted, Status, Reviewer, Actions.
Actions only appear when permission exists.

Listing Review panel:
gallery, reference, title, category, price, location, description, seller, submission time, required-data checklist, policy/image checklist, documents if applicable.

PERMISSIONS
LISTING_VIEW_PENDING
LISTING_APPROVE
LISTING_REJECT
LISTING_HIDE
LISTING_DELETE
USER_VIEW
CATEGORY_MANAGE
REPORT_VIEW
AUDIT_VIEW
ADMIN_PERMISSION_MANAGE

Approve requires PENDING + complete data + valid price + active category/location + policy compliance + permission.
Reject requires reason.
Revision requires reason.
Hide/Delete require reason and confirmation.
Show approved_by, approved_at, published_at after approval.

Concurrent review:
If another Admin is reviewing, show a warning.
If data changed before action, show stale-data/refresh warning.

ADMIN PERMISSION MANAGEMENT
This is a nested Owner function, not a new core page.
Owner dashboard → Admin Monitoring → Permission Management modal/drawer.
Permission matrix columns:
Admin, Role, LISTING_VIEW_PENDING, LISTING_APPROVE, LISTING_REJECT, LISTING_HIDE, LISTING_DELETE, USER_VIEW, CATEGORY_MANAGE, REPORT_VIEW, AUDIT_VIEW, ADMIN_PERMISSION_MANAGE.
Values: Allowed / Not Allowed.
Permission changes require confirmation and audit record.
Ordinary Admin cannot change Admin permissions.

OWNER / DASHBOARD
Sidebar:
Dashboard
Business Overview
Property Management
User Management
Financial Reports
System Settings
Activity Logs
Logout

Owner dashboard must show:
Total listings
Listings by category
Listings by location
Buyer count
Seller count
Admin activity
Business overview

Use editable statistic cards, charts, tables and activity timeline.
Nested Admin Monitoring and Permission Management.
Owner primarily monitors; do NOT provide direct listing-edit controls by default.
Any exceptional direct-edit permission must be clearly marked as additional design extension.
Financial reports must not imply online payment processing because payment is future scope.

AUTHENTICATION
Provide realistic Login/Register/Forgot Password UI as overlays or secondary prototype states.
Login: email, password, show/hide, remember me, Login, Forgot Password, Register.
Register: first name, last name, email, password, confirm password, phone, Buyer/Seller role, Terms, Privacy.
States: invalid credentials, duplicate email, invalid email, password mismatch, suspended/disabled account, pending verification, session expired.
Role redirect:
Buyer → public property experience
Seller → Seller workspace
Admin → Admin workspace
Owner → Owner workspace
If BUYER + SELLER, provide role/context switcher without duplicating account.

ACCOUNT STATUS
PENDING_VERIFICATION
ACTIVE
SUSPENDED
DISABLED
DELETED
Only ACTIVE can use personal functions.

INQUIRY
Statuses:
NEW, READ, CONTACTED, CLOSED, SPAM.
Seller sees inquiries relating to own listings in nested Messages/Inquiry UI.
Buyer sees own contact history in a nested account section.
Do not expose unrelated private Buyer data.

NOTIFICATION CENTER
Global bell icon + unread badge + dropdown/popover.
Mark read / mark all read.
Events:
listing approved
listing rejected
revision requested
buyer inquiry
seller response
listing hidden
Use realistic timestamps and read/unread states.

AUDIT / HISTORY
Represent in listing status timeline, Admin review history, and Owner Activity Logs.
Fields:
actor
action
entity
entity ID
before value
after value
IP address
user agent
timestamp
Ordinary Admin cannot edit/delete audit records.

SEARCH / SORT / PAGINATION
Keyword: property title/location.
Primary filters: category, price range, location.
Default: published_at DESC.
Optional sort: price low-high, price high-low, most interested.
Desktop filters in sidebar.
Mobile filters in drawer.
Provide clear-filter behavior, no-result, loading skeleton, error/retry.

FIELD VALIDATION
Title: required, non-empty; exact max length is not confirmed.
Description: required, non-empty; exact max length is not confirmed.
Price: numeric, THB, >0.
Category: one active primary category.
Location: required before PENDING; valid hierarchy.
Seller: exactly one owner.
Images: multiple, at most one cover, validated type/size.
Reference: system-generated.
Contact: phone/email may be shown; LINE only as optional if configured, not confirmed.

EDGE CASES
Global: loading, empty, error, unauthorized, session expired.
Auth: invalid credentials, duplicate email, suspended/disabled.
List: no results, failed search, invalid filters.
Detail: hidden/deleted/unavailable listing, favorite requires login, inquiry unavailable.
Seller: incomplete draft, upload failure, submit blocked, pending lock, rejected, revision required, approved edit needing review.
Admin: no pending, missing permission, concurrent review, stale data, reject without reason blocked, destructive confirmation.
Owner: no activity, no listings/users, permission confirmation.

ACCESSIBILITY / LOCALIZATION
Target WCAG 2.1 AA.
Keyboard navigation, visible focus, labels, clear errors, non-color-only status, accessible names/tooltips.
Primary prototype language: English.
Support Thai property/location text without breaking layouts.
Do not invent a full bilingual system.

FIGMA DESIGN SYSTEM
Desktop 1440×900.
Responsive references 1200, 1024, 768, 390.
Desktop 12-column grid, max content width ~1200–1280px, 24px gutter, 32–64px page padding.
Spacing: 4/8/12/16/24/32/40/48/64.
Typography: Inter.
Suggested scale: Display 48/56, H1 36/44, H2 28/36, H3 22/30, H4 18/26, Body 14/22, Body Large 16/24, Caption 12/18.
Colors:
Primary #1672DC
Navy #102B4B
Text #10243E
Secondary #66758A
Background #F5F8FC
White #FFFFFF
Success #18A66A
Warning #F4B740
Danger #E5484D
Border #D9E1EA
Radius 6/8/12/pill 999.
Buttons: Primary, Secondary, Ghost, Success, Danger, Disabled; Small/Medium/Large; Default/Hover/Pressed/Focus/Disabled/Loading.
Inputs: Default/Focus/Filled/Error/Disabled/Read-only.
Use one consistent icon set such as Lucide.
Use Auto Layout, constraints, reusable components and variants.
Create variables/tokens for color, spacing, radius and typography where supported.

FIGMA FILE ORGANIZATION
Figma organization pages:
00 — Cover / Design System
01 — Public Website
02 — Seller Workspace
03 — Admin Workspace
04 — Owner Workspace
05 — Components
06 — Prototype Flows

These are Figma organization pages, NOT additional website routes.

Frame names:
HOME / Desktop
PROPERTY LIST / Desktop
PROPERTY DETAIL / Desktop
SELLER CREATE LISTING / Desktop
ADMIN LISTING APPROVAL / Desktop
OWNER DASHBOARD / Desktop

Responsive reference frames may be added per core area.

COMPONENTS
Header
Footer
Sidebar
Button
Input
Dropdown
Search Bar
Property Card
Property Gallery
Favorite Button
Status Badge
Filter Panel
Modal
Toast
Table
Pagination
Stat Card
Chart Card
Seller Card
Property Preview
Navigation Item
Notification Dropdown
Timeline Item

PROTOTYPE CONNECTIONS
HOME → Search → PROPERTY LIST
PROPERTY LIST → Property Card → PROPERTY DETAIL
PROPERTY DETAIL → Favorite → Login prompt or Saved state
PROPERTY DETAIL → Contact Seller → Inquiry modal → validation → success toast
SELLER → Create Listing → Save Draft / Submit → Pending
ADMIN → Pending Queue → Review → Approve/Reject/Revision/Hide/Delete → confirmation → status/notification
OWNER → Dashboard → Admin Monitoring → Permission modal → confirm → audit concept

SAMPLE DATA
Use realistic Thailand data:
Modern Family House — Bang Na, Bangkok — ฿12,500,000 — Single House — 4 Beds — 3 Baths — 250 m²
Luxury City Condominium — Asoke, Bangkok — ฿8,900,000 — Condominium — 2 Beds — 2 Baths — 78 m²
Townhouse Near BTS — Phra Khanong, Bangkok — ฿6,800,000 — Townhouse — 3 Beds — 3 Baths — 160 m²
Land with Mountain View — Chiang Mai — ฿4,500,000 — Land — 800 m²
Modern House with Garden — Rangsit, Pathum Thani — ฿7,900,000 — Single House — 3 Beds — 3 Baths — 220 m²
City View Condominium — Huai Khwang, Bangkok — ฿5,900,000 — Condominium — 1 Bed — 1 Bath — 42 m²
Modern Townhouse — Nonthaburi — ฿5,400,000 — Townhouse — 3 Beds — 2 Baths — 145 m²
Commercial Building — Bang Kapi, Bangkok — ฿15,800,000 — Commercial Building — 4 Floors — 300 m²
Garden Residence — Lat Krabang, Bangkok — ฿9,200,000 — Single House — 4 Beds — 3 Baths — 240 m²
Riverside Condominium — Charoen Nakhon, Bangkok — ฿11,500,000 — Condominium — 2 Beds — 2 Baths — 85 m²

Sellers:
Somchai Property
Natthida K.
Prasit M.
Woranat S.
Kittipong Realty

Admins:
Admin Narin
Admin Pim
Admin Chai

Use realistic Buyer inquiries, listing statuses, notification events and audit events.

TRACEABILITY
Register/Login → BR-USR → FR-01
Roles/RBAC → BR-USR-002 → FR-02
Create Listing → BR-LST → FR-03
Search/Filter → BR-SRH → FR-04
Admin Approval → BR-MOD → FR-05
Favorite → BR-FAV → FR-06
Contact Seller → BR-INQ → FR-07
Admin/Owner Dashboard → BR-ADM / BR-OWN → FR-08
Notification → FR-09
Privacy → BR-USR-004 / NFR-04

Do not present Team Technical Design as an Owner-confirmed requirement.
The baseline’s response-time ≤2 seconds, maintainability, and availability targets are team/technical requirements, not confirmed Owner requirements.

FINAL QUALITY CHECK
- ONE connected PropertyLink website
- exactly six core website areas
- no extra core routes
- sale-only MVP
- public listings require approval/public visibility conditions
- Seller manages only own listings
- Admin actions require permissions
- rejection/revision/hide/delete reasons where required
- Owner monitors business/Admin and manages Admin permissions through nested UI
- Favorite and Contact Seller are website interactions
- notifications/history/audit are represented
- loading/empty/error/unauthorized/session-expired states exist
- editable Figma UI, Auto Layout, reusable components, variables
- realistic property images and Thailand sample data
- no screenshot used as the entire UI
- ready for developer handoff


===============================================================
FINAL 100% CLARIFICATIONS — ADD THESE TO THE MASTER DESIGN
===============================================================

1. FAVORITES HEADER DESTINATION
The global Header contains “Favorites”.

Behavior:
- If unauthenticated Visitor clicks Favorites → open Login Prompt modal.
- If authenticated Buyer clicks Favorites → open a Favorites Drawer / Account Panel.
- Do NOT create a separate core website route/page for Favorites.
- The Favorites Drawer contains:
  Saved property thumbnail
  Property title
  Location
  Price
  Remove Favorite
  View Property
- “View Property” navigates to /properties/:id.
- Empty state:
  “You haven't saved any properties yet.”
  CTA: “Explore Properties”

2. BUYER ACCOUNT AREA
Create a global avatar/account dropdown for authenticated users.

Buyer account menu:
- My Account
- Favorites
- Contact History
- Notifications
- Settings
- Logout

These are nested account functions, not additional core website pages.

MY ACCOUNT:
Show:
- Name
- Email
- Phone
- Account Status
- Current Role

CONTACT HISTORY:
Show Buyer’s own inquiries:
- Property
- Seller
- Date
- Inquiry Status
- View Property
- View Conversation/Details if supported

NOTIFICATIONS:
Open the global Notification Center.

SETTINGS:
Show basic account/security preferences as a nested panel.
Do not invent unrelated settings.

3. SELLER DASHBOARD
The Seller workspace must have a real Dashboard destination inside the Seller
area, even though the approved six core prototype areas identify “Seller /
Create Listing” as the main Seller prototype area.

Seller Dashboard summary cards:
- Draft
- Pending
- Approved
- Rejected
- Inquiries
- Views

Each card is clickable and filters/navigates the Seller’s own listing/inquiry
workspace.

RECENT LISTINGS:
Show:
- Listing Reference
- Property
- Price
- Status
- Last Updated
- Views
- Actions

RECENT INQUIRIES:
Show:
- Buyer
- Property
- Date
- Inquiry Status
- View

EMPTY STATES:
No listings:
“Create your first property listing.”

No inquiries:
“No buyer inquiries yet.”

Seller Dashboard must never show another Seller’s private listing data.

4. SELLER MY LISTINGS — COMPLETE ACTION MATRIX
Seller My Listings is a nested Seller workspace section.

Actions by state:

DRAFT:
- Edit
- Submit for Approval
- Delete Draft
- View Timeline

PENDING:
- View
- View Timeline
- Cancel/withdraw only if supported by the baseline; otherwise do not invent it.

REVISION_REQUIRED:
- Edit
- View Reason
- Resubmit
- View Timeline

REJECTED:
- Edit
- View Reason
- Resubmit
- View Timeline

APPROVED:
- View
- Edit
- Mark Sold
- Close
- View Timeline

SOLD:
- View
- View Timeline

CLOSED:
- View
- View Timeline

HIDDEN:
- View
- View Reason
- View Timeline

DELETED:
- View History only

Important:
- Seller may only perform actions permitted by ownership and current status.
- Destructive actions require confirmation.
- Reason is shown for rejection/revision/hide/delete where applicable.

5. ADMIN / OWNER SECONDARY SIDEBAR AREAS
Keep the approved sidebar structure, but clearly classify secondary items.

ADMIN:
Dashboard
Property Approvals
Manage Listings
Manage Users
Reports & Analytics
Messages
System Settings
Activity Logs
Logout

OWNER:
Dashboard
Business Overview
Property Management
User Management
Financial Reports
System Settings
Activity Logs
Logout

For Figma:
- Property Approvals and Owner Dashboard are the detailed core areas.
- Other sidebar items are “Secondary Prototype Area / Placeholder”.
- They must have enough visual structure to demonstrate intended navigation,
  but do NOT invent complete business workflows that are not confirmed.
- A placeholder can contain:
  title
  short purpose
  representative table/cards
  “Secondary prototype area” label
  Back/Dashboard navigation

6. CATEGORY MANAGEMENT LOCATION
CATEGORY_MANAGE permission belongs to Admin.

Place Category Management as a nested section under:
ADMIN → System Settings → Category Management

UI:
- Category list
- Active/Inactive status
- Add Category
- Edit Category
- Activate/Deactivate
- Confirmation modal
- Audit confirmation

Categories:
Single House
Condominium
Townhouse
Land
Commercial Building

Do not create arbitrary additional categories.

Owner may monitor Category Management activity but does not automatically
receive direct Category Management controls unless explicitly granted.

7. INQUIRY STATUS TRANSITION MATRIX
Inquiry statuses:
NEW → READ → CONTACTED → CLOSED
NEW / READ / CONTACTED → SPAM when authorized

Default responsibility:
- System creates Inquiry with status NEW.
- Seller can change:
  NEW → READ
  READ → CONTACTED
  CONTACTED → CLOSED
- Seller can mark obvious unwanted inquiries as SPAM where permitted.
- Admin may review/moderate inquiry status if the relevant permission is
  provided; do not imply unrestricted Admin editing by default.
- System may automatically mark/read or close only where an explicit automation
  rule is represented; otherwise do not invent automatic transitions.

Every status change should show:
- previous status
- new status
- actor
- timestamp
- optional reason/note

8. NOTIFICATION DESTINATION / DEEP LINKING
Every actionable notification should have a destination.

Examples:

Listing Approved:
Seller → notification → Seller listing detail/status

Listing Rejected:
Seller → notification → rejected listing + rejection reason

Revision Requested:
Seller → notification → listing edit/revision state + reason

Buyer Inquiry:
Seller → notification → Seller inquiry/message panel

Seller Response:
Buyer → notification → Buyer contact history/inquiry detail

Listing Hidden:
Seller → notification → listing status/detail + reason

Property Saved:
Buyer → notification/toast only; do not create unnecessary persistent
notifications unless configured.

Notification click behavior:
- close notification popover
- navigate to the relevant nested panel or property detail
- mark notification as read

9. CONCURRENT REVIEW / STALE DATA UI
When two Admins are reviewing the same listing:

Show a visible warning banner inside the review panel:

“Another administrator is currently reviewing this listing.”

Use warning styling, icon + text, not color alone.

If the listing changed before the current Admin submits an action:

Show blocking alert:

“This listing has been updated. Refresh before taking another action.”

Buttons:
- Refresh Listing
- Cancel

After Refresh:
- update displayed listing data
- clear stale-data warning
- preserve safe navigation context
- do not automatically execute the previous destructive/approval action

10. ACCESSIBILITY — DETAILED UI BEHAVIOR
Target:
WCAG 2.1 AA

FOCUS ORDER
Logical keyboard order:
Header → main content → sidebar where relevant → footer.
Within forms:
label → input → validation/help → next field.
Within modals:
title → content → primary action → secondary action → close.

SKIP LINK
Add:
“Skip to main content”
visible on keyboard focus.

KEYBOARD
- Tab moves through interactive controls in logical order.
- Enter/Space activates buttons.
- Escape closes modal/drawer/popover.
- Arrow keys may be used for tabs/menu navigation where appropriate.

MODAL
When opened:
- move focus into modal
- trap focus inside modal
- Escape closes if action is not mandatory
- return focus to the triggering control after close

DRAWER
When opened:
- move focus into drawer
- trap focus
- Escape closes
- return focus to trigger

ARIA
Use meaningful accessible labels for:
- icon-only Favorite
- Share
- Notifications
- Close
- Menu
- Search
- Previous/Next gallery
- Delete
- Approve
- Reject
- Edit

Do not rely on color alone to communicate:
Pending
Approved
Rejected
Error
Success

Use:
text + icon + status badge.

FORM ERRORS
- place error text adjacent to field
- identify invalid field
- preserve entered values
- use aria-describedby where applicable

===============================================================
FINAL 100% ACCEPTANCE CHECK
===============================================================

[ ] Favorites header has a defined destination.
[ ] Unauthenticated Favorites opens Login Prompt.
[ ] Authenticated Buyer Favorites opens Drawer/Account Panel.
[ ] Buyer Account menu exists.
[ ] Favorites, Contact History, Notifications and Settings are nested functions.
[ ] Seller Dashboard has Draft/Pending/Approved/Rejected/Inquiries/Views.
[ ] Seller My Listings has state-dependent actions.
[ ] Admin secondary areas are explicitly marked secondary/placeholder.
[ ] Owner secondary areas are explicitly marked secondary/placeholder.
[ ] Category Management has a defined location.
[ ] Inquiry status transitions have defined actors.
[ ] Notification destinations/deep links are defined.
[ ] Concurrent review warning has exact UI behavior.
[ ] Stale data warning has Refresh/Cancel behavior.
[ ] Focus order is defined.
[ ] Skip link exists.
[ ] Modal/drawer keyboard behavior is defined.
[ ] ARIA labeling requirements are defined.
[ ] Status is never communicated by color alone.

FINAL INSTRUCTION TO FIGMA
Generate the website as a single connected PropertyLink product using all
requirements above. Preserve the exact business terminology, six core areas,
workflow, permissions, and constraints. Do not add extra business features.
Use secondary areas only as clearly labeled nested/placeholder prototype
content when they are not one of the six core areas.

```
