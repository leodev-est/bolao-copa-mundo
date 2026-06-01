/**
 * Resolve palpites de partidas encerradas.
 * Rodado pelo GitHub Actions após sync.js.
 *
 * Uso local: node resolve_bets.js
 * Uso dry-run: node resolve_bets.js --dry-run
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Carrega .env localmente (em CI as vars já estão no ambiente)
try {
  const raw = readFileSync('.env', 'utf-8')
  raw.split('\n').filter(l => l.includes('=') && !l.startsWith('#')).forEach(l => {
    const i = l.indexOf('=')
    const k = l.slice(0, i).trim()
    const v = l.slice(i + 1).trim()
    if (!process.env[k]) process.env[k] = v
  })
} catch { /* .env não encontrado — usando vars do ambiente */ }

const DRY_RUN   = process.argv.includes('--dry-run')
const supabase  = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const API_KEY   = process.env.VITE_FOOTBALL_DATA_KEY
const BASE_URL  = 'https://api.football-data.org/v4'
const FINISHED  = ['FT', 'AET', 'PEN']

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function getGoals(apiMatchId) {
  try {
    const res = await fetch(`${BASE_URL}/matches/${apiMatchId}`, {
      headers: { 'X-Auth-Token': API_KEY },
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.goals ?? [])
      .filter(g => g.type !== 'OWN')
      .map(g => ({
        player_id:   g.scorer?.id   ?? null,
        player_name: g.scorer?.name ?? '',
        team:        g.team?.name   ?? '',
      }))
  } catch {
    return []
  }
}

async function main() {
  console.log(`🎯 Resolve Bets — ${new Date().toISOString().slice(0, 10)}${DRY_RUN ? ' (DRY RUN)' : ''}\n`)

  // Partidas encerradas com palpites ainda pendentes
  const { data: matches } = await supabase
    .from('matches')
    .select('id, api_match_id, status, score_home, score_away, home_team, away_team')
    .in('status', FINISHED)

  if (!matches?.length) { console.log('Sem partidas encerradas.'); return }

  let totalResolved = 0

  for (const match of matches) {
    // Verifica se há palpites pendentes nessa partida
    const { count } = await supabase
      .from('bets')
      .select('id', { count: 'exact', head: true })
      .eq('match_id', match.id)
      .eq('status', 'pending')

    if (!count) continue

    console.log(`⚽ ${match.home_team} ${match.score_home} × ${match.score_away} ${match.away_team} (${count} palpites)`)

    // Busca artilheiros da partida
    const goals = await getGoals(match.api_match_id)
    await sleep(6500) // respeita 10 req/min do plano gratuito

    const actualHome   = match.score_home ?? 0
    const actualAway   = match.score_away ?? 0
    const actualResult = actualHome > actualAway ? 'home' : actualAway > actualHome ? 'away' : 'draw'

    // ── Palpites principais (placar + artilheiros) ────────────────────
    const { data: mainBets } = await supabase
      .from('bets')
      .select('id, score_home, score_away, predicted_result, odd, points_wagered, bet_scorers(*)')
      .eq('match_id', match.id)
      .is('bet_option_id', null)
      .eq('status', 'pending')

    for (const bet of (mainBets ?? [])) {
      const exactScore = bet.score_home === actualHome && bet.score_away === actualAway
      const resultOk   = bet.predicted_result === actualResult

      let pointsWon = 0
      if (exactScore)    pointsWon += bet.points_wagered * (bet.odd ?? 1)
      else if (resultOk) pointsWon += bet.points_wagered * 1.3

      // Artilheiros: +0.5 por slot correto
      const scorerUpdates = []
      for (const scorer of (bet.bet_scorers ?? [])) {
        let correct = false
        if (scorer.player_id) {
          correct = goals.some(g =>
            g.player_id === scorer.player_id &&
            (scorer.team === 'home' ? g.team === match.home_team : g.team === match.away_team)
          )
        } else {
          correct = goals.some(g =>
            g.player_name?.toLowerCase() === scorer.player_name?.toLowerCase()
          )
        }
        if (correct) pointsWon += 0.5
        scorerUpdates.push({ id: scorer.id, correct })
      }

      const betStatus = exactScore || resultOk || pointsWon > 0 ? 'won' : 'lost'

      if (!DRY_RUN) {
        await supabase.from('bets').update({
          status:     betStatus,
          points_won: parseFloat(pointsWon.toFixed(2)),
          updated_at: new Date().toISOString(),
        }).eq('id', bet.id)

        for (const { id, correct } of scorerUpdates) {
          await supabase.from('bet_scorers').update({ is_correct: correct }).eq('id', id)
        }
      }

      totalResolved++
    }

    // ── Apostas extras (total_goals) ──────────────────────────────────
    const { data: extraOpts } = await supabase
      .from('bet_options')
      .select('id, type, metadata')
      .eq('match_id', match.id)
      .in('type', ['total_goals'])
      .is('result', null)

    for (const opt of (extraOpts ?? [])) {
      const threshold = opt.metadata?.threshold
      const direction = opt.metadata?.direction
      if (threshold == null) continue

      const total  = actualHome + actualAway
      const result = direction === 'over'
        ? total >= threshold ? 'won' : 'lost'
        : total  < threshold ? 'won' : 'lost'

      if (!DRY_RUN) {
        await supabase.from('bet_options').update({ result }).eq('id', opt.id)
        // Resolve bets dos usuários nessa opção
        const { data: optBets } = await supabase
          .from('bets')
          .select('id, points_wagered, bet_option_id')
          .eq('bet_option_id', opt.id)
          .eq('status', 'pending')

        for (const ob of (optBets ?? [])) {
          const won = result === 'won'
          await supabase.from('bets').update({
            status:     won ? 'won' : 'lost',
            points_won: won ? parseFloat((ob.points_wagered * 2).toFixed(2)) : 0,
            updated_at: new Date().toISOString(),
          }).eq('id', ob.id)
        }
      }
    }

    console.log(`  ↳ ${mainBets?.length ?? 0} palpites | artilheiros: ${goals.length} gols`)
  }

  console.log(`\n✅ ${totalResolved} palpites resolvidos.`)
}

main().catch(err => { console.error('❌', err.message); process.exit(1) })
