import { SiteHeader } from "./SiteHeader";
import { PublicCardGrid } from "./PublicCardGrid";
import { getPublicCards } from "@/db/public-cards";

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

export async function PublicHome({ error = false }: { error?: boolean }) {
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  const cards = await getPublicCards().catch(() => []);

  return (
    <main className="public-home">
      <div className="ambient one" />
      <div className="ambient two" />
      <SiteHeader user={null} />
      {error && <p className="public-auth-error" role="alert">Sign-in failed. Check that your Google account is allowed.</p>}
      <section className="public-greeting" aria-labelledby="public-greeting-title">
        <span>Welcome</span>
        <h1 className="public-greeting-message" id="public-greeting-title">{greeting}</h1>
      </section>
      {cards.length > 0 && <PublicCardGrid cards={cards} />}
    </main>
  );
}
