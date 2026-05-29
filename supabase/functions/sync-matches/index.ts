// Edge Function: sync-matches
// Busca partidas da API-Football e sincroniza com o Supabase
// Deploy: supabase functions deploy sync-matches
// Cron: a cada hora (configure no dashboard do Supabase)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WORLD_CUP_LEAGUE_ID = 1   // FIFA World Cup no API-Football
const SEASON = 2026

serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const apiKey = Deno.env.get('API_FOOTBALL_KEY')!

  const res = await fetch(
    `https://v3.football.api-sports.io/fixtures?league=${WORLD_CUP_LEAGUE_ID}&season=${SEASON}`,
    {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'v3.football.api-sports.io',
      },
    }
  )

  const data = await res.json()
  const fixtures = data.response ?? []

  let synced = 0

  for (const f of fixtures) {
    const match = {
      api_match_id:   f.fixture.id,
      home_team:      f.teams.home.name,
      away_team:      f.teams.away.name,
      home_team_logo: f.teams.home.logo,
      away_team_logo: f.teams.away.logo,
      home_team_id:   f.teams.home.id,
      away_team_id:   f.teams.away.id,
      match_date:     f.fixture.date,
      status:         f.fixture.status.short,
      score_home:     f.goals.home,
      score_away:     f.goals.away,
      venue:          f.fixture.venue?.name,
      round:          f.league.round,
    }

    await supabase
      .from('matches')
      .upsert(match, { onConflict: 'api_match_id' })

    synced++
  }

  return new Response(JSON.stringify({ synced }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
