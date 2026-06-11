/**
 * Script único: encontra os fixture IDs do Mundial 2026 na API-Football
 * e salva na coluna api_football_id da tabela matches.
 *
 * Uso:         node scripts/map_api_football.js
 * Só visualizar: node scripts/map_api_football.js --dry-run
 */

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

const DRY_RUN  = process.argv.includes('--dry-run')
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const API_KEY  = process.env.VITE_API_FOOTBALL_KEY ?? process.env.API_FOOTBALL_KEY
const BASE_URL = 'https://v3.football.api-sports.io'

if (!API_KEY) {
  console.error('❌ VITE_API_FOOTBALL_KEY não encontrado no .env')
  process.exit(1)
}

async function apiFetch(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'x-apisports-key': API_KEY },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${path}`)
  const json = await res.json()
  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error(`API-Football: ${JSON.stringify(json.errors)}`)
  }
  return json
}

// Normaliza nome de time para comparação: remove acentos e caracteres especiais
function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '') }

async function main() {
  console.log(`🔍 Buscando fixtures do Mundial 2026 (liga 1, temporada 2026)...\n`)

  const data = await apiFetch('/fixtures?league=1&season=2026')

  if (!data.response?.length) {
    console.error('❌ Nenhum fixture retornado. A API pode usar um league ID diferente para 2026.')
    console.log('\nVeja os leagues disponíveis com:')
    console.log('  node -e "fetch(\'https://v3.football.api-sports.io/leagues?name=World+Cup\',{headers:{\'x-apisports-key\':process.env.API_FOOTBALL_KEY}}).then(r=>r.json()).then(j=>console.log(JSON.stringify(j,null,2)))"')
    return
  }

  console.log(`✅ ${data.response.length} fixtures encontrados\n`)

  // Mostra requests restantes
  const remaining = data.parameters?.remaining ?? '?'
  console.log(`📊 Requests restantes hoje: ${remaining}\n`)

  const { data: dbMatches, error } = await supabase
    .from('matches')
    .select('id, home_team, away_team, match_date, api_football_id')
    .order('match_date')

  if (error) throw error

  let mapped = 0
  let notFound = 0
  const unmapped = []

  for (const fixture of data.response) {
    const fixtureDate = new Date(fixture.fixture.date)
    const apiHome     = fixture.teams.home.name
    const apiAway     = fixture.teams.away.name
    const fixtureId   = fixture.fixture.id

    const match = dbMatches.find(m => {
      const dbDate   = new Date(m.match_date)
      const diffHours = Math.abs(dbDate - fixtureDate) / 3600000
      if (diffHours > 6) return false
      return (norm(m.home_team).includes(norm(apiHome)) || norm(apiHome).includes(norm(m.home_team))) &&
             (norm(m.away_team).includes(norm(apiAway)) || norm(apiAway).includes(norm(m.away_team)))
    })

    if (!match) {
      unmapped.push(`  ${apiHome} × ${apiAway} — ${fixtureDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} BRT`)
      notFound++
      continue
    }

    const icon = match.api_football_id ? '🔄' : '✅'
    console.log(`${icon} ${match.home_team} × ${match.away_team} → fixture #${fixtureId}`)

    if (!DRY_RUN) {
      const { error: err } = await supabase
        .from('matches')
        .update({ api_football_id: fixtureId })
        .eq('id', match.id)
      if (err) console.error(`   ❌ Erro: ${err.message}`)
    }

    mapped++
  }

  if (unmapped.length > 0) {
    console.log('\n⚠️  Fixtures sem match no banco (verifique nomes de times):')
    unmapped.forEach(l => console.log(l))
  }

  console.log(`\n📊 Mapeados: ${mapped} | Sem match: ${notFound}`)
  if (DRY_RUN) console.log('\n🔬 DRY RUN — nada foi salvo no banco')
  else if (mapped > 0) console.log('\n✅ Banco atualizado com api_football_id')
}

main().catch(err => { console.error('❌', err.message); process.exit(1) })
