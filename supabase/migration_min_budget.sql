-- Adiciona coluna min_budget à tabela cartola_rounds
-- Preenchida automaticamente pelo score_cartola.js após cada ajuste de preços
-- Representa o custo mínimo para montar um time de 11 jogadores válido

ALTER TABLE cartola_rounds ADD COLUMN IF NOT EXISTS min_budget FLOAT;
