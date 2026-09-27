"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SiteHeader } from "./SiteHeader";

type EditablePublicCard = {
  slot: number;
  title: string;
  description: string;
  url: string;
  techStack: string;
  iconData: string | null;
};

const emptyCards = () => Array.from({ length: 9 }, (_, index) => ({
  slot: index + 1,
  title: "",
  description: "",
  url: "",
  techStack: "",
  iconData: null,
}));

export function PublicCardsEditor({ standalone = false, user }: { standalone?: boolean; user?: { email: string } } = {}) {
  const [isOpen, setIsOpen] = useState(standalone);
  const [cards, setCards] = useState<EditablePublicCard[]>(emptyCards);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [savingSlot, setSavingSlot] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen || standalone) return;
    let active = true;
    fetch("/api/public-cards", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { cards?: EditablePublicCard[] }) => {
        if (!active) return;
        const saved = new Map((data.cards ?? []).map((card) => [card.slot, card]));
        setCards(emptyCards().map((card) => saved.get(card.slot) ?? card));
      })
      .catch(() => { if (active) setMessage("Public cards could not be loaded."); });
    return () => { active = false; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  function updateCard(slot: number, field: keyof Omit<EditablePublicCard, "slot">, value: string) {
    setCards((current) => current.map((card) => card.slot === slot ? { ...card, [field]: value } : card));
  }

  function selectIcon(slot: number, file?: File) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setMessage("Choose a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > 256 * 1024) {
      setMessage("Icon must be 256 KB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setCards((current) => current.map((card) => card.slot === slot ? { ...card, iconData: reader.result as string } : card));
      setMessage(`Icon ready. Save card ${slot} to upload it.`);
    };
    reader.onerror = () => setMessage("That image could not be read.");
    reader.readAsDataURL(file);
  }

  async function saveCard(event: FormEvent, card: EditablePublicCard) {
    event.preventDefault();
    setSavingSlot(card.slot);
    setMessage("");
    try {
      const response = await fetch("/api/public-cards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(card),
      });
      const data = await response.json() as { card?: EditablePublicCard; error?: string };
      if (!response.ok || !data.card) throw new Error(data.error || "Unable to save card");
      setCards((current) => current.map((item) => item.slot === card.slot ? data.card! : item));
      setMessage(`Card ${card.slot} saved.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save card");
    } finally {
      setSavingSlot(null);
    }
  }

  async function removeCard(slot: number) {
    setSavingSlot(slot);
    setMessage("");
    try {
      const response = await fetch("/api/public-cards", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to remove card");
      setCards((current) => current.map((card) => card.slot === slot ? emptyCards()[slot - 1] : card));
      setMessage(`Card ${slot} removed.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove card");
    } finally {
      setSavingSlot(null);
    }
  }

  function renderStandaloneDetails(card: EditablePublicCard) {
    const isSaving = savingSlot === card.slot;
    return (
      <form className="public-cards-detail-form" onSubmit={(event) => saveCard(event, card)}>
        <div className="public-cards-detail-topline"><span>Editing card</span><strong>{String(card.slot).padStart(2, "0")}</strong></div>
        <div className="public-cards-detail-fields">
          <label>Title<input value={card.title} maxLength={80} onChange={(event) => updateCard(card.slot, "title", event.target.value)} /></label>
          <label>URL<input type="url" value={card.url} maxLength={2048} placeholder="https://" onChange={(event) => updateCard(card.slot, "url", event.target.value)} /></label>
          <label>Description<textarea value={card.description} maxLength={280} rows={4} onChange={(event) => updateCard(card.slot, "description", event.target.value)} /></label>
          <label>Tech stack<input value={card.techStack} maxLength={200} placeholder="React, TypeScript, Cloudflare" onChange={(event) => updateCard(card.slot, "techStack", event.target.value)} /></label>
        </div>
        <div className="public-cards-detail-icon">
          <span className="public-card-icon-preview" aria-hidden="true">
            {card.iconData
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={card.iconData} alt="" />
              : String(card.slot).padStart(2, "0")}
          </span>
          <label className="public-card-icon-upload" htmlFor={`public-card-page-icon-${card.slot}`}>Upload icon</label>
          <input id={`public-card-page-icon-${card.slot}`} className="icon-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { selectIcon(card.slot, event.target.files?.[0]); event.currentTarget.value = ""; }} />
          {card.iconData && <button className="public-card-icon-remove" type="button" onClick={() => setCards((current) => current.map((item) => item.slot === card.slot ? { ...item, iconData: null } : item))}>Remove icon</button>}
          <small>PNG, JPEG or WebP · 256 KB max</small>
        </div>
        <div className="public-card-editor-actions">
          <button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save"}</button>
          <button className="remove" type="button" disabled={isSaving || (!card.title && !card.url && !card.description && !card.techStack && !card.iconData)} onClick={() => removeCard(card.slot)}>Remove</button>
        </div>
      </form>
    );
  }

  if (standalone) {
    const selectedCard = selectedSlot ? cards.find((card) => card.slot === selectedSlot) ?? null : null;
    return (
      <main className="public-cards-page">
        <SiteHeader user={user ?? null} />
        <div className="public-cards-page-shell">
          <div className="public-cards-page-layout">
            <section className="public-cards-list" aria-label="Public cards">
              {cards.map((card) => (
                <button className={`public-cards-list-row${selectedSlot === card.slot ? " is-selected" : ""}`} type="button" key={card.slot} onClick={() => { setSelectedSlot(card.slot); setMessage(""); }} aria-pressed={selectedSlot === card.slot}>
                  <span className="public-cards-list-mark">
                    {card.iconData
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={card.iconData} alt="" />
                      : String(card.slot).padStart(2, "0")}
                  </span>
                  <span className="public-cards-list-copy"><strong>{card.title || "Untitled card"}</strong><small>{card.url || "No destination yet"}</small></span>
                  <span className="public-cards-list-mode">Public page</span>
                  <span className="public-cards-list-number">{String(card.slot).padStart(2, "0")}</span>
                </button>
              ))}
            </section>
            <aside className="public-cards-detail" aria-live="polite">
              {selectedCard ? renderStandaloneDetails(selectedCard) : <div className="public-cards-detail-empty"><span>Select a card</span><p>Choose a card from the list to edit its details.</p></div>}
            </aside>
          </div>
          <footer className="public-cards-page-footer"><span role="status">{message}</span><span>Changes save to the public page.</span></footer>
        </div>
      </main>
    );
  }

  return (
    <>
      {!standalone && <a className="public-cards-edit-button" href="/public-cards" aria-label="Edit public cards" title="Edit public cards">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h4v4H5V5Zm10 0h4v4h-4V5ZM5 15h4v4H5v-4Zm10 0h4v4h-4v-4Z" /></svg>
      </a>}
      {isOpen && createPortal(
        <div className={`public-card-editor-backdrop${standalone ? " public-card-editor-page-backdrop" : ""}`} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
          <section className="public-card-editor" role="dialog" aria-modal="true" aria-labelledby="public-card-editor-title">
            <header>
              <div><span>Public page</span><h2 id="public-card-editor-title">Expanded cards</h2></div>
              <button className="public-card-editor-close" ref={closeButtonRef} type="button" onClick={() => setIsOpen(false)} aria-label="Close public card editor">×</button>
            </header>
            <div className="public-card-editor-body">
              {cards.map((card) => (
                <form className="public-card-editor-row" onSubmit={(event) => saveCard(event, card)} key={card.slot}>
                  <strong>{String(card.slot).padStart(2, "0")}</strong>
                  <label>Title<input value={card.title} maxLength={80} onChange={(event) => updateCard(card.slot, "title", event.target.value)} /></label>
                  <label>URL<input type="url" value={card.url} maxLength={2048} placeholder="https://" onChange={(event) => updateCard(card.slot, "url", event.target.value)} /></label>
                  <label className="public-card-description">Description<textarea value={card.description} maxLength={280} rows={3} onChange={(event) => updateCard(card.slot, "description", event.target.value)} /></label>
                  <label className="public-card-stack">Tech stack<input value={card.techStack} maxLength={200} placeholder="React, TypeScript, Cloudflare" onChange={(event) => updateCard(card.slot, "techStack", event.target.value)} /></label>
                  <div className="public-card-icon-field">
                    <span className="public-card-icon-preview" aria-hidden="true">
                      {card.iconData
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={card.iconData} alt="" />
                        : String(card.slot).padStart(2, "0")}
                    </span>
                    <label className="public-card-icon-upload" htmlFor={`public-card-icon-${card.slot}`}>Upload icon</label>
                    <input id={`public-card-icon-${card.slot}`} className="icon-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { selectIcon(card.slot, event.target.files?.[0]); event.currentTarget.value = ""; }} />
                    {card.iconData && <button className="public-card-icon-remove" type="button" onClick={() => setCards((current) => current.map((item) => item.slot === card.slot ? { ...item, iconData: null } : item))}>Remove icon</button>}
                    <small>PNG, JPEG or WebP · 256 KB max</small>
                  </div>
                  <div className="public-card-editor-actions">
                    <button type="submit" disabled={savingSlot === card.slot}>{savingSlot === card.slot ? "Saving…" : "Save"}</button>
                    <button className="remove" type="button" disabled={savingSlot === card.slot || (!card.title && !card.url && !card.description && !card.techStack && !card.iconData)} onClick={() => removeCard(card.slot)}>Remove</button>
                  </div>
                </form>
              ))}
            </div>
            <footer><span>{message || "Only saved cards appear on the logged-out page."}</span><button type="button" onClick={() => setIsOpen(false)}>Done</button></footer>
          </section>
        </div>, document.body)}
    </>
  );
}
