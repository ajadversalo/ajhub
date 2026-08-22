import { SiteHeader } from "./SiteHeader";
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

const publicCardTones = ["coral", "blue", "green", "yellow", "ink", "sky", "red", "sand", "mint"];

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
      {cards.length > 0 && (
        <section className="public-card-grid" aria-label="Featured links">
          {cards.map((card) => (
            <a className={`public-url-card ${publicCardTones[card.slot - 1]}`} href={card.url} target="_blank" rel="noopener noreferrer" key={card.slot}>
              <span className="public-card-number">{String(card.slot).padStart(2, "0")}</span>
              <span className="public-card-arrow" aria-hidden="true">↗</span>
              {card.iconData && <span className="public-card-icon" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={card.iconData} alt="" />
              </span>}
              <h2>{card.title}</h2>
              {card.description && <p>{card.description}</p>}
              {card.techStack && <div className="public-card-tags">{card.techStack.split(",").map((tag) => <span key={tag}>{tag.trim()}</span>)}</div>}
              <small title={card.url}>{card.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</small>
            </a>
          ))}
        </section>
      )}
    </main>
  );
}
