-- Schema para ABI Character List
-- Users (auth), Players, Characters, Compositions (mythic/heroic)
-- Reset semanal: terça 12:00 horário do Brasil

-- Players (membros): cada player pode ter N personagens
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  player_name TEXT,
  realm TEXT,
  version INTEGER,
  addon TEXT,
  exported_at BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Characters: nome, reino, classe, ilvl, saved_mythic, saved_heroic, demais info (JSONB)
CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  realm TEXT NOT NULL,
  class TEXT,
  item_level INTEGER NOT NULL DEFAULT 0,
  saved_mythic BOOLEAN DEFAULT FALSE,
  saved_heroic BOOLEAN DEFAULT FALSE,
  vault JSONB,
  raids JSONB,
  extra JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_characters_player ON characters(player_id);

-- Compositions: heroico ou mitico
CREATE TABLE IF NOT EXISTS compositions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mythic', 'heroic')),
  last_reset_at BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Slots da composição (20 slots: índices 0-19)
-- Mythic: personagem não pode repetir na mesma semana (único por composition)
-- Heroic: pode repetir; 2ª aparição = saved
-- Reset terça 12:00: todos saved viram false
CREATE TABLE IF NOT EXISTS composition_slots (
  id TEXT PRIMARY KEY,
  composition_id TEXT NOT NULL REFERENCES compositions(id) ON DELETE CASCADE,
  slot_index INTEGER NOT NULL CHECK (slot_index >= 0 AND slot_index < 20),
  character_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
  player_id TEXT REFERENCES players(id) ON DELETE SET NULL,
  player_name TEXT,
  saved BOOLEAN DEFAULT FALSE,
  char_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(composition_id, slot_index)
);

CREATE INDEX IF NOT EXISTS idx_composition_slots_comp ON composition_slots(composition_id);

-- Users: autenticação com login, senha criptografada e permissão (admin, gm, jogador)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  login TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'gm', 'jogador')),
  player_id TEXT REFERENCES players(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_login ON users(login);
CREATE INDEX IF NOT EXISTS idx_users_player ON users(player_id);

-- Mythic: personagem não pode repetir na mesma composição (aplicado na camada de aplicação)
