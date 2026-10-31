"use client";
import { usePreferences } from "@/context/PreferencesContext";
import { useState } from "react"
import { useApp } from "@/context/AppContext"

export default function PasswordForm() {
  const { translateText } = usePreferences();

  const { showToast } = useApp()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault()
        if (saving) return
        const element = event.currentTarget
        const form = new FormData(element)
        if (form.get("newPassword") !== form.get("confirmPassword")) {
          setError("New passwords must match.")
          return
        }
        setSaving(true)
        setError("")
        try {
          const response = await fetch("/api/users/me/password", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              currentPassword: form.get("currentPassword"),
              newPassword: form.get("newPassword"),
            }),
          })
          const data = await response.json()
          if (!response.ok)
            throw new Error(data.error || "Unable to change password.")
          element.reset()
          showToast(data.message, "success")
        } catch (failure) {
          setError(
            failure instanceof Error
              ? failure.message
              : "Unable to change password.",
          )
        } finally {
          setSaving(false)
        }
      }}
    >
      <h2 className="font-semibold text-[#10243E]">{translateText("Change Password")}</h2>
      {(["currentPassword", "newPassword", "confirmPassword"] as const).map(
        (name, index) => (
          <label key={name} className="block text-sm text-[#10243E]">
            {
              ["Current password", "New password", "Confirm new password"][
                index
              ]
            }
            <input
              name={name}
              type="password"
              autoComplete={index ? "new-password" : "current-password"}
              minLength={index ? 8 : 1}
              maxLength={index ? 128 : 200}
              required
              className="block w-full mt-1 px-3 py-2 border border-[#D9E1EA] rounded-lg"
            />
          </label>
        ),
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {translateText(error)}
        </p>
      )}
      <button
        disabled={saving}
        className="px-5 py-2.5 bg-[#1672DC] text-white rounded-lg disabled:opacity-50"
      >
        {saving ? translateText("Updating…") : translateText("Update password")}
      </button>
    </form>
  )
}
