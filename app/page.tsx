"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type LinkItem = { name: string; url: string; key: string; tone: string };

const links: LinkItem[] = [
  { name: "Mail", url: "https://mail.google.com", key: "M", tone: "coral" },
  { name: "Calendar", url: "https://calendar.google.com", key: "C", tone: "blue" },
  { name: "GitHub", url: "https://github.com", key: "G", tone: "ink" },
  { name: "Drive", url: "https://drive.google.com", key: "D", tone: "green" },
  { name: "Portfolio", url: "https://portfolio.ajhub.ca", key: "P", tone: "yellow" },
];

const searches: Record<string, string> = {
  g: "https://www.google.com/search?q=",
  gh: "https://github.com/search?q=",
  yt: "https://www.youtube.com/results?search_query=",
  map: "https://www.google.com/maps/search/",
};

export default function Home() {
  const [time, setTime] = useState<Date | null>(null);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = window.setInterval(() => setTime(new Date()), 1000);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && document.activeElement !== searchRef.current) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setQuery("");
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  function search(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    const [prefix, ...rest] = value.split(" ");
    const engine = searches[prefix.toLowerCase()];
    const destination = engine
      ? engine + encodeURIComponent(rest.join(" "))
      : "https://www.google.com/search?q=" + encodeURIComponent(value);
    window.location.href = destination;
  }

  return (
    <main>
      <div className="ambient one" />
      <div className="ambient two" />

      <header className="topbar">
        <a className="brand" href="/" aria-label="AJ Hub home">
          <span>AJ</span>HUB
        </a>
        <div className="date">
          {time?.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <div className="status"><i /> ONLINE</div>
      </header>

      <section className="hero">
        <time>{time?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) ?? "--:--"}</time>
      </section>

      <form className="search" onSubmit={search}>
        <span className="search-icon">⌕</span>
        <input
          ref={searchRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search the web"
          placeholder="Search the web, or try gh react server components"
          autoComplete="off"
        />
        <kbd>/</kbd>
      </form>

      <section className="launch-section">
        <div className="section-heading">
          <h2>Launchpad</h2>
          <span>THE USUAL PLACES</span>
        </div>
        <div className="launch-grid">
          {links.map((item, index) => (
            <a className={`launch-card ${item.tone}`} href={item.url} key={item.name}>
              <span className="number">0{index + 1}</span>
              <span className="tile-icon">{item.key}</span>
              <strong>{item.name}</strong>
              <span className="arrow">↗</span>
            </a>
          ))}
        </div>
      </section>

      <section className="lower-grid">
        <article className="project-card">
          <div className="section-heading">
            <h2>Home base</h2>
            <span>AJHUB.CA</span>
          </div>
          <div className="project-body">
            <div className="orbit"><span>AJ</span></div>
            <div>
              <p>This is the quiet corner of the internet I use to get places.</p>
              <a href="https://portfolio.ajhub.ca">Visit the public-facing version <span>↗</span></a>
            </div>
          </div>
        </article>

        <aside className="commands">
          <div className="section-heading">
            <h2>Shortcuts</h2>
            <span>TYPE + ENTER</span>
          </div>
          <ul>
            <li><code>g</code><span>Google</span><b>anything</b></li>
            <li><code>gh</code><span>GitHub</span><b>repositories</b></li>
            <li><code>yt</code><span>YouTube</span><b>videos</b></li>
            <li><code>map</code><span>Maps</span><b>places</b></li>
          </ul>
        </aside>
      </section>

      <footer>
        <span>PRIVATE UTILITY, PUBLICLY HARMLESS.</span>
        <span>MADE FOR AJ · {time?.getFullYear() ?? "2026"}</span>
      </footer>
    </main>
  );
}
