"use client";

import { useEffect } from "react";

export function PwaRegistration() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("signed_in")) {
      url.searchParams.delete("signed_in");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }

    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // The dashboard remains fully usable when service workers are unavailable.
    });
  }, []);

  return null;
}
