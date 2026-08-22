"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { siGithub, siGooglegemini, siGooglemaps, siNotion } from "simple-icons";
import { SiteHeader } from "./SiteHeader";

type LinkItem = { id: string; name: string; url: string; key: string; tone: string };
type MarketQuote = { symbol: string; name: string; price: number; change: number; changePercent: number };
type LinkSettings = { url: string; name: string; key: string };
type Weather = { temperature: number; apparentTemperature: number; code: number; isDay: boolean; label: string; location: string };

const links: LinkItem[] = [
  { id: "mail", name: "Mail", url: "https://mail.google.com", key: "M", tone: "coral" },
  { id: "calendar", name: "Calendar", url: "https://calendar.google.com", key: "C", tone: "blue" },
  { id: "github", name: "GitHub", url: "https://github.com", key: "G", tone: "ink" },
  { id: "drive", name: "Drive", url: "https://drive.google.com", key: "D", tone: "green" },
  { id: "portfolio", name: "Portfolio", url: "https://portfolio.ajhub.ca", key: "P", tone: "yellow" },
  { id: "linkedin", name: "LinkedIn", url: "https://linkedin.com", key: "IN", tone: "sky" },
  { id: "youtube", name: "YouTube", url: "https://youtube.com", key: "YT", tone: "red" },
  { id: "maps", name: "Maps", url: "https://maps.google.com", key: "MAP", tone: "sand" },
  { id: "notion", name: "Notion", url: "https://notion.so", key: "N", tone: "stone" },
];

const aiLinks = [
  { id: "chatgpt", name: "ChatGPT", url: "https://chatgpt.com", tone: "mint" },
  { id: "gemini", name: "Gemini", url: "https://gemini.google.com", tone: "blue" },
  { id: "grok", name: "Grok", url: "https://grok.com", tone: "ink" },
];

const allLinkItems = [...links, ...aiLinks];
const defaultLinkOrder = allLinkItems.map((link) => link.id);
const defaultLinkSettings: Record<string, LinkSettings> = Object.fromEntries(allLinkItems.map((link) => [link.id, { url: link.url, name: link.name, key: "key" in link ? String(link.key) : "AI" }]));

const azureIcon = { hex: "0078D4", path: "M22.379 23.343a1.62 1.62 0 0 0 1.536-2.14v.002L17.35 1.76A1.62 1.62 0 0 0 15.816.657H8.184A1.62 1.62 0 0 0 6.65 1.76L.086 21.204a1.62 1.62 0 0 0 1.536 2.139h4.741a1.62 1.62 0 0 0 1.535-1.103l.977-2.892 4.947 3.675c.28.208.618.32.966.32m-3.084-12.531 3.624 10.739a.54.54 0 0 1-.51.713v-.001h-.03a.54.54 0 0 1-.322-.106l-9.287-6.9h4.853m6.313 7.006c.116-.326.13-.694.007-1.058L9.79 1.76a1.722 1.722 0 0 0-.007-.02h6.034a.54.54 0 0 1 .512.366l6.562 19.445a.54.54 0 0 1-.338.684" };
const grokIcon = { hex: "000000", path: "M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815" };

async function readApiResponse(response: Response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; }
  catch { throw new Error(response.ok ? "The server returned an invalid response" : `Server error (${response.status})`); }
}

const searches: Record<string, string> = {
  g: "https://www.google.com/search?q=",
  gh: "https://github.com/search?q=",
  yt: "https://www.youtube.com/results?search_query=",
  map: "https://www.google.com/maps/search/",
};

function getCalendarDays(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: 42 }, (_, index) => {
    const day = index - firstDay + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });
}

