"use client";
import { usePreferences } from "@/context/PreferencesContext";

// Loading state

// Login state

// Register state

// OTP Verification state

// Forgot state
// 1. Try real API login first

// 1. Submit Registration to POST /api/auth/register

// Success -> move to OTP screen
// pre-fill in dev for quick testing!

// 2. Verify OTP via POST /api/auth/verify-otp
/* ── Brand panel ── */ /* ── Form panel ── */ /* ── State: OTP Screen ── */ /* Dev Banner showing simulated OTP */
/* Success Screen */ /* Mobile logo */ /* ── Sign in ── */ /* ── Register ── */ /* ── Forgot password ── */
import { useState } from "react"
import {
  X,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Mail,
  Lock,
  User,
  Phone,
  Home,
  Check,
  Search,
  Tag,
  KeyRound,
  Loader2,
} from "lucide-react"
import { useApp } from "../context/AppContext"
import { useRouter } from "next/navigation"
import ForgotPasswordForm from "./ForgotPasswordForm"

const ROLE_OPTIONS: {
  role: string
  desc: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { role: "Buyer", desc: "Browse & save homes", icon: Search },
  { role: "Seller", desc: "List & sell properties", icon: Tag },
  { role: "Owner", desc: "Manage the platform", icon: Home },
  { role: "Admin", desc: "Review property listings", icon: KeyRound },
]

type Tab = "login" | "register" | "otp" | "forgot"

interface RegFields {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  confirm: string
  roles: string[]
  terms: boolean
}

interface RegErrors {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  password?: string
  confirm?: string
  roles?: string
  terms?: string
  api?: string
}

interface LoginModalProps {
  onClose: () => void
}

const INPUT_CLS =
  "w-full px-3.5 py-3 border rounded-xl text-sm text-[#10243E] bg-white placeholder:text-[#A5B1C2] focus:outline-none focus:ring-4 transition"
const inputCls = (err?: string) =>
  `${INPUT_CLS} ${
    err
      ? "border-[#E5484D] focus:border-[#E5484D] focus:ring-[#E5484D]/10"
      : "border-[#D9E1EA] focus:border-[#1672DC] focus:ring-[#1672DC]/10"
  }`

