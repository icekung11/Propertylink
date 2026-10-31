"use client";
import { usePreferences } from "@/context/PreferencesContext";
import { useState } from "react"
import { useApp } from "../../context/AppContext"
import { AlertCircle, User, CheckCircle } from "lucide-react"
import StatusBadge from "../../components/StatusBadge"
import PasswordForm from "@/components/PasswordForm"

export default function AccountPage() {
  const { translateText } = usePreferences();

  const { user, showToast, setShowLoginModal, updateProfileName } = useApp()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  const saveAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    const form = new FormData(event.currentTarget)
    setSaving(true)
    setSaveError("")
    try {
      const response = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.user)
        throw new Error(data.error || "Unable to update your account.")
      updateProfileName(data.user.firstName, data.user.lastName)
      showToast("Account updated successfully!", "success")
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update your account."
      setSaveError(message)
      showToast(message, "error")
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-24 text-center">
        <AlertCircle
          className="w-12 h-12 text-slate-300 mx-auto mb-4"
          aria-hidden="true"
        />
        <h1 className="text-xl font-semibold text-[#10243E] mb-2">
          {translateText("Sign In Required")}</h1>
        <p className="text-[#66758A] mb-6">
          {translateText("Please sign in to view your account details.")}</p>
        <button
          onClick={() => setShowLoginModal(true)}
          className="px-5 py-2.5 bg-[#1672DC] text-white font-semibold rounded-lg hover:bg-[#125BB8] transition-colors"
        >
          {translateText("Sign In")}</button>
      </div>
    )
  }

  const primaryRole = user.roles.includes("OWNER")
    ? "Owner"
    : user.roles.includes("ADMIN")
      ? "Admin"
      : user.roles.includes("SELLER")
        ? "Seller"
        : "Buyer"

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F5F8FC] py-8">
      <div className="max-w-2xl mx-auto px-6">
        <h1 className="text-2xl font-bold text-[#10243E] mb-6">{translateText("My Account")}</h1>

        <div className="bg-white rounded-xl border border-[#D9E1EA] p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 pb-8 border-b border-[#D9E1EA]">
            <div className="w-20 h-20 rounded-full bg-[#1672DC] text-white text-3xl font-bold flex items-center justify-center shrink-0">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div className="text-center sm:text-left flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-1">
                <h2 className="text-xl font-bold text-[#10243E]">
                  {user.firstName} {user.lastName}
                </h2>
                <span className="inline-block text-xs bg-blue-50 text-[#1672DC] px-2.5 py-1 rounded-full font-medium border border-blue-100">
                  {translateText(primaryRole)}
                </span>
              </div>
              <p className="text-[#66758A] mb-3">{user.email}</p>
              <div className="flex justify-center sm:justify-start">
                <StatusBadge status={user.status} />
              </div>
            </div>
          </div>

          <form onSubmit={saveAccount} className="space-y-5">
            <h3 className="font-semibold text-[#10243E] mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-[#1672DC]" />
              {translateText("Personal Information")}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-[#10243E] mb-1.5">
                  {translateText("First Name")}</label>
                <input
                  defaultValue={user.firstName}
                  name="firstName"
                  maxLength={100}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D9E1EA] rounded-lg text-sm focus:outline-none focus:border-[#1672DC] focus:ring-2 focus:ring-[#1672DC]/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#10243E] mb-1.5">
                  {translateText("Last Name")}</label>
                <input
                  defaultValue={user.lastName}
                  name="lastName"
                  maxLength={100}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D9E1EA] rounded-lg text-sm focus:outline-none focus:border-[#1672DC] focus:ring-2 focus:ring-[#1672DC]/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#10243E] mb-1.5">
                  {translateText("Email Address")}</label>
                <input
                  type="email"
                  defaultValue={user.email}
                  disabled
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-[#D9E1EA] rounded-lg text-sm text-[#66758A] cursor-not-allowed"
                />
                <p className="text-xs text-[#66758A] mt-1.5">
                  {translateText("Email address cannot be changed.")}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#10243E] mb-1.5">
                  {translateText("Phone Number")}</label>
                <input
                  type="tel"
                  defaultValue={user.phone}
                  readOnly
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D9E1EA] rounded-lg text-sm focus:outline-none focus:border-[#1672DC] focus:ring-2 focus:ring-[#1672DC]/20 transition-all"
                />
              </div>
            </div>

            {saveError && (
              <p role="alert" className="text-sm text-red-600">
                {translateText(saveError)}
              </p>
            )}
            <div className="pt-4 flex items-center justify-end border-t border-[#D9E1EA] mt-6">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#1672DC] text-white text-sm font-semibold rounded-lg hover:bg-[#125BB8] transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                {saving ? translateText("Saving…") : translateText("Save Changes")}
              </button>
            </div>
          </form>
          <div className="mt-8 pt-6 border-t border-[#D9E1EA]">
            <PasswordForm />
          </div>
        </div>
      </div>
    </div>
  )
}
