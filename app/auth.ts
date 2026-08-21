import { headers } from "next/headers";

export type GoogleUser = {
  sub: string;
  email: string;
  name: string;
  picture?: string;
};

type GoogleClaims = GoogleUser & {
  aud: string;
  iss: string;
  exp: number;
  iat: number;
  nonce: string;
  email_verified: boolean;
};

const SESSION_COOKIE = "ajhub_session";
const encoder = new TextEncoder();

function base64UrlEncode(value: Uint8Array | string): string {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function parseCookies(header: string | null): Map<string, string> {
  return new Map((header ?? "").split(";").map((part) => part.trim().split("=", 2)).filter(([name, value]) => Boolean(name && value)) as [string, string][]);
}

function authSecret(): string | null {
  const secret = process.env.AUTH_SECRET?.trim();
  return secret && encoder.encode(secret).byteLength >= 32 ? secret : null;
}

async function hmac(value: string): Promise<Uint8Array> {
  const secret = authSecret();
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

export async function createSession(user: GoogleUser): Promise<string> {
  const payload = base64UrlEncode(JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8 }));
  return `${payload}.${base64UrlEncode(await hmac(payload))}`;
}

export async function readSession(cookieHeader: string | null): Promise<GoogleUser | null> {
  const token = parseCookies(cookieHeader).get(SESSION_COOKIE);
  if (!token || !authSecret()) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;

  try {
    const key = await crypto.subtle.importKey("raw", encoder.encode(authSecret()!), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("HMAC", key, base64UrlDecode(signature) as BufferSource, encoder.encode(payload));
    if (!valid) return null;
    const session = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as GoogleUser & { exp: number };
    if (!session.sub || !session.email || !session.name || session.exp <= Date.now() / 1000) return null;
    return { sub: session.sub, email: session.email, name: session.name, picture: session.picture };
  } catch {
    return null;
  }
}

export async function getGoogleUser(): Promise<GoogleUser | null> {
  const requestHeaders = await headers();
  return readSession(requestHeaders.get("cookie"));
}

export async function getRequestUser(request: Request): Promise<GoogleUser | null> {
  return readSession(request.headers.get("cookie"));
}

export function sessionCookie(value: string, requestUrl: string, maxAge = 60 * 60 * 8): string {
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function allowedEmail(email: string): boolean {
  const allowed = (process.env.GOOGLE_ALLOWED_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret || !authSecret()) return null;
  return { clientId, clientSecret };
}

export async function verifyGoogleIdToken(token: string, expectedNonce: string, clientId: string): Promise<GoogleUser> {
  const [encodedHeader, encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature || extra) throw new Error("Malformed Google ID token");
  const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedHeader))) as { alg?: string; kid?: string };
  const claims = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload))) as GoogleClaims;
  if (header.alg !== "RS256" || !header.kid) throw new Error("Unsupported Google ID token");

  const keyResponse = await fetch("https://www.googleapis.com/oauth2/v3/certs", { headers: { Accept: "application/json" } });
  if (!keyResponse.ok) throw new Error("Google signing keys are unavailable");
  const keySet = await keyResponse.json() as { keys: (JsonWebKey & { kid?: string })[] };
  const jwk = keySet.keys.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error("Google signing key was not found");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const signed = encoder.encode(`${encodedHeader}.${encodedPayload}`);
  const validSignature = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, base64UrlDecode(encodedSignature) as BufferSource, signed);
  const now = Math.floor(Date.now() / 1000);
  const validIssuer = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
  if (!validSignature || !validIssuer || claims.aud !== clientId || claims.exp <= now || claims.iat > now + 60 || claims.nonce !== expectedNonce || !claims.email_verified) {
    throw new Error("Google ID token validation failed");
  }
  if (!claims.sub || !claims.email) throw new Error("Google profile is incomplete");
  return { sub: claims.sub, email: claims.email, name: claims.name || claims.email, picture: claims.picture };
}

export function randomToken(bytes = 32): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function pkceChallenge(verifier: string): Promise<string> {
  return base64UrlEncode(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(verifier))));
}
