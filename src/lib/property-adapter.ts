import type { Property } from '@/types';

type ApiListing = Record<string, any>;

export function adaptListing(row: ApiListing): Property {
  const images = Array.isArray(row.images)
    ? row.images.map((image: ApiListing) => image.image_url).filter((url: unknown): url is string => typeof url === 'string' && url.length > 0)
    : [];
  const category = row.category?.name ?? row.category?.code ?? 'Property';
  const location = row.locations ?? row.location ?? {};
  const seller = row.seller ?? {};
  return {
    id: String(row.id),
    reference: String(row.listingNo ?? row.id),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    category,
    price: Number(row.price ?? 0),
    location: {
      country: location.country ?? 'Thailand',
      province: location.province ?? location.name ?? '',
      district: location.district ?? '',
      subdistrict: location.subdistrict ?? '',
      postalCode: location.postalCode ?? '',
      displayAddress: [location.name, location.district, location.province].filter(Boolean).join(', '),
    },
    bedrooms: row.bedrooms ?? undefined,
    bathrooms: row.bathrooms ?? undefined,
    landArea: row.landAreaSqwa ?? undefined,
    usableArea: row.usableAreaSqm ?? undefined,
    images,
    coverImage: images[0] ?? '/placeholder-property.svg',
    status: row.status ?? 'APPROVED',
    sellerId: String(row.sellerId ?? seller.id ?? ''),
    sellerName: [seller.firstName, seller.lastName].filter(Boolean).join(' '),
    sellerEmail: row.contactEmail || undefined,
    sellerLine: row.contactLine || undefined,
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? row.createdAt ?? new Date().toISOString(),
    publishedAt: row.publishedAt ?? row.approved_at ?? row.createdAt,
    views: typeof row.viewCount === 'number' ? row.viewCount : undefined,
    inquiryCount: Number(row.inquiryCount ?? 0),
  };
}
