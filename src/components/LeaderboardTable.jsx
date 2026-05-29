import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

function PositionChange({ change }) {
  if (change > 0)  return <span className="flex items-center gap-0.5 text-emerald-400 text-xs font-medium"><TrendingUp className="w-3 h-3" />+{change}</span>
  if (change < 0)  return <span className="flex items-center gap-0.5 text-red-400 text-xs font-medium"><TrendingDown className="w-3 h-3" />{change}</span>
  return <span className="flex items-center gap-0.5 text-gray-600 text-xs"><Minus className="w-3 h-3" /></span>
}

function Medal({ position }) {
  if (position === 1) return <span className="text-xl">🥇</span>
  if (position === 2) return <span className="text-xl">🥈</span>
  if (position === 3) return <span className="text-xl">🥉</span>
  return <span className="text-gray-500 text-sm font-bold w-6 text-center">{position}</span>
}

export default function LeaderboardTable({ leaderboard, isLoading }) {
  const { user } = useAuth()

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-800/50 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!leaderboard?.length) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-3">🏆</p>
        <p className="text-gray-400">Nenhum participante ainda.</p>
        <p className="text-gray-600 text-sm mt-1">Faça o primeiro palpite!</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {leaderboard.map((entry) => {
        const isMe = entry.user_id === user?.id
        return (
          <div
            key={entry.user_id}
            className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
              isMe
                ? 'bg-emerald-900/20 border-emerald-500/40 shadow-lg shadow-emerald-900/20'
                : 'bg-gray-900 border-gray-800'
            }`}
          >
            {/* Posição */}
            <div className="w-8 flex items-center justify-center shrink-0">
              <Medal position={Number(entry.position)} />
            </div>

            {/* Avatar */}
            <div className="shrink-0">
              {entry.avatar_url ? (
                <img src={entry.avatar_url} alt={entry.username} className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                  isMe ? 'bg-emerald-700 text-white' : 'bg-gray-700 text-gray-300'
                }`}>
                  {(entry.username ?? '?')[0].toUpperCase()}
                </div>
              )}
            </div>

            {/* Nome */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={`font-semibold truncate text-sm ${isMe ? 'text-emerald-300' : 'text-white'}`}>
                  {entry.username ?? 'Anônimo'}
                  {isMe && <span className="ml-1 text-xs text-emerald-500 font-normal">(você)</span>}
                </p>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-gray-500">
                  {entry.total_wins ?? 0}/{entry.total_bets ?? 0} acertos
                </span>
                {entry.total_bets > 0 && (
                  <span className="text-xs text-gray-600">
                    {entry.win_rate ?? 0}% taxa
                  </span>
                )}
              </div>
            </div>

            {/* Pontos + variação */}
            <div className="text-right shrink-0">
              <p className={`text-lg font-black ${isMe ? 'text-emerald-400' : 'text-white'}`}>
                {parseFloat(entry.total_points ?? 0).toFixed(2)}
                <span className="text-xs font-normal text-gray-500 ml-1">pts</span>
              </p>
              <PositionChange change={entry.position_change ?? 0} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
