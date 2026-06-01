-- ============================================================
-- Cartola da Copa 2026 — Schema
-- Execute no SQL Editor do Supabase após schema.sql + migration_v2.sql
-- ============================================================

-- ENUMs
CREATE TYPE cartola_position AS ENUM ('GK', 'DEF', 'MID', 'FWD');
CREATE TYPE cartola_formation AS ENUM ('4-3-3', '4-4-2', '3-5-2', '4-2-3-1');
CREATE TYPE cartola_round_status AS ENUM ('open', 'closed', 'finished');
CREATE TYPE cartola_round_phase AS ENUM ('group', 'round_of_16', 'quarter', 'semi', 'final');

-- ── Rodadas ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cartola_rounds (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,                          -- ex: "Rodada 1 — Grupo A-D"
  start_date  TIMESTAMPTZ NOT NULL,                   -- início do 1º jogo da rodada
  end_date    TIMESTAMPTZ NOT NULL,                   -- fim do último jogo
  status      cartola_round_status NOT NULL DEFAULT 'open',
  phase       cartola_round_phase  NOT NULL DEFAULT 'group',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Jogadores disponíveis ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cartola_players (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_player_id INTEGER UNIQUE,
  name          TEXT NOT NULL,
  position      cartola_position NOT NULL,
  team_id       INTEGER,
  team_name     TEXT NOT NULL,
  team_flag     TEXT,                                  -- URL da bandeira
  photo_url     TEXT,
  price         NUMERIC(5,1) NOT NULL DEFAULT 8.0,    -- C$ valor
  avg_points    NUMERIC(6,2) NOT NULL DEFAULT 0,
  available     BOOLEAN NOT NULL DEFAULT true,         -- false = seleção eliminada
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Times montados pelos usuários ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cartola_teams (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  round_id      UUID NOT NULL REFERENCES public.cartola_rounds(id) ON DELETE CASCADE,
  formation     cartola_formation NOT NULL DEFAULT '4-3-3',
  total_spent   NUMERIC(6,1) NOT NULL DEFAULT 0,
  total_points  NUMERIC(8,2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, round_id)
);

-- ── Jogadores no time ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cartola_team_players (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cartola_team_id  UUID NOT NULL REFERENCES public.cartola_teams(id) ON DELETE CASCADE,
  player_id        UUID NOT NULL REFERENCES public.cartola_players(id) ON DELETE CASCADE,
  position_slot    INTEGER NOT NULL,                   -- 0–10
  is_captain       BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cartola_team_id, position_slot),
  UNIQUE(cartola_team_id, player_id)
);

-- ── Pontuação por jogador por rodada ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cartola_player_scores (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id      UUID NOT NULL REFERENCES public.cartola_players(id) ON DELETE CASCADE,
  round_id       UUID NOT NULL REFERENCES public.cartola_rounds(id) ON DELETE CASCADE,
  match_id       UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  goals          INTEGER NOT NULL DEFAULT 0,
  assists        INTEGER NOT NULL DEFAULT 0,
  clean_sheet    BOOLEAN NOT NULL DEFAULT false,
  yellow_card    BOOLEAN NOT NULL DEFAULT false,
  red_card       BOOLEAN NOT NULL DEFAULT false,
  penalty_saved  INTEGER NOT NULL DEFAULT 0,
  own_goal       INTEGER NOT NULL DEFAULT 0,
  total_points   NUMERIC(6,2) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id, round_id, match_id)
);

-- ── View: leaderboard do Cartola ──────────────────────────────────────────────

CREATE OR REPLACE VIEW public.cartola_leaderboard AS
WITH round_totals AS (
  SELECT
    ct.user_id,
    ct.round_id,
    ct.total_points                                                      AS round_points,
    SUM(ct.total_points) OVER (PARTITION BY ct.user_id)                  AS total_points,
    RANK() OVER (PARTITION BY ct.round_id ORDER BY ct.total_points DESC) AS round_position
  FROM public.cartola_teams ct
),
overall AS (
  SELECT
    user_id,
    SUM(round_points) AS grand_total,
    RANK() OVER (ORDER BY SUM(round_points) DESC) AS overall_position
  FROM round_totals
  GROUP BY user_id
)
SELECT
  rt.user_id,
  COALESCE(p.username, split_part(u.email, '@', 1)) AS username,
  p.avatar_url,
  rt.round_id,
  rt.round_points,
  rt.round_position,
  o.grand_total                                      AS total_points,
  o.overall_position
FROM round_totals rt
JOIN overall o       ON o.user_id = rt.user_id
JOIN public.profiles p ON p.id   = rt.user_id
JOIN auth.users u    ON u.id     = rt.user_id;

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.cartola_rounds        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartola_players       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartola_teams         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartola_team_players  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartola_player_scores ENABLE ROW LEVEL SECURITY;

-- Rodadas: leitura pública
CREATE POLICY "cr_select" ON public.cartola_rounds        FOR SELECT USING (true);
-- Jogadores: leitura pública
CREATE POLICY "cp_select" ON public.cartola_players       FOR SELECT USING (true);
-- Pontuações: leitura pública
CREATE POLICY "cps_select" ON public.cartola_player_scores FOR SELECT USING (true);

-- Times: usuário lê/escreve apenas o próprio
CREATE POLICY "ct_select" ON public.cartola_teams FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ct_insert" ON public.cartola_teams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ct_update" ON public.cartola_teams FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ct_delete" ON public.cartola_teams FOR DELETE USING (auth.uid() = user_id);

-- Jogadores no time: usuário lê/escreve via cartola_team_id
CREATE POLICY "ctp_select" ON public.cartola_team_players FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.cartola_teams WHERE id = cartola_team_id AND user_id = auth.uid())
);
CREATE POLICY "ctp_insert" ON public.cartola_team_players FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.cartola_teams WHERE id = cartola_team_id AND user_id = auth.uid())
);
CREATE POLICY "ctp_delete" ON public.cartola_team_players FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.cartola_teams WHERE id = cartola_team_id AND user_id = auth.uid())
);

-- ── Realtime ──────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.cartola_player_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cartola_teams;

-- ── Trigger: updated_at ───────────────────────────────────────────────────────

CREATE TRIGGER cartola_teams_updated_at         BEFORE UPDATE ON public.cartola_teams         FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER cartola_players_updated_at       BEFORE UPDATE ON public.cartola_players       FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER cartola_player_scores_updated_at BEFORE UPDATE ON public.cartola_player_scores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── Rodada de exemplo para desenvolvimento ────────────────────────────────────

INSERT INTO public.cartola_rounds (name, start_date, end_date, status, phase)
VALUES (
  'Rodada 1 — Fase de Grupos',
  '2026-06-11 14:00:00+00',
  '2026-06-17 23:59:00+00',
  'open',
  'group'
);