export default function LoginModal({ onClose }: LoginModalProps) {
  const { translateText } = usePreferences();

  const { login, showToast } = useApp()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("login")
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [reg, setReg] = useState<RegFields>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    roles: ["Buyer"],
    terms: false,
  })
  const [regErrors, setRegErrors] = useState<RegErrors>({})
  const [registeredUserId, setRegisteredUserId] = useState("")
  const [devOtpCode, setDevOtpCode] = useState("")
  const [inputOtp, setInputOtp] = useState("")
  const [otpError, setOtpError] = useState("")
  const [otpVerified, setOtpVerified] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError("")
    setLoading(true)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (res.ok && data.user) {
        login({
          id: data.user.id,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          email: data.user.email,
          phone: data.user.phone,
          roles: data.user.roles,
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
        })
        showToast(`Welcome back, ${data.user.firstName}!`, "success")
        const role = data.user.primaryRole
        const dest =
          role ===
          "SELLER"
            ? "/seller"
            : role ===
                "ADMIN"
              ? "/admin"
              : role ===
                  "OWNER"
                ? "/owner"
                : "/buyer"
        router.replace(dest)
        onClose()
        return
      }

      setLoginError(
        data.error ||
          "Sign in failed.",
      )
    } catch (err: any) {
      setLoginError(
        err.message ||
          "เกิดข้อผิดพลาดในการเชื่อมต่อ",
      )
    } finally {
      setLoading(false)
    }
  }

  const setRegField = (
    field: keyof RegFields,
    value: string | boolean | string[],
  ) => {
    setReg((prev) => ({ ...prev, [field]: value }))
    setRegErrors((prev) => ({ ...prev, [field]: undefined, api: undefined }))
  }

  const toggleRole = (role: string) => {
    setReg((prev) => ({
      ...prev,
      roles: prev.roles.includes(role) ? [] : [role],
    }))

    setRegErrors((prev) => ({ ...prev, roles: undefined }))
  }

  const validateReg = (): boolean => {
    const errs: RegErrors = {}
    if (!reg.firstName.trim()) errs.firstName = "First name is required"
    if (!reg.lastName.trim()) errs.lastName = "Last name is required"
    if (!reg.email.trim()) errs.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reg.email))
      errs.email = "Enter a valid email address"
    if (!reg.phone.trim()) errs.phone = "Phone is required"
    if (!reg.password) errs.password = "Password is required"
    else if (
      reg.password.length <
      8
    )
      errs.password = "Min. 8 characters"
    if (!reg.confirm) errs.confirm = "Please confirm your password"
    else if (
      reg.confirm !==
      reg.password
    )
      errs.confirm = "Passwords do not match"
    if (
      reg.roles.length !==
      1
    )
      errs.roles = "Select one account type"
    if (!reg.terms) errs.terms = "You must agree to the Terms of Use"
    setRegErrors(errs)
    return (
      Object.keys(errs).length ===
      0
    )
  }
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateReg()) return
    setLoading(true)
    setRegErrors({})

    try {
      const selectedRole =
        reg.roles[0]?.toLowerCase() ||
        "buyer"
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: reg.email,
          password: reg.password,
          firstName: reg.firstName,
          lastName: reg.lastName,
          phone: reg.phone,
          role: selectedRole,

          termsAccepted: reg.terms,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setRegErrors({
          api:
            data.error ||
            "Registration failed",
        })
        setLoading(false)
        return
      }
      setRegisteredUserId(data.userId)
      setDevOtpCode(
        data.devOtp ||
          "",
      )
      setInputOtp(
        data.devOtp ||
          "",
      )
      setTab("otp")
      showToast("Registration successful! Please verify OTP.")
    } catch (err: any) {
      setRegErrors({
        api:
          err.message ||
          "Connection error",
      })
    } finally {
      setLoading(false)
    }
  }
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputOtp.trim()) {
      setOtpError("กรุณากรอกรหัส OTP")
      return
    }
    setLoading(true)
    setOtpError("")

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: registeredUserId,
          otpCode: inputOtp.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setOtpError(data.error || "Verification failed")
        setLoading(false)
        return
      }

      setOtpVerified(true)
      showToast("Account verified and activated successfully!")
    } catch (err: any) {
      setOtpError(err.message || "Connection error")
    } finally {
      setLoading(false)
    }
  }

  const handleStartExploring = () => {
    onClose()
    router.push("/properties")
  }

  const IMG =
    "https://images.unsplash.com/photo-1494526585095-c41746248156?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
  const primaryBtn =
    "w-full py-3 bg-[#1672DC] text-white text-sm font-semibold rounded-xl shadow-[0_6px_16px_-6px_rgba(22,114,220,0.7)] hover:bg-[#125BB8] active:scale-[0.99] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1672DC]/40 focus-visible:ring-offset-2 flex items-center justify-center gap-2"
  const labelCls = "block text-[13px] font-medium text-[#10243E] mb-1.5"

  const renderField = (opts: {
    id: string
    label: string
    icon: React.ComponentType<{ className?: string }>
    value: string
    onChange: (v: string) => void
    type?: string
    placeholder?: string
    error?: string
    errId?: string
    required?: boolean
    autoFocus?: boolean
    trailing?: React.ReactNode
  }) => {
    const Icon = opts.icon
    return (
      <div>
        <label htmlFor={opts.id} className={labelCls}>
          {translateText(opts.label)}{" "}
          {opts.required && <span className="text-[#E5484D]">*</span>}
        </label>
        <div className="relative">
          <Icon
            className="w-4 h-4 text-[#8A98AC] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            id={opts.id}
            type={opts.type ?? "text"}
            value={opts.value}
            onChange={(e) => opts.onChange(e.target.value)}
            className={`${inputCls(opts.error)} pl-10 ${
              opts.trailing ? "pr-10" : ""
            }`}
            placeholder={opts.placeholder}
            autoFocus={opts.autoFocus}
            aria-invalid={!!opts.error}
            aria-describedby={opts.error ? opts.errId : undefined}
          />
          {opts.trailing}
        </div>
        {opts.error && (
          <p id={opts.errId} className="text-xs text-[#E5484D] mt-1">
            {opts.error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A1B31]/60 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`relative bg-white rounded-3xl shadow-[0_30px_80px_-20px_rgba(10,27,49,0.6)] w-full overflow-hidden grid md:grid-cols-[5fr_6fr] my-auto transition-all duration-200 ${
          tab === "register" ? "max-w-4xl" : "max-w-3xl"
        }`}
      >
        {}
        <aside className="relative hidden md:flex flex-col justify-between p-8 text-white min-h-[560px]">
          <img
            src={IMG}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-[#0A1B31]/80 via-[#0A1B31]/45 to-[#0A1B31]/90"
            aria-hidden="true"
          />
          <div className="relative flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1672DC] flex items-center justify-center shadow-lg">
              <Home className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              Property<span className="text-[#7DB8FF]">Link</span>
            </span>
          </div>

          <div className="relative">
            <h2 className="text-[28px] leading-[1.15] font-bold tracking-tight">
              {translateText("Find a place that")}<br />
              {translateText("feels like home.")}</h2>
            <p className="text-white/75 text-sm mt-3 max-w-[260px]">
              {translateText("Save favorites, contact sellers and track every inquiry in one place.")}</p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {[
                "Verified listings across Thailand",
                "Direct contact with owners",
                "Instant updates on your inquiries",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2.5 text-white/90">
                  <span className="w-5 h-5 rounded-full bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" aria-hidden="true" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {}
        <div className="relative flex flex-col">
          <button
            onClick={onClose}
            aria-label={translateText("Close dialog")}
            className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full text-[#66758A] hover:text-[#10243E] hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {}
          {tab === "otp" ? (
            <div className="p-8 md:p-10 text-center my-auto">
              {!otpVerified ? (
                <>
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
                    <KeyRound className="w-8 h-8 text-[#1672DC]" />
                  </div>

                  <h2
                    id="login-modal-title"
                    className="text-2xl font-bold text-[#10243E] mb-2"
                  >
                    ยืนยันรหัส OTP
                  </h2>
                  <p className="text-[#66758A] text-sm mb-4">
                    ระบบได้ส่งรหัส OTP 6 หลัก ไปที่เบอร์{" "}
                    <span className="font-semibold text-[#10243E]">
                      {reg.phone}
                    </span>
                  </p>

                  {}
                  {devOtpCode && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-left">
                      <div className="flex items-center gap-1.5 text-amber-800 text-xs font-semibold mb-1">
                        <AlertCircle className="w-4 h-4" />
                        <span>สภาวะจำลอง (Development Mode):</span>
                      </div>
                      <p className="text-xs text-amber-900">
                        รหัส OTP ของคุณคือ:{" "}
                        <span className="font-mono font-bold text-base text-[#1672DC] ml-1 bg-white px-2 py-0.5 rounded border border-amber-300">
                          {devOtpCode}
                        </span>
                      </p>
                    </div>
                  )}

                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div>
                      <input
                        type="text"
                        maxLength={6}
                        value={inputOtp}
                        onChange={(e) => setInputOtp(e.target.value)}
                        placeholder="กรอกรหัส 6 หลัก"
                        className="w-full text-center text-2xl font-mono tracking-widest py-3 border border-[#D9E1EA] rounded-xl focus:border-[#1672DC] focus:ring-4 focus:ring-[#1672DC]/10 outline-none"
                        autoFocus
                      />
                      {otpError && (
                        <p className="text-xs text-[#E5484D] mt-2">
                          {otpError}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className={primaryBtn}
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "ยืนยันรหัส OTP"
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setTab("register")}
                      className="text-xs text-[#66758A] hover:text-[#10243E] transition"
                    >
                      ← เปลี่ยนข้อมูลหรือเบอร์โทรศัพท์
                    </button>
                  </form>
                </>
              ) : (
                <div>
                  <div className="relative w-20 h-20 mx-auto mb-5">
                    <div
                      className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-30"
                      aria-hidden="true"
                    />
                    <div className="relative w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle
                        className="w-10 h-10 text-[#18A66A]"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold text-[#10243E] mb-2">
                    {translateText('Verification successful!')}
                  </h2>
                  <p className="text-[#66758A] text-sm mb-6">
                    {translateText('Welcome back')}{" "}
                    <span className="font-semibold text-[#10243E]">
                      {reg.firstName} {reg.lastName}
                    </span>{" "}
                    {translateText('Your account is ready to use.')}
                  </p>

                  <div className="bg-[#F5F8FC] rounded-2xl p-4 text-left space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#66758A] w-24 shrink-0">
                        Email
                      </span>
                      <span className="text-[#10243E] font-medium truncate">
                        {reg.email}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#66758A] w-24 shrink-0">
                        เบอร์โทรศัพท์
                      </span>
                      <span className="text-[#10243E] font-medium">
                        {reg.phone}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#66758A] w-24 shrink-0">
                        สถานะบัญชี
                      </span>
                      <span className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        ACTIVE (ยืนยัน OTP แล้ว)
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleStartExploring}
                      className={`${primaryBtn} flex-1`}
                    >
                      เริ่มสำรวจอสังหาฯ
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setOtpVerified(false)
                        setTab("login")
                      }}
                      className="flex-1 py-3 border border-[#D9E1EA] text-sm text-[#10243E] font-medium rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      เข้าสู่ระบบ
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-7 md:p-10 my-auto">
              {}
              <div className="md:hidden flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-[#1672DC] flex items-center justify-center">
                  <Home className="w-4 h-4 text-white" aria-hidden="true" />
                </div>
                <span className="font-bold text-[#10243E]">
                  Property<span className="text-[#1672DC]">Link</span>
                </span>
              </div>

              {tab !== "forgot" && (
                <div
                  className="grid grid-cols-2 p-1 mb-7 bg-[#EEF3F9] rounded-xl"
                  role="tablist"
                >
                  {(["login", "register"] as Tab[]).map((t) => (
                    <button
                      key={t}
                      role="tab"
                      aria-selected={tab === t}
                      onClick={() => setTab(t)}
                      className={`py-2 text-sm font-medium rounded-lg transition-all ${
                        tab === t
                          ? "bg-white text-[#10243E] shadow-sm"
                          : "text-[#66758A] hover:text-[#10243E]"
                      }`}
                    >
                      {t === "login" ? "Sign In" : "Register"}
                    </button>
                  ))}
                </div>
              )}

              {}
              {tab === "login" && (
                <>
                  <div className="mb-6">
                    <h2
                      id="login-modal-title"
                      className="text-2xl font-bold tracking-tight text-[#10243E]"
                    >
                      Welcome back
                    </h2>
                    <p className="text-[#66758A] text-sm mt-1">
                      Sign in to your account to continue
                    </p>
                  </div>

                  {loginError && (
                    <div
                      className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-xs text-[#E5484D]"
                      role="alert"
                    >
                      <AlertCircle
                        className="w-4 h-4 shrink-0"
                        aria-hidden="true"
                      />
                      {loginError}
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-4">
                    {renderField({
                      id: "login-email",
                      label: "Email",
                      icon: Mail,
                      type: "email",
                      value: email,
                      onChange: setEmail,
                      placeholder: "you@example.com",
                      autoFocus: true,
                    })}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="login-password" className={labelCls}>
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setTab("forgot")}
                          className="text-xs text-[#1672DC] hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock
                          className="w-4 h-4 text-[#8A98AC] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                          aria-hidden="true"
                        />
                        <input
                          id="login-password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`${inputCls()} pl-10`}
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <button type="submit" className={primaryBtn}>
                      Sign In
                    </button>
                  </form>
                </>
              )}

              {}
              {tab === "register" && (
                <>
                  <div className="mb-5">
                    <h2
                      id="login-modal-title"
                      className="text-2xl font-bold tracking-tight text-[#10243E]"
                    >
                      Create an account
                    </h2>
                    <p className="text-[#66758A] text-sm mt-1">
                      Join PropertyLink to explore and list properties
                    </p>
                  </div>

                  {regErrors.api && (
                    <div
                      className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-xs text-[#E5484D]"
                      role="alert"
                    >
                      <AlertCircle
                        className="w-4 h-4 shrink-0"
                        aria-hidden="true"
                      />
                      {regErrors.api}
                    </div>
                  )}

                  <form onSubmit={handleRegister} className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      {renderField({
                        id: "reg-first",
                        label: "First Name",
                        icon: User,
                        value: reg.firstName,
                        onChange: (v) => setRegField("firstName", v),
                        placeholder: "Somchai",
                        error: regErrors.firstName,
                        errId: "err-first",
                        required: true,
                      })}
                      {renderField({
                        id: "reg-last",
                        label: "Last Name",
                        icon: User,
                        value: reg.lastName,
                        onChange: (v) => setRegField("lastName", v),
                        placeholder: "Dee",
                        error: regErrors.lastName,
                        errId: "err-last",
                        required: true,
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {renderField({
                        id: "reg-email",
                        label: "Email",
                        icon: Mail,
                        type: "email",
                        value: reg.email,
                        onChange: (v) => setRegField("email", v),
                        placeholder: "you@example.com",
                        error: regErrors.email,
                        errId: "err-email",
                        required: true,
                      })}
                      {renderField({
                        id: "reg-phone",
                        label: "Phone",
                        icon: Phone,
                        type: "tel",
                        value: reg.phone,
                        onChange: (v) => setRegField("phone", v),
                        placeholder: "0812345678",
                        error: regErrors.phone,
                        errId: "err-phone",
                        required: true,
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {renderField({
                        id: "reg-pw",
                        label: "Password",
                        icon: Lock,
                        type: "password",
                        value: reg.password,
                        onChange: (v) => setRegField("password", v),
                        placeholder: "Min. 8 characters",
                        error: regErrors.password,
                        errId: "err-pw",
                        required: true,
                      })}
                      {renderField({
                        id: "reg-confirm",
                        label: "Confirm Password",
                        icon: Lock,
                        type: "password",
                        value: reg.confirm,
                        onChange: (v) => setRegField("confirm", v),
                        placeholder: "Repeat password",
                        error: regErrors.confirm,
                        errId: "err-confirm",
                        required: true,
                      })}
                    </div>

                    <div className="pt-1">
                      <p className={labelCls}>
                        I am a <span className="text-[#E5484D]">*</span>
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {ROLE_OPTIONS.map(({ role, desc, icon: RoleIcon }) => {
                          const active = reg.roles.includes(role)
                          return (
                            <label
                              key={role}
                              className={`relative flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded-xl border transition-colors focus-within:ring-4 focus-within:ring-[#1672DC]/10 ${
                                active
                                  ? "border-[#1672DC] bg-blue-50"
                                  : "border-[#D9E1EA] hover:border-[#1672DC]"
                              }`}
                            >
                              <input
                                type="radio"
                                name="registration-role"
                                checked={active}
                                onChange={() => toggleRole(role)}
                                className="sr-only"
                              />
                              <span
                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                  active
                                    ? "bg-[#1672DC] text-white"
                                    : "bg-[#EEF3F9] text-[#66758A]"
                                }`}
                              >
                                <RoleIcon
                                  className="w-4.5 h-4.5"
                                  aria-hidden="true"
                                />
                              </span>
                              <span className="min-w-0">
                                <span
                                  className={`block text-sm font-medium ${
                                    active ? "text-[#1672DC]" : "text-[#10243E]"
                                  }`}
                                >
                                  {role}
                                </span>
                                <span className="block text-[11px] text-[#66758A] truncate">
                                  {desc}
                                </span>
                              </span>
                              {active && (
                                <CheckCircle
                                  className="w-4 h-4 text-[#1672DC] absolute top-2 right-2"
                                  aria-hidden="true"
                                />
                              )}
                            </label>
                          )
                        })}
                      </div>
                      {regErrors.roles && (
                        <p className="text-xs text-[#E5484D] mt-1">
                          {regErrors.roles}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        className={`flex items-start gap-2 text-xs cursor-pointer ${
                          regErrors.terms ? "text-[#E5484D]" : "text-[#66758A]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={reg.terms}
                          onChange={(e) =>
                            setRegField("terms", e.target.checked)
                          }
                          className="mt-0.5 accent-[#1672DC] shrink-0"
                        />
                        <span>
                          I agree to the{" "}
                          <a
                            href="#"
                            className="text-[#1672DC] hover:underline"
                          >
                            Terms of Use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="text-[#1672DC] hover:underline"
                          >
                            Privacy Policy
                          </a>
                        </span>
                      </label>
                      {regErrors.terms && (
                        <p className="text-xs text-[#E5484D] mt-1">
                          {regErrors.terms}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className={primaryBtn}
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Create Account & Verify OTP"
                      )}
                    </button>
                  </form>
                </>
              )}

              {}
              {tab === "forgot" && (
                <>
                  <button
                    onClick={() => setTab("login")}
                    className="inline-flex items-center gap-1.5 text-sm text-[#66758A] hover:text-[#10243E] mb-5"
                  >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to
                    sign in
                  </button>
                  <h2
                    id="login-modal-title"
                    className="text-2xl font-bold tracking-tight text-[#10243E] mb-1"
                  >
                    Reset password
                  </h2>
                  <ForgotPasswordForm />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
