"use client";
import { usePreferences, useFormatters } from "@/context/PreferencesContext";
import { Heart, MapPin, BedDouble, Bath, Maximize2, Eye, Tag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Property } from '../types';

import { useApp } from '../context/AppContext';

const CATEGORY_COLORS: Record<string, string> = {
  'Single house':       'bg-sky-50 text-sky-700',
  'Condominium':        'bg-violet-50 text-violet-700',
  'Townhouse':          'bg-teal-50 text-teal-700',
  'Land':               'bg-lime-50 text-lime-700',
  'Commercial Building':'bg-orange-50 text-orange-700',
};

interface PropertyCardProps {
  property: Property;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const { translateText } = usePreferences();
  const { formatPrice } = useFormatters();

  const router = useRouter();
  const { isFavorite, toggleFavorite } = useApp();
  const saved = isFavorite(property.id);
  const catCls = CATEGORY_COLORS[property.category] ?? 'bg-slate-100 text-slate-600';

  return (
    <article className="bg-white rounded-xl border border-[#D9E1EA] overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group flex flex-col">
      {/* Image */}
      <div className="relative overflow-hidden bg-slate-100 h-48 shrink-0">
        <img
          src={property.coverImage}
          onError={({ currentTarget }) => {
            if (!currentTarget.src.endsWith('/placeholder-property.svg')) currentTarget.src = '/placeholder-property.svg';
          }}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="bg-[#1672DC] text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
            {translateText("For Sale")}</span>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full shadow-sm backdrop-blur-sm bg-white/90 ${catCls}`}>
            {translateText(property.category)}
          </span>
        </div>

        {/* Favorite */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleFavorite(property.id); }}
          aria-label={saved ? 'Remove from favorites' : 'Save to favorites'}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all ${
            saved ? 'bg-red-500 text-white scale-110' : 'bg-white/90 text-slate-500 hover:text-red-500 hover:scale-110'
          }`}
        >
          <Heart className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} />
        </button>

        {/* View count */}
        {property.views !== undefined && <div className="absolute bottom-3 right-3 bg-black/55 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm">
          <Eye className="w-3 h-3" aria-hidden="true" />
          {property.views.toLocaleString()}
        </div>}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-[#10243E] text-sm leading-snug line-clamp-2 mb-1.5">
          {property.title}
        </h3>

        <div className="flex items-center gap-1 text-[#66758A] text-xs mb-3">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-[#1672DC]" aria-hidden="true" />
          <span className="truncate">{property.location.displayAddress}</span>
        </div>

        <div className="text-[#1672DC] font-bold text-lg mb-3 mt-auto">
          {formatPrice(property.price)}
        </div>

        {/* Specs row */}
        <div className="flex items-center gap-3 text-[#66758A] text-xs mb-4 border-t border-[#D9E1EA] pt-3">
          {property.bedrooms !== undefined && (
            <span className="flex items-center gap-1">
              <BedDouble className="w-3.5 h-3.5" aria-hidden="true" />
              {property.bedrooms} {translateText("Beds")}</span>
          )}
          {property.bathrooms !== undefined && (
            <span className="flex items-center gap-1">
              <Bath className="w-3.5 h-3.5" aria-hidden="true" />
              {property.bathrooms} {translateText("Baths")}</span>
          )}
          {property.usableArea !== undefined && (
            <span className="flex items-center gap-1">
              <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
              {property.usableArea} {translateText("m²")}</span>
          )}
          {!property.bedrooms && property.landArea !== undefined && (
            <span className="flex items-center gap-1">
              <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
              {property.landArea} {translateText("m²")}</span>
          )}
          {property.inquiryCount > 0 && (
            <span className="flex items-center gap-1 ml-auto text-[#1672DC]">
              <Tag className="w-3.5 h-3.5" aria-hidden="true" />
              {property.inquiryCount}
            </span>
          )}
        </div>

        <button
          onClick={() => router.push(`/properties/${property.id}`)}
          className="w-full py-2 text-sm font-semibold text-[#1672DC] border border-[#1672DC] rounded-lg hover:bg-[#1672DC] hover:text-white transition-colors"
        >
          {translateText("View Details")}</button>
      </div>
    </article>
  );
}
