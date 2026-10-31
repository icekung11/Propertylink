"use client";
import { usePreferences, useFormatters } from "@/context/PreferencesContext";

// Form states for Create Listing
/* Mobile sidebar overlay */ /* Desktop sidebar */ /* Main content */ /* Status guide */ /* Delete confirm modal */ /* Timeline modal */ /* OTP Verification modal */
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  LayoutDashboard,
  List,
  PlusCircle,
  MessageSquare,
  User,
  Settings,
  LogOut,
  Eye,
  Edit,
  Trash2,
  Send,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  TrendingUp,
  ChevronRight,
  BarChart3,
  Menu,
  X as CloseIcon,
  ArrowRight,
  Phone,
} from "lucide-react"
import { useApp } from "../../context/AppContext"

import StatusBadge from "../../components/StatusBadge"
import InquiryList from "../../components/InquiryList"
import ListingEditor from "@/components/ListingEditor"
import PasswordForm from "@/components/PasswordForm"
import type { ListingStatus } from "../../types"
import { adaptListing } from "../../lib/property-adapter"
import type { Property } from "../../types"

type Tab = "dashboard" | "listings" | "inquiries" | "create" | "profile" | "settings"

const TABS: Tab[] = [
  "dashboard",
  "listings",
  "inquiries",
  "create",
  "profile",
  "settings",
]

const CATEGORIES = [
  "Detached House",
  "Condominium",
  "Townhouse",
  "Vacant Land",
  "Commercial Building",
]

const STEPPER_STEPS = ["Basic Info", "Location", "Photos", "Features", "Review"]

