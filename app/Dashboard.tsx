"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { siGithub, siGooglegemini, siGooglemaps, siNotion } from "simple-icons";
import { PublicCardsEditor } from "./PublicCardsEditor";
import { SiteHeader } from "./SiteHeader";

type LinkItem = { id: string; name: string; url: string; key: string; tone: string };
type LinkSettings = { url: string; name: string; key: string; iconData: string | null; openMode: "modal" | "new_tab" };
type Weather = { temperature: number; apparentTemperature: number; code: number; isDay: boolean; label: string; location: string };
type PositionSummary = {
  symbol: string;
  optionType: "CALL" | "PUT";
  expiration: string;
  currentPrice: number;
  gap: number;
  breakEven: number | null;
  trend: "up" | "down" | "flat" | null;
  trendChangePct: number | null;
};
type PortfolioSummary = {
  updatedAt: string;
  positions: PositionSummary[];
};

const formatDollars = (value: number | null) => value === null ? "—" : "$" + value.toFixed(2);
const formatSignedDollars = (value: number) => (value >= 0 ? "+" : "−") + "$" + Math.abs(value).toFixed(2);
const formatExpiration = (value: string) => {
  const date = value.split("T")[0] ?? value;
  const [, month, day] = date.split("-");
  return month && day ? month + "/" + day : value;
};

const getTrendColor = (direction: PositionSummary["trend"], changePct: number | null) => {
  if (!direction || changePct === null) return "#94a3b8";
  const neutral = [148, 163, 184];
  const target = direction === "up" ? [34, 197, 94] : direction === "down" ? [239, 68, 68] : neutral;
  const intensity = Math.min(Math.max(Math.abs(changePct) / 8, 0.35), 1);
  const channels = neutral.map((channel, index) => Math.round(channel + (target[index] - channel) * intensity));
  return "rgb(" + channels.join(", ") + ")";
};

