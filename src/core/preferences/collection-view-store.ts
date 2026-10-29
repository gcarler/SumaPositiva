"use client";

import { useCallback, useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import type { CollectionViewMode } from "@/shared/ui/collection-view";

interface CollectionPreferences {
  views: Record<string, CollectionViewMode>;
  setView: (module: string, view: CollectionViewMode) => void;
}

// Privacy settings or a full storage quota must not prevent changing the view.
const storage: StateStorage = {
  getItem: (key) => {
    try { return window.localStorage.getItem(key); } catch { return null; }
  },
  setItem: (key, value) => {
    try { window.localStorage.setItem(key, value); } catch { /* Session preference remains available. */ }
  },
  removeItem: (key) => {
    try { window.localStorage.removeItem(key); } catch { /* Storage may be disabled. */ }
  },
};

const useCollectionPreferences = create<CollectionPreferences>()(
  persist(
    (set) => ({
      views: {},
      setView: (module, view) => set((state) => ({ views: { ...state.views, [module]: view } })),
    }),
    {
      name: "polis-vistas-colecciones-v1",
      storage: createJSONStorage(() => storage),
      skipHydration: true,
      partialize: (state) => ({ views: state.views }),
      merge: (persisted, current) => {
        const views: Record<string, CollectionViewMode> = {};
        if (persisted && typeof persisted === "object" && "views" in persisted) {
          const saved = persisted.views;
          if (saved && typeof saved === "object" && !Array.isArray(saved)) {
            for (const [key, value] of Object.entries(saved)) {
              if (value === "lista" || value === "tarjetas") views[key] = value;
            }
          }
        }
        return { ...current, views };
      },
    },
  ),
);

/** Presentation preferences only; changing views never reloads or mutates records. */
export function useCollectionView(module: string, initial: CollectionViewMode = "tarjetas") {
  const view = useCollectionPreferences((state) => state.views[module] ?? initial);
  const setView = useCollectionPreferences((state) => state.setView);
  useEffect(() => {
    if (!useCollectionPreferences.persist.hasHydrated()) {
      void useCollectionPreferences.persist.rehydrate();
    }
  }, []);
  const changeView = useCallback((next: CollectionViewMode) => setView(module, next), [module, setView]);
  return [view, changeView] as const;
}
