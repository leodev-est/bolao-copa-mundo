-- Migration: constraints únicas para evitar perda de escalação
-- Rode no Supabase SQL Editor

-- 1. Remove jogadores duplicados em cartola_players (mantém o mais antigo por nome+time)
DELETE FROM cartola_players a
USING cartola_players b
WHERE a.created_at > b.created_at
  AND a.name      = b.name
  AND a.team_name = b.team_name;

-- 2. Constraint UNIQUE(name, team_name) — permite upsert seguro no seed
DO $$ BEGIN
  ALTER TABLE cartola_players ADD CONSTRAINT cartola_players_name_team_unique UNIQUE (name, team_name);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- 3. Remove duplicatas de slot em cartola_team_players (mantém o mais antigo por time+slot)
DELETE FROM cartola_team_players a
USING cartola_team_players b
WHERE a.created_at > b.created_at
  AND a.cartola_team_id = b.cartola_team_id
  AND a.position_slot   = b.position_slot;

-- 4. Constraint UNIQUE(cartola_team_id, position_slot) — permite upsert atômico ao salvar o time
DO $$ BEGIN
  ALTER TABLE cartola_team_players ADD CONSTRAINT cartola_team_players_team_slot_unique UNIQUE (cartola_team_id, position_slot);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;
