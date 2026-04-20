import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useGame } from '../hooks/useGame'
import { GameTable } from '../components/GameTable'
import { supabase } from '../lib/supabase'

export function GamePage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { user, nickname, avatar } = useAuth()
  const [toast, setToast] = useState(null)

  const {
    gameState, roomData, players, error, loading,
    myId, isAttacker, isDefender, myHand, actions
  } = useGame(roomId, user?.id)

  useEffect(() => {
    if (!user) { navigate('/'); return }
  }, [user])

  const initializingRef = useRef(false)

  useEffect(() => {
    if (!roomData) return
    if (roomData.status === 'waiting') {
      navigate(`/lobby/${roomId}`)
      return
    }
    // Only creator initializes, only once, only if no state exists yet
    if (!gameState && roomData.status === 'playing' && roomData.creator_id === user?.id && !initializingRef.current) {
      initializingRef.current = true
      initializeGame()
    }
  }, [roomData, gameState])

  async function initializeGame() {
    // Get all members
    const { data: members } = await supabase
      .from('room_members')
      .select('user_id')
      .eq('room_id', roomId)

    if (!members?.length) return
    const playerIds = members.map(m => m.user_id)
    await actions.startGame(playerIds)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleAttack(card) {
    const result = await actions.attack(card)
    if (!result?.ok) showToast(result?.reason || 'Nelze zaútočit')
    return result
  }

  async function handleDefend(attackCard, defenseCard) {
    const result = await actions.defend(attackCard, defenseCard)
    if (!result?.ok) showToast(result?.reason || 'Nelze bránit')
    return result
  }

  async function handlePass(card) {
    const result = await actions.pass(card)
    if (!result?.ok) showToast(result?.reason || 'Nelze přesunout')
    return result
  }

  async function handleTake() {
    const result = await actions.takeCards()
    if (!result?.ok) showToast('Nelze vzít karty')
    else showToast('Karty sebrány 📥')
    return result
  }

  async function handleEndAttack() {
    const result = await actions.endAttack()
    if (!result?.ok) showToast(result?.reason || 'Nelze ukončit útok')
    else showToast('Bito! ✅')
    return result
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">🃏</div>
          <p className="font-display text-gold/60">Načítám hru…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-panel p-6 text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-red-400 mb-4">{error}</p>
          <button className="btn-ghost" onClick={() => navigate('/')}>← Domů</button>
        </div>
      </div>
    )
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-float">🃏</div>
          <p className="font-display text-gold/60 text-xl">Čeká se na rozdání…</p>
        </div>
      </div>
    )
  }

  // Enrich presence players with metadata
  const enrichedPlayers = players.map(p => ({
    ...p,
    nickname: p.nickname || p.user_id?.slice(0, 6),
    avatar: p.avatar || '👤'
  }))

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Toast notification */}
      {toast && <div className="toast">{toast}</div>}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-2">
        <button className="btn-ghost text-xs py-1 px-3" onClick={() => navigate('/')}>
          ← Odejít
        </button>

        <div className="flex items-center gap-2">
          {gameState.trump && (
            <span className="trump-badge">Trumf: {gameState.trump}</span>
          )}
          <span className="text-gold/30 text-xs font-mono">
            Tah #{gameState.turn_number}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-sm">{avatar}</span>
          <span className="text-gold/70 text-xs font-display">{nickname}</span>
        </div>
      </div>

      {/* Main game table */}
      <div className="pt-10 h-full">
        <GameTable
          gameState={gameState}
          myId={user.id}
          myHand={myHand}
          isAttacker={isAttacker}
          isDefender={isDefender}
          onAttack={handleAttack}
          onDefend={handleDefend}
          onPass={handlePass}
          onTake={handleTake}
          onEndAttack={handleEndAttack}
          players={enrichedPlayers}
        />
      </div>
    </div>
  )
}
