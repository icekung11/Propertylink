"use client";
import { usePreferences } from "@/context/PreferencesContext";
// This filter searches by name, so render each name once even when DB rows
// represent different location levels with the same display name.
/* Category */ /* Price range */ /* Location */ /* Min bedrooms */ /* Breadcrumb */ /* Top bar */ /* Sidebar filters */ /* Main content */ /* No results */ /* Skeleton loading */ /* Pagination */ /* Mobile filter drawer */
import { useSearchParams, usePathname, useRouter } from "next/navigation"
import { Suspense, useState, useEffect, useRef } from "react"
import Link from "next/link"
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
  LayoutGrid,
  List,
  Home,
  ChevronRight as Breadcrumb,
} from "lucide-react"
import PropertyCard from "../../components/PropertyCard"
import { adaptListing } from "../../lib/property-adapter"

const ITEMS_PER_PAGE = 9

function PropertyListContent() {
  const { translateText } = usePreferences();

  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const [filterOpen, setFilterOpen] = useState(false)
  const [view, setView] = useState<"grid" | "list">("grid")
  const [page, setPage] = useState(1)
  const resultsHeading = useRef<HTMLParagraphElement>(null)

  const changePage = (nextPage: number) => {
    if (nextPage === page) return
    setPage(nextPage)
    resultsHeading.current?.focus({ preventScroll: true })
    resultsHeading.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  const [keyword, setKeyword] = useState(
    searchParams.get("keyword") ??
      "",
  )
  const [category, setCategory] = useState(
    searchParams.get("category") ??
      "",
  )
  const [priceMin, setPriceMin] = useState(
    searchParams.get("priceMin") ??
      "",
  )
  const [priceMax, setPriceMax] = useState(
    searchParams.get("priceMax") ??
      "",
  )
  const [location, setLocation] = useState(
    searchParams.get("location") ??
      "",
  )
  const [bedrooms, setBedrooms] = useState("")
  const [sort, setSort] = useState("newest")
  const [loading, setLoading] = useState(true)
  const [properties, setProperties] =
    useState<import("../../types").Property[]>([])
  const [loadError, setLoadError] = useState(false)
  const [total, setTotal] = useState(0)
  const [categories, setCategories] = useState<Array<{
    id: string | number
    name: string
  }>>([])
  const [locations, setLocations] = useState<Array<{
    id: string | number
    name: string
  }>>([])

  useEffect(() => {
    setPage(1)
  }, [keyword, category, priceMin, priceMax, location, bedrooms, sort])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setLoadError(false)
    const timer = setTimeout(() => {
      const query = new URLSearchParams({
        limit: String(ITEMS_PER_PAGE),
        offset: String((page - 1) * ITEMS_PER_PAGE),
        sort,
      })
      for (const [key, value] of Object.entries({
        keyword,
        category,
        priceMin,
        priceMax,
        location,
        bedrooms,
      }))
        if (value) query.set(key, value)
      fetch(
        "/api/listings?" +
          query,
        { signal: controller.signal },
      )
        .then(async (response) => {
          if (!response.ok) throw new Error("Unable to load listings")
          return response.json()
        })
        .then((data) => {
          if (!controller.signal.aborted) {
            setProperties(
              (
                data.listings ??
                []
              ).map(adaptListing),
            )
            setTotal(data.total)
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setLoadError(true)
            setProperties([])
            setTotal(0)
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [page, keyword, category, priceMin, priceMax, location, bedrooms, sort])

  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then(async (response) => {
        if (!response.ok) throw new Error()
        return response.json()
      }),
      fetch("/api/locations").then(async (response) => {
        if (!response.ok) throw new Error()
        return response.json()
      }),
    ])
      .then(([categoryData, locationData]) => {
        setCategories(
          (
            categoryData.categories ??
            []
          ).map((row: {
            id: string | number
            name: string
          }) => ({
            id: row.id,
            name: row.name,
          })),
        )
        const uniqueLocations = new Map<string, {
          id: string | number
          name: string
        }>()
        for (const row of locationData.locations ?? []) {
          if (!uniqueLocations.has(row.name))
            uniqueLocations.set(row.name, { id: row.id, name: row.name })
        }
        setLocations([...uniqueLocations.values()])
      })
      .catch(() => {
        setCategories([])
        setLocations([])
      })
  }, [])

  const filtered = properties
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)
  const paginated = properties

  const clearFilters = () => {
    setKeyword("")
    setCategory("")
    setPriceMin("")
    setPriceMax("")
    setLocation("")
    setBedrooms("")
    router.push(pathname)
  }

  const hasFilters =
    keyword || category || priceMin || priceMax || location || bedrooms

  const FilterPanel = () => (
    <div className="space-y-5">
      {}
      <div>
        <p className="text-xs font-semibold text-[#66758A] uppercase tracking-wider mb-2.5">
          {translateText("Category")}</p>
        <div className="space-y-1">
          <label className="flex items-center gap-2.5 cursor-pointer group py-1">
            <input
              type="radio"
              name="category"
              value=""
              checked={category === ""}
              onChange={() => setCategory("")}
              className="accent-[#1672DC]"
            />
            <span
              className={`text-sm transition-colors ${
                category === ""
                  ? "text-[#1672DC] font-medium"
                  : "text-[#66758A] group-hover:text-[#10243E]"
              }`}
            >
              {translateText("All Categories")}</span>
          </label>
          {categories.map((c) => (
            <label
              key={c.id}
              className="flex items-center gap-2.5 cursor-pointer group py-1"
            >
              <input
                type="radio"
                name="category"
                value={c.name}
                checked={category === c.name}
                onChange={() => setCategory(c.name)}
                className="accent-[#1672DC]"
              />
              <span
                className={`text-sm transition-colors ${
                  category === c.name
                    ? "text-[#1672DC] font-medium"
                    : "text-[#10243E] group-hover:text-[#1672DC]"
                }`}
              >
                {c.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      {}
      <div className="border-t border-[#D9E1EA] pt-4">
        <p className="text-xs font-semibold text-[#66758A] uppercase tracking-wider mb-2.5">
          {translateText("Price Range")}</p>
        <div className="space-y-2">
          <div>
            <label
              htmlFor="price-min-filter"
              className="text-xs text-[#66758A] mb-1 block"
            >
              {translateText("Min Price (฿)")}</label>
            <input
              id="price-min-filter"
              type="number"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              placeholder={translateText("e.g. 3,000,000")}
              className="w-full px-3 py-2 border border-[#D9E1EA] rounded-lg text-sm focus:outline-none focus:border-[#1672DC] focus:ring-2 focus:ring-[#1672DC]/10"
            />
          </div>
          <div>
            <label
              htmlFor="price-max-filter"
              className="text-xs text-[#66758A] mb-1 block"
            >
              {translateText("Max Price (฿)")}</label>
            <input
              id="price-max-filter"
              type="number"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              placeholder={translateText("e.g. 15,000,000")}
              className="w-full px-3 py-2 border border-[#D9E1EA] rounded-lg text-sm focus:outline-none focus:border-[#1672DC] focus:ring-2 focus:ring-[#1672DC]/10"
            />
          </div>
        </div>
      </div>

      {}
      <div className="border-t border-[#D9E1EA] pt-4">
        <p className="text-xs font-semibold text-[#66758A] uppercase tracking-wider mb-2.5">
          {translateText("Location")}</p>
        <div className="space-y-1">
          <label className="flex items-center gap-2.5 cursor-pointer group py-1">
            <input
              type="radio"
              name="location"
              value=""
              checked={location === ""}
              onChange={() => setLocation("")}
              className="accent-[#1672DC]"
            />
            <span
              className={`text-sm transition-colors ${
                location === ""
                  ? "text-[#1672DC] font-medium"
                  : "text-[#66758A] group-hover:text-[#10243E]"
              }`}
            >
              {translateText("All Locations")}</span>
          </label>
          {locations.map((l) => (
            <label
              key={l.id}
              className="flex items-center gap-2.5 cursor-pointer group py-1"
            >
              <input
                type="radio"
                name="location"
                value={l.name}
                checked={location === l.name}
                onChange={() => setLocation(l.name)}
                className="accent-[#1672DC]"
              />
              <span
                className={`text-sm transition-colors ${
                  location === l.name
                    ? "text-[#1672DC] font-medium"
                    : "text-[#10243E] group-hover:text-[#1672DC]"
                }`}
              >
                {l.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      {}
      <div className="border-t border-[#D9E1EA] pt-4">
        <label
          htmlFor="bedrooms-filter"
          className="text-xs font-semibold text-[#66758A] uppercase tracking-wider mb-2.5 block"
        >
          {translateText("Min Bedrooms")}</label>
        <select
          id="bedrooms-filter"
          value={bedrooms}
          onChange={(e) => setBedrooms(e.target.value)}
          className="w-full px-3 py-2 border border-[#D9E1EA] rounded-lg text-sm focus:outline-none focus:border-[#1672DC] bg-white"
        >
          <option value="">{translateText("Any")}</option>
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n}{translateText("+ bedrooms")}</option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <button
          onClick={clearFilters}
          className="w-full py-2.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors font-medium"
        >
          {translateText("Clear All Filters")}</button>
      )}
    </div>
  )

  return (
    <div className="max-w-[1280px] mx-auto px-6 md:px-8 py-8">
      {}
      <nav
        aria-label={translateText("Breadcrumb")}
        className="flex items-center gap-1.5 text-sm text-[#66758A] mb-6"
      >
        <Link
          href="/"
          className="flex items-center gap-1 hover:text-[#1672DC] transition-colors"
        >
          <Home className="w-4 h-4" aria-hidden="true" />
          {translateText("Home")}</Link>
        <Breadcrumb className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="text-[#10243E] font-medium">{translateText("Properties")}</span>
      </nav>

      {}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#66758A]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={translateText("Search by title or location...")}
              className="w-full pl-9 pr-4 py-2.5 border border-[#D9E1EA] rounded-xl text-sm focus:outline-none focus:border-[#1672DC] focus:ring-2 focus:ring-[#1672DC]/20 bg-white"
              aria-label={translateText("Search properties")}
            />
            {keyword && (
              <button
                onClick={() => setKeyword("")}
                aria-label={translateText("Clear search")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#66758A] hover:text-[#10243E]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2.5 border border-[#D9E1EA] rounded-xl text-sm focus:outline-none focus:border-[#1672DC] bg-white"
            aria-label={translateText("Sort properties")}
          >
            <option value="newest">{translateText("Newest First")}</option>
            <option value="price-asc">{translateText("Price: Low to High")}</option>
            <option value="price-desc">{translateText("Price: High to Low")}</option>
          </select>

          <div className="flex border border-[#D9E1EA] rounded-xl overflow-hidden bg-white">
            <button
              onClick={() => setView("grid")}
              aria-label={translateText("Grid view")}
              aria-pressed={view === "grid"}
              className={`p-2.5 transition-colors ${
                view === "grid"
                  ? "bg-[#1672DC] text-white"
                  : "text-[#66758A] hover:text-[#10243E]"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("list")}
              aria-label={translateText("List view")}
              aria-pressed={view === "list"}
              className={`p-2.5 transition-colors ${
                view === "list"
                  ? "bg-[#1672DC] text-white"
                  : "text-[#66758A] hover:text-[#10243E]"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setFilterOpen(true)}
            className="md:hidden flex items-center gap-1.5 px-3 py-2.5 border border-[#D9E1EA] rounded-xl text-sm bg-white text-[#10243E]"
            aria-label={translateText("Open filters")}
          >
            <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
            {translateText("Filters")}{hasFilters && (
              <span
                className="w-2 h-2 rounded-full bg-[#1672DC]"
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      </div>

      <div className="flex gap-8">
        {}
        <aside
          className="hidden md:block w-64 shrink-0"
          aria-label={translateText("Property filters")}
        >
          <div className="bg-white rounded-xl border border-[#D9E1EA] p-5 sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-[#10243E] flex items-center gap-2">
                <SlidersHorizontal
                  className="w-4 h-4 text-[#1672DC]"
                  aria-hidden="true"
                />
                {translateText("Filters")}</h2>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-[#1672DC] hover:underline"
                >
                  {translateText("Clear all")}</button>
              )}
            </div>
            <FilterPanel />
          </div>
        </aside>

        {}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p ref={resultsHeading} tabIndex={-1} className="text-sm text-[#66758A] scroll-mt-24 focus:outline-none" aria-live="polite">
              <span className="font-semibold text-[#10243E]">{translateText('{count} properties found',{count:total})}</span>
              <span className="sr-only">{translateText('Page {page} of {total}',{page,total:Math.max(1,totalPages)})}</span>
              {hasFilters && (
                <span className="text-[#1672DC] font-medium"> {" " + translateText("· Filtered")}</span>
              )}
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-red-600 hover:underline font-medium"
              >
                {translateText("Clear filters")}</button>
            )}
          </div>

          {}
          {filtered.length === 0 && !loading && (
            <div className="text-center py-20 bg-white rounded-xl border border-[#D9E1EA]">
              <Search
                className="w-12 h-12 text-slate-200 mx-auto mb-4"
                aria-hidden="true"
              />
              <p className="text-[#10243E] font-medium mb-1">
                {translateText("No properties found")}</p>
              <p className="text-[#66758A] text-sm mb-5">
                {translateText("Try adjusting your search or filters.")}</p>
              <button
                onClick={clearFilters}
                className="px-5 py-2.5 bg-[#1672DC] text-white text-sm font-medium rounded-lg hover:bg-[#125BB8] transition-colors"
              >
                {translateText("Clear Filters")}</button>
            </div>
          )}

          {}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-[#D9E1EA] overflow-hidden animate-pulse"
                >
                  <div className="h-48 bg-slate-200" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                    <div className="h-5 bg-slate-200 rounded w-1/3" />
                    <div className="flex gap-3">
                      <div className="h-3 bg-slate-100 rounded w-16" />
                      <div className="h-3 bg-slate-100 rounded w-16" />
                      <div className="h-3 bg-slate-100 rounded w-14" />
                    </div>
                    <div className="h-8 bg-slate-100 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {filtered.length > 0 && !loading && (
            <>
              <div
                className={
                  view === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
                    : "space-y-4"
                }
              >
                {paginated.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>

              {}
              {totalPages > 1 && (
                <div
                  className="flex items-center justify-center gap-1 mt-8"
                  role="navigation"
                  aria-label={translateText("Pagination")}
                >
                  <button
                    onClick={() => changePage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    aria-label={translateText("Previous page")}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#D9E1EA] text-[#66758A] hover:text-[#10243E] hover:border-[#10243E] disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (p) => (
                      <button
                        key={p}
                        onClick={() => changePage(p)}
                        aria-label={`Page ${p}`}
                        aria-current={page === p ? "page" : undefined}
                        className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                          page === p
                            ? "bg-[#1672DC] text-white border border-[#1672DC]"
                            : "border border-[#D9E1EA] text-[#66758A] hover:text-[#10243E] hover:border-[#10243E] bg-white"
                        }`}
                      >
                        {p}
                      </button>
                    ),
                  )}
                  <button
                    onClick={() => changePage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    aria-label={translateText("Next page")}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#D9E1EA] text-[#66758A] hover:text-[#10243E] hover:border-[#10243E] disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-white"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {}
      {filterOpen && (
        <div
          className="fixed inset-0 z-50 flex md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={translateText("Filters")}
        >
          <div
            className="flex-1 bg-black/40"
            onClick={() => setFilterOpen(false)}
            aria-hidden="true"
          />
          <div className="w-72 bg-white h-full overflow-y-auto p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-[#10243E]">{translateText("Filters")}</h2>
              <button
                onClick={() => setFilterOpen(false)}
                aria-label={translateText("Close filters")}
              >
                <X className="w-5 h-5 text-[#66758A]" />
              </button>
            </div>
            <FilterPanel />
            <button
              onClick={() => setFilterOpen(false)}
              className="w-full mt-5 py-2.5 bg-[#1672DC] text-white font-semibold rounded-xl"
            >
              {translateText("Apply Filters")}</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PropertyList() {
  const { translateText } = usePreferences();

  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <PropertyListContent />
    </Suspense>
  )
}
