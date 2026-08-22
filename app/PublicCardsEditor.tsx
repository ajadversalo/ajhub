"use client";

import { FormEvent, useEffect, useState } from "react";

type EditablePublicCard = {
  slot: number;
  title: string;
  description: string;
  url: string;
  techStack: string;
};

const emptyCards = () => Array.from({ length: 9 }, (_, index) => ({
  slot: index + 1,
  title: "",
  description: "",
  url: "",
  techStack: "",
}));

export function PublicCardsEditor() {
  const [isOpen, setIsOpen] = useState(false);
  const [cards, setCards] = useState<EditablePublicCard[]>(emptyCards);
  const [savingSlot, setSavingSlot] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;
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
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  function updateCard(slot: number, field: keyof Omit<EditablePublicCard, "slot">, value: string) {
    setCards((current) => current.map((card) => card.slot === slot ? { ...card, [field]: value } : card));
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

  return (
    <>
      <button className="public-cards-edit-button" type="button" onClick={() => { setMessage(""); setIsOpen(true); }} aria-label="Edit public cards" title="Edit public cards">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h4v4H5V5Zm10 0h4v4h-4V5ZM5 15h4v4H5v-4Zm10 0h4v4h-4v-4Z" /></svg>
      </button>
      {isOpen && (
        <div className="public-card-editor-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
          <section className="public-card-editor" role="dialog" aria-modal="true" aria-labelledby="public-card-editor-title">
            <header>
              <div><span>Public page</span><h2 id="public-card-editor-title">Expanded cards</h2></div>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Close public card editor">×</button>
            </header>
            <div className="public-card-editor-body">
              {cards.map((card) => (
                <form className="public-card-editor-row" onSubmit={(event) => saveCard(event, card)} key={card.slot}>
                  <strong>{String(card.slot).padStart(2, "0")}</strong>
                  <label>Title<input value={card.title} maxLength={80} onChange={(event) => updateCard(card.slot, "title", event.target.value)} /></label>
                  <label>URL<input type="url" value={card.url} maxLength={2048} placeholder="https://" onChange={(event) => updateCard(card.slot, "url", event.target.value)} /></label>
                  <label className="public-card-description">Description<textarea value={card.description} maxLength={280} rows={3} onChange={(event) => updateCard(card.slot, "description", event.target.value)} /></label>
                  <label className="public-card-stack">Tech stack<input value={card.techStack} maxLength={200} placeholder="React, TypeScript, Cloudflare" onChange={(event) => updateCard(card.slot, "techStack", event.target.value)} /></label>
                  <div className="public-card-editor-actions">
                    <button type="submit" disabled={savingSlot === card.slot}>{savingSlot === card.slot ? "Saving…" : "Save"}</button>
                    <button className="remove" type="button" disabled={savingSlot === card.slot || (!card.title && !card.url && !card.description && !card.techStack)} onClick={() => removeCard(card.slot)}>Remove</button>
                  </div>
                </form>
              ))}
            </div>
            <footer><span>{message || "Only saved cards appear on the logged-out page."}</span><button type="button" onClick={() => setIsOpen(false)}>Done</button></footer>
          </section>
        </div>
      )}
    </>
  );
}
