import { RefreshCw, Wifi, ClipboardList } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLeaderboard } from '../hooks/useLeaderboard'
import LeaderboardTable from '../components/LeaderboardTable'
import { useAuth } from '../hooks/useAuth'

export default function Ranking() {
  const { leaderboard, isLoading, refetch, dataUpdatedAt } = useLeaderboard()
  const { user } = useAuth()

  const myRank = leaderboard.find(e => e.user_id === user?.id)

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
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

      {/* Link histórico */}
      <Link
        to="/historico"
        className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl mb-4 hover:border-gray-700 transition-colors group"
      >
        <ClipboardList className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 transition-colors" />
        <span className="text-sm text-gray-400 group-hover:text-white transition-colors">Meu histórico de palpites</span>
        <span className="ml-auto text-gray-600 text-xs group-hover:text-emerald-400 transition-colors">→</span>
      </Link>

      {/* Minha posição (destaque) */}
      {myRank && (
        <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-2xl p-4 mb-6">
          <p className="text-emerald-500 text-xs font-semibold mb-2">SUA POSIÇÃO</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">
                {myRank.position === 1 ? '🥇' : myRank.position === 2 ? '🥈' : myRank.position === 3 ? '🥉' : `#${myRank.position}`}
              </span>
              <div>
                <p className="text-white font-bold">{myRank.username}</p>
                <p className="text-gray-500 text-xs">
                  {myRank.total_wins ?? 0} acertos de {myRank.total_bets ?? 0} palpites
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-emerald-400">
                {parseFloat(myRank.total_points ?? 0).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">pontos</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabela do ranking */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Classificação geral
          </h2>
          <span className="text-xs text-gray-600">{leaderboard.length} participantes</span>
        </div>
        <LeaderboardTable leaderboard={leaderboard} isLoading={isLoading} />
      </div>

      {/* Regras */}
      <div className="mt-8 p-4 bg-gray-900 border border-gray-800 rounded-xl">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Como funciona a pontuação</h3>
        <ul className="space-y-2 text-xs text-gray-500">
          <li className="flex gap-2"><span>•</span><span>Cada palpite custa 1 ponto</span></li>
          <li className="flex gap-2"><span>•</span><span>Se acertar: você ganha 1 × odd (ex: odd 3.5 = 3.5 pts)</span></li>
          <li className="flex gap-2"><span>•</span><span>Se errar: perde o ponto apostado</span></li>
          <li className="flex gap-2"><span>•</span><span>Todos começam com saldo zerado</span></li>
          <li className="flex gap-2"><span>•</span><span>Vence quem acumular mais pontos ao final da Copa</span></li>
        </ul>
      </div>
    </div>
  )
}
