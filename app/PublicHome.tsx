"use client";

import { useEffect, useState } from "react";
import { SiteHeader } from "./SiteHeader";

const greetings = [
  "Good to see you.",
  "Welcome back.",
  "Make yourself at home.",
  "Nice to have you here.",
  "Hello there.",
  "Hope your day is going well.",
  "Your space is ready.",
  "Take a breath. You’re here.",
  "Let’s make today count.",
  "Come on in.",
];

export function PublicHome({ error = false }: { error?: boolean }) {
  const [greetingIndex, setGreetingIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setGreetingIndex((current) => (current + 1) % greetings.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="public-home">
      <div className="ambient one" />
      <div className="ambient two" />
      <SiteHeader user={null} />
      {error && <p className="public-auth-error" role="alert">Sign-in failed. Check that your Google account is allowed.</p>}
      <section className="public-greeting" aria-labelledby="public-greeting-title">
        <span>Welcome</span>
        <h1 className="public-greeting-message" id="public-greeting-title" key={greetingIndex}>{greetings[greetingIndex]}</h1>
      </section>
    </main>
  );
}
