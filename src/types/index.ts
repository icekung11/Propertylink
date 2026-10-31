export type ListingStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'REVISION_REQUIRED'
  | 'SOLD'
  | 'CLOSED'
  | 'EXPIRED'
  | 'HIDDEN'
  | 'DELETED';

export type UserRole = 'BUYER' | 'SELLER' | 'ADMIN' | 'OWNER';
export type AccountStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'DISABLED' | 'DELETED';
export type InquiryStatus = 'NEW' | 'READ' | 'CONTACTED' | 'CLOSED' | 'SPAM';
export type Category = 'Single house' | 'Condominium' | 'Townhouse' | 'Land' | 'Commercial Building';

export type AdminPermission =
  | 'LISTING_VIEW_PENDING'
  | 'LISTING_APPROVE'
  | 'LISTING_REJECT'
  | 'LISTING_HIDE'
  | 'LISTING_DELETE'
  | 'USER_VIEW'
  | 'CATEGORY_MANAGE'
  | 'REPORT_VIEW'
  | 'AUDIT_VIEW'
  | 'ADMIN_PERMISSION_MANAGE';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roles: UserRole[];
  status: AccountStatus;
  avatar?: string;
  createdAt: string;
}

export interface Location {
  country: string;
  province: string;
  district: string;
  subdistrict: string;
  postalCode: string;
  displayAddress: string;
}

export interface Property {
  id: string;
  reference: string;
  title: string;
  description: string;
  category: Category;
  price: number;
  location: Location;
  bedrooms?: number;
  bathrooms?: number;
  landArea?: number;
  usableArea?: number;
  parking?: number;
  images: string[];
  coverImage: string;
  status: ListingStatus;
  sellerId: string;
  sellerName: string;
  sellerPhone?: string;
  sellerEmail?: string;
  sellerLine?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  views?: number;
  inquiryCount: number;
  features?: string[];
}

export interface Inquiry {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyImage: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  sellerId: string;
  sellerName: string;
  message: string;
  status: InquiryStatus;
  createdAt: string;
  reply?: string;
  repliedAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type:
    | 'listing_approved'
    | 'listing_rejected'
    | 'revision_requested'
    | 'buyer_inquiry'
    | 'seller_response'
    | 'listing_hidden';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  linkUrl?: string;
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  beforeValue?: string;
  afterValue?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  reason?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  permissions: AdminPermission[];
  lastActive: string;
}
