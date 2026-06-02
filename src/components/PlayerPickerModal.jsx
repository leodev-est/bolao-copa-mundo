import { useState, useMemo } from 'react'
import { X, Search, Star, ChevronDown, AlertTriangle } from 'lucide-react'
import { useCartolaPlayers } from '../hooks/useCartola'

const POSITION_LABELS = { GK: 'Goleiro', DEF: 'Defensor', MID: 'Meia', FWD: 'Atacante' }
const POSITION_COLORS = {
  GK:  'text-yellow-400 bg-yellow-500/10',
  DEF: 'text-blue-400 bg-blue-500/10',
  MID: 'text-emerald-400 bg-emerald-500/10',
  FWD: 'text-red-400 bg-red-500/10',
}

export default function PlayerPickerModal({
  slot,
  selectedPlayerIds = new Set(),
  teamCountMap = {},
  budget,
  onSelect,
  onClose,
}) {
  const [search, setSearch]   = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [sortBy, setSortBy]   = useState('avg_points')

  const { data: players = [], isLoading } = useCartolaPlayers({
    position: slot?.position,
    sortBy,
  })

  // Filtra localmente (search + team)
  const filtered = useMemo(() => {
    return players.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      if (teamFilter && p.team_name !== teamFilter) return false
      return true
    })
  }, [players, search, teamFilter])

  // Lista de times únicos para o filtro
  const teams = useMemo(() => {
    const s = new Set(players.map(p => p.team_name))
    return [...s].sort()
  }, [players])

  if (!slot) return null

  const posLabel = POSITION_LABELS[slot.position] ?? slot.position

  function isDisabled(player) {
    if (selectedPlayerIds.has(player.id)) return 'Já no time'
    if (!player.available) return 'Eliminado'
    if (player.price > budget) return 'Sem crédito'
    // Máximo 3 jogadores do mesmo time
    if ((teamCountMap[player.team_name] ?? 0) >= 3) return 'Máx. 3 por seleção'
    return null
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet — sobe da base no mobile, modal centralizado no desktop */}
      <div className="fixed z-50 bottom-0 inset-x-0 md:inset-x-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[480px] md:max-h-[80vh] bg-gray-900 md:rounded-2xl rounded-t-2xl flex flex-col max-h-[85vh] shadow-2xl border border-gray-700/50">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <h3 className="text-white font-bold text-base">Escolher {posLabel}</h3>
            <p className="text-gray-500 text-xs mt-0.5">
              Orçamento restante: <span className="text-emerald-400 font-semibold">C$ {budget.toFixed(1)}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filtros */}
        <div className="p-3 space-y-2 border-b border-gray-800">
          {/* Search */}
          <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-gray-500 shrink-0" />
            <input
              type="text"
              placeholder="Buscar jogador..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 outline-none"
              autoFocus
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-500 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {/* Filtro por seleção */}
            <div className="relative flex-1">
              <select
                value={teamFilter}
                onChange={e => setTeamFilter(e.target.value)}
                className="w-full appearance-none bg-gray-800 text-gray-300 text-xs rounded-xl px-3 py-2 pr-7 outline-none"
              >
                <option value="">Todas as seleções</option>
                {teams.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
            </div>

            {/* Ordenar */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="appearance-none bg-gray-800 text-gray-300 text-xs rounded-xl px-3 py-2 pr-7 outline-none"
              >
                <option value="avg_points">Média pts</option>
                <option value="price">Preço</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Lista de jogadores */}
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-500 py-12 text-sm">Nenhum jogador encontrado</p>
          ) : (
            <ul className="divide-y divide-gray-800/60">
              {filtered.map(player => {
                const disabledReason = isDisabled(player)
                const initials = player.name.split(' ').map(n => n[0]).slice(0, 2).join('')
                const imgUrl   = player.photo_url || player.team_flag || null
                const posColor = POSITION_COLORS[player.position] ?? ''

                return (
                  <li key={player.id}>
                    <button
                      onClick={() => !disabledReason && onSelect(slot, player)}
                      disabled={!!disabledReason}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                        ${disabledReason ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-800/60 cursor-pointer'}
                      `}
                    >
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold shrink-0 ${posColor}`}>
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={player.name}
                            className={`${player.photo_url ? 'w-full h-full object-cover' : 'w-6 h-6 object-contain'}`}
                            onError={e => { e.currentTarget.style.display='none'; e.currentTarget.nextSibling.style.display='flex' }}
                          />
                        ) : null}
                        <span style={{ display: imgUrl ? 'none' : 'flex' }}>{initials}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white text-sm font-medium truncate">{player.name}</span>
                          {!player.available && (
                            <span className="shrink-0 text-[9px] font-bold bg-red-900/60 text-red-400 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              eliminado
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-gray-500 text-xs truncate">{player.team_name}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${posColor}`}>
                            {player.position}
                          </span>
                        </div>
                      </div>

                      {/* Preço + média */}
                      <div className="text-right shrink-0">
                        <p className="text-emerald-400 font-bold text-sm">C$ {player.price.toFixed(1)}</p>
                        <p className="text-gray-500 text-xs">{player.avg_points.toFixed(1)} pts/rod</p>
                      </div>
                    </button>
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
