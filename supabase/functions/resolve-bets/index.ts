// Edge Function: resolve-bets
// API: football-data.org v4 (gols via GET /v4/matches/{id})
// Deploy: supabase functions deploy resolve-bets

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BASE_URL          = 'https://api.football-data.org/v4'
const LIVE_STATUSES     = ['1H', 'HT', '2H', 'ET', 'P']
const FINISHED_STATUSES = ['FT', 'AET', 'PEN']

serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const apiKey = Deno.env.get('FOOTBALL_DATA_KEY')!

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

    // Busca gols via football-data.org GET /v4/matches/{id}
    let goals: Array<{ player_id: number | null; player_name: string; team: string }> = []
    try {
      const res  = await fetch(`${BASE_URL}/matches/${match.api_match_id}`, {
        headers: { 'X-Auth-Token': apiKey },
      })
      if (res.ok) {
        const matchDetail = await res.json()
        goals = (matchDetail.goals ?? [])
          .filter((g: Record<string, unknown>) => g.type !== 'OWN')
          .map((g: Record<string, unknown>) => ({
            player_id:   (g.scorer as Record<string, unknown>)?.id ?? null,
            player_name: (g.scorer as Record<string, unknown>)?.name ?? '',
            team:        (g.team   as Record<string, unknown>)?.name ?? '',
          }))
      }
    } catch { /* resolve sem artilheiros se API falhar */ }

    const actualHome   = match.score_home ?? 0
    const actualAway   = match.score_away ?? 0
    const actualResult = actualHome > actualAway ? 'home' : actualAway > actualHome ? 'away' : 'draw'

    // Resolve palpites principais (placar + artilheiros)
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
        pointsWon += bet.points_wagered * bet.odd
      } else if (resultOk) {
        pointsWon += bet.points_wagered * 1.3
      }

      const scorerResults: Array<{ id: string; is_correct: boolean }> = []
      for (const scorer of (bet.bet_scorers ?? [])) {
        let correct = false
        if (scorer.player_id) {
          correct = goals.some(g =>
            g.player_id === scorer.player_id &&
            (scorer.team === 'home' ? g.team === match.home_team : g.team === match.away_team)
          )
        } else {
          correct = goals.some(g =>
            g.player_name?.toLowerCase() === scorer.player_name?.toLowerCase()
          )
        }
        if (correct) pointsWon += 0.5
        scorerResults.push({ id: scorer.id, is_correct: correct })
      }

      const betStatus = exactScore || resultOk || pointsWon > 0 ? 'won' : 'lost'
      await supabase
        .from('bets')
        .update({ status: betStatus, points_won: parseFloat(pointsWon.toFixed(2)), updated_at: new Date().toISOString() })
        .eq('id', bet.id)

      for (const sr of scorerResults) {
        await supabase.from('bet_scorers').update({ is_correct: sr.is_correct }).eq('id', sr.id)
      }
    }

    // Resolve apostas extras (total_goals)
    const { data: extraOptions } = await supabase
      .from('bet_options')
      .select('id, type, metadata, result')
      .eq('match_id', match.id)
      .in('type', ['total_goals', 'total_yellows'])
      .is('result', null)

    for (const opt of (extraOptions ?? [])) {
      const meta      = opt.metadata as Record<string, unknown>
      const threshold = meta?.threshold as number
      const direction = meta?.direction as string
      let result: 'won' | 'lost' | null = null

      if (opt.type === 'total_goals') {
        const total = actualHome + actualAway
        result = direction === 'over'
          ? total >= threshold ? 'won' : 'lost'
          : total  < threshold ? 'won' : 'lost'
      }

      if (result) {
        await supabase.from('bet_options').update({ result }).eq('id', opt.id)
      }
    }

    await supabase.rpc('resolve_bets', { p_match_id: match.id })

    results[match.id] = { home: actualHome, away: actualAway, mainBets: mainBets?.length ?? 0 }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
