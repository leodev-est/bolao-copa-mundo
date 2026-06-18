import { useState, useMemo } from 'react'
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  useCartolaRounds,
  useRoundTeam,
  useRoundPlayerScores,
  useRoundLeaderboard,
} from '../hooks/useCartola'
import { useAuth } from '../hooks/useAuth'
import { LeaderboardSkeleton } from '../components/Skeleton'

const POS_STYLE = {
  GK:  'text-yellow-400  bg-yellow-500/10',
  DEF: 'text-blue-400   bg-blue-500/10',
  MID: 'text-purple-400 bg-purple-500/10',
  FWD: 'text-emerald-400 bg-emerald-500/10',
}

function Medal({ pos }) {
  if (pos === 1) return <span className="text-lg">🥇</span>
  if (pos === 2) return <span className="text-lg">🥈</span>
  if (pos === 3) return <span className="text-lg">🥉</span>
  return <span className="text-xs font-bold text-gray-500">#{pos}</span>
}

const GOAL_PTS = { GK: 15, DEF: 12, MID: 8, FWD: 8 }
const CS_PTS   = { GK: 5,  DEF: 5 }
const SOT_PTS  = { GK: 3,  DEF: 3, MID: 2, FWD: 2 }

function calcBreakdown(score, position, isCaptain) {
  if (!score) return []
  const items = []
  if (score.goals > 0)
    items.push({ label: `${score.goals} gol${score.goals > 1 ? 's' : ''}`, pts: score.goals * (GOAL_PTS[position] ?? 8) })
  if (score.assists > 0)
    items.push({ label: `${score.assists} assistência${score.assists > 1 ? 's' : ''}`, pts: score.assists * 5 })
  if (score.clean_sheet && CS_PTS[position])
    items.push({ label: 'Sem gol sofrido', pts: CS_PTS[position] })
  if ((score.penalty_saved ?? 0) > 0)
    items.push({ label: `${score.penalty_saved} pênalti defendido`, pts: score.penalty_saved * 7 })
  if ((score.own_goal ?? 0) > 0)
    items.push({ label: `${score.own_goal} gol contra`, pts: score.own_goal * -4 })
  if (score.yellow_card)
    items.push({ label: 'Cartão amarelo', pts: -2 })
  if (score.red_card)
    items.push({ label: 'Cartão vermelho', pts: -5 })

  const known = items.reduce((s, i) => s + i.pts, 0)
  const other = parseFloat((score.total_points - known).toFixed(1))
  if (Math.abs(other) >= 0.1)
    items.push({ label: 'Chutes no gol, faltas e imped.', pts: other, dim: true })

  if (isCaptain && score.total_points !== 0)
    items.push({ label: 'Capitão ×2', pts: score.total_points, cap: true })

  return items
}

function EventTags({ score, position }) {
  if (!score) return <span className="text-[10px] text-gray-600">sem jogo</span>
  const tags = []
  if (score.goals > 0)          tags.push(<span key="g"  className="text-[10px] text-emerald-400 font-semibold">⚽ {score.goals}</span>)
  if (score.assists > 0)        tags.push(<span key="a"  className="text-[10px] text-blue-400 font-semibold">🅰 {score.assists}</span>)
  if (score.clean_sheet)        tags.push(<span key="cs" className="text-[10px] text-cyan-400 font-semibold">Sem gol sofrido</span>)
  if (score.penalty_saved > 0)  tags.push(<span key="ps" className="text-[10px] text-emerald-300 font-semibold">✋ {score.penalty_saved} pênalti defend.</span>)
  if (score.own_goal > 0)       tags.push(<span key="og" className="text-[10px] text-red-400 font-semibold">Gol contra</span>)
  if (score.yellow_card)        tags.push(<span key="y"  className="text-[10px]">🟨</span>)
  if (score.red_card)           tags.push(<span key="r"  className="text-[10px]">🟥</span>)
  if (tags.length === 0) tags.push(<span key="no" className="text-[10px] text-gray-600">sem eventos</span>)
  return <div className="flex items-center gap-1.5 flex-wrap">{tags}</div>
}

