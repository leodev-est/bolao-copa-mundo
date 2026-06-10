import { useState } from 'react'
import { ChevronDown, X, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  useCartolaLeaderboard,
  useCartolaRounds,
  useRoundLeaderboard,
  useRoundTeam,
  buildFieldRows,
} from '../hooks/useCartola'
import { useAuth } from '../hooks/useAuth'
import CartolaComparacao from '../components/CartolaComparacao'
import { LeaderboardSkeleton } from '../components/Skeleton'

const POSITION_COLORS = {
  GK:  'text-yellow-400 bg-yellow-500/10',
  DEF: 'text-blue-400 bg-blue-500/10',
  MID: 'text-emerald-400 bg-emerald-500/10',
  FWD: 'text-red-400 bg-red-500/10',
}

function Medal({ position }) {
  if (position === 1) return <span className="text-xl">🥇</span>
  if (position === 2) return <span className="text-xl">🥈</span>
  if (position === 3) return <span className="text-xl">🥉</span>
  return <span className="text-sm font-bold text-gray-500">#{position}</span>
}

function UserTeamModal({ userId, username, roundId, onClose }) {
  const { data: team } = useRoundTeam(userId, roundId)
  const rows = team ? buildFieldRows(team.formation) : []

  const playerMap = {}
  ;(team?.cartola_team_players ?? []).forEach(tp => {
    playerMap[tp.position_slot] = tp
  })

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed z-50 inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[420px] bg-gray-900 rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <h3 className="text-white font-bold">Time de {username}</h3>
            <p className="text-gray-500 text-xs mt-0.5">
              {team ? `Formação ${team.formation} · ${team.total_points.toFixed(1)} pts` : 'Carregando...'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {!team ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ul className="divide-y divide-gray-800/60">
              {Object.values(playerMap).map(tp => {
                const p = tp.cartola_players
                if (!p) return null
                const posColor = POSITION_COLORS[p.position] ?? ''
                const initials = p.name.split(' ').map(n => n[0]).slice(0, 2).join('')
                const imgUrl   = p.api_player_id
                  ? `https://images.fotmob.com/image_resources/playerimages/${p.api_player_id}.png`
                  : null

                return (
                  <li key={tp.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold shrink-0 ${posColor}`}>
                      {imgUrl ? (
                        <img src={imgUrl} alt={p.name} className="w-full h-full object-cover"
                          onError={e => { e.currentTarget.style.display='none'; e.currentTarget.nextSibling.style.display='flex' }} />
                      ) : null}
                      <span className={imgUrl ? 'hidden' : 'flex'}>{initials}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white text-sm font-medium truncate">{p.name}</span>
                        {tp.is_captain && (
                          <span className="shrink-0 w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center">
                            <span className="text-white text-[9px] font-black">C</span>
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 text-xs">{p.team_name}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${posColor}`}>
                        {p.position}
                      </span>
                      <p className="text-gray-500 text-xs mt-0.5">C$ {p.price.toFixed(1)}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}

export default function CartolaRanking() {
  const { user } = useAuth()
  const { data: rounds = [] }       = useCartolaRounds()
  const [selectedRound, setSelectedRound] = useState(null)
  const [viewingTeam,   setViewingTeam]   = useState(null) // { userId, username }

  const { data: totalLeaderboard = [], isLoading: totalLoading, refetch: refetchTotal }
    = useCartolaLeaderboard()

  const { data: roundLeaderboard = [], isLoading: roundLoading, refetch: refetchRound }
    = useRoundLeaderboard(selectedRound)

  const isRoundMode  = !!selectedRound
  const leaderboard  = isRoundMode ? roundLeaderboard : totalLeaderboard
  const isLoading    = isRoundMode ? roundLoading : totalLoading
  const refetch      = isRoundMode ? refetchRound : refetchTotal

  const myEntry = leaderboard.find(e => e.user_id === user?.id)

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Ranking Cartola</h1>
          <p className="text-gray-500 text-xs mt-0.5">
            {isRoundMode ? 'Pontuação da rodada' : 'Pontuação total acumulada'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-500 hover:text-emerald-400 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link to="/cartola" className="text-xs text-emerald-400 font-semibold hover:text-emerald-300 transition-colors">
            Meu time →
          </Link>
        </div>
      </div>

      {/* Filtro por rodada */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setSelectedRound(null)}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            !selectedRound ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          Geral
        </button>
        {rounds.map(r => (
          <button
            key={r.id}
            onClick={() => setSelectedRound(r.id)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedRound === r.id ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {r.name.split('—')[0].trim()}
          </button>
        ))}
      </div>

      {/* Minha posição */}
      {myEntry && (
        <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-2xl p-4 mb-5">
          <p className="text-emerald-500 text-xs font-semibold mb-2">SUA POSIÇÃO</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Medal position={myEntry.position} />
              <div>
                <p className="text-white font-bold">{myEntry.username ?? 'Você'}</p>
                <p className="text-gray-500 text-xs">
                  {isRoundMode ? 'Pontos na rodada' : 'Pontos totais'}
                </p>
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-400">
              {parseFloat(isRoundMode ? myEntry.round_points ?? myEntry.total_points : myEntry.total_points ?? 0).toFixed(1)}
            </p>
          </div>
        </div>
      )}

      {/* Comparação com o líder (apenas modo rodada) */}
      {selectedRound && leaderboard.length > 1 && (
        <CartolaComparacao leaderboard={leaderboard} roundId={selectedRound} />
      )}

      {/* Tabela */}
      <div className="space-y-2">
        {isLoading ? (
          <LeaderboardSkeleton rows={5} />
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">⚽</p>
            <p className="text-gray-400 font-semibold">Nenhum time escalado ainda</p>
            <p className="text-gray-600 text-sm mt-1">Seja o primeiro a montar seu Cartola!</p>
            <Link to="/cartola" className="inline-block mt-4 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-500 transition-colors">
              Montar time
            </Link>
          </div>
        ) : (
          leaderboard.map((entry, idx) => {
            const pts      = isRoundMode ? (entry.round_points ?? entry.total_points ?? 0) : (entry.total_points ?? 0)
            const isMe     = entry.user_id === user?.id
            const initials = (entry.username ?? '?')[0].toUpperCase()

            return (
              <button
                key={entry.user_id}
                onClick={() => selectedRound && setViewingTeam({ userId: entry.user_id, username: entry.username ?? 'Anônimo' })}
                className={`
                  w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left
                  ${isMe
                    ? 'bg-emerald-900/20 border-emerald-700/40 hover:bg-emerald-900/30'
                    : 'bg-gray-900 border-gray-800 hover:bg-gray-800/60'}
                  ${selectedRound ? 'cursor-pointer' : 'cursor-default'}
                `}
              >
                {/* Posição */}
                <div className="w-8 flex items-center justify-center shrink-0">
                  <Medal position={entry.position} />
                </div>

                {/* Avatar */}
                {entry.avatar_url ? (
                  <img src={entry.avatar_url} alt={entry.username} className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isMe ? 'bg-emerald-700 text-white' : 'bg-gray-800 text-gray-400'}`}>
                    {initials}
                  </div>
                )}

                {/* Nome */}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate text-sm ${isMe ? 'text-white' : 'text-gray-200'}`}>
                    {entry.username ?? 'Anônimo'}
                    {isMe && <span className="ml-1.5 text-[10px] text-emerald-400 font-bold">você</span>}
                  </p>
                  {selectedRound && (
                    <p className="text-gray-500 text-xs">clique para ver o time</p>
                  )}
                </div>

                {/* Pontos */}
                <div className="text-right shrink-0">
                  <p className={`text-lg font-black ${isMe ? 'text-emerald-400' : 'text-white'}`}>
                    {parseFloat(pts).toFixed(1)}
                  </p>
                  <p className="text-gray-600 text-xs">pts</p>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Sistema de pontuação */}
      <div className="mt-8 p-4 bg-gray-900 border border-gray-800 rounded-xl">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Pontuação do Cartola</h3>
        <ul className="space-y-1.5 text-xs text-gray-500">
          <li className="flex justify-between"><span>Gol (atacante/meia)</span><span className="text-emerald-400 font-semibold">+8 pts</span></li>
          <li className="flex justify-between"><span>Gol (zagueiro/lateral)</span><span className="text-emerald-400 font-semibold">+12 pts</span></li>
          <li className="flex justify-between"><span>Gol (goleiro)</span><span className="text-emerald-400 font-semibold">+15 pts</span></li>
          <li className="flex justify-between"><span>Assistência</span><span className="text-emerald-400 font-semibold">+5 pts</span></li>
          <li className="flex justify-between"><span>Clean sheet (goleiro)</span><span className="text-emerald-400 font-semibold">+5 pts</span></li>
          <li className="flex justify-between"><span>Clean sheet (zagueiro/lateral)</span><span className="text-emerald-400 font-semibold">+3 pts</span></li>
          <li className="flex justify-between"><span>Pênalti defendido</span><span className="text-emerald-400 font-semibold">+7 pts</span></li>
          <li className="flex justify-between"><span>Cartão amarelo</span><span className="text-red-400 font-semibold">-2 pts</span></li>
          <li className="flex justify-between"><span>Cartão vermelho</span><span className="text-red-400 font-semibold">-5 pts</span></li>
          <li className="flex justify-between"><span>Gol contra</span><span className="text-red-400 font-semibold">-4 pts</span></li>
          <li className="flex justify-between border-t border-gray-800 pt-1.5 mt-1.5">
            <span className="text-orange-400 font-medium">Capitão</span>
            <span className="text-orange-400 font-semibold">× 2</span>
          </li>
        </ul>
      </div>

      {/* Modal time do usuário */}
      {viewingTeam && selectedRound && (
        <UserTeamModal
          userId={viewingTeam.userId}
          username={viewingTeam.username}
          roundId={selectedRound}
          onClose={() => setViewingTeam(null)}
        />
      )}
    </div>
  )
}
