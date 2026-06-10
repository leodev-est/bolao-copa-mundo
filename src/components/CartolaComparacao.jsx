import { useMemo } from 'react'
import { useRoundTeam } from '../hooks/useCartola'
import { useAuth } from '../hooks/useAuth'

const POSITION_COLORS = {
  GK:  'text-yellow-400 bg-yellow-500/10',
  DEF: 'text-blue-400 bg-blue-500/10',
  MID: 'text-emerald-400 bg-emerald-500/10',
  FWD: 'text-red-400 bg-red-500/10',
}

export default function CartolaComparacao({ leaderboard, roundId }) {
  const { user } = useAuth()

  const leader  = useMemo(() => leaderboard.find(e => e.user_id !== user?.id), [leaderboard, user])
  const myEntry = useMemo(() => leaderboard.find(e => e.user_id === user?.id), [leaderboard, user])

  const { data: leaderTeam } = useRoundTeam(leader?.user_id, roundId)
  const { data: myTeam }     = useRoundTeam(user?.id, roundId)

  const comparison = useMemo(() => {
    if (!leaderTeam || !myTeam) return null

    const leaderPlayers = Object.fromEntries(
      (leaderTeam.cartola_team_players ?? []).map(tp => [tp.player_id, tp.cartola_players])
    )
    const myPlayers = Object.fromEntries(
      (myTeam.cartola_team_players ?? []).map(tp => [tp.player_id, tp.cartola_players])
    )

    const leaderIds = new Set(Object.keys(leaderPlayers))
    const myIds     = new Set(Object.keys(myPlayers))

    const commonIds   = [...myIds].filter(id => leaderIds.has(id))
    const onlyMyIds   = [...myIds].filter(id => !leaderIds.has(id))
    const onlyLeadIds = [...leaderIds].filter(id => !myIds.has(id))

    return {
      common:    commonIds.map(id => myPlayers[id]).filter(Boolean),
      onlyMine:  onlyMyIds.map(id => myPlayers[id]).filter(Boolean),
      onlyLead:  onlyLeadIds.map(id => leaderPlayers[id]).filter(Boolean),
      pct:       Math.round((commonIds.length / 11) * 100),
    }
  }, [leaderTeam, myTeam])

  if (!leader || !myEntry || leader.user_id === user?.id) return null
  if (!leaderTeam || !myTeam || !comparison) return null

  function PlayerChip({ player }) {
    if (!player) return null
    const color = POSITION_COLORS[player.position] ?? ''
    return (
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${color} bg-opacity-60`}>
        <span className={`text-[10px] font-bold shrink-0 ${color.split(' ')[0]}`}>{player.position}</span>
        <span className="text-xs text-gray-200 truncate max-w-[90px]">{player.name.split(' ').slice(-1)[0]}</span>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Comparação com o líder
        </p>
        <span className="text-xs text-gray-500">{leader.username ?? '#1'}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center mb-4">
        <div className="bg-gray-800/60 rounded-xl p-2">
          <p className="text-xl font-black text-emerald-400">{comparison.common.length}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">em comum</p>
        </div>
        <div className="bg-gray-800/60 rounded-xl p-2">
          <p className="text-xl font-black text-white">{comparison.pct}%</p>
          <p className="text-[10px] text-gray-500 mt-0.5">overlap</p>
        </div>
        <div className="bg-gray-800/60 rounded-xl p-2">
          <p className="text-xl font-black text-yellow-400">{comparison.onlyMine.length}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">só meus</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${comparison.pct}%` }}
        />
      </div>

      {/* Player breakdown */}
      {comparison.onlyMine.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-semibold text-yellow-400 uppercase tracking-wider mb-1.5">
            Só no meu time
          </p>
          <div className="flex flex-wrap gap-1.5">
            {comparison.onlyMine.map(p => <PlayerChip key={p.id} player={p} />)}
          </div>
        </div>
      )}

      {comparison.onlyLead.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-1.5">
            Só no time do líder
          </p>
          <div className="flex flex-wrap gap-1.5">
            {comparison.onlyLead.map(p => <PlayerChip key={p.id} player={p} />)}
          </div>
        </div>
      )}
    </div>
  )
}
