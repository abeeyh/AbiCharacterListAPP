/**
 * Camada de dados para players, characters e compositions.
 * Usa Neon PostgreSQL. Execute a migration (db-schema.sql) antes de usar.
 * NÃO importar em client components - use @/lib/types para tipos e helpers.
 */
import { sql } from "./db";
import type { Personagem, SlotChar, CompositionData, CompositionType, MembroData } from "./types";
import { generateId } from "./types";

export type { Personagem, SlotChar, CompositionType, CompositionData, MembroData } from "./types";
export { generateId, toExportFormat } from "./types";

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

// --- Players ---

export async function dbListPlayers(): Promise<MembroData[]> {
  const rows = await sql`
    SELECT p.id, p.player_name, p.realm, p.version, p.addon, p.exported_at,
           COALESCE(json_agg(
             json_build_object(
               'id', c.id, 'nome', c.name, 'realm', c.realm, 'itemLevel', c.item_level,
               'classe', c.class, 'saved_mythic', c.saved_mythic, 'saved_heroic', c.saved_heroic,
               'vault', c.vault, 'raids', c.raids
             )::jsonb || COALESCE(c.extra, '{}'::jsonb)
           ) FILTER (WHERE c.id IS NOT NULL), '[]') AS characters
    FROM players p
    LEFT JOIN characters c ON c.player_id = p.id
    GROUP BY p.id
    ORDER BY p.player_name
  `;
  return (rows as any[]).map((r) => ({
    id: r.id,
    playerName: r.player_name ?? undefined,
    realm: r.realm ?? undefined,
    version: r.version ?? undefined,
    addon: r.addon ?? undefined,
    exportedAt: r.exported_at ?? undefined,
    characters: (r.characters ?? []).map((c: any) => ({
      id: c.id,
      nome: c.nome,
      realm: c.realm,
      itemLevel: c.itemLevel ?? c.item_level ?? 0,
      classe: c.classe ?? c.class,
      saved_mythic: c.saved_mythic,
      saved_heroic: c.saved_heroic,
      vault: c.vault,
      raids: c.raids,
      ...c,
    })),
  }));
}

export async function dbGetPlayer(id: string): Promise<MembroData | null> {
  const rows = await sql`
    SELECT p.id, p.player_name, p.realm, p.version, p.addon, p.exported_at,
           COALESCE(json_agg(
             json_build_object(
               'id', c.id, 'nome', c.name, 'realm', c.realm, 'itemLevel', c.item_level,
               'classe', c.class, 'saved_mythic', c.saved_mythic, 'saved_heroic', c.saved_heroic,
               'vault', c.vault, 'raids', c.raids
             )::jsonb || COALESCE(c.extra, '{}'::jsonb)
           ) FILTER (WHERE c.id IS NOT NULL), '[]') AS characters
    FROM players p
    LEFT JOIN characters c ON c.player_id = p.id
    WHERE p.id = ${id}
    GROUP BY p.id
  `;
  const r = (rows as any[])[0];
  if (!r) return null;
  return {
    id: r.id,
    playerName: r.player_name ?? undefined,
    realm: r.realm ?? undefined,
    version: r.version ?? undefined,
    addon: r.addon ?? undefined,
    exportedAt: r.exported_at ?? undefined,
    characters: (r.characters ?? []).map((c: any) => ({
      id: c.id,
      nome: c.nome,
      realm: c.realm,
      itemLevel: c.itemLevel ?? c.item_level ?? 0,
      classe: c.classe ?? c.class,
      saved_mythic: c.saved_mythic,
      saved_heroic: c.saved_heroic,
      vault: c.vault,
      raids: c.raids,
      ...c,
    })),
  };
}

