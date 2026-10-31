/** Phone access is handled by the authenticated reveal-phone endpoint. */
export function publicListing<T extends { contactPhone?: string | null }>(row: T) {
  const { contactPhone: _phone, ...listing } = row;
  return listing;
}
