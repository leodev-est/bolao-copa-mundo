-- ── Auto-gerenciamento de rodadas do Cartola ─────────────────────────────────
--
-- Como aplicar:
--   1. Supabase Dashboard → Database → Extensions → habilite "pg_cron"
--   2. Supabase Dashboard → SQL Editor → execute este arquivo
--
-- O que faz:
--   - Fecha o mercado (open → closed) 30 min antes do 1º jogo da rodada
--   - Encerra a rodada (closed → finished) quando o end_date passa
--   - Roda automaticamente a cada minuto via pg_cron

-- ── 1. Função de gerenciamento ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.auto_manage_cartola_rounds()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Fecha o mercado 30 min antes do PRIMEIRO JOGO da rodada
  -- (usa o menor match_date dos jogos da rodada, não o start_date)
  UPDATE public.cartola_rounds r
  SET status = 'closed'
  WHERE r.status = 'open'
    AND (
      SELECT MIN(m.match_date)
      FROM public.matches m
      WHERE m.match_date::timestamptz >= r.start_date::timestamptz
        AND m.match_date::timestamptz <= r.end_date::timestamptz
    ) <= (NOW() + INTERVAL '30 minutes');

  -- Encerra rodadas cujo end_date já passou
  UPDATE public.cartola_rounds
  SET status = 'finished'
  WHERE status = 'closed'
    AND end_date::timestamptz < NOW();
END;
$$;

-- Garante que apenas admins possam executar manualmente
REVOKE ALL ON FUNCTION public.auto_manage_cartola_rounds() FROM PUBLIC;

-- ── 2. Cron job — executa a cada minuto ─────────────────────────────────────

-- Remove agendamento anterior se existir (para re-execuções seguras)
DO $$ BEGIN
  PERFORM cron.unschedule('auto-cartola-rounds');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'auto-cartola-rounds',          -- nome do job
  '* * * * *',                    -- a cada minuto
  'SELECT public.auto_manage_cartola_rounds()'
);
