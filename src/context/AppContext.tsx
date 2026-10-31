"use client"
// Visitors without a valid session start signed out.
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react"
import { PreferencesProvider } from './PreferencesContext'
import type {
  User,
  Property,
  Notification,
  Inquiry,
  InquiryStatus,
} from "../types"

interface Toast {
  id: string
  message: string
  type: "success" | "error" | "info"
}

interface AppContextValue {
  user: User | null
  login: (user: User) => void
  updateProfileName: (firstName: string, lastName: string) => void
  logout: () => void
  favorites: string[]
  toggleFavorite: (propertyId: string) => void
  isFavorite: (propertyId: string) => boolean
  notifications: Notification[]
  unreadCount: number
  markNotificationRead: (id: string) => void
  markAllRead: () => void
  showLoginModal: boolean
  setShowLoginModal: (v: boolean) => void
  showFavoritesDrawer: boolean
  setShowFavoritesDrawer: (v: boolean) => void
  showNotifications: boolean
  setShowNotifications: (v: boolean) => void
  toasts: Toast[]
  showToast: (message: string, type?: Toast["type"]) => void
  inquiries: Inquiry[]
  addInquiry: (property: Property, message: string) => Promise<boolean>
  updateInquiryStatus: (id: string, status: InquiryStatus) => Promise<boolean>
  replyToInquiry: (id: string, reply: string) => Promise<boolean>
  selectedProperty: Property | null
  setSelectedProperty: (p: Property | null) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [favorites, setFavorites] = useState<string[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showFavoritesDrawer, setShowFavoritesDrawer] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null,
  )
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const sessionGeneration = useRef(0)

  useEffect(() => {
    let cancelled = false
    const generation = sessionGeneration.current
    const restoreSession = async () => {
      try {
        const profileResponse = await fetch("/api/users/me")
        if (!profileResponse.ok) return
        const profileData = await profileResponse.json()
        const profile = profileData.user
        if (
          !profile ||
          cancelled ||
          generation !==
            sessionGeneration.current
        )
          return
        const restoredUser: User = {
          id: profile.id,
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          phone: profile.phone,
          roles: profile.roles,
          status: profile.status.toUpperCase(),
          createdAt: profile.createdAt,
        }
        setUser(restoredUser)
      } catch {}
    }
    void restoreSession()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setFavorites([])
    setNotifications([])
    setInquiries([])
    if (!user) return
    const restoredUser = user
    const loadCollections = async () => {
      const requests: Promise<void>[] = [
        fetch("/api/notifications").then(async (response) => {
          if (cancelled) return
          if (!response.ok) throw new Error("Unable to load notifications")
          const data = await response.json()
          const rows: Notification[] = data.notifications.map((item: any) => ({
            id: item.id,
            userId: item.userId,
            type:
              item.type === "new_inquiry"
                ? "buyer_inquiry"
                : item.type === "listing_revision_required"
                  ? "revision_requested"
                  : item.type === "inquiry_reply"
                    ? "seller_response"
                    : item.type,
            title: item.title,
            message: item.body || "",
            read: item.isRead,
            createdAt: item.createdAt,
            linkUrl: item.payload?.listing_id
              ? `/properties/${item.payload.listing_id}`
              : undefined,
          }))
          if (!cancelled) setNotifications(rows)
        }),
      ]
      if (restoredUser.roles.includes("BUYER")) {
        requests.push(
          fetch("/api/buyer/favorites").then(async (response) => {
            if (cancelled) return
            if (!response.ok) throw new Error("Unable to load favorites")
            const data = await response.json()
            if (!cancelled)
              setFavorites(
                data.favorites.map((item: { id: string }) => item.id),
              )
          }),
        )
      }
      if (
        restoredUser.roles.includes("BUYER") ||
        restoredUser.roles.includes("SELLER")
      ) {
        requests.push(
          fetch("/api/inquiries").then(async (response) => {
            if (cancelled) return
            if (!response.ok) throw new Error("Unable to load inquiries")
            const data = await response.json()
            const rows: Inquiry[] = data.inquiries.map((item: any) => ({
              id: item.id,
              propertyId: item.listingId,
              propertyTitle: item.listings?.title || "Property inquiry",
              propertyImage: item.listings?.images?.[0]?.image_url || "",
              buyerId: item.buyerId,
              buyerName:
                `${item.buyer?.firstName || ""} ${item.buyer?.lastName || ""}`.trim(),
              buyerEmail: "",
              buyerPhone: "",
              sellerId: item.sellerId,
              sellerName:
                `${item.users_inquiries_seller_idTousers?.firstName || ""} ${item.users_inquiries_seller_idTousers?.lastName || ""}`.trim(),
              message: item.message,
              status:
                item.status === "PENDING"
                  ? "NEW"
                  : item.status === "REPLIED"
                    ? "CONTACTED"
                    : item.status,
              createdAt: item.createdAt,
              reply:
                item.inquiry_messages?.[0]?.sender_id === item.sellerId
                  ? item.inquiry_messages[0].message
                  : undefined,
              repliedAt:
                item.inquiry_messages?.[0]?.sender_id === item.sellerId
                  ? item.inquiry_messages[0].created_at
                  : undefined,
            }))
            if (!cancelled) setInquiries(rows)
          }),
        )
      }
      const results = await Promise.allSettled(requests)
      if (
        !cancelled &&
        results.some((result) => result.status === "rejected")
      ) {
        const id = crypto.randomUUID()
        setToasts((previous) => [
          ...previous,
          {
            id,
            message:
              "Some account data could not be loaded. Please refresh to retry.",
            type: "error",
          },
        ])
        setTimeout(
          () =>
            setToasts((previous) =>
              previous.filter((toast) => toast.id !== id),
            ),
          6000,
        )
      }
    }
    void loadCollections()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const login = useCallback((u: User) => {
    sessionGeneration.current += 1
    setUser(u)
    setShowLoginModal(false)
  }, [])

  const updateProfileName = useCallback(
    (firstName: string, lastName: string) => {
      setUser((current) =>
        current ? { ...current, firstName, lastName } : current,
      )
    },
    [],
  )

  const logout = useCallback(() => {
    sessionGeneration.current += 1
    setUser(null)
    setFavorites([])
    setNotifications([])
    setInquiries([])
    void fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined)
  }, [])

  const showToastFn = useCallback(
    (message: string, type: Toast["type"] = "success") => {
      const id = crypto.randomUUID()
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 3000)
    },
    [],
  )

  const toggleFavorite = useCallback(
    async (propertyId: string) => {
      if (!user) {
        setShowLoginModal(true)
        return
      }
      if (!user.roles.includes("BUYER")) {
        showToastFn("Only buyer accounts can save properties.", "error")
        return
      }
      const saved = favorites.includes(propertyId)
      try {
        const response = await fetch(
          saved
            ? `/api/favorites/${encodeURIComponent(propertyId)}`
            : "/api/favorites",
          {
            method: saved ? "DELETE" : "POST",
            headers: saved ? undefined : { "Content-Type": "application/json" },
            body: saved ? undefined : JSON.stringify({ listingId: propertyId }),
          },
        )
        if (!response.ok) throw new Error("Unable to update favorites.")
        setFavorites((prev) =>
          saved
            ? prev.filter((id) => id !== propertyId)
            : [...prev, propertyId],
        )
        showToastFn(
          saved
            ? "Property removed from favorites."
            : "Property saved to favorites!",
          "success",
        )
      } catch (error) {
        showToastFn(
          error instanceof Error
            ? error.message
            : "Unable to update favorites.",
          "error",
        )
      }
    },
    [user, favorites, showToastFn],
  )

  const isFavorite = useCallback(
    (propertyId: string) => favorites.includes(propertyId),
    [favorites],
  )

  const markNotificationRead = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(
          `/api/notifications/${encodeURIComponent(id)}/read`,
          { method: "PUT" },
        )
        if (!response.ok) throw new Error("Unable to update notification.")
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
        )
      } catch {
        showToastFn("Unable to update notification.", "error")
      }
    },
    [showToastFn],
  )

  const markAllRead = useCallback(async () => {
    const unread = notifications.filter((notification) => !notification.read)
    const results = await Promise.all(
      unread.map((notification) =>
        fetch(
          `/api/notifications/${encodeURIComponent(notification.id)}/read`,
          { method: "PUT" },
        ),
      ),
    )
    if (results.some((response) => !response.ok)) {
      showToastFn("Some notifications could not be updated.", "error")
      return
    }
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true })),
    )
  }, [notifications, showToastFn])

  const addInquiry = useCallback(
    async (property: Property, message: string) => {
      if (!user) {
        setShowLoginModal(true)
        return false
      }
      if (!user.roles.includes("BUYER")) {
        showToastFn("Only buyer accounts can contact a seller.", "error")
        return false
      }
      try {
        const response = await fetch("/api/inquiries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId: property.id, message }),
        })
        const data = await response.json()
        if (!response.ok)
          throw new Error(data.error || "Unable to send inquiry.")
        const inq: Inquiry = {
          id: data.inquiry.id,
          propertyId: property.id,
          propertyTitle: property.title,
          propertyImage: property.coverImage,
          buyerId: user.id,
          buyerName: `${user.firstName} ${user.lastName}`,
          buyerEmail: user.email,
          buyerPhone: user.phone,
          sellerId: property.sellerId,
          sellerName: property.sellerName,
          message,
          status: "NEW",
          createdAt: data.inquiry.createdAt,
        }
        setInquiries((prev) => [inq, ...prev])
        return true
      } catch (error) {
        showToastFn(
          error instanceof Error ? error.message : "Unable to send inquiry.",
          "error",
        )
        return false
      }
    },
    [user, showToastFn],
  )

  const updateInquiryStatus = useCallback(
    async (id: string, status: InquiryStatus) => {
      try {
        const response = await fetch(
          `/api/inquiries/${encodeURIComponent(id)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          },
        )
        if (!response.ok) throw new Error("Unable to update inquiry status.")
        setInquiries((prev) =>
          prev.map((inquiry) =>
            inquiry.id === id ? { ...inquiry, status } : inquiry,
          ),
        )
        return true
      } catch (error) {
        showToastFn(
          error instanceof Error
            ? error.message
            : "Unable to update inquiry status.",
          "error",
        )
        return false
      }
    },
    [showToastFn],
  )

  const replyToInquiry = useCallback(
    async (id: string, reply: string) => {
      try {
        const response = await fetch(
          `/api/inquiries/${encodeURIComponent(id)}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: reply }),
          },
        )
        if (!response.ok) throw new Error("Unable to send reply.")
        const data = await response.json()
        setInquiries((prev) =>
          prev.map((inquiry) =>
            inquiry.id === id
              ? {
                  ...inquiry,
                  reply: data.message.message,
                  repliedAt: data.message.created_at,
                  status: "CONTACTED",
                }
              : inquiry,
          ),
        )
        return true
      } catch (error) {
        showToastFn(
          error instanceof Error ? error.message : "Unable to send reply.",
          "error",
        )
        return false
      }
    },
    [showToastFn],
  )

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <AppContext.Provider
      value={{
        user,
        login,
        updateProfileName,
        logout,
        favorites,
        toggleFavorite,
        isFavorite,
        notifications,
        unreadCount,
        markNotificationRead,
        markAllRead,
        showLoginModal,
        setShowLoginModal,
        showFavoritesDrawer,
        setShowFavoritesDrawer,
        showNotifications,
        setShowNotifications,
        toasts,
        showToast: showToastFn,
        inquiries,
        addInquiry,
        updateInquiryStatus,
        replyToInquiry,
        selectedProperty,
        setSelectedProperty,
      }}
    >
      <PreferencesProvider userId={user?.id}>{children}</PreferencesProvider>
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}
