// Sincronização dos jogos da Copa do Mundo 2026
// API: football-data.org (gratuita, sem cota mensal)
// Uso: node sync.js

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Carrega .env localmente; no CI as vars já vêm do ambiente
try {
  const raw = readFileSync('.env', 'utf-8')
  raw.split('\n').filter(l => l.includes('=') && !l.startsWith('#')).forEach(l => {
    const i = l.indexOf('=')
    const k = l.slice(0, i).trim()
    const v = l.slice(i + 1).trim()
    if (!process.env[k]) process.env[k] = v
  })
} catch {}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const API_KEY      = process.env.VITE_FOOTBALL_DATA_KEY
const BASE_URL     = 'https://api.football-data.org/v4'
const COMPETITION  = 'WC'
const SEASON       = '2026'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no .env')
  process.exit(1)
}
if (!API_KEY) {
  console.error('❌ VITE_FOOTBALL_DATA_KEY não encontrado no .env')
  console.error('   Registre-se em https://www.football-data.org/client/register para obter uma chave gratuita.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function parseStatus(match) {
  const s = match.status
  if (s === 'FINISHED' || s === 'AWARDED') return 'FT'
  if (s === 'IN_PLAY')                     return '1H'
  if (s === 'PAUSED')                      return 'HT'
  if (s === 'CANCELLED' || s === 'SUSPENDED') return 'CANC'
  return 'NS'
}

function stageLabel(match) {
  const stage = match.stage ?? ''
  const group = match.group?.replace('GROUP_', '') ?? ''
  if (stage === 'GROUP_STAGE') return group ? `Grupo ${group}` : 'Fase de Grupos'
  const labels = {
    LAST_32:        'Rodada de 32',
    LAST_16:        'Oitavas de Final',
    ROUND_OF_32:    'Rodada de 32',
    ROUND_OF_16:    'Oitavas de Final',
    QUARTER_FINALS: 'Quartas de Final',
    SEMI_FINALS:    'Semifinal',
    THIRD_PLACE:    'Terceiro Lugar',
    FINAL:          'Final',
  }
  return labels[stage] ?? stage
}

async function sync() {
  console.log('🌍 Sincronizando Copa do Mundo 2026 com football-data.org...\n')

  const res = await fetch(
    `${BASE_URL}/competitions/${COMPETITION}/matches?season=${SEASON}`,
    { headers: { 'X-Auth-Token': API_KEY } }
  )

  if (!res.ok) {
    const text = await res.text()
    console.error(`❌ Erro na API: ${res.status}`)
    console.error(text.slice(0, 300))
    process.exit(1)
  }

  const data = await res.json()
  const matches = data.matches ?? []
  console.log(`📋 ${matches.length} jogos encontrados\n`)

  let total = 0, erros = 0

  for (const m of matches) {
    // Pula jogos do mata-mata cujos times ainda não foram definidos
    if (!m.homeTeam?.name || !m.awayTeam?.name) continue

    const record = {
      api_match_id:   m.id,
      home_team:      m.homeTeam.name,
      away_team:      m.awayTeam.name,
      home_team_logo: m.homeTeam.crest ?? null,
      away_team_logo: m.awayTeam.crest ?? null,
      home_team_id:   m.homeTeam.id,
      away_team_id:   m.awayTeam.id,
      match_date:     m.utcDate,
      status:         parseStatus(m),
      score_home:     m.score?.fullTime?.home ?? null,
      score_away:     m.score?.fullTime?.away ?? null,
      round:          stageLabel(m),
      matchday:       m.matchday ?? null,
    }

    const { error } = await supabase
      .from('matches')
      .upsert(record, { onConflict: 'api_match_id' })

    const label = `${m.homeTeam?.name ?? '?'} × ${m.awayTeam?.name ?? '?'}`
    if (error) {
      console.error(`  ❌ ${label}: ${error.message}`)
      erros++
    } else {
      console.log(`  ✅ ${label} (${stageLabel(m)})`)
      total++
    }
  }

  console.log(`\n✅ Sincronização concluída!`)
  console.log(`   Jogos inseridos/atualizados: ${total}`)
  if (erros > 0) console.log(`   Erros: ${erros}`)
}

sync()
