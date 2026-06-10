import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { CheckCircle2, XCircle, Clock, ArrowLeft, TrendingUp } from 'lucide-react'
import { useUserBets, useBetStats } from '../hooks/useBets'
import { LeaderboardSkeleton, StatCardSkeleton } from '../components/Skeleton'
import { formatOdd } from '../lib/odds'

function StatusIcon({ status }) {
  if (status === 'won')  return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
  if (status === 'lost') return <XCircle      className="w-4 h-4 text-red-400 shrink-0"     />
  return                        <Clock        className="w-4 h-4 text-gray-600 shrink-0"    />
}

function PointsBadge({ bet }) {
  if (bet.status === 'won')     return <span className="text-emerald-400 text-sm font-bold tabular-nums">+{bet.points_won?.toFixed(2)}</span>
  if (bet.status === 'lost')    return <span className="text-red-400/70 text-sm font-medium tabular-nums">-1</span>
  if (bet.odd)                  return <span className="text-gray-600 text-xs tabular-nums">odd {formatOdd(bet.odd)}</span>
  if (bet.bet_options?.odd)     return <span className="text-gray-600 text-xs tabular-nums">odd {formatOdd(bet.bet_options.odd)}</span>
  return null
}

export default function Historico() {
  const { data: bets = [], isLoading } = useUserBets()
  const stats = useBetStats(bets)

  const grouped = useMemo(() => {
    const map = {}
    for (const bet of bets) {
      const match = bet.matches
      if (!match) continue
      const key = bet.match_id
      if (!map[key]) map[key] = { matchId: bet.match_id, match, mainBet: null, extraBets: [] }
      if (!bet.bet_option_id) {
        map[key].mainBet = bet
      } else {
        map[key].extraBets.push(bet)
      }
    }
    return Object.values(map).sort(
      (a, b) => new Date(b.match.match_date) - new Date(a.match.match_date)
    )
  }, [bets])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/ranking" className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-white">Meu Histórico</h1>
          <p className="text-gray-500 text-sm mt-0.5">Todos os seus palpites</p>
        </div>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[0,1,2].map(i => <StatCardSkeleton key={i} />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-white">{stats.total}</p>
            <p className="text-xs text-gray-500 mt-0.5">palpites</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-emerald-400">{stats.won}</p>
            <p className="text-xs text-gray-500 mt-0.5">acertos</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-yellow-400">{stats.winRate}%</p>
            <p className="text-xs text-gray-500 mt-0.5">aproveit.</p>
          </div>
        </div>
      ) : null}

      {/* Saldo total */}
      {stats && stats.resolved > 0 && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border mb-6 ${
          stats.profit >= 0
            ? 'bg-emerald-900/20 border-emerald-700/40'
            : 'bg-red-900/20 border-red-700/40'
        }`}>
          <TrendingUp className={`w-5 h-5 shrink-0 ${stats.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
          <div>
            <p className={`font-bold text-sm ${stats.profit >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
              {stats.profit >= 0 ? '+' : ''}{stats.profit.toFixed(2)} pts de lucro
            </p>
            <p className="text-gray-500 text-xs mt-0.5">
              {stats.totalPoints.toFixed(2)} pts ganhos · {stats.totalWagered} apostados
            </p>
          </div>
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <LeaderboardSkeleton rows={5} />
      ) : grouped.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🎯</p>
          <p className="text-gray-400 text-lg font-semibold">Nenhum palpite ainda</p>
          <p className="text-gray-600 text-sm mt-2">Faça seu primeiro palpite!</p>
          <Link
            to="/jogos"
            className="inline-block mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Ver jogos
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(({ matchId, match, mainBet, extraBets }) => (
            <div key={matchId} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              {/* Cabeçalho da partida */}
              <Link
                to={`/jogos/${matchId}/palpite`}
                className="flex items-center justify-between px-4 py-3 border-b border-gray-800 hover:bg-gray-800/40 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-white text-sm font-bold truncate">{match.home_team}</span>
                  {match.score_home !== null && (
                    <span className="text-gray-400 text-sm font-black shrink-0">
                      {match.score_home}×{match.score_away}
                    </span>
                  )}
                  <span className="text-white text-sm font-bold truncate">{match.away_team}</span>
                </div>
                <span className="text-gray-600 text-xs shrink-0 ml-2">
                  {format(new Date(match.match_date), 'dd/MM')}
                </span>
              </Link>

              {/* Palpite principal */}
              {mainBet && (
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={mainBet.status} />
                    <span className="text-sm text-gray-300">
                      Placar: <span className="font-bold text-white">{mainBet.score_home} × {mainBet.score_away}</span>
                    </span>
                  </div>
                  <PointsBadge bet={mainBet} />
                </div>
              )}

              {/* Apostas extras */}
              {extraBets.map(bet => (
                <div key={bet.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <StatusIcon status={bet.status} />
                    <span className="text-sm text-gray-400 truncate">{bet.bet_options?.description}</span>
                  </div>
                  <PointsBadge bet={bet} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
