import { useState } from 'react'
import { RefreshCw, Wifi, ClipboardList, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLeaderboard, useUnifiedLeaderboard } from '../hooks/useLeaderboard'
import { useCartolaLeaderboard } from '../hooks/useCartola'
import LeaderboardTable from '../components/LeaderboardTable'
import { LeaderboardSkeleton } from '../components/Skeleton'
import { useAuth } from '../hooks/useAuth'

const TABS = [
  { id: 'geral',   label: 'Geral'   },
  { id: 'bolao',   label: 'Bolão'   },
  { id: 'cartola', label: 'Cartola' },
]

function Medal({ position }) {
  if (position === 1) return <span className="text-xl">🥇</span>
  if (position === 2) return <span className="text-xl">🥈</span>
  if (position === 3) return <span className="text-xl">🥉</span>
  return <span className="text-gray-500 text-sm font-bold w-6 text-center">#{position}</span>
}

function Avatar({ entry, isMe }) {
  return entry.avatar_url ? (
    <img src={entry.avatar_url} alt={entry.username} className="w-9 h-9 rounded-full object-cover shrink-0" />
  ) : (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
      isMe ? 'bg-emerald-700 text-white' : 'bg-gray-800 text-gray-400'
    }`}>
      {(entry.username ?? '?')[0].toUpperCase()}
    </div>
  )
}

function UnifiedRow({ entry, isMe }) {
  const bolao   = parseFloat(entry.bolao_points   ?? 0)
  const cartola = parseFloat(entry.cartola_points ?? 0)
  const total   = parseFloat(entry.total_points   ?? 0)

  return (
    <div className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
      isMe ? 'bg-emerald-900/20 border-emerald-500/40' : 'bg-gray-900 border-gray-800'
    }`}>
      <div className="w-8 flex items-center justify-center shrink-0">
        <Medal position={Number(entry.position)} />
      </div>
      <Avatar entry={entry} isMe={isMe} />
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm truncate ${isMe ? 'text-emerald-300' : 'text-white'}`}>
          {entry.username ?? 'Anônimo'}
          {isMe && <span className="ml-1.5 text-[10px] text-emerald-500 font-normal">você</span>}
        </p>
        <p className="text-gray-600 text-xs mt-0.5">
          Bolão {bolao.toFixed(1)}
          <span className="mx-1 text-gray-700">·</span>
          Cartola {cartola.toFixed(1)}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-lg font-black ${isMe ? 'text-emerald-400' : 'text-white'}`}>
          {total.toFixed(1)}
        </p>
        <p className="text-xs text-gray-600">pts</p>
      </div>
    </div>
  )
}

function CartolaRow({ entry, isMe }) {
  const pts = parseFloat(entry.total_points ?? 0)
  return (
    <div className={`flex items-center gap-3 p-3.5 rounded-xl border ${
      isMe ? 'bg-emerald-900/20 border-emerald-500/40' : 'bg-gray-900 border-gray-800'
    }`}>
      <div className="w-8 flex items-center justify-center shrink-0">
        <Medal position={Number(entry.position)} />
      </div>
      <Avatar entry={entry} isMe={isMe} />
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm truncate ${isMe ? 'text-emerald-300' : 'text-white'}`}>
          {entry.username ?? 'Anônimo'}
          {isMe && <span className="ml-1.5 text-[10px] text-emerald-500 font-normal">você</span>}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-lg font-black ${isMe ? 'text-emerald-400' : 'text-white'}`}>
          {pts.toFixed(1)}
        </p>
        <p className="text-xs text-gray-600">pts</p>
      </div>
    </div>
  )
}

