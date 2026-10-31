Edit the EXISTING PropertyLink prototype.

IMPORTANT:
Do NOT redesign the website from scratch.
Keep the existing PropertyLink branding, visual style, layout direction, components, colors, typography, spacing, and overall UI design.
Modify the existing prototype only where necessary so that it matches the following system requirements, Site Map, user roles, business rules, and user flows.

==================================================
PROJECT
==================================================

Project Name:
PropertyLink — Real Estate Marketplace Web Application

Purpose:
A real estate marketplace that connects Buyers and Sellers.
Sellers can create and manage property listings.
Admin reviews listings before they are published.
Buyers can search properties, save favorites, and contact sellers through Inquiry.
Owner can monitor business information, manage Admin permissions, and view Audit Logs.

Design Style:
- Modern
- Simple
- Professional
- Trustworthy
- Clean
- Easy to use
- Responsive desktop web application
- Navy / Dark Gray / White / Light Blue
- Use realistic Thai property information
- Keep all existing PropertyLink design components consistent

==================================================
USER ROLES
==================================================

Use these 4 RBAC roles:

1. BUYER
2. SELLER
3. ADMIN
4. OWNER

A user can have more than one role, for example:
BUYER + SELLER

Visitor and System are actors, NOT RBAC roles.

==================================================
SITE MAP
==================================================

PROPERTYLINK
│
├── PUBLIC
│   ├── Home
│   ├── Property List
│   ├── Property Detail
│   ├── About
│   ├── Contact
│   ├── Terms
│   └── Privacy
│
├── BUYER
│   ├── Favorites
│   ├── Inquiries / Contact History
│   └── Profile
│
├── SELLER
│   ├── Dashboard
│   ├── My Listings
│   ├── Create Listing
│   └── Edit Listing
│
├── ADMIN
│   ├── Approval Queue
│   └── Reports
│
└── OWNER
    ├── Business Dashboard
    └── Audit Logs

Make the existing navigation and prototype flow consistent with this Site Map.

==================================================
PUBLIC / HOME
==================================================

Keep the existing Home page.

Include:
- PropertyLink logo
- Main navigation
- Search bar
- Property categories
- Featured properties
- Property cards
- Search / Browse Properties button

Property Categories:
- บ้านเดี่ยว
- คอนโดมิเนียม
- ทาวน์เฮาส์
- ที่ดิน
- อาคารพาณิชย์

==================================================
PROPERTY LIST
==================================================

Keep the existing Property List design.

Include:
- Search
- Filter by Property Type
- Filter by Price
- Filter by Location
- Sort
- Property cards
- Property image
- Property title
- Price
- Location
- Favorite button
- Pagination

==================================================
PROPERTY DETAIL
==================================================

Keep the existing Property Detail page.

Include:
- Property image gallery
- Cover image
- Property title
- Price
- Property type
- Location
- Description
- Property details
- Seller information
- Favorite button
- Contact Seller button

Contact Seller must use INQUIRY.

Do NOT create real-time chat.

==================================================
BUYER
==================================================

BUYER can:

- Search properties
- Filter properties
- View property details
- Favorite properties
- Send Inquiry to Seller
- View Contact History
- Manage Profile

Buyer pages:

Favorites
- Show saved properties
- Remove from favorites
- Open Property Detail

Inquiries / Contact History
- Show previous inquiries
- Property
- Seller
- Message
- Inquiry status

Profile
- User information
- Email
- Phone
- Account information

==================================================
SELLER
==================================================

SELLER DASHBOARD

Show:
- Total Listings
- Pending Listings
- Approved Listings
- Rejected Listings
- Revision Required
- Sold / Closed

MY LISTINGS

Show:
- Property image
- Listing title
- Price
- Location
- Status
- View
- Edit

CREATE LISTING

Fields:
- Property Type
- Title
- Price
- Location
- Description
- Property Images
- Cover Image

Image Rules:
- Minimum 3 images
- Maximum 15 images
- One cover image

Actions:
- Save Draft
- Submit for Review

Show validation messages when required information is missing.

EDIT LISTING

Allow Seller to edit their own listing.

==================================================
LISTING STATUS
==================================================

Use these statuses:

DRAFT
PENDING
APPROVED
REJECTED
REVISION_REQ
SOLD
CLOSED
EXPIRED
HIDDEN

