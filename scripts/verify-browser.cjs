const WebSocket = require("next/dist/compiled/ws")
// Headless Edge/Chrome smoke test using CDP; no downloaded browser or test dependency.
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict")
const { spawn } = require("node:child_process")
const { randomUUID, randomBytes, scryptSync } = require("node:crypto")
require("@next/env").loadEnvConfig(process.cwd())
const { PrismaClient } = require("@prisma/client")
const p = new PrismaClient()
const base = process.env.AUDIT_BASE_URL || "http://localhost:3000"
const browserPath =
  process.env.TEST_BROWSER_PATH ||
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
const directory = path.resolve(".tmp-browser-" + randomUUID())
const password = randomBytes(20).toString("hex")
let browser,
  ws,
  user,
  passed = 0
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
function check(label, value) {
  assert.ok(value, label)
  passed++
  console.log("PASS " + label)
}
async function main() {
  if (!fs.existsSync(browserPath))
    throw Error("Set TEST_BROWSER_PATH to an installed Chromium browser.")
  const salt = randomBytes(16).toString("hex")
  user = await p.user.create({
    data: {
      email: `browser-${randomUUID()}@example.invalid`,
      phone: `09${Math.floor(Math.random() * 1e8)
        .toString()
        .padStart(8, "0")}`,
      firstName: "Browser",
      lastName: "Fixture",
      status: "active",
      pdpa_accepted_at: new Date(),
      phone_verified_at: new Date(),
      password_hash: `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`,
    },
  })
  const role = await p.role.findUniqueOrThrow({ where: { code: "buyer" } })
  await p.userRole.create({ data: { userId: user.id, roleId: role.id } })
  const listing = await p.listing.findFirstOrThrow({
    where: { status: "APPROVED" },
  })
  await p.favorite.create({ data: { userId: user.id, listingId: listing.id } })
  const marker = "Browser verification " + randomUUID()
  await p.notification.create({
    data: {
      userId: user.id,
      type: "account_verified",
      title: marker,
      body: "Temporary browser fixture",
      isRead: false,
    },
  })
  browser = spawn(
    browserPath,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--remote-debugging-port=0",
      "--user-data-dir=" + directory,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-networking",
      "about:blank",
    ],
    { windowsHide: true, stdio: "ignore" },
  )
  let port
  for (let i = 0; i < 100; i++) {
    try {
      port = fs
        .readFileSync(path.join(directory, "DevToolsActivePort"), "utf8")
        .split("\n")[0]
      break
    } catch {
      await delay(100)
    }
  }
  if (!port) throw Error("Browser did not start.")
  const target = await (
    await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {
      method: "PUT",
    })
  ).json()
  ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true })
    ws.addEventListener("error", reject, { once: true })
  })
  let sequence = 0
  const pending = new Map()
  const failures = []
  ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data)
    if (data.id) {
      const entry = pending.get(data.id)
      if (entry) {
        pending.delete(data.id)
        clearTimeout(entry.timer)
        data.error
          ? entry.reject(Error(data.error.message))
          : entry.resolve(data.result)
      }
    }
    if (data.method === "Runtime.exceptionThrown") {
      const description =
        data.params.exceptionDetails.exception?.description ||
        data.params.exceptionDetails.text
      failures.push(description)
      if (process.env.DEBUG_BROWSER)
        console.log("Browser exception:", description.slice(0, 2000))
    }
  })
  const command = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++sequence
      const timer = setTimeout(() => {
        pending.delete(id)
        reject(Error("Browser command timed out: " + method))
      }, 20000)
      pending.set(id, { resolve, reject, timer })
      ws.send(JSON.stringify({ id, method, params }))
    })
  const evaluate = async (expression) => {
    const result = await command("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (result.exceptionDetails) throw Error("Browser evaluation failed")
    return result.result.value
  }
  const wait = async (expression, label) => {
    for (let i = 0; i < 150; i++) {
      if (await evaluate(expression)) return
      await delay(200)
    }
    console.log(
      "Browser page:",
      (await evaluate("document.body.innerText")).slice(0, 1200),
    )
    throw Error("Timed out: " + label)
  }
  await command("Page.enable")
  await command("Page.bringToFront")
  await command("Runtime.enable")
  await command("Network.enable")
  await command("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await command("Page.navigate", { url: base + "/properties" })
  await wait(
    `!!Array.from(document.querySelectorAll('header button')).find(button=>button.textContent.trim()==='Login')`,
    "anonymous navigation",
  )
  await wait(
    `!!document.querySelector('button[aria-label="Save to favorites"]')`,
    "hydrated property results",
  )
  await evaluate(
    `Array.from(document.querySelectorAll('header button')).find(button=>button.textContent.trim()==='Login').click()`,
  )
  await wait(`!!document.getElementById('login-email')`, "login modal")
  await evaluate(
    `(()=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;for(const [id,value] of ${JSON.stringify(
      [
        ["login-email", user.email],
        ["login-password", password],
      ],
    )}){const input=document.getElementById(id);setter.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));}})()`,
  )
  await evaluate(
    `document.getElementById('login-email').closest('form').requestSubmit()`,
  )
  await wait(
    `!!document.querySelector('nav[aria-label="Buyer navigation"]')`,
    "buyer sign in",
  )
  check("Browser password sign-in reaches Buyer workspace", true)
  await wait(
    `!!document.querySelector('button[aria-label="Remove from favorites"]')`,
    "favorites hydration",
  )
  check("Saved favorites hydrate immediately after sign-in", true)
  await wait(
    `!!Array.from(document.querySelectorAll('button')).find(button=>(button.getAttribute('aria-label')||'').includes('1 unread'))`,
    "notification hydration",
  )
  check("Unread notifications hydrate after sign-in", true)
  await evaluate(
    `Array.from(document.querySelectorAll('button')).find(button=>(button.getAttribute('aria-label')||'').includes('1 unread')).click()`,
  )
  await wait(
    `document.body.textContent.includes(${JSON.stringify(marker)})`,
    "notification fixture",
  )
  check("Notification dropdown renders persisted data", true)
  await wait("Array.from(document.querySelectorAll('main img')).every(image=>image.complete&&image.naturalWidth>0)","listing photos or fallback")
  check("Listing photos show a valid image or placeholder",true)
  await evaluate(
    `document.querySelector('button[aria-label="Close notifications"]').click()`,
  )
  check("No uncaught browser exceptions", failures.length === 0)
  await command("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await delay(300)
  check(
    "Mobile viewport has no horizontal overflow",
    await evaluate("document.documentElement.scrollWidth<=window.innerWidth"),
  )
  const screenshot = await command("Page.captureScreenshot", { format: "png" })
  fs.mkdirSync("artifacts", { recursive: true })
  fs.writeFileSync(
    "artifacts/buyer-mobile.png",
    Buffer.from(screenshot.data, "base64"),
  )
  console.log(`Completed ${passed} browser checks.`)
  await command("Browser.close").catch(() => {})
}
main()
  .catch((error) => {
    console.error("Browser verification failed:", error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    if (ws) ws.close()
    if (browser) browser.kill()
    if (user) {
      await p.audit_logs.deleteMany({
        where: { OR: [{ actor_user_id: user.id }, { entity_id: user.id }] },
      })
      await p.user.deleteMany({ where: { id: user.id } })
    }
    await p.$disconnect()
    // Only remove the exact generated browser profile within this workspace.
    if (directory.startsWith(process.cwd() + path.sep + ".tmp-browser-")) {
      for (let i = 0; i < 10; i++) {
        try {
          fs.rmSync(directory, { recursive: true, force: true })
          break
        } catch {
          await delay(300)
        }
      }
    }
    console.log("Temporary browser account and profile removed.")
  })