const links: LinkItem[] = [
  { id: "mail", name: "Mail", url: "https://mail.google.com", key: "M", tone: "coral" },
  { id: "calendar", name: "Calendar", url: "https://calendar.google.com", key: "C", tone: "blue" },
  { id: "github", name: "GitHub", url: "https://github.com", key: "G", tone: "ink" },
  { id: "drive", name: "Drive", url: "https://drive.google.com", key: "D", tone: "green" },
  { id: "portfolio", name: "Azure", url: "https://portal.azure.com/", key: "AZ", tone: "yellow" },
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
const defaultLinkSettings: Record<string, LinkSettings> = Object.fromEntries(allLinkItems.map((link) => [link.id, { url: link.url, name: link.name, key: "key" in link ? String(link.key) : "AI", iconData: null, openMode: "new_tab" }]));

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

const bcStatutoryHolidays: Record<string, string> = {
  "2026-01-01": "New Year’s Day",
  "2026-02-16": "Family Day",
  "2026-04-03": "Good Friday",
  "2026-05-18": "Victoria Day",
  "2026-07-01": "Canada Day",
  "2026-08-03": "B.C. Day",
  "2026-09-07": "Labour Day",
  "2026-09-30": "National Day for Truth and Reconciliation",
  "2026-10-12": "Thanksgiving Day",
  "2026-11-11": "Remembrance Day",
  "2026-12-25": "Christmas Day",
  "2027-01-01": "New Year’s Day",
  "2027-02-15": "Family Day",
  "2027-03-26": "Good Friday",
  "2027-05-24": "Victoria Day",
  "2027-07-01": "Canada Day",
  "2027-08-02": "B.C. Day",
  "2027-09-06": "Labour Day",
  "2027-09-30": "National Day for Truth and Reconciliation",
  "2027-10-11": "Thanksgiving Day",
  "2027-11-11": "Remembrance Day",
  "2027-12-25": "Christmas Day",
};

function getCalendarDateKey(date: Date, day: number) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function SiteMark({ url, monogram, customIcon }: { url: string; monogram: string; customIcon?: string | null }) {
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
  const hasLogo = Boolean(customIcon) || Boolean(brandIcon) || logoAttempt < logoUrls.length;
  return (
    <span className={`tile-icon${hasLogo ? " has-logo" : ""}`} aria-hidden="true">
      {customIcon
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={customIcon} alt="" />
        : brandIcon
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
  const [calendarDate, setCalendarDate] = useState<Date | null>(null);
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isDashboardCollapsed, setIsDashboardCollapsed] = useState(false);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [portfolioStatus, setPortfolioStatus] = useState<"loading" | "ready" | "error">("loading");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [linkSettings, setLinkSettings] = useState<Record<string, LinkSettings>>(defaultLinkSettings);
  const [draftLinkSettings, setDraftLinkSettings] = useState<Record<string, LinkSettings>>(defaultLinkSettings);
  const [isEditingLinks, setIsEditingLinks] = useState(false);
  const [savingLink, setSavingLink] = useState<string | null>(null);
  const [deletingLink, setDeletingLink] = useState<string | null>(null);
  const [hiddenLinkIds, setHiddenLinkIds] = useState<string[]>([]);
  const [linkOrder, setLinkOrder] = useState(defaultLinkOrder);
  const [areLinksLoaded, setAreLinksLoaded] = useState(false);
  const [isReorderingLinks, setIsReorderingLinks] = useState(false);
  const [linkMessage, setLinkMessage] = useState("");
  const [expandedLinkId, setExpandedLinkId] = useState<string | null>(null);
  const [modalLinkId, setModalLinkId] = useState<string | null>(null);
  const [modalRefreshKey, setModalRefreshKey] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const calendarTouchStart = useRef<{ x: number; y: number } | null>(null);

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
    const now = new Date();
    setTime(now);
    setCalendarDate(now);
    const timer = window.setInterval(() => setTime(new Date()), 1000);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && document.activeElement !== searchRef.current) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setIsPanelOpen(false);
        setIsEditingLinks(false);
        setModalLinkId(null);
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  function changeCalendarMonth(offset: number) {
    setCalendarDate((current) => {
      const date = current ?? new Date();
      return new Date(date.getFullYear(), date.getMonth() + offset, 1);
    });
  }

  function resetCalendarMonth() {
    setCalendarDate(new Date());
  }

  const isCurrentCalendarMonth = Boolean(time && calendarDate
    && time.getFullYear() === calendarDate.getFullYear()
    && time.getMonth() === calendarDate.getMonth());

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
      .catch(() => { if (active) setLinkMessage("Using default links — Turso is unavailable."); })
      .finally(() => { if (active) setAreLinksLoaded(true); });
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
      const saved: LinkSettings = { url: data.url, name: data.name, key: data.key, iconData: data.iconData ?? null, openMode: data.openMode === "modal" ? "modal" : "new_tab" };
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

  function selectLinkIcon(id: string, file?: File) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setLinkMessage("Choose a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > 256 * 1024) {
      setLinkMessage("Icon must be 256 KB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setDraftLinkSettings((current) => ({ ...current, [id]: { ...current[id], iconData: reader.result as string } }));
      setLinkMessage("Icon ready. Save the card to upload it.");
    };
    reader.onerror = () => setLinkMessage("That image could not be read.");
    reader.readAsDataURL(file);
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
    async function loadPortfolio() {
      try {
        const response = await fetch("/api/portfolio-summary", { cache: "no-store" });
        if (!response.ok) throw new Error("Portfolio summary unavailable");
        const data = await response.json() as PortfolioSummary;
        if (active) { setPortfolio(data); setPortfolioStatus("ready"); }
      } catch {
        if (active) setPortfolioStatus("error");
      }
    }
    loadPortfolio();
    const refresh = window.setInterval(loadPortfolio, 300000);
    return () => { active = false; window.clearInterval(refresh); };
  }, []);

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

  const editableLinkItems = allLinkItems.filter((item) => !hiddenLinkIds.includes(item.id)).sort((a, b) => linkOrder.indexOf(a.id) - linkOrder.indexOf(b.id));

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
        <span className="search-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="5.5" /><path d="m15 15 4 4" /></svg>
        </span>
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
            <PublicCardsEditor />
            <button className="edit-links-button" type="button" aria-label="Edit launchpad links" title="Edit links" onClick={() => { setIsEditingLinks((value) => !value); setExpandedLinkId(null); setDraftLinkSettings(linkSettings); setLinkMessage(""); }}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11-4-4L4 16v4Zm13.5-16.5 3 3" /></svg>
            </button>
          </div>
        </div>
        <div className={`launch-grid${areLinksLoaded ? "" : " is-loading"}`} aria-busy={!areLinksLoaded}>
          {areLinksLoaded ? allLinkItems.filter((item) => !hiddenLinkIds.includes(item.id)).sort((a, b) => linkOrder.indexOf(a.id) - linkOrder.indexOf(b.id)).map((item) => (
            <a
              className={`launch-card ${item.tone}`}
              href={linkSettings[item.id].url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={linkSettings[item.id].openMode === "modal" ? (event) => {
                if (window.matchMedia("(max-width: 600px)").matches) return;
                event.preventDefault();
                setModalLinkId(item.id);
              } : undefined}
              key={item.id}
            >
              <SiteMark key={`${linkSettings[item.id].url}-${Boolean(linkSettings[item.id].iconData)}`} url={linkSettings[item.id].url} monogram={linkSettings[item.id].key} customIcon={linkSettings[item.id].iconData} />
              <strong>{linkSettings[item.id].name}</strong>
            </a>
          )) : <span className="launch-grid-status">Loading launchpad…</span>}
        </div>
      </section>

      <section className="lower-grid">
        <article className="project-card portfolio-card">
          {portfolioStatus === "loading" && <div className="portfolio-loading" aria-label="Loading position summary"><i /><i /><i /></div>}
          {portfolioStatus === "error" && <div className="portfolio-error">Portfolio data is temporarily unavailable.</div>}
          {portfolio && (
            <div className="position-summary-table-wrap">
              <table className="position-summary-table" aria-label="Open option positions">
                <tbody>
                  {portfolio.positions.length === 0 ? (
                    <tr><td className="position-summary-empty" colSpan={6}>No open option positions.</td></tr>
                  ) : portfolio.positions.map((position) => (
                    <tr key={position.symbol + "-" + position.expiration + "-" + position.optionType}>
                      <td
                        className={"position-direction " + (position.trend ?? "flat")}
                        aria-label={position.trend ? position.trend : "No trend data"}
                        style={{ color: getTrendColor(position.trend, position.trendChangePct) }}
                      >
                        {position.trend === "up" ? "↑" : position.trend === "down" ? "↓" : position.trend === "flat" ? "→" : "—"}
                      </td>
                      <td className="position-symbol">{position.symbol}</td>
                      <td className="position-expiration">{formatExpiration(position.expiration)}</td>
                      <td>{formatDollars(position.currentPrice)}</td>
                      <td className={"position-gap " + (position.gap >= 0 ? "positive" : "negative")}>{formatSignedDollars(position.gap)}</td>
                      <td>{formatDollars(position.breakEven)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <aside className="commands calendar-card">
          <div className="section-heading">
            <h2>{calendarDate?.toLocaleDateString("en-CA", { month: "long", year: "numeric" }) ?? "Calendar"}</h2>
            <div className="calendar-tools">
              <button type="button" aria-label="Previous month" onClick={() => changeCalendarMonth(-1)}>‹</button>
              <button className="calendar-reset" type="button" onClick={resetCalendarMonth} disabled={isCurrentCalendarMonth}>This month</button>
              <button type="button" aria-label="Next month" onClick={() => changeCalendarMonth(1)}>›</button>
            </div>
          </div>
          <div className="calendar-weekdays" aria-hidden="true">
            {['S','M','T','W','T','F','S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
          </div>
          <div
            className="calendar-grid"
            aria-label={calendarDate ? `${calendarDate.toLocaleDateString("en-CA", { month: "long", year: "numeric" })} calendar` : "Calendar"}
            onTouchStart={(event) => {
              const touch = event.touches[0];
              calendarTouchStart.current = { x: touch.clientX, y: touch.clientY };
            }}
            onTouchEnd={(event) => {
              const start = calendarTouchStart.current;
              const touch = event.changedTouches[0];
              calendarTouchStart.current = null;
              if (!start || !touch) return;
              const deltaX = touch.clientX - start.x;
              const deltaY = touch.clientY - start.y;
              if (Math.abs(deltaX) < 45 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
              changeCalendarMonth(deltaX < 0 ? 1 : -1);
            }}
          >
            {(calendarDate ? getCalendarDays(calendarDate) : Array(42).fill(null)).map((day, index) => {
              const holiday = day && calendarDate ? bcStatutoryHolidays[getCalendarDateKey(calendarDate, day)] : null;
              const isToday = isCurrentCalendarMonth && day === time?.getDate();
              return (
                <span
                  className={`${isToday ? "today " : ""}${holiday ? "holiday" : ""}`.trim()}
                  key={index}
                  title={holiday ?? undefined}
                  aria-label={holiday ? `${day}, ${holiday}` : undefined}
                >{day}</span>
              );
            })}
          </div>
          <p className="calendar-legend"><i aria-hidden="true" />B.C. statutory holiday</p>
        </aside>
      </section>
      </div>

      <footer>
        <span>PRIVATE UTILITY, PUBLICLY HARMLESS.</span>
        <span>MADE BY AJ · {time?.getFullYear() ?? "2026"}</span>
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
          <section className="link-modal launchpad-settings-modal launchpad-editor" role="dialog" aria-modal="true" aria-labelledby="link-modal-title">
            <header className="launchpad-editor-header">
              <div className="launchpad-editor-heading"><span>Launchpad / links</span><h2 id="link-modal-title">Manage your shortcuts</h2><p>Choose a link to edit its details.</p></div>
              <div className="launchpad-editor-header-meta"><span>{allLinkItems.filter((item) => !hiddenLinkIds.includes(item.id)).length} active</span><button className="link-modal-close" type="button" aria-label="Close URL editor" onClick={() => setIsEditingLinks(false)}>×</button></div>
            </header>
            <div className="link-modal-body launchpad-editor-body">
              {allLinkItems.filter((item) => !hiddenLinkIds.includes(item.id)).sort((a, b) => linkOrder.indexOf(a.id) - linkOrder.indexOf(b.id)).map((item) => (
                <article className={`launchpad-link-item${expandedLinkId === item.id ? " is-expanded" : ""}`} key={item.id}>
                  <button className="launchpad-link-trigger" type="button" aria-expanded={expandedLinkId === item.id} aria-controls={expandedLinkId === item.id ? `link-details-${item.id}` : undefined} onClick={() => setExpandedLinkId((current) => current === item.id ? null : item.id)}>
                    <span className="launchpad-link-mark" aria-hidden="true">
                      {draftLinkSettings[item.id].iconData
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={draftLinkSettings[item.id].iconData!} alt="" />
                        : draftLinkSettings[item.id].key || "•"}
                    </span>
                    <span className="launchpad-link-copy">
                      <strong>{draftLinkSettings[item.id].name || "Untitled link"}</strong>
                    </span>
                    <span className="launchpad-link-chevron" aria-hidden="true">+</span>
                  </button>
                  {expandedLinkId === item.id && <div className="launchpad-link-panel" id={`link-details-${item.id}`}>
                  <div className={`link-fields ${"key" in item ? "" : "ai-fields"}`}>
                    <label className="link-input-field">
                      <span>Name</span>
                      <input id={`name-${item.id}`} aria-label={`${item.name} title`} className="link-name-input" value={draftLinkSettings[item.id].name} maxLength={40} placeholder="Title" onChange={(event) => setDraftLinkSettings((current) => ({ ...current, [item.id]: { ...current[item.id], name: event.target.value } }))} />
                    </label>
                    {"key" in item && <label className="link-input-field link-key-field">
                      <span>Mark</span>
                      <input aria-label={`${item.name} letter`} className="link-key-input" value={draftLinkSettings[item.id].key} maxLength={5} placeholder="Icon" onChange={(event) => setDraftLinkSettings((current) => ({ ...current, [item.id]: { ...current[item.id], key: event.target.value.toUpperCase() } }))} />
                    </label>}
                    <label className="link-input-field link-url-field">
                      <span>Destination URL</span>
                      <input id={`url-${item.id}`} aria-label={`${item.name} URL`} className="link-url-input" type="url" value={draftLinkSettings[item.id].url} placeholder="https://" onChange={(event) => setDraftLinkSettings((current) => ({ ...current, [item.id]: { ...current[item.id], url: event.target.value } }))} />
                    </label>
                    <label className="link-open-field">
                      <span>Open in</span>
                      <select aria-label={`Where to open ${item.name}`} value={draftLinkSettings[item.id].openMode} onChange={(event) => setDraftLinkSettings((current) => ({ ...current, [item.id]: { ...current[item.id], openMode: event.target.value as LinkSettings["openMode"] } }))}>
                        <option value="modal">AJHub modal</option>
                        <option value="new_tab">New tab</option>
                      </select>
                    </label>
                    <div className="icon-upload-field">
                      <span className="icon-upload-preview" aria-hidden="true">
                        {draftLinkSettings[item.id].iconData
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={draftLinkSettings[item.id].iconData!} alt="" />
                          : draftLinkSettings[item.id].key}
                      </span>
                      <label className="icon-upload-button" htmlFor={`icon-${item.id}`}>Upload icon</label>
                      <input id={`icon-${item.id}`} className="icon-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { selectLinkIcon(item.id, event.target.files?.[0]); event.currentTarget.value = ""; }} />
                      {draftLinkSettings[item.id].iconData && <button className="remove-icon" type="button" onClick={() => setDraftLinkSettings((current) => ({ ...current, [item.id]: { ...current[item.id], iconData: null } }))}>Remove</button>}
                      <small>PNG, JPEG or WebP · 256 KB max</small>
                    </div>
                  </div>
                  <div className="link-row-actions launchpad-link-actions">
                  <div className="reorder-buttons">
                    <button type="button" aria-label={`Move ${linkSettings[item.id].name} up`} disabled={isReorderingLinks || index === 0} onClick={() => moveLink(item.id, -1)}>↑</button>
                    <button type="button" aria-label={`Move ${linkSettings[item.id].name} down`} disabled={isReorderingLinks || index === orderedItems.length - 1} onClick={() => moveLink(item.id, 1)}>↓</button>
                  </div>
                  <button type="button" disabled={savingLink === item.id || deletingLink === item.id || JSON.stringify(draftLinkSettings[item.id]) === JSON.stringify(linkSettings[item.id])} onClick={() => saveLink(item.id)}>
                    {savingLink === item.id ? "Saving…" : JSON.stringify(draftLinkSettings[item.id]) === JSON.stringify(linkSettings[item.id]) ? "Saved" : "Save"}
                  </button>
                  <button className="delete-link" type="button" disabled={savingLink === item.id || deletingLink === item.id} onClick={() => deleteLink(item.id)}>Delete</button>
                  </div>
                   </div>}
                </article>
              ))}
              {hiddenLinkIds.length > 0 && (
                <div className="deleted-links launchpad-deleted-links">
                  <span>Hidden links</span>
                  {hiddenLinkIds.map((id) => <button type="button" disabled={savingLink === id} onClick={() => saveLink(id)} key={id}>{savingLink === id ? "Restoring..." : `Restore ${linkSettings[id]?.name ?? id}`}</button>)}
                </div>
              )}
            </div>
            <footer className="link-modal-footer launchpad-editor-footer">
              <span role="status">{linkMessage}</span>
              <button type="button" onClick={() => { setExpandedLinkId(null); setIsEditingLinks(false); }}>Done</button>
            </footer>
          </section>
        </div>
      )}

      {modalLinkId && linkSettings[modalLinkId] && (
        <div className="link-viewer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalLinkId(null); }}>
          <section className="link-viewer" role="dialog" aria-modal="true" aria-labelledby="link-viewer-title">
            <header>
              <h2 id="link-viewer-title">{linkSettings[modalLinkId].name}</h2>
              <div className="link-viewer-actions">
                <button className="link-viewer-refresh" type="button" aria-label={`Refresh ${linkSettings[modalLinkId].name}`} title="Refresh" onClick={() => setModalRefreshKey((key) => key + 1)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.34 5.66M20 4v7h-7" /></svg>
                </button>
                <a href={linkSettings[modalLinkId].url} target="_blank" rel="noopener noreferrer" aria-label="Open in new tab" title="Open in new tab">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8M17 13v6H5V7h6" /></svg>
                </a>
                <button type="button" aria-label={`Close ${linkSettings[modalLinkId].name}`} onClick={() => setModalLinkId(null)}>×</button>
              </div>
            </header>
            <div className="link-viewer-frame">
              <iframe key={`${modalLinkId}-${modalRefreshKey}`} src={linkSettings[modalLinkId].url} title={linkSettings[modalLinkId].name} />
            </div>
          </section>
        </div>
      )}

    </main>
  );
}
