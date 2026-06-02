/**
 * Atualiza preços dos jogadores do Cartola por tier de seleção.
 *
 * Sistema de 4 tiers baseado em ranking FIFA + desempenho esperado na Copa 2026:
 *
 *   Elite  → favoritos ao título
 *   Forte  → candidatos às oitavas/quartas
 *   Médio  → fase de grupos competitivos
 *   Fraco  → azarões / estreantes
 *
 * Budget: C$100 por rodada
 * Regra de validação: 4-3-3 com todos jogadores de tier "Forte" = ~C$90
 * (sobram C$10 pra 1-2 upgrades para Elite)
 *
 * Uso: node update_cartola_prices.js
 *      node update_cartola_prices.js --dry-run   (mostra sem salvar)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

try {
  const raw = readFileSync('.env', 'utf-8')
  raw.split('\n').filter(l => l.includes('=') && !l.startsWith('#')).forEach(l => {
    const i = l.indexOf('=')
    if (!process.env[l.slice(0,i).trim()]) process.env[l.slice(0,i).trim()] = l.slice(i+1).trim()
  })
} catch {}

const DRY_RUN = process.argv.includes('--dry-run')
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// ── Classificação das seleções ───────────────────────────────────────────────

const TIERS = {
  // Elite: top 8 do mundo — favoritos ao título
  elite: new Set([
    'Argentina', 'Brazil', 'England', 'France',
    'Germany', 'Netherlands', 'Portugal', 'Spain',
  ]),

  // Forte: candidatos sólidos às oitavas/quartas
  forte: new Set([
    'Austria', 'Belgium', 'Colombia', 'Croatia',
    'Ecuador', 'Japan', 'Mexico', 'Morocco',
    'Norway', 'Scotland', 'Senegal', 'South Korea',
    'Switzerland', 'United States', 'Uruguay',
  ]),

  // Médio: competitivos na fase de grupos
  medio: new Set([
    'Algeria', 'Australia', 'Bosnia-Herzegovina', 'Canada',
    'Czechia', 'Egypt', 'Ghana', 'Iran',
    'Ivory Coast', 'Paraguay', 'South Africa',
    'Sweden', 'Tunisia', 'Turkey',
  ]),

  // Fraco: azarões / estreantes na Copa
  fraco: new Set([
    'Cape Verde Islands', 'Congo DR', 'Curaçao', 'Haiti',
    'Iraq', 'Jordan', 'New Zealand', 'Panama',
    'Qatar', 'Saudi Arabia', 'Uzbekistan',
  ]),
}

// ── Tabela de preços por tier e posição ─────────────────────────────────────
//
// Validação do budget (C$100) nas formações principais:
//   4-3-3 tudo Forte: 8 + (7×4) + (8×3) + (10×3) = 8+28+24+30 = 90  ✓
//   4-4-2 tudo Forte: 8 + (7×4) + (8×4) + (10×2) = 8+28+32+20 = 88  ✓
//   3-5-2 tudo Forte: 8 + (7×3) + (8×5) + (10×2) = 8+21+40+20 = 89  ✓
//   4-2-3-1 tudo Forte:8+ (7×4)+ (8×5) + (10×1) = 8+28+40+10 = 86  ✓
//
//   4-3-3 tudo Elite: 11+36+30+39 = 116  → impossível  ✓ (força escolhas)
//   4-3-3 misto (Elite GK, 2 Elite+2 Forte DEF, 2 Elite+1 Forte MID, 2 Elite+1 Forte FWD):
//     11 + (9+9+7+7) + (10+10+8) + (13+13+10) = 11+32+28+36 = 107 → ainda over
//   4-3-3 misto razoável (Elite GK, 3 Forte DEF, 1 Médio DEF, 2 Forte MID, 1 Elite MID,
//                          2 Forte FWD, 1 Elite FWD):
//     11 + (7+7+7+5) + (8+8+10) + (10+10+13) = 11+26+26+33 = 96  ✓

const PRICES = {
  elite: { GK: 11, DEF: 9,   MID: 10, FWD: 13 },
  forte: { GK: 8,  DEF: 7,   MID: 8,  FWD: 10 },
  medio: { GK: 6,  DEF: 5,   MID: 6,  FWD: 8  },
  fraco: { GK: 4,  DEF: 3.5, MID: 4,  FWD: 5.5},
}

function getTier(teamName) {
  if (TIERS.elite.has(teamName)) return 'elite'
  if (TIERS.forte.has(teamName)) return 'forte'
  if (TIERS.medio.has(teamName)) return 'medio'
  if (TIERS.fraco.has(teamName)) return 'fraco'
  return 'medio' // fallback para times não mapeados
}

function getPrice(teamName, position) {
  const tier = getTier(teamName)
  return PRICES[tier][position] ?? PRICES[tier].MID
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`💰 Update Cartola Prices${DRY_RUN ? ' (DRY RUN)' : ''}\n`)

  const { data: players, error } = await supabase
    .from('cartola_players')
    .select('id, name, team_name, position, price')

  if (error) { console.error('Erro:', error.message); process.exit(1) }
  console.log(`📊 ${players.length} jogadores encontrados\n`)

  // Agrupa por tier para mostrar resumo
  const summary = { elite: {}, forte: {}, medio: {}, fraco: {} }
  const updates = players.map(p => {
    const newPrice = getPrice(p.team_name, p.position)
    const tier = getTier(p.team_name)
    summary[tier][p.position] = newPrice
    return { id: p.id, price: newPrice }
  })

  // Mostra tabela de preços
  console.log('📋 Tabela de preços por tier:\n')
  console.log('  Tier    │  GK   DEF   MID   FWD')
  console.log('  ────────┼──────────────────────')
  for (const [tier, prices] of Object.entries(PRICES)) {
    const t = tier.padEnd(8)
    console.log(`  ${t}│  ${prices.GK}    ${prices.DEF}    ${prices.MID}    ${prices.FWD}`)
  }

  // Mostra exemplos de seleções por tier
  console.log('\n🌍 Seleções por tier:')
  for (const [tier, teams] of Object.entries(TIERS)) {
    const label = tier.padEnd(6)
    console.log(`  ${label}: ${[...teams].join(', ')}`)
  }

  // Conta jogadores sem tier explícito
  const unmapped = [...new Set(players.map(p => p.team_name))].filter(t => getTier(t) === 'medio' && !TIERS.medio.has(t))
  if (unmapped.length > 0) console.log(`\n⚠️  Times sem tier mapeado (usando 'medio'): ${unmapped.join(', ')}`)

  // Validação do budget por formação
  console.log('\n✅ Validação do budget (C$100) com jogadores Forte:\n')
  const f = PRICES.forte
  const formations = [
    ['4-3-3',   1, 4, 3, 3],
    ['4-4-2',   1, 4, 4, 2],
    ['3-5-2',   1, 3, 5, 2],
    ['4-2-3-1', 1, 4, 5, 1],
  ]
  for (const [name, gk, def, mid, fwd] of formations) {
    const total = gk*f.GK + def*f.DEF + mid*f.MID + fwd*f.FWD
    const status = total <= 100 ? '✓' : '✗'
    console.log(`  ${status} ${name.padEnd(8)} C$ ${total.toFixed(1)} (sobram C$ ${(100-total).toFixed(1)})`)
  }

  if (DRY_RUN) {
    console.log('\n🔬 DRY RUN — nenhum preço foi alterado.')
    return
  }

  // Agrupa por (team_name, position) — todos do mesmo grupo recebem o mesmo preço
  // Isso evita ter que fazer update individual por jogador
  const groups = new Map()
  for (const p of players) {
    const price = getPrice(p.team_name, p.position)
    const key   = `${p.team_name}::${p.position}`
    if (!groups.has(key)) groups.set(key, { team_name: p.team_name, position: p.position, price })
  }

  console.log(`\n💾 Atualizando ${groups.size} grupos (seleção × posição)...`)
  let updated = 0
  let erros   = 0

  for (const { team_name, position, price } of groups.values()) {
    const { error: err } = await supabase
      .from('cartola_players')
      .update({ price })
      .eq('team_name', team_name)
      .eq('position', position)

    if (err) { console.error(`  ❌ ${team_name} ${position}: ${err.message}`); erros++ }
    else updated++
  }

  console.log(`  ${updated} grupos atualizados${erros ? `, ${erros} erros` : ''}`);

  console.log(`\n✅ ${updated} jogadores atualizados!`)
  console.log('\nVerificando exemplos:')

  const { data: samples } = await supabase
    .from('cartola_players')
    .select('name, team_name, position, price')
    .in('team_name', ['Brazil', 'Netherlands', 'Japan', 'Haiti'])
    .order('price', { ascending: false })
    .limit(12)

  for (const p of samples ?? []) {
    console.log(`  ${p.name.padEnd(22)} ${p.team_name.padEnd(16)} ${p.position}  C$ ${p.price}`)
  }
}

main().catch(err => { console.error('❌', err.message); process.exit(1) })
