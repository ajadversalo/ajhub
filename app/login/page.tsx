import { redirect } from "next/navigation";
import Link from "next/link";
import { getGoogleUser, googleConfig } from "../auth";

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getGoogleUser()) redirect("/");
  const configured = Boolean(googleConfig() && process.env.GOOGLE_ALLOWED_EMAILS?.trim());
  const { error } = await searchParams;

  return (
    <main className="login-shell">
      <section className="login-panel" aria-labelledby="login-title">
        <Link className="brand" href="/" aria-label="AJ's Hub home"><span>AJ&apos;S</span>HUB</Link>
        <div>
          <p className="eyebrow">PRIVATE ACCESS</p>
          <h1 id="login-title">AJ&apos;s Hub</h1>
          <p className="login-copy">Sign in with an approved Google account to continue.</p>
        </div>
        {configured ? (
          <a className="google-signin" href="/api/auth/google">
            <span aria-hidden="true">G</span> Continue with Google
          </a>
        ) : (
          <p className="auth-notice" role="alert">Google authentication has not been configured.</p>
        )}
        {error && <p className="auth-error" role="alert">Sign-in failed. Check that this Google account is allowed.</p>}
      </section>
    </main>
  );
}
