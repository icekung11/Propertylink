import { mkdir, writeFile, unlink } from "node:fs/promises"
import path from "node:path"
import { randomUUID } from "node:crypto"

export const imageDirectory = () =>
  path.resolve(
    process.env.UPLOAD_DIRECTORY || path.join(process.cwd(), ".uploads"),
  )
export async function storeImage(file: File) {
  if (file.size < 12 || file.size > 10 * 1024 * 1024)
    throw new Error("Images must be between 12 bytes and 10 MB.")
  const data = Buffer.from(await file.arrayBuffer())
  const extension = data.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
    ? "jpg"
    : data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? "png"
      : data.toString("ascii", 0, 4) === "RIFF" &&
          data.toString("ascii", 8, 12) === "WEBP"
        ? "webp"
        : null
  if (!extension)
    throw new Error("Only JPEG, PNG and WebP image files are supported.")
  await mkdir(imageDirectory(), { recursive: true })
  const key = `${randomUUID()}.${extension}`
  await writeFile(path.join(imageDirectory(), key), data, { flag: "wx" })
  return { key, url: `/api/media/${key}` }
}
export async function removeStoredImage(key: string) {
  if (/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(key))
    await unlink(path.join(imageDirectory(), key)).catch(() => undefined)
}
