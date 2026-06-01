// Script de sincronização dos jogos da Copa do Mundo 2026
// Uso: node sync.js

import { createClient } from '@supabase/supabase-js'

// Carrega .env manualmente (sem depender de dotenv)
import { readFileSync } from 'fs'
const env = Object.fromEntries(
  readFileSync('.env', 'utf-8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => l.split('=').map(s => s.trim()))
)

const SUPABASE_URL     = env['VITE_SUPABASE_URL']
const SUPABASE_KEY     = env['SUPABASE_SERVICE_ROLE_KEY']
const API_KEY          = env['VITE_API_FOOTBALL_KEY']
const WORLD_CUP_ID     = 914609
const API_HOST         = 'free-api-live-football-data.p.rapidapi.com'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function formatDate(date) {
  return `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`
}

function parseStatus(match) {
  const s = match.status ?? {}
  if (s.cancelled) return 'CANC'
  if (s.finished)  return 'FT'
  if (!s.started)  return 'NS'
  const elapsed = s.liveTime?.short ?? ''
  if (elapsed === 'HT') return 'HT'
  if (elapsed.includes("'")) return parseInt(elapsed) <= 45 ? '1H' : '2H'
  return '1H'
}

async function fetchDay(date) {
  const res = await fetch(
    `https://${API_HOST}/football-get-matches-by-date?date=${formatDate(date)}`,
    { headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': API_HOST } }
  )
  const data = await res.json()
  return (data?.response?.matches ?? []).filter(m => m.leagueId === WORLD_CUP_ID)
}

async function sync() {
  console.log('🌍 Iniciando sincronização da Copa do Mundo 2026...\n')

  const start = new Date('2026-06-11')
  const end   = new Date('2026-07-19')
  const current = new Date(start)

  let total = 0
  let erros = 0

  while (current <= end) {
    const dateStr = formatDate(current)
    process.stdout.write(`📅 ${dateStr}... `)

    try {
      const matches = await fetchDay(current)

      if (matches.length === 0) {
        console.log('sem jogos')
      } else {
        for (const m of matches) {
          const record = {
            api_match_id:   m.id,
            home_team:      m.home?.longName ?? m.home?.name,
            away_team:      m.away?.longName ?? m.away?.name,
            home_team_logo: `https://images.fotmob.com/image_resources/logo/teamlogo/${m.home?.id}.png`,
            away_team_logo: `https://images.fotmob.com/image_resources/logo/teamlogo/${m.away?.id}.png`,
            home_team_id:   m.home?.id,
            away_team_id:   m.away?.id,
            match_date:     m.status?.utcTime ?? m.time,
            status:         parseStatus(m),
            score_home:     m.home?.score ?? null,
            score_away:     m.away?.score ?? null,
            round:          m.tournamentStage ? `Fase ${m.tournamentStage}` : 'Fase de Grupos',
          }

          const { error } = await supabase
            .from('matches')
            .upsert(record, { onConflict: 'api_match_id' })

          if (error) {
            console.error(`\n  ❌ Erro ao inserir jogo ${m.id}:`, error.message)
            erros++
          } else {
            total++
          }
        }
        console.log(`✅ ${matches.length} jogo(s)`)
      }
    } catch (e) {
      console.log(`⚠️  erro: ${e.message}`)
      erros++
    }

    current.setDate(current.getDate() + 1)
    await new Promise(r => setTimeout(r, 300)) // respeita rate limit
  }

  console.log(`\n✅ Sincronização concluída!`)
  console.log(`   Jogos inseridos/atualizados: ${total}`)
  if (erros > 0) console.log(`   Erros: ${erros}`)
}

sync()
