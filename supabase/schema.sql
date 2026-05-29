-- ============================================================
-- Bolão Copa do Mundo 2026 — Schema Supabase
-- Execute no SQL Editor do seu projeto Supabase
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABELAS
-- ============================================================

-- Perfis de usuários (estende auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username     TEXT,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partidas da Copa do Mundo
CREATE TABLE IF NOT EXISTS public.matches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_match_id    INTEGER UNIQUE,
  home_team       TEXT NOT NULL,
  away_team       TEXT NOT NULL,
  home_team_logo  TEXT,
  away_team_logo  TEXT,
  home_team_id    INTEGER,
  away_team_id    INTEGER,
  match_date      TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'NS',
  -- NS=Não Iniciado, 1H=1º Tempo, HT=Intervalo, 2H=2º Tempo,
  -- ET=Prorrogação, P=Pênaltis, FT=Encerrado, PST=Adiado
  score_home      INTEGER,
  score_away      INTEGER,
  venue           TEXT,
  round           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Opções de palpite disponíveis por partida
CREATE TABLE IF NOT EXISTS public.bet_options (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id     UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  -- 'winner' | 'exact_score' | 'goalscorer' | 'yellow_card' | 'red_card' | 'total_yellows' | 'total_goals'
  description  TEXT NOT NULL,
  odd          NUMERIC(6,2) NOT NULL,
  result       TEXT,
  -- NULL=pendente, 'won'=acertou, 'lost'=errou
  metadata     JSONB DEFAULT '{}',
  -- Ex: { player_id, player_name, team, expected_score, threshold }
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Palpites feitos pelos usuários
CREATE TABLE IF NOT EXISTS public.bets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bet_option_id   UUID NOT NULL REFERENCES public.bet_options(id) ON DELETE CASCADE,
  match_id        UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  points_wagered  NUMERIC(10,2) NOT NULL DEFAULT 1,
  points_won      NUMERIC(10,2),
  status          TEXT NOT NULL DEFAULT 'pending',
  -- 'pending' | 'won' | 'lost'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, bet_option_id)
);

-- Histórico de ranking (snapshot diário para calcular variação de posição)
CREATE TABLE IF NOT EXISTS public.leaderboard_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points  NUMERIC(10,2) NOT NULL DEFAULT 0,
  position      INTEGER NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

-- ============================================================
-- VIEWS
-- ============================================================

-- Ranking geral calculado dinamicamente
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  p.id                                                           AS user_id,
  COALESCE(p.username, split_part(u.email, '@', 1))             AS username,
  p.avatar_url,
  COALESCE(SUM(b.points_won), 0)                                AS total_points,
  COUNT(b.id) FILTER (WHERE b.status <> 'pending')              AS total_bets,
  COUNT(b.id) FILTER (WHERE b.status = 'won')                   AS total_wins,
  CASE
    WHEN COUNT(b.id) FILTER (WHERE b.status <> 'pending') = 0 THEN 0
    ELSE ROUND(
      COUNT(b.id) FILTER (WHERE b.status = 'won') * 100.0
      / NULLIF(COUNT(b.id) FILTER (WHERE b.status <> 'pending'), 0), 1
    )
  END                                                            AS win_rate,
  RANK() OVER (ORDER BY COALESCE(SUM(b.points_won), 0) DESC)    AS position
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
LEFT JOIN public.bets b ON b.user_id = p.id
GROUP BY p.id, p.username, p.avatar_url, u.email;

-- Leaderboard com variação de posição (comparado ao snapshot anterior)
CREATE OR REPLACE VIEW public.leaderboard_with_change AS
WITH current_rank AS (
  SELECT * FROM public.leaderboard
),
prev_snapshot AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    position AS prev_position
  FROM public.leaderboard_history
  WHERE snapshot_date < CURRENT_DATE
  ORDER BY user_id, snapshot_date DESC
)
SELECT
  c.*,
  COALESCE(p.prev_position, c.position) AS prev_position,
  COALESCE(p.prev_position, c.position) - c.position AS position_change
FROM current_rank c
LEFT JOIN prev_snapshot p ON p.user_id = c.user_id;

-- ============================================================
-- FUNÇÕES E TRIGGERS
-- ============================================================

-- Cria perfil automaticamente ao registrar novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER bet_options_updated_at
  BEFORE UPDATE ON public.bet_options
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER bets_updated_at
  BEFORE UPDATE ON public.bets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Resolve todos os palpites de uma partida
-- Chamada pela Edge Function após atualizar o resultado
CREATE OR REPLACE FUNCTION public.resolve_bets(p_match_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.bets b
  SET
    status     = bo.result,
    points_won = CASE
      WHEN bo.result = 'won' THEN b.points_wagered * bo.odd
      ELSE 0
    END,
    updated_at = NOW()
  FROM public.bet_options bo
  WHERE b.bet_option_id = bo.id
    AND b.match_id      = p_match_id
    AND bo.result       IS NOT NULL
    AND b.status        = 'pending';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Snapshot diário do ranking (chamar via cron na Edge Function)
CREATE OR REPLACE FUNCTION public.snapshot_leaderboard()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.leaderboard_history (user_id, total_points, position, snapshot_date)
  SELECT user_id, total_points, position, CURRENT_DATE
  FROM public.leaderboard
  ON CONFLICT (user_id, snapshot_date) DO UPDATE
    SET total_points = EXCLUDED.total_points,
        position     = EXCLUDED.position;
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bet_options         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_history ENABLE ROW LEVEL SECURITY;

-- profiles: leitura pública, escrita própria
CREATE POLICY "profiles_select_all"   ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own"   ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own"   ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- matches: somente leitura para usuários autenticados
CREATE POLICY "matches_select_auth"   ON public.matches FOR SELECT USING (auth.role() = 'authenticated');

-- bet_options: somente leitura para usuários autenticados
CREATE POLICY "bet_options_select"    ON public.bet_options FOR SELECT USING (auth.role() = 'authenticated');

-- bets: usuário vê/cria/atualiza apenas seus próprios
CREATE POLICY "bets_select_own"       ON public.bets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bets_insert_own"       ON public.bets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bets_update_own"       ON public.bets FOR UPDATE USING (auth.uid() = user_id);

-- leaderboard_history: leitura pública
CREATE POLICY "lh_select_all"         ON public.leaderboard_history FOR SELECT USING (true);

-- ============================================================
-- REALTIME
-- ============================================================

-- Habilitar realtime nas tabelas relevantes
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bet_options;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- ============================================================
-- DADOS INICIAIS DE EXEMPLO (remover em produção)
-- ============================================================

-- Partida de exemplo para desenvolvimento local
-- INSERT INTO public.matches (api_match_id, home_team, away_team, match_date, status, round)
-- VALUES (9999, 'Brasil', 'Argentina', NOW() + INTERVAL '2 days', 'NS', 'Grupo E');
