import { useState, useMemo } from 'react'
import { Search, RefreshCw, Radio, ChevronDown, ChevronUp } from 'lucide-react'
import MatchCard from '../components/MatchCard'
import { MatchCardSkeleton, RoundHeaderSkeleton } from '../components/Skeleton'
import { useMatches } from '../hooks/useMatches'
import { LIVE_STATUSES, FINISHED_STATUSES } from '../lib/api-football'

// Definição das fases da Copa 2026
const PHASES = [
  { label: 'Rodada 1 — Fase de Grupos', from: '2026-06-11', to: '2026-06-18', emoji: '⚽' },
  { label: 'Rodada 2 — Fase de Grupos', from: '2026-06-19', to: '2026-06-25', emoji: '⚽' },
  { label: 'Rodada 3 — Fase de Grupos', from: '2026-06-26', to: '2026-07-02', emoji: '⚽' },
  { label: 'Oitavas de Final',           from: '2026-07-03', to: '2026-07-06', emoji: '🏆' },
  { label: 'Quartas de Final',           from: '2026-07-07', to: '2026-07-08', emoji: '🏆' },
  { label: 'Semifinal',                  from: '2026-07-14', to: '2026-07-15', emoji: '🏆' },
  { label: 'Final',                      from: '2026-07-19', to: '2026-07-19', emoji: '🥇' },
]

const TABS = [
  { key: 'all',      label: 'Todos'      },
  { key: 'live',     label: 'Ao Vivo'    },
  { key: 'upcoming', label: 'Próximos'   },
  { key: 'finished', label: 'Encerrados' },
]

function phaseOf(matchDate) {
  const d = new Date(matchDate)
  for (const p of PHASES) {
    if (d >= new Date(p.from) && d <= new Date(p.to + 'T23:59:59Z')) return p.label
  }
  return 'Outros'
}

// ── Cabeçalho colapsável de cada rodada ─────────────────────────────

function RoundHeader({ phase, matches, isOpen, onToggle }) {
  const live     = matches.filter(m => LIVE_STATUSES.includes(m.status)).length
  const finished = matches.filter(m => FINISHED_STATUSES.includes(m.status)).length
  const upcoming = matches.filter(m => m.status === 'NS').length
  const allDone  = finished === matches.length

  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3.5 bg-gray-900 border border-gray-800 rounded-2xl hover:border-gray-700 transition-all group"
    >
      {/* Emoji */}
      <span className="text-lg shrink-0">{phase.emoji}</span>

      {/* Nome + stats */}
      <div className="flex-1 text-left min-w-0">
        <p className="text-white font-bold text-sm truncate">{phase.label}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-gray-500 text-xs">{matches.length} jogos</span>
          {live > 0 && (
            <span className="flex items-center gap-1 text-red-400 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              {live} ao vivo
            </span>
          )}
          {finished > 0 && (
            <span className="text-emerald-500 text-xs">✓ {finished}</span>
          )}
          {upcoming > 0 && (
            <span className="text-gray-500 text-xs">⏳ {upcoming}</span>
          )}
        </div>
      </div>

      {/* Badge status geral */}
      {allDone && (
        <span className="shrink-0 text-[10px] font-bold bg-gray-800 text-gray-500 px-2 py-1 rounded-full">
          Encerrada
        </span>
      )}
      {live > 0 && (
        <span className="shrink-0 text-[10px] font-bold bg-red-900/50 text-red-400 px-2 py-1 rounded-full border border-red-800/40">
          Ao vivo
        </span>
      )}

      {/* Chevron */}
      <span className="shrink-0 text-gray-500 group-hover:text-gray-300 transition-colors">
        {isOpen
          ? <ChevronUp className="w-4 h-4" />
          : <ChevronDown className="w-4 h-4" />}
      </span>
    </button>
  )
}

// ── Página principal ─────────────────────────────────────────────────

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

  // Filtra por busca
  const filtered = useMemo(() => {
    return (listMap[tab] ?? matches).filter(m => {
      if (!search) return true
      const q = search.toLowerCase()
      return m.home_team?.toLowerCase().includes(q) || m.away_team?.toLowerCase().includes(q)
    })
  }, [tab, search, matches, liveMatches, upcomingMatches, finishedMatches])

  // Agrupa por fase
  const grouped = useMemo(() => {
    const map = {}
    for (const m of filtered) {
      const label = phaseOf(m.match_date)
      if (!map[label]) map[label] = []
      map[label].push(m)
    }
    // Mantém a ordem de PHASES
    const order = [...PHASES.map(p => p.label), 'Outros']
    return order
      .filter(label => map[label]?.length > 0)
      .map(label => ({
        phase: PHASES.find(p => p.label === label) ?? { label, emoji: '📅' },
        matches: map[label],
      }))
  }, [filtered])

  // Abre por padrão: rodadas com jogos ao vivo ou próximos
  const defaultOpen = useMemo(() => {
    const open = new Set()
    for (const { phase, matches: ms } of grouped) {
      const hasLive     = ms.some(m => LIVE_STATUSES.includes(m.status))
      const hasUpcoming = ms.some(m => m.status === 'NS')
      if (hasLive || hasUpcoming) open.add(phase.label)
    }
    // Se nenhuma aberta (ex: tudo encerrado), abre a última
    if (open.size === 0 && grouped.length > 0) {
      open.add(grouped[grouped.length - 1].phase.label)
    }
    return open
  }, [grouped])

  const [openRounds, setOpenRounds] = useState(null) // null = usa defaultOpen

  const effectiveOpen = openRounds ?? defaultOpen

  function toggleRound(label) {
    const next = new Set(effectiveOpen)
    if (next.has(label)) next.delete(label)
    else next.add(label)
    setOpenRounds(next)
  }

  // Flat list para tabs Live/Upcoming/Finished (sem agrupamento)
  const showGrouped = tab === 'all'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Jogos</h1>
          <p className="text-gray-500 text-sm mt-0.5">Bolão da Gangue 🤙</p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 text-gray-500 hover:text-emerald-400 hover:bg-gray-800 rounded-lg transition-colors"
          title="Atualizar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Ao vivo banner */}
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
                tab === key ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
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

      {/* Conteúdo */}
      {isLoading ? (
        <div className="space-y-3">
          <RoundHeaderSkeleton />
          <div className="space-y-2 pl-2 border-l-2 border-gray-800 ml-4">
            {Array.from({ length: 3 }).map((_, i) => <MatchCardSkeleton key={i} />)}
          </div>
          <RoundHeaderSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">⚽</p>
          <p className="text-gray-400 text-lg font-semibold">Nenhum jogo encontrado</p>
          <p className="text-gray-600 text-sm mt-2">
            {matches.length === 0 ? 'Os jogos serão carregados em breve.' : 'Tente outro filtro ou busca.'}
          </p>
        </div>
      ) : showGrouped ? (
        /* Agrupado por rodada (aba Todos) */
        <div className="space-y-3">
          {grouped.map(({ phase, matches: ms }) => {
            const isOpen = effectiveOpen.has(phase.label)
            return (
              <div key={phase.label}>
                <RoundHeader
                  phase={phase}
                  matches={ms}
                  isOpen={isOpen}
                  onToggle={() => toggleRound(phase.label)}
                />
                {isOpen && (
                  <div className="mt-2 space-y-2 pl-2 border-l-2 border-gray-800 ml-4">
                    {ms.map(match => (
                      <MatchCard key={match.id} match={match} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* Lista flat para outras abas */
        <div className="space-y-3">
          {filtered.map(match => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  )
}
