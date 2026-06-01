// Edge Function: sync-matches
// API: football-data.org v4
// Deploy: supabase functions deploy sync-matches

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BASE_URL    = 'https://api.football-data.org/v4'
const COMPETITION = 'WC'
const SEASON      = '2026'

function parseStatus(match: Record<string, unknown>): string {
  const s = match.status as string
  if (s === 'FINISHED' || s === 'AWARDED') return 'FT'
  if (s === 'IN_PLAY')                     return '1H'
  if (s === 'PAUSED')                      return 'HT'
  if (s === 'CANCELLED' || s === 'SUSPENDED') return 'CANC'
  return 'NS'
}

function stageLabel(match: Record<string, unknown>): string {
  const stage = (match.stage as string) ?? ''
  const group = ((match.group as string) ?? '').replace('GROUP_', '')
  if (stage === 'GROUP_STAGE') return group ? `Grupo ${group}` : 'Fase de Grupos'
  const labels: Record<string, string> = {
    ROUND_OF_32:    'Oitavas (32)',
    ROUND_OF_16:    'Oitavas de Final',
    QUARTER_FINALS: 'Quartas de Final',
    SEMI_FINALS:    'Semifinal',
    THIRD_PLACE:    'Terceiro Lugar',
    FINAL:          'Final',
  }
  return labels[stage] ?? stage
}

serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const apiKey = Deno.env.get('FOOTBALL_DATA_KEY')!

  const res = await fetch(
    `${BASE_URL}/competitions/${COMPETITION}/matches?season=${SEASON}`,
    { headers: { 'X-Auth-Token': apiKey } }
  )

  if (!res.ok) {
    const text = await res.text()
    return new Response(JSON.stringify({ error: `API ${res.status}`, detail: text.slice(0, 200) }), {
      status: 502, headers: { 'Content-Type': 'application/json' },
    })
  }

  const data   = await res.json()
  const matches = (data.matches ?? []) as Record<string, unknown>[]
  let synced = 0
  const errors: string[] = []

  for (const m of matches) {
    const home  = m.homeTeam as Record<string, unknown>
    const away  = m.awayTeam as Record<string, unknown>
    // Pula mata-mata com times TBD
    if (!home?.name || !away?.name) continue

    const score = m.score as Record<string, unknown>
    const ft    = score?.fullTime as Record<string, unknown> | null

    const record = {
      api_match_id:   m.id,
      home_team:      home.name,
      away_team:      away.name,
      home_team_logo: home?.crest ?? null,
      away_team_logo: away?.crest ?? null,
      home_team_id:   home?.id,
      away_team_id:   away?.id,
      match_date:     m.utcDate,
      status:         parseStatus(m),
      score_home:     ft?.home ?? null,
      score_away:     ft?.away ?? null,
      round:          stageLabel(m),
    }

    const { error } = await supabase
      .from('matches')
      .upsert(record, { onConflict: 'api_match_id' })

    if (error) errors.push(`match ${m.id}: ${error.message}`)
    else synced++
  }

  return new Response(JSON.stringify({ synced, errors, total: matches.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
