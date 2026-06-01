-- ============================================================
-- Migration v2 — Palpite unificado com placar + artilheiros
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1. Tornar bet_option_id opcional em bets (palpite principal não usa)
ALTER TABLE public.bets
  ALTER COLUMN bet_option_id DROP NOT NULL;

-- 2. Adicionar colunas de placar e resultado derivado
ALTER TABLE public.bets
  ADD COLUMN IF NOT EXISTS score_home       INTEGER,
  ADD COLUMN IF NOT EXISTS score_away       INTEGER,
  ADD COLUMN IF NOT EXISTS predicted_result TEXT,  -- 'home' | 'draw' | 'away'
  ADD COLUMN IF NOT EXISTS odd              NUMERIC(6,2);

-- 3. Índice único parcial: apenas um palpite principal por usuário por jogo
--    (bet_option_id IS NULL = palpite principal de placar)
CREATE UNIQUE INDEX IF NOT EXISTS bets_main_bet_idx
  ON public.bets(user_id, match_id)
  WHERE bet_option_id IS NULL;

-- 4. Tabela de artilheiros por slot
CREATE TABLE IF NOT EXISTS public.bet_scorers (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bet_id       UUID NOT NULL REFERENCES public.bets(id) ON DELETE CASCADE,
  slot_index   INTEGER NOT NULL,
  team         TEXT NOT NULL CHECK (team IN ('home', 'away')),
  player_id    INTEGER,
  player_name  TEXT NOT NULL,
  is_correct   BOOLEAN,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(bet_id, slot_index)   -- mesmo jogador pode aparecer em slots diferentes
);

-- 5. RLS para bet_scorers
ALTER TABLE public.bet_scorers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bet_scorers_select_own" ON public.bet_scorers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bets
      WHERE bets.id = bet_scorers.bet_id
        AND bets.user_id = auth.uid()
    )
  );

CREATE POLICY "bet_scorers_insert_own" ON public.bet_scorers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bets
      WHERE bets.id = bet_scorers.bet_id
        AND bets.user_id = auth.uid()
    )
  );

CREATE POLICY "bet_scorers_update_own" ON public.bet_scorers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.bets
      WHERE bets.id = bet_scorers.bet_id
        AND bets.user_id = auth.uid()
    )
  );

-- 6. Realtime para bet_scorers
ALTER PUBLICATION supabase_realtime ADD TABLE public.bet_scorers;

-- 7. Remover tipos de cartão das opções existentes (limpeza de dados)
DELETE FROM public.bet_options
WHERE type IN ('yellow_card', 'red_card');
