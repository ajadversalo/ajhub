"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export function SiteHeader({ user }: { user: { email: string } | null }) {
  const [date, setDate] = useState<Date | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("ajhub-theme");
    const initialTheme = savedTheme === "dark" || savedTheme === "light"
      ? savedTheme
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    // Header state is client-only and must be set after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(initialTheme);
    document.documentElement.dataset.theme = initialTheme;
    setDate(new Date());
    const timer = window.setInterval(() => setDate(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("ajhub-theme", nextTheme);
  }

  async function signOut(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      if ("caches" in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.filter((key) => key.startsWith("aj-hub-")).map((key) => window.caches.delete(key)));
      }
    } finally {
      form.submit();
    }
  }

  return (
    <header className="topbar">
      <Link className="brand" href="/" aria-label="AJ's Hub home">
        <span>AJ&apos;S</span>HUB
      </Link>
      <div className="date">
        {date?.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}
      </div>
      <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
        <span className="theme-track"><i /></span>
        <b className="theme-icon" aria-hidden="true">{theme === "light" ? "☀" : "☾"}</b>
      </button>
      {user ? (
        <form action="/api/auth/logout" method="post" className="signout-form" onSubmit={signOut}>
          <button type="submit" title={`Signed in as ${user.email}`}>Sign out</button>
        </form>
      ) : (
        <a className="auth-action" href="/api/auth/google">Log in</a>
      )}
    </header>
  );
}
