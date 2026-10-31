"use client";
import { usePreferences } from "@/context/PreferencesContext";
import { useEffect, useState } from "react"
import { useApp } from "@/context/AppContext"

export default function ResetPasswordPage() {
  const { translateText } = usePreferences();

  const { setShowLoginModal, logout } = useApp()
  const [token, setToken] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [complete, setComplete] = useState(false)
  useEffect(() => {
    const value =
      new URLSearchParams(window.location.hash.slice(1)).get("token") || ""
    setToken(value)
    window.history.replaceState(null, "", window.location.pathname)
    if (!value)
      setError("Reset link is missing. Request a new link from Sign In.")
  }, [])
  return (
    <div className="max-w-md mx-auto p-6 my-12 bg-white border rounded-xl">
      <h1 className="text-xl font-semibold mb-5">{translateText("Reset Password")}</h1>
      {error && (
        <p role="alert" className="text-red-600 text-sm mb-4">
          {translateText(error)}
        </p>
      )}
      {complete ? (
        <div>
          <p role="status">Password reset successfully.</p>
          <button
            onClick={() => setShowLoginModal(true)}
            className="mt-4 text-blue-600 underline"
          >
            Sign in
          </button>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            if (busy || !token) return
            const data = new FormData(event.currentTarget)
            if (data.get("password") !== data.get("confirm")) {
              setError("Passwords must match.")
              return
            }
            setBusy(true)
            setError("")
            try {
              const response = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  token,
                  newPassword: data.get("password"),
                }),
              })
              const result = await response.json()
              if (!response.ok) throw new Error(result.error)
              logout()
              setToken("")
              setComplete(true)
            } catch (failure) {
              setError(
                failure instanceof Error
                  ? failure.message
                  : "Unable to reset password.",
              )
            } finally {
              setBusy(false)
            }
          }}
        >
          {["password", "confirm"].map((name, index) => (
            <label key={name} className="block text-sm">
              {index ? "Confirm new password" : "New password"}
              <input
                name={name}
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                className="block mt-1 w-full border rounded-lg p-2"
              />
            </label>
          ))}
          <button
            disabled={busy || !token}
            className="w-full bg-[#1672DC] text-white py-2 rounded-lg disabled:opacity-50"
          >
            {busy ? "Resetting…" : "Reset password"}
          </button>
        </form>
      )}
    </div>
  )
}
