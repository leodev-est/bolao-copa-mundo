import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { formatInTimeZone } from 'date-fns-tz'
import { ArrowLeft, CheckCircle2, AlertTriangle, Minus, Plus, ChevronDown, ChevronUp, TrendingUp, TrendingDown } from 'lucide-react'
import { useMatch } from '../hooks/useMatches'
import { useMainBet, useMatchBets, usePlaceMainBet, usePlaceBet } from '../hooks/useBets'
import BetCard from '../components/BetCard'
import ShareButton from '../components/ShareButton'
import { BET_TYPE_ICONS, formatOdd, calcExactScoreOdd, deriveResult } from '../lib/odds'
import { LIVE_STATUSES, FINISHED_STATUSES, STATUS_LABELS } from '../lib/api-football'

// ─── ScoreStepper ─────────────────────────────────────────────────────────────

function ScoreStepper({ value, onChange, disabled }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))}
        disabled={disabled || value === 0}
        className="w-11 h-11 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:scale-95">
        <Minus className="w-4 h-4" />
      </button>
      <span className="w-10 text-center text-3xl font-black text-white tabular-nums">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(9, value + 1))}
        disabled={disabled}
        className="w-11 h-11 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:scale-95">
        <Plus className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─── ResultBadge ──────────────────────────────────────────────────────────────

