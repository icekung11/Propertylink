"use client";
import { usePreferences } from "@/context/PreferencesContext";
import { useState } from "react"

export default function ForgotPasswordForm() {
  const { translateText } = usePreferences();

  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [devUrl, setDevUrl] = useState("")
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault()
        if (busy) return
        const data = new FormData(event.currentTarget)
        setBusy(true)
        setMessage("")
        setError("")
        setDevUrl("")
        try {
          const response = await fetch("/api/auth/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: data.get("email") }),
          })
          const result = await response.json()
          if (!response.ok) throw new Error(result.error)
          setMessage(result.message)
          setDevUrl(result.devResetUrl || "")
        } catch (failure) {
          setError(
            failure instanceof Error
              ? failure.message
              : "Unable to request password reset.",
          )
        } finally {
          setBusy(false)
        }
      }}
    >
      <p className="text-sm text-[#66758A]">
        {translateText("Enter your account email to request a password reset link.")}</p>
      <label className="block text-sm">
        {translateText("Email address")}<input
          type="email"
          name="email"
          autoComplete="email"
          maxLength={254}
          required
          className="block w-full border rounded-lg px-3 py-2 mt-1"
        />
      </label>
      {message && (
        <p role="status" className="text-sm text-emerald-700">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {translateText(error)}
        </p>
      )}
      {devUrl && (
        <a className="block text-sm text-blue-600 underline" href={devUrl}>
          {translateText("Development only: open reset link")}</a>
      )}
      <button
        disabled={busy}
        className="w-full bg-[#1672DC] text-white rounded-lg py-3 disabled:opacity-50"
      >
        {busy ? translateText("Sending…") : translateText("Request reset link")}
      </button>
    </form>
  )
}
