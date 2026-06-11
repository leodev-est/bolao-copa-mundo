-- Adiciona coluna para o fixture ID da API-Football (api-sports.io)
-- Separado do api_match_id que é da football-data.org
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS api_football_id INTEGER;
