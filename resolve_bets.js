/**
 * Resolve palpites de partidas encerradas.
 * Rodado pelo GitHub Actions após sync.js.
 *
 * Uso local:    node resolve_bets.js
 * Dry-run:      node resolve_bets.js --dry-run
 * Forçar re-resolve (corrige bets já resolvidos com dados errados):
 *               node resolve_bets.js --force
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
const FORCE    = process.argv.includes('--force')
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const FINISHED = ['FT', 'AET', 'PEN']

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'
const ESPN_HDRS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept':     'application/json',
  'Origin':     'https://www.espn.com',
  'Referer':    'https://www.espn.com/',
}

function norm(s) {
  return s.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').trim()
}

function namesMatch(a, b) {
  if (!a || !b) return false
  const an = norm(a), bn = norm(b)
  if (an === bn || an.includes(bn) || bn.includes(an)) return true
  const aLast = an.split(' ').filter(Boolean).at(-1) ?? ''
  const bLast = bn.split(' ').filter(Boolean).at(-1) ?? ''
  return aLast.length >= 4 && aLast === bLast
}

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

async function findEspnEventId(match) {
  const d = new Date(match.match_date)
  for (const candidate of [d, new Date(d.getTime() - 86400_000)]) {
    try {
      const res = await fetch(`${ESPN_BASE}/scoreboard?dates=${espnDateStr(candidate)}`, { headers: ESPN_HDRS })
      if (!res.ok) continue
      const data = await res.json()
      for (const ev of (data.events ?? [])) {
        const comp = ev.competitions?.[0]
        const home = comp?.competitors?.find(c => c.homeAway === 'home')
        const away = comp?.competitors?.find(c => c.homeAway === 'away')
        if (home && away &&
            teamsMatch(home.team.displayName, match.home_team) &&
            teamsMatch(away.team.displayName, match.away_team)) {
          return ev.id
        }
      }
    } catch {}
  }
  return null
}

// Busca artilheiros via ESPN keyEvents e enriquece com ESPN athlete IDs do bet_options
async function getGoals(espnEventId, matchId) {
  if (!espnEventId) return []
  try {
    const res = await fetch(`${ESPN_BASE}/summary?event=${espnEventId}`, { headers: ESPN_HDRS })
    if (!res.ok) return []
    const data = await res.json()

    const goals = []
    for (const ev of (data.keyEvents ?? [])) {
      const text = (ev.text ?? '').trim()
      if (!text.startsWith('Goal!') || text.toLowerCase().includes('own goal')) continue
      const afterDot = text.replace(/^Goal!.*?\.\s+/, '')
      const m = afterDot.match(/^(.+?)\s+\(([^)]+)\)/)
      if (m) goals.push({ player_name: m[1].trim(), team: m[2].trim(), player_id: null })
    }

    // Enriquece com ESPN athlete_id do bet_options (player_id no metadata)
    if (goals.length > 0) {
      const { data: opts } = await supabase
        .from('bet_options')
        .select('metadata')
        .eq('match_id', matchId)
        .eq('type', 'goalscorer')

      for (const goal of goals) {
        const opt = opts?.find(o => namesMatch(goal.player_name, o.metadata?.player_name ?? ''))
        if (opt?.metadata?.player_id) goal.player_id = opt.metadata.player_id
      }
    }

    return goals
  } catch {
    return []
  }
}

async function main() {
  console.log(`🎯 Resolve Bets — ${new Date().toISOString().slice(0, 10)}${DRY_RUN ? ' (DRY RUN)' : ''}${FORCE ? ' (FORCE)' : ''}\n`)

  const { data: matches } = await supabase
    .from('matches')
    .select('id, api_match_id, espn_event_id, match_date, status, score_home, score_away, home_team, away_team')
    .in('status', FINISHED)

  if (!matches?.length) { console.log('Sem partidas encerradas.'); return }

  // --force: reseta bets já resolvidos para pending (corrige dados errados do passado)
  if (FORCE && !DRY_RUN) {
    const matchIds = matches.map(m => m.id)
    const { count: resetCount } = await supabase
      .from('bets')
      .select('id', { count: 'exact', head: true })
      .in('match_id', matchIds)
      .in('status', ['won', 'lost'])
    if (resetCount > 0) {
      await supabase.from('bets')
        .update({ status: 'pending', points_won: 0 })
        .in('match_id', matchIds)
        .in('status', ['won', 'lost'])
      console.log(`🔄 ${resetCount} bets resetados para pending\n`)
    }
  }

  let totalResolved = 0

  for (const match of matches) {
    const { count } = await supabase
      .from('bets')
      .select('id', { count: 'exact', head: true })
      .eq('match_id', match.id)
      .eq('status', 'pending')

    if (!count) continue

    if (match.score_home === null || match.score_away === null) {
      console.log(`  ⏳ ${match.home_team} × ${match.away_team} — placar nulo, aguardando próximo sync`)
      continue
    }

    // Garante ESPN event ID
    let espnId = match.espn_event_id
    if (!espnId) {
      espnId = await findEspnEventId(match)
      if (espnId && !DRY_RUN) {
        await supabase.from('matches').update({ espn_event_id: espnId }).eq('id', match.id)
      }
    }

    const { count: lineupCount } = await supabase
      .from('bet_options')
      .select('id', { count: 'exact', head: true })
      .eq('match_id', match.id)
      .eq('type', 'goalscorer')

    const hasOfficialLineup = (lineupCount ?? 0) > 0
    if (!hasOfficialLineup) {
      console.log(`  ⚠️  ${match.home_team} × ${match.away_team} — sem escalação, artilheiros anulados`)
    }

    const goals = await getGoals(espnId, match.id)

    const actualHome   = match.score_home
    const actualAway   = match.score_away
    const actualResult = actualHome > actualAway ? 'home' : actualAway > actualHome ? 'away' : 'draw'

    console.log(`⚽ ${match.home_team} ${actualHome} × ${actualAway} ${match.away_team} (${count} palpites | ${goals.length} gols ESPN)`)

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
      const safeOdd = typeof bet.odd === 'number' && bet.odd > 0 ? bet.odd : 1
      if (exactScore)    pointsWon += bet.points_wagered * safeOdd
      else if (resultOk) pointsWon += bet.points_wagered * 1.3

      const scorerUpdates = []
      if (hasOfficialLineup) {
        for (const scorer of (bet.bet_scorers ?? [])) {
          if (!scorer?.id) continue
          let correct = false

          if (scorer.player_id) {
            // Tenta match por ESPN athlete ID + time (fonte primária)
            correct = goals.some(g =>
              g.player_id === scorer.player_id &&
              teamsMatch(g.team, scorer.team === 'home' ? match.home_team : match.away_team)
            )
          }
          if (!correct && scorer.player_name) {
            // Fallback: match por nome (case-insensitive + sobrenome)
            correct = goals.some(g =>
              namesMatch(g.player_name, scorer.player_name) &&
              teamsMatch(g.team, scorer.team === 'home' ? match.home_team : match.away_team)
            )
          }

          if (correct) pointsWon += 0.5
          scorerUpdates.push({ id: scorer.id, correct })
        }
      }

      const betStatus = exactScore || resultOk || pointsWon > 0 ? 'won' : 'lost'
      const correctScorers = scorerUpdates.filter(s => s.correct).length

      if (DRY_RUN) {
        if (exactScore || resultOk || correctScorers > 0) {
          console.log(`  🎯 [DRY] bet ${bet.id.slice(0, 8)}: placar=${exactScore} resultado=${resultOk} artilheiros=${correctScorers} → ${pointsWon.toFixed(1)} pts`)
        }
      } else {
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

    // Apostas extras (total_goals)
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
        ? total >  threshold ? 'won' : 'lost'
        : total <= threshold ? 'won' : 'lost'

      if (!DRY_RUN) {
        await supabase.from('bet_options').update({ result }).eq('id', opt.id)
        const { data: optBets } = await supabase
          .from('bets')
          .select('id, points_wagered')
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

    console.log(`  ↳ ${mainBets?.length ?? 0} palpites | artilheiros: ${goals.map(g => g.player_name).join(', ') || 'nenhum'}`)
  }

  console.log(`\n✅ ${totalResolved} palpites resolvidos.`)
}

main().catch(err => { console.error('❌', err.message); process.exit(1) })
