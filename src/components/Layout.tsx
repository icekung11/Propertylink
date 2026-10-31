"use client"
import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useApp } from "../context/AppContext"
import Header from "./Header"
import Footer from "./Footer"
import LoginModal from "./LoginModal"
import FavoritesDrawer from "./FavoritesDrawer"
import ToastContainer from "./Toast"

const WORKSPACE_PATHS = ["/buyer", "/seller", "/admin", "/owner"]

const ROLE_ROUTES: Record<string, string> = {
  BUYER: "/buyer",
  SELLER: "/seller",
  ADMIN: "/admin",
  OWNER: "/owner",
}

const PUBLIC_PATHS = [
  "/",
  "/properties",
  "/account",
  "/settings",
  "/reset-password",
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const {
    user,
    showLoginModal,
    setShowLoginModal,
    showFavoritesDrawer,
    setShowFavoritesDrawer,
  } = useApp()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!user) return
    const isBuyer = !user.roles.some(
      (r) => r === "SELLER" || r === "ADMIN" || r === "OWNER",
    )
    const staffRole = ["SELLER", "ADMIN", "OWNER"].find((r) =>
      user.roles.includes(r as never),
    )
    if (staffRole && pathname === "/") {
      router.replace(ROLE_ROUTES[staffRole])
      return
    }
    const onWorkspace = WORKSPACE_PATHS.some((p) => pathname.startsWith(p))
    const onPublic = PUBLIC_PATHS.some((p) =>
      p === "/" ? pathname === "/" : pathname.startsWith(p),
    )
    if (!onWorkspace && !onPublic && !isBuyer) {
      const dest = ROLE_ROUTES[staffRole ?? "BUYER"]
      router.replace(dest)
    }
  }, [user, pathname, router])

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F8FC]">
      <Header />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} />
      )}
      {showFavoritesDrawer && (
        <FavoritesDrawer onClose={() => setShowFavoritesDrawer(false)} />
      )}
      <ToastContainer />
    </div>
  )
}
