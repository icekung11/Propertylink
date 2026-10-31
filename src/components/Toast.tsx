"use client";
import { usePreferences } from "@/context/PreferencesContext";
import { CheckCircle, XCircle, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function ToastContainer() {
  const { translateText } = usePreferences();

  const { toasts } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2"
      role="status"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium min-w-60 max-w-xs animate-in fade-in slide-in-from-right-4 ${
            toast.type === 'success'
              ? 'bg-[#18A66A] text-white'
              : toast.type === 'error'
              ? 'bg-[#E5484D] text-white'
              : 'bg-[#102B4B] text-white'
          }`}
        >
          {toast.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0" aria-hidden="true" />}
          {toast.type === 'error' && <XCircle className="w-4 h-4 shrink-0" aria-hidden="true" />}
          {toast.type === 'info' && <Info className="w-4 h-4 shrink-0" aria-hidden="true" />}
          {translateText(toast.message)}
        </div>
      ))}
    </div>
  );
}
