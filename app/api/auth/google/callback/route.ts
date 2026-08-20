import { allowedEmail, createSession, googleConfig, sessionCookie, verifyGoogleIdToken } from "../../../../auth";

function cookies(request: Request): Map<string, string> {
  return new Map((request.headers.get("cookie") ?? "").split(";").map((part) => part.trim().split("=", 2)).filter(([name, value]) => Boolean(name && value)) as [string, string][]);
}

function loginError(request: Request, reason: string): Response {
  return Response.redirect(new URL(`/login?error=${encodeURIComponent(reason)}`, request.url));
}

export async function GET(request: Request) {
  const config = googleConfig();
  if (!config) return loginError(request, "config");
  const url = new URL(request.url);
  const stored = cookies(request);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const nonce = stored.get("google_oauth_nonce");
  const verifier = stored.get("google_oauth_verifier");
  if (!code || !state || state !== stored.get("google_oauth_state") || !nonce || !verifier) return loginError(request, "state");

  try {
    const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim() || `${url.origin}/api/auth/google/callback`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code", code_verifier: verifier }),
    });
    if (!tokenResponse.ok) throw new Error("Google token exchange failed");
    const tokens = await tokenResponse.json() as { id_token?: string };
    if (!tokens.id_token) throw new Error("Google did not return an ID token");
    const user = await verifyGoogleIdToken(tokens.id_token, nonce, config.clientId);
    if (!allowedEmail(user.email)) return loginError(request, "denied");
    const response = Response.redirect(new URL("/", request.url));
    response.headers.append("Set-Cookie", sessionCookie(await createSession(user), request.url));
    for (const name of ["google_oauth_state", "google_oauth_nonce", "google_oauth_verifier"]) {
      response.headers.append("Set-Cookie", `${name}=; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=0`);
    }
    return response;
  } catch (error) {
    console.error("Google sign-in failed", error);
    return loginError(request, "callback");
  }
}
