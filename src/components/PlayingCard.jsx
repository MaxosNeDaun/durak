import { isRed } from '../lib/gameEngine'

export function PlayingCard({ card, selected, disabled, onClick, small, faceDown }) {
  if (!card) return null

  if (faceDown) {
    return <div className={small ? 'card-back-sm' : 'card-back'} />
  }

  const colorClass = isRed(card.suit) ? 'card-red' : 'card-black'
  const sizeClass = small ? 'scale-75 origin-top-left' : ''

  return (
    <div
      className={`playing-card ${colorClass} ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''} ${sizeClass}`}
      onClick={disabled ? undefined : onClick}
      title={`${card.rank}${card.suit}`}
    >
      <div className="card-corner top-left">
        <span>{card.rank}</span>
        <span>{card.suit}</span>
      </div>
      <div className="card-suit-center">{card.suit}</div>
      <div className="card-corner bottom-right">
        <span>{card.rank}</span>
        <span>{card.suit}</span>
      </div>
    </div>
  )
}

export function CardBack({ small }) {
  return <div className={small ? 'card-back-sm' : 'card-back'} />
}
