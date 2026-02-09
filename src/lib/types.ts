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

const CLASS_FILE_TO_NAME: Record<string, string> = {
  WARRIOR: "Warrior", PALADIN: "Paladin", HUNTER: "Hunter", ROGUE: "Rogue",
  PRIEST: "Priest", SHAMAN: "Shaman", MAGE: "Mage", WARLOCK: "Warlock",
  MONK: "Monk", DEMONHUNTER: "Demon Hunter", DRUID: "Druid",
  DEATHKNIGHT: "Death Knight", EVOKER: "Evoker",
};

/** Nomes de classe em português -> inglês. Valida e salva sempre em inglês. */
const CLASS_PT_TO_EN: Record<string, string> = {
  guerreiro: "Warrior", guerreira: "Warrior", paladino: "Paladin", paladina: "Paladin",
  caçador: "Hunter", caçadora: "Hunter", cacador: "Hunter", cacadora: "Hunter",
  ladino: "Rogue", ladina: "Rogue", sacerdote: "Priest", sacerdotisa: "Priest",
  xamã: "Shaman", xama: "Shaman", mago: "Mage", maga: "Mage",
  bruxo: "Warlock", bruxa: "Warlock", monge: "Monk", monja: "Monk",
  "caçador de demônios": "Demon Hunter", "caçadora de demônios": "Demon Hunter",
  "cacador de demonios": "Demon Hunter", druida: "Druid", druide: "Druid",
  "cavaleiro da morte": "Death Knight", "cavaleira da morte": "Death Knight",
  evocador: "Evoker", evocadora: "Evoker",
};

/** Normaliza string para comparação (nome+realm). */
function normalized(s: string): string {
  return String(s ?? "").trim().toLowerCase();
}

/** Converte classe em português para inglês. Retorna a string original se já estiver em inglês. */
function normalizeClassToEnglish(classe: string): string | undefined {
  const s = String(classe ?? "").trim();
  if (!s) return undefined;
  const lower = s.toLowerCase();
  if (CLASS_PT_TO_EN[lower]) return CLASS_PT_TO_EN[lower];
  if (CLASS_FILE_TO_NAME[s.toUpperCase().replace(/\s/g, "")]) return CLASS_FILE_TO_NAME[s.toUpperCase().replace(/\s/g, "")];
  return s; // já em inglês ou desconhecido
}

/**
 * Mescla personagens importados com os existentes e valida.
 * Útil quando há dois JSON de contas diferentes: em vez de sobrescrever,
 * mantém os personagens já existentes e adiciona/atualiza os do import.
 * - Personagens com mesmo nome+realm: atualiza dados (ilvl, classe etc.) mas preserva saved_mythic/saved_heroic
 * - Personagens novos: adiciona à lista
 * - Personagens existentes que não estão no import: mantidos
 */
export function mergeAndValidateCharacters(
  existing: Personagem[],
  importedRaw: unknown[]
): Personagem[] {
  const chars = Array.isArray(importedRaw) ? importedRaw : [];
  const result = [...existing];

  for (const c of chars) {
    const obj = c && typeof c === "object" ? (c as Record<string, unknown>) : null;
    if (!obj) continue;

    const nome = (obj.nome ?? obj.name ?? "") as string;
    if (!nome || !String(nome).trim()) continue; // validação: ignora sem nome

    const realm = (obj.realm ?? "") as string;
    const itemLevel = Number(obj.ilvl ?? obj.itemLevel ?? 0);
    const classeFromJson = (obj.classe ?? "") as string;
    const classeFromFile = (obj.class ?? "") as string;
    const classeRaw = classeFromJson || (classeFromFile && CLASS_FILE_TO_NAME[classeFromFile as string]) || "";
    const classe = normalizeClassToEnglish(classeRaw) || undefined;

    const imported: Personagem = {
      ...obj,
      id: (obj.id as string) || generateId(),
      nome: String(nome).trim(),
      realm: String(realm ?? "").trim(),
      itemLevel: Number.isFinite(itemLevel) ? itemLevel : 0,
      classe: classe || undefined,
    } as Personagem;

    const idx = result.findIndex(
      (e) => normalized(e.nome) === normalized(nome) && normalized(e.realm) === normalized(realm)
    );
    if (idx >= 0) {
      // já existe: preserva saved_mythic e saved_heroic, atualiza o resto
      imported.saved_mythic = result[idx].saved_mythic;
      imported.saved_heroic = result[idx].saved_heroic;
      imported.id = result[idx].id;
      result[idx] = imported;
    } else {
      result.push(imported);
    }
  }

  return result;
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
