-- Colunas de suporte ao sync via ESPN
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS espn_event_id TEXT;

-- Flag que indica se a escalação oficial já foi salva em bet_options
-- Usada para determinar se o período de carência de 15 min está ativo
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS has_lineup BOOLEAN DEFAULT FALSE;