export async function dbSavePlayer(
  data: Omit<MembroData, "id"> & { id?: string }
): Promise<MembroData> {
  const id = data.id ?? generateId();
  await sql`
    INSERT INTO players (id, player_name, realm, version, addon, exported_at, updated_at)
    VALUES (${id}, ${data.playerName ?? null}, ${data.realm ?? null}, ${data.version ?? null},
            ${data.addon ?? null}, ${data.exportedAt ?? null}, now())
    ON CONFLICT (id) DO UPDATE SET
      player_name = EXCLUDED.player_name,
      realm = EXCLUDED.realm,
      version = EXCLUDED.version,
      addon = EXCLUDED.addon,
      exported_at = EXCLUDED.exported_at,
      updated_at = now()
  `;
  const charsToKeep = new Set((data.characters ?? []).map((c) => c.id).filter(Boolean));
  for (const char of data.characters ?? []) {
    await dbSaveCharacter(id, char);
  }
  const existing = await sql`SELECT id FROM characters WHERE player_id = ${id}`;
  for (const row of existing as { id: string }[]) {
    if (!charsToKeep.has(row.id)) {
      await sql`DELETE FROM characters WHERE id = ${row.id}`;
    }
  }
  const saved = await dbGetPlayer(id);
  if (!saved) throw new Error("Falha ao salvar player");
  return saved;
}

export async function dbDeletePlayer(id: string): Promise<void> {
  await sql`DELETE FROM players WHERE id = ${id}`;
}

// --- Characters ---

function safeToJson(val: unknown): string | null {
  if (val == null) return null;
  try {
    // Se já for string, parse e re-stringify para remover trailing commas etc
    const parsed = typeof val === "string" ? JSON.parse(val) : val;
    return JSON.stringify(parsed);
  } catch {
    return null;
  }
}

function charToRow(char: Personagem) {
  const { id: _id, nome, realm, itemLevel, classe, vault, raids, ...rest } = char;
  return {
    name: nome,
    realm,
    item_level: Math.round(Number(itemLevel) || 0),
    class: classe ?? null,
    saved_mythic: (char as any).saved_mythic ?? false,
    saved_heroic: (char as any).saved_heroic ?? false,
    vault: safeToJson(vault),
    raids: safeToJson(raids),
    extra: Object.keys(rest).length ? safeToJson(rest) : null,
  };
}

export async function dbSaveCharacter(
  playerId: string,
  char: Personagem
): Promise<Personagem> {
  const id = char.id ?? generateId();
  const row = charToRow(char);
  await sql`
    INSERT INTO characters (id, player_id, name, realm, class, item_level, saved_mythic, saved_heroic, vault, raids, extra, updated_at)
    VALUES (${id}, ${playerId}, ${row.name}, ${row.realm}, ${row.class}, ${row.item_level},
            ${row.saved_mythic}, ${row.saved_heroic}, ${row.vault}, ${row.raids}, ${row.extra}, now())
    ON CONFLICT (id) DO UPDATE SET
      player_id = EXCLUDED.player_id,
      name = EXCLUDED.name,
      realm = EXCLUDED.realm,
      class = EXCLUDED.class,
      item_level = EXCLUDED.item_level,
      saved_mythic = EXCLUDED.saved_mythic,
      saved_heroic = EXCLUDED.saved_heroic,
      vault = EXCLUDED.vault,
      raids = EXCLUDED.raids,
      extra = EXCLUDED.extra,
      updated_at = now()
  `;
  return { ...char, id };
}

// --- Compositions ---

export async function dbListCompositions(): Promise<CompositionData[]> {
  const comps = await sql`
    SELECT id, name, type, last_reset_at, scheduled_at FROM compositions ORDER BY name
  `;
  const result: CompositionData[] = [];
  for (const c of comps as any[]) {
    const comp = await dbGetComposition(c.id);
    if (comp) result.push(comp);
  }
  return result;
}