function WeatherIcon({ weather }: { weather: Weather }) {
  if (weather.code >= 95) return <svg viewBox="0 0 24 24"><path d="M7 16a4 4 0 1 1 1-7.9A5.5 5.5 0 0 1 18.5 10 3 3 0 0 1 18 16H7Z" /><path d="m13 14-2 4h3l-2 4" /></svg>;
  if (weather.code >= 71 && weather.code <= 86) return <svg viewBox="0 0 24 24"><path d="M7 15a4 4 0 1 1 1-7.9A5.5 5.5 0 0 1 18.5 9 3 3 0 0 1 18 15H7Z" /><path d="M8 19h.01M12 18h.01M16 19h.01" /></svg>;
  if (weather.code >= 51 && weather.code <= 82) return <svg viewBox="0 0 24 24"><path d="M7 15a4 4 0 1 1 1-7.9A5.5 5.5 0 0 1 18.5 9 3 3 0 0 1 18 15H7Z" /><path d="m8 18-1 2M13 18l-1 2M18 18l-1 2" /></svg>;
  if (weather.code >= 2 && weather.code <= 48) return <svg viewBox="0 0 24 24"><path d="M7 17a4 4 0 1 1 1-7.9A5.5 5.5 0 0 1 18.5 11 3 3 0 0 1 18 17H7Z" /></svg>;
  if (!weather.isDay) return <svg viewBox="0 0 24 24"><path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z" /></svg>;
  return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
}

function SiteMark({ url, monogram }: { url: string; monogram: string }) {
  const [logoAttempt, setLogoAttempt] = useState(0);
  const hostname = new URL(url).hostname.replace(/^www\./, "");
  const brandIcon = hostname === "github.com" ? siGithub
    : hostname === "gemini.google.com" ? siGooglegemini
    : hostname === "maps.google.com" ? siGooglemaps
    : hostname === "notion.so" ? siNotion
    : hostname === "portal.azure.com" ? azureIcon
    : hostname === "grok.com" ? grokIcon
    : null;
  const origin = new URL(url).origin;
  const logoUrls = ["/apple-touch-icon.png", "/icon-192.png", "/favicon.ico"].map((path) => new URL(path, origin).toString());
  const hasLogo = Boolean(brandIcon) || logoAttempt < logoUrls.length;
  return (
    <span className={`tile-icon${hasLogo ? " has-logo" : ""}`} aria-hidden="true">
      {brandIcon
        ? <svg className={brandIcon.hex === "000000" || brandIcon.hex === "181717" ? "brand-logo neutral" : "brand-logo"} viewBox="0 0 24 24" style={{ color: `#${brandIcon.hex}` }}><path fill="currentColor" d={brandIcon.path} /></svg>
        : hasLogo
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={logoUrls[logoAttempt]} alt="" onError={() => setLogoAttempt((attempt) => attempt + 1)} />
        : monogram}
    </span>
  );
}

