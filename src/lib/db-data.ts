/**
 * Camada de dados para players, characters e compositions.
 * Usa MongoDB. Execute a migration (db:migrate) antes de usar.
 * NÃO importar em client components - use @/lib/types para tipos e helpers.
 */
import { getDb } from "./db";
import type { Personagem, SlotChar, CompositionData, CompositionType, MembroData } from "./types";
import { generateId } from "./types";

export type { Personagem, SlotChar, CompositionType, CompositionData, MembroData } from "./types";
export { generateId, toExportFormat } from "./types";

const COLL = {
  players: "players",
  characters: "characters",
  compositions: "compositions",
  compositionSlots: "composition_slots",
} as const;

function getLastTuesday12Timestamp(): number {
  const now = new Date();
  const d = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12,
    0,
    0,
    0
  );
  const day = d.getDay();
  const daysSinceTuesday = (day + 5) % 7;
  const hoursPastNoon =
    now.getHours() * 60 + now.getMinutes() >= 12 * 60;
  const daysBack =
    daysSinceTuesday + (daysSinceTuesday === 0 && !hoursPastNoon ? 7 : 0);
  d.setDate(d.getDate() - daysBack);
  return d.getTime();
}

function normalizeSlots(slots: (SlotChar | null)[]): (SlotChar | null)[] {
  if (!Array.isArray(slots)) return Array(20).fill(null);
  const normalized =
    slots.length >= 20
      ? slots.slice(0, 20)
      : [...slots, ...Array(20 - slots.length).fill(null)];
  return normalized.map((s) => {
    if (!s || typeof s !== "object") return null;
    return { ...s, saved: s.saved ?? false };
  });
}

/** Converte doc MongoDB para Personagem (objeto plano, sem _id ou ObjectId). */
function charDocToPersonagem(c: Record<string, unknown>): Personagem {
  const extra = (c.extra && typeof c.extra === "object" ? c.extra : {}) as Record<string, unknown>;
  const char: Personagem = {
    id: c.id as string,
    nome: (c.nome ?? c.name ?? "") as string,
    realm: (c.realm ?? "") as string,
    itemLevel: Number(c.itemLevel ?? c.item_level ?? 0),
    classe: (c.classe ?? c.class) as string | undefined,
    saved_mythic: c.saved_mythic as boolean | undefined,
    saved_heroic: c.saved_heroic as boolean | undefined,
    isMain: (c.isMain ?? extra.isMain) as boolean | undefined,
    altNumber: (c.altNumber ?? extra.altNumber) as number | undefined,
    vault: c.vault as { raids: unknown[] } | undefined,
    raids: c.raids as Personagem["raids"],
  };
  return JSON.parse(JSON.stringify(char)) as Personagem;
}

/** Converte docs para MembroData (objetos planos, serializáveis para Client Components). */
function playerDocToMembro(p: Record<string, unknown>, chars: Record<string, unknown>[]): MembroData {
  return JSON.parse(
    JSON.stringify({
      id: p.id as string,
      playerName: p.player_name as string | undefined,
      realm: p.realm as string | undefined,
      version: p.version as number | undefined,
      addon: p.addon as string | undefined,
      exportedAt: p.exported_at as number | undefined,
      characters: chars.map(charDocToPersonagem),
    })
  ) as MembroData;
}

// --- Players ---

export async function dbListPlayers(): Promise<MembroData[]> {
  const database = await getDb();
  const players = database.collection(COLL.players);
  const characters = database.collection(COLL.characters);
  const list = await players.find({}).sort({ player_name: 1 }).toArray();
  const result: MembroData[] = [];
  for (const p of list) {
    const pObj = p as unknown as Record<string, unknown>;
    const id = pObj.id as string;
    const chars = await characters.find({ player_id: id }).toArray();
    result.push(
      playerDocToMembro(
        pObj,
        chars.map((c) => c as unknown as Record<string, unknown>)
      )
    );
  }
  return result;
}

export async function dbGetPlayer(id: string): Promise<MembroData | null> {
  const database = await getDb();
  const players = database.collection(COLL.players);
  const characters = database.collection(COLL.characters);
  const p = await players.findOne({ id });
  if (!p) return null;
  const pObj = p as unknown as Record<string, unknown>;
  const chars = await characters.find({ player_id: id }).toArray();
  return playerDocToMembro(
    pObj,
    chars.map((c) => c as unknown as Record<string, unknown>)
  );
}

