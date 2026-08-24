# vinext-starter

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

### Turso-backed launchpad links

The launchpad URL editor stores its values in Turso. Configure these server-side
environment variables locally and in the deployed Sites project:

```bash
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-database-token
```

The `/api/links` endpoint creates and seeds the `launchpad_links` table on its
first successful request, so no separate migration is required.

## Google authentication

The dashboard and its personal settings APIs require a Google session. Create a
Google OAuth 2.0 Web application and configure this exact authorized redirect
URI for production:

```text
https://ajhub.ca/api/auth/google/callback
```

Configure these server-side environment variables locally and in the deployed
Sites project:

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_ALLOWED_EMAILS=you@example.com
AUTH_SECRET=a-long-random-secret-at-least-32-bytes
```

Separate multiple allowed emails with commas. Access is denied when the
allowlist is empty. For a deployment whose public origin cannot be inferred
from the request, set `GOOGLE_REDIRECT_URI` to the full callback URL above.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

Signed-in visitors receive both `oai-authenticated-user-id` and `oai-authenticated-user-email`. Private Sites require every visitor to sign in; public Sites may also have anonymous visitors, for whom neither header is present.

The user ID is stable for the same user on the same Site and different across Sites. Email and name are intended for display or contact purposes.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm run cloudflare:check`: build and validate the Cloudflare Worker bundle without deploying
- `npm run cloudflare:dev`: build and run the production Worker locally
- `npm run cloudflare:deploy`: build and deploy to Cloudflare Workers
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Deploy to Cloudflare Workers

The app uses dynamic pages and API routes, so deploy it to the Cloudflare
Workers Free plan rather than as a static-only Pages export.

1. Sign in to Cloudflare once:

   ```bash
   npx wrangler login
   ```

2. Add the production secrets. Run each command and paste the corresponding
   value when prompted:

   ```bash
   npx wrangler secret put TURSO_DATABASE_URL
   npx wrangler secret put TURSO_AUTH_TOKEN
   npx wrangler secret put GOOGLE_CLIENT_ID
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   npx wrangler secret put GOOGLE_ALLOWED_EMAILS
   npx wrangler secret put AUTH_SECRET
   ```

3. Validate the Worker bundle, then deploy it:

   ```bash
   npm run cloudflare:check
   npm run cloudflare:deploy
   ```

4. Add the deployed callback URL to the Google OAuth application's authorized
   redirect URIs:

   ```text
   https://<your-worker-or-custom-domain>/api/auth/google/callback
   ```

   Set `GOOGLE_REDIRECT_URI` as another Worker secret only when the callback
   origin cannot be inferred from the incoming request.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
