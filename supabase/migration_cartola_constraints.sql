-- Migration: constraints únicas para evitar perda de escalação
-- Rode no Supabase SQL Editor antes de deploar

-- 1. Remove jogadores duplicados em cartola_players (mantém o mais antigo por nome+time)
DELETE FROM cartola_players a
USING cartola_players b
WHERE a.created_at > b.created_at
  AND a.name      = b.name
  AND a.team_name = b.team_name;

-- 2. Permite upsert seguro no seed: não duplica ao rodar seed_cartola_players.js várias vezes
ALTER TABLE cartola_players
  ADD CONSTRAINT IF NOT EXISTS cartola_players_name_team_unique UNIQUE (name, team_name);

-- 3. Remove duplicatas de slot em cartola_team_players (mantém o mais antigo por time+slot)
DELETE FROM cartola_team_players a
USING cartola_team_players b
WHERE a.created_at > b.created_at
  AND a.cartola_team_id = b.cartola_team_id
  AND a.position_slot   = b.position_slot;

-- 4. Permite upsert atômico ao salvar o time: atualiza o slot sem deletar e reinserir
ALTER TABLE cartola_team_players
  ADD CONSTRAINT IF NOT EXISTS cartola_team_players_team_slot_unique UNIQUE (cartola_team_id, position_slot);
