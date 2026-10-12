import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";
import type { AtlasRoute, Place } from "../types";
import { storageGet, storageSet } from "../utils/storage";

interface CollectionState {
  savedPlaces: Place[];
  savedRoutes: AtlasRoute[];
  savePlace: (place: Place) => void;
  saveRoute: (route: AtlasRoute) => void;
  removeRoute: (id: string) => void;
  isSaved: (id: string) => boolean;
}

const Context = createContext<CollectionState | null>(null);
function read<T>(key: string, fallback: T): T {
  try { return JSON.parse(storageGet(key) ?? "null") ?? fallback; } catch { return fallback; }
}

export function CollectionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const prefix = `atlasia.member.${user!.uid}`;
  const [savedPlaces, setSavedPlaces] = useState<Place[]>(() => read(`${prefix}.places`, []));
  const [savedRoutes, setSavedRoutes] = useState<AtlasRoute[]>(() => read(`${prefix}.routes`, []));
  useEffect(() => { storageSet(`${prefix}.places`, JSON.stringify(savedPlaces)); }, [prefix, savedPlaces]);
  useEffect(() => { storageSet(`${prefix}.routes`, JSON.stringify(savedRoutes)); }, [prefix, savedRoutes]);
  const savePlace = (place: Place) => setSavedPlaces((current) => current.some((item) => item.id === place.id) ? current.filter((item) => item.id !== place.id) : [place, ...current]);
  const saveRoute = (route: AtlasRoute) => setSavedRoutes((current) => [route, ...current.filter((item) => item.id !== route.id)].slice(0, 40));
  const removeRoute = (id: string) => setSavedRoutes((current) => current.filter((route) => route.id !== id));
  return <Context.Provider value={{ savedPlaces, savedRoutes, savePlace, saveRoute, removeRoute, isSaved: (id) => savedPlaces.some((place) => place.id === id) }}>{children}</Context.Provider>;
}

export function useCollections() {
  const state = useContext(Context);
  if (!state) throw new Error("CollectionsProvider is required.");
  return state;
}