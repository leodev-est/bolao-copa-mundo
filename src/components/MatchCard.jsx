import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronRight } from 'lucide-react'
import { STATUS_LABELS, LIVE_STATUSES, FINISHED_STATUSES } from '../lib/api-football'

function StatusBadge({ status }) {
  const info = STATUS_LABELS[status] ?? { label: status, color: 'gray' }

  const colorMap = {
    red:    'bg-red-500/20 text-red-400 border-red-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    green:  'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    gray:   'bg-gray-700/50 text-gray-400 border-gray-700',
  }

  const isLive = LIVE_STATUSES.includes(status)

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${colorMap[info.color] ?? colorMap.gray}`}>
      {isLive && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
      {info.label}
    </span>
  )
}

export default function MatchCard({ match }) {
  const isFinished = FINISHED_STATUSES.includes(match.status)
  const isLive     = LIVE_STATUSES.includes(match.status)
  const isUpcoming = match.status === 'NS'

  const matchDate = new Date(match.match_date)

  return (
    <Link
      to={`/jogos/${match.id}/palpite`}
      className={`block bg-gray-900 border rounded-xl p-4 hover:border-emerald-500/50 transition-all hover:shadow-lg hover:shadow-emerald-900/20 group ${
        isLive ? 'border-red-500/40' : 'border-gray-800'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusBadge status={match.status} />
          {match.round && (
            <span className="text-xs text-gray-500">{match.round}</span>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-emerald-400 transition-colors" />
      </div>

      <div className="flex items-center justify-between gap-4">
        {/* Time da casa */}
        <div className="flex-1 flex flex-col items-center gap-2">
          {match.home_team_logo ? (
            <img src={match.home_team_logo} alt={match.home_team} className="w-10 h-10 object-contain" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-lg">
              ⚽
            </div>
          )}
          <span className="text-sm font-semibold text-white text-center leading-tight line-clamp-2">{match.home_team}</span>
        </div>

        {/* Placar / Horário */}
        <div className="flex flex-col items-center gap-1 min-w-[70px] sm:min-w-[80px]">
          {(isFinished || isLive) && match.score_home !== null ? (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-white">{match.score_home}</span>
              <span className="text-gray-500 text-lg">×</span>
              <span className="text-2xl font-black text-white">{match.score_away}</span>
            </div>
          ) : (
            <>
              <span className="text-xl font-bold text-white">
                {format(matchDate, 'HH:mm')}
              </span>
              <span className="text-xs text-gray-500">
                {format(matchDate, "d 'de' MMM", { locale: ptBR })}
              </span>
            </>
          )}
          {isUpcoming && (
            <span className="text-[11px] text-emerald-500 font-medium">Apostar</span>
          )}
        </div>

        {/* Time visitante */}
        <div className="flex-1 flex flex-col items-center gap-2">
          {match.away_team_logo ? (
            <img src={match.away_team_logo} alt={match.away_team} className="w-10 h-10 object-contain" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-lg">
              ⚽
            </div>
          )}
          <span className="text-sm font-semibold text-white text-center leading-tight line-clamp-2">{match.away_team}</span>
        </div>
      </div>

      {match.venue && (
        <p className="text-center text-xs text-gray-600 mt-3">{match.venue}</p>
      )}
    </Link>
  )
}
