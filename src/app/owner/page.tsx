"use client";
import { usePreferences, useFormatters } from "@/context/PreferencesContext";
 /* KPIs â€” Listings */ /* KPIs â€” Users */ /* Listings by category */ /* Admin activity */ /* Recent audit timeline */
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Building2,
  Users,
  Activity,
  LogOut,
  TrendingUp,
  Eye,
  Shield,
  Menu,
  X as CloseIcon,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Clock,
  PieChart,
} from "lucide-react"
import { useApp } from "../../context/AppContext"

import StatusBadge from "../../components/StatusBadge"
import type { AdminPermission } from "../../types"
import OwnerAdminControls from "@/components/OwnerAdminControls"

type Tab = "dashboard" | "logs"

const NAV_ITEMS: {
  id: Tab
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: "dashboard", label: "Business Dashboard", icon: LayoutDashboard },
  { id: "logs", label: "Audit Logs", icon: Activity },
]

export default function OwnerDashboard() {
  const { translateText } = usePreferences();
  const { formatDate, formatRelativeTime } = useFormatters();

  const { user, logout, showToast } = useApp()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("dashboard")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showPermModal, setShowPermModal] = useState(false)
  const [dashboard, setDashboard] = useState<Record<string, any> | null>(null)
  const [admins, setAdmins] = useState<Array<{
    id: string
    name: string
    email: string
    createdAt: string
    permissions: AdminPermission[]
  }>>([])
  const [auditLogs, setAuditLogs] = useState<Array<Record<string, any>>>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [pageError, setPageError] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setPageLoading(true)
    Promise.all([
      fetch("/api/owner/dashboard").then(async (r) => {
        if (!r.ok) throw new Error()
        return r.json()
      }),
      fetch("/api/owner/admins").then(async (r) => {
        if (!r.ok) throw new Error()
        return r.json()
      }),
      fetch("/api/owner/audit-logs?limit=100").then(async (r) => {
        if (!r.ok) throw new Error()
        return r.json()
      }),
    ])
      .then(([stats, adminData, logs]) => {
        if (cancelled) return
        setDashboard(stats.dashboard)
        setAdmins(
          (adminData.admins ?? []).map((admin: any) => ({
            ...admin,
            name: `${admin.firstName} ${admin.lastName}`.trim(),
            permissions: [],
          })),
        )
        setAuditLogs(logs.logs ?? [])
      })
      .catch(() => {
        if (!cancelled) setPageError(true)
      })
      .finally(() => {
        if (!cancelled) setPageLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const approvedCount = dashboard?.approvedListings ?? 0
  const pendingCount = dashboard?.pendingListings ?? 0
  const catCounts: Record<string, number> = dashboard?.categoryCounts ?? {}

  const handleNav = (id: Tab) => {
    setTab(id)
    setSidebarOpen(false)
  }

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-[#D9E1EA]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#F4B740] text-[#102B4B] text-sm font-bold flex items-center justify-center">
            {user?.firstName[0]}
          </div>
          <div>
            <div className="font-semibold text-[#10243E] text-sm">
              {user?.firstName} {user?.lastName}
            </div>
            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              {translateText("Owner")}</span>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5" aria-label={translateText("Owner navigation")}>
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
            <span>{translateText(label)}</span>
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
          {tab === "dashboard" && (
            <button
              onClick={() => setShowPermModal(true)}
              className="ml-auto flex items-center gap-2 px-4 py-2 text-sm border border-[#D9E1EA] rounded-lg text-[#10243E] hover:border-[#1672DC] hover:text-[#1672DC] transition-colors"
            >
              <Shield className="w-4 h-4" aria-hidden="true" />
              {translateText("Manage Admins")}</button>
          )}
        </div>

        <div className="p-4 lg:p-6 space-y-6">
          {pageLoading && (
            <div className="text-sm text-[#66758A]" role="status">
              {translateText("Loading owner workspace data…")}</div>
          )}
          {pageError && (
            <div className="text-sm text-red-600" role="alert">
              {translateText("Unable to load owner workspace data. Retry when the API is available.")}</div>
          )}
          {tab === "dashboard" && (
            <>
              {}
              <div>
                <p className="text-xs font-semibold text-[#66758A] uppercase tracking-wider mb-3">
                  {translateText("Listings Overview")}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      label: "Total Listings",
                      value: dashboard?.listings ?? 0,
                      icon: Building2,
                      color: "text-blue-600",
                      bg: "bg-blue-50",
                    },
                    {
                      label: "Live",
                      value: approvedCount,
                      icon: CheckCircle,
                      color: "text-emerald-600",
                      bg: "bg-emerald-50",
                    },
                    {
                      label: "Pending Review",
                      value: pendingCount,
                      icon: Clock,
                      color: "text-amber-600",
                      bg: "bg-amber-50",
                    },
                    {
                      label: "Total Views",
                      value: "Not tracked",
                      icon: Eye,
                      color: "text-indigo-600",
                      bg: "bg-indigo-50",
                    },
                  ].map(({ label, value, icon: Icon, color, bg }) => (
                    <div
                      key={label}
                      className="bg-white rounded-xl border border-[#D9E1EA] p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div
                          className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}
                        >
                          <Icon
                            className={`w-4 h-4 ${color}`}
                            aria-hidden="true"
                          />
                        </div>
                        <TrendingUp
                          className="w-3.5 h-3.5 text-slate-300"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="text-2xl font-bold text-[#10243E]">
                        {value}
                      </div>
                      <div className="text-xs text-[#66758A] mt-0.5">
                        {translateText(label)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {}
              <div>
                <p className="text-xs font-semibold text-[#66758A] uppercase tracking-wider mb-3">
                  {translateText("User Overview")}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      label: "Buyers",
                      value: dashboard?.buyerUsers ?? 0,
                      icon: Users,
                      color: "text-purple-600",
                      bg: "bg-purple-50",
                    },
                    {
                      label: "Sellers",
                      value: dashboard?.sellerUsers ?? 0,
                      icon: TrendingUp,
                      color: "text-teal-600",
                      bg: "bg-teal-50",
                    },
                    {
                      label: "Admins",
                      value: admins.length,
                      icon: Shield,
                      color: "text-slate-600",
                      bg: "bg-slate-100",
                    },
                    {
                      label: "Audit Events",
                      value: auditLogs.length,
                      icon: Activity,
                      color: "text-rose-600",
                      bg: "bg-rose-50",
                    },
                  ].map(({ label, value, icon: Icon, color, bg }) => (
                    <div
                      key={label}
                      className="bg-white rounded-xl border border-[#D9E1EA] p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div
                          className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}
                        >
                          <Icon
                            className={`w-4 h-4 ${color}`}
                            aria-hidden="true"
                          />
                        </div>
                        <TrendingUp
                          className="w-3.5 h-3.5 text-slate-300"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="text-2xl font-bold text-[#10243E]">
                        {pageLoading ? "…" : pageError ? "—" : value}
                      </div>
                      <div className="text-xs text-[#66758A] mt-0.5">
                        {translateText(label)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {}
                <div className="bg-white rounded-xl border border-[#D9E1EA] p-5">
                  <h2 className="font-semibold text-[#10243E] mb-4 flex items-center gap-2">
                    <PieChart
                      className="w-4 h-4 text-[#1672DC]"
                      aria-hidden="true"
                    />
                    {translateText("Listings by Category")}</h2>
                  <div className="space-y-3">
                    {Object.entries(catCounts).map(([cat, count]) => {
                      const pct = Math.round((count / approvedCount) * 100)
                      return (
                        <div key={cat}>
                          <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="text-[#10243E] font-medium">
                              {cat}
                            </span>
                            <span className="text-[#66758A] text-xs">
                              {count} Â· {pct}%
                            </span>
                          </div>
                          <div
                            className="h-2 bg-slate-100 rounded-full overflow-hidden"
                            role="progressbar"
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${cat}: ${pct}%`}
                          >
                            <div
                              className="h-full bg-[#1672DC] rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {}
                <div className="bg-white rounded-xl border border-[#D9E1EA] p-5">
                  <h2 className="font-semibold text-[#10243E] mb-4 flex items-center gap-2">
                    <BarChart3
                      className="w-4 h-4 text-[#1672DC]"
                      aria-hidden="true"
                    />
                    {translateText("Admin Activity")}</h2>
                  <div className="space-y-3">
                    {admins.map((admin) => (
                      <div
                        key={admin.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-[#D9E1EA] hover:bg-slate-50 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-full bg-[#102B4B] text-white text-xs font-semibold flex items-center justify-center shrink-0">
                          {admin.name[6] ?? admin.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-[#10243E]">
                            {admin.name}
                          </div>
                          <div className="text-xs text-[#66758A]">
                            {admin.permissions.length} {translateText("permission")}{admin.permissions.length !== 1 ? translateText("s") : ""} {" " + translateText("Â· Added")}{" "}
                            {formatDate(admin.createdAt)}
                          </div>
                        </div>
                        <button
                          disabled
                          className="text-xs px-2.5 py-1.5 text-[#1672DC] border border-[#1672DC]/30 rounded-lg hover:bg-[#1672DC] hover:text-white transition-colors shrink-0 font-medium"
                        >
                          {translateText("Manage")}</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {}
              <div className="bg-white rounded-xl border border-[#D9E1EA] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-[#10243E] flex items-center gap-2">
                    <Activity
                      className="w-4 h-4 text-[#1672DC]"
                      aria-hidden="true"
                    />
                    {translateText("Recent Activity Timeline")}</h2>
                  <button
                    onClick={() => setTab("logs")}
                    className="text-xs text-[#1672DC] hover:underline"
                  >
                    {translateText("View full log")}</button>
                </div>
                <ol className="space-y-4 relative before:content-[''] before:absolute before:left-3.5 before:top-0 before:bottom-0 before:w-px before:bg-[#D9E1EA]">
                  {auditLogs.map((event, i) => (
                    <li
                      key={event.id}
                      className="flex items-start gap-4 pl-9 relative"
                    >
                      <span
                        className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full bg-[#1672DC] ring-2 ring-white text-white text-[10px] flex items-center justify-center font-bold"
                        aria-hidden="true"
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#10243E]">
                          <span className="font-semibold">
                            {event.actor_user_email ??
                              event.actor_user_id ??
                              "System"}
                          </span>{" "}
                          <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                            {event.action}
                          </span>
                        </p>
                        <p className="text-xs text-[#66758A] mt-0.5 truncate">
                          {event.entity_type} {event.entity_id}
                          {event.reason ? ` â€” "${event.reason}"` : ""}
                        </p>
                        <p className="text-xs text-[#66758A]">
                          {formatRelativeTime(event.created_at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}

          {tab === "logs" && (
            <div className="bg-white rounded-xl border border-[#D9E1EA] overflow-hidden">
              <div className="p-4 border-b border-[#D9E1EA]">
                <h2 className="font-semibold text-[#10243E]">
                  {translateText("Full Activity Logs")}</h2>
                <p className="text-xs text-[#66758A] mt-0.5">
                  {translateText("Read-only audit record. Admins cannot edit or delete these records.")}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#D9E1EA] bg-slate-50">
                      {[
                        "Actor",
                        "Action",
                        "Entity",
                        "Before â†’ After",
                        "IP",
                        "Time",
                        "Reason",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-3 text-xs font-semibold text-[#66758A] uppercase tracking-wider whitespace-nowrap"
                        >
                          {translateText(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9E1EA]">
                    {auditLogs.map((event) => (
                      <tr key={event.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-xs font-semibold text-[#10243E]">
                          {event.actor_user_email ??
                            event.actor_user_id ??
                            "System"}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#66758A] font-mono">
                          {event.action}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#66758A]">
                          {event.entity_type} Â· {event.entity_id}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                            {event.beforeValue || "â€”"}
                          </span>
                          {" â†’ "}
                          <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {event.afterValue || "â€”"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#66758A] font-mono">
                          {event.ipAddress}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#66758A] whitespace-nowrap">
                          {formatDate(event.created_at)}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#66758A] max-w-40 truncate">
                          {event.reason || "â€”"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {showPermModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={translateText("Admin management")}
        >
          <div className="bg-white rounded-xl p-6 w-full max-w-xl max-h-[85vh] overflow-auto">
            <button
              className="float-right"
              onClick={() => setShowPermModal(false)}
            >
              {translateText("Close")}</button>
            <OwnerAdminControls />
          </div>
        </div>
      )}
    </div>
  )
}