export async function dbGetComposition(
  id: string
): Promise<CompositionData | null> {
  const compRows = await sql`
    SELECT id, name, type, last_reset_at, scheduled_at FROM compositions WHERE id = ${id}
  `;
  const comp = (compRows as any[])[0];
  if (!comp) return null;

  const lastTuesday12 = getLastTuesday12Timestamp();
  let lastResetAt = Number(comp.last_reset_at);
  const needsReset = lastResetAt < lastTuesday12;

  const slotRows = await sql`
    SELECT slot_index, character_id, player_id, player_name, saved, char_data
    FROM composition_slots
    WHERE composition_id = ${id}
    ORDER BY slot_index
  `;

  const slotsMap = new Map<number, any>();
  for (const s of slotRows as any[]) {
    slotsMap.set(s.slot_index, s);
  }

  const slots: (SlotChar | null)[] = [];
  for (let i = 0; i < 20; i++) {
    const s = slotsMap.get(i);
    if (!s || !s.character_id) {
      slots.push(null);
      continue;
    }
    const charData = s.char_data ?? {};
    const char: Personagem = {
      id: s.character_id,
      nome: charData.nome ?? charData.name ?? "",
      realm: charData.realm ?? "",
      itemLevel: charData.itemLevel ?? charData.item_level ?? 0,
      classe: charData.classe ?? charData.class,
      vault: charData.vault,
      raids: charData.raids,
      ...charData,
    };
    slots.push({
      memberId: s.player_id ?? "",
      playerName: s.player_name ?? "",
      char,
      saved: needsReset ? false : (s.saved ?? false),
    });
  }

  if (needsReset) {
    await sql`
      UPDATE composition_slots SET saved = false WHERE composition_id = ${id}
    `;
    await sql`
      UPDATE compositions SET last_reset_at = ${lastTuesday12}, updated_at = now() WHERE id = ${id}
    `;
    lastResetAt = lastTuesday12;
    for (const slot of slots) {
      if (slot) slot.saved = false;
    }
  }

  const scheduledAt = comp.scheduled_at != null
    ? (comp.scheduled_at instanceof Date ? comp.scheduled_at.toISOString() : String(comp.scheduled_at))
    : undefined;

  return {
    id: comp.id,
    name: comp.name,
    type: (comp.type ?? "mythic") as CompositionType,
    slots,
    lastResetAt,
    scheduledAt: scheduledAt ?? undefined,
  };
}

export async function dbSaveComposition(
  data: Omit<CompositionData, "id"> & { id?: string }
): Promise<CompositionData> {
  const id = data.id ?? generateId();
  const type: CompositionType =
    data.type === "heroic" ? "heroic" : "mythic";
  const slots = normalizeSlots(data.slots ?? []);
  const lastTuesday12 = getLastTuesday12Timestamp();

  const existing = await sql`SELECT id, last_reset_at FROM compositions WHERE id = ${id}`;
  const prev = (existing as any[])[0];
  const lastResetAt = prev ? Number(prev.last_reset_at) : lastTuesday12;

  const scheduledAt = (data as any).scheduledAt ?? null;

  await sql`
    INSERT INTO compositions (id, name, type, last_reset_at, scheduled_at, updated_at)
    VALUES (${id}, ${data.name}, ${type}, ${lastResetAt}, ${scheduledAt ? new Date(scheduledAt) : null}, now())
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      type = EXCLUDED.type,
      scheduled_at = EXCLUDED.scheduled_at,
      updated_at = now()
  `;

  const charCount = new Map<string, number>();
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const slotId = generateId();
    if (!slot) {
      await sql`
        INSERT INTO composition_slots (id, composition_id, slot_index, character_id, player_id, player_name, saved, char_data, updated_at)
        VALUES (${slotId}, ${id}, ${i}, null, null, null, false, null, now())
        ON CONFLICT (composition_id, slot_index) DO UPDATE SET
          character_id = null, player_id = null, player_name = null, saved = false, char_data = null, updated_at = now()
      `;
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
      isMain: (char as any).isMain,
      altNumber: (char as any).altNumber,
      vault: char.vault,
      raids: char.raids,
    };

    if (type === "mythic" && count > 1) {
      throw new Error(
        `Mythic: personagem "${char.nome}" não pode aparecer mais de uma vez na mesma composição/semana.`
      );
    }

    await sql`
      INSERT INTO composition_slots (id, composition_id, slot_index, character_id, player_id, player_name, saved, char_data, updated_at)
      VALUES (${slotId}, ${id}, ${i}, ${char.id}, ${slot.memberId}, ${slot.playerName}, ${saved}, ${JSON.stringify(charData)}::jsonb, now())
      ON CONFLICT (composition_id, slot_index) DO UPDATE SET
        character_id = EXCLUDED.character_id,
        player_id = EXCLUDED.player_id,
        player_name = EXCLUDED.player_name,
        saved = EXCLUDED.saved,
        char_data = EXCLUDED.char_data,
        updated_at = now()
    `;
  }

  const saved = await dbGetComposition(id);
  if (!saved) throw new Error("Falha ao salvar composição");
  return saved;
}

export async function dbDeleteComposition(id: string): Promise<void> {
  await sql`DELETE FROM compositions WHERE id = ${id}`;
}
