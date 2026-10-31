"use client";
import { usePreferences } from "@/context/PreferencesContext";
import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation';
import {
  Search,
  MapPin,
  ArrowRight,
  Shield,
  Star,
  Users,
  Home as HomeIcon,
  Building2,
  Trees,
  Store,
  Hotel,
} from "lucide-react"
import PropertyCard from "../components/PropertyCard"
import { adaptListing } from "../lib/property-adapter"
import type { Property } from "../types"
import { useApp } from "../context/AppContext"

const CATEGORIES: {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  desc: string
}[] = [
  { id: "house", label: "Detached House", icon: HomeIcon, desc: "Private living with your own space" },
  { id: "condo", label: "Condominium", icon: Building2, desc: "Urban living near the city" },
  { id: "townhouse", label: "Townhouse", icon: Hotel, desc: "Smart value for growing families" },
  { id: "land", label: "Vacant Land", icon: Trees, desc: "Build your dream from scratch" },
  { id: "commercial", label: "Commercial Building", icon: Store, desc: "Spaces made for business" },
]

const QUICK_SEARCHES: { label: string; params: Record<string, string> }[] = [
  { label: "Bangkok", params: { location: "Bangkok" } },
  { label: "Chiang Mai", params: { location: "Chiang Mai" } },
  { label: "Phuket", params: { location: "Phuket" } },
  { label: "Under ฿3M", params: { priceMax: "3000000" } },
  { label: "Condo", params: { category: "Condominium" } },
  { label: "House", params: { category: "Detached House" } },
]