function MyTeamView({ userId, roundId, onSwitchToRanking }) {
  const { data: team, isLoading: teamLoading } = useRoundTeam(userId, roundId)
  const { data: scoresMap = {}, isLoading: scoresLoading } = useRoundPlayerScores(roundId)
  const [expanded, setExpanded] = useState(null)
  const toggle = (id) => setExpanded(prev => prev === id ? null : id)

  if (teamLoading || scoresLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!team) {
    return (
      <div className="text-center py-16">
        <p className="text-3xl mb-3">⚽</p>
        <p className="text-gray-400 font-semibold">Sem time nesta rodada</p>
        <p className="text-gray-600 text-sm mt-1">Você não escalou um time nesta rodada.</p>
        <Link to="/cartola" className="inline-block mt-4 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-500 transition-colors">
          Escalar agora
        </Link>
      </div>
    )
  }

  const players = [...(team.cartola_team_players ?? [])]
    .sort((a, b) => {
      const order = { GK: 0, DEF: 1, MID: 2, FWD: 3 }
      const pa = a.cartola_players?.position ?? 'FWD'
      const pb = b.cartola_players?.position ?? 'FWD'
      return (order[pa] ?? 9) - (order[pb] ?? 9)
    })

  let totalCalc = 0
  for (const tp of players) {
    const p = tp.cartola_players
    if (!p) continue
    const score = scoresMap[p.id]
    const base  = score?.total_points ?? 0
    totalCalc  += tp.is_captain ? base * 2 : base
  }

  return (
    <div>
      {/* Cabeçalho do time */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-3">
        <div className="px-4 pt-3.5 pb-3 flex items-center justify-between border-b border-gray-800">
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Formação</p>
            <p className="text-white font-bold text-lg mt-0.5">{team.formation}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total</p>
            <p className="text-2xl font-black text-emerald-400 mt-0.5">{totalCalc.toFixed(1)}<span className="text-gray-500 text-xs font-normal ml-1">pts</span></p>
          </div>
        </div>

        <div className="divide-y divide-gray-800/50">
          {players.map(tp => {
            const p = tp.cartola_players
            if (!p) return null
            const score     = scoresMap[p.id] ?? null
            const base      = score?.total_points ?? null
            const pts       = base !== null ? (tp.is_captain ? base * 2 : base) : null
            const posStyle  = POS_STYLE[p.position] ?? 'text-gray-400 bg-gray-800'
            const isOpen    = expanded === tp.id
            const breakdown = calcBreakdown(score, p.position, tp.is_captain)

            return (
              <div key={tp.id}>
                {/* Row clicável */}
                <button
                  onClick={() => breakdown.length > 0 && toggle(tp.id)}
                  className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${breakdown.length > 0 ? 'hover:bg-gray-800/40 cursor-pointer' : 'cursor-default'}`}
                >
                  <span className={`text-[10px] font-bold w-7 h-7 flex items-center justify-center rounded-lg shrink-0 ${posStyle}`}>
                    {p.position}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-white text-sm font-medium leading-tight">{p.name}</p>
                      {tp.is_captain && (
                        <span className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                          <span className="text-white text-[9px] font-black">C</span>
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-[11px] mt-0.5">{p.team_name}</p>
                    <div className="mt-1">
                      <EventTags score={score} position={p.position} />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="text-right min-w-[44px]">
                      {pts !== null ? (
                        <>
                          <p className={`text-sm font-bold leading-tight ${pts > 0 ? 'text-emerald-400' : pts < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                            {pts > 0 ? '+' : ''}{pts.toFixed(1)}
                          </p>
                          {tp.is_captain && <p className="text-[9px] text-orange-400">×2</p>}
                        </>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </div>
                    {breakdown.length > 0 && (
                      isOpen
                        ? <ChevronUp className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                        : <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    )}
                  </div>
                </button>

                {/* Breakdown expandido */}
                {isOpen && (
                  <div className="px-4 pb-3 bg-gray-800/30">
                    <div className="rounded-xl border border-gray-700/50 overflow-hidden">
                      {breakdown.map((item, i) => (
                        <div key={i} className={`flex justify-between items-center px-3 py-2 text-xs ${item.cap ? 'border-t border-gray-700/50 bg-orange-900/10' : i > 0 ? 'border-t border-gray-700/30' : ''}`}>
                          <span className={item.cap ? 'text-orange-400 font-medium' : item.dim ? 'text-gray-500' : 'text-gray-300'}>
                            {item.label}
                          </span>
                          <span className={`font-bold ${item.cap ? 'text-orange-400' : item.pts > 0 ? 'text-emerald-400' : item.pts < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                            {item.pts > 0 ? '+' : ''}{item.pts.toFixed(1)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center px-3 py-2 border-t border-gray-700/50 bg-gray-800/60">
                        <span className="text-white text-xs font-semibold">Total</span>
                        <span className={`font-black text-sm ${(pts ?? 0) > 0 ? 'text-emerald-400' : (pts ?? 0) < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                          {(pts ?? 0) > 0 ? '+' : ''}{(pts ?? 0).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Link para ranking */}
      <button
        onClick={onSwitchToRanking}
        className="w-full flex items-center justify-center gap-2 py-3 text-sm text-gray-400 hover:text-emerald-400 transition-colors border border-gray-800 rounded-xl"
      >
        <Trophy className="w-4 h-4" />
        Ver ranking desta rodada
      </button>
    </div>
  )
}

function RankingView({ roundId, onBack }) {
  const { user } = useAuth()
  const { data: lb = [], isLoading } = useRoundLeaderboard(roundId)

  return (
    <div>
      <button onClick={onBack} className="text-xs text-emerald-400 mb-4 flex items-center gap-1 hover:text-emerald-300">
        ← Voltar ao meu time
      </button>
      {isLoading ? <LeaderboardSkeleton rows={5} /> : (
        <div className="space-y-2">
          {lb.map((e, i) => {
            const isMe = e.user_id === user?.id
            return (
              <div key={e.user_id} className={`flex items-center gap-3 p-3 rounded-xl border ${isMe ? 'bg-emerald-900/20 border-emerald-700/40' : 'bg-gray-900 border-gray-800'}`}>
                <div className="w-7 flex justify-center shrink-0"><Medal pos={e.position} /></div>
                {e.avatar_url
                  ? <img src={e.avatar_url} className="w-9 h-9 rounded-full object-cover shrink-0" alt="" />
                  : <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isMe ? 'bg-emerald-700 text-white' : 'bg-gray-800 text-gray-400'}`}>{(e.username??'?')[0].toUpperCase()}</div>
                }
                <p className={`flex-1 font-semibold text-sm truncate ${isMe ? 'text-white' : 'text-gray-200'}`}>
                  {e.username ?? 'Anônimo'}
                  {isMe && <span className="ml-1.5 text-[10px] text-emerald-400 font-bold">você</span>}
                </p>
                <p className={`font-black text-lg ${isMe ? 'text-emerald-400' : 'text-white'}`}>
                  {parseFloat(e.round_points ?? e.total_points ?? 0).toFixed(1)}
                  <span className="text-gray-600 text-xs font-normal ml-1">pts</span>
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const SCORING_TABLE = [
  { label: 'Gol (atacante/meia)',        pts: '+8',    color: 'emerald' },
  { label: 'Gol (zagueiro/lateral)',      pts: '+12',   color: 'emerald' },
  { label: 'Gol (goleiro)',               pts: '+15',   color: 'emerald' },
  { label: 'Assistência',                 pts: '+5',    color: 'emerald' },
  { label: 'Chute no gol (DEF/GOL)',      pts: '+3',    color: 'emerald' },
  { label: 'Chute no gol (MEI/ATA)',      pts: '+2',    color: 'emerald' },
  { label: 'Defesa do goleiro',           pts: '+3',    color: 'emerald' },
  { label: 'Sem gol sofrido (goleiro)',     pts: '+5',    color: 'emerald' },
  { label: 'Sem gol sofrido (zagueiro)',   pts: '+5',    color: 'emerald' },
  { label: 'Falta sofrida',               pts: '+0.5',  color: 'emerald' },
  { label: 'Pênalti defendido',           pts: '+7',    color: 'emerald' },
  { label: 'Falta cometida',              pts: '-0.5',  color: 'red' },
  { label: 'Impedimento',                 pts: '-0.5',  color: 'red' },
  { label: 'Cartão amarelo',              pts: '-2',    color: 'red' },
  { label: 'Gol contra',                  pts: '-4',    color: 'red' },
  { label: 'Cartão vermelho',             pts: '-5',    color: 'red' },
  { label: 'Pênalti perdido',             pts: '-3',    color: 'red' },
  { label: 'DEF: 2 gols sofridos',        pts: '-1',    color: 'red' },
  { label: 'DEF: 3 gols sofridos',        pts: '-2',    color: 'red' },
  { label: 'DEF: 4+ gols sofridos',       pts: '-3',    color: 'red' },
]

export default function CartolaRanking() {
  const { user }            = useAuth()
  const { data: rounds = [] } = useCartolaRounds()
  const [showRanking, setShowRanking] = useState(false)

  const finishedRounds = useMemo(() =>
    rounds.filter(r => r.status === 'finished' || r.status === 'closed')
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date)),
    [rounds]
  )

  const [selectedRound, setSelectedRound] = useState(null)
  const activeRound = selectedRound ?? finishedRounds.at(-1)?.id ?? null

  const roundName = rounds.find(r => r.id === activeRound)?.name ?? ''

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black text-white">Meu Cartola</h1>
          <p className="text-gray-500 text-sm mt-0.5">{roundName || 'Histórico de rodadas'}</p>
        </div>
        <Link to="/cartola" className="text-xs text-emerald-400 font-semibold hover:text-emerald-300 transition-colors">
          Escalar time →
        </Link>
      </div>

      {/* Tabs de rodadas */}
      {finishedRounds.length > 0 ? (
        <>
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
            {finishedRounds.map(r => (
              <button
                key={r.id}
                onClick={() => { setSelectedRound(r.id); setShowRanking(false) }}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeRound === r.id ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {r.name.split('—')[0].trim()}
              </button>
            ))}
          </div>

          {showRanking
            ? <RankingView roundId={activeRound} onBack={() => setShowRanking(false)} />
            : <MyTeamView userId={user?.id} roundId={activeRound} onSwitchToRanking={() => setShowRanking(true)} />
          }
        </>
      ) : (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">⏳</p>
          <p className="text-gray-400 font-semibold">Nenhuma rodada encerrada ainda</p>
          <p className="text-gray-600 text-sm mt-1">Os resultados aparecerão aqui após o fim de cada rodada.</p>
        </div>
      )}

      {/* Tabela de pontuação */}
      <div className="mt-8 p-4 bg-gray-900 border border-gray-800 rounded-2xl">
        <h3 className="text-sm font-semibold text-white mb-3">Pontuação do Cartola</h3>
        <ul className="space-y-1.5 text-xs text-gray-500">
          {SCORING_TABLE.map(({ label, pts, color }) => (
            <li key={label} className="flex justify-between">
              <span>{label}</span>
              <span className={`font-semibold ${color === 'emerald' ? 'text-emerald-400' : 'text-red-400'}`}>
                {pts} pts
              </span>
            </li>
          ))}
          <li className="flex justify-between border-t border-gray-800 pt-2 mt-2">
            <span className="text-orange-400 font-medium">Capitão</span>
            <span className="text-orange-400 font-semibold">× 2</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
