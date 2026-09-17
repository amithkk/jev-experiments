import assert from "node:assert/strict"
import test from "node:test"

import { isRateLimited, RATE_LIMIT_ID, RateLimitUnavailable } from "../api/rate-limit.ts"

const request = {
  headers: { host: "demo.vercel.app", "x-vercel-forwarded-for": "203.0.113.7" },
  socket: { remoteAddress: "127.0.0.1" },
} as Parameters<typeof isRateLimited>[0]

test("local development does not call the hosted firewall", async () => {
  assert.equal(await isRateLimited(request, { hosted: false, check: async () => { throw new Error("called") } }), false)
})

test("hosted requests use the published rule and a trusted visitor IP", async () => {
  const result = await isRateLimited(request, {
    hosted: true,
    check: async (id, options) => {
      assert.equal(id, RATE_LIMIT_ID)
      assert.equal(options?.rateLimitKey, "203.0.113.7")
      assert.equal(options?.headers instanceof Headers, true)
      return { rateLimited: true }
    },
  })
  assert.equal(result, true)
})

test("hosted requests fail closed if the firewall rule is missing", async () => {
  await assert.rejects(
    isRateLimited(request, { hosted: true, check: async () => ({ rateLimited: false, error: "not-found" }) }),
    RateLimitUnavailable,
  )
})

test("hosted requests fail closed when the firewall check fails", async () => {
  await assert.rejects(
    isRateLimited(request, { hosted: true, check: async () => { throw new Error("network") } }),
    RateLimitUnavailable,
  )
})
