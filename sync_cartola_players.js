/**
 * Seed de jogadores do Cartola via football-data.org (gratuito).
 * Busca os elencos de todos os times da Copa 2026 e salva com preços base por posição.
 *
 * Uso:
 *   node sync_cartola_players.js
 *   node sync_cartola_players.js --dry-run
 *
 * Requer .env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_FOOTBALL_DATA_KEY
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const API_KEY          = process.env.VITE_FOOTBALL_DATA_KEY
const BASE_URL         = 'https://api.football-data.org/v4'
const COMPETITION      = 'WC'
const SEASON           = '2026'
const DRY_RUN          = process.argv.includes('--dry-run')

if (!SUPABASE_URL || !SUPABASE_SERVICE) {
  console.error('❌ VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY necessários no .env')
  process.exit(1)
}
if (!API_KEY) {
  console.error('❌ VITE_FOOTBALL_DATA_KEY não encontrado no .env')
  console.error('   Obtenha em: https://www.football-data.org/client/register')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)

// Preços base por posição (em Cartola$)
const BASE_PRICE = { GK: 10.0, DEF: 8.0, MID: 10.0, FWD: 12.0 }

const POSITION_MAP = {
  Goalkeeper: 'GK', 'Centre-Back': 'DEF', 'Left-Back': 'DEF', 'Right-Back': 'DEF',
  'Left Winger': 'FWD', 'Right Winger': 'FWD', 'Centre-Forward': 'FWD', Attacker: 'FWD',
  'Central Midfield': 'MID', 'Defensive Midfield': 'MID', 'Attacking Midfield': 'MID',
  Midfielder: 'MID', Defender: 'DEF', Forward: 'FWD',
}

function normalizePosition(raw) {
  return POSITION_MAP[raw] ?? 'MID'
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  console.log(`🏆 Cartola Player Sync — Copa 2026${DRY_RUN ? ' (DRY RUN)' : ''}\n`)

  // Busca todos os times da Copa com seus elencos
  console.log('🔍 Buscando times e elencos...')
  const res = await fetch(
    `${BASE_URL}/competitions/${COMPETITION}/teams?season=${SEASON}`,
    { headers: { 'X-Auth-Token': API_KEY } }
  )

  if (!res.ok) {
    const text = await res.text()
    console.error(`❌ Erro na API: ${res.status} — ${text.slice(0, 200)}`)
    process.exit(1)
  }

  const data  = await res.json()
  const teams = data.teams ?? []
  console.log(`✅ ${teams.length} times encontrados\n`)

  const rows = []

  for (const team of teams) {
    const squad = team.squad ?? []
    console.log(`  🏳️  ${team.name}: ${squad.length} jogadores`)

    for (const player of squad) {
      const position = normalizePosition(player.position ?? '')
      rows.push({
        api_player_id: player.id,
        name:          player.name,
        position,
        team_id:       team.id,
        team_name:     team.name,
        team_flag:     team.crest ?? null,
        photo_url:     null,
        price:         BASE_PRICE[position] ?? 10.0,
        avg_points:    0,
        available:     true,
      })
    }

    await sleep(200) // respeita 10 req/min do plano gratuito
  }

  console.log(`\n📊 ${rows.length} jogadores no total`)

  // Exibe resumo por posição
  for (const pos of ['GK', 'DEF', 'MID', 'FWD']) {
    const count = rows.filter(p => p.position === pos).length
    console.log(`   ${pos}: ${count} jogadores (C$ ${BASE_PRICE[pos].toFixed(1)})`)
  }

  if (DRY_RUN) {
    console.log('\n🔬 DRY RUN — nenhum dado foi salvo.')
    return
  }

  // Upsert em lotes de 50
  console.log('\n💾 Salvando no banco...')
  const BATCH = 50
  let saved = 0

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await supabase
      .from('cartola_players')
      .upsert(batch, { onConflict: 'api_player_id', ignoreDuplicates: false })

    if (error) {
      console.error(`  ❌ Erro lote ${i}–${i + BATCH}: ${error.message}`)
    } else {
      saved += batch.length
    }
  }

  console.log(`\n✅ ${saved} jogadores salvos!`)
  console.log('\nDica: os preços são base agora. Após os jogos começarem,')
  console.log('os preços serão ajustados automaticamente pelo score_cartola.js.')
}

main().catch(err => { console.error('❌', err.message); process.exit(1) })