Main workflow:

DRAFT
→ PENDING
→ APPROVED

OR

PENDING
→ REJECTED

OR

PENDING
→ REVISION_REQ
→ DRAFT
→ PENDING

Approved listings may later become:
SOLD / CLOSED / EXPIRED / HIDDEN

Display the status clearly in Seller Dashboard and My Listings.

==================================================
ADMIN
==================================================

ADMIN APPROVAL QUEUE

Show:
- Listings waiting for review
- Property image
- Property title
- Seller
- Price
- Location
- Submission date
- Current status

Admin can open the listing details.

ADMIN ACTIONS:

1. Approve
2. Reject
3. Request Revision

For Reject:
- Open modal
- Require rejection reason
- Show reason to Seller

For Request Revision:
- Open modal
- Require revision reason
- Show reason to Seller

Approval flow:

PENDING
→ Approve
→ APPROVED
→ Public Listing

PENDING
→ Reject
→ REJECTED
→ Seller sees reason

PENDING
→ Request Revision
→ REVISION_REQ
→ Seller edits
→ Submit again
→ PENDING

Admin cannot approve their own listing.

==================================================
ADMIN REPORTS
==================================================

Add an Admin Reports page according to the Site Map.

Show simple system reports such as:
- Listing status overview
- Pending listings
- Approved listings
- Rejected listings
- Revision Required
- Reported / inappropriate listings

Keep the report interface simple and consistent with the existing design.

==================================================
OWNER
==================================================

OWNER BUSINESS DASHBOARD

Show:
- Total Listings
- Pending Listings
- Approved Listings
- Sold / Closed Listings
- User Overview
- Business / System Activity

ADMIN MANAGEMENT

Owner can:
- Manage Admin permissions
- View Admin activity

AUDIT LOGS

Show:
- Admin/User
- Action
- Related listing
- Date / Time

==================================================
AUTHENTICATION
==================================================

Include:

REGISTER
- Email
- Password
- Phone Number

LOGIN
- Email
- Password

OTP VERIFICATION
- Phone verification using OTP

Phone verification is required before:
- Seller can submit a listing
- Seller phone information can be revealed

==================================================
BUSINESS RULES
==================================================

User:
- User registers with Email and Password
- Phone must be verified with OTP before selling
- One user can have multiple roles
- Account cancellation uses Soft Delete

Listing:
- Exactly 5 property categories
- Seller can create and edit their own listings
- Listing requires 3–15 real images

System validation:
- Check required information
- Check prohibited keywords
- Check contact information
- Check image requirements
- Check abnormal pricing
- Check OTP verification

If abnormal pricing is detected:
→ Send listing for Admin review

==================================================
MAIN PROTOTYPE FLOWS
==================================================

BUYER:

Home
→ Property List
→ Property Detail
→ Favorite

OR

Property Detail
→ Contact Seller
→ Inquiry
→ Contact History


SELLER:

Login
→ Seller Dashboard
→ Create Listing
→ Save Draft
→ Submit for Review
→ PENDING


ADMIN:

Admin
→ Approval Queue
→ Listing Detail
→ Approve / Reject / Request Revision


OWNER:

Owner
→ Business Dashboard
→ Admin Management
→ Audit Logs


==================================================
INTERACTION / PROTOTYPE
==================================================

Make the existing prototype clickable.

Use overlays / modals for:
- Login
- OTP Verification
- Contact Seller / Inquiry
- Reject Reason
- Revision Required Reason
- Validation Messages
- Notifications

Do not create unnecessary pages.

The prototype must clearly demonstrate:

Buyer
→ Search
→ Property Detail
→ Favorite / Inquiry

Seller
→ Create Listing
→ Submit

Admin
→ Review
→ Approve / Reject / Request Revision

Owner
→ Dashboard
→ Admin Management
→ Audit Logs

==================================================
FINAL REQUIREMENT
==================================================

The final prototype must be consistent across:

BUSINESS RULE
→ SRS
→ ERD
→ SITE MAP
→ PROTOTYPE

Do not add real-time chat.
Do not add unnecessary features.
Do not change the project concept.
Do not redesign the existing PropertyLink prototype from scratch.
Only edit the existing prototype to make it accurately match the requirements above.