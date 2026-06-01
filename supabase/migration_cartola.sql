-- ============================================================
-- Migration Cartola da Copa
-- Idempotente: pode rodar várias vezes sem erro
-- Execute no SQL Editor do Supabase
-- ============================================================

-- ── 1. Rodadas do Cartola ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cartola_rounds (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date   DATE NOT NULL,
  status     TEXT NOT NULL DEFAULT 'open'
             CHECK (status IN ('open', 'closed', 'finished')),
  phase      TEXT NOT NULL DEFAULT 'group'
             CHECK (phase IN ('group', 'round_of_16', 'quarter', 'semi', 'final')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Jogadores disponíveis ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.cartola_players (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_player_id INTEGER,
  name          TEXT NOT NULL,
  position      TEXT NOT NULL CHECK (position IN ('GK','DEF','MID','FWD')),
  team_id       INTEGER,
  team_name     TEXT NOT NULL,
  team_flag     TEXT,
  photo_url     TEXT,
  price         NUMERIC(5,1) NOT NULL DEFAULT 8,
  avg_points    NUMERIC(5,1) NOT NULL DEFAULT 0,
  available     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS cartola_players_api_id_idx
  ON public.cartola_players(api_player_id)
  WHERE api_player_id IS NOT NULL;

-- ── 3. Times montados por usuário por rodada ───────────────
CREATE TABLE IF NOT EXISTS public.cartola_teams (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  round_id     UUID NOT NULL REFERENCES public.cartola_rounds(id) ON DELETE CASCADE,
  formation    TEXT NOT NULL DEFAULT '4-3-3'
               CHECK (formation IN ('4-3-3','4-4-2','3-5-2','4-2-3-1')),
  total_spent  NUMERIC(5,1) NOT NULL DEFAULT 0,
  total_points NUMERIC(6,1) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, round_id)
);

-- ── 4. Jogadores de cada time ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.cartola_team_players (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cartola_team_id UUID NOT NULL REFERENCES public.cartola_teams(id) ON DELETE CASCADE,
  player_id       UUID NOT NULL REFERENCES public.cartola_players(id),
  position_slot   INTEGER NOT NULL CHECK (position_slot BETWEEN 0 AND 10),
  is_captain      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cartola_team_id, position_slot),
  UNIQUE(cartola_team_id, player_id)
);

-- ── 5. Pontuação individual por jogo/rodada ────────────────
CREATE TABLE IF NOT EXISTS public.cartola_player_scores (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id     UUID NOT NULL REFERENCES public.cartola_players(id),
  round_id      UUID NOT NULL REFERENCES public.cartola_rounds(id),
  match_id      UUID REFERENCES public.matches(id),
  goals         INTEGER NOT NULL DEFAULT 0,
  assists       INTEGER NOT NULL DEFAULT 0,
  clean_sheet   BOOLEAN NOT NULL DEFAULT false,
  yellow_card   BOOLEAN NOT NULL DEFAULT false,
  red_card      BOOLEAN NOT NULL DEFAULT false,
  penalty_saved INTEGER NOT NULL DEFAULT 0,
  own_goal      INTEGER NOT NULL DEFAULT 0,
  total_points  NUMERIC(6,1) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id, round_id, match_id)
);

-- ── 6. Trigger: updated_at automático ─────────────────────
CREATE OR REPLACE FUNCTION update_cartola_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS cartola_players_updated_at       ON public.cartola_players;
DROP TRIGGER IF EXISTS cartola_teams_updated_at         ON public.cartola_teams;
DROP TRIGGER IF EXISTS cartola_player_scores_updated_at ON public.cartola_player_scores;

CREATE TRIGGER cartola_players_updated_at
  BEFORE UPDATE ON public.cartola_players
  FOR EACH ROW EXECUTE FUNCTION update_cartola_updated_at();

CREATE TRIGGER cartola_teams_updated_at
  BEFORE UPDATE ON public.cartola_teams
  FOR EACH ROW EXECUTE FUNCTION update_cartola_updated_at();

CREATE TRIGGER cartola_player_scores_updated_at
  BEFORE UPDATE ON public.cartola_player_scores
  FOR EACH ROW EXECUTE FUNCTION update_cartola_updated_at();

-- ── 7. View: leaderboard geral do Cartola ─────────────────
-- DROP + CREATE evita o erro "cannot drop columns from view"
DROP VIEW IF EXISTS public.cartola_leaderboard;
CREATE VIEW public.cartola_leaderboard AS
WITH totals AS (
  SELECT
    user_id,
    COALESCE(SUM(total_points), 0) AS total_points
  FROM public.cartola_teams
  GROUP BY user_id
)
SELECT
  t.user_id,
  p.username,
  p.avatar_url,
  t.total_points,
  RANK() OVER (ORDER BY t.total_points DESC) AS position
FROM totals t
JOIN public.profiles p ON p.id = t.user_id;

-- ── 8. RLS — cartola_rounds ────────────────────────────────
ALTER TABLE public.cartola_rounds ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "cartola_rounds_select_all" ON public.cartola_rounds FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 9. RLS — cartola_players ──────────────────────────────
ALTER TABLE public.cartola_players ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "cartola_players_select_all" ON public.cartola_players FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 10. RLS — cartola_teams ────────────────────────────────
ALTER TABLE public.cartola_teams ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "cartola_teams_select_all" ON public.cartola_teams FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "cartola_teams_insert_own" ON public.cartola_teams
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "cartola_teams_update_own" ON public.cartola_teams
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 11. RLS — cartola_team_players ────────────────────────
ALTER TABLE public.cartola_team_players ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "cartola_team_players_select_all" ON public.cartola_team_players FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "cartola_team_players_insert_own" ON public.cartola_team_players
    FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.cartola_teams WHERE id = cartola_team_id AND user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "cartola_team_players_delete_own" ON public.cartola_team_players
    FOR DELETE USING (
      EXISTS (SELECT 1 FROM public.cartola_teams WHERE id = cartola_team_id AND user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 12. RLS — cartola_player_scores ───────────────────────
ALTER TABLE public.cartola_player_scores ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "cartola_player_scores_select_all" ON public.cartola_player_scores FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 13. Realtime ───────────────────────────────────────────
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.cartola_rounds; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.cartola_teams; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.cartola_player_scores; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 14. Dados iniciais: Rodadas ────────────────────────────
INSERT INTO public.cartola_rounds (name, start_date, end_date, status, phase)
VALUES
  ('Rodada 1 — Fase de Grupos', '2026-06-11', '2026-06-18', 'open', 'group'),
  ('Rodada 2 — Fase de Grupos', '2026-06-19', '2026-06-25', 'open', 'group'),
  ('Rodada 3 — Fase de Grupos', '2026-06-26', '2026-07-02', 'open', 'group'),
  ('Oitavas de Final',           '2026-07-03', '2026-07-06', 'open', 'round_of_16'),
  ('Quartas de Final',           '2026-07-07', '2026-07-08', 'open', 'quarter'),
  ('Semifinal',                  '2026-07-14', '2026-07-15', 'open', 'semi'),
  ('Final',                      '2026-07-19', '2026-07-19', 'open', 'final')
ON CONFLICT DO NOTHING;