export async function dbSavePlayer(
  data: Omit<MembroData, "id"> & { id?: string }
): Promise<MembroData> {
  const id = data.id ?? generateId();
  const database = await getDb();
  const players = database.collection(COLL.players);
  const characters = database.collection(COLL.characters);

  await players.updateOne(
    { id },
    {
      $set: {
        id,
        player_name: data.playerName ?? null,
        realm: data.realm ?? null,
        version: data.version ?? null,
        addon: data.addon ?? null,
        exported_at: data.exportedAt ?? null,
        updated_at: new Date(),
      },
    },
    { upsert: true }
  );

  const charsToKeep = new Set((data.characters ?? []).map((c) => c.id).filter(Boolean));
  for (const char of data.characters ?? []) {
    await dbSaveCharacter(id, char);
  }

  const existing = await characters.find({ player_id: id }).toArray();
  for (const row of existing) {
    const r = row as unknown as { id: string };
    if (!charsToKeep.has(r.id)) {
      await characters.deleteOne({ id: r.id });
    }
  }

  const saved = await dbGetPlayer(id);
  if (!saved) throw new Error("Falha ao salvar player");
  return saved;
}

export async function dbDeletePlayer(id: string): Promise<void> {
  const database = await getDb();
  const players = database.collection(COLL.players);
  const characters = database.collection(COLL.characters);
  await characters.deleteMany({ player_id: id });
  await players.deleteOne({ id });
}

// --- Characters ---

