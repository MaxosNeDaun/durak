import { useState } from 'react'
import { PlayingCard, CardBack } from './PlayingCard'
import { sortHand, canAttack, canDefend, canPass, getUndefendedSlots } from '../lib/gameEngine'

export function GameTable({
  gameState, myId, myHand,
  isAttacker, isDefender,
  onAttack, onDefend, onPass, onTake, onEndAttack,
  players: presencePlayers
}) {
  const [selectedCard, setSelectedCard] = useState(null)
  const [actionError, setActionError] = useState('')

  if (!gameState) return null

  const {
    table, trump, trump_card, deck, player_order,
    attacker_id, defender_id, phase, mode, players
  } = gameState

  const sorted = sortHand(myHand, trump)
  const myIdx = player_order.indexOf(myId)
  const otherPlayers = player_order.filter(id => id !== myId)

  const isMyTurn = attacker_id === myId || defender_id === myId
  const undefended = getUndefendedSlots(table)
  const allDefended = table.length > 0 && table.every(s => s.defense)

  // ── Action handlers ──────────────────────────────────────────

  async function handleCardClick(card) {
    setActionError('')

    // Deselect if clicking same card
    if (selectedCard?.id === card.id) {
      setSelectedCard(null)
      return
    }

    // If defender and already selected a card, and there's only 1 undefended slot → auto-defend it
    if (isDefender && selectedCard && undefended.length === 1) {
      const result = await onDefend(undefended[0].attack, card)
      if (!result?.ok) {
        setActionError(result?.reason || 'Nelze bránit')
      }
      setSelectedCard(null)
      return
    }

    // Just select the card - action happens when clicking table slot or empty area
    setSelectedCard(card)
  }

  async function handleTableSlotClick(slot) {
    setActionError('')

    if (!selectedCard) return

    if (isDefender && slot.attack && !slot.defense) {
      // Try defending
      const result = await onDefend(slot.attack, selectedCard)
      if (!result?.ok) {
        setActionError(result?.reason || 'Nelze bránit')
      }
      setSelectedCard(null)
      return
    }

    if (isDefender && mode === 'passing') {
      // Try passing
      const result = await onPass(selectedCard)
      if (!result?.ok) {
        setActionError(result?.reason || 'Nelze přesunout')
      }
      setSelectedCard(null)
      return
    }
  }

  async function handleAttackEmpty() {
    if (!selectedCard) return
    setActionError('')

    if (!isDefender) {
      const result = await onAttack(selectedCard)
      if (!result?.ok) setActionError(result?.reason || 'Nelze zaútočit')
      else setSelectedCard(null)
    } else if (isDefender && mode === 'passing') {
      const result = await onPass(selectedCard)
      if (!result?.ok) setActionError(result?.reason || 'Nelze přesunout')
      else setSelectedCard(null)
    }
  }

  // ── Layout positions ─────────────────────────────────────────
  function getPositionStyle(relIdx, total) {
    const others = total - 1
    if (others === 0) return {}
    const positions = [
      { top: '5%', left: '50%', transform: 'translateX(-50%)' },          // top-center
      { top: '50%', left: '5%', transform: 'translateY(-50%)' },          // left
      { top: '50%', right: '5%', transform: 'translateY(-50%)' },         // right
      { top: '5%', left: '25%', transform: 'translateX(-50%)' },          // top-left
      { top: '5%', right: '25%', transform: 'translateX(50%)' },          // top-right
    ]
    return positions[relIdx % positions.length]
  }

  return (
    <div className="relative w-full h-full" style={{ minHeight: '100svh' }}>

      {/* ── FELT TABLE BACKGROUND ── */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse at center, #10472a 0%, #0d3b22 50%, #0a2e1a 100%)',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5)'
        }}>
        {/* Table texture */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #1a5c36 0, #1a5c36 1px, transparent 0, transparent 50%)',
            backgroundSize: '8px 8px'
          }} />
      </div>

      {/* ── OTHER PLAYERS ── */}
      {otherPlayers.map((pid, idx) => {
        const relIdx = (player_order.indexOf(pid) - myIdx + player_order.length) % player_order.length - 1
        const pData = players[pid]
        const isAtt = pid === attacker_id
        const isDef = pid === defender_id
        const posStyle = getPositionStyle(relIdx, player_order.length)
        const presence = presencePlayers?.find(p => p.user_id === pid)

        return (
          <div key={pid} className="absolute z-10" style={posStyle}>
            <div className={`player-badge ${isAtt ? 'attacker' : isDef ? 'defender' : ''}`}>
              <div className="flex items-center gap-1">
                <span className="text-lg">{presence?.avatar || '👤'}</span>
                {!presence && <span className="w-2 h-2 rounded-full bg-gray-500" title="Offline" />}
                {presence && <span className="w-2 h-2 rounded-full bg-green-400" title="Online" />}
              </div>
              <span className="text-xs font-display text-gold truncate max-w-[70px]">
                {presence?.nickname || pid.slice(0, 6)}
              </span>
              <div className="flex gap-0.5">
                {Array.from({ length: pData?.hand?.length || 0 }).map((_, i) => (
                  <div key={i} className="card-back-sm" style={{ width: 20, height: 30 }} />
                ))}
              </div>
              <span className="text-xs text-gold/50">{pData?.hand?.length || 0} karet</span>
              {isAtt && <span className="text-xs text-red-400 font-bold">⚔ Útočí</span>}
              {isDef && <span className="text-xs text-blue-400 font-bold">🛡 Brání</span>}
            </div>
          </div>
        )
      })}

      {/* ── DECK + TRUMP ── */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-10">
        {deck.length > 0 ? (
          <div className="deck-stack">
            <div className="card-back relative z-10" />
            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-gold/60 font-mono whitespace-nowrap">
              {deck.length} karet
            </span>
          </div>
        ) : (
          <div className="text-gold/40 text-xs text-center font-display">Balíček<br/>prázdný</div>
        )}

        {trump_card && (
          <div className="mt-6 flex flex-col items-center gap-1">
            <div className="trump-badge">Trumf</div>
            <div className="rotate-90">
              <PlayingCard card={trump_card} />
            </div>
          </div>
        )}

        {!trump_card && trump && (
          <div className="mt-2 trump-badge text-xl">{trump}</div>
        )}
      </div>

      {/* ── TABLE (PLAYED CARDS) ── */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="flex flex-wrap gap-3 justify-center items-center p-4 max-w-lg">
          {/* Empty table prompt */}
          {table.length === 0 && isAttacker && (
            <div
              className="table-slot flex items-center justify-center cursor-pointer hover:border-gold/60 transition-colors"
              onClick={handleAttackEmpty}
              title="Zaútočit"
            >
              {selectedCard ? (
                <span className="text-gold/60 text-xs text-center">Klikni<br/>útočit</span>
              ) : (
                <span className="text-gold/20 text-xs text-center">⚔️<br/>Útok</span>
              )}
            </div>
          )}

          {table.length === 0 && !isAttacker && (
            <div className="text-gold/30 font-display text-lg animate-pulse">
              Čeká se na útok…
            </div>
          )}

          {/* Table slots */}
          {table.map((slot, i) => (
            <div
              key={i}
              className="relative flex flex-col items-center"
              onClick={() => slot.attack && !slot.defense && isDefender && selectedCard
                ? handleTableSlotClick(slot)
                : undefined
              }
            >
              {/* Attack card */}
              <PlayingCard
                card={slot.attack}
                disabled={!(!slot.defense && isDefender && selectedCard)}
              />
              {/* Defense card - slightly offset */}
              {slot.defense && (
                <div className="absolute top-3 left-3 z-10">
                  <PlayingCard card={slot.defense} />
                </div>
              )}
              {/* Indicator: undefended */}
              {!slot.defense && isDefender && (
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-xs animate-pulse">
                  !
                </div>
              )}
            </div>
          ))}

          {/* Add more attack cards button (empty slot) */}
          {table.length > 0 && table.length < 6 && (isAttacker || (!isDefender)) &&
            !(gameState.once_caught_stop && gameState.caught_this_round) && (
            <div
              className="table-slot flex items-center justify-center cursor-pointer hover:border-gold/40 transition-colors"
              onClick={handleAttackEmpty}
              title="Přihodit kartu"
            >
              <span className="text-gold/20 text-2xl">+</span>
            </div>
          )}
        </div>
      </div>

      {/* ── ACTION BUTTONS ── */}
      <div className="absolute bottom-36 left-0 right-0 flex justify-center gap-3 z-20 px-4">
        {actionError && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-red-400 text-sm font-display bg-black/50 px-3 py-1 rounded-full whitespace-nowrap animate-shake">
            {actionError}
          </div>
        )}

        {/* Defender: Take cards */}
        {isDefender && table.length > 0 && (
          <button className="btn-danger text-sm" onClick={onTake}>
            📥 Vzít karty
          </button>
        )}

        {/* Attacker: End attack (bito) */}
        {isAttacker && table.length > 0 && allDefended && (
          <button className="btn-primary text-sm" onClick={onEndAttack}>
            ✅ Bito
          </button>
        )}

        {/* Pass mode indicator */}
        {isDefender && mode === 'passing' && table.length > 0 && !table.some(s => s.defense) && (
          <div className="trump-badge text-xs">
            Přesouvací režim: vyber kartu stejné hodnoty
          </div>
        )}
      </div>

      {/* ── MY HAND ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pb-4">
        {/* Role indicator */}
        <div className="flex justify-center mb-2">
          {isAttacker && (
            <span className="trump-badge text-red-400 border-red-400/50">⚔️ Ty útočíš</span>
          )}
          {isDefender && (
            <span className="trump-badge text-blue-400 border-blue-400/50">🛡 Ty se bráníš</span>
          )}
          {!isAttacker && !isDefender && (
            <span className="trump-badge text-gold/40">Čekáš na tah</span>
          )}
        </div>

        {/* Timer bar */}
        <div className="mx-4 mb-2">
          <div className="w-full bg-black/30 rounded-full h-1">
            <div className="timer-bar" style={{ width: '100%' }} />
          </div>
        </div>

        {/* Cards in hand */}
        <div className="hand-cards-container">
          {sorted.map((card) => {
            const atkCheck = canAttack(gameState, myId, card)
            const canPlay = atkCheck.ok || (isDefender && (
              canDefend(gameState, myId, table.find(s => !s.defense)?.attack || {id:'x'}, card).ok ||
              (mode === 'passing' && canPass(gameState, myId, card).ok)
            ))

            return (
              <div key={card.id} className="hand-card-wrapper">
                <PlayingCard
                  card={card}
                  selected={selectedCard?.id === card.id}
                  disabled={!canPlay && selectedCard?.id !== card.id}
                  onClick={() => handleCardClick(card)}
                />
              </div>
            )
          })}
        </div>

        <div className="text-center text-gold/30 text-xs mt-1 font-mono">
          {myHand.length} karet v ruce
        </div>
      </div>

      {/* ── GAME OVER OVERLAY ── */}
      {phase === 'finished' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="glass-panel p-8 text-center animate-slide-up">
            <div className="text-6xl mb-4">
              {gameState.winner === myId ? '😭' : '🎉'}
            </div>
            <h2 className="font-display text-3xl font-bold text-gold mb-2">
              {gameState.winner === myId ? 'TY JSI DURAK!' : 'Vyhráli jste!'}
            </h2>
            <p className="text-gold/60 mb-6">
              {gameState.winner
                ? `Hráč ${gameState.winner.slice(0, 6)} je Durak 🃏`
                : 'Remíza!'
              }
            </p>
            <button className="btn-primary" onClick={() => window.location.reload()}>
              Hrát znovu
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
