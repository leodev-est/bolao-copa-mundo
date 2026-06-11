-- ── Auto-gerenciamento de rodadas do Cartola ─────────────────────────────────
--
-- Como aplicar:
--   1. Supabase Dashboard → Database → Extensions → habilite "pg_cron"
--   2. Supabase Dashboard → SQL Editor → execute este arquivo
--
-- O que faz:
--   - Fecha o mercado usando market_close_at (se definido) OU 30 min antes do 1º jogo
--   - Encerra a rodada (closed → finished) quando o end_date passa
--   - Roda automaticamente a cada minuto via pg_cron
--
-- Para definir horário exato de fechamento de uma rodada:
--   UPDATE cartola_rounds SET market_close_at = '2026-06-11T16:55:00Z' WHERE name LIKE 'Rodada 1%';

-- ── 1. Coluna market_close_at (horário explícito de fechamento por rodada) ──

ALTER TABLE cartola_rounds ADD COLUMN IF NOT EXISTS market_close_at TIMESTAMPTZ;

-- ── 2. Função de gerenciamento ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.auto_manage_cartola_rounds()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Fecha o mercado:
  --   Se market_close_at estiver definido: usa esse horário exato
  --   Caso contrário: 30 min antes do primeiro jogo da rodada
  UPDATE public.cartola_rounds r
  SET status = 'closed'
  WHERE r.status = 'open'
    AND COALESCE(
      r.market_close_at,
      (
        SELECT MIN(m.match_date)
        FROM public.matches m
        WHERE m.match_date::timestamptz >= r.start_date::timestamptz
          AND m.match_date::timestamptz <= r.end_date::timestamptz
      ) - INTERVAL '30 minutes'
    ) <= NOW();

  -- Encerra rodadas cujo end_date já passou
  UPDATE public.cartola_rounds
  SET status = 'finished'
  WHERE status = 'closed'
    AND end_date::timestamptz < NOW();
END;
$$;

-- Garante que apenas admins possam executar manualmente
REVOKE ALL ON FUNCTION public.auto_manage_cartola_rounds() FROM PUBLIC;

-- ── 3. Cron job — executa a cada minuto ─────────────────────────────────────

DO $$ BEGIN
  PERFORM cron.unschedule('auto-cartola-rounds');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'auto-cartola-rounds',
  '* * * * *',
  'SELECT public.auto_manage_cartola_rounds()'
);
