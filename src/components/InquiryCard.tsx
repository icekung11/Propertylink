"use client";
import { usePreferences, useFormatters } from "@/context/PreferencesContext";
import { useState } from 'react';
import {
  ChevronDown, Clock, Mail, Phone, Send, CheckCircle, Ban, XCircle, ExternalLink, Reply,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useApp } from '../context/AppContext';

import StatusBadge from './StatusBadge';
import type { Inquiry } from '../types';

interface InquiryCardProps {
  inquiry: Inquiry;
  role: 'buyer' | 'seller';
}

export default function InquiryCard({ inquiry: inq, role }: InquiryCardProps) {
  const { translateText } = usePreferences();
  const { formatDate } = useFormatters();

  const { updateInquiryStatus, replyToInquiry, showToast } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [replying, setReplying] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const isSeller = role === 'seller';
  const counterpart = isSeller ? inq.buyerName : inq.sellerName;
  const unread = isSeller && inq.status === 'NEW';
  const closed = inq.status === 'CLOSED' || inq.status === 'SPAM';

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread) updateInquiryStatus(inq.id, 'READ');
  };

  const submitReply = async () => {
    if (!draft.trim()) { setError('Please write a reply.'); return; }
    const sent = await replyToInquiry(inq.id, draft.trim());
    if (!sent) return;
    setDraft(''); setReplying(false); setError('');
    showToast('Reply sent to buyer.', 'success');
  };

  const actionBtn =
    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#D9E1EA] text-[#10243E] hover:border-[#1672DC] hover:text-[#1672DC] transition-colors';

  return (
    <article className={`bg-white rounded-xl border transition-colors ${unread ? 'border-[#1672DC]/40 shadow-sm' : 'border-[#D9E1EA]'}`}>
      <button
        onClick={toggle}
        aria-expanded={open}
        className="w-full flex items-start gap-4 p-4 text-left"
      >
        <img src={inq.propertyImage} alt="" className="w-20 h-16 rounded-lg object-cover bg-slate-100 shrink-0 hidden sm:block" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
            <div className="flex items-center gap-2 min-w-0">
              {unread && <span className="w-2 h-2 rounded-full bg-[#1672DC] shrink-0" aria-label={translateText("Unread")} />}
              <span className="text-sm font-semibold text-[#10243E] truncate">{inq.propertyTitle}</span>
            </div>
            <StatusBadge status={inq.status} />
          </div>
          <p className="text-xs text-[#66758A] mb-1.5">
            {isSeller ? translateText("From") : translateText("To")}: <span className="font-medium text-[#10243E]">{counterpart}</span>
          </p>
          <p className={`text-sm text-[#66758A] ${open ? '' : 'line-clamp-1'}`}>{inq.message}</p>
          <p className="text-xs text-[#8A98AC] flex items-center gap-1 mt-1.5">
            <Clock className="w-3 h-3" aria-hidden="true" />
            {formatDate(inq.createdAt)}
            {inq.reply && <span className="ml-2 text-teal-600 font-medium">{translateText("· Replied")}</span>}
          </p>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#8A98AC] mt-1 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-[#EEF3F9] space-y-4">
          {isSeller && (
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#66758A] pt-3">
              <a href={`mailto:${inq.buyerEmail}`} className="flex items-center gap-1.5 hover:text-[#1672DC]">
                <Mail className="w-3.5 h-3.5" aria-hidden="true" /> {inq.buyerEmail}
              </a>
              <a href={`tel:${inq.buyerPhone}`} className="flex items-center gap-1.5 hover:text-[#1672DC]">
                <Phone className="w-3.5 h-3.5" aria-hidden="true" /> {inq.buyerPhone}
              </a>
            </div>
          )}

          <div className="space-y-3 pt-1">
            <div className={`flex ${isSeller ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${isSeller ? 'bg-[#F5F8FC] text-[#10243E] rounded-tl-sm' : 'bg-[#1672DC] text-white rounded-tr-sm'}`}>
                <p className="whitespace-pre-line">{inq.message}</p>
                <p className={`text-[11px] mt-1 ${isSeller ? 'text-[#8A98AC]' : 'text-white/70'}`}>
                  {isSeller ? inq.buyerName : translateText("You")} · {formatDate(inq.createdAt)}
                </p>
              </div>
            </div>
            {inq.reply && inq.repliedAt && (
              <div className={`flex ${isSeller ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${isSeller ? 'bg-[#1672DC] text-white rounded-tr-sm' : 'bg-[#F5F8FC] text-[#10243E] rounded-tl-sm'}`}>
                  <p className="whitespace-pre-line">{inq.reply}</p>
                  <p className={`text-[11px] mt-1 ${isSeller ? 'text-white/70' : 'text-[#8A98AC]'}`}>
                    {isSeller ? translateText("You") : inq.sellerName} · {formatDate(inq.repliedAt)}
                  </p>
                </div>
              </div>
            )}
            {!isSeller && !inq.reply && !closed && (
              <p className="text-xs text-[#66758A] italic">{translateText("Waiting for the seller to respond.")}</p>
            )}
          </div>

          {isSeller && replying && (
            <div>
              <label htmlFor={`reply-${inq.id}`} className="block text-sm font-medium text-[#10243E] mb-1.5">{translateText("Your reply")}</label>
              <textarea
                id={`reply-${inq.id}`}
                rows={3}
                value={draft}
                onChange={(e) => { setDraft(e.target.value); setError(''); }}
                placeholder={`Hi ${inq.buyerName.split(' ')[0]}, thanks for your interest…`}
                className="w-full px-3.5 py-2.5 border border-[#D9E1EA] rounded-lg text-sm focus:outline-none focus:border-[#1672DC] focus:ring-2 focus:ring-[#1672DC]/20 resize-none"
                autoFocus
              />
              {error && <p className="text-xs text-red-600 mt-1">{translateText(error)}</p>}
              <div className="flex gap-2 mt-2">
                <button onClick={submitReply} className="flex items-center gap-1.5 px-4 py-2 bg-[#1672DC] text-white text-sm font-semibold rounded-lg hover:bg-[#125BB8] transition-colors">
                  <Send className="w-3.5 h-3.5" aria-hidden="true" /> {translateText("Send Reply")}</button>
                <button onClick={() => { setReplying(false); setError(''); }} className="px-4 py-2 text-sm text-[#66758A] hover:text-[#10243E]">{translateText("Cancel")}</button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {!isSeller && (
              <button onClick={() => router.push(`/properties/${inq.propertyId}`)} className={actionBtn}>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" /> {translateText("View Property")}</button>
            )}
            {isSeller && !closed && !replying && (
              <button onClick={() => setReplying(true)} className={actionBtn}>
                <Reply className="w-3.5 h-3.5" aria-hidden="true" /> {inq.reply ? translateText("Reply Again") : translateText("Reply")}
              </button>
            )}
            {isSeller && !closed && (
              <button
                onClick={async () => { if (await updateInquiryStatus(inq.id, 'SPAM')) showToast('Marked as spam.', 'info'); }}
                className={`${actionBtn} hover:!border-red-300 hover:!text-red-600`}
              >
                <Ban className="w-3.5 h-3.5" aria-hidden="true" /> {translateText("Spam")}</button>
            )}
            {!closed && (
              <button
                onClick={async () => { if (await updateInquiryStatus(inq.id, 'CLOSED')) showToast('Inquiry closed.', 'info'); }}
                className={actionBtn}
              >
                <XCircle className="w-3.5 h-3.5" aria-hidden="true" /> {isSeller ? translateText("Close") : translateText("Close Inquiry")}
              </button>
            )}
            {closed && (
              <button
                onClick={async () => { if (await updateInquiryStatus(inq.id, inq.reply ? 'CONTACTED' : 'NEW')) showToast('Inquiry reopened.', 'info'); }}
                className={actionBtn}
              >
                <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" /> {translateText("Reopen")}</button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
