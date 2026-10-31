"use client";
import { usePreferences, useFormatters } from "@/context/PreferencesContext";
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { useApp } from '../context/AppContext';


const TYPE_ICONS: Record<string, string> = {
  listing_approved: '✅',
  listing_rejected: '❌',
  revision_requested: '✏️',
  buyer_inquiry: '💬',
  seller_response: '↩️',
  listing_hidden: '🔒',
};

export default function NotificationDropdown() {
  const { translateText } = usePreferences();
  const { formatRelativeTime } = useFormatters();

  const { notifications, unreadCount, markNotificationRead, markAllRead, setShowNotifications } = useApp();

  return (
    <div
      className="absolute top-12 right-0 w-80 bg-white border border-[#D9E1EA] rounded-xl shadow-xl z-50"
      role="region"
      aria-label={translateText("Notifications")}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#D9E1EA]">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#1672DC]" aria-hidden="true" />
          <span className="text-sm font-semibold text-[#10243E]">{translateText("Notifications")}</span>
          {unreadCount > 0 && (
            <span className="text-xs bg-[#1672DC] text-white px-1.5 py-0.5 rounded-full">{unreadCount}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              title={translateText("Mark all as read")}
              aria-label={translateText("Mark all notifications as read")}
              className="p-1.5 rounded-lg text-[#66758A] hover:text-[#1672DC] hover:bg-slate-100 transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setShowNotifications(false)}
            aria-label={translateText("Close notifications")}
            className="p-1.5 rounded-lg text-[#66758A] hover:text-[#10243E] hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-[#D9E1EA]">
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-[#66758A] text-sm">No notifications</div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => markNotificationRead(n.id)}
              className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                !n.read ? 'bg-blue-50/50' : ''
              }`}
            >
              <span className="text-lg shrink-0" aria-hidden="true">{TYPE_ICONS[n.type] ?? '🔔'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[#10243E] truncate">{n.title}</p>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-[#1672DC] shrink-0" aria-label="Unread" />
                  )}
                </div>
                <p className="text-xs text-[#66758A] line-clamp-2 mt-0.5">{n.message}</p>
                <p className="text-xs text-[#66758A] mt-1">{formatRelativeTime(n.createdAt)}</p>
              </div>
              {!n.read && (
                <button
                  onClick={(e) => { e.stopPropagation(); markNotificationRead(n.id); }}
                  aria-label="Mark as read"
                  className="shrink-0 p-1 text-[#1672DC] hover:bg-[#1672DC]/10 rounded"
                >
                  <Check className="w-3 h-3" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
