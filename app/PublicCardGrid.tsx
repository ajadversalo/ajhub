"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type PublicCard = {
  slot: number;
  title: string;
  description: string;
  url: string;
  techStack: string;
  iconData: string | null;
};

const tones = ["coral", "blue", "green", "yellow", "ink", "sky", "red", "sand", "mint"];

function Card({ card, spotlight = false, active = false, onEnter, onLeave }: {
  card: PublicCard;
  spotlight?: boolean;
  active?: boolean;
  onEnter?: (pointerType: string) => void;
  onLeave?: () => void;
}) {
  return (
    <a
      className={`public-url-card ${tones[card.slot - 1]}${spotlight ? " public-url-card-spotlight" : ""}${active ? " is-spotlight-source" : ""}`}
      href={card.url}
      target="_blank"
      rel="noopener noreferrer"
      tabIndex={spotlight ? -1 : undefined}
      onPointerEnter={(event) => onEnter?.(event.pointerType)}
      onPointerLeave={onLeave}
    >
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
  );
}

export function PublicCardGrid({ cards }: { cards: PublicCard[] }) {
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeCard = cards.find((card) => card.slot === activeSlot) ?? null;

  function clearCloseTimer() {
    if (!closeTimer.current) return;
    window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }

  function showSpotlight(card: PublicCard, pointerType: string) {
    if (pointerType !== "mouse" || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    clearCloseTimer();
    setActiveSlot(card.slot);
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => setActiveSlot(null), 850);
  }

  useEffect(() => {
    if (activeSlot === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveSlot(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeSlot]);

  useEffect(() => () => clearCloseTimer(), []);

  return (
    <>
      <section className="public-card-grid" aria-label="Featured links">
        {cards.map((card) => (
          <Card
            card={card}
            active={card.slot === activeSlot}
            key={card.slot}
            onEnter={(pointerType) => showSpotlight(card, pointerType)}
            onLeave={scheduleClose}
          />
        ))}
      </section>
      {activeCard && createPortal(
        <div className={`public-card-spotlight-layer ${tones[activeCard.slot - 1]}`} aria-hidden="true">
          <Card card={activeCard} spotlight onEnter={clearCloseTimer} onLeave={scheduleClose} />
        </div>,
        document.body,
      )}
    </>
  );
}
