import type { IncomingMessage, ServerResponse } from "node:http"

import { isRateLimited, RateLimitUnavailable } from "./rate-limit.js"
import { InputError, routeTask } from "./router.js"

type RequestWithBody = IncomingMessage & { body?: unknown }

async function readBody(req: RequestWithBody): Promise<unknown> {
  if (req.body !== undefined) {
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body
  }
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > 100_000) throw new InputError("Request body is too large.")
    chunks.push(buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"))
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json; charset=utf-8")
  res.setHeader("Cache-Control", "no-store")
  res.end(JSON.stringify(body))
}

export default async function handler(req: RequestWithBody, res: ServerResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    send(res, 405, { error: "Use POST to route a task." })
    return
  }
  try {
    const input = await readBody(req)
    if (await isRateLimited(req)) {
      send(res, 429, { error: "This demo is receiving too many requests. Please try again later." })
      return
    }
    send(res, 200, await routeTask(input))
  } catch (error) {
    if (error instanceof InputError || error instanceof SyntaxError) {
      send(res, 400, { error: error instanceof SyntaxError ? "Invalid JSON body." : error.message })
      return
    }
    if (error instanceof RateLimitUnavailable) {
      send(res, 503, { error: "Routing is temporarily unavailable. Please try again later." })
      return
    }
    if (error instanceof Error && error.message.includes("TYPESAFE_API_KEY")) {
      send(res, 503, { error: "Routing is not configured on this server." })
      return
    }
    console.error("Routing failed", error)
    send(res, 502, { error: "Jev could not route this task. Please try again." })
  }
}
