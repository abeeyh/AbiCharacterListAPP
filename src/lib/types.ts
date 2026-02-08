/**
 * Tipos e funções puras compartilhados.
 * Sem dependências de banco - seguro para uso em client components.
 */

export interface Personagem {
  id: string;
  nome: string;
  realm: string;
  itemLevel: number;
  classe?: string;
  saved_mythic?: boolean;
  saved_heroic?: boolean;
  vault?: { raids: unknown[] };
  raids?: Array<{
    difficulty: string;
    difficultyID: number;
    name: string;
    bossesKilled: number;
    bossesTotal: number;
    expires: number;
  }>;
  [key: string]: unknown;
}

export interface SlotChar {
  memberId: string;
  playerName: string;
  char: Personagem;
  saved?: boolean;
}

export type CompositionType = "mythic" | "heroic";

export interface CompositionData {
  id: string;
  name: string;
  type?: CompositionType;
  slots: (SlotChar | null)[];
  lastResetAt?: number;
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

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
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
