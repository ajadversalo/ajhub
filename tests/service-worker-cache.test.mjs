import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("serves a validated cached app shell while Render wakes", async () => {
  const [serviceWorker, layout] = await Promise.all([
    readFile(new URL("public/sw.js", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
  ]);

  assert.match(layout, /"ajhub-app": "1"/);
  assert.match(serviceWorker, /await cache\.match\("\/"\)/);
  assert.match(serviceWorker, /event\.waitUntil\(network\.catch/);
  assert.match(serviceWorker, /name=\["'\]ajhub-app/);
  assert.doesNotMatch(serviceWorker, /cache\.put\("\/", copy\)/);
});

test("bypasses or clears the shell around authentication changes", async () => {
  const [serviceWorker, callback, header, registration] = await Promise.all([
    readFile(new URL("public/sw.js", root), "utf8"),
    readFile(new URL("app/api/auth/google/callback/route.ts", root), "utf8"),
    readFile(new URL("app/SiteHeader.tsx", root), "utf8"),
    readFile(new URL("app/PwaRegistration.tsx", root), "utf8"),
  ]);

  assert.match(serviceWorker, /searchParams\.has\("signed_in"\)/);
  assert.match(callback, /\/\?signed_in=1/);
  assert.match(header, /key\.startsWith\("aj-hub-"\)/);
  assert.match(registration, /searchParams\.delete\("signed_in"\)/);
});
