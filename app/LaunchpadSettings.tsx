"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { SiteHeader } from "./SiteHeader";

type LinkItem = { id: string; name: string; url: string; key?: string; tone: string };
type LinkSettings = { url: string; name: string; key: string; iconData: string | null; openMode: "modal" | "new_tab" };

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

const aiLinks: LinkItem[] = [
  { id: "chatgpt", name: "ChatGPT", url: "https://chatgpt.com", tone: "mint" },
  { id: "gemini", name: "Gemini", url: "https://gemini.google.com", tone: "blue" },
  { id: "grok", name: "Grok", url: "https://grok.com", tone: "ink" },
];

const allLinkItems = [...links, ...aiLinks];
const defaultLinkOrder = allLinkItems.map((link) => link.id);
const defaultLinkSettings: Record<string, LinkSettings> = Object.fromEntries(
  allLinkItems.map((link) => [link.id, {
    url: link.url,
    name: link.name,
    key: link.key ?? "AI",
    iconData: null,
    openMode: "new_tab" as const,
  }]),
);

async function readApiResponse(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(response.ok ? "The server returned an invalid response" : `Server error (${response.status})`);
  }
}

export default function LaunchpadSettings({ user }: { user: { name: string; email: string } }) {
  const [linkSettings, setLinkSettings] = useState<Record<string, LinkSettings>>(defaultLinkSettings);
  const [draftLinkSettings, setDraftLinkSettings] = useState<Record<string, LinkSettings>>(defaultLinkSettings);
  const [hiddenLinkIds, setHiddenLinkIds] = useState<string[]>([]);
  const [linkOrder, setLinkOrder] = useState(defaultLinkOrder);
  const [areLinksLoaded, setAreLinksLoaded] = useState(false);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [savingLink, setSavingLink] = useState<string | null>(null);
  const [deletingLink, setDeletingLink] = useState<string | null>(null);
  const [isReorderingLinks, setIsReorderingLinks] = useState(false);
  const [draggedLinkId, setDraggedLinkId] = useState<string | null>(null);
  const [dragOverLinkId, setDragOverLinkId] = useState<string | null>(null);
  const [linkMessage, setLinkMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/links", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { links: Record<string, LinkSettings>; hiddenIds?: string[]; orderIds?: string[] }) => {
        if (!active) return;
        const next = { ...defaultLinkSettings, ...data.links };
        const nextHidden = data.hiddenIds ?? [];
        const nextOrder = data.orderIds?.length === defaultLinkOrder.length ? data.orderIds : defaultLinkOrder;
        setLinkSettings(next);
        setDraftLinkSettings(next);
        setHiddenLinkIds(nextHidden);
        setLinkOrder(nextOrder);
      })
      .catch(() => { if (active) setLinkMessage("Using default links — Turso is unavailable."); })
      .finally(() => { if (active) setAreLinksLoaded(true); });
    return () => { active = false; };
  }, []);

  const orderedItems = useMemo(
    () => allLinkItems.filter((item) => !hiddenLinkIds.includes(item.id)).sort((a, b) => linkOrder.indexOf(a.id) - linkOrder.indexOf(b.id)),
    [hiddenLinkIds, linkOrder],
  );
  const selectedItem = selectedLinkId ? allLinkItems.find((item) => item.id === selectedLinkId) ?? null : null;
  const selectedDraft = selectedLinkId ? draftLinkSettings[selectedLinkId] : null;
  const selectedSaved = selectedLinkId ? linkSettings[selectedLinkId] : null;
  const selectedIndex = selectedLinkId ? orderedItems.findIndex((item) => item.id === selectedLinkId) : -1;

  function updateDraft(id: string, update: Partial<LinkSettings>) {
    setDraftLinkSettings((current) => ({ ...current, [id]: { ...current[id], ...update } }));
  }

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
      setSelectedLinkId(id);
      setLinkMessage("Saved to Turso.");
    } catch (error) {
      setLinkMessage(error instanceof Error ? error.message : "Unable to save link.");
    } finally {
      setSavingLink(null);
    }
  }

  function selectLinkIcon(id: string, file?: File) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
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
      updateDraft(id, { iconData: reader.result });
      setLinkMessage("Icon ready. Save the link to upload it.");
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
      setSelectedLinkId((current) => current === id ? null : current);
      setLinkMessage(`${linkSettings[id].name} removed.`);
    } catch (error) {
      setLinkMessage(error instanceof Error ? error.message : "Unable to delete link.");
    } finally {
      setDeletingLink(null);
    }
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
      if (!response.ok) throw new Error(data.error || "Unable to reorder links");
      setLinkMessage("Link order saved.");
    } catch (error) {
      setLinkOrder(previousOrder);
      setLinkMessage(error instanceof Error ? error.message : "Unable to reorder links.");
    } finally {
      setIsReorderingLinks(false);
    }
  }

  async function reorderLink(draggedId: string, targetId: string) {
    if (draggedId === targetId || isReorderingLinks) return;
    const visibleIds = linkOrder.filter((linkId) => !hiddenLinkIds.includes(linkId));
    const sourceIndex = visibleIds.indexOf(draggedId);
    const targetIndex = visibleIds.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const nextVisibleIds = [...visibleIds];
    nextVisibleIds.splice(sourceIndex, 1);
    nextVisibleIds.splice(targetIndex, 0, draggedId);
    const nextOrder = [...nextVisibleIds, ...linkOrder.filter((linkId) => hiddenLinkIds.includes(linkId))];
    const previousOrder = linkOrder;
    setLinkOrder(nextOrder);
    setDragOverLinkId(null);
    setIsReorderingLinks(true);
    try {
      const response = await fetch("/api/links", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: nextOrder }) });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.error || "Unable to reorder links");
      setLinkMessage("Link order saved.");
    } catch (error) {
      setLinkOrder(previousOrder);
      setLinkMessage(error instanceof Error ? error.message : "Unable to reorder links.");
    } finally {
      setIsReorderingLinks(false);
    }
  }

  function renderDetails() {
    if (!selectedItem || !selectedDraft || !selectedSaved) {
      return <div className="launchpad-detail-empty"><span>Select a shortcut</span><p>Choose a link from the list to edit its details.</p></div>;
    }
    const isKeyLink = selectedItem.key !== undefined;
    const isDirty = JSON.stringify(selectedDraft) !== JSON.stringify(selectedSaved);
    return (
      <div className="launchpad-detail-card">
        <div className="launchpad-detail-topline"><span>Editing shortcut</span><strong>{String(selectedIndex + 1).padStart(2, "0")}</strong></div>
        <div className="launchpad-detail-title">
          <span className={`launchpad-detail-mark ${selectedItem.tone}`}>
            {selectedDraft.iconData
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={selectedDraft.iconData} alt="" />
              : selectedDraft.key || "•"}
          </span>
          <div><h2>{selectedDraft.name || "Untitled link"}</h2><p>{selectedDraft.url}</p></div>
        </div>
        <div className={`launchpad-detail-fields ${isKeyLink ? "" : "ai-fields"}`}>
          <label className="link-input-field"><span>Name</span><input aria-label={`${selectedItem.name} title`} value={selectedDraft.name} maxLength={40} placeholder="Title" onChange={(event) => updateDraft(selectedItem.id, { name: event.target.value })} /></label>
          {isKeyLink && <label className="link-input-field link-key-field"><span>Mark</span><input aria-label={`${selectedItem.name} mark`} value={selectedDraft.key} maxLength={5} placeholder="Icon" onChange={(event) => updateDraft(selectedItem.id, { key: event.target.value.toUpperCase() })} /></label>}
          <label className="link-input-field link-url-field"><span>Destination URL</span><input aria-label={`${selectedItem.name} URL`} type="url" value={selectedDraft.url} placeholder="https://" onChange={(event) => updateDraft(selectedItem.id, { url: event.target.value })} /></label>
          <label className="link-input-field link-open-field"><span>Open in</span><select aria-label={`Where to open ${selectedItem.name}`} value={selectedDraft.openMode} onChange={(event) => updateDraft(selectedItem.id, { openMode: event.target.value as LinkSettings["openMode"] })}><option value="modal">AJHub modal</option><option value="new_tab">New tab</option></select></label>
          <div className="icon-upload-field"><span className="icon-upload-preview" aria-hidden="true">{selectedDraft.iconData ? <img src={selectedDraft.iconData} alt="" /> : selectedDraft.key}</span><label className="icon-upload-button" htmlFor={`icon-${selectedItem.id}`}>Upload icon</label><input id={`icon-${selectedItem.id}`} className="icon-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event: ChangeEvent<HTMLInputElement>) => { selectLinkIcon(selectedItem.id, event.target.files?.[0]); event.currentTarget.value = ""; }} />{selectedDraft.iconData && <button className="remove-icon" type="button" onClick={() => updateDraft(selectedItem.id, { iconData: null })}>Remove</button>}<small>PNG, JPEG or WebP · 256 KB max</small></div>
        </div>
        <div className="launchpad-detail-actions">
          <div className="reorder-buttons"><button type="button" aria-label={`Move ${selectedDraft.name} up`} disabled={isReorderingLinks || selectedIndex <= 0} onClick={() => moveLink(selectedItem.id, -1)}>↑</button><button type="button" aria-label={`Move ${selectedDraft.name} down`} disabled={isReorderingLinks || selectedIndex === orderedItems.length - 1} onClick={() => moveLink(selectedItem.id, 1)}>↓</button></div>
          <button type="button" disabled={savingLink === selectedItem.id || deletingLink === selectedItem.id || !isDirty} onClick={() => saveLink(selectedItem.id)}>{savingLink === selectedItem.id ? "Saving…" : isDirty ? "Save changes" : "Saved"}</button>
          <button className="delete-link" type="button" disabled={savingLink === selectedItem.id || deletingLink === selectedItem.id} onClick={() => deleteLink(selectedItem.id)}>{deletingLink === selectedItem.id ? "Removing…" : "Remove"}</button>
        </div>
      </div>
    );
  }

  return (
    <main className="launchpad-page">
      <SiteHeader user={user} />
      <div className="launchpad-page-shell">
        <header className="launchpad-page-header" hidden>
          <div><a className="launchpad-back-link" href="/">← Dashboard</a><span className="launchpad-page-eyebrow">Launchpad / links</span><h1>Manage your shortcuts</h1><p>Choose a link to edit its details.</p></div>
          <div className="launchpad-page-meta"><span>{orderedItems.length} active</span><a href="/">Done</a></div>
        </header>
        <div className="launchpad-page-layout">
          <section className="launchpad-list" aria-label="Launchpad shortcuts">
            <div className="launchpad-list-heading"><span>Shortcuts</span><small>{areLinksLoaded ? "Select one to edit" : "Loading…"}</small></div>
            <div className="launchpad-list-items">
              {orderedItems.map((item, index) => {
                const settings = draftLinkSettings[item.id];
                const isSelected = selectedLinkId === item.id;
                return <button className={`launchpad-list-row${isSelected ? " is-selected" : ""}${dragOverLinkId === item.id ? " is-drag-over" : ""}`} type="button" key={item.id} draggable={!isReorderingLinks} onClick={() => { setSelectedLinkId(item.id); setLinkMessage(""); }} onDragStart={(event) => { setDraggedLinkId(item.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", item.id); }} onDragOver={(event) => { event.preventDefault(); if (draggedLinkId && draggedLinkId !== item.id) { event.dataTransfer.dropEffect = "move"; setDragOverLinkId(item.id); } }} onDrop={(event) => { event.preventDefault(); const sourceId = draggedLinkId ?? event.dataTransfer.getData("text/plain"); if (sourceId) void reorderLink(sourceId, item.id); setDraggedLinkId(null); }} onDragEnd={() => { setDraggedLinkId(null); setDragOverLinkId(null); }} aria-pressed={isSelected} aria-grabbed={draggedLinkId === item.id}>
                  <span className={`launchpad-list-mark ${item.tone}`}>{settings.iconData ? <img src={settings.iconData} alt="" /> : settings.key}</span>
                  <span className="launchpad-list-copy"><strong>{settings.name || "Untitled link"}</strong><small>{settings.url}</small></span>
                  <span className="launchpad-list-mode">{settings.openMode === "modal" ? "AJHub modal" : "New tab"}</span>
                  <span className="launchpad-list-number">{String(index + 1).padStart(2, "0")}</span>
                  <span className="launchpad-list-arrow" aria-hidden="true">{isSelected ? "×" : "→"}</span>
                </button>;
              })}
            </div>
            {hiddenLinkIds.length > 0 && <div className="launchpad-hidden-links"><span>Hidden links</span>{hiddenLinkIds.map((id) => <button type="button" disabled={savingLink === id} onClick={() => saveLink(id)} key={id}>{savingLink === id ? "Restoring…" : `Restore ${linkSettings[id]?.name ?? id}`}</button>)}</div>}
          </section>
          <aside className="launchpad-detail" aria-live="polite">{renderDetails()}</aside>
        </div>
        <footer className="launchpad-page-footer"><span role="status">{linkMessage}</span><span>Changes save to your launchpad.</span></footer>
      </div>
    </main>
  );
}
