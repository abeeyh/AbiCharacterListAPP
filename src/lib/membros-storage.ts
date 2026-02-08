export interface Personagem {
  id: string;
  nome: string;
  realm: string;
  itemLevel: number;
  classe?: string;
  vault?: { raids: unknown[] };
  raids?: Array<{ difficulty: string; difficultyID: number; name: string; bossesKilled: number; bossesTotal: number; expires: number }>;
  [key: string]: unknown;
}

export interface MembroData {
  id: string;
  playerName?: string;
  characters: Personagem[];
  version?: number;
  addon?: string;
  realm?: string;
  exportedAt?: number;
}

const STORAGE_KEY = "abi-character-list-membros";

export function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function migrateFromLegacy(raw: unknown): MembroData[] | null {
  if (raw && typeof raw === "object" && "characters" in raw && !("members" in raw)) {
    const legacy = raw as { playerName?: string; characters: Personagem[]; version?: number; addon?: string; realm?: string; exportedAt?: number };
    return [{
      id: generateId(),
      playerName: legacy.playerName ?? legacy.realm ?? "",
      characters: legacy.characters ?? [],
      version: legacy.version,
      addon: legacy.addon,
      realm: legacy.realm,
      exportedAt: legacy.exportedAt,
    }];
  }
  return null;
}

export function loadMembers(): MembroData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { members?: MembroData[] } | MembroData[];
    const members = Array.isArray(parsed) ? parsed : parsed.members;
    if (Array.isArray(members)) return members;
    const migrated = migrateFromLegacy(parsed);
    if (migrated) {
      saveMembers(migrated);
      return migrated;
    }
    return [];
  } catch {
    return [];
  }
}

export function saveMembers(members: MembroData[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ members }));
}

export function getMember(id: string): MembroData | undefined {
  return loadMembers().find((m) => m.id === id);
}

export function saveMember(data: Omit<MembroData, "id"> & { id?: string }): MembroData {
  const members = loadMembers();
  const id = data.id ?? generateId();
  const member: MembroData = { ...data, id };
  const idx = members.findIndex((m) => m.id === id);
  if (idx >= 0) {
    members[idx] = member;
  } else {
    members.push(member);
  }
  saveMembers(members);
  return member;
}

export function deleteMember(id: string) {
  saveMembers(loadMembers().filter((m) => m.id !== id));
}

export function toExportFormat(data: MembroData): object {
  if (data.version != null && data.addon) {
    return {
      version: data.version,
      addon: data.addon,
      characters: data.characters.map((c) => {
        const { id: _id, nome, itemLevel, ...rest } = c;
        return { name: nome, ilvl: itemLevel, ...rest };
      }),
      realm: data.realm ?? data.playerName ?? "",
      exportedAt: Math.floor(Date.now() / 1000),
    };
  }
  return { playerName: data.playerName ?? "", characters: data.characters };
}
