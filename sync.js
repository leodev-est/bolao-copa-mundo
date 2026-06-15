// Sincronização dos jogos da Copa do Mundo 2026
// Fonte primária de status/placar/horário: ESPN (não precisa de auth)
// Fonte secundária (população inicial dos jogos): football-data.org
// Uso: node sync.js

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

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

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── ESPN ─────────────────────────────────────────────────────────────────────
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'
const ESPN_HDRS = {
  'User-Agent':  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept':      'application/json',
  'Origin':      'https://www.espn.com',
  'Referer':     'https://www.espn.com/',
}

function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').trim() }

function teamsMatch(a, b) {
  if (!a || !b) return false
  const an = norm(a), bn = norm(b)
  if (an === bn || an.includes(bn) || bn.includes(an)) return true
  const aParts = an.split(' ').filter(w => w.length >= 4)
  const bParts = bn.split(' ').filter(w => w.length >= 4)
  return aParts.some(ap => bn.includes(ap) || bParts.some(bp => ap.slice(0, 4) === bp.slice(0, 4)))
}

function espnDateStr(d) {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`
}

function parseEspnStatus(statusName, period) {
  if (statusName === 'STATUS_FULL_TIME')                                      return 'FT'
  if (statusName === 'STATUS_FINAL_AET' || statusName === 'STATUS_FINAL_EXTRA_TIME') return 'AET'
  if (statusName === 'STATUS_FINAL_PEN')                                      return 'PEN'
  if (statusName === 'STATUS_HALFTIME')                                       return 'HT'
  if (statusName === 'STATUS_FIRST_HALF')                                     return '1H'
  if (statusName === 'STATUS_SECOND_HALF')                                    return '2H'
  if (statusName === 'STATUS_IN_PROGRESS') return (period ?? 1) <= 1 ? '1H' : '2H'
  if (statusName === 'STATUS_EXTRA_TIME')                                     return 'ET'
  if (statusName === 'STATUS_PENALTY')                                        return 'BT'
  if (statusName === 'STATUS_POSTPONED' || statusName === 'STATUS_CANCELLED') return 'CANC'
  return null // null = não altera status (ainda NS/agendado)
}

// Atualiza status, placar, horário e espn_event_id para os próximos 7 dias + últimos 3 dias
async function espnPatch() {
  console.log('\n📡 ESPN: sincronizando status, placares e horários...')

  const since = new Date(Date.now() - 3  * 86400_000)
  const until = new Date(Date.now() + 21 * 86400_000) // cobre próximas 3 semanas de Copa

  const { data: dbMatches } = await supabase
    .from('matches')
    .select('id, home_team, away_team, match_date, status, score_home, score_away, espn_event_id')
    .gte('match_date', since.toISOString())
    .lte('match_date', until.toISOString())

  if (!dbMatches?.length) { console.log('  ↳ sem jogos no período'); return }

  // Datas ESPN a consultar (uma por dia do intervalo + dia anterior de cada, por jogos UTC tardios)
  const datesToFetch = new Set()
  for (let d = new Date(since); d <= until; d = new Date(d.getTime() + 86400_000)) {
    datesToFetch.add(espnDateStr(d))
  }
  // Adiciona dia anterior ao "since" para pegar jogos que correram tarde em UTC
  datesToFetch.add(espnDateStr(new Date(since.getTime() - 86400_000)))

  const espnEvents = []
  for (const dateStr of datesToFetch) {
    try {
      const res = await fetch(`${ESPN_BASE}/scoreboard?dates=${dateStr}`, { headers: ESPN_HDRS })
      if (!res.ok) continue
      const data = await res.json()
      for (const ev of (data.events ?? [])) {
        const comp = ev.competitions?.[0]
        const home = comp?.competitors?.find(c => c.homeAway === 'home')
        const away = comp?.competitors?.find(c => c.homeAway === 'away')
        if (home && away) espnEvents.push({ id: ev.id, home, away, status: ev.status, date: ev.date })
      }
    } catch (err) {
      console.warn(`  ↳ ESPN ${dateStr}: ${err.message}`)
    }
  }

  console.log(`  ↳ ${espnEvents.length} eventos ESPN encontrados para o período`)

  let updated = 0
  for (const dbMatch of dbMatches) {
    const ev = espnEvents.find(e =>
      teamsMatch(e.home.team.displayName, dbMatch.home_team) &&
      teamsMatch(e.away.team.displayName, dbMatch.away_team)
    )
    if (!ev) continue

    const statusName = ev.status?.type?.name ?? ''
    const period     = ev.status?.period ?? 1
    const newStatus  = parseEspnStatus(statusName, period)
    const scoreHome  = parseInt(ev.home.score ?? '')
    const scoreAway  = parseInt(ev.away.score ?? '')

    const patch = {}

    // Status: só atualiza se mudou e ESPN tem status definitivo (não "agendado")
    if (newStatus && newStatus !== dbMatch.status) patch.status = newStatus

    // Placar: só quando não agendado e score válido
    if (statusName !== 'STATUS_SCHEDULED' && !isNaN(scoreHome)) patch.score_home = scoreHome
    if (statusName !== 'STATUS_SCHEDULED' && !isNaN(scoreAway)) patch.score_away = scoreAway

    // Horário: ESPN é fonte de verdade — corrige se difere por mais de 2 min
    if (ev.date) {
      const espnMs  = new Date(ev.date).getTime()
      const dbMs    = new Date(dbMatch.match_date).getTime()
      if (Math.abs(espnMs - dbMs) > 2 * 60 * 1000) patch.match_date = ev.date
    }

    // ESPN event ID: salva se ainda não tiver
    if (!dbMatch.espn_event_id) patch.espn_event_id = ev.id

    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from('matches').update(patch).eq('id', dbMatch.id)
      if (!error) {
        const label = `${dbMatch.home_team} × ${dbMatch.away_team}`
        const parts = []
        if (patch.status)       parts.push(`status: ${dbMatch.status}→${patch.status}`)
        if (patch.score_home !== undefined) parts.push(`placar: ${patch.score_home}×${patch.score_away}`)
        if (patch.match_date)   parts.push(`horário corrigido`)
        if (patch.espn_event_id) parts.push(`espnId: ${patch.espn_event_id}`)
        console.log(`  ✅ ${label}: ${parts.join(' | ')}`)
        updated++
      }
    }
  }

  if (updated === 0) console.log('  ↳ nenhuma atualização necessária')
  else console.log(`  ↳ ${updated} jogo(s) atualizados`)
}

// ── football-data.org (população inicial) ────────────────────────────────────
function parseStatus(match) {
  const s = match.status
  if (s === 'FINISHED' || s === 'AWARDED')     return 'FT'
  if (s === 'IN_PLAY')                          return '1H'
  if (s === 'PAUSED')                           return 'HT'
  if (s === 'CANCELLED' || s === 'SUSPENDED')   return 'CANC'
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

async function syncFromFootballData() {
  if (!API_KEY) { console.log('⚠️  VITE_FOOTBALL_DATA_KEY não configurado — pulando football-data.org'); return }

  console.log('🌍 Sincronizando com football-data.org...')
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)

    const res = await fetch(
      `${BASE_URL}/competitions/${COMPETITION}/matches?season=${SEASON}`,
      { headers: { 'X-Auth-Token': API_KEY }, signal: controller.signal }
    )
    clearTimeout(timeout)

    if (!res.ok) {
      console.warn(`⚠️  football-data.org retornou ${res.status} — usando só ESPN`)
      return
    }

    const data = await res.json()
    const matches = data.matches ?? []
    console.log(`  ↳ ${matches.length} jogos encontrados`)

    let total = 0, erros = 0
    for (const m of matches) {
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
        round:          stageLabel(m),
        matchday:       m.matchday ?? null,
      }

      // Só inclui placar quando não-nulo (evita apagar placar correto com null)
      const sh = m.score?.fullTime?.home
      const sa = m.score?.fullTime?.away
      if (sh !== null && sh !== undefined) record.score_home = sh
      if (sa !== null && sa !== undefined) record.score_away = sa

      const { error } = await supabase.from('matches').upsert(record, { onConflict: 'api_match_id' })
      if (error) erros++
      else total++
    }

    console.log(`  ↳ ${total} inseridos/atualizados${erros > 0 ? `, ${erros} erros` : ''}`)
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('⚠️  football-data.org timeout (15s) — usando só ESPN')
    } else {
      console.warn(`⚠️  football-data.org: ${err.message} — usando só ESPN`)
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function sync() {
  console.log(`🌍 Sync Copa do Mundo 2026 — ${new Date().toISOString()}\n`)

  // 1. football-data.org: população inicial dos jogos (falha silenciosa)
  await syncFromFootballData()

  // 2. ESPN: sempre corrige status, placar, horário e salva espn_event_id
  await espnPatch()

  console.log('\n✅ Sincronização concluída!')
}

sync().catch(err => { console.error('❌', err.message); process.exit(1) })
