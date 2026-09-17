import type { IncomingHttpHeaders } from "node:http"

import { checkRateLimit } from "@vercel/firewall"

export const RATE_LIMIT_ID = "jev-route"

export class RateLimitUnavailable extends Error {}

type RequestHeaders = { headers: IncomingHttpHeaders; socket: { remoteAddress?: string } }
type Check = typeof checkRateLimit

function trustedVisitorIp(req: RequestHeaders): string {
  const forwarded = req.headers["x-vercel-forwarded-for"]
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded
  const realIp = req.headers["x-real-ip"]
  return ip?.split(",")[0]?.trim() || (Array.isArray(realIp) ? realIp[0] : realIp) || req.socket.remoteAddress || "unknown"
}

export async function isRateLimited(
  req: RequestHeaders,
  options: { hosted?: boolean; check?: Check } = {},
): Promise<boolean> {
  // The SDK only checks a published Vercel Firewall rule. Local Vite has no WAF.
  if (!(options.hosted ?? process.env.VERCEL === "1")) return false

  const headers = new Headers()
  for (const [name, value] of Object.entries(req.headers)) {
    if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(", ") : value)
  }

  try {
    const result = await (options.check ?? checkRateLimit)(RATE_LIMIT_ID, {
      headers,
      rateLimitKey: trustedVisitorIp(req),
    })
    // A missing dashboard rule must never leave the public API unprotected.
    if (result.error === "not-found") throw new RateLimitUnavailable("Publish the jev-route Vercel Firewall rule before routing requests.")
    return result.rateLimited
  } catch (error) {
    if (error instanceof RateLimitUnavailable) throw error
    throw new RateLimitUnavailable("Vercel Firewall rate limit check failed.")
  }
}
