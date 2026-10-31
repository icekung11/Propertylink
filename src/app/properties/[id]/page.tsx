"use client";
import { usePreferences, useFormatters } from "@/context/PreferencesContext";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Heart, Share2, MapPin, BedDouble, Bath, Maximize2, Car, Home as HomeIcon,
  ChevronRight, ChevronLeft, X, Phone, Mail, CheckCircle,
  Eye, Calendar, AlertCircle, MessageCircle
} from 'lucide-react';
import PropertyCard from '../../../components/PropertyCard';
import StatusBadge from '../../../components/StatusBadge';
import { useApp } from '../../../context/AppContext';
import { adaptListing } from '../../../lib/property-adapter';

import type { Property } from '../../../types';

export default function PropertyDetail() {
  const { translateText } = usePreferences();
  const { formatDate, formatPrice } = useFormatters();

  const { id } = useParams<{ id: string }>();
  const { isFavorite, toggleFavorite, showToast, user, setShowLoginModal, addInquiry } = useApp();
  const router = useRouter();

  const [property, setProperty] = useState<Property | null>(null);
  const [similar, setSimilar] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [showInquiry, setShowInquiry] = useState(false);
  const [inquiryMsg, setInquiryMsg] = useState('');
  const [inquirySent, setInquirySent] = useState(false);
  const [msgError, setMsgError] = useState('');
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);
  const [revealingPhone, setRevealingPhone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setRevealedPhone(null);
    fetch(`/api/listings/${encodeURIComponent(id)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Listing unavailable');
        return response.json();
      })
      .then(async (data) => {
        if (cancelled) return;
        const current = adaptListing(data.listing);
        setProperty(current);
        const response = await fetch(`/api/listings?limit=100&category=${encodeURIComponent(String(data.listing.category?.name ?? ''))}`);
        if (!response.ok) return;
        const similarData = await response.json();
        if (!cancelled) setSimilar((similarData.listings ?? []).map(adaptListing).filter((row: Property) => row.id !== current.id).slice(0, 3));
      })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div className="max-w-[1280px] mx-auto px-6 py-24 text-center text-[#66758A]" role="status">{translateText("Loading property…")}</div>;
  if (!property) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 md:px-8 py-24 text-center">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" aria-hidden="true" />
        <h1 className="text-xl font-semibold text-[#10243E] mb-2">{translateText("Property Not Found")}</h1>
        <p className="text-[#66758A] mb-6">{loadError ? translateText("We could not load this listing. Please try again.") : translateText("This listing may have been removed or is no longer available.")}</p>
        <button
          onClick={() => router.push('/properties')}
          className="px-5 py-2.5 bg-[#1672DC] text-white font-medium rounded-lg hover:bg-[#125BB8] transition-colors"
        >
          {translateText("Browse Properties")}</button>
      </div>
    );
  }

  const isPublic = property.status === 'APPROVED';
  const saved = isFavorite(property.id);
  const revealPhone = async () => {
    if (!user) { setShowLoginModal(true); return; }
    if (!user.roles.includes('BUYER')) { showToast('Only buyer accounts can reveal seller phone numbers.', 'error'); return; }
    setRevealingPhone(true);
    try {
      const response = await fetch(`/api/listings/${encodeURIComponent(property.id)}/reveal-phone`, {method:'POST'});
      const data = await response.json();
      if (!response.ok || !data.phone) throw new Error(data.error || 'Unable to load contact phone.');
      setRevealedPhone(data.phone);
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to load contact phone.', 'error'); }
    finally { setRevealingPhone(false); }
  };
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      showToast('Link copied to clipboard!', 'info');
    });
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8">
      {/* Breadcrumb */}
      <nav aria-label={translateText("Breadcrumb")} className="flex items-center gap-1.5 text-sm text-[#66758A] mb-6 flex-wrap">
        <Link href="/" className="flex items-center gap-1 hover:text-[#1672DC] transition-colors">
          <HomeIcon className="w-4 h-4" aria-hidden="true" />
          {translateText("Home")}</Link>
        <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <Link href="/properties" className="hover:text-[#1672DC] transition-colors">{translateText("Properties")}</Link>
        <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span className="text-[#10243E] font-medium truncate max-w-[200px]">{property.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Gallery */}
          <div className="space-y-3">
            <div
              className="relative bg-slate-100 rounded-xl overflow-hidden cursor-pointer h-64 sm:h-80 md:h-96"
              onClick={() => setShowGallery(true)}
              role="button"
              aria-label={`Open gallery, photo ${galleryIndex + 1} of ${property.images.length}`}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setShowGallery(true)}
            >
              <img
                src={property.images[galleryIndex] || property.coverImage}
                alt={`${property.title} — photo ${galleryIndex + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
                {galleryIndex + 1} / {property.images.length}
              </div>
              {galleryIndex > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setGalleryIndex((i) => Math.max(0, i - 1)); }}
                  aria-label={translateText("Previous photo")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {galleryIndex < property.images.length - 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setGalleryIndex((i) => Math.min(property.images.length - 1, i + 1)); }}
                  aria-label={translateText("Next photo")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
            {property.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {property.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setGalleryIndex(i)}
                    aria-label={`Photo ${i + 1}`}
                    aria-pressed={galleryIndex === i}
                    className={`shrink-0 w-20 h-14 rounded-lg overflow-hidden bg-slate-100 border-2 transition-all ${
                      galleryIndex === i ? 'border-[#1672DC] ring-1 ring-[#1672DC]/30' : 'border-transparent hover:border-[#D9E1EA]'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title + price */}
          <div className="bg-white rounded-xl border border-[#D9E1EA] p-5">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <StatusBadge status={property.status} />
              <span className="text-xs text-[#66758A] font-mono bg-slate-100 px-2 py-1 rounded">{property.reference}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#10243E] leading-tight mb-3">{property.title}</h1>
            <div className="flex items-center gap-1.5 text-[#66758A] text-sm mb-4">
              <MapPin className="w-4 h-4 shrink-0 text-[#1672DC]" aria-hidden="true" />
              {property.location.displayAddress}
            </div>
            <div className="text-3xl font-bold text-[#1672DC]">{formatPrice(property.price)}</div>
            <div className="flex items-center gap-4 mt-3 text-xs text-[#66758A]">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                {property.views === undefined ? translateText("Views not tracked") : `${property.views} views`}
              </span>
              {property.publishedAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                  {translateText("Listed")}{formatDate(property.publishedAt)}
                </span>
              )}
            </div>
          </div>

          {/* Specs */}
          {(property.bedrooms !== undefined || property.bathrooms !== undefined || property.usableArea !== undefined || property.landArea !== undefined || property.parking !== undefined) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {property.bedrooms !== undefined && (
                <div className="bg-white rounded-xl border border-[#D9E1EA] p-4 text-center">
                  <BedDouble className="w-5 h-5 text-[#1672DC] mx-auto mb-2" aria-hidden="true" />
                  <div className="font-bold text-[#10243E] text-lg">{property.bedrooms}</div>
                  <div className="text-xs text-[#66758A] mt-0.5">{translateText("Bedrooms")}</div>
                </div>
              )}
              {property.bathrooms !== undefined && (
                <div className="bg-white rounded-xl border border-[#D9E1EA] p-4 text-center">
                  <Bath className="w-5 h-5 text-[#1672DC] mx-auto mb-2" aria-hidden="true" />
                  <div className="font-bold text-[#10243E] text-lg">{property.bathrooms}</div>
                  <div className="text-xs text-[#66758A] mt-0.5">{translateText("Bathrooms")}</div>
                </div>
              )}
              {property.usableArea !== undefined && (
                <div className="bg-white rounded-xl border border-[#D9E1EA] p-4 text-center">
                  <Maximize2 className="w-5 h-5 text-[#1672DC] mx-auto mb-2" aria-hidden="true" />
                  <div className="font-bold text-[#10243E] text-lg">{property.usableArea}</div>
                  <div className="text-xs text-[#66758A] mt-0.5">{translateText("Usable m²")}</div>
                </div>
              )}
              {property.landArea !== undefined && (
                <div className="bg-white rounded-xl border border-[#D9E1EA] p-4 text-center">
                  <Maximize2 className="w-5 h-5 text-[#66758A] mx-auto mb-2" aria-hidden="true" />
                  <div className="font-bold text-[#10243E] text-lg">{property.landArea}</div>
                  <div className="text-xs text-[#66758A] mt-0.5">{translateText("Land m²")}</div>
                </div>
              )}
              {property.parking !== undefined && (
                <div className="bg-white rounded-xl border border-[#D9E1EA] p-4 text-center">
                  <Car className="w-5 h-5 text-[#1672DC] mx-auto mb-2" aria-hidden="true" />
                  <div className="font-bold text-[#10243E] text-lg">{property.parking}</div>
                  <div className="text-xs text-[#66758A] mt-0.5">{translateText("Parking")}</div>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div className="bg-white rounded-xl border border-[#D9E1EA] p-5 md:p-6">
            <h2 className="font-semibold text-[#10243E] text-base mb-3">{translateText("Description")}</h2>
            <p className="text-[#66758A] text-sm leading-relaxed whitespace-pre-line">{property.description}</p>
          </div>

          {/* Features */}
          {property.features && property.features.length > 0 && (
            <div className="bg-white rounded-xl border border-[#D9E1EA] p-5 md:p-6">
              <h2 className="font-semibold text-[#10243E] text-base mb-4">{translateText("Features & Amenities")}</h2>
              <div className="flex flex-wrap gap-2">
                {property.features.map((f) => (
                  <span key={f} className="flex items-center gap-1.5 text-sm text-[#10243E] bg-[#F5F8FC] px-3 py-1.5 rounded-full border border-[#D9E1EA]">
                    <CheckCircle className="w-3.5 h-3.5 text-[#18A66A] shrink-0" aria-hidden="true" />
                    {translateText(f)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Property details */}
          <div className="bg-white rounded-xl border border-[#D9E1EA] p-5 md:p-6">
            <h2 className="font-semibold text-[#10243E] text-base mb-4">{translateText("Property Details")}</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
              {[
                ['Reference', property.reference],
                ['Category', property.category],
                ['Province', property.location.province],
                ['District', property.location.district],
                ['Postal Code', property.location.postalCode],
                property.publishedAt ? ['Published', formatDate(property.publishedAt)] : null,
                property.approvedBy ? ['Reviewed by', property.approvedBy] : null,
              ].filter((x): x is [string, string] => x !== null).map(([label, value]) => (
                <div key={label as string} className="flex flex-col">
                  <dt className="text-xs text-[#66758A] font-medium">{label as string}</dt>
                  <dd className="text-sm text-[#10243E] font-medium mt-0.5">{value as string}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Map placeholder */}
          <div className="bg-white rounded-xl border border-[#D9E1EA] p-5 md:p-6">
            <h2 className="font-semibold text-[#10243E] text-base mb-4">{translateText("Location")}</h2>
            <div className="bg-[#F5F8FC] rounded-lg h-48 flex flex-col items-center justify-center text-[#66758A] text-sm gap-2 border border-[#D9E1EA]">
              <MapPin className="w-6 h-6 text-[#1672DC]" aria-hidden="true" />
              <span className="font-medium text-[#10243E]">{property.location.displayAddress}</span>
              <span className="text-xs text-[#66758A]">{property.location.district}, {property.location.province} {property.location.postalCode}</span>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Price + actions */}
          <div className="bg-white rounded-xl border border-[#D9E1EA] p-5 space-y-4 lg:sticky lg:top-24">
            <div>
              <div className="text-2xl font-bold text-[#1672DC] mb-1">{formatPrice(property.price)}</div>
              <div className="flex items-center gap-3 text-xs text-[#66758A]">
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                  {property.views === undefined ? translateText("Views not tracked") : `${property.views} views`}
                </span>
                {property.publishedAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                    {formatDate(property.publishedAt)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => toggleFavorite(property.id)}
                aria-label={saved ? 'Remove from favorites' : 'Save to favorites'}
                className={`flex-1 py-2.5 flex items-center justify-center gap-2 text-sm font-medium rounded-xl border transition-colors ${
                  saved ? 'bg-red-50 text-red-600 border-red-200' : 'border-[#D9E1EA] text-[#10243E] hover:border-[#1672DC] hover:text-[#1672DC]'
                }`}
              >
                <Heart className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
                {saved ? translateText("Saved") : translateText("Save")}
              </button>
              <button
                onClick={handleShare}
                aria-label={translateText("Share property")}
                className="flex-1 py-2.5 flex items-center justify-center gap-2 text-sm font-medium rounded-xl border border-[#D9E1EA] text-[#10243E] hover:border-[#1672DC] hover:text-[#1672DC] transition-colors"
              >
                <Share2 className="w-4 h-4" aria-hidden="true" />
                {translateText("Share")}</button>
            </div>
          </div>

          {/* Seller contact */}
          {isPublic && (
            <div className="bg-white rounded-xl border border-[#D9E1EA] p-5">
              <h2 className="font-semibold text-[#10243E] text-base mb-4">{translateText("Seller Contact")}</h2>

              {/* Seller identity */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#D9E1EA]">
                <div className="w-11 h-11 rounded-full bg-[#1672DC] text-white font-bold flex items-center justify-center text-lg shrink-0">
                  {property.sellerName[0]}
                </div>
                <div>
                  <div className="font-semibold text-[#10243E]">{property.sellerName}</div>
                  <div className="flex items-center gap-1.5 text-xs text-[#18A66A] font-medium mt-0.5">
                    <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    {translateText("Verified Seller")}</div>
                </div>
              </div>

              {/* Primary CTA: Inquiry */}
              <button
                onClick={() => {
                  if (!user) { setShowLoginModal(true); return; }
                  setShowInquiry(true);
                  setInquirySent(false);
                  setInquiryMsg('');
                  setMsgError('');
                }}
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#1672DC] text-white font-semibold rounded-xl hover:bg-[#125BB8] transition-colors mb-3"
              >
                <MessageCircle className="w-4 h-4" aria-hidden="true" />
                {translateText("Contact Seller")}</button>

              {/* Secondary contact channels */}
              <div className="space-y-2">
                {!revealedPhone && <button type="button" onClick={revealPhone} disabled={revealingPhone} className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#1672DC] text-white font-semibold text-sm disabled:opacity-50"><Phone className="w-4 h-4" />{revealingPhone ? translateText("Loading phone…") : translateText("Show phone number")}</button>}
                {revealedPhone && (
                  <a
                    href={`tel:${revealedPhone.replace(/[^+0-9]/g, '')}`}
                    className="flex items-center gap-3 w-full px-4 py-3 bg-[#1672DC] text-white rounded-xl hover:bg-[#125BB8] transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">{translateText("Call")}</div>
                      <div className="text-xs text-blue-200 truncate">{revealedPhone}</div>
                    </div>
                  </a>
                )}

                {property.sellerLine && (
                  <a
                    href={`https://line.me/R/ti/p/${encodeURIComponent(property.sellerLine)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full px-4 py-3 bg-[#06C755] text-white rounded-xl hover:bg-[#05b04c] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">{translateText("LINE")}</div>
                      <div className="text-xs text-green-100 truncate">{property.sellerLine}</div>
                    </div>
                  </a>
                )}

                {property.sellerEmail && (
                  <a
                    href={`mailto:${property.sellerEmail}?subject=Inquiry: ${encodeURIComponent(property.title)}`}
                    className="flex items-center gap-3 w-full px-4 py-3 border border-[#D9E1EA] text-[#10243E] rounded-xl hover:border-[#1672DC] hover:text-[#1672DC] transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#F5F8FC] group-hover:bg-blue-50 flex items-center justify-center shrink-0 transition-colors">
                      <Mail className="w-4 h-4 text-[#1672DC]" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">{translateText("Email")}</div>
                      <div className="text-xs text-[#66758A] group-hover:text-[#1672DC] truncate transition-colors">{property.sellerEmail}</div>
                    </div>
                  </a>
                )}

                {!revealedPhone && !property.sellerLine && !property.sellerEmail && (
                  <p className="text-sm text-[#66758A] text-center py-3">{translateText("Contact information not available.")}</p>
                )}
              </div>
            </div>
          )}

          {/* Quick stats */}
          <div className="bg-white rounded-xl border border-[#D9E1EA] p-5">
            <h2 className="font-semibold text-[#10243E] text-base mb-4">{translateText("Listing Info")}</h2>
            <dl className="space-y-2.5">
              <div className="flex items-center justify-between">
                <dt className="text-sm text-[#66758A]">{translateText("Reference")}</dt>
                <dd className="text-xs font-mono text-[#10243E] bg-slate-100 px-2 py-0.5 rounded">{property.reference}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-[#66758A]">{translateText("Category")}</dt>
                <dd className="text-sm font-medium text-[#10243E]">{translateText(property.category)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-[#66758A]">{translateText("Location")}</dt>
                <dd className="text-sm font-medium text-[#10243E]">{property.location.province}</dd>
              </div>
              {property.usableArea && (
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-[#66758A]">{translateText("Usable Area")}</dt>
                  <dd className="text-sm font-medium text-[#10243E]">{property.usableArea} {" " + translateText("m²")}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Similar properties */}
      {similar.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-[#10243E] mb-5">{translateText("Similar Properties")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {similar.map((p) => <PropertyCard key={p.id} property={p} />)}
          </div>
        </div>
      )}

      {/* Inquiry modal */}
      {showInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-label={translateText("Contact seller")}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-5 border-b border-[#D9E1EA]">
              <h2 className="font-semibold text-[#10243E]">{translateText("Contact Seller")}</h2>
              <button onClick={() => setShowInquiry(false)} aria-label={translateText("Close")}>
                <X className="w-5 h-5 text-[#66758A]" />
              </button>
            </div>
            <div className="p-5">
              {!inquirySent ? (
                <>
                  <div className="flex items-center gap-3 p-3 bg-[#F5F8FC] rounded-lg border border-[#D9E1EA] mb-4">
                    <img src={property.coverImage} alt="" className="w-12 h-10 rounded-lg object-cover shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#10243E] truncate">{property.title}</div>
                      <div className="text-xs text-[#1672DC] font-semibold">{formatPrice(property.price)}</div>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label htmlFor="inquiry-msg" className="block text-sm font-medium text-[#10243E] mb-1.5">
                      Your Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="inquiry-msg"
                      rows={4}
                      value={inquiryMsg}
                      onChange={(e) => { setInquiryMsg(e.target.value); setMsgError(''); }}
                      placeholder="Hello, I'm interested in this property. Could we arrange a viewing?"
                      className="w-full px-3.5 py-2.5 border border-[#D9E1EA] rounded-lg text-sm focus:outline-none focus:border-[#1672DC] focus:ring-2 focus:ring-[#1672DC]/20 resize-none"
                    />
                    {msgError && <p className="text-xs text-red-600 mt-1">{msgError}</p>}
                  </div>
                  <button
                    onClick={async () => {
                      if (!inquiryMsg.trim()) { setMsgError('Please enter a message.'); return; }
                      const sent = await addInquiry(property, inquiryMsg.trim());
                      if (sent) setInquirySent(true);
                    }}
                    className="w-full py-3 bg-[#1672DC] text-white font-semibold rounded-xl hover:bg-[#125BB8] transition-colors"
                  >
                    Send Inquiry
                  </button>
                </>
              ) : (
                <div className="text-center py-6">
                  <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-7 h-7 text-emerald-600" aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold text-[#10243E] mb-1">Inquiry Sent!</h3>
                  <p className="text-sm text-[#66758A] mb-5">
                    Your message has been sent to <strong>{property.sellerName}</strong>. They will respond shortly.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowInquiry(false)}
                      className="flex-1 py-2.5 border border-[#D9E1EA] text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => { setShowInquiry(false); router.push('/buyer?tab=inquiries'); }}
                      className="flex-1 py-2.5 bg-[#1672DC] text-white text-sm font-semibold rounded-xl hover:bg-[#125BB8] transition-colors"
                    >
                      View History
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gallery overlay */}
      {showGallery && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" role="dialog" aria-modal="true" aria-label={translateText("Photo gallery")}>
          <button
            onClick={() => setShowGallery(false)}
            aria-label={translateText("Close gallery")}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={() => setGalleryIndex((i) => Math.max(0, i - 1))}
            aria-label={translateText("Previous photo")}
            disabled={galleryIndex === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <img
            src={property.images[galleryIndex]}
            alt={`${property.title} — photo ${galleryIndex + 1}`}
            className="max-w-4xl w-full max-h-[80vh] object-contain px-16"
          />
          <button
            onClick={() => setGalleryIndex((i) => Math.min(property.images.length - 1, i + 1))}
            aria-label={translateText("Next photo")}
            disabled={galleryIndex === property.images.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
            {galleryIndex + 1} / {property.images.length}
          </div>
        </div>
      )}
    </div>
  );
}
