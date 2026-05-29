import { useState } from 'react'
import { Search, RefreshCw, Radio } from 'lucide-react'
import MatchCard from '../components/MatchCard'
import { useMatches } from '../hooks/useMatches'

const TABS = [
  { key: 'all',      label: 'Todos'       },
  { key: 'live',     label: 'Ao Vivo'     },
  { key: 'upcoming', label: 'Próximos'    },
  { key: 'finished', label: 'Encerrados'  },
]

export default function Jogos() {
  const [tab, setTab]       = useState('all')
  const [search, setSearch] = useState('')
  const { matches, liveMatches, upcomingMatches, finishedMatches, isLoading, refetch } = useMatches()

  const listMap = {
    all:      matches,
    live:     liveMatches,
    upcoming: upcomingMatches,
    finished: finishedMatches,
  }

  const filtered = (listMap[tab] ?? matches).filter(m => {
    if (!search) return true
    const q = search.toLowerCase()
    return m.home_team.toLowerCase().includes(q) || m.away_team.toLowerCase().includes(q)
  })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Jogos</h1>
          <p className="text-gray-500 text-sm mt-0.5">Copa do Mundo 2026</p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 text-gray-500 hover:text-emerald-400 hover:bg-gray-800 rounded-lg transition-colors"
          title="Atualizar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Live indicator */}
      {liveMatches.length > 0 && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-red-900/20 border border-red-800/40 rounded-xl">
          <Radio className="w-4 h-4 text-red-400 animate-pulse" />
          <p className="text-red-400 text-sm font-semibold">
            {liveMatches.length} jogo{liveMatches.length > 1 ? 's' : ''} ao vivo agora
          </p>
        </div>
      )}

      {/* Busca */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Buscar time..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-emerald-600 transition-colors"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6 overflow-x-auto">
        {TABS.map(({ key, label }) => {
          const count = listMap[key]?.length
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 min-w-fit whitespace-nowrap flex items-center justify-center gap-1.5 py-2 px-3 text-sm font-semibold rounded-lg transition-all ${
                tab === key
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  tab === key ? 'bg-white/20 text-white' : 'bg-gray-800 text-gray-500'
                }`}>
                  {count}
                </span>
              )}
              {key === 'live' && liveMatches.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
          )
        })}
      </div>

      {/* Lista de partidas */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-900 rounded-xl animate-pulse border border-gray-800" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">⚽</p>
          <p className="text-gray-400 text-lg font-semibold">Nenhum jogo encontrado</p>
          <p className="text-gray-600 text-sm mt-2">
            {matches.length === 0
              ? 'Os jogos serão carregados em breve.'
              : 'Tente outro filtro ou busca.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(match => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  )
}
