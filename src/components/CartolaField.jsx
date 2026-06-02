import { Plus, Star } from 'lucide-react'
import { buildFieldRows } from '../hooks/useCartola'

const POSITION_COLORS = {
  GK:  { bg: 'bg-yellow-500/20', border: 'border-yellow-500/60', text: 'text-yellow-400', label: 'GOL' },
  DEF: { bg: 'bg-blue-500/20',   border: 'border-blue-500/60',   text: 'text-blue-400',   label: 'DEF' },
  MID: { bg: 'bg-emerald-500/20',border: 'border-emerald-500/60',text: 'text-emerald-400',label: 'MEI' },
  FWD: { bg: 'bg-red-500/20',    border: 'border-red-500/60',    text: 'text-red-400',    label: 'ATA' },
}

function PlayerSlot({ slot, player, isCaptain, isLocked, scores, onSlotClick }) {
  const colors = POSITION_COLORS[slot.position]
  const score  = player ? (scores?.[player.id]?.total_points ?? null) : null

  if (!player) {
    return (
      <button
        onClick={() => !isLocked && onSlotClick(slot)}
        disabled={isLocked}
        className={`flex flex-col items-center gap-1 group ${isLocked ? 'cursor-default opacity-60' : 'cursor-pointer'}`}
      >
        <div className={`
          w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-dashed
          flex items-center justify-center transition-all
          ${colors.border} ${colors.bg}
          ${!isLocked ? 'group-hover:scale-105 group-hover:border-solid' : ''}
        `}>
          {!isLocked && <Plus className={`w-5 h-5 ${colors.text}`} />}
        </div>
        <span className={`text-[10px] font-bold ${colors.text}`}>{colors.label}</span>
      </button>
    )
  }

  const initials = player.name.split(' ').map(n => n[0]).slice(0, 2).join('')
  const imgUrl   = player.photo_url || player.team_flag || null

  return (
    <button
      onClick={() => !isLocked && onSlotClick(slot)}
      disabled={isLocked}
      className={`flex flex-col items-center gap-1 group ${isLocked ? 'cursor-default' : 'cursor-pointer'}`}
    >
      <div className="relative">
        {/* Avatar */}
        <div className={`
          w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 overflow-hidden
          flex items-center justify-center font-bold text-sm
          transition-all ${!isLocked ? 'group-hover:scale-105' : ''}
          ${colors.border} ${colors.bg} ${colors.text}
        `}>
          {imgUrl ? (
            <img
              src={imgUrl}
              alt={player.name}
              className={`${player.photo_url ? 'w-full h-full object-cover' : 'w-8 h-8 object-contain'}`}
              onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex' }}
            />
          ) : null}
          <span style={{ display: imgUrl ? 'none' : 'flex' }}>{initials}</span>
        </div>

        {/* Badge capitão */}
        {isCaptain && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white text-[9px] font-black">C</span>
          </div>
        )}

        {/* Pontuação da rodada */}
        {score !== null && (
          <div className={`
            absolute -bottom-1 left-1/2 -translate-x-1/2
            px-1.5 py-0 rounded-full text-[9px] font-black whitespace-nowrap
            ${score >= 0 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}
          `}>
            {score > 0 ? '+' : ''}{score}
          </div>
        )}
      </div>

      {/* Nome + preço */}
      <div className="flex flex-col items-center">
        <span className="text-white text-[10px] font-semibold max-w-[56px] sm:max-w-[64px] truncate leading-tight text-center">
          {player.name.split(' ').pop()}
        </span>
        <span className={`text-[9px] font-bold ${colors.text}`}>
          C$ {player.price.toFixed(1)}
        </span>
      </div>
    </button>
  )
}

export default function CartolaField({ formation, selectedPlayers, captainSlot, scores, isLocked, onSlotClick }) {
  const rows = buildFieldRows(formation)

  return (
    <div className="relative w-full rounded-2xl overflow-hidden select-none" style={{ background: 'linear-gradient(180deg, #166534 0%, #15803d 40%, #16a34a 60%, #166534 100%)' }}>
      {/* Linhas do campo */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Linha central */}
        <div className="absolute top-1/2 left-4 right-4 h-px bg-white/20" />
        {/* Círculo central */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/20" />
        {/* Área do time de cima (FWD) */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-10 border border-white/20 rounded-b-lg" />
        {/* Área do time de baixo (GK) */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-10 border border-white/20 rounded-t-lg" />
      </div>

      {/* Slots por linha */}
      <div className="relative flex flex-col gap-2 py-4 px-2">
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex justify-center gap-2 sm:gap-3">
            {row.map(slot => (
              <PlayerSlot
                key={slot.slotIndex}
                slot={slot}
                player={selectedPlayers[slot.slotIndex] ?? null}
                isCaptain={captainSlot === slot.slotIndex}
                isLocked={isLocked}
                scores={scores}
                onSlotClick={onSlotClick}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