function SellerWorkspaceContent() {
  const { translateText } = usePreferences();
  const { formatDate, formatPrice } = useFormatters();

  const { user, logout, showToast, inquiries, updateProfileName } = useApp()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get("tab") as Tab | null
    return t &&
      TABS.includes(t)
      ? t
      : "dashboard"
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [createStep, setCreateStep] = useState(0)
  const [editingListing, setEditingListing] = useState<string | null>(null)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [attachedPhotos, setAttachedPhotos] = useState(0)
  const [timeline, setTimeline] = useState<Array<{
    id: string
    to_status: string
    created_at: string
  }>>([])
  const [timelineError, setTimelineError] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [viewTimeline, setViewTimeline] = useState<string | null>(null)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [showOTPModal, setShowOTPModal] = useState(false)
  const [otpValue, setOtpValue] = useState("")
  const [otpError, setOtpError] = useState("")
  const [pendingSubmit, setPendingSubmit] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [createdListingId, setCreatedListingId] = useState<string | null>(null)
  const [profile, setProfile] = useState({ firstName: "", lastName: "" })
  const [myListings, setMyListings] = useState<Property[]>([])
  const [listingsLoading, setListingsLoading] = useState(false)
  const [listingsError, setListingsError] = useState(false)
  const [listingsRefreshKey, setListingsRefreshKey] = useState(0)
  const [categoryOptions, setCategoryOptions] = useState<Array<{
    id: number
    name: string
  }>>([])
  const [locationOptions, setLocationOptions] = useState<Array<{
    id: number
    name: string
  }>>([])

  useEffect(() => {
    if (user) setProfile({ firstName: user.firstName, lastName: user.lastName })
  }, [user?.id, user?.firstName, user?.lastName])

  const saveProfile = async () => {
    try {
      const response = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      })
      const data = await response.json()
      if (!response.ok)
        throw new Error(
          data.error ||
            "Unable to update profile",
        )
      updateProfileName(data.user.firstName, data.user.lastName)
      showToast("Profile updated.", "success")
    } catch (error) {
      showToast(
        error instanceof
          Error
          ? error.message
          : "Unable to update profile.",
        "error",
      )
    }
  }

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setListingsLoading(true)
    setListingsError(false)
    fetch("/api/seller/listings?limit=100")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load seller listings")
        return response.json()
      })
      .then((data) => {
        if (!cancelled)
          setMyListings(
            (
              data.listings ??
              []
            ).map(adaptListing),
          )
      })
      .catch(() => {
        if (!cancelled) setListingsError(true)
      })
      .finally(() => {
        if (!cancelled) setListingsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id, listingsRefreshKey])

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
      .then(([categories, locations]) => {
        setCategoryOptions(
          categories.categories ??
            [],
        )
        setLocationOptions(
          locations.locations ??
            [],
        )
      })
      .catch(() => {
        setCategoryOptions([])
        setLocationOptions([])
      })
  }, [])
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Single house",
    price: "",
    bedrooms: "3",
    bathrooms: "2",
    parking: "1",
    usableArea: "",
    landArea: "",
    country: "Thailand",
    province: "Bangkok",
    district: "Bang Na",
    subdistrict: "Bang Na",
    postalCode: "10260",
    images: [] as string[],
  })

  const updateForm = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const myInquiries = inquiries.filter((i) => i.sellerId === user?.id)
  const newInquiryCount = myInquiries.filter((i) => i.status === "NEW").length
  const selectedCategoryId = categoryOptions.find(
    (category) => category.name === formData.category,
  )?.id
  const selectedLocationId = locationOptions.find(
    (location) =>
      location.name.toLowerCase() === formData.province.toLowerCase(),
  )?.id

  const submitExistingListing = async (id: string) => {
    try {
      const response = await fetch(
        `/api/listings/${encodeURIComponent(id)}/submit`,
        { method: "PUT" },
      )
      const data = await response.json()
      if (!response.ok)
        throw new Error(data.error || "Unable to submit listing")
      showToast("Listing submitted for review.", "success")
      setListingsRefreshKey((value) => value + 1)
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to submit listing.",
        "error",
      )
    }
  }

  const markListingSold = async (id: string) => {
    try {
      const response = await fetch(
        `/api/seller/listings/${encodeURIComponent(id)}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "SOLD" }),
        },
      )
      const data = await response.json()
      if (!response.ok)
        throw new Error(data.error || "Unable to update listing")
      showToast("Listing marked as sold.", "success")
      setListingsRefreshKey((value) => value + 1)
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to update listing.",
        "error",
      )
    }
  }

  const statusCounts = myListings.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1
      return acc
    },
    {} as Record<ListingStatus, number>,
  )

  const DASH_CARDS = [
    {
      label: "Draft",
      count: statusCounts["DRAFT"] || 0,
      icon: FileText,
      color: "text-slate-500",
      bg: "bg-slate-50",
    },
    {
      label: "Pending",
      count: statusCounts["PENDING"] || 0,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Approved",
      count: statusCounts["APPROVED"] || 0,
      icon: CheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Rejected",
      count: statusCounts["REJECTED"] || 0,
      icon: XCircle,
      color: "text-red-500",
      bg: "bg-red-50",
    },
    {
      label: "Inquiries",
      count: myInquiries.length,
      icon: MessageSquare,
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
    {
      label: "Total Views",
      count: "Not tracked",
      icon: TrendingUp,
      color: "text-purple-500",
      bg: "bg-purple-50",
    },
  ]

  const NAV_ITEMS: {
    id: Tab
    label: string
    icon: React.ComponentType<{ className?: string }>
  }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "listings", label: "My Listings", icon: List },
    { id: "inquiries", label: "Inquiries", icon: MessageSquare },
    { id: "create", label: "Create Listing", icon: PlusCircle },
  ]

  const handleNav = (id: Tab) => {
    setTab(id)
    setSidebarOpen(false)
  }

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-[#D9E1EA]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1672DC] text-white font-semibold flex items-center justify-center text-sm">
            {user?.firstName[0]}
            {user?.lastName[0]}
          </div>
          <div>
            <div className="font-semibold text-[#10243E] text-sm">
              {user?.firstName} {user?.lastName}
            </div>
            <span className="text-xs bg-blue-50 text-[#1672DC] px-2 py-0.5 rounded-full font-medium">
              {translateText("Seller")}</span>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5" aria-label={translateText("Seller navigation")}>
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleNav(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              tab === id
                ? "bg-[#1672DC] text-white"
                : "text-[#66758A] hover:bg-slate-100 hover:text-[#10243E]"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
            {translateText(label)}
            {id === "inquiries" && newInquiryCount > 0 && (
              <span
                className={`ml-auto min-w-5 h-5 px-1.5 rounded-full text-[11px] font-semibold flex items-center justify-center ${
                  tab === id
                    ? "bg-white text-[#1672DC]"
                    : "bg-[#E5484D] text-white"
                }`}
              >
                {newInquiryCount}
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-[#D9E1EA]">
        <button
          onClick={() => {
            logout()
            router.push("/")
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          {translateText("Logout")}</button>
      </div>
    </div>
  )

  useEffect(() => {
    if (!viewTimeline) return
    let cancelled = false
    setTimeline([])
    setTimelineError("")
    fetch("/api/seller/listings/" + viewTimeline)
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)
        if (!cancelled) setTimeline(data.listing.listing_status_history)
      })
      .catch((error) => {
        if (!cancelled) setTimelineError(error.message)
      })
    return () => {
      cancelled = true
    }
  }, [viewTimeline])

  const saveListing = async (submit: boolean) => {
    if (submitting) return
    if (
      !formData.title.trim() ||
      !formData.price ||
      !selectedCategoryId ||
      !selectedLocationId
    ) {
      showToast("Enter a title, valid price, category and location.", "error")
      return
    }
    if (submit && photoFiles.length + attachedPhotos < 3) {
      showToast("Add at least 3 photos before submitting.", "error")
      return
    }
    setSubmitting(true)
    try {
      const body = {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        categoryId: selectedCategoryId,
        locationId: selectedLocationId,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        landAreaSqwa: formData.landArea,
        usableAreaSqm: formData.usableArea,
      }
      const response = await fetch(
        createdListingId
          ? "/api/seller/listings/" + createdListingId
          : "/api/listings",
        {
          method: createdListingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            Object.fromEntries(
              Object.entries(body).filter(([, v]) => v !== ""),
            ),
          ),
        },
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      const id = data.listing.id
      setCreatedListingId(id)
      if (photoFiles.length) {
        const photos = new FormData()
        photoFiles.forEach((file) => photos.append("files", file))
        const uploaded = await fetch("/api/listings/" + id + "/images", {
          method: "POST",
          body: photos,
        })
        const result = await uploaded.json()
        if (!uploaded.ok) throw new Error(result.error)
        setAttachedPhotos(result.totalImages)
        setPhotoFiles([])
      }
      if (submit) {
        const submitted = await fetch("/api/listings/" + id + "/submit", {
          method: "PUT",
        })
        const result = await submitted.json()
        if (!submitted.ok) throw new Error(result.error)
      }
      showToast(submit ? "Listing submitted for review." : "Draft saved.")
      setListingsRefreshKey((value) => value + 1)
      setTab("listings")
      setCreatedListingId(null)
      setAttachedPhotos(0)
      setPhotoFiles([])
      setCreateStep(0)
      setFormData((previous) => ({
        ...previous,
        title: "",
        description: "",
        price: "",
        images: [],
      }))
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to save listing.",
        "error",
      )
    } finally {
      setSubmitting(false)
    }
  }

  const getListingActions = (status: ListingStatus, id: string) => {
    const btn = (
      label: string,
      Icon: React.ComponentType<{ className?: string }>,
      onClick: () => void,
      cls = "",
    ) => (
      <button
        key={label}
        onClick={onClick}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${cls || "border-[#D9E1EA] text-[#10243E] hover:border-[#1672DC] hover:text-[#1672DC]"}`}
      >
        <Icon className="w-3.5 h-3.5" aria-hidden="true" />
        {translateText(label)}
      </button>
    )
    const actions = []
    if (["DRAFT", "REVISION_REQUIRED"].includes(status)) {
      actions.push(btn("Edit", Edit, () => setEditingListing(id)))
    }
    if (["DRAFT", "REVISION_REQUIRED"].includes(status)) {
      actions.push(btn("Submit", Send, () => submitExistingListing(id)))
    }
    if (
      [
        "APPROVED",
        "PENDING",
        "DRAFT",
        "REVISION_REQUIRED",
        "REJECTED",
        "SOLD",
        "CLOSED",
        "HIDDEN",
      ].includes(status)
    ) {
      actions.push(btn("View", Eye, () => router.push(`/properties/${id}`)))
    }
    if (status === "DRAFT") {
      actions.push(
        btn(
          "Delete",
          Trash2,
          () => setConfirmDelete(id),
          "border-red-200 text-red-600 hover:bg-red-50",
        ),
      )
    }
    if (status === "APPROVED") {
      actions.push(btn("Mark Sold", CheckCircle, () => markListingSold(id)))
    }
    actions.push(btn("Timeline", BarChart3, () => setViewTimeline(id)))
    return actions
  }

  const renderCreateStepper = () => (
    <div>
      <div className="mb-6">
        <nav
          aria-label={translateText("Create listing steps")}
          className="flex items-center gap-1 overflow-x-auto"
        >
          {STEPPER_STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setCreateStep(i)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  i === createStep
                    ? "bg-[#1672DC] text-white"
                    : i < createStep
                      ? "text-[#18A66A] bg-emerald-50"
                      : "text-[#66758A] hover:bg-slate-100"
                }`}
                aria-current={i === createStep ? "step" : undefined}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === createStep
                      ? "bg-white text-[#1672DC]"
                      : i < createStep
                        ? "bg-[#18A66A] text-white"
                        : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {i < createStep ? "✓" : i + 1}
                </span>
                {translateText(step)}
              </button>
              {i < STEPPER_STEPS.length - 1 && (
                <ChevronRight
                  className="w-3.5 h-3.5 text-slate-300 shrink-0"
                  aria-hidden="true"
                />
              )}
            </div>
          ))}
        </nav>
      </div>

      {createStep === 0 && (
        <div className="bg-white rounded-xl border border-[#D9E1EA] p-6 space-y-5">
          <h2 className="font-semibold text-[#10243E]">{translateText("Basic Information")}</h2>
          <div>
            <label className="block text-sm font-medium text-[#10243E] mb-1.5">
              {translateText("Property Title")}<span className="text-red-500">*</span>
            </label>
            <input
              value={formData.title}
              onChange={(e) => updateForm("title", e.target.value)}
              className="w-full px-3.5 py-2.5 border border-[#D9E1EA] rounded-lg text-sm focus:outline-none focus:border-[#1672DC] focus:ring-2 focus:ring-[#1672DC]/20"
              placeholder={translateText("e.g. Modern Family House")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#10243E] mb-1.5">
              {translateText("Description")}<span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => updateForm("description", e.target.value)}
              className="w-full px-3.5 py-2.5 border border-[#D9E1EA] rounded-lg text-sm focus:outline-none focus:border-[#1672DC] focus:ring-2 focus:ring-[#1672DC]/20 resize-none"
              placeholder={translateText("Describe the property...")}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#10243E] mb-1.5">
                {translateText("Category")}<span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => updateForm("category", e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#D9E1EA] rounded-lg text-sm focus:outline-none focus:border-[#1672DC] bg-white"
              >
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#10243E] mb-1.5">
                {translateText("Price (THB)")}<span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={formData.price}
                onChange={(e) => updateForm("price", e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#D9E1EA] rounded-lg text-sm focus:outline-none focus:border-[#1672DC]"
                placeholder={translateText("0")}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#10243E] mb-1.5">
                {translateText("Bedrooms")}</label>
              <input
                type="number"
                min="0"
                value={formData.bedrooms}
                onChange={(e) => updateForm("bedrooms", e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#D9E1EA] rounded-lg text-sm focus:outline-none focus:border-[#1672DC]"
                placeholder={translateText("0")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#10243E] mb-1.5">
                {translateText("Bathrooms")}</label>
              <input
                type="number"
                min="0"
                value={formData.bathrooms}
                onChange={(e) => updateForm("bathrooms", e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#D9E1EA] rounded-lg text-sm focus:outline-none focus:border-[#1672DC]"
                placeholder={translateText("0")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#10243E] mb-1.5">
                {translateText("Parking")}</label>
              <input
                type="number"
                min="0"
                value={formData.parking}
                onChange={(e) => updateForm("parking", e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#D9E1EA] rounded-lg text-sm focus:outline-none focus:border-[#1672DC]"
                placeholder={translateText("0")}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#10243E] mb-1.5">
                {translateText("Usable Area (m²)")}</label>
              <input
                type="number"
                min="0"
                value={formData.usableArea}
                onChange={(e) => updateForm("usableArea", e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#D9E1EA] rounded-lg text-sm focus:outline-none focus:border-[#1672DC]"
                placeholder={translateText("0")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#10243E] mb-1.5">
                {translateText("Land Area (m²)")}</label>
              <input
                type="number"
                min="0"
                value={formData.landArea}
                onChange={(e) => updateForm("landArea", e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#D9E1EA] rounded-lg text-sm focus:outline-none focus:border-[#1672DC]"
                placeholder={translateText("0")}
              />
            </div>
          </div>
        </div>
      )}

      {createStep === 1 && (
        <div className="bg-white rounded-xl border border-[#D9E1EA] p-6 space-y-5">
          <h2 className="font-semibold text-[#10243E]">{translateText("Location")}</h2>
          {([
            "Country",
            "Province",
            "District",
            "Subdistrict",
            "Postal Code",
          ] as const).map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-[#10243E] mb-1.5">
                {translateText(field)}{" "}
                {field !== "Postal Code" ? (
                  <span className="text-red-500">*</span>
                ) : null}
              </label>
              {field === "Country" ? (
                <select className="w-full px-3.5 py-2.5 border border-[#D9E1EA] rounded-lg text-sm focus:outline-none focus:border-[#1672DC] bg-white">
                  <option>Thailand</option>
                </select>
              ) : (
                <input
                  className="w-full px-3.5 py-2.5 border border-[#D9E1EA] rounded-lg text-sm focus:outline-none focus:border-[#1672DC]"
                  placeholder={`Enter ${field.toLowerCase()}`}
                />
              )}
            </div>
          ))}
          <div className="bg-slate-100 rounded-lg h-40 flex items-center justify-center text-[#66758A] text-sm">
            {translateText("Optional: Drop a map pin for coordinates")}</div>
        </div>
      )}

      {createStep === 2 && (
        <div className="bg-white rounded-xl border border-[#D9E1EA] p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-[#10243E]">{translateText("Photos")}</h2>
            <p className="text-sm text-[#66758A] mt-1">
              {translateText("Upload 3–15 photos. The")}<strong>{translateText("first photo")}</strong> {translateText("will be used as the cover image. JPEG, PNG, WebP — max 10 MB each.")}</p>
          </div>
          <label
            htmlFor="photo-upload"
            className="flex flex-col items-center justify-center border-2 border-dashed border-[#D9E1EA] rounded-xl p-10 text-center cursor-pointer hover:border-[#1672DC]"
          >
            <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
              <PlusCircle
                className="w-7 h-7 text-[#1672DC]"
                aria-hidden="true"
              />
            </div>
            <p className="text-sm font-semibold text-[#10243E] mb-1">
              {translateText("Choose photos")}</p>
            <p className="text-xs text-[#66758A]">
              {translateText("JPEG, PNG or WebP, up to 10 MB each.")}</p>
            <input
              id="photo-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={submitting}
              className="sr-only"
              onChange={(event) => {
                const files = Array.from(event.target.files || [])
                if (
                  files.length + photoFiles.length + attachedPhotos > 15 ||
                  files.some((file) => file.size > 10 * 1024 * 1024)
                ) {
                  showToast("Maximum 15 photos, 10 MB each.", "error")
                  return
                }
                setPhotoFiles((previous) => [...previous, ...files])
                event.target.value = ""
              }}
            />
          </label>
          <div className="space-y-2">
            {photoFiles.map((file, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>{file.name}</span>
                <button
                  disabled={submitting}
                  onClick={() =>
                    setPhotoFiles((files) =>
                      files.filter((_, i) => i !== index),
                    )
                  }
                >
                  {translateText("Remove")}</button>
              </div>
            ))}
            {attachedPhotos > 0 && (
              <p className="text-sm">
                {attachedPhotos} {translateText("photos already uploaded.")}</p>
            )}
          </div>
          <div className="bg-[#F5F8FC] rounded-lg p-3 border border-[#D9E1EA] text-xs text-[#66758A] space-y-1.5">
            <p className="flex items-center gap-1.5">
              <CheckCircle
                className="w-3.5 h-3.5 text-[#18A66A]"
                aria-hidden="true"
              />
              {translateText("The first photo becomes the cover image shown in search results.")}</p>
            <p className="flex items-center gap-1.5">
              <CheckCircle
                className="w-3.5 h-3.5 text-[#18A66A]"
                aria-hidden="true"
              />
              {translateText("Select photos in the order you want them displayed.")}</p>
          </div>
          <p className="text-xs text-amber-700 flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {translateText("Listing submission requires 3–15 photos. Storage must be configured first.")}</p>
        </div>
      )}

      {createStep === 3 && (
        <div className="bg-white rounded-xl border border-[#D9E1EA] p-6 space-y-5">
          <h2 className="font-semibold text-[#10243E]">{translateText("Features & Amenities")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              "Private Pool",
              "Garden",
              "Gym",
              "Parking",
              "Security",
              "Air Conditioning",
              "Near BTS",
              "Near MRT",
              "Pet Friendly",
              "Furnished",
              "Smart Home",
              "Solar Panels",
            ].map((f) => (
              <label
                key={f}
                className="flex items-center gap-2.5 cursor-pointer p-2.5 rounded-lg border border-[#D9E1EA] hover:border-[#1672DC] transition-colors"
              >
                <input type="checkbox" className="accent-[#1672DC]" />
                <span className="text-sm text-[#10243E]">{translateText(f)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {createStep === 4 && (
        <div className="bg-white rounded-xl border border-[#D9E1EA] p-6 space-y-4">
          <h2 className="font-semibold text-[#10243E]">{translateText("Review & Publish")}</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 text-sm text-amber-800">
            <AlertCircle
              className="w-4 h-4 mt-0.5 shrink-0 text-amber-500"
              aria-hidden="true"
            />
            <div>
              {translateText("Review your listing before submitting. All required fields must be complete. Your listing reference will be assigned automatically upon submission.")}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#66758A]">{translateText("Reference")}</span>
              <span className="font-mono text-[#10243E]">
                {translateText("PROP-2026-XXXXXX (auto)")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#66758A]">{translateText("Status after submit")}</span>
              <span className="text-amber-600 font-medium">{translateText("Pending Review")}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              disabled={submitting}
              onClick={() => saveListing(false)}
              className="flex-1 py-2.5 border border-[#D9E1EA] text-[#10243E] text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {submitting ? "กำลังบันทึก..." : translateText("Save as Draft")}
            </button>
            <button
              disabled={submitting}
              onClick={() => saveListing(true)}
              className="flex-1 py-2.5 bg-[#1672DC] text-white text-sm font-semibold rounded-xl hover:bg-[#125BB8] transition-colors disabled:opacity-50"
            >
              {submitting ? "กำลังส่งตรวจ..." : translateText("Submit for Approval")}
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between mt-5">
        <button
          onClick={() => setCreateStep((s) => Math.max(0, s - 1))}
          disabled={createStep === 0}
          className="px-5 py-2.5 border border-[#D9E1EA] text-[#10243E] text-sm font-medium rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {translateText("Back")}</button>
        {createStep < STEPPER_STEPS.length - 1 ? (
          <button
            onClick={() =>
              setCreateStep((s) => Math.min(STEPPER_STEPS.length - 1, s + 1))
            }
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1672DC] text-white text-sm font-semibold rounded-xl hover:bg-[#125BB8] transition-colors"
          >
            Continue <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  )

  return (
    <div className="flex min-h-[calc(100vh-64px)] bg-[#F5F8FC]">
      {}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={translateText("Sidebar menu")}
        >
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
            <div className="flex items-center justify-end p-3 border-b border-[#D9E1EA]">
              <button
                onClick={() => setSidebarOpen(false)}
                aria-label={translateText("Close sidebar")}
              >
                <CloseIcon className="w-5 h-5 text-[#66758A]" />
              </button>
            </div>
            <Sidebar />
          </div>
        </div>
      )}

      {}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-white border-r border-[#D9E1EA]">
        <Sidebar />
      </aside>

      {}
      <div className="flex-1 overflow-auto">
        <div className="flex items-center gap-3 p-4 lg:p-6 border-b border-[#D9E1EA] bg-white">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label={translateText("Open menu")}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-[#66758A] hover:bg-slate-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-[#10243E]">
            {translateText(NAV_ITEMS.find((n) => n.id === tab)?.label)}
          </h1>
        </div>

        <div className="p-4 lg:p-6">
          {tab === "dashboard" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {DASH_CARDS.map(({ label, count, icon: Icon, color, bg }) => (
                  <div
                    key={label}
                    className="bg-white rounded-xl border border-[#D9E1EA] p-4 text-center cursor-pointer hover:border-[#1672DC] transition-colors"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mx-auto mb-2`}
                    >
                      <Icon className={`w-5 h-5 ${color}`} aria-hidden="true" />
                    </div>
                    <div className="text-2xl font-bold text-[#10243E]">
                      {count}
                    </div>
                    <div className="text-xs text-[#66758A] mt-0.5">{translateText(label)}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-[#D9E1EA] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-[#10243E]">
                      {translateText("Recent Listings")}</h2>
                    <button
                      onClick={() => setTab("listings")}
                      className="text-xs text-[#1672DC] hover:underline"
                    >
                      {translateText("View all")}</button>
                  </div>
                  {listingsLoading ? (
                    <div
                      className="py-8 text-center text-sm text-[#66758A]"
                      role="status"
                    >
                      Loading listings…
                    </div>
                  ) : listingsError ? (
                    <div className="py-8 text-center text-sm text-red-600">
                      Unable to load listings.
                    </div>
                  ) : myListings.length === 0 ? (
                    <div className="text-center py-8 text-[#66758A] text-sm">
                      <p className="mb-3">
                        Create your first property listing.
                      </p>
                      <button
                        onClick={() => setTab("create")}
                        className="px-4 py-2 bg-[#1672DC] text-white text-xs font-medium rounded-lg hover:bg-[#125BB8]"
                      >
                        Create Listing
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {myListings.slice(0, 3).map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <img
                            src={p.coverImage}
                            alt=""
                            className="w-12 h-10 rounded-lg object-cover bg-slate-100 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-[#10243E] truncate">
                              {p.title}
                            </div>
                            <div className="text-xs text-[#66758A]">
                              {formatPrice(p.price)}
                            </div>
                          </div>
                          <StatusBadge status={p.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-[#D9E1EA] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-[#10243E]">
                      {translateText("Recent Inquiries")}</h2>
                    {myInquiries.length > 0 && (
                      <button
                        onClick={() => setTab("inquiries")}
                        className="text-sm text-[#1672DC] font-medium hover:underline"
                      >
                        {translateText("View all")}</button>
                    )}
                  </div>
                  {myInquiries.length === 0 ? (
                    <div className="text-center py-8 text-[#66758A] text-sm">
                      No buyer inquiries yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[...myInquiries]
                        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                        .slice(0, 3)
                        .map((inq) => (
                          <div
                            key={inq.id}
                            className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50"
                          >
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-[#66758A] shrink-0">
                              {inq.buyerName[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-[#10243E]">
                                {inq.buyerName}
                              </div>
                              <div className="text-xs text-[#66758A] truncate">
                                {inq.propertyTitle}
                              </div>
                              <div className="text-xs text-[#66758A] mt-0.5">
                                {formatDate(inq.createdAt)}
                              </div>
                            </div>
                            <StatusBadge status={inq.status} />
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === "listings" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm text-[#66758A]">
                  {myListings.length} {translateText("listing")}{myListings.length !== 1 ? translateText("s") : ""}
                </p>
                <button
                  onClick={() => setTab("create")}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1672DC] text-white text-sm font-medium rounded-lg hover:bg-[#125BB8] transition-colors"
                >
                  <PlusCircle className="w-4 h-4" aria-hidden="true" />
                  {translateText("New Listing")}</button>
              </div>

              {}
              <div className="bg-[#F5F8FC] rounded-xl border border-[#D9E1EA] p-4">
                <p className="text-xs font-semibold text-[#66758A] uppercase tracking-wider mb-3">
                  {translateText("Listing Status Guide")}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {[
                    { status: "DRAFT", desc: "Saved, not yet submitted" },
                    { status: "PENDING", desc: "Under admin review" },
                    { status: "APPROVED", desc: "Live and visible to buyers" },
                    {
                      status: "REJECTED",
                      desc: "Not approved — edit & resubmit",
                    },
                    {
                      status: "REVISION_REQUIRED",
                      desc: "Admin requested changes",
                    },
                    { status: "SOLD", desc: "Property has been sold" },
                    { status: "CLOSED", desc: "Listing closed by seller" },
                    { status: "EXPIRED", desc: "Listing period has ended" },
                  ].map(({ status, desc }) => (
                    <div
                      key={status}
                      className="flex flex-col gap-1 p-2 bg-white rounded-lg border border-[#D9E1EA]"
                    >
                      <StatusBadge status={status as ListingStatus} />
                      <span className="text-[#66758A] mt-0.5 leading-snug">
                        {translateText(desc)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {listingsLoading ? (
                <div className="py-16 text-center text-[#66758A]" role="status">
                  Loading your listings…
                </div>
              ) : listingsError ? (
                <div className="py-16 text-center text-red-600">
                  Unable to load your listings. Please retry later.
                </div>
              ) : myListings.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-[#D9E1EA]">
                  <p className="text-[#66758A] text-sm mb-4">
                    Create your first property listing.
                  </p>
                  <button
                    onClick={() => setTab("create")}
                    className="px-5 py-2.5 bg-[#1672DC] text-white text-sm font-medium rounded-lg hover:bg-[#125BB8]"
                  >
                    Create Listing
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-[#D9E1EA] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" role="table">
                      <thead>
                        <tr className="border-b border-[#D9E1EA] bg-slate-50">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-[#66758A] uppercase tracking-wider">
                            Property
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-[#66758A] uppercase tracking-wider hidden md:table-cell">
                            Reference
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-[#66758A] uppercase tracking-wider hidden sm:table-cell">
                            Price
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-[#66758A] uppercase tracking-wider">
                            Status
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-[#66758A] uppercase tracking-wider hidden lg:table-cell">
                            Updated
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-[#66758A] uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D9E1EA]">
                        {myListings.map((p) => (
                          <tr
                            key={p.id}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={p.coverImage}
                                  alt=""
                                  className="w-12 h-9 rounded-lg object-cover bg-slate-100 shrink-0 hidden sm:block"
                                />
                                <div>
                                  <div className="font-medium text-[#10243E] text-xs truncate max-w-[150px]">
                                    {p.title}
                                  </div>
                                  <div className="text-xs text-[#66758A]">
                                    {p.category}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-[#66758A] font-mono hidden md:table-cell">
                              {p.reference}
                            </td>
                            <td className="px-4 py-3 text-xs font-semibold text-[#1672DC] hidden sm:table-cell">
                              {formatPrice(p.price)}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={p.status} />
                            </td>
                            <td className="px-4 py-3 text-xs text-[#66758A] hidden lg:table-cell">
                              {formatDate(p.updatedAt)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {getListingActions(p.status, p.id)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "inquiries" && (
            <InquiryList inquiries={myInquiries} role="seller" />
          )}

          {tab === "create" && renderCreateStepper()}

          {tab === "profile" && (
            <div className="max-w-lg bg-white rounded-xl border border-[#D9E1EA] p-6 space-y-5">
              <h2 className="font-semibold text-[#10243E]">{translateText("My Profile")}</h2>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#1672DC] text-white text-2xl font-bold flex items-center justify-center">
                  {user?.firstName[0]}
                </div>
                <div>
                  <div className="font-semibold text-[#10243E]">
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div className="text-sm text-[#66758A]">{user?.email}</div>
                  <StatusBadge status={user?.status ?? "ACTIVE"} />
                </div>
              </div>
              {[
                ["First Name", profile.firstName],
                ["Last Name", profile.lastName],
                ["Email", user?.email],
                ["Phone", user?.phone],
              ].map(([label, val]) => (
                <div key={label as string}>
                  <label className="block text-sm font-medium text-[#10243E] mb-1.5">
                    {label as string}
                  </label>
                  <input
                    value={val as string}
                    readOnly={label === "Email" || label === "Phone"}
                    onChange={(event) =>
                      label === "First Name"
                        ? setProfile((current) => ({
                            ...current,
                            firstName: event.target.value,
                          }))
                        : label === "Last Name"
                          ? setProfile((current) => ({
                              ...current,
                              lastName: event.target.value,
                            }))
                          : undefined
                    }
                    className="w-full px-3.5 py-2.5 border border-[#D9E1EA] rounded-lg text-sm focus:outline-none focus:border-[#1672DC]"
                  />
                </div>
              ))}
              <button
                onClick={saveProfile}
                className="px-5 py-2.5 bg-[#1672DC] text-white text-sm font-semibold rounded-lg hover:bg-[#125BB8] transition-colors"
              >
                {translateText("Save Changes")}</button>
            </div>
          )}

          {tab === "settings" && (
            <div className="max-w-lg bg-white rounded-xl border border-[#D9E1EA] p-6 space-y-4">
              <PasswordForm />
            </div>
          )}
        </div>
      </div>

      {editingListing && (
        <ListingEditor
          id={editingListing}
          onClose={() => setEditingListing(null)}
          onSaved={() => {
            setEditingListing(null)
            setListingsRefreshKey((value) => value + 1)
          }}
        />
      )}
      {}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h2 className="font-semibold text-[#10243E] mb-2">{translateText("Delete Draft")}</h2>
            <p className="text-sm text-[#66758A] mb-5">
              {translateText("Are you sure you want to delete this draft listing? This action cannot be undone.")}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 border border-[#D9E1EA] text-[#10243E] text-sm font-medium rounded-lg hover:bg-slate-50"
              >
                {translateText("Cancel")}</button>
              <button
                disabled={submitting}
                onClick={async () => {
                  if (submitting) return
                  setSubmitting(true)
                  try {
                    const response = await fetch(
                      `/api/seller/listings/${confirmDelete}`,
                      { method: "DELETE" },
                    )
                    const data = await response.json()
                    if (!response.ok) throw new Error(data.error)
                    setConfirmDelete(null)
                    setListingsRefreshKey((v) => v + 1)
                    showToast("Draft deleted.")
                  } catch (error) {
                    showToast(
                      error instanceof Error
                        ? error.message
                        : "Unable to delete draft.",
                      "error",
                    )
                  } finally {
                    setSubmitting(false)
                  }
                }}
                className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700"
              >
                {translateText("Delete")}</button>
            </div>
          </div>
        </div>
      )}

      {}
      {viewTimeline && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-[#10243E]">{translateText("Listing Timeline")}</h2>
              <button onClick={() => setViewTimeline(null)} aria-label={translateText("Close")}>
                <CloseIcon className="w-5 h-5 text-[#66758A]" />
              </button>
            </div>
            <ol className="space-y-4 relative before:content-[''] before:absolute before:left-3.5 before:top-1 before:bottom-1 before:w-px before:bg-[#D9E1EA]">
              {timelineError && (
                <li role="alert" className="text-red-600">
                  {timelineError}
                </li>
              )}
              {!timelineError && timeline.length === 0 && (
                <li>{translateText("No timeline events to display.")}</li>
              )}
              {timeline.map((event) => (
                <li key={event.id} className="pl-8">
                  <p className="text-sm font-medium">{event.to_status}</p>
                  <p className="text-xs text-[#66758A]">
                    {formatDate(event.created_at)}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {}
      {showOTPModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-label={translateText("Phone verification")}
        >
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Phone className="w-7 h-7 text-[#1672DC]" aria-hidden="true" />
              </div>
              <h2 className="font-semibold text-[#10243E] text-lg">
                {translateText("Verify Your Phone")}</h2>
              <p className="text-sm text-[#66758A] mt-1">
                {translateText("A 6-digit code has been sent to")}<strong>{user?.phone}</strong>
              </p>
            </div>
            <div className="mb-5">
              <label
                htmlFor="otp-input"
                className="block text-sm font-medium text-[#10243E] mb-2"
              >
                {translateText("Enter OTP Code")}</label>
              <input
                id="otp-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpValue}
                onChange={(e) => {
                  setOtpValue(e.target.value.replace(/\D/g, ""))
                  setOtpError("")
                }}
                placeholder={translateText("000000")}
                className="w-full px-4 py-3 border border-[#D9E1EA] rounded-xl text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-[#1672DC] focus:ring-2 focus:ring-[#1672DC]/20"
              />
              {otpError && (
                <p className="text-xs text-red-600 mt-1.5 text-center">
                  {translateText(otpError)}
                </p>
              )}
              <p className="text-xs text-amber-700 mt-2 text-center">
                {translateText("SMS verification is unavailable until an OTP provider is configured.")}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowOTPModal(false)
                  setOtpValue("")
                  setOtpError("")
                  setPendingSubmit(false)
                }}
                className="flex-1 py-2.5 border border-[#D9E1EA] text-[#10243E] text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
              >
                {translateText("Cancel")}</button>
              <button
                disabled
                className="flex-1 py-2.5 bg-[#1672DC] text-white text-sm font-semibold rounded-xl hover:bg-[#125BB8] transition-colors"
              >
                {translateText("Verification unavailable")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SellerWorkspace() {
  const { translateText } = usePreferences();
  const { formatDate, formatPrice } = useFormatters();

  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <SellerWorkspaceContent />
    </Suspense>
  )
}
