import { CheckCircle2, XCircle, Clock, Lock } from 'lucide-react'
import { BET_TYPE_ICONS, formatOdd } from '../lib/odds'

const STATUS_CONFIG = {
  won:     { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  lost:    { icon: XCircle,      color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30'         },
  pending: { icon: Clock,        color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/30'   },
}

export default function BetCard({ option, existingBet, onBet, disabled, matchStarted }) {
  const typeIcon = BET_TYPE_ICONS[option.type] ?? '🎲'
  const alreadyBet = !!existingBet
  const optionResult = option.result   // null | 'won' | 'lost'
  const betStatus = existingBet?.status ?? null

  const isLocked = matchStarted || alreadyBet || !!optionResult

  const btnLabel = () => {
    if (matchStarted) return 'Jogo iniciado'
    if (optionResult === 'won') return '✓ Resultado: ganhou'
    if (optionResult === 'lost') return '✗ Resultado: perdeu'
    if (alreadyBet && betStatus === 'pending') return 'Palpite feito'
    if (alreadyBet && betStatus === 'won')  return `+${existingBet.points_won?.toFixed(2)} pts`
    if (alreadyBet && betStatus === 'lost') return '0 pts'
    return `Apostar · ${formatOdd(option.odd)}`
  }

  const cardStyle = () => {
    if (alreadyBet && betStatus) {
      const cfg = STATUS_CONFIG[betStatus]
      return `${cfg.bg} border`
    }
    if (optionResult === 'won')  return 'bg-emerald-500/10 border border-emerald-500/30'
    if (optionResult === 'lost') return 'bg-gray-800/50 border border-gray-700 opacity-60'
    return 'bg-gray-800/60 border border-gray-700 hover:border-emerald-500/40 transition-colors'
  }

  const btnStyle = () => {
    if (!isLocked) return 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
    if (alreadyBet && betStatus === 'won') return 'bg-emerald-700/50 text-emerald-300 cursor-default'
    if (alreadyBet && betStatus === 'lost') return 'bg-red-900/30 text-red-400 cursor-default'
    if (alreadyBet) return 'bg-yellow-700/30 text-yellow-300 cursor-default'
    return 'bg-gray-700 text-gray-500 cursor-not-allowed'
  }

  return (
    <div className={`rounded-xl p-4 ${cardStyle()}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 flex-1">
          <span className="text-xl mt-0.5">{typeIcon}</span>
          <div>
            <p className="text-white text-sm font-medium leading-snug">{option.description}</p>
            <p className="text-gray-500 text-xs mt-0.5">odd {formatOdd(option.odd)}</p>
          </div>
        </div>

        <div className="shrink-0">
          {alreadyBet && betStatus && (
            (() => {
              const { icon: Icon, color } = STATUS_CONFIG[betStatus] ?? STATUS_CONFIG.pending
              return <Icon className={`w-5 h-5 ${color}`} />
            })()
          )}
          {!alreadyBet && matchStarted && <Lock className="w-4 h-4 text-gray-600" />}
        </div>
      </div>

      <button
        onClick={() => !isLocked && onBet(option)}
        disabled={isLocked || disabled}
        className={`mt-3 w-full py-2 px-4 rounded-lg text-sm font-semibold transition-all ${btnStyle()}`}
      >
        {btnLabel()}
      </button>

      {alreadyBet && betStatus === 'pending' && (
        <p className="text-center text-xs text-yellow-600 mt-1">
          Aguardando resultado · 1 pt apostado
        </p>
      )}
    </div>
  )
}