export default function Ranking() {
  const { user } = useAuth()
  const [tab, setTab] = useState('geral')

  const { leaderboard: unified,  isLoading: uLoading, refetch: uRefetch, dataUpdatedAt: uAt } = useUnifiedLeaderboard()
  const { leaderboard: bolao,    isLoading: bLoading, refetch: bRefetch, dataUpdatedAt: bAt } = useLeaderboard()
  const { data: cartola = [],    isLoading: cLoading, refetch: cRefetch }                     = useCartolaLeaderboard()

  const isLoading   = tab === 'geral' ? uLoading : tab === 'bolao' ? bLoading : cLoading
  const refetch     = tab === 'geral' ? uRefetch : tab === 'bolao' ? bRefetch : cRefetch
  const updatedAt   = tab === 'geral' ? uAt : tab === 'bolao' ? bAt : null

  const lastUpdated = updatedAt
    ? new Date(updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null

  const myUnified = unified.find(e => e.user_id === user?.id)
  const myBolao   = bolao.find(e => e.user_id === user?.id)
  const myCartola = cartola.find(e => e.user_id === user?.id)

  const myEntry = tab === 'geral' ? myUnified : tab === 'bolao' ? myBolao : myCartola

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black text-white">Ranking</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <Wifi className="w-3 h-3 text-emerald-500" />
            <p className="text-gray-500 text-xs">Atualiza em tempo real</p>
            {lastUpdated && <p className="text-gray-700 text-xs">· {lastUpdated}</p>}
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 text-gray-500 hover:text-emerald-400 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-5 bg-gray-900 border border-gray-800 rounded-xl p-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === t.id
                ? 'bg-emerald-600 text-white'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Link histórico (só no tab bolão) */}
      {tab === 'bolao' && (
        <Link
          to="/historico"
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl mb-4 hover:border-gray-700 transition-colors group"
        >
          <ClipboardList className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 transition-colors" />
          <span className="text-sm text-gray-400 group-hover:text-white transition-colors">Meu histórico de palpites</span>
          <span className="ml-auto text-gray-600 text-xs group-hover:text-emerald-400 transition-colors">→</span>
        </Link>
      )}

      {/* Link por rodada (só no tab cartola) */}
      {tab === 'cartola' && (
        <Link
          to="/cartola/ranking"
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl mb-4 hover:border-gray-700 transition-colors group"
        >
          <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 transition-colors" />
          <span className="text-sm text-gray-400 group-hover:text-white transition-colors">Ver por rodada · comparar times</span>
          <span className="ml-auto text-gray-600 text-xs group-hover:text-emerald-400 transition-colors">→</span>
        </Link>
      )}

      {/* Minha posição */}
      {myEntry && (
        <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-2xl p-4 mb-5">
          <p className="text-emerald-500 text-xs font-semibold mb-2">SUA POSIÇÃO</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">
                {myEntry.position === 1 ? '🥇' : myEntry.position === 2 ? '🥈' : myEntry.position === 3 ? '🥉' : `#${myEntry.position}`}
              </span>
              <div>
                <p className="text-white font-bold">{myEntry.username}</p>
                <p className="text-gray-500 text-xs">
                  {tab === 'geral' && (
                    <>Bolão {parseFloat(myEntry.bolao_points ?? 0).toFixed(1)} · Cartola {parseFloat(myEntry.cartola_points ?? 0).toFixed(1)}</>
                  )}
                  {tab === 'bolao' && (
                    <>{myEntry.total_wins ?? 0} acertos de {myEntry.total_bets ?? 0} palpites</>
                  )}
                  {tab === 'cartola' && 'pontos no Cartola'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-emerald-400">
                {parseFloat(myEntry.total_points ?? 0).toFixed(tab === 'bolao' ? 2 : 1)}
              </p>
              <p className="text-xs text-gray-500">pontos</p>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {tab === 'geral' ? 'Classificação geral' : tab === 'bolao' ? 'Bolão' : 'Cartola'}
          </h2>
          <span className="text-xs text-gray-700">
            {tab === 'geral' ? unified.length : tab === 'bolao' ? bolao.length : cartola.length} participantes
          </span>
        </div>

        {tab === 'geral' && (
          isLoading ? <LeaderboardSkeleton rows={6} /> : (
            <div className="space-y-2">
              {unified.map(e => (
                <UnifiedRow key={e.user_id} entry={e} isMe={e.user_id === user?.id} />
              ))}
            </div>
          )
        )}

        {tab === 'bolao' && (
          <LeaderboardTable leaderboard={bolao} isLoading={bLoading} />
        )}

        {tab === 'cartola' && (
          isLoading ? <LeaderboardSkeleton rows={6} /> : cartola.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-3">⚽</p>
              <p className="text-gray-400 font-semibold">Nenhum time escalado ainda</p>
              <Link to="/cartola" className="inline-block mt-3 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-500 transition-colors">
                Montar time
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {cartola.map(e => (
                <CartolaRow key={e.user_id} entry={e} isMe={e.user_id === user?.id} />
              ))}
            </div>
          )
        )}
      </div>

      {/* Regras (só no tab bolão) */}
      {tab === 'bolao' && (
        <div className="mt-6 p-4 bg-gray-900 border border-gray-800 rounded-xl">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Como funciona a pontuação</h3>
          <ul className="space-y-2 text-xs text-gray-500">
            <li className="flex gap-2"><span>•</span><span>Cada palpite custa 1 ponto</span></li>
            <li className="flex gap-2"><span>•</span><span>Se acertar: você ganha 1 × odd (ex: odd 3.5 = 3.5 pts)</span></li>
            <li className="flex gap-2"><span>•</span><span>Se errar: perde o ponto apostado</span></li>
            <li className="flex gap-2"><span>•</span><span>Todos começam com saldo zerado</span></li>
          </ul>
        </div>
      )}
    </div>
  )
}
