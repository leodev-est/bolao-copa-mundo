// Edge Function: resolve-bets
// Resolve palpites após o encerramento de partidas
// Deploy: supabase functions deploy resolve-bets

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const LIVE_STATUSES     = ['1H', 'HT', '2H', 'ET', 'P']
const FINISHED_STATUSES = ['FT', 'AET', 'PEN']
const API_HOST = 'free-api-live-football-data.p.rapidapi.com'

serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const apiKey = Deno.env.get('API_FOOTBALL_KEY')!

  // Busca partidas encerradas ou ao vivo com palpites pendentes
  const { data: matches } = await supabase
    .from('matches')
    .select('id, api_match_id, status, score_home, score_away, home_team, away_team')
    .in('status', [...LIVE_STATUSES, ...FINISHED_STATUSES])

  if (!matches?.length) {
    return new Response(JSON.stringify({ message: 'No matches to resolve' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const results: Record<string, unknown> = {}

  for (const match of matches) {
    if (!FINISHED_STATUSES.includes(match.status)) continue

    // 1. Busca eventos da partida para resolver artilheiros
    let goals: Array<{ player_id: number; player_name: string; team: string }> = []
    try {
      const res  = await fetch(
        `https://${API_HOST}/football-get-fixture-events?fixture_id=${match.api_match_id}`,
        { headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': API_HOST } }
      )
      const data = await res.json()
      const events = data?.response?.events ?? data?.response ?? []
      goals = events
        .filter((e: Record<string, unknown>) =>
          e.type === 'Goal' || e.event_type === 'goal'
        )
        .map((e: Record<string, unknown>) => ({
          player_id:   (e.player as Record<string, unknown>)?.id ?? e.player_id,
          player_name: (e.player as Record<string, unknown>)?.name ?? e.player_name,
          team:        (e.team as Record<string, unknown>)?.name ?? e.team_name,
        }))
    } catch { /* ignora se API falhar — resolve sem artilheiros */ }

    const actualHome = match.score_home ?? 0
    const actualAway = match.score_away ?? 0
    const actualResult = actualHome > actualAway ? 'home' : actualAway > actualHome ? 'away' : 'draw'

    // 2. Resolve palpites principais (placar + artilheiros)
    const { data: mainBets } = await supabase
      .from('bets')
      .select('id, score_home, score_away, predicted_result, odd, points_wagered, bet_scorers(*)')
      .eq('match_id', match.id)
      .is('bet_option_id', null)
      .eq('status', 'pending')

    for (const bet of (mainBets ?? [])) {
      const exactScore = bet.score_home === actualHome && bet.score_away === actualAway
      const resultOk   = bet.predicted_result === actualResult

      let pointsWon = 0
      if (exactScore) {
        // Placar exato: recebe pontos pela odd
        pointsWon += bet.points_wagered * bet.odd
      } else if (resultOk) {
        // Resultado correto mas placar errado: consolação (1.3x)
        pointsWon += bet.points_wagered * 1.3
      }

      // Artilheiros: +0.5 por slot correto
      const scorerResults: Array<{ id: string; is_correct: boolean }> = []
      for (const scorer of (bet.bet_scorers ?? [])) {
        let correct = false

        if (scorer.player_id) {
          // Verifica por ID do jogador
          const teamIsHome = (bet.score_home ?? 0) > 0
            ? scorer.team === 'home'
            : scorer.team === 'home'

          correct = goals.some(g =>
            g.player_id === scorer.player_id &&
            (teamIsHome
              ? g.team === match.home_team
              : g.team === match.away_team
            )
          )
        } else {
          // Fallback: compara por nome
          correct = goals.some(g =>
            g.player_name?.toLowerCase() === scorer.player_name?.toLowerCase()
          )
        }

        if (correct) pointsWon += 0.5
        scorerResults.push({ id: scorer.id, is_correct: correct })
      }

      // Atualiza bet principal
      const betStatus = exactScore || resultOk || pointsWon > 0 ? 'won' : 'lost'
      await supabase
        .from('bets')
        .update({ status: betStatus, points_won: parseFloat(pointsWon.toFixed(2)), updated_at: new Date().toISOString() })
        .eq('id', bet.id)

      // Atualiza is_correct de cada scorer
      for (const sr of scorerResults) {
        await supabase
          .from('bet_scorers')
          .update({ is_correct: sr.is_correct })
          .eq('id', sr.id)
      }
    }

    // 3. Resolve apostas extras (total_goals, total_yellows)
    const { data: extraOptions } = await supabase
      .from('bet_options')
      .select('id, type, metadata, result')
      .eq('match_id', match.id)
      .in('type', ['total_goals', 'total_yellows'])
      .is('result', null)

    for (const opt of (extraOptions ?? [])) {
      let result: 'won' | 'lost' | null = null
      const meta = opt.metadata as Record<string, unknown>
      const threshold  = meta?.threshold  as number
      const direction  = meta?.direction  as string

      if (opt.type === 'total_goals') {
        const total = actualHome + actualAway
        result = direction === 'over'
          ? total >= threshold ? 'won' : 'lost'
          : total  < threshold ? 'won' : 'lost'
      }

      if (result) {
        await supabase
          .from('bet_options')
          .update({ result })
          .eq('id', opt.id)
      }
    }

    // 4. Resolve apostas extras dos usuários
    await supabase.rpc('resolve_bets', { p_match_id: match.id })

    results[match.id] = { home: actualHome, away: actualAway, mainBets: mainBets?.length ?? 0 }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
