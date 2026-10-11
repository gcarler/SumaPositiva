"use client";

import { useEffect } from "react";

/**
 * Registra el Service Worker de POLIS para soporte PWA y resiliencia offline.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV !== "test"
    ) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            if (process.env.NODE_ENV === "development") {
              console.log("POLIS ServiceWorker registrado con scope:", registration.scope);
            }
          })
          .catch((error) => {
            if (process.env.NODE_ENV === "development") {
              console.warn("Fallo al registrar ServiceWorker:", error);
            }
          });
      });
    }
  }, []);

  return null;
}
