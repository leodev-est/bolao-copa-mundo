-- Adiciona coluna matchday para agrupar jogos por rodada real (não por data)
-- Copa 2026: matchday 1/2/3 na fase de grupos = 24 jogos cada
ALTER TABLE matches ADD COLUMN IF NOT EXISTS matchday integer;