export default function Home() {
  const { translateText } = usePreferences();

  const router = useRouter()
  const { user, setShowLoginModal, showToast } = useApp()

  const handleListProperty = () => {
    if (!user) {
      setShowLoginModal(true)
      return
    }
    if (!user.roles.includes('SELLER')) {
      showToast('Please sign in with a Seller account to list a property.', 'info')
      return
    }
    router.push('/seller?tab=create')
  }
  const [searchCategory, setSearchCategory] = useState("")
  const [priceMin, setPriceMin] = useState("")
  const [priceMax, setPriceMax] = useState("")
  const [location, setLocation] = useState("")

  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([])
  const [featuredLoading, setFeaturedLoading] = useState(true)
  const [featuredError, setFeaturedError] = useState(false)
  useEffect(() => {
    fetch('/api/listings?limit=6&sort=newest')
      .then(async (response) => response.ok ? response.json() : Promise.reject(new Error('Listings unavailable')))
      .then((data) => setFeaturedProperties((data.listings ?? []).map(adaptListing)))
      .catch(() => setFeaturedError(true))
      .finally(() => setFeaturedLoading(false))
  }, [])

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (searchCategory) params.set("category", searchCategory)
    if (priceMin) params.set("priceMin", priceMin)
    if (priceMax) params.set("priceMax", priceMax)
    if (location) params.set("location", location)
    router.push(`/properties?${params.toString()}`)
  }

  return (
    <div>
      {/* Hero */}
      <section
        className="relative min-h-[580px] flex items-center"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&h=900&fit=crop&auto=format)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-label={translateText("Hero section")}
      >
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#102B4B]/90 via-[#102B4B]/75 to-[#102B4B]/40"
          aria-hidden="true"
        />
        <div className="relative z-10 max-w-[1280px] mx-auto px-6 md:px-8 py-20 w-full">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full mb-6 border border-white/20">
              <Star className="w-4 h-4 text-[#F4B740]" aria-hidden="true" />
              {translateText("Property marketplace for Thailand")}</div>
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
              {translateText("Find Your")}<br />
              <span className="text-[#F4B740]">{translateText("Perfect Property")}</span>
            </h1>
            <p className="text-slate-300 text-lg mb-10 leading-relaxed">
              {translateText("Search properties across Thailand. Only approved listings appear in public search.")}</p>

            {/* Search box */}
            <div className="bg-white rounded-2xl shadow-2xl p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <div>
                  <label
                    htmlFor="search-category"
                    className="block text-xs font-medium text-[#66758A] mb-1.5"
                  >
                    {translateText("Category")}</label>
                  <select
                    id="search-category"
                    value={searchCategory}
                    onChange={(e) => setSearchCategory(e.target.value)}
                    className="w-full px-3 py-2.5 border border-[#D9E1EA] rounded-lg text-sm text-[#10243E] bg-white focus:outline-none focus:border-[#1672DC] focus:ring-2 focus:ring-[#1672DC]/20"
                  >
                    <option value="">{translateText("All Categories")}</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.label}>
                        {translateText(c.label)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="price-min"
                    className="block text-xs font-medium text-[#66758A] mb-1.5"
                  >
                    {translateText("Min Price (฿)")}</label>
                  <input
                    id="price-min"
                    type="number"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    placeholder={translateText("e.g. 3,000,000")}
                    className="w-full px-3 py-2.5 border border-[#D9E1EA] rounded-lg text-sm text-[#10243E] focus:outline-none focus:border-[#1672DC] focus:ring-2 focus:ring-[#1672DC]/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor="price-max"
                    className="block text-xs font-medium text-[#66758A] mb-1.5"
                  >
                    {translateText("Max Price (฿)")}</label>
                  <input
                    id="price-max"
                    type="number"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    placeholder={translateText("e.g. 15,000,000")}
                    className="w-full px-3 py-2.5 border border-[#D9E1EA] rounded-lg text-sm text-[#10243E] focus:outline-none focus:border-[#1672DC] focus:ring-2 focus:ring-[#1672DC]/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor="search-location"
                    className="block text-xs font-medium text-[#66758A] mb-1.5"
                  >
                    {translateText("Location")}</label>
                  <div className="relative">
                    <MapPin
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#66758A]"
                      aria-hidden="true"
                    />
                    <input
                      id="search-location"
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder={translateText("Bangkok, Chiang Mai...")}
                      className="w-full pl-9 pr-3 py-2.5 border border-[#D9E1EA] rounded-lg text-sm text-[#10243E] focus:outline-none focus:border-[#1672DC] focus:ring-2 focus:ring-[#1672DC]/20"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <button
                  onClick={handleSearch}
                  className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-8 py-3 bg-[#1672DC] text-white font-semibold rounded-xl hover:bg-[#125BB8] transition-colors"
                >
                  <Search className="w-4 h-4" aria-hidden="true" />
                  {translateText("Search Properties")}</button>
                <div className="flex flex-wrap items-center gap-2 sm:pl-4 sm:border-l sm:border-[#D9E1EA]">
                  <span className="text-xs font-medium text-[#66758A] mr-1">{translateText("Quick search:")}</span>
                  {QUICK_SEARCHES.map(({ label, params }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() =>
                        router.push(`/properties?${new URLSearchParams(params).toString()}`)
                      }
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#F5F8FC] text-[#10243E] border border-[#D9E1EA] hover:bg-[#1672DC] hover:border-[#1672DC] hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1672DC]/40"
                    >
                      {translateText(label)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust stats */}
      {/* Categories */}
      <section className="py-16" aria-label={translateText("Property categories")}>
        <div className="max-w-[1280px] mx-auto px-6 md:px-8">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#1672DC] text-xs font-semibold uppercase tracking-wider mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1672DC]" aria-hidden="true" />
              {translateText("Property Types")}</span>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-[1.1] text-[#10243E] mb-4">
              {translateText("Browse by")}{" "}
              <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-[#1672DC] to-[#4BA3FF]">
                {translateText("Category")}<svg
                  viewBox="0 0 200 12"
                  preserveAspectRatio="none"
                  className="absolute left-0 -bottom-1.5 w-full h-2 text-[#1672DC]/30"
                  aria-hidden="true"
                >
                  <path d="M2 8 Q50 1 100 6 T198 5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
            </h2>
            <p className="text-[#66758A] max-w-md mx-auto">
              {translateText("Find the property type that suits your needs")}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {CATEGORIES.map(({ id, label, icon: Icon, desc }) => (
              <button
                key={id}
                onClick={() =>
                  router.push(`/properties?category=${encodeURIComponent(label)}`)
                }
                className="group relative flex flex-col items-start text-left gap-4 p-5 bg-white rounded-2xl border border-[#D9E1EA] overflow-hidden hover:-translate-y-1 hover:border-[#1672DC] hover:shadow-[0_16px_32px_-16px_rgba(22,114,220,0.35)] transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1672DC]/20"
              >
                <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-blue-50 group-hover:bg-[#1672DC]/10 transition-colors" aria-hidden="true" />
                <div className="relative w-12 h-12 rounded-xl bg-blue-50 text-[#1672DC] flex items-center justify-center ring-1 ring-blue-100 group-hover:bg-[#1672DC] group-hover:text-white group-hover:ring-[#1672DC] transition-colors">
                  <Icon className="w-6 h-6" aria-hidden="true" />
                </div>
                <div className="relative flex-1">
                  <div className="text-[15px] font-semibold text-[#10243E] leading-snug">
                    {translateText(label)}
                  </div>
                  <p className="text-xs text-[#66758A] mt-1 leading-relaxed">
                    {translateText(desc)}
                  </p>
                </div>
                <div className="relative w-full flex items-center justify-between pt-3 border-t border-[#EEF3F9]">
                  <span className="text-xs font-medium text-[#10243E]">
                    {translateText("Browse listings")}</span>
                  <ArrowRight className="w-4 h-4 text-[#8A98AC] group-hover:text-[#1672DC] group-hover:translate-x-0.5 transition-all" aria-hidden="true" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured properties */}
      <section className="pb-16" aria-label={translateText("Featured properties")}>
        <div className="max-w-[1280px] mx-auto px-6 md:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-[#10243E] mb-1">
                {translateText("Featured Properties")}</h2>
              <p className="text-[#66758A]">{translateText("Handpicked listings for you")}</p>
            </div>
            <button
              onClick={() => router.push("/properties")}
              className="hidden md:flex items-center gap-2 text-[#1672DC] font-medium hover:gap-3 transition-all"
            >
              {translateText("View All")}<ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredLoading ? <div className="col-span-full py-10 text-center text-[#66758A]" role="status">Loading properties…</div> : featuredError ? <div className="col-span-full py-10 text-center text-red-600">Unable to load properties right now.</div> : featuredProperties.length === 0 ? <div className="col-span-full py-10 text-center text-[#66758A]">No approved properties are available yet.</div> : featuredProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
          <div className="text-center mt-8 md:hidden">
            <button
              onClick={() => router.push("/properties")}
              className="px-6 py-3 bg-[#1672DC] text-white font-semibold rounded-xl hover:bg-[#125BB8] transition-colors"
            >
              {translateText("View All Properties")}</button>
          </div>
        </div>
      </section>

      {/* About / Trust */}
      <section
        id="about"
        className="bg-white py-16"
        aria-label={translateText("About PropertyLink")}
      >
        <div className="max-w-[1280px] mx-auto px-6 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block bg-blue-50 text-[#1672DC] text-sm font-semibold px-3 py-1.5 rounded-full mb-4">
                {translateText("Why Choose PropertyLink")}</div>
              <h2 className="text-3xl font-bold text-[#10243E] mb-4">
                {translateText("Your Trusted Partner in Real Estate")}</h2>
              <p className="text-[#66758A] text-base leading-relaxed mb-6">
                {translateText("Every property on PropertyLink is reviewed and approved by our admin team before publication. We ensure only genuine, accurate listings reach buyers.")}</p>
              <div className="space-y-4">
                {[
                  {
                    icon: Shield,
                    title: "Verified Listings",
                    desc: "All properties reviewed before going live",
                  },
                  {
                    icon: Star,
                    title: "Quality Guaranteed",
                    desc: "Accurate descriptions and real photos only",
                  },
                  {
                    icon: Users,
                    title: "Trusted Community",
                    desc: "Verified buyers, sellers, and agents",
                  },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1672DC] flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#10243E]">
                        {title}
                      </div>
                      <div className="text-sm text-[#66758A] mt-0.5">
                        {translateText(desc)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=700&h=500&fit=crop&auto=format"
                alt={translateText("Beautiful Thai villa with garden")}
                className="w-full rounded-2xl shadow-xl object-cover h-80"
              />
              <div className="absolute -bottom-5 -left-5 bg-white rounded-xl shadow-lg p-4 border border-[#D9E1EA]">
                <div className="text-2xl font-bold text-[#1672DC]">379</div>
                <div className="text-xs text-[#66758A]">
                  {translateText("New listings this month")}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-16" aria-label={translateText("Contact section")}>
        <div className="max-w-[1280px] mx-auto px-6 md:px-8">
          <div className="bg-[#102B4B] rounded-2xl p-10 md:p-14 text-center">
            <h2 className="text-3xl font-bold text-white mb-3">
              {translateText("Ready to Find Your Dream Property?")}</h2>
            <p className="text-slate-300 text-base mb-8 max-w-xl mx-auto">
              {translateText("Explore approved listings or list your own property today. Our team is here to help.")}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => router.push("/properties")}
                className="px-8 py-3 bg-[#1672DC] text-white font-semibold rounded-xl hover:bg-[#125BB8] transition-colors"
              >
                {translateText("Browse Properties")}</button>
              <button
                onClick={handleListProperty}
                className="px-8 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 border border-white/20 transition-colors"
              >
                {translateText("List Your Property")}</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
