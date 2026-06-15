/**
 * Diagnóstico e correção do time do Arthur Dylan:
 * Reinsere Ayew e Hurtado nos slots corretos.
 * Uso: node fix_arthur_team.js [--dry-run]
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

try {
  const raw = readFileSync('.env', 'utf-8')
  raw.split('\n').filter(l => l.includes('=') && !l.startsWith('#')).forEach(l => {
    const i = l.indexOf('='); const k = l.slice(0, i).trim(); const v = l.slice(i + 1).trim()
    if (!process.env[k]) process.env[k] = v
  })
} catch {}

const DRY_RUN = process.argv.includes('--dry-run')
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function main() {
  console.log(`🔧 Fix time Arthur Dylan${DRY_RUN ? ' (DRY RUN)' : ''}\n`)

  // 1. Busca usuário Arthur Dylan
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username')
    .ilike('username', '%arthur%')

  console.log('👤 Perfis encontrados com "arthur":')
  profiles?.forEach(p => console.log(`   ${p.id} — ${p.username}`))

  if (!profiles?.length) {
    console.log('❌ Nenhum usuário com "arthur" encontrado. Ajuste a busca.')
    return
  }

  // Usa o primeiro encontrado (ajuste se necessário)
  const user = profiles[0]
  console.log(`\n✅ Usando: ${user.username} (${user.id})\n`)

  // 2. Rodada atual
  const { data: round } = await supabase
    .from('cartola_rounds')
    .select('id, name, status')
    .in('status', ['open', 'closed'])
    .order('start_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!round) { console.log('❌ Nenhuma rodada ativa'); return }
  console.log(`📅 Rodada: ${round.name} (${round.status}) — ID: ${round.id}\n`)

  // 3. Time do usuário
  const { data: team } = await supabase
    .from('cartola_teams')
    .select('id, formation')
    .eq('user_id', user.id)
    .eq('round_id', round.id)
    .maybeSingle()

  if (!team) { console.log('❌ Usuário não tem time nessa rodada'); return }
  console.log(`⚽ Time ID: ${team.id} | Formação: ${team.formation}\n`)

  // 4. Jogadores atuais do time
  const { data: players } = await supabase
    .from('cartola_team_players')
    .select('position_slot, is_captain, cartola_players(id, name, position)')
    .eq('cartola_team_id', team.id)
    .order('position_slot')

  console.log('📋 Jogadores atuais:')
  players?.forEach(p => {
    const name = p.cartola_players?.name ?? '???'
    const pos  = p.cartola_players?.position ?? '???'
    console.log(`   Slot ${p.position_slot}: [${pos}] ${name}${p.is_captain ? ' ©' : ''}`)
  })

  const occupiedSlots = new Set(players?.map(p => p.position_slot) ?? [])
  console.log(`\n   Slots ocupados: ${[...occupiedSlots].sort((a,b)=>a-b).join(', ')}`)
  console.log(`   Total: ${occupiedSlots.size}/11\n`)

  // 5. Busca Ayew e Hurtado no cartola_players
  const { data: targetPlayers } = await supabase
    .from('cartola_players')
    .select('id, name, position')
    .or('name.ilike.%ayew%,name.ilike.%hurtado%')

  console.log('🔍 Jogadores Ayew/Hurtado no banco:')
  targetPlayers?.forEach(p => console.log(`   ${p.id} — [${p.position}] ${p.name}`))

  if (!targetPlayers?.length) {
    console.log('❌ Ayew/Hurtado não encontrados em cartola_players')
    return
  }

  const ayew    = targetPlayers.find(p => p.name.toLowerCase().includes('ayew'))
  const hurtado = targetPlayers.find(p => p.name.toLowerCase().includes('hurtado'))

  if (!ayew)    console.log('\n⚠️  Ayew não encontrado')
  if (!hurtado) console.log('\n⚠️  Hurtado não encontrado')

  // Verifica se já estão no time
  const playerIds = new Set(players?.map(p => p.cartola_players?.id) ?? [])
  const ayewPresent    = ayew    && playerIds.has(ayew.id)
  const hurtadoPresent = hurtado && playerIds.has(hurtado.id)
  console.log(`\n   Ayew no time: ${ayewPresent ? '✅ já está' : '❌ faltando'}`)
  console.log(`   Hurtado no time: ${hurtadoPresent ? '✅ já está' : '❌ faltando'}\n`)

  if (ayewPresent && hurtadoPresent) {
    console.log('✅ Ambos já estão no time. Nada a fazer.')
    return
  }

  // 6. Determina slots disponíveis por posição
  // Reconstrói os slots baseado na formação
  const FORMATIONS = {
    '4-3-3':   { GK: 1, DEF: 4, MID: 3, FWD: 3 },
    '4-4-2':   { GK: 1, DEF: 4, MID: 4, FWD: 2 },
    '3-5-2':   { GK: 1, DEF: 3, MID: 5, FWD: 2 },
    '4-2-3-1': { GK: 1, DEF: 4, MID: 5, FWD: 1 },
  }
  const counts = FORMATIONS[team.formation] ?? FORMATIONS['4-3-3']
  const slots = []
  let idx = 0
  for (const pos of ['GK', 'DEF', 'MID', 'FWD']) {
    for (let i = 0; i < (counts[pos] ?? 0); i++) slots.push({ pos, slotIndex: idx++ })
  }

  function findFreeSlot(pos) {
    return slots.find(s => s.pos === pos && !occupiedSlots.has(s.slotIndex))
  }

  const toInsert = []

  if (!ayewPresent && ayew) {
    const slot = findFreeSlot(ayew.position)
    if (!slot) {
      console.log(`⚠️  Sem slot livre para ${ayew.position} (Ayew). Slots livres: ${slots.filter(s => !occupiedSlots.has(s.slotIndex)).map(s=>s.pos+':'+s.slotIndex).join(', ')}`)
    } else {
      console.log(`➕ Ayew (${ayew.position}) → slot ${slot.slotIndex}`)
      toInsert.push({ cartola_team_id: team.id, player_id: ayew.id, position_slot: slot.slotIndex, is_captain: false })
      occupiedSlots.add(slot.slotIndex)
    }
  }

  if (!hurtadoPresent && hurtado) {
    const slot = findFreeSlot(hurtado.position)
    if (!slot) {
      console.log(`⚠️  Sem slot livre para ${hurtado.position} (Hurtado). Slots livres: ${slots.filter(s => !occupiedSlots.has(s.slotIndex)).map(s=>s.pos+':'+s.slotIndex).join(', ')}`)
    } else {
      console.log(`➕ Hurtado (${hurtado.position}) → slot ${slot.slotIndex}`)
      toInsert.push({ cartola_team_id: team.id, player_id: hurtado.id, position_slot: slot.slotIndex, is_captain: false })
      occupiedSlots.add(slot.slotIndex)
    }
  }

  if (toInsert.length === 0) {
    console.log('\n⚠️  Nada a inserir.')
    return
  }

  if (DRY_RUN) {
    console.log('\n🔬 DRY RUN — não salvou')
    return
  }

  const { error } = await supabase.from('cartola_team_players').insert(toInsert)
  if (error) {
    console.error(`\n❌ Erro ao inserir: ${error.message}`)
  } else {
    console.log(`\n✅ ${toInsert.length} jogador(es) reinserido(s) com sucesso!`)
    // Recalcula total do time
    const { data: allPlayers } = await supabase
      .from('cartola_team_players')
      .select('player_id, is_captain')
      .eq('cartola_team_id', team.id)
    const { data: scores } = await supabase
      .from('cartola_player_scores')
      .select('player_id, total_points')
      .eq('round_id', round.id)
    const scoreMap = {}
    scores?.forEach(s => { scoreMap[s.player_id] = (scoreMap[s.player_id] ?? 0) + s.total_points })
    const total = (allPlayers ?? []).reduce((acc, tp) => {
      const base = scoreMap[tp.player_id] ?? 0
      return acc + (tp.is_captain ? base * 2 : base)
    }, 0)
    await supabase.from('cartola_teams').update({ total_points: total }).eq('id', team.id)
    console.log(`📊 Total recalculado: ${total.toFixed(1)} pts`)
  }
}

main().catch(err => { console.error('❌', err.message); process.exit(1) })
