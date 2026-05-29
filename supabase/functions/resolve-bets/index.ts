// Edge Function: resolve-bets
// Roda a cada 5 minutos durante jogos ao vivo para resolver palpites
// Deploy: supabase functions deploy resolve-bets

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const LIVE_STATUSES = ['1H', 'HT', '2H', 'ET', 'P', 'FT']
const FINISHED_STATUS = 'FT'

serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const apiKey = Deno.env.get('API_FOOTBALL_KEY')!

  // Buscar partidas ao vivo ou recém encerradas
  const { data: matches } = await supabase
    .from('matches')
    .select('id, api_match_id, status')
    .in('status', LIVE_STATUSES)

  if (!matches?.length) {
    return new Response(JSON.stringify({ message: 'No live matches' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const results: Record<string, number> = {}

  for (const match of matches) {
    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures/events?fixture=${match.api_match_id}`,
      {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'v3.football.api-sports.io',
        },
      }
    )
    const data = await res.json()
    const events: ApiEvent[] = data.response ?? []

    // Buscar opções de palpite pendentes para essa partida
    const { data: betOptions } = await supabase
      .from('bet_options')
      .select('id, type, metadata')
      .eq('match_id', match.id)
      .is('result', null)

    if (!betOptions?.length) continue

    // Resolver cada opção com base nos eventos
    for (const option of betOptions) {
      const result = evaluateBetOption(option, events, match)
      if (result !== null) {
        await supabase
          .from('bet_options')
          .update({ result })
          .eq('id', option.id)
      }
    }

    // Se partida encerrou, resolver todos os palpites pendentes
    if (match.status === FINISHED_STATUS) {
      const { data: resolved } = await supabase.rpc('resolve_bets', {
        p_match_id: match.id,
      })
      results[match.id] = resolved ?? 0
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

interface ApiEvent {
  type: string        // 'Goal' | 'Card' | 'subst'
  detail: string      // 'Normal Goal' | 'Yellow Card' | 'Red Card' etc.
  player: { id: number; name: string }
  team: { id: number; name: string }
  time: { elapsed: number }
  comments?: string
}

interface BetOption {
  id: string
  type: string
  metadata: Record<string, unknown>
}

interface Match {
  id: string
  api_match_id: number
  status: string
  score_home?: number
  score_away?: number
}

function evaluateBetOption(
  option: BetOption,
  events: ApiEvent[],
  match: Match
): 'won' | 'lost' | null {
  const goals = events.filter(e => e.type === 'Goal')
  const yellows = events.filter(e => e.type === 'Card' && e.detail === 'Yellow Card')
  const reds = events.filter(e => e.type === 'Card' && e.detail === 'Red Card')

  if (match.status !== 'FT') return null   // só resolve ao final

  switch (option.type) {
    case 'winner': {
      const predicted = option.metadata.predicted_winner as string
      const homeScore = match.score_home ?? 0
      const awayScore = match.score_away ?? 0
      const winner = homeScore > awayScore ? 'home' : awayScore > homeScore ? 'away' : 'draw'
      return winner === predicted ? 'won' : 'lost'
    }

    case 'exact_score': {
      const expected = option.metadata.score as string  // "2-1"
      const actual = `${match.score_home ?? 0}-${match.score_away ?? 0}`
      return actual === expected ? 'won' : 'lost'
    }

    case 'goalscorer': {
      const playerId = option.metadata.player_id as number
      const scored = goals.some(e => e.player.id === playerId)
      return scored ? 'won' : 'lost'
    }

    case 'yellow_card': {
      const playerId = option.metadata.player_id as number
      const gotCard = yellows.some(e => e.player.id === playerId)
      return gotCard ? 'won' : 'lost'
    }

    case 'red_card': {
      const playerId = option.metadata.player_id as number
      const gotCard = reds.some(e => e.player.id === playerId)
      return gotCard ? 'won' : 'lost'
    }

    case 'total_yellows': {
      const threshold = option.metadata.threshold as number
      const direction = option.metadata.direction as string  // 'over' | 'under'
      const total = yellows.length
      if (direction === 'over') return total >= threshold ? 'won' : 'lost'
      return total < threshold ? 'won' : 'lost'
    }

    case 'total_goals': {
      const threshold = option.metadata.threshold as number
      const direction = option.metadata.direction as string
      const total = (match.score_home ?? 0) + (match.score_away ?? 0)
      if (direction === 'over') return total >= threshold ? 'won' : 'lost'
      return total < threshold ? 'won' : 'lost'
    }

    default:
      return null
  }
}
