import { googleConfig, pkceChallenge, randomToken } from "../../../auth";

const OAUTH_COOKIE_AGE = 10 * 60;

function oauthCookie(name: string, value: string, secure: boolean): string {
  return `${name}=${value}; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=${OAUTH_COOKIE_AGE}${secure ? "; Secure" : ""}`;
}

export async function GET(request: Request) {
  const config = googleConfig();
  if (!config) return Response.redirect(new URL("/login?error=config", request.url));
  const requestUrl = new URL(request.url);
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim() || `${requestUrl.origin}/api/auth/google/callback`;
  const state = randomToken();
  const nonce = randomToken();
  const verifier = randomToken(48);
  const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorization.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: await pkceChallenge(verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();

  const response = Response.redirect(authorization);
  const secure = requestUrl.protocol === "https:";
  response.headers.append("Set-Cookie", oauthCookie("google_oauth_state", state, secure));
  response.headers.append("Set-Cookie", oauthCookie("google_oauth_nonce", nonce, secure));
  response.headers.append("Set-Cookie", oauthCookie("google_oauth_verifier", verifier, secure));
  return response;
}
