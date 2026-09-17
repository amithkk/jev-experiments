import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

import routeHandler from "./api/route.ts"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "")
  process.env.TYPESAFE_API_KEY ||= env.TYPESAFE_API_KEY

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "local-jev-api",
        configureServer(server) {
          server.middlewares.use("/api/route", (req, res) => {
            void routeHandler(req, res)
          })
        },
      },
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
  }
})