export default function Dashboard({ user }: { user: { name: string; email: string } }) {
  const [time, setTime] = useState<Date | null>(null);
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isDashboardCollapsed, setIsDashboardCollapsed] = useState(false);
  const [markets, setMarkets] = useState<MarketQuote[]>([]);
  const [marketStatus, setMarketStatus] = useState<"loading" | "ready" | "error">("loading");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [watchlist, setWatchlist] = useState(["^GSPC", "^DJI", "^IXIC", "^RUT"]);
  const [draftWatchlist, setDraftWatchlist] = useState(["^GSPC", "^DJI", "^IXIC", "^RUT"]);
  const [isWatchlistOpen, setIsWatchlistOpen] = useState(false);
  const [isSavingWatchlist, setIsSavingWatchlist] = useState(false);
  const [watchlistMessage, setWatchlistMessage] = useState("");
  const [linkSettings, setLinkSettings] = useState<Record<string, LinkSettings>>(defaultLinkSettings);
  const [draftLinkSettings, setDraftLinkSettings] = useState<Record<string, LinkSettings>>(defaultLinkSettings);
  const [isEditingLinks, setIsEditingLinks] = useState(false);
  const [savingLink, setSavingLink] = useState<string | null>(null);
  const [deletingLink, setDeletingLink] = useState<string | null>(null);
  const [hiddenLinkIds, setHiddenLinkIds] = useState<string[]>([]);
  const [linkOrder, setLinkOrder] = useState(defaultLinkOrder);
  const [isReorderingLinks, setIsReorderingLinks] = useState(false);
  const [linkMessage, setLinkMessage] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    async function loadWeather() {
      try {
        const response = await fetch("/api/weather");
        if (!response.ok) throw new Error("Weather unavailable");
        const data = await response.json();
        if (active) setWeather(data);
      } catch { if (active) setWeather(null); }
    }
    loadWeather();
    const refresh = window.setInterval(loadWeather, 900000);
    return () => { active = false; window.clearInterval(refresh); };
  }, []);

  useEffect(() => {
    // Clock values are client-only and must be set after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTime(new Date());
    const timer = window.setInterval(() => setTime(new Date()), 1000);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && document.activeElement !== searchRef.current) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setIsPanelOpen(false);
        setIsEditingLinks(false);
        setIsWatchlistOpen(false);
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/links", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { links: Record<string, LinkSettings>; hiddenIds?: string[]; orderIds?: string[] }) => {
        if (!active) return;
        const next = { ...defaultLinkSettings, ...data.links };
        setLinkSettings(next);
        setDraftLinkSettings(next);
        setHiddenLinkIds(data.hiddenIds ?? []);
        if (data.orderIds?.length === defaultLinkOrder.length) setLinkOrder(data.orderIds);
      })
      .catch(() => { if (active) setLinkMessage("Using default links — Turso is unavailable."); });
    return () => { active = false; };
  }, []);

  async function saveLink(id: string) {
    setSavingLink(id);
    setLinkMessage("");
    try {
      const response = await fetch("/api/links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...draftLinkSettings[id] }),
      });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.error || "Unable to save link");
      const saved = { url: data.url, name: data.name, key: data.key };
      setLinkSettings((current) => ({ ...current, [id]: saved }));
      setDraftLinkSettings((current) => ({ ...current, [id]: saved }));
      setHiddenLinkIds((current) => current.filter((linkId) => linkId !== id));
      setLinkMessage("Saved to Turso.");
    } catch (error) {
      setLinkMessage(error instanceof Error ? error.message : "Unable to save link.");
    } finally {
      setSavingLink(null);
    }
  }

  async function deleteLink(id: string) {
    if (!window.confirm(`Delete ${linkSettings[id].name} from the launchpad?`)) return;
    setDeletingLink(id);
    setLinkMessage("");
    try {
      const response = await fetch("/api/links", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.error || "Unable to delete link");
      setHiddenLinkIds((current) => [...new Set([...current, id])]);
      setLinkMessage(`${linkSettings[id].name} removed.`);
    } catch (error) {
      setLinkMessage(error instanceof Error ? error.message : "Unable to delete link.");
    } finally { setDeletingLink(null); }
  }

  async function moveLink(id: string, direction: -1 | 1) {
    const visibleIds = linkOrder.filter((linkId) => !hiddenLinkIds.includes(linkId));
    const neighborId = visibleIds[visibleIds.indexOf(id) + direction];
    if (!neighborId) return;
    const previousOrder = linkOrder;
    const nextOrder = [...linkOrder];
    const currentIndex = nextOrder.indexOf(id);
    const neighborIndex = nextOrder.indexOf(neighborId);
    [nextOrder[currentIndex], nextOrder[neighborIndex]] = [nextOrder[neighborIndex], nextOrder[currentIndex]];
    setLinkOrder(nextOrder);
    setIsReorderingLinks(true);
    try {
      const response = await fetch("/api/links", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: nextOrder }) });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.error || "Unable to reorder cards");
      setLinkMessage("Card order saved.");
    } catch (error) {
      setLinkOrder(previousOrder);
      setLinkMessage(error instanceof Error ? error.message : "Unable to reorder cards.");
    } finally { setIsReorderingLinks(false); }
  }

  useEffect(() => {
    let active = true;
    async function loadMarkets() {
      try {
        const response = await fetch("/api/markets");
        if (!response.ok) throw new Error("Market data unavailable");
        const data = await response.json();
        if (active) { setMarkets(data.quotes); setMarketStatus("ready"); }
      } catch {
        if (active) setMarketStatus("error");
      }
    }
    loadMarkets();
    const refresh = window.setInterval(loadMarkets, 300000);
    return () => { active = false; window.clearInterval(refresh); };
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/watchlist", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { symbols: string[] }) => { if (active) { setWatchlist(data.symbols); setDraftWatchlist(data.symbols); } })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  async function saveMarketWatchlist() {
    setIsSavingWatchlist(true);
    setWatchlistMessage("");
    try {
      const response = await fetch("/api/watchlist", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbols: draftWatchlist }) });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.error || "Unable to save watchlist");
      setWatchlist(data.symbols);
      setDraftWatchlist(data.symbols);
      setWatchlistMessage("Saved to Turso.");
      setMarketStatus("loading");
      const marketResponse = await fetch("/api/markets", { cache: "no-store" });
      if (!marketResponse.ok) throw new Error("Saved, but quotes could not be refreshed");
      const marketData = await readApiResponse(marketResponse);
      setMarkets(marketData.quotes);
      setMarketStatus("ready");
    } catch (error) {
      setWatchlistMessage(error instanceof Error ? error.message : "Unable to save watchlist.");
      setMarketStatus("error");
    } finally { setIsSavingWatchlist(false); }
  }

  function search(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    const [prefix, ...rest] = value.split(" ");
    const engine = searches[prefix.toLowerCase()];
    if (engine && prefix.toLowerCase() !== "g") {
      window.open(engine + encodeURIComponent(rest.join(" ")), "_blank", "noopener,noreferrer");
      return;
    }
    const googleQuery = prefix.toLowerCase() === "g" ? rest.join(" ").trim() : value;
    if (!googleQuery) return;
    setSearchedQuery(googleQuery);
    setIsPanelOpen(true);
  }

  function toggleDashboard() {
    const update = () => setIsDashboardCollapsed((collapsed) => !collapsed);
    const transitionDocument = document as Document & { startViewTransition?: (callback: () => void) => void };
    if (transitionDocument.startViewTransition) transitionDocument.startViewTransition(update);
    else update();
  }

  return (
    <main className={isDashboardCollapsed ? "dashboard-collapsed" : ""}>
      <div className="ambient one" />
      <div className="ambient two" />

      <SiteHeader user={user} />

      <div className="primary-tools">
      <section className="hero">
        <h1>
          {time ? (time.getHours() < 12 ? "Good morning" : time.getHours() < 18 ? "Good afternoon" : "Good evening") : "Good day"}, AJ
        </h1>
        <div className="hero-meta">
          {weather && (
            <div className="weather-summary" title={`${weather.label}, feels like ${weather.apparentTemperature}°C in ${weather.location}`}>
              <span className="forecast-icon" aria-hidden="true"><WeatherIcon weather={weather} /></span>
              <span className="weather-copy">
                <strong>{weather.temperature}°</strong>
                <small>{weather.label}</small>
              </span>
            </div>
          )}
          <time>{time?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) ?? "--:--"}</time>
        </div>
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
      </div>

      <div className={`collapsible-dashboard${isDashboardCollapsed ? " is-collapsed" : ""}`} aria-hidden={isDashboardCollapsed} inert={isDashboardCollapsed}>
      <section className="launch-section">
        <div className="section-heading">
          <h2>Launchpad</h2>
          <div className="link-tools">
            <button className="edit-links-button" type="button" aria-label="Edit launchpad links" title="Edit links" onClick={() => { setIsEditingLinks((value) => !value); setDraftLinkSettings(linkSettings); setLinkMessage(""); }}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11-4-4L4 16v4Zm13.5-16.5 3 3" /></svg>
            </button>
          </div>
        </div>
        <div className="launch-grid">
          {allLinkItems.filter((item) => !hiddenLinkIds.includes(item.id)).sort((a, b) => linkOrder.indexOf(a.id) - linkOrder.indexOf(b.id)).map((item) => (
            <a className={`launch-card ${item.tone}`} href={linkSettings[item.id].url} target="_blank" rel="noopener noreferrer" key={item.id}>
              <SiteMark key={linkSettings[item.id].url} url={linkSettings[item.id].url} monogram={linkSettings[item.id].key} />
              <strong>{linkSettings[item.id].name}</strong>
            </a>
          ))}
        </div>
      </section>

      <section className="lower-grid">
        <article className="project-card market-card">
          <div className="section-heading">
            <h2>Market snapshot</h2>
            <div className="market-tools">
              <span>{marketStatus === "ready" ? "LIVE · 5 MIN DELAY" : "MARKET DATA"}</span>
              <button type="button" aria-label="Edit market watchlist" title="Edit watchlist" onClick={() => { setDraftWatchlist(watchlist); setWatchlistMessage(""); setIsWatchlistOpen(true); }}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11-4-4L4 16v4Zm13.5-16.5 3 3" /></svg>
              </button>
            </div>
          </div>
          <div className="market-grid">
            {marketStatus === "loading" && Array.from({ length: 4 }, (_, index) => <div className="market-item loading" key={index} />)}
            {marketStatus === "error" && <div className="market-error">Market data is temporarily unavailable.</div>}
            {markets.map((market) => (
              <div className="market-item" key={market.symbol}>
                <div><span>{market.symbol}</span><small>{market.name}</small></div>
                <strong>{market.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}</strong>
                <b className={market.change >= 0 ? "up" : "down"}>{market.change >= 0 ? "+" : ""}{market.changePercent.toFixed(2)}%</b>
              </div>
            ))}
          </div>
          <p className="market-note">Indicative quotes for a quick glance. Not investment advice.</p>
        </article>

        <aside className="commands calendar-card">
          <div className="section-heading">
            <h2>{time?.toLocaleDateString("en-CA", { month: "long", year: "numeric" }) ?? "Calendar"}</h2>
            <span>THIS MONTH</span>
          </div>
          <div className="calendar-weekdays" aria-hidden="true">
            {['S','M','T','W','T','F','S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
          </div>
          <div className="calendar-grid" aria-label="Current month calendar">
            {(time ? getCalendarDays(time) : Array(42).fill(null)).map((day, index) => (
              <span className={day === time?.getDate() ? "today" : ""} key={index}>{day}</span>
            ))}
          </div>
        </aside>
      </section>
      </div>

      <footer>
        <span>PRIVATE UTILITY, PUBLICLY HARMLESS.</span>
        <span>MADE FOR AJ · {time?.getFullYear() ?? "2026"}</span>
      </footer>

      <button
        className="dashboard-collapse-toggle"
        type="button"
        aria-label={isDashboardCollapsed ? "Expand dashboard" : "Collapse dashboard"}
        aria-expanded={!isDashboardCollapsed}
        title={isDashboardCollapsed ? "Expand dashboard" : "Collapse dashboard"}
        onClick={toggleDashboard}
      >
        {isDashboardCollapsed ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5" /></svg>
        )}
      </button>

      {isPanelOpen && <button className="panel-backdrop" aria-label="Close search results" onClick={() => setIsPanelOpen(false)} />}
      <aside className={`results-panel ${isPanelOpen ? "open" : ""}`} aria-hidden={!isPanelOpen} aria-label="Search results">
        <div className="results-topbar">
          <div><span>Search results</span></div>
          <button onClick={() => setIsPanelOpen(false)} aria-label="Close search results">×</button>
        </div>
        <div className="results-body google-results-body">
          {searchedQuery && <iframe key={searchedQuery} className="google-results-frame" src={`https://www.google.com/search?igu=1&q=${encodeURIComponent(searchedQuery)}`} title={`Google results for ${searchedQuery}`} />}
        </div>
        <div className="results-footer">
          <a href={`https://www.google.com/search?q=${encodeURIComponent(searchedQuery)}`} target="_blank" rel="noopener noreferrer">Open full Google results <span>↗</span></a>
          <small>Tip: press Esc to close</small>
        </div>
      </aside>

      {isEditingLinks && (
        <div className="link-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsEditingLinks(false); }}>
          <section className="link-modal" role="dialog" aria-modal="true" aria-labelledby="link-modal-title">
            <header>
              <div><span>Launchpad settings</span><h2 id="link-modal-title">Edit URLs</h2></div>
              <button className="link-modal-close" type="button" aria-label="Close URL editor" onClick={() => setIsEditingLinks(false)}>×</button>
            </header>
            <div className="link-modal-body">
              {allLinkItems.filter((item) => !hiddenLinkIds.includes(item.id)).sort((a, b) => linkOrder.indexOf(a.id) - linkOrder.indexOf(b.id)).map((item, index, orderedItems) => (
                <div className="link-modal-row" key={item.id}>
                  <label htmlFor={`name-${item.id}`}>{linkSettings[item.id].name}</label>
                  <div className={`link-fields ${"key" in item ? "" : "ai-fields"}`}>
                    <input id={`name-${item.id}`} aria-label={`${item.name} title`} className="link-name-input" value={draftLinkSettings[item.id].name} maxLength={40} placeholder="Title" onChange={(event) => setDraftLinkSettings((current) => ({ ...current, [item.id]: { ...current[item.id], name: event.target.value } }))} />
                    {"key" in item && <input aria-label={`${item.name} letter`} className="link-key-input" value={draftLinkSettings[item.id].key} maxLength={5} placeholder="Icon" onChange={(event) => setDraftLinkSettings((current) => ({ ...current, [item.id]: { ...current[item.id], key: event.target.value.toUpperCase() } }))} />}
                    <input id={`url-${item.id}`} aria-label={`${item.name} URL`} className="link-url-input" type="url" value={draftLinkSettings[item.id].url} placeholder="https://" onChange={(event) => setDraftLinkSettings((current) => ({ ...current, [item.id]: { ...current[item.id], url: event.target.value } }))} />
                  </div>
                  <div className="link-row-actions">
                  <div className="reorder-buttons">
                    <button type="button" aria-label={`Move ${linkSettings[item.id].name} up`} disabled={isReorderingLinks || index === 0} onClick={() => moveLink(item.id, -1)}>↑</button>
                    <button type="button" aria-label={`Move ${linkSettings[item.id].name} down`} disabled={isReorderingLinks || index === orderedItems.length - 1} onClick={() => moveLink(item.id, 1)}>↓</button>
                  </div>
                  <button type="button" disabled={savingLink === item.id || deletingLink === item.id || JSON.stringify(draftLinkSettings[item.id]) === JSON.stringify(linkSettings[item.id])} onClick={() => saveLink(item.id)}>
                    {savingLink === item.id ? "Saving…" : JSON.stringify(draftLinkSettings[item.id]) === JSON.stringify(linkSettings[item.id]) ? "Saved" : "Save"}
                  </button>
                  <button className="delete-link" type="button" disabled={savingLink === item.id || deletingLink === item.id} onClick={() => deleteLink(item.id)}>Delete</button>
                  </div>
                </div>
              ))}
              {hiddenLinkIds.length > 0 && (
                <div className="deleted-links">
                  <span>Deleted cards</span>
                  {hiddenLinkIds.map((id) => <button type="button" disabled={savingLink === id} onClick={() => saveLink(id)} key={id}>{savingLink === id ? "Restoring..." : `Restore ${linkSettings[id]?.name ?? id}`}</button>)}
                </div>
              )}
            </div>
            <footer className="link-modal-footer">
              <span role="status">{linkMessage}</span>
              <button type="button" onClick={() => setIsEditingLinks(false)}>Done</button>
            </footer>
          </section>
        </div>
      )}

      {isWatchlistOpen && (
        <div className="link-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsWatchlistOpen(false); }}>
          <section className="link-modal watchlist-modal" role="dialog" aria-modal="true" aria-labelledby="watchlist-modal-title">
            <header>
              <div><span>Market settings</span><h2 id="watchlist-modal-title">Edit watchlist</h2></div>
              <button className="link-modal-close" type="button" aria-label="Close watchlist editor" onClick={() => setIsWatchlistOpen(false)}>×</button>
            </header>
            <div className="link-modal-body">
              <p className="watchlist-help">Enter Yahoo Finance ticker symbols, such as AAPL, MSFT, BTC-USD, or ^GSPC.</p>
              {draftWatchlist.map((symbol, index) => (
                <div className="watchlist-row" key={index}>
                  <label htmlFor={`ticker-${index}`}>Ticker {index + 1}</label>
                  <input id={`ticker-${index}`} value={symbol} autoCapitalize="characters" onChange={(event) => setDraftWatchlist((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.value.toUpperCase() : value))} />
                  <button className="remove-ticker" type="button" aria-label={`Remove ${symbol || `ticker ${index + 1}`}`} disabled={draftWatchlist.length === 1} onClick={() => setDraftWatchlist((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button>
                </div>
              ))}
              {draftWatchlist.length < 8 && <button className="add-ticker" type="button" onClick={() => setDraftWatchlist((current) => [...current, ""])}>+ Add ticker</button>}
            </div>
            <footer className="link-modal-footer">
              <span role="status">{watchlistMessage}</span>
              <button type="button" disabled={isSavingWatchlist || draftWatchlist.some((symbol) => !symbol.trim())} onClick={saveMarketWatchlist}>{isSavingWatchlist ? "Saving…" : "Save watchlist"}</button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
