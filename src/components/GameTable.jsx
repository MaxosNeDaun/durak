import { useState } from 'react'
import { PlayingCard, CardBack } from './PlayingCard'
import { sortHand, getUndefendedSlots } from '../lib/gameEngine'

export function GameTable({
  gameState, myId, myHand,
  isAttacker, isDefender,
  onAttack, onDefend, onPass, onTake, onEndAttack,
  players: presencePlayers
}) {
  const [actionError, setActionError] = useState('')

  if (!gameState) return null

  const {
    table, trump, trump_card, deck, player_order,
    attacker_id, defender_id, phase, mode, players
  } = gameState

  const sorted = sortHand(myHand, trump)
  const myIdx = player_order.indexOf(myId)
  const otherPlayers = player_order.filter(id => id !== myId)
  
  const undefended = getUndefendedSlots(table)
  const allDefended = table.length > 0 && table.every(s => s.defense)

  // ── RYCHLÉ OVLÁDÁNÍ KLIKNUTÍM ──────────────────────────────────
  async function handleQuickPlay(card) {
    setActionError('')

    // A) JSEM OBRÁNCE
    if (isDefender) {
      // 1. Zkusíme přesunout (pokud je passing mode a stůl je čistý)
      if (mode === 'passing' && table.every(s => !s.defense)) {
        const res = await onPass(card)
        if (res?.ok) return
      }

      // 2. Zkusíme bránit první volnou kartu na stole
      const slotToDefend = table.find(s => !s.defense)
      if (slotToDefend) {
        const res = await onDefend(slotToDefend.attack, card)
        if (!res?.ok) setActionError(res?.reason || 'Nelze bránit')
        return
      }
    } 
    
    // B) JSEM ÚTOČNÍK (nebo kdokoli jiný kdo může přihodit)
    else {
      const res = await onAttack(card)
      if (!res?.ok) setActionError(res?.reason || 'Nelze zaútočit')
    }
  }

  // ── POMOCNÉ STYLY PRO ROZLOŽENÍ ────────────────────────────────
  function getPositionStyle(relIdx, total) {
    const others = total - 1
    if (others === 0) return {}
    const positions = [
      { top: '2%', left: '50%', transform: 'translateX(-50%)' },
      { top: '40%', left: '2%', transform: 'translateY(-50%)' },
      { top: '40%', right: '2%', transform: 'translateY(-50%)' },
    ]
    return positions[relIdx % positions.length]
  }

  return (
    <div className="relative w-full h-full bg-felt-dark overflow-hidden flex flex-col items-center">
      
      {/* SOUPEŘI (Zmenšení, aby nezabírali místo) */}
      <div className="absolute inset-0 pointer-events-none">
        {otherPlayers.map((pid, idx) => {
          const relIdx = (player_order.indexOf(pid) - myIdx + player_order.length) % player_order.length - 1
          const pData = players[pid]
          const posStyle = getPositionStyle(relIdx, player_order.length)
          const presence = presencePlayers?.find(p => p.user_id === pid)

          return (
            <div key={pid} className="absolute scale-75 opacity-80" style={posStyle}>
              <div className={`flex flex-col items-center bg-black/20 p-2 rounded-xl border ${pid === attacker_id ? 'border-red-500' : 'border-gold/20'}`}>
                <span className="text-white font-bold">{presence?.nickname || 'Hráč'}</span>
                <div className="flex -space-x-4 mt-1">
                  {Array.from({ length: pData?.hand?.length || 0 }).slice(0, 6).map((_, i) => (
                    <div key={i} className="w-8 h-12 bg-red-900 border border-white rounded shadow-sm" />
                  ))}
                  {pData?.hand?.length > 6 && <span className="pl-5 text-xs text-gold">+{pData.hand.length - 6}</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* STŮL (OBŘÍ KARTY) */}
      <div className="flex-1 w-full max-w-6xl flex items-center justify-center p-4">
        <div className="grid grid-cols-3 gap-x-12 gap-y-8">
          {table.map((slot, i) => (
            <div key={i} className="relative w-[130px] h-[190px]">
              <PlayingCard card={slot.attack} />
              {slot.defense && (
                <div className="absolute top-8 left-6 z-10 animate-slide-up">
                  <PlayingCard card={slot.defense} />
                </div>
              )}
            </div>
          ))}
          {/* Slot pro přihazování (jen vizuální nápověda) */}
          {table.length < 6 && !isDefender && (
            <div className="w-[130px] h-[190px] border-2 border-dashed border-gold/10 rounded-xl flex items-center justify-center text-gold/5 italic text-sm">
              Místo pro kartu
            </div>
          )}
        </div>
      </div>

      {/* TLAČÍTKO BITO / BRÁT (OBROVSKÉ) */}
      <div className="h-24 flex items-center justify-center z-30">
        {actionError && (
          <div className="absolute -top-6 text-red-400 bg-black/80 px-4 py-1 rounded-full text-sm animate-shake">
            {actionError}
          </div>
        )}
        
        {(isDefender && table.length > 0) && (
          <button className="bg-red-600 hover:bg-red-500 text-white px-12 py-4 rounded-full text-2xl font-black shadow-xl transition-all active:scale-95" onClick={onTake}>
            BRÁT KARTY
          </button>
        )}
        
        {(!isDefender && table.length > 0 && allDefended) && (
          <button className="bg-gold hover:bg-gold-bright text-felt-dark px-12 py-4 rounded-full text-2xl font-black shadow-pulse-gold transition-all active:scale-95" onClick={onEndAttack}>
            BITO
          </button>
        )}
      </div>

      {/* MOJE RUKA (OBŘÍ KARTY) */}
      <div className="w-full bg-black/20 pt-8 pb-12 flex justify-center items-end gap-1 px-4 overflow-x-auto min-h-[250px]">
        {sorted.map((card) => (
          <div key={card.id} className="transition-transform hover:-translate-y-16">
            <PlayingCard 
              card={card} 
              onClick={() => handleQuickPlay(card)} 
            />
          </div>
        ))}
      </div>

      {/* TRUMF A BALÍČEK (V rohu, aby nepřekážel) */}
      <div className="absolute right-6 bottom-32 flex flex-col items-center">
         <div className="relative">
            {deck.length > 0 && <div className="absolute -top-2 -right-2 bg-gold text-felt-dark w-6 h-6 rounded-full text-[10px] flex items-center justify-center font-bold">{deck.length}</div>}
            <div className="w-12 h-16 bg-red-900 border border-white rounded shadow-lg" />
         </div>
         <div className="mt-2 text-2xl bg-white/10 rounded px-2">{trump}</div>
      </div>
    </div>
  )
}