function safeToJson(val: unknown): object | null {
  if (val == null) return null;
  try {
    const parsed = typeof val === "string" ? JSON.parse(val) : val;
    return typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function charToDoc(char: Personagem) {
  const { id: _id, nome, realm, itemLevel, classe, vault, raids, ...rest } = char;
  const extra = Object.keys(rest).length ? rest : undefined;
  return {
    name: nome,
    realm,
    item_level: Math.round(Number(itemLevel) || 0),
    class: classe ?? null,
    saved_mythic: (char as Record<string, unknown>).saved_mythic ?? false,
    saved_heroic: (char as Record<string, unknown>).saved_heroic ?? false,
    vault: safeToJson(vault),
    raids: safeToJson(raids),
    extra: extra ? safeToJson(extra) : null,
  };
}

export async function dbSaveCharacter(
  playerId: string,
  char: Personagem
): Promise<Personagem> {
  const id = char.id ?? generateId();
  const database = await getDb();
  const characters = database.collection(COLL.characters);
  const doc = charToDoc(char);

  const fullDoc = {
    id,
    player_id: playerId,
    name: doc.name,
    realm: doc.realm,
    class: doc.class,
    item_level: doc.item_level,
    saved_mythic: doc.saved_mythic,
    saved_heroic: doc.saved_heroic,
    isMain: (char as Record<string, unknown>).isMain ?? undefined,
    altNumber: (char as Record<string, unknown>).altNumber ?? undefined,
    vault: doc.vault,
    raids: doc.raids,
    extra: doc.extra,
    updated_at: new Date(),
  };

  const existing = await characters.findOne({ id });
  if (existing) {
    await characters.updateOne(
      { id },
      { $set: fullDoc }
    );
  } else {
    await characters.insertOne({
      ...fullDoc,
      created_at: new Date(),
    });
  }

  return { ...char, id };
}

// --- Compositions ---

export async function dbListCompositions(): Promise<CompositionData[]> {
  const database = await getDb();
  const compositions = database.collection(COLL.compositions);
  const list = await compositions.find({}).sort({ name: 1 }).toArray();
  const result: CompositionData[] = [];
  for (const c of list) {
    const comp = c as unknown as Record<string, unknown>;
    const compData = await dbGetComposition(comp.id as string);
    if (compData) result.push(compData);
  }
  return result;
}

export async function dbGetComposition(
  id: string
): Promise<CompositionData | null> {
  const database = await getDb();
  const compositions = database.collection(COLL.compositions);
  const compositionSlots = database.collection(COLL.compositionSlots);

  const comp = await compositions.findOne({ id });
  if (!comp) return null;

  const compObj = comp as unknown as Record<string, unknown>;
  const lastTuesday12 = getLastTuesday12Timestamp();
  let lastResetAt = Number(compObj.last_reset_at ?? lastTuesday12);
  const needsReset = lastResetAt < lastTuesday12;

  const slotDocs = await compositionSlots
    .find({ composition_id: id })
    .sort({ slot_index: 1 })
    .toArray();

  const slotsMap = new Map<number, Record<string, unknown>>();
  for (const s of slotDocs) {
    const sObj = s as unknown as Record<string, unknown>;
    slotsMap.set(sObj.slot_index as number, sObj);
  }

  const slots: (SlotChar | null)[] = [];
  for (let i = 0; i < 20; i++) {
    const s = slotsMap.get(i);
    if (!s || !s.character_id) {
      slots.push(null);
      continue;
    }
    const charData = (s.char_data ?? {}) as Record<string, unknown>;
    const char: Personagem = {
      id: s.character_id as string,
      nome: (charData.nome ?? charData.name ?? "") as string,
      realm: (charData.realm ?? "") as string,
      itemLevel: Number(charData.itemLevel ?? charData.item_level ?? 0),
      classe: (charData.classe ?? charData.class) as string | undefined,
      vault: charData.vault as Personagem["vault"],
      raids: charData.raids as Personagem["raids"],
    };
    slots.push({
      memberId: (s.player_id ?? "") as string,
      playerName: (s.player_name ?? "") as string,
      char,
      saved: needsReset ? false : Boolean(s.saved ?? false),
    });
  }

  if (needsReset) {
    await compositionSlots.updateMany(
      { composition_id: id },
      { $set: { saved: false, updated_at: new Date() } }
    );
    await compositions.updateOne(
      { id },
      { $set: { last_reset_at: lastTuesday12, updated_at: new Date() } }
    );
    lastResetAt = lastTuesday12;
    for (const slot of slots) {
      if (slot) slot.saved = false;
    }
  }

  const scheduledAt = compObj.scheduled_at != null
    ? (compObj.scheduled_at instanceof Date ? compObj.scheduled_at.toISOString() : String(compObj.scheduled_at))
    : undefined;

  const result: CompositionData = {
    id: compObj.id as string,
    name: compObj.name as string,
    type: (compObj.type ?? "mythic") as CompositionType,
    slots,
    lastResetAt,
    scheduledAt: scheduledAt ?? undefined,
  };
  return JSON.parse(JSON.stringify(result)) as CompositionData;
}

export async function dbSaveComposition(
  data: Omit<CompositionData, "id"> & { id?: string }
): Promise<CompositionData> {
  const id = data.id ?? generateId();
  const type: CompositionType =
    data.type === "heroic" ? "heroic" : "mythic";
  const slots = normalizeSlots(data.slots ?? []);
  const lastTuesday12 = getLastTuesday12Timestamp();

  const database = await getDb();
  const compositions = database.collection(COLL.compositions);
  const compositionSlots = database.collection(COLL.compositionSlots);

  const existing = await compositions.findOne({ id });
  const prev = existing as unknown as Record<string, unknown> | null;
  const lastResetAt = prev ? Number(prev.last_reset_at) : lastTuesday12;
  const scheduledAt = (data as Record<string, unknown>).scheduledAt ?? null;

  await compositions.updateOne(
    { id },
    {
      $set: {
        name: data.name,
        type,
        last_reset_at: lastResetAt,
        scheduled_at: scheduledAt ? new Date(scheduledAt as string) : null,
        updated_at: new Date(),
      },
    },
    { upsert: true }
  );

  const charCount = new Map<string, number>();
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const slotId = generateId();
    if (!slot) {
      await compositionSlots.updateOne(
        { composition_id: id, slot_index: i },
        {
          $set: {
            character_id: null,
            player_id: null,
            player_name: null,
            saved: false,
            char_data: null,
            updated_at: new Date(),
          },
        },
        { upsert: true }
      );
      continue;
    }

    const char = slot.char;
    const count = (charCount.get(char.id) ?? 0) + 1;
    charCount.set(char.id, count);

    const saved =
      type === "heroic"
        ? count >= 2
        : false;
    const charData = {
      id: char.id,
      nome: char.nome,
      realm: char.realm,
      itemLevel: char.itemLevel,
      classe: char.classe,
      isMain: (char as Record<string, unknown>).isMain,
      altNumber: (char as Record<string, unknown>).altNumber,
      vault: char.vault,
      raids: char.raids,
    };

    if (type === "mythic" && count > 1) {
      throw new Error(
        `Mythic: personagem "${char.nome}" não pode aparecer mais de uma vez na mesma composição/semana.`
      );
    }

    await compositionSlots.updateOne(
      { composition_id: id, slot_index: i },
      {
        $set: {
          id: slotId,
          character_id: char.id,
          player_id: slot.memberId,
          player_name: slot.playerName,
          saved,
          char_data: charData,
          updated_at: new Date(),
        },
      },
      { upsert: true }
    );
  }

  const saved = await dbGetComposition(id);
  if (!saved) throw new Error("Falha ao salvar composição");
  return saved;
}

export async function dbDeleteComposition(id: string): Promise<void> {
  const database = await getDb();
  const compositions = database.collection(COLL.compositions);
  const compositionSlots = database.collection(COLL.compositionSlots);
  await compositionSlots.deleteMany({ composition_id: id });
  await compositions.deleteOne({ id });
}
