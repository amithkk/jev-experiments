# Amith's Jev Routing Lab

Live demo: https://jevrouting.demos.amithkk.dev

A React demo that routes a task to relevant knowledge bases and agents. Each resource has a description, activation guidance, and exclusion guidance. Jev scores every resource independently in one TypeSafe request, and the UI lets you adjust the activation cutoff without paying for another request.

You can add, edit, and remove resources. The library is saved in your browser's local storage; it is not shared across visitors or devices.

## Run locally

```bash
cd jev-knowledge-router
npm install
cp .env.example .env.local
# Set TYPESAFE_API_KEY in .env.local
npm run dev
```

Open the URL printed by Vite. The API key stays on the server; do not use a `VITE_` prefix. Local development skips the hosted Vercel Firewall check.

```bash
npm test
npm run lint
npm run build
```

## Deploy on Vercel

Import the repository as a Vercel project with **Root Directory** set to `jev-knowledge-router`. Vercel should detect Vite; the React app is built with `npm run build`, and `api/route.ts` runs as a Vercel Function. Set `TYPESAFE_API_KEY` in the project's environment variables for production and preview deployments. Do not commit `.env.local`.

Before sending traffic, create and publish a Vercel Firewall rate-limit rule as described in the [Rate Limiting SDK guide](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting-sdk):

1. In the project's **Firewall → Configure**, add a custom rule with the `@vercel/firewall` condition.
2. Set **Rate limit ID** to `jev-route` (it must match `api/rate-limit.ts`).
3. Set a **fixed window** of **60 seconds**, a **request limit of 10**, and the **429** action.
4. Save, review, and **publish** the firewall changes. Create the rule for any environment in which you want the API to work. For preview testing, follow the SDK guide's preview-deployment requirements.

The function calls `@vercel/firewall` before Jev. If the rule is missing or the WAF check is unavailable, it returns 503 instead of making an unmetered TypeSafe call. A limited visitor receives 429. The counter is per visitor IP and [per Vercel region](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting); a visitor reaching multiple regions can exceed 10 requests in a minute. Vercel's standard WAF windows max out at 10 minutes, so this setup does **not** enforce a strict sitewide daily cap. If a daily global budget is needed, add a shared global store or another budget control before launch.

The UI sends the task and resource descriptions to this server endpoint, which submits them to TypeSafe/Jev. Treat the returned probabilities as routing signals to review, not as actions performed by the agents.
