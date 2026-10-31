export type Language = 'en' | 'th';
export type DisplayCurrency = 'THB' | 'USD';
export interface Preferences {
  language: Language;
  currency: DisplayCurrency;
  showUnreadBadge: boolean;
}
export const DEFAULT_PREFERENCES: Preferences = { language: 'en', currency: 'THB', showUnreadBadge: true };
export function validPreferences(value: unknown): value is Preferences {
  if (!value || typeof value !== 'object') return false;
  const data = value as Preferences;
  return ['en','th'].includes(data.language) && ['THB','USD'].includes(data.currency) && typeof data.showUnreadBadge === 'boolean';
}
