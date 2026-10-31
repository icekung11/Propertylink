"use client";
import { usePreferences } from "@/context/PreferencesContext";
import { useEffect, useState } from "react"
import { useApp } from "@/context/AppContext"

export default function ListingEditor({
  id,
  onClose,
  onSaved,
}: {
  id: string
  onClose: () => void
  onSaved: () => void
}) {
  const { translateText } = usePreferences();

  const { showToast } = useApp()
  const [listing, setListing] = useState<Record<string, any> | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [categories, setCategories] = useState<Array<{
    id: string
    name: string
  }>>([])
  const [locations, setLocations] = useState<Array<{
    id: string
    name: string
  }>>([])
  useEffect(() => {
    const controller = new AbortController()
    Promise.all(
      ["/api/categories", "/api/locations"].map(async (url) => {
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok)
          throw new Error("Unable to load categories and locations.")
        return response.json()
      }),
    )
      .then(([categoryData, locationData]) => {
        setCategories(categoryData.categories)
        setLocations(locationData.locations)
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.message)
      })
    return () => controller.abort()
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/seller/listings/${id}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)
        setListing(data.listing)
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.message)
      })
    return () => controller.abort()
  }, [id])
  const labels: Record<string, string> = {
    title: "Title",
    description: "Description",
    price: "Price",
    bedrooms: "Bedrooms",
    bathrooms: "Bathrooms",
    landAreaSqwa: "Land area (sq. wah)",
    usableAreaSqm: "Usable area (sq. m)",
    contactPhone: "Contact phone",
    contactEmail: "Contact email",
    contactLine: "LINE",
  }
  const changePhotos = async (imageId: string, remove: boolean) => {
    if (!listing || busy) return
    setBusy(true)
    setError("")
    try {
      const photos = remove
        ? listing.images.filter((image: any) => image.id !== imageId)
        : [
            listing.images.find((image: any) => image.id === imageId),
            ...listing.images.filter((image: any) => image.id !== imageId),
          ]
      const response = await fetch(
        `/api/listings/${id}/images${remove ? "?imageId=" + imageId : ""}`,
        {
          method: remove ? "DELETE" : "PATCH",
          headers: remove ? undefined : { "Content-Type": "application/json" },
          body: remove
            ? undefined
            : JSON.stringify({
                imageIds: photos.map((image: any) => image.id),
              }),
        },
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setListing({ ...listing, images: photos })
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Unable to update photos.",
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={translateText("Edit listing")}
    >
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-4">
          <h2 className="font-semibold">{translateText("Edit Listing")}</h2>
          <button onClick={onClose} disabled={busy}>
            {translateText("Close")}</button>
        </div>
        {error && (
          <p role="alert" className="text-red-600 mb-3">
            {translateText(error)}
          </p>
        )}
        {!listing ? (
          <p>Loading listing…</p>
        ) : (
          <form
            className="space-y-3"
            onSubmit={async (event) => {
              event.preventDefault()
              if (busy) return
              setBusy(true)
              setError("")
              const data = new FormData(event.currentTarget)
              const body = Object.fromEntries(
                Array.from(data.entries()).filter(
                  ([key, value]) =>
                    value !== "" ||
                    [
                      "description",
                      "contactPhone",
                      "contactEmail",
                      "contactLine",
                    ].includes(key),
                ),
              )
              try {
                const response = await fetch(`/api/seller/listings/${id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                })
                const result = await response.json()
                if (!response.ok) throw new Error(result.error)
                showToast("Listing saved.")
                onSaved()
              } catch (failure) {
                setError(
                  failure instanceof Error
                    ? failure.message
                    : "Unable to save listing.",
                )
              } finally {
                setBusy(false)
              }
            }}
          >
            {Object.keys(labels).map((name) => (
              <label key={name} className="block text-sm">
                {labels[name]}
                {name === "description" ? (
                  <textarea
                    name={name}
                    defaultValue={listing[name] || ""}
                    maxLength={20000}
                    className="w-full block border rounded-lg p-2"
                  />
                ) : (
                  <input
                    name={name}
                    required={["title", "price"].includes(name)}
                    type={
                      [
                        "price",
                        "bedrooms",
                        "bathrooms",
                        "landAreaSqwa",
                        "usableAreaSqm",
                      ].includes(name)
                        ? "number"
                        : name === "contactEmail"
                          ? "email"
                          : "text"
                    }
                    min={0}
                    step={["bedrooms", "bathrooms"].includes(name) ? 1 : "any"}
                    defaultValue={listing[name] ?? ""}
                    className="w-full block border rounded-lg p-2"
                  />
                )}
              </label>
            ))}
            <label className="block text-sm">
              Category
              <select
                name="categoryId"
                defaultValue={listing.categoryId}
                required
                className="w-full block border rounded-lg p-2"
              >
                <option value={listing.categoryId}>
                  {listing.category.name}
                </option>
                {categories
                  .filter(
                    (category) =>
                      String(category.id) !== String(listing.categoryId),
                  )
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-sm">
              Location
              <select
                name="locationId"
                defaultValue={listing.location_id}
                required
                className="w-full block border rounded-lg p-2"
              >
                <option value={listing.location_id}>
                  {listing.locations.name}
                </option>
                {locations
                  .filter(
                    (location) =>
                      String(location.id) !== String(listing.location_id),
                  )
                  .map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
              </select>
            </label>
            <p className="text-sm">Photos: {listing.images.length}/15</p>
            <div className="grid grid-cols-3 gap-2">
              {listing.images.map((image: any, index: number) => (
                <div key={image.id} className="border rounded-lg p-2">
                  <img
                    src={image.image_url}
                    alt={`Listing photo ${index + 1}`}
                    className="h-20 w-full object-cover rounded"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => changePhotos(image.id, false)}
                    className="text-xs text-blue-600 mt-1"
                  >
                    {index === 0 ? "Cover" : "Make cover"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => changePhotos(image.id, true)}
                    className="text-xs text-red-600 block"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <label className="block text-sm">
              Add photos
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={async (event) => {
                  const input = event.currentTarget
                  const files = Array.from(input.files || [])
                  if (!files.length) return
                  if (
                    files.length + listing.images.length > 15 ||
                    files.some((file) => file.size > 10 * 1024 * 1024)
                  ) {
                    setError("Maximum 15 images, 10 MB each.")
                    return
                  }
                  const data = new FormData()
                  files.forEach((file) => data.append("files", file))
                  setBusy(true)
                  setError("")
                  try {
                    const response = await fetch(`/api/listings/${id}/images`, {
                      method: "POST",
                      body: data,
                    })
                    const result = await response.json()
                    if (!response.ok) throw new Error(result.error)
                    setListing({
                      ...listing,
                      images: [...listing.images, ...result.images],
                    })
                    showToast("Photos uploaded.")
                  } catch (failure) {
                    setError(
                      failure instanceof Error
                        ? failure.message
                        : "Upload failed.",
                    )
                  } finally {
                    setBusy(false)
                    input.value = ""
                  }
                }}
                className="block mt-2"
              />
            </label>
            <button
              disabled={busy}
              className="bg-[#1672DC] text-white px-5 py-2 rounded-lg disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
