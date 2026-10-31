"use client";
import { usePreferences } from "@/context/PreferencesContext";
import { useMemo, useState } from 'react';
import { Search, MessageSquare, Inbox } from 'lucide-react';
import InquiryCard from './InquiryCard';
import type { Inquiry } from '../types';

type Filter = 'ALL' | 'OPEN' | 'REPLIED' | 'CLOSED';

interface InquiryListProps {
  inquiries: Inquiry[];
  role: 'buyer' | 'seller';
  emptyAction?: React.ReactNode;
}

export default function InquiryList({ inquiries, role, emptyAction }: InquiryListProps) {
  const { translateText } = usePreferences();

  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');

  const isOpen = (i: Inquiry) => i.status === 'NEW' || i.status === 'READ';
  const isClosed = (i: Inquiry) => i.status === 'CLOSED' || i.status === 'SPAM';

  const counts: Record<Filter, number> = {
    ALL: inquiries.length,
    OPEN: inquiries.filter(isOpen).length,
    REPLIED: inquiries.filter((i) => i.status === 'CONTACTED').length,
    CLOSED: inquiries.filter(isClosed).length,
  };

  const filters: { id: Filter; label: string }[] = [
    { id: 'ALL', label: 'All' },
    { id: 'OPEN', label: role === 'seller' ? 'Needs reply' : 'Pending' },
    { id: 'REPLIED', label: 'Replied' },
    { id: 'CLOSED', label: 'Closed' },
  ];

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inquiries
      .filter((i) =>
        filter === 'ALL' ? true : filter === 'OPEN' ? isOpen(i) : filter === 'REPLIED' ? i.status === 'CONTACTED' : isClosed(i)
      )
      .filter((i) =>
        !q || [i.propertyTitle, i.buyerName, i.sellerName, i.message].some((v) => v.toLowerCase().includes(q))
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [inquiries, filter, query]);

  if (inquiries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#D9E1EA] p-12 text-center">
        <MessageSquare className="w-12 h-12 text-slate-200 mx-auto mb-4" aria-hidden="true" />
        <h2 className="font-semibold text-[#10243E] mb-2">{translateText("No Inquiries Yet")}</h2>
        <p className="text-sm text-[#66758A] mb-5">
          {role === 'buyer'
            ? translateText("Contact a seller from any property page to start a conversation.")
            : translateText("Buyer inquiries about your listings will show up here.")}
        </p>
        {emptyAction}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={translateText("Filter inquiries")}>
          {filters.map(({ id, label }) => (
            <button
              key={id}
              role="tab"
              aria-selected={filter === id}
              onClick={() => setFilter(id)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                filter === id
                  ? 'bg-[#102B4B] border-[#102B4B] text-white'
                  : 'bg-white border-[#D9E1EA] text-[#66758A] hover:text-[#10243E] hover:border-[#8A98AC]'
              }`}
            >
              {translateText(label)} <span className={filter === id ? 'text-white/70' : 'text-[#8A98AC]'}>{counts[id]}</span>
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-64">
          <Search className="w-4 h-4 text-[#8A98AC] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={translateText("Search inquiries")}
            aria-label={translateText("Search inquiries")}
            className="w-full pl-9 pr-3 py-2 border border-[#D9E1EA] rounded-lg text-sm bg-white focus:outline-none focus:border-[#1672DC] focus:ring-2 focus:ring-[#1672DC]/20"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#D9E1EA] p-10 text-center">
          <Inbox className="w-10 h-10 text-slate-200 mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm text-[#66758A]">No inquiries match your filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((inq) => (
            <InquiryCard key={inq.id} inquiry={inq} role={role} />
          ))}
        </div>
      )}
    </div>
  );
}
