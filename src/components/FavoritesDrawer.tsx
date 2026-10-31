"use client";
import { usePreferences, useFormatters } from "@/context/PreferencesContext";
import { useEffect, useState } from 'react';
import { X, Heart, MapPin, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useApp } from '../context/AppContext';
import { adaptListing } from '../lib/property-adapter';

import type { Property } from '../types';

interface FavoritesDrawerProps {
  onClose: () => void;
}

export default function FavoritesDrawer({ onClose }: FavoritesDrawerProps) {
  const { translateText } = usePreferences();
  const { formatPrice } = useFormatters();

  const { favorites, toggleFavorite, user, setShowLoginModal } = useApp();
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!user) { setProperties([]); return; }
    let cancelled = false;
    setLoading(true);
    fetch('/api/buyer/favorites?limit=100')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load favorites');
        return response.json();
      })
      .then((data) => { if (!cancelled) setProperties((data.favorites ?? []).map(adaptListing)); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id, favorites.length]);
  const savedProperties = properties.filter((property) => favorites.includes(property.id));

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-labelledby="favorites-title">
      <div className="flex-1 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="w-full max-w-sm bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[#D9E1EA]">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#1672DC]" aria-hidden="true" />
            <h2 id="favorites-title" className="font-semibold text-[#10243E]">
              {translateText("Saved Properties")}</h2>
            {savedProperties.length > 0 && (
              <span className="text-xs bg-[#1672DC] text-white px-2 py-0.5 rounded-full">
                {savedProperties.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label={translateText("Close favorites")}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#66758A] hover:text-[#10243E] hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-sm text-[#66758A]" role="status">Loading favorites…</div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-red-600">Unable to load favorites.</div>
          ) : !user ? (
            <div className="p-6 text-center">
              <p className="text-sm text-[#66758A] mb-3">Sign in to view your saved properties.</p>
              <button onClick={() => setShowLoginModal(true)} className="px-4 py-2 bg-[#1672DC] text-white rounded-lg text-sm">Sign in</button>
            </div>
          ) : savedProperties.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Heart className="w-7 h-7 text-slate-300" />
              </div>
              <p className="text-[#10243E] font-medium mb-1">No saved properties yet</p>
              <p className="text-[#66758A] text-sm mb-5">You haven't saved any properties yet.</p>
              <button
                onClick={() => { router.push('/properties'); onClose(); }}
                className="px-4 py-2 bg-[#1672DC] text-white text-sm font-medium rounded-lg hover:bg-[#125BB8] transition-colors"
              >
                Explore Properties
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#D9E1EA]">
              {savedProperties.map((property) => (
                <div key={property.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex gap-3">
                    <img
                      src={property.coverImage}
                      alt={property.title}
                      className="w-20 h-16 object-cover rounded-lg bg-slate-100 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-[#10243E] line-clamp-1">{property.title}</h3>
                      <div className="flex items-center gap-1 text-[#66758A] text-xs mt-0.5 mb-1">
                        <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{property.location.displayAddress}</span>
                      </div>
                      <div className="text-[#1672DC] font-semibold text-sm">{formatPrice(property.price)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => { router.push(`/properties/${property.id}`); onClose(); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-[#1672DC] border border-[#1672DC] rounded-lg hover:bg-[#1672DC] hover:text-white transition-colors"
                    >
                      View Property
                      <ArrowRight className="w-3 h-3" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => toggleFavorite(property.id)}
                      aria-label="Remove from favorites"
                      className="py-1.5 px-3 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
