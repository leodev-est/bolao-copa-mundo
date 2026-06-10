-- ── Auto-gerenciamento de rodadas do Cartola ─────────────────────────────────
--
-- Como aplicar:
--   1. Supabase Dashboard → Database → Extensions → habilite "pg_cron"
--   2. Supabase Dashboard → SQL Editor → execute este arquivo
--
-- O que faz:
--   - Fecha o mercado (open → closed) 1h antes do início da rodada
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
  -- Fecha o mercado 1h antes do início da rodada
  UPDATE public.cartola_rounds
  SET status = 'closed'
  WHERE status = 'open'
    AND start_date::timestamptz <= (NOW() + INTERVAL '1 hour');

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
SELECT cron.unschedule('auto-cartola-rounds') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-cartola-rounds'
);

SELECT cron.schedule(
  'auto-cartola-rounds',          -- nome do job
  '* * * * *',                    -- a cada minuto
  'SELECT public.auto_manage_cartola_rounds()'
);
