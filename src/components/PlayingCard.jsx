import { isRed } from '../lib/gameEngine'

export function PlayingCard({ card, selected, disabled, onClick, faceDown }) {
  if (!card) return null

  if (faceDown) {
    return (
      <div className="w-[120px] h-[170px] bg-red-900 border-4 border-white rounded-xl shadow-lg flex items-center justify-center">
        <div className="w-full h-full opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,white_10px,white_20px)]" />
      </div>
    )
  }

  const isRedCard = isRed(card.suit)
  const colorClass = isRedCard ? 'text-red-600' : 'text-slate-900'

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`
        relative w-[120px] h-[170px] bg-white rounded-xl shadow-xl border-2 flex flex-col items-center justify-center select-none transition-all duration-200
        ${selected ? 'border-gold ring-4 ring-gold/50 -translate-y-4' : 'border-slate-200'}
        ${disabled ? 'opacity-50 grayscale-[0.3] cursor-not-allowed' : 'cursor-pointer hover:-translate-y-12 hover:shadow-2xl hover:rotate-2'}
      `}
    >
      {/* Horní roh */}
      <div className={`absolute top-2 left-2 flex flex-col items-center leading-none ${colorClass}`}>
        <span className="text-xl font-black">{card.rank}</span>
        <span className="text-lg">{card.suit}</span>
      </div>

      {/* Středový symbol */}
      <div className={`text-6xl opacity-20 ${colorClass}`}>
        {card.suit}
      </div>

      {/* Spodní roh (otočený) */}
      <div className={`absolute bottom-2 right-2 flex flex-col items-center leading-none rotate-180 ${colorClass}`}>
        <span className="text-xl font-black">{card.rank}</span>
        <span className="text-lg">{card.suit}</span>
      </div>
    </div>
  )
}
