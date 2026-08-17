"use client";

import * as React from "react";

/**
 * <PwaRegister />
 * ---------------
 * Registers the PRE-MORTEM IA service worker (`/sw.js`) once the app
 * has hydrated in the browser. Renders nothing.
 *
 * IMPORTANT: Only registers in PRODUCTION. In development the SW caches
 * HTML, which causes React hydration mismatches when the code changes
 * (the SW serves stale HTML while the JS bundle is fresh). Skipping
 * registration in dev eliminates this entire class of errors.
 *
 * On mount in production, it also unregisters any pre-existing SW + clears
 * all caches so a stale v1 SW from a previous session can't serve old HTML.
 */
export function PwaRegister() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // In development: unregister any existing SW and clear caches so stale
    // HTML from a previous production build can't cause hydration mismatches.
    if (process.env.NODE_ENV !== "production") {
      (async () => {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const r of regs) {
            await r.unregister();
          }
          if (window.caches) {
            const keys = await caches.keys();
            for (const k of keys) {
              await caches.delete(k);
            }
          }
        } catch {
          /* ignore */
        }
      })();
      return;
    }

    // Production: register the SW with fresh-update semantics.
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((registration) => {
          registration.update().catch(() => {});
          let reloading = false;
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (reloading) return;
            reloading = true;
            window.location.reload();
          });
        })
        .catch((error: unknown) => {
          console.error("[PWA] Service worker registration failed:", error);
        });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}

export default PwaRegister;
