import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useMatch } from '../hooks/useMatches'
import { useMatchBets, usePlaceBet } from '../hooks/useBets'
import BetCard from '../components/BetCard'
import { BET_TYPE_LABELS, BET_TYPE_ICONS, formatOdd } from '../lib/odds'
import { LIVE_STATUSES, FINISHED_STATUSES, STATUS_LABELS } from '../lib/api-football'

const TYPE_ORDER = ['winner', 'exact_score', 'goalscorer', 'total_goals', 'total_yellows', 'yellow_card', 'red_card']

function groupByType(betOptions) {
  const groups = {}
  for (const opt of betOptions) {
    if (!groups[opt.type]) groups[opt.type] = []
    groups[opt.type].push(opt)
  }
  return groups
}

// Modal de confirmação
function ConfirmModal({ option, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in">
        <p className="text-center text-2xl mb-3">{BET_TYPE_ICONS[option.type] ?? '🎲'}</p>
        <h3 className="text-white font-bold text-lg text-center mb-1">Confirmar palpite</h3>
        <p className="text-gray-400 text-sm text-center mb-5">
          {option.description}
        </p>

        <div className="bg-gray-800 rounded-xl p-4 mb-5 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Pontos apostados</span>
            <span className="text-white font-semibold">1 pt</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Odd</span>
            <span className="text-emerald-400 font-semibold">{formatOdd(option.odd)}</span>
          </div>
          <div className="h-px bg-gray-700" />
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Ganho potencial</span>
            <span className="text-emerald-300 font-bold">+{(1 * option.odd).toFixed(2)} pts</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 border border-gray-700 text-gray-300 rounded-xl font-semibold text-sm hover:border-gray-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-60"
          >
            {loading ? 'Aguarde...' : 'Apostar!'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Palpite() {
  const { matchId }    = useParams()
  const navigate       = useNavigate()
  const { match, betOptions, isLoading } = useMatch(matchId)
  const { data: betsData } = useMatchBets(matchId)
  const placeBet       = usePlaceBet()

  const [pendingOption, setPendingOption] = useState(null)
  const [successMsg, setSuccessMsg]       = useState('')
  const [activeTab, setActiveTab]         = useState(null)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-40 bg-gray-900 rounded-2xl animate-pulse" />
        <div className="h-64 bg-gray-900 rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (!match) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Partida não encontrada.</p>
      </div>
    )
  }

  const betMap      = betsData?.betMap ?? {}
  const matchStarted = LIVE_STATUSES.includes(match.status) || FINISHED_STATUSES.includes(match.status)
  const grouped     = groupByType(betOptions)
  const availableTypes = TYPE_ORDER.filter(t => grouped[t])
  const currentTab  = activeTab ?? availableTypes[0]

  const matchDate   = new Date(match.match_date)
  const statusInfo  = STATUS_LABELS[match.status] ?? { label: match.status, color: 'gray' }

  const handleConfirm = async () => {
    if (!pendingOption) return
    try {
      await placeBet.mutateAsync({ betOptionId: pendingOption.id, matchId })
      setSuccessMsg(`Palpite feito: ${pendingOption.description}`)
      setPendingOption(null)
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      alert(`Erro ao fazer palpite: ${err.message}`)
      setPendingOption(null)
    }
  }

  return (
    <div>
      {/* Voltar */}
      <button
        onClick={() => navigate('/jogos')}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar aos jogos
      </button>

      {/* Header da partida */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
            LIVE_STATUSES.includes(match.status)
              ? 'bg-red-500/20 text-red-400'
              : FINISHED_STATUSES.includes(match.status)
              ? 'bg-gray-700 text-gray-400'
              : 'bg-emerald-500/20 text-emerald-400'
          }`}>
            {statusInfo.label}
          </span>
          {match.round && <span className="text-xs text-gray-500">{match.round}</span>}
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 flex flex-col items-center gap-2">
            {match.home_team_logo && (
              <img src={match.home_team_logo} alt={match.home_team} className="w-14 h-14 object-contain" />
            )}
            <span className="text-white font-bold text-center">{match.home_team}</span>
          </div>

          <div className="text-center">
            {(LIVE_STATUSES.includes(match.status) || FINISHED_STATUSES.includes(match.status)) && match.score_home !== null ? (
              <div className="text-4xl font-black text-white">
                {match.score_home} <span className="text-gray-600">×</span> {match.score_away}
              </div>
            ) : (
              <>
                <div className="text-2xl font-black text-white">
                  {format(matchDate, 'HH:mm')}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {format(matchDate, "dd/MM/yyyy")}
                </div>
              </>
            )}
          </div>

          <div className="flex-1 flex flex-col items-center gap-2">
            {match.away_team_logo && (
              <img src={match.away_team_logo} alt={match.away_team} className="w-14 h-14 object-contain" />
            )}
            <span className="text-white font-bold text-center">{match.away_team}</span>
          </div>
        </div>
      </div>

      {/* Aviso se jogo iniciado */}
      {matchStarted && (
        <div className="flex items-center gap-3 p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-xl mb-6">
          <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
          <div>
            <p className="text-yellow-400 font-semibold text-sm">Palpites encerrados</p>
            <p className="text-yellow-700 text-xs">O jogo já iniciou. Você pode ver seus palpites abaixo.</p>
          </div>
        </div>
      )}

      {/* Sucesso */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-900/30 border border-emerald-700/40 rounded-xl mb-4 animate-slide-up">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-emerald-300 text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {/* Nenhuma opção */}
      {betOptions.length === 0 ? (
        <div className="text-center py-16 bg-gray-900 rounded-2xl border border-gray-800">
          <p className="text-4xl mb-3">⏳</p>
          <p className="text-gray-400 font-semibold">Opções em breve</p>
          <p className="text-gray-600 text-sm mt-1">
            As opções de palpite são geradas antes do jogo.
          </p>
        </div>
      ) : (
        <>
          {/* Tabs por tipo */}
          <div className="flex gap-1 overflow-x-auto pb-1 mb-4 scrollbar-hide">
            {availableTypes.map(type => (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  currentTab === type
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                <span>{BET_TYPE_ICONS[type]}</span>
                {BET_TYPE_LABELS[type]}
                <span className={`text-xs px-1 rounded-full ${
                  currentTab === type ? 'bg-white/20' : 'bg-gray-700 text-gray-500'
                }`}>
                  {grouped[type]?.length}
                </span>
              </button>
            ))}
          </div>

          {/* Grid de opções */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(grouped[currentTab] ?? []).map(option => (
              <BetCard
                key={option.id}
                option={option}
                existingBet={betMap[option.id]}
                onBet={setPendingOption}
                disabled={placeBet.isPending}
                matchStarted={matchStarted}
              />
            ))}
          </div>
        </>
      )}

      {/* Modal de confirmação */}
      {pendingOption && (
        <ConfirmModal
          option={pendingOption}
          onConfirm={handleConfirm}
          onCancel={() => setPendingOption(null)}
          loading={placeBet.isPending}
        />
      )}
    </div>
  )
}