function ResultBadge({ result, homeName, awayName }) {
  if (!result) return null
  const cfg = {
    home:  { label: `${homeName} vence`, cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    draw:  { label: 'Empate',            cls: 'bg-gray-600/40 text-gray-300 border-gray-500/30' },
    away:  { label: `${awayName} vence`, cls: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  }[result]
  return <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>{cfg.label}</span>
}

// ─── PlayerList — estilo bet365 ───────────────────────────────────────────────

const POS = { G: 'GOL', D: 'DEF', M: 'MEI', F: 'ATA', GK: 'GOL', DEF: 'DEF', MID: 'MEI', FWD: 'ATA' }

function PlayerList({ players, maxSlots, selected, onChange, disabled }) {
  const [showSubs, setShowSubs] = useState(false)

  const starters = players.filter(p => p.starter !== false)
  const subs     = players.filter(p => p.starter === false)
  const visible  = showSubs ? players : starters

  const countOf = (player) =>
    selected.filter(s => s.player_id != null
      ? s.player_id === player.player_id
      : s.player_name === player.player_name
    ).length

  const totalSelected = selected.length

  const handleClick = (player) => {
    if (disabled) return
    const count = countOf(player)

    if (count > 0 && totalSelected >= maxSlots) {
      // Remove a última ocorrência desse jogador
      const idx = [...selected].reverse().findIndex(s =>
        s.player_id != null
          ? s.player_id === player.player_id
          : s.player_name === player.player_name
      )
      const realIdx = selected.length - 1 - idx
      onChange(selected.filter((_, i) => i !== realIdx))
    } else if (totalSelected < maxSlots) {
      onChange([...selected, { player_id: player.player_id, player_name: player.player_name }])
    }
  }

  if (players.length === 0) return (
    <p className="text-xs text-gray-600 italic py-2">Escalação disponível 1h antes do jogo.</p>
  )

  return (
    <div>
      <div className="space-y-1">
        {visible.map((player, i) => {
          const count   = countOf(player)
          const isSelected = count > 0
          const canAdd  = totalSelected < maxSlots
          const posLabel = POS[player.pos] ?? ''

          return (
            <button
              key={`${player.player_id ?? player.player_name}-${i}`}
              type="button"
              onClick={() => handleClick(player)}
              disabled={disabled || (!canAdd && count === 0)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all text-left ${
                isSelected
                  ? 'bg-emerald-900/40 border border-emerald-600/50'
                  : canAdd
                  ? 'bg-gray-800/60 border border-transparent hover:border-gray-700 hover:bg-gray-800'
                  : 'bg-gray-800/30 border border-transparent opacity-40 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[10px] font-bold text-gray-500 w-7 shrink-0 font-mono">{posLabel}</span>
                <span className={`text-sm truncate ${isSelected ? 'text-emerald-300 font-semibold' : 'text-gray-200'}`}>
                  {player.player_name}
                </span>
                {player.starter === false && (
                  <span className="text-[10px] text-gray-600 shrink-0">Reserva</span>
                )}
              </div>

              {isSelected ? (
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {count > 1 && (
                    <span className="text-xs bg-emerald-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                      {count}x
                    </span>
                  )}
                  <span className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">✓</span>
                </div>
              ) : (
                <span className="w-5 h-5 rounded-full border border-gray-600 shrink-0 ml-2" />
              )}
            </button>
          )
        })}
      </div>

      {subs.length > 0 && (
        <button
          type="button"
          onClick={() => setShowSubs(s => !s)}
          className="w-full flex items-center justify-center gap-1.5 mt-2 py-2 text-xs text-gray-500 hover:text-emerald-400 transition-colors"
        >
          {showSubs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {showSubs ? 'Ocultar reservas' : `Mostrar mais (${subs.length} reservas)`}
        </button>
      )}
    </div>
  )
}

// ─── ScorerSection ────────────────────────────────────────────────────────────

function ScorerSection({ scoreHome, scoreAway, homeName, awayName, homePlayers, awayPlayers, scorers, onChange, disabled, isOfficialLineup }) {
  if (scoreHome === 0 && scoreAway === 0) {
    return (
      <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-800 text-center">
        <p className="text-gray-600 text-sm">Placar 0×0 — sem artilheiros</p>
      </div>
    )
  }

  const homeSelected = scorers.filter(s => s.team === 'home')
  const awaySelected = scorers.filter(s => s.team === 'away')

  const updateHome = (newList) => {
    onChange([
      ...newList.map((p, i) => ({ ...p, team: 'home', slot_index: i })),
      ...awaySelected.map((p, i) => ({ ...p, team: 'away', slot_index: i })),
    ])
  }

  const updateAway = (newList) => {
    onChange([
      ...homeSelected.map((p, i) => ({ ...p, team: 'home', slot_index: i })),
      ...newList.map((p, i) => ({ ...p, team: 'away', slot_index: i })),
    ])
  }

  return (
    <div className="space-y-5">
      {/* Indicador de fonte da escalação */}
      {(homePlayers.length > 0 || awayPlayers.length > 0) && (
        <div className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg w-fit ${
          isOfficialLineup
            ? 'bg-emerald-900/30 text-emerald-400'
            : 'bg-yellow-900/30 text-yellow-500'
        }`}>
          <span>{isOfficialLineup ? '✓ Escalação oficial confirmada' : '⚠ Escalação prévia — pode estar incompleta'}</span>
        </div>
      )}

      {scoreHome > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-white">{homeName}</span>
            <span className="text-xs text-gray-500">
              {homeSelected.length}/{scoreHome} gol{scoreHome > 1 ? 's' : ''} selecionado{homeSelected.length !== 1 ? 's' : ''}
            </span>
          </div>
          <PlayerList
            players={homePlayers}
            maxSlots={scoreHome}
            selected={homeSelected}
            onChange={updateHome}
            disabled={disabled}
          />
        </div>
      )}

      {scoreAway > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-white">{awayName}</span>
            <span className="text-xs text-gray-500">
              {awaySelected.length}/{scoreAway} gol{scoreAway > 1 ? 's' : ''} selecionado{awaySelected.length !== 1 ? 's' : ''}
            </span>
          </div>
          <PlayerList
            players={awayPlayers}
            maxSlots={scoreAway}
            selected={awaySelected}
            onChange={updateAway}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  )
}

// ─── LiveBetFeedback ──────────────────────────────────────────────────────────

function LiveBetFeedback({ match, mainBet }) {
  if (!mainBet || match.score_home === null || match.score_home === undefined) return null
  if (!LIVE_STATUSES.includes(match.status)) return null

  const liveH  = match.score_home
  const liveA  = match.score_away
  const betH   = mainBet.score_home
  const betA   = mainBet.score_away
  const exact  = liveH === betH && liveA === betA
  const liveRes = deriveResult(liveH, liveA)
  const betRes  = deriveResult(betH, betA)
  const resultOk = liveRes === betRes

  if (exact) return (
    <div className="flex items-center gap-2 p-3 bg-emerald-900/30 border border-emerald-600/40 rounded-xl mb-4">
      <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
      <div>
        <p className="text-emerald-400 text-sm font-semibold">Palpite correto no momento!</p>
        <p className="text-emerald-600 text-xs mt-0.5">Placar ao vivo bate com seu palpite ({betH}×{betA})</p>
      </div>
    </div>
  )

  if (resultOk) return (
    <div className="flex items-center gap-2 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-xl mb-4">
      <TrendingUp className="w-4 h-4 text-yellow-400 shrink-0" />
      <div>
        <p className="text-yellow-400 text-sm font-semibold">Resultado certo, placar diferente</p>
        <p className="text-yellow-600 text-xs mt-0.5">Ao vivo {liveH}×{liveA} · Seu palpite {betH}×{betA}</p>
      </div>
    </div>
  )

  return (
    <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-700/30 rounded-xl mb-4">
      <TrendingDown className="w-4 h-4 text-red-400 shrink-0" />
      <div>
        <p className="text-red-400 text-sm font-semibold">Perdendo no momento</p>
        <p className="text-red-600 text-xs mt-0.5">Ao vivo {liveH}×{liveA} · Seu palpite {betH}×{betA}</p>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

const EXTRA_TYPES = ['total_goals', 'total_yellows']

export default function Palpite() {
  const { matchId }    = useParams()
  const navigate       = useNavigate()
  const { match, betOptions, matchPlayers, isLoading } = useMatch(matchId)
  const { data: mainBet }                = useMainBet(matchId)
  const { data: extraBetsData }          = useMatchBets(matchId)
  const placeMainBet  = usePlaceMainBet()
  const placeExtraBet = usePlaceBet()

  const [homeGoals, setHomeGoals] = useState(0)
  const [awayGoals, setAwayGoals] = useState(0)
  const [scorers,   setScorers]   = useState([])
  const [success,   setSuccess]   = useState('')

  // Carrega palpite existente
  useEffect(() => {
    if (mainBet) {
      setHomeGoals(mainBet.score_home ?? 0)
      setAwayGoals(mainBet.score_away ?? 0)
      setScorers((mainBet.bet_scorers ?? []).map(s => ({
        team:        s.team,
        slot_index:  s.slot_index,
        player_id:   s.player_id,
        player_name: s.player_name,
      })))
    }
  }, [mainBet])

  // Limpa scorers excedentes quando placar diminui
  useEffect(() => {
    setScorers(prev => {
      const home = prev.filter(s => s.team === 'home').slice(0, homeGoals)
      const away = prev.filter(s => s.team === 'away').slice(0, awayGoals)
      return [
        ...home.map((p, i) => ({ ...p, slot_index: i })),
        ...away.map((p, i) => ({ ...p, slot_index: i })),
      ]
    })
  }, [homeGoals, awayGoals])

  if (isLoading) return (
    <div className="space-y-4">
      <div className="h-40 bg-gray-900 rounded-2xl animate-pulse" />
      <div className="h-64 bg-gray-900 rounded-2xl animate-pulse" />
    </div>
  )

  if (!match) return <div className="text-center py-20 text-gray-400">Partida não encontrada.</div>

  // Trava no horário do kickoff, independente do sync ainda não ter rodado
  const matchStarted   = new Date() >= new Date(match.match_date)
                      || LIVE_STATUSES.includes(match.status)
                      || FINISHED_STATUSES.includes(match.status)
  const statusInfo     = STATUS_LABELS[match.status] ?? { label: match.status, color: 'gray' }
  const matchDate      = new Date(match.match_date)
  const predictedResult = deriveResult(homeGoals, awayGoals)
  const scoreOdd       = calcExactScoreOdd(homeGoals, awayGoals)
  const extraBetMap    = extraBetsData?.betMap ?? {}

  // Usa bet_options goalscorer se disponíveis; senão usa cartola_players como fallback
  const goalscorerOpts = betOptions.filter(o => o.type === 'goalscorer')
  const fromBetOptions = (team) =>
    goalscorerOpts
      .filter(o => o.metadata?.team === team)
      .sort((a, b) => (a.metadata?.starter === false ? 1 : 0) - (b.metadata?.starter === false ? 1 : 0))
      .map(o => ({ player_id: o.metadata.player_id, player_name: o.metadata.player_name, pos: o.metadata.pos ?? null, starter: o.metadata.starter ?? true }))
  const fromCartola = (team) =>
    matchPlayers
      .filter(p => p.team_name === team)
      .map(p => ({ player_id: p.api_player_id ?? null, player_name: p.name, pos: p.position, starter: true }))

  const homePlayers = goalscorerOpts.length > 0 ? fromBetOptions(match.home_team) : fromCartola(match.home_team)
  const awayPlayers = goalscorerOpts.length > 0 ? fromBetOptions(match.away_team) : fromCartola(match.away_team)

  const extraOptions = betOptions.filter(o => EXTRA_TYPES.includes(o.type))

  // slot_index global: away começa após slots do home para evitar conflito de UNIQUE
  const scorersWithGlobalIdx = [
    ...scorers.filter(s => s.team === 'home').map((s, i) => ({ ...s, slot_index: i })),
    ...scorers.filter(s => s.team === 'away').map((s, i) => ({ ...s, slot_index: homeGoals + i })),
  ]

  const handleConfirmMain = async () => {
    try {
      await placeMainBet.mutateAsync({ matchId, matchDate: match.match_date, scoreHome: homeGoals, scoreAway: awayGoals, scorers: scorersWithGlobalIdx })
      setSuccess('Palpite salvo!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      alert(`Erro: ${err.message}`)
    }
  }

  const handleExtraBet = async (option) => {
    try {
      await placeExtraBet.mutateAsync({ betOptionId: option.id, matchId })
      setSuccess(`Aposta feita: ${option.description}`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      alert(`Erro: ${err.message}`)
    }
  }

  return (
    <div>
      <button onClick={() => navigate('/jogos')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> Voltar aos jogos
      </button>

      {/* Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
            LIVE_STATUSES.includes(match.status)     ? 'bg-red-500/20 text-red-400' :
            FINISHED_STATUSES.includes(match.status) ? 'bg-gray-700 text-gray-400'  :
                                                       'bg-emerald-500/20 text-emerald-400'
          }`}>{statusInfo.label}</span>
          {match.round && <span className="text-xs text-gray-500">{match.round}</span>}
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 flex flex-col items-center gap-2">
            {match.home_team_logo && <img src={match.home_team_logo} alt={match.home_team} className="w-14 h-14 object-contain" />}
            <span className="text-white font-bold text-center text-sm">{match.home_team}</span>
          </div>
          <div className="text-center">
            {matchStarted && match.score_home !== null
              ? <div className="text-4xl font-black text-white">{match.score_home} <span className="text-gray-600">×</span> {match.score_away}</div>
              : <><div className="text-2xl font-black text-white">{formatInTimeZone(matchDate, 'America/Sao_Paulo', 'HH:mm')}</div><div className="text-sm text-gray-500 mt-1">{formatInTimeZone(matchDate, 'America/Sao_Paulo', 'dd/MM/yyyy')} <span className="text-gray-600 text-xs">BRT</span></div></>
            }
          </div>
          <div className="flex-1 flex flex-col items-center gap-2">
            {match.away_team_logo && <img src={match.away_team_logo} alt={match.away_team} className="w-14 h-14 object-contain" />}
            <span className="text-white font-bold text-center text-sm">{match.away_team}</span>
          </div>
        </div>
      </div>

      {/* Feedback ao vivo */}
      <LiveBetFeedback match={match} mainBet={mainBet} />

      {matchStarted && !LIVE_STATUSES.includes(match.status) && (
        <div className="flex items-center gap-3 p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-xl mb-6">
          <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
          <p className="text-yellow-400 text-sm font-semibold">Palpites encerrados — o jogo já iniciou.</p>
        </div>
      )}
      {LIVE_STATUSES.includes(match.status) && (
        <div className="flex items-center gap-3 p-4 bg-red-900/20 border border-red-700/30 rounded-xl mb-6">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          <p className="text-red-400 text-sm font-semibold">Jogo ao vivo — palpites encerrados.</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-900/30 border border-emerald-700/40 rounded-xl mb-4 animate-slide-up">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-emerald-300 text-sm font-medium">{success}</p>
        </div>
      )}

      {/* Palpite principal */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold">🎯 Palpite do placar</h2>
          {mainBet && <span className="text-xs text-emerald-500 font-medium">Salvo — editar abaixo</span>}
        </div>

        {/* Steppers */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 mb-6">
          <div className="flex flex-col items-center gap-3 flex-1">
            <span className="text-xs text-gray-500 font-medium truncate max-w-[90px] text-center">{match.home_team}</span>
            <ScoreStepper value={homeGoals} onChange={setHomeGoals} disabled={matchStarted} />
          </div>
          <div className="flex flex-col items-center gap-1 shrink-0">
            <span className="text-gray-600 text-xl font-black">×</span>
            <ResultBadge result={predictedResult} homeName={match.home_team} awayName={match.away_team} />
            <span className="text-xs text-gray-600 mt-1">odd {formatOdd(scoreOdd)}</span>
          </div>
          <div className="flex flex-col items-center gap-3 flex-1">
            <span className="text-xs text-gray-500 font-medium truncate max-w-[90px] text-center">{match.away_team}</span>
            <ScoreStepper value={awayGoals} onChange={setAwayGoals} disabled={matchStarted} />
          </div>
        </div>

        {/* Artilheiros */}
        <div className="border-t border-gray-800 pt-4 mb-5">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">⚽ Artilheiros</h3>
          <ScorerSection
            scoreHome={homeGoals}
            scoreAway={awayGoals}
            homeName={match.home_team}
            awayName={match.away_team}
            homePlayers={homePlayers}
            awayPlayers={awayPlayers}
            scorers={scorers}
            onChange={setScorers}
            isOfficialLineup={goalscorerOpts.length > 0}
            disabled={matchStarted}
          />
        </div>

        {/* Botão confirmar */}
        {!matchStarted && (
          <button onClick={handleConfirmMain} disabled={placeMainBet.isPending}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors disabled:opacity-60 text-sm">
            {placeMainBet.isPending ? 'Salvando...' : mainBet ? 'Atualizar palpite' : 'Confirmar palpite'}
          </button>
        )}

        {/* Resumo + compartilhar */}
        {mainBet && (
          <div className="mt-3 p-3 bg-gray-800/50 rounded-lg">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-gray-500">
                Palpite atual: <span className="text-white font-semibold">{mainBet.score_home} × {mainBet.score_away}</span>
                {' · '}odd <span className="text-emerald-400">{formatOdd(mainBet.odd)}</span>
                {mainBet.status === 'won' && <span className="text-emerald-400 ml-1">✓ +{mainBet.points_won?.toFixed(2)} pts</span>}
                {mainBet.status === 'lost' && <span className="text-red-400 ml-1">✗ 0 pts</span>}
              </p>
              <ShareButton
                title="Meu palpite · Bolão da Gangue"
                text={`Meu palpite: ${match.home_team} ${mainBet.score_home} × ${mainBet.score_away} ${match.away_team} (odd ${formatOdd(mainBet.odd)})`}
                className="text-gray-500 hover:text-emerald-400 shrink-0"
              />
            </div>
          </div>
        )}
      </div>

      {/* Apostas extras */}
      {extraOptions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">📊 Apostas extras</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {extraOptions.map(option => (
              <BetCard key={option.id} option={option} existingBet={extraBetMap[option.id]}
                onBet={handleExtraBet} disabled={placeExtraBet.isPending} matchStarted={matchStarted} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
