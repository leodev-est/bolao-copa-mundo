import { useState, useEffect, useMemo } from 'react'
import { ChevronDown, CheckCircle, AlertCircle, Lock, RefreshCw, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  FORMATIONS, BUDGET, buildSlots,
  useCartolaRound, useMyCartolaTeam,
  useSaveCartolaTeam, useRoundPlayerScores, useRoundFixtures,
} from '../hooks/useCartola'
import CartolaField from '../components/CartolaField'
import PlayerPickerModal from '../components/PlayerPickerModal'

// Menu de ações ao clicar num slot preenchido
function SlotActionMenu({ slot, isCaptain, onSetCaptain, onRemove, onClose }) {
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="fixed z-40 bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden w-64">
        <button
          onClick={() => { onSetCaptain(); onClose() }}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-700/60 transition-colors text-left"
        >
          <span className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-black shrink-0">C</span>
          <span className="text-white text-sm font-medium">
            {isCaptain ? 'Remover capitania' : 'Definir como capitão'}
          </span>
        </button>
        <div className="h-px bg-gray-700" />
        <button
          onClick={() => { onRemove(); onClose() }}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-900/20 transition-colors text-left"
        >
          <span className="w-6 h-6 rounded-full bg-red-900/40 flex items-center justify-center shrink-0">
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
          </span>
          <span className="text-red-400 text-sm font-medium">Remover jogador</span>
        </button>
      </div>
    </>
  )
}

