"use client";
import { usePreferences, useFormatters } from "@/context/PreferencesContext";


// These controls are role-gated again by the API; this only controls visibility.
/* Queue */ /* Review panel */ /* Warnings */ /* Checklist */ /* Actions */
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ClipboardList,
  List,
  BarChart3,
  LogOut,
  CheckCircle,
  XCircle,
  Eye,
  AlertTriangle,
  RefreshCw,
  Menu,
  X as CloseIcon,
  AlertCircle,
} from "lucide-react"
import { useApp } from "../../context/AppContext"

import StatusBadge from "../../components/StatusBadge"
import { adaptListing } from "../../lib/property-adapter"
import type { Property } from "../../types"

type Tab = "approvals" | "reports"

const NAV_ITEMS: {
  id: Tab
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: "approvals", label: "Approval Queue", icon: ClipboardList },
  { id: "reports", label: "Reports", icon: BarChart3 },
]

export default function AdminWorkspace() {
  const { translateText } = usePreferences();
  const { formatPrice, formatDate, formatRelativeTime } = useFormatters();

  const { user, logout, showToast } = useApp()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("approvals")
  const [queueStatus, setQueueStatus] = useState("PENDING")
  const [permissions, setPermissions] = useState<string[]>([])
  const HAS_PERMISSION = {
    LISTING_APPROVE: permissions.includes("listing.approve"),
    LISTING_REJECT: permissions.includes("listing.reject"),
    LISTING_HIDE: permissions.includes("listing.hide"),
  }
  useEffect(() => {
    if (!user) return
    let cancelled = false
    fetch("/api/admin/permissions")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load permissions.")
        const data = await response.json()
        if (!cancelled) setPermissions(data.permissions)
      })
      .catch((error) => {
        if (!cancelled) showToast(error.message, "error")
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedListing, setSelectedListing] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [showRevisionForm, setShowRevisionForm] = useState(false)
  const [showHideConfirm, setShowHideConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [actionReason, setActionReason] = useState("")
  const [staleDataWarning, setStaleDataWarning] = useState(false)
  const [pendingListings, setPendingListings] = useState<Property[]>([])
  const [queueLoading, setQueueLoading] = useState(true)
  const [queueError, setQueueError] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [actionLoading, setActionLoading] = useState(false)
  useEffect(() => {
    setShowRejectForm(false)
    setShowRevisionForm(false)
    setShowHideConfirm(false)
    setActionReason("")
    setRejectReason("")
  }, [selectedListing])

  useEffect(() => {
    let cancelled = false
    setQueueLoading(true)
    setQueueError(false)
    fetch("/api/admin/listings/pending?status=" + queueStatus)
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load moderation queue")
        return response.json()
      })
      .then((data) => {
        if (!cancelled)
          setPendingListings((data.listings ?? []).map(adaptListing))
      })
      .catch(() => {
        if (!cancelled) setQueueError(true)
      })
      .finally(() => {
        if (!cancelled) setQueueLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey, queueStatus, user?.id])

  const selectedProp =
    pendingListings.find((p) => p.id === selectedListing) ?? null

  const handleNav = (id: Tab) => {
    setTab(id)
    setSidebarOpen(false)
    setSelectedListing(null)
  }

  const moderate = async (
    action: "APPROVE" | "REJECT" | "REQUEST_REVISION" | "HIDE",
    reason = "",
  ) => {
    if (!selectedListing || actionLoading) return
    setActionLoading(true)
    try {
      const response = await fetch(
        `/api/admin/listings/${encodeURIComponent(selectedListing)}/moderate`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, reason }),
        },
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Moderation failed")
      showToast("Listing updated.", "success")
      setSelectedListing(null)
      setShowRejectForm(false)
      setShowRevisionForm(false)
      setShowHideConfirm(false)
      setActionReason("")
      setRejectReason("")
      setRefreshKey((key) => key + 1)
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Moderation failed.",
        "error",
      )
    } finally {
      setActionLoading(false)
    }
  }
  const handleApprove = () => moderate("APPROVE")
  const handleReject = () => moderate("REJECT", rejectReason)

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-[#D9E1EA]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#102B4B] text-white text-sm font-semibold flex items-center justify-center">
            {user?.firstName[0]}
          </div>
          <div>
            <div className="font-semibold text-[#10243E] text-sm">
              {user?.firstName} {user?.lastName}
            </div>
            <span className="text-xs bg-slate-100 text-[#66758A] px-2 py-0.5 rounded-full font-medium">
              {translateText("Admin")}</span>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5" aria-label={translateText("Admin navigation")}>
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleNav(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              tab === id
                ? "bg-[#102B4B] text-white font-medium"
                : "text-[#66758A] hover:bg-slate-100 hover:text-[#10243E]"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="leading-tight text-left">{translateText(label)}</span>
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

  return (
    <div className="flex min-h-[calc(100vh-64px)] bg-[#F5F8FC]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
            <div className="flex justify-end p-3 border-b border-[#D9E1EA]">
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

      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-white border-r border-[#D9E1EA]">
        <Sidebar />
      </aside>

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

        <div className="px-4 pt-4 flex gap-2">
          <button
            onClick={() => {
              setQueueStatus("PENDING")
              setSelectedListing(null)
            }}
            aria-pressed={queueStatus === "PENDING"}
            className="px-3 py-2 border rounded-lg"
          >
            {translateText("Pending review")}</button>
          <button
            onClick={() => {
              setQueueStatus("APPROVED")
              setSelectedListing(null)
            }}
            aria-pressed={queueStatus === "APPROVED"}
            className="px-3 py-2 border rounded-lg"
          >
            {translateText("Published listings")}</button>
        </div>
        <div className="p-4 lg:p-6 space-y-5">
          {tab === "approvals" && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              {}
              <div className="lg:col-span-2 space-y-3">
                <div className="bg-white rounded-xl border border-[#D9E1EA] overflow-hidden">
                  <div className="p-4 border-b border-[#D9E1EA] bg-amber-50">
                    <h2 className="font-semibold text-[#10243E]">
                      {translateText("Review Queue")}</h2>
                    <p className="text-xs text-amber-700 mt-0.5 font-medium">
                      {pendingListings.length} {translateText("listing")}{pendingListings.length !== 1 ? translateText("s") : ""} {translateText("awaiting review")}</p>
                  </div>
                  <div className="divide-y divide-[#D9E1EA]">
                    {queueLoading ? (
                      <div
                        className="py-12 text-center text-sm text-[#66758A]"
                        role="status"
                      >
                        Loading review queueâ€¦
                      </div>
                    ) : queueError ? (
                      <div
                        className="py-12 text-center text-sm text-red-600"
                        role="alert"
                      >
                        Unable to load review queue.
                      </div>
                    ) : pendingListings.length === 0 ? (
                      <div className="py-12 text-center">
                        <CheckCircle
                          className="w-10 h-10 text-emerald-200 mx-auto mb-3"
                          aria-hidden="true"
                        />
                        <p className="text-sm text-[#66758A]">
                          All listings reviewed.
                        </p>
                      </div>
                    ) : (
                      pendingListings.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSelectedListing(p.id)
                            setShowRejectForm(false)
                            setShowRevisionForm(false)
                          }}
                          className={`w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-slate-50 ${
                            selectedListing === p.id
                              ? "bg-blue-50 border-l-4 border-[#1672DC]"
                              : "border-l-4 border-transparent"
                          }`}
                        >
                          <img
                            src={p.coverImage}
                            alt=""
                            className="w-14 h-11 rounded-lg object-cover bg-slate-100 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-[#10243E] truncate">
                              {p.title}
                            </div>
                            <div className="text-xs text-[#66758A] mt-0.5">
                              {p.reference}
                            </div>
                            <div className="text-xs text-[#66758A]">
                              {p.sellerName} Â· {formatPrice(p.price)}
                            </div>
                            <div className="text-xs text-[#66758A] mt-1">
                              Submitted {formatRelativeTime(p.updatedAt)}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {}
              <div className="lg:col-span-3">
                {!selectedProp ? (
                  <div className="bg-white rounded-xl border border-[#D9E1EA] p-12 text-center text-[#66758A]">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Eye
                        className="w-7 h-7 text-slate-300"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="font-medium text-[#10243E] mb-1">
                      No listing selected
                    </p>
                    <p className="text-sm">
                      Select a listing from the queue to begin your review.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-[#D9E1EA] overflow-hidden">
                    {}

                    {staleDataWarning && (
                      <div
                        className="flex items-center justify-between gap-3 px-4 py-3 bg-red-50 border-b border-red-200 text-red-800 text-sm"
                        role="alert"
                      >
                        <div className="flex items-center gap-2">
                          <AlertCircle
                            className="w-4 h-4 shrink-0 text-red-500"
                            aria-hidden="true"
                          />
                          <span>
                            This listing has been updated. Refresh before taking
                            another action.
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setStaleDataWarning(false)}
                            className="flex items-center gap-1.5 text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700"
                          >
                            <RefreshCw className="w-3 h-3" aria-hidden="true" />{" "}
                            Refresh
                          </button>
                          <button
                            onClick={() => setStaleDataWarning(false)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="p-5 space-y-5">
                      <img
                        src={selectedProp.coverImage}
                        alt={selectedProp.title}
                        className="w-full h-52 object-cover rounded-xl bg-slate-100"
                      />
                      <div>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <StatusBadge status={selectedProp.status} />
                          <span className="text-xs font-mono text-[#66758A] bg-slate-100 px-2 py-0.5 rounded">
                            {selectedProp.reference}
                          </span>
                        </div>
                        <h2 className="text-lg font-bold text-[#10243E] leading-tight">
                          {selectedProp.title}
                        </h2>
                        <p className="text-sm text-[#66758A] mt-0.5">
                          {selectedProp.location.displayAddress} Â·{" "}
                          {selectedProp.category}
                        </p>
                        <p className="text-2xl font-bold text-[#1672DC] mt-2">
                          {formatPrice(selectedProp.price)}
                        </p>
                      </div>

                      <dl className="grid grid-cols-2 gap-3 text-sm bg-slate-50 rounded-lg p-3 border border-[#D9E1EA]">
                        <div>
                          <dt className="text-xs text-[#66758A] font-medium">
                            Seller
                          </dt>
                          <dd className="font-semibold text-[#10243E]">
                            {selectedProp.sellerName}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-[#66758A] font-medium">
                            Submitted
                          </dt>
                          <dd className="font-semibold text-[#10243E]">
                            {formatDate(selectedProp.updatedAt)}
                          </dd>
                        </div>
                        {selectedProp.bedrooms !== undefined && (
                          <div>
                            <dt className="text-xs text-[#66758A] font-medium">
                              Bedrooms
                            </dt>
                            <dd className="font-semibold text-[#10243E]">
                              {selectedProp.bedrooms}
                            </dd>
                          </div>
                        )}
                        {selectedProp.usableArea && (
                          <div>
                            <dt className="text-xs text-[#66758A] font-medium">
                              Area
                            </dt>
                            <dd className="font-semibold text-[#10243E]">
                              {selectedProp.usableArea} mÂ²
                            </dd>
                          </div>
                        )}
                      </dl>

                      {}
                      <div className="bg-[#F5F8FC] rounded-lg p-4 border border-[#D9E1EA]">
                        <h3 className="text-sm font-semibold text-[#10243E] mb-3">
                          Required Data Checklist
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            ["Title", !!selectedProp.title],
                            ["Description", !!selectedProp.description],
                            ["Price > 0", selectedProp.price > 0],
                            ["Category", !!selectedProp.category],
                            ["Location", !!selectedProp.location],
                            ["Seller", !!selectedProp.sellerName],
                            ["Photos", selectedProp.images.length > 0],
                          ].map(([label, ok]) => (
                            <div
                              key={label as string}
                              className="flex items-center gap-2"
                            >
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 font-bold ${
                                  ok
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                                aria-hidden="true"
                              >
                                {ok ? "âœ“" : "âœ—"}
                              </span>
                              <span
                                className={`text-sm ${
                                  ok
                                    ? "text-[#10243E]"
                                    : "text-red-600 font-medium"
                                }`}
                              >
                                {label as string}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {}
                      {!showRejectForm &&
                        !showRevisionForm &&
                        !showHideConfirm && (
                          <div className="border-t border-[#D9E1EA] pt-4">
                            <p className="text-xs text-[#66758A] font-medium mb-3 uppercase tracking-wide">
                              Review Actions
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {queueStatus === "PENDING" &&
                                HAS_PERMISSION.LISTING_APPROVE && (
                                  <button
                                    onClick={handleApprove}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
                                  >
                                    <CheckCircle
                                      className="w-4 h-4"
                                      aria-hidden="true"
                                    />
                                    Approve
                                  </button>
                                )}
                              {queueStatus === "PENDING" &&
                                HAS_PERMISSION.LISTING_REJECT && (
                                  <button
                                    onClick={() => setShowRejectForm(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors"
                                  >
                                    <XCircle
                                      className="w-4 h-4"
                                      aria-hidden="true"
                                    />
                                    Reject
                                  </button>
                                )}
                              {queueStatus === "PENDING" &&
                                permissions.includes(
                                  "listing.request_revision",
                                ) && (
                                  <button
                                    onClick={() => setShowRevisionForm(true)}
                                    className="flex items-center gap-2 px-4 py-2 border border-amber-300 text-amber-700 text-sm font-semibold rounded-xl hover:bg-amber-50 transition-colors"
                                  >
                                    <AlertTriangle
                                      className="w-4 h-4"
                                      aria-hidden="true"
                                    />
                                    Needs Revision
                                  </button>
                                )}
                            </div>
                            <div className="flex gap-2 mt-2">
                              {queueStatus === "APPROVED" &&
                                HAS_PERMISSION.LISTING_HIDE && (
                                  <button
                                    onClick={() => setShowHideConfirm(true)}
                                    className="flex items-center gap-1.5 px-3 py-2 border border-[#D9E1EA] text-[#66758A] text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors"
                                  >
                                    <Eye
                                      className="w-3.5 h-3.5"
                                      aria-hidden="true"
                                    />{" "}
                                    Hide
                                  </button>
                                )}
                              <button
                                onClick={() => setRefreshKey((key) => key + 1)}
                                className="flex items-center gap-1.5 px-3 py-2 border border-[#D9E1EA] text-[#66758A] text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors"
                              >
                                <RefreshCw
                                  className="w-3.5 h-3.5"
                                  aria-hidden="true"
                                />{" "}
                                Refresh
                              </button>
                            </div>
                          </div>
                        )}

                      {showRejectForm && (
                        <div className="pt-2 border-t border-[#D9E1EA]">
                          <h3 className="text-sm font-semibold text-[#10243E] mb-2 flex items-center gap-1.5">
                            <XCircle
                              className="w-4 h-4 text-red-500"
                              aria-hidden="true"
                            />
                            Rejection Reason{" "}
                            <span className="text-red-500">*</span>
                          </h3>
                          <p className="text-xs text-[#66758A] mb-2">
                            This message will be sent to the seller.
                          </p>
                          <textarea
                            rows={3}
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Provide a clear reason for rejection so the seller can improve their listing..."
                            className="w-full px-3 py-2 border border-[#D9E1EA] rounded-lg text-sm focus:outline-none focus:border-[#E5484D] focus:ring-2 focus:ring-red-100 resize-none"
                          />
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => setShowRejectForm(false)}
                              className="flex-1 py-2.5 border border-[#D9E1EA] text-[#10243E] text-sm rounded-xl hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleReject}
                              className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700"
                            >
                              Confirm Rejection
                            </button>
                          </div>
                        </div>
                      )}

                      {showRevisionForm && (
                        <div className="pt-2 border-t border-[#D9E1EA]">
                          <h3 className="text-sm font-semibold text-[#10243E] mb-2 flex items-center gap-1.5">
                            <AlertTriangle
                              className="w-4 h-4 text-amber-500"
                              aria-hidden="true"
                            />
                            Revision Instructions{" "}
                            <span className="text-red-500">*</span>
                          </h3>
                          <p className="text-xs text-[#66758A] mb-2">
                            Describe exactly what the seller needs to fix or
                            improve.
                          </p>
                          <textarea
                            value={actionReason}
                            onChange={(event) =>
                              setActionReason(event.target.value)
                            }
                            rows={3}
                            placeholder="e.g. Please add more interior photos. The price seems unusually high â€” please add justification in the description."
                            className="w-full px-3 py-2 border border-[#D9E1EA] rounded-lg text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-50 resize-none"
                          />
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => setShowRevisionForm(false)}
                              className="flex-1 py-2.5 border border-[#D9E1EA] text-[#10243E] text-sm rounded-xl hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                            <button
                              disabled={actionLoading}
                              onClick={() =>
                                moderate("REQUEST_REVISION", actionReason)
                              }
                              className="flex-1 py-2.5 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600"
                            >
                              Send to Seller
                            </button>
                          </div>
                        </div>
                      )}

                      {showHideConfirm && (
                        <div className="pt-2 border-t border-[#D9E1EA]">
                          <h3 className="text-sm font-semibold text-[#10243E] mb-2">
                            Hide Reason <span className="text-red-500">*</span>
                          </h3>
                          <textarea
                            rows={2}
                            value={actionReason}
                            onChange={(e) => setActionReason(e.target.value)}
                            placeholder="Reason for hiding this listing..."
                            className="w-full px-3 py-2 border border-[#D9E1EA] rounded-lg text-sm focus:outline-none focus:border-[#1672DC] resize-none"
                          />
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => setShowHideConfirm(false)}
                              className="flex-1 py-2.5 border border-[#D9E1EA] text-sm rounded-xl hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                if (!actionReason.trim())
                                  return showToast("Reason required.", "error")
                                void moderate("HIDE", actionReason)
                              }}
                              className="flex-1 py-2.5 bg-slate-700 text-white text-sm font-semibold rounded-xl hover:bg-slate-800"
                            >
                              Confirm Hide
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "reports" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  {
                    label: "Pending Review",
                    count: pendingListings.length,
                    color: "text-amber-600",
                    bg: "bg-amber-50",
                    icon: ClipboardList,
                  },
                ].map(({ label, count, color, bg, icon: Icon }) => (
                  <div
                    key={label}
                    className="bg-white rounded-xl border border-[#D9E1EA] p-4 text-center"
                  >
                    <div
                      className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mx-auto mb-2`}
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

              <div className="bg-white rounded-xl border border-[#D9E1EA] p-5">
                <h2 className="font-semibold text-[#10243E] mb-4">
                  {translateText("Recent Admin Actions")}</h2>
                <div className="space-y-2.5">
                  <p className="text-sm text-[#66758A]">
                    {translateText("Audit activity is not available from the current API.")}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
