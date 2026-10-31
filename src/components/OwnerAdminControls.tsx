"use client";
import { usePreferences } from "@/context/PreferencesContext";
import { useEffect, useState } from "react"
import { useApp } from "@/context/AppContext"

export default function OwnerAdminControls() {
  const { translateText } = usePreferences();

  const { showToast } = useApp()
  const [permissions, setPermissions] = useState<Array<{
    code: string
    granted: boolean
  }>>([])
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<{
    code: string
    granted: boolean
  } | null>(null)
  const [target, setTarget] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/owner/permissions", { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)
        setPermissions(data.permissions)
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.message)
      })
    return () => controller.abort()
  }, [])
  const labels: Record<string, string> = {
    "listing.approve": "Approve listings",
    "listing.reject": "Reject listings",
    "listing.request_revision": "Request revisions",
    "listing.hide": "Hide published listings",
  }
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">{translateText("Admin Management")}</h2>
      {error && (
        <p className="text-red-600 text-sm" role="alert">
          {translateText(error)}
        </p>
      )}
      <div className="space-y-3">
        <p className="text-sm text-[#66758A]">
          {translateText("These permissions apply to every Admin account. Changes take effect immediately.")}</p>
        {permissions.map((permission) => (
          <label
            className="flex items-center gap-3 text-sm"
            key={permission.code}
          >
            <input
              type="checkbox"
              checked={permission.granted}
              disabled={busy || !!pending}
              onChange={() =>
                setPending({
                  code: permission.code,
                  granted: !permission.granted,
                })
              }
            />
            {labels[permission.code]}
          </label>
        ))}
        {pending && (
          <div className="p-3 bg-amber-50 rounded-lg text-sm">
            <p>
              {pending.granted ? translateText("Grant") : translateText("Revoke")} {labels[pending.code]} {translateText("for all Admins?")}</p>
            <div className="flex gap-3 mt-3">
              <button disabled={busy} onClick={() => setPending(null)}>
                {translateText("Cancel")}</button>
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  setError("")
                  try {
                    const response = await fetch("/api/owner/permissions", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(pending),
                    })
                    const data = await response.json()
                    if (!response.ok) throw new Error(data.error)
                    setPermissions((rows) =>
                      rows.map((row) =>
                        row.code === pending.code
                          ? { ...row, granted: pending.granted }
                          : row,
                      ),
                    )
                    setPending(null)
                    showToast("Admin permissions updated.")
                  } catch (failure) {
                    setError(
                      failure instanceof Error
                        ? failure.message
                        : "Unable to update permissions.",
                    )
                  } finally {
                    setBusy(false)
                  }
                }}
                className="bg-[#1672DC] text-white px-3 py-1 rounded"
              >
                {translateText("Confirm")}</button>
            </div>
          </div>
        )}
      </div>
      <form
        className="space-y-3 border-t pt-5"
        onSubmit={async (event) => {
          event.preventDefault()
          if (busy || !confirmed) return
          setBusy(true)
          setError("")
          try {
            const response = await fetch("/api/owner/admins", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: target }),
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error)
            showToast(
              "Admin assigned. Their existing sessions have been revoked.",
            )
            setTarget("")
            setConfirmed(false)
          } catch (failure) {
            setError(
              failure instanceof Error ? failure.message : "Assignment failed.",
            )
          } finally {
            setBusy(false)
          }
        }}
      >
        <h3 className="font-semibold">{translateText("Assign an existing account as Admin")}</h3>
        <label className="block text-sm">
          {translateText("Account ID")}<input
            value={target}
            onChange={(event) => {
              setTarget(event.target.value)
              setConfirmed(false)
            }}
            required
            pattern="[0-9a-fA-F-]{36}"
            className="w-full border rounded-lg p-2 mt-1"
          />
        </label>
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            required
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          {translateText("Replace this account’s current role with Admin and sign out its existing sessions.")}</label>
        <button
          disabled={busy || !confirmed}
          className="px-4 py-2 bg-[#1672DC] text-white rounded-lg disabled:opacity-50"
        >
          {translateText("Assign Admin")}</button>
      </form>
    </div>
  )
}