export default function Cartola() {
  const { data: round, isLoading: roundLoading } = useCartolaRound()
  const { data: myTeam, isLoading: teamLoading }  = useMyCartolaTeam(round?.id)
  const { data: scores }                           = useRoundPlayerScores(round?.id)
  const { data: fixtures = {} }                    = useRoundFixtures(round)
  const saveTeam = useSaveCartolaTeam()

  const [formation,       setFormation]       = useState('4-3-3')
  const [selectedPlayers, setSelectedPlayers] = useState({})  // { slotIndex: player }
  const [captainSlot,     setCaptainSlot]     = useState(null)
  const [pickerSlot,      setPickerSlot]      = useState(null) // slot aguardando seleção
  const [actionSlot,      setActionSlot]      = useState(null) // slot com menu aberto
  const [saved,           setSaved]           = useState(false)
  const [saveError,       setSaveError]       = useState('')

  // Quando o time salvo carregar, popula o estado local
  useEffect(() => {
    if (!myTeam) return
    setFormation(myTeam.formation)
    const playerMap = {}
    let cap = null
    for (const tp of myTeam.cartola_team_players ?? []) {
      playerMap[tp.position_slot] = tp.cartola_players
      if (tp.is_captain) cap = tp.position_slot
    }
    setSelectedPlayers(playerMap)
    setCaptainSlot(cap)
  }, [myTeam])

  const isLocked = round?.status !== 'open'

  // Recalcula orçamento e contadores
  const slots = buildSlots(formation)

  const totalSpent = useMemo(
    () => Object.values(selectedPlayers).reduce((acc, p) => acc + (p?.price ?? 0), 0),
    [selectedPlayers]
  )
  const budgetLeft     = BUDGET - totalSpent
  const playerCount    = Object.values(selectedPlayers).filter(Boolean).length
  const isComplete     = playerCount === 11
  const hasCaptain     = captainSlot !== null && selectedPlayers[captainSlot]
  const overBudget     = budgetLeft < -0.01

  // Mapa de contagem por time (para limite de 3 por seleção)
  const teamCountMap = useMemo(() => {
    const map = {}
    Object.values(selectedPlayers).forEach(p => {
      if (p) map[p.team_name] = (map[p.team_name] ?? 0) + 1
    })
    return map
  }, [selectedPlayers])

  // IDs já no time
  const selectedIds = useMemo(() => {
    return new Set(Object.values(selectedPlayers).filter(Boolean).map(p => p.id))
  }, [selectedPlayers])

  function handleSlotClick(slot) {
    if (isLocked) return
    const existing = selectedPlayers[slot.slotIndex]
    if (existing) {
      setActionSlot(slot)
    } else {
      setPickerSlot(slot)
    }
  }

  function handlePlayerSelect(slot, player) {
    setSelectedPlayers(prev => ({ ...prev, [slot.slotIndex]: player }))
    setPickerSlot(null)
  }

  function handleRemovePlayer(slot) {
    setSelectedPlayers(prev => {
      const next = { ...prev }
      delete next[slot.slotIndex]
      return next
    })
    if (captainSlot === slot.slotIndex) setCaptainSlot(null)
  }

  function handleSetCaptain(slot) {
    setCaptainSlot(prev => prev === slot.slotIndex ? null : slot.slotIndex)
  }

  function handleFormationChange(newFormation) {
    if (playerCount > 0) {
      // Limpa time ao trocar formação
      setSelectedPlayers({})
      setCaptainSlot(null)
    }
    setFormation(newFormation)
  }

  async function handleConfirm() {
    if (!isComplete || overBudget || !hasCaptain || !round) return
    setSaveError('')
    try {
      await saveTeam.mutateAsync({
        roundId:    round.id,
        formation,
        players:    selectedPlayers,
        captainSlot,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Erro ao salvar time:', err)
      setSaveError(err?.message ?? 'Erro ao salvar. Tente novamente.')
    }
  }

  const loading = roundLoading || teamLoading

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!round) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-4">⚽</p>
        <p className="text-gray-400 text-lg font-semibold">Nenhuma rodada aberta</p>
        <p className="text-gray-600 text-sm mt-2">Aguarde a próxima rodada do Cartola ser liberada.</p>
      </div>
    )
  }

  const phaseLabels = { group: 'Fase de Grupos', round_of_16: 'Oitavas', quarter: 'Quartas', semi: 'Semifinal', final: 'Final' }
  const statusLabel  = { open: 'Aberta', closed: 'Em andamento', finished: 'Encerrada' }[round.status]

  return (
    <div className="max-w-lg mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-white">Cartola</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {round.name} · <span className={round.status === 'open' ? 'text-emerald-400' : 'text-yellow-400'}>{statusLabel}</span>
          </p>
        </div>
        <Link
          to="/cartola/ranking"
          className="text-xs text-emerald-400 font-semibold hover:text-emerald-300 transition-colors"
        >
          Ver ranking →
        </Link>
      </div>

      {/* Barra de status */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-4">
        {/* Orçamento */}
        <div className={`rounded-xl px-3 py-2.5 ${overBudget ? 'bg-red-900/30 border border-red-700/40' : 'bg-gray-900 border border-gray-800'}`}>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Saldo</p>
          <p className={`text-lg font-black leading-none ${overBudget ? 'text-red-400' : 'text-emerald-400'}`}>
            C$ {budgetLeft.toFixed(1)}
          </p>
          <p className="text-[10px] text-gray-600 mt-0.5">de C$ {BUDGET}</p>
        </div>

        {/* Jogadores */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Jogadores</p>
          <p className={`text-lg font-black leading-none ${isComplete ? 'text-emerald-400' : 'text-white'}`}>
            {playerCount}<span className="text-gray-600 text-sm font-medium">/11</span>
          </p>
          <p className="text-[10px] text-gray-600 mt-0.5">selecionados</p>
        </div>

        {/* Formação */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Formação</p>
          {isLocked ? (
            <p className="text-lg font-black leading-none text-white">{formation}</p>
          ) : (
            <div className="relative">
              <select
                value={formation}
                onChange={e => handleFormationChange(e.target.value)}
                className="w-full appearance-none bg-transparent text-white text-base font-black outline-none cursor-pointer pr-4"
              >
                {Object.keys(FORMATIONS).map(f => (
                  <option key={f} value={f} className="bg-gray-900">{f}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* Aviso lock */}
      {isLocked && (
        <div className="flex items-center gap-2 bg-yellow-900/20 border border-yellow-700/40 rounded-xl px-3 py-2.5 mb-3 text-sm text-yellow-400">
          <Lock className="w-4 h-4 shrink-0" />
          {round.status === 'closed'
            ? 'A rodada já começou. Seu time está bloqueado.'
            : 'Esta rodada foi encerrada.'}
        </div>
      )}

      {/* Campo */}
      <CartolaField
        formation={formation}
        selectedPlayers={selectedPlayers}
        captainSlot={captainSlot}
        scores={scores}
        fixtures={fixtures}
        isLocked={isLocked}
        onSlotClick={handleSlotClick}
      />

      {/* Hint capitão */}
      {!isLocked && playerCount > 0 && !hasCaptain && (
        <p className="text-center text-xs text-orange-400/80 mt-2">
          Clique num jogador para definir o capitão (pontos dobrados)
        </p>
      )}

      {/* Botão confirmar */}
      {!isLocked && (
        <div className="mt-4 space-y-2">
          {!hasCaptain && isComplete && (
            <p className="text-center text-xs text-orange-400">Defina um capitão para confirmar o time</p>
          )}
          <button
            onClick={handleConfirm}
            disabled={!isComplete || overBudget || !hasCaptain || saveTeam.isPending}
            className={`
              w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2
              ${isComplete && !overBudget && hasCaptain
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'}
            `}
          >
            {saveTeam.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Time salvo!
              </>
            ) : (
              'Confirmar time'
            )}
          </button>

          {saveError && (
            <div className="flex items-start gap-2 p-3 bg-red-900/30 border border-red-700/50 rounded-xl text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">Erro ao salvar o time</p>
                <p className="text-red-400/80">{saveError}</p>
                <p className="text-red-400/60 mt-1">Tente fazer logout e entrar novamente se o problema persistir.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pontuação se rodada encerrada */}
      {round.status === 'finished' && myTeam && (
        <div className="mt-4 bg-emerald-900/20 border border-emerald-700/40 rounded-2xl p-4 text-center">
          <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">Pontuação da rodada</p>
          <p className="text-4xl font-black text-white">{myTeam.total_points.toFixed(1)}</p>
          <p className="text-gray-500 text-xs mt-1">pontos</p>
        </div>
      )}

      {/* Player picker modal */}
      {pickerSlot && (
        <PlayerPickerModal
          slot={pickerSlot}
          selectedPlayerIds={selectedIds}
          teamCountMap={teamCountMap}
          budget={budgetLeft}
          fixtures={fixtures}
          onSelect={handlePlayerSelect}
          onClose={() => setPickerSlot(null)}
        />
      )}

      {/* Action menu slot preenchido */}
      {actionSlot && (
        <SlotActionMenu
          slot={actionSlot}
          isCaptain={captainSlot === actionSlot.slotIndex}
          onSetCaptain={() => handleSetCaptain(actionSlot)}
          onRemove={() => handleRemovePlayer(actionSlot)}
          onClose={() => setActionSlot(null)}
        />
      )}
    </div>
  )
}
