// Edge Function: sync-matches
// Busca jogos da Copa do Mundo 2026 e sincroniza com o Supabase
// API: Free API Live Football Data (RapidAPI)
// Deploy: supabase functions deploy sync-matches

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WORLD_CUP_LEAGUE_ID = 914609
const COPA_START = new Date('2026-06-11')
const COPA_END   = new Date('2026-07-19')
const API_HOST   = 'free-api-live-football-data.p.rapidapi.com'
const BASE_URL   = `https://${API_HOST}`

function formatDate(date: Date): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
}

function parseStatus(match: Record<string, unknown>): string {
  const s = (match.status ?? {}) as Record<string, unknown>
  if (s.cancelled) return 'CANC'
  if (s.finished)  return 'FT'
  if (!s.started)  return 'NS'
  const elapsed = ((s.liveTime as Record<string, unknown>)?.short ?? '') as string
  if (elapsed === 'HT') return 'HT'
  if (elapsed.includes("'")) {
    const min = parseInt(elapsed)
    return min <= 45 ? '1H' : '2H'
  }
  return '1H'
}

serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const apiKey = Deno.env.get('API_FOOTBALL_KEY')!

  const headers = {
    'x-rapidapi-key':  apiKey,
    'x-rapidapi-host': API_HOST,
  }

  let synced = 0
  const errors: string[] = []
  const current = new Date(COPA_START)

  while (current <= COPA_END) {
    const dateStr = formatDate(current)
    try {
      const res  = await fetch(`${BASE_URL}/football-get-matches-by-date?date=${dateStr}`, { headers })
      const data = await res.json()
      const matches = (data?.response?.matches ?? []).filter((m: Record<string, unknown>) => m.leagueId === WORLD_CUP_LEAGUE_ID)

      for (const m of matches) {
        const home = m.home as Record<string, unknown>
        const away = m.away as Record<string, unknown>
        const status = m.status as Record<string, unknown>

        const record = {
          api_match_id:   m.id,
          home_team:      home?.longName ?? home?.name,
          away_team:      away?.longName ?? away?.name,
          home_team_logo: `https://images.fotmob.com/image_resources/logo/teamlogo/${home?.id}.png`,
          away_team_logo: `https://images.fotmob.com/image_resources/logo/teamlogo/${away?.id}.png`,
          home_team_id:   home?.id,
          away_team_id:   away?.id,
          match_date:     status?.utcTime ?? m.time,
          status:         parseStatus(m),
          score_home:     (home?.score as number) ?? null,
          score_away:     (away?.score as number) ?? null,
          round:          `Fase ${m.tournamentStage ?? ''}`.trim(),
        }

        await supabase
          .from('matches')
          .upsert(record, { onConflict: 'api_match_id' })

        synced++
      }
    } catch (e) {
      errors.push(`${dateStr}: ${e}`)
    }

    current.setDate(current.getDate() + 1)
    await new Promise(r => setTimeout(r, 300))  // respeita rate limit
  }

  return new Response(JSON.stringify({ synced, errors }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
