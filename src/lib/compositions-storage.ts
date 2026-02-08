import { type Personagem } from "./membros-storage";
import { generateId } from "./membros-storage";

const STORAGE_KEY = "abi-character-list-composicoes";
const LEGACY_KEY = "abi-character-list-composicao";

export type CompositionType = "mythic" | "heroic";

export interface SlotChar {
  memberId: string;
  playerName: string;
  char: Personagem;
  saved?: boolean;
}

export interface CompositionData {
  id: string;
  name: string;
  type?: CompositionType;
  slots: (SlotChar | null)[];
  lastResetAt?: number;
}

function normalizeSlots(slots: unknown): (SlotChar | null)[] {
  if (!Array.isArray(slots)) return Array(20).fill(null);
  const normalized = slots.length >= 20
    ? slots.slice(0, 20)
    : [...slots, ...Array(20 - slots.length).fill(null)];
  return normalized.map((s) => {
    if (!s || typeof s !== "object") return null;
    const slot = s as SlotChar;
    return { ...slot, saved: slot.saved ?? false };
  });
}

function getLastTuesday12Timestamp(): number {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  const day = d.getDay();
  const daysSinceTuesday = (day + 5) % 7;
  const hoursPastNoon = now.getHours() * 60 + now.getMinutes() >= 12 * 60;
  const daysBack = daysSinceTuesday + (daysSinceTuesday === 0 && !hoursPastNoon ? 7 : 0);
  d.setDate(d.getDate() - daysBack);
  return d.getTime();
}

export function applyWeeklyReset(comp: CompositionData): CompositionData {
  if (comp.type !== "mythic" && comp.type !== "heroic") return comp;
  const lastTuesday12 = getLastTuesday12Timestamp();
  if (comp.lastResetAt !== undefined && comp.lastResetAt >= lastTuesday12) return comp;
  const slots = (comp.slots ?? []).map((s) => {
    if (!s) return null;
    return { ...s, saved: false };
  });
  return { ...comp, slots, lastResetAt: lastTuesday12 };
}

function migrateFromLegacy(): CompositionData[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { name?: string; slots?: unknown };
    const name = data.name ?? "";
    const slots = normalizeSlots(data.slots);
    if (name || slots.some(Boolean)) {
      const migrated: CompositionData = {
        id: generateId(),
        name: name || "Composição migrada",
        slots,
      };
      localStorage.removeItem(LEGACY_KEY);
      return [migrated];
    }
  } catch {
    // ignore
  }
  return null;
}

export function loadCompositions(): CompositionData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const migrated = migrateFromLegacy();
      if (migrated) {
        saveCompositions(migrated);
        return migrated;
      }
      return [];
    }
    const parsed = JSON.parse(raw) as { compositions?: CompositionData[] } | CompositionData[];
    const list = Array.isArray(parsed) ? parsed : parsed?.compositions;
    if (Array.isArray(list)) return list;
    const migrated = migrateFromLegacy();
    if (migrated) {
      saveCompositions(migrated);
      return migrated;
    }
    return [];
  } catch {
    return [];
  }
}

function saveCompositions(list: CompositionData[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ compositions: list }));
}

export function getComposition(id: string): CompositionData | undefined {
  const list = loadCompositions();
  const comp = list.find((c) => c.id === id);
  if (!comp) return undefined;
  const reset = applyWeeklyReset(comp);
  if (reset !== comp) {
    const updated = list.map((c) => (c.id === id ? reset : c));
    saveCompositions(updated);
  }
  return reset;
}

export function saveComposition(data: Omit<CompositionData, "id"> & { id?: string }): CompositionData {
  const list = loadCompositions();
  const id = data.id ?? generateId();
  const existing = list.find((c) => c.id === id);
  const comp: CompositionData = {
    ...data,
    id,
    type: (data.type === "heroic" ? "heroic" : "mythic") as CompositionType,
    slots: normalizeSlots(data.slots),
    lastResetAt: existing?.lastResetAt ?? getLastTuesday12Timestamp(),
  };
  const idx = list.findIndex((c) => c.id === id);
  if (idx >= 0) {
    list[idx] = comp;
  } else {
    list.push(comp);
  }
  saveCompositions(list);
  return comp;
}

export function deleteComposition(id: string) {
  saveCompositions(loadCompositions().filter((c) => c.id !== id));
}
