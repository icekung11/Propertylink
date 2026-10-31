"use client";
import { usePreferences } from "@/context/PreferencesContext";
import type { ListingStatus, InquiryStatus, AccountStatus } from '../types';

type AnyStatus = ListingStatus | InquiryStatus | AccountStatus;

const CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  DRAFT:                { label: 'Draft',               bg: 'bg-gray-100',    text: 'text-gray-600',   dot: 'bg-gray-400' },
  PENDING:              { label: 'Pending Review',      bg: 'bg-amber-50',    text: 'text-amber-700',  dot: 'bg-amber-400' },
  APPROVED:             { label: 'Approved',            bg: 'bg-emerald-50',  text: 'text-emerald-700',dot: 'bg-emerald-500' },
  REJECTED:             { label: 'Rejected',            bg: 'bg-red-50',      text: 'text-red-700',    dot: 'bg-red-500' },
  REVISION_REQUIRED:    { label: 'Revision Required',   bg: 'bg-orange-50',   text: 'text-orange-700', dot: 'bg-orange-500' },
  SOLD:                 { label: 'Sold',                bg: 'bg-purple-50',   text: 'text-purple-700', dot: 'bg-purple-500' },
  CLOSED:               { label: 'Closed',              bg: 'bg-slate-100',   text: 'text-slate-600',  dot: 'bg-slate-400' },
  EXPIRED:              { label: 'Expired',             bg: 'bg-orange-50',   text: 'text-orange-700', dot: 'bg-orange-400' },
  HIDDEN:               { label: 'Hidden',              bg: 'bg-slate-100',   text: 'text-slate-600',  dot: 'bg-slate-400' },
  DELETED:              { label: 'Deleted',             bg: 'bg-red-50',      text: 'text-red-700',    dot: 'bg-red-400' },
  NEW:                  { label: 'New',                 bg: 'bg-blue-50',     text: 'text-blue-700',   dot: 'bg-blue-500' },
  READ:                 { label: 'Read',                bg: 'bg-gray-100',    text: 'text-gray-600',   dot: 'bg-gray-400' },
  CONTACTED:            { label: 'Contacted',           bg: 'bg-teal-50',     text: 'text-teal-700',   dot: 'bg-teal-500' },
  SPAM:                 { label: 'Spam',                bg: 'bg-red-50',      text: 'text-red-700',    dot: 'bg-red-400' },
  ACTIVE:               { label: 'Active',              bg: 'bg-emerald-50',  text: 'text-emerald-700',dot: 'bg-emerald-500' },
  SUSPENDED:            { label: 'Suspended',           bg: 'bg-red-50',      text: 'text-red-700',    dot: 'bg-red-500' },
  DISABLED:             { label: 'Disabled',            bg: 'bg-gray-100',    text: 'text-gray-500',   dot: 'bg-gray-400' },
  PENDING_VERIFICATION: { label: 'Pending Verification',bg: 'bg-amber-50',    text: 'text-amber-700',  dot: 'bg-amber-400' },
};

interface StatusBadgeProps {
  status: AnyStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const { translateText } = usePreferences();

  const cfg = CONFIG[status] ?? { label: status, bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
  const padding = size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${cfg.bg} ${cfg.text} ${padding}`}
      role="status"
      aria-label={`${translateText('Status')}: ${translateText(cfg.label)}`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot}`} aria-hidden="true" />
      {translateText(cfg.label)}
    </span>
  );
}
