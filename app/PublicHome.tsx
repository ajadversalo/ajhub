import { SiteHeader } from "./SiteHeader";

export function PublicHome({ error = false }: { error?: boolean }) {
  return (
    <main className="public-home">
      <div className="ambient one" />
      <div className="ambient two" />
      <SiteHeader user={null} />
      {error && <p className="public-auth-error" role="alert">Sign-in failed. Check that your Google account is allowed.</p>}
      <section className="public-greeting" aria-labelledby="public-greeting-title">
        <span>Welcome</span>
        <h1 id="public-greeting-title">Good to see you.</h1>
      </section>
    </main>
  );
}
