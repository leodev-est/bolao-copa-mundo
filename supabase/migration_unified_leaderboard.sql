-- View unificada: bolão + Cartola somados por usuário
-- Roda no Supabase SQL Editor

CREATE OR REPLACE VIEW public.unified_leaderboard AS
SELECT
  l.user_id,
  l.username,
  l.avatar_url,
  l.total_points                               AS bolao_points,
  COALESCE(c.total_points, 0)                  AS cartola_points,
  l.total_points + COALESCE(c.total_points, 0) AS total_points,
  l.total_bets,
  l.total_wins,
  RANK() OVER (
    ORDER BY (l.total_points + COALESCE(c.total_points, 0)) DESC
  ) AS position
FROM public.leaderboard l
LEFT JOIN public.cartola_leaderboard c ON c.user_id = l.user_id;
