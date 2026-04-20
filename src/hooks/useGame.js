import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  initGame, applyAttack, applyDefense, applyPass,
  applyTake, applyEndAttack, canAttack, canDefend, canPass
} from '../lib/gameEngine'

export function useGame(roomId, userId) {
  const [gameState, setGameState] = useState(null)
  const [roomData, setRoomData] = useState(null)
  const [players, setPlayers] = useState([]) // presence list
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const channelRef = useRef(null)
  const stateRef = useRef(null)

  useEffect(() => {
    stateRef.current = gameState
  }, [gameState])

  // ── Load room and state ──────────────────────────────────────
  useEffect(() => {
    if (!roomId || !userId) return

    async function loadRoom() {
      setLoading(true)
      try {
        const { data: room, error: roomErr } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .single()

        if (roomErr) throw roomErr
        setRoomData(room)

        const { data: gs } = await supabase
          .from('game_states')
          .select('*')
          .eq('room_id', roomId)
          .single()

        if (gs?.state) setGameState(gs.state)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadRoom()
    setupRealtime()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [roomId, userId])

  // ── Realtime setup ───────────────────────────────────────────
  function setupRealtime() {
    const channel = supabase.channel(`game:${roomId}`, {
      config: { presence: { key: userId } }
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const presenceList = Object.values(state).flat()
        setPlayers(presenceList)
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('Joined:', newPresences)
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('Left:', leftPresences)
      })
      .on('broadcast', { event: 'game_state' }, ({ payload }) => {
        setGameState(payload.state)
      })
      .on('broadcast', { event: 'game_action' }, ({ payload }) => {
        handleRemoteAction(payload)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_states',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        if (payload.new?.state) {
          setGameState(payload.new.state)
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`
      }, (payload) => {
        setRoomData(payload.new)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          })
        }
      })

    channelRef.current = channel
  }

  function handleRemoteAction(payload) {
    // Apply action to local state for responsiveness
    setGameState(prev => {
      if (!prev) return prev
      return applyActionToState(prev, payload)
    })
  }

  function applyActionToState(state, action) {
    switch (action.type) {
      case 'ATTACK': return applyAttack(state, action.playerId, action.card)
      case 'DEFEND': return applyDefense(state, action.playerId, action.attackCard, action.defenseCard)
      case 'PASS': return applyPass(state, action.playerId, action.card)
      case 'TAKE': return applyTake(state, action.playerId)
      case 'END_ATTACK': return applyEndAttack(state, action.playerId)
      default: return state
    }
  }

  // ── Persist state to Supabase ────────────────────────────────
  async function persistState(newState) {
    const { error } = await supabase
      .from('game_states')
      .upsert({ room_id: roomId, state: newState }, { onConflict: 'room_id' })

    if (error) console.error('State persist error:', error)

    // Broadcast to all clients
    channelRef.current?.send({
      type: 'broadcast',
      event: 'game_state',
      payload: { state: newState }
    })
  }

  // ── Game actions ─────────────────────────────────────────────

  const startGame = useCallback(async (playerIds) => {
    if (!roomData) return

    const newState = initGame(roomData.settings, playerIds)
    setGameState(newState)
    await persistState(newState)

    await supabase.from('rooms').update({ status: 'playing' }).eq('id', roomId)
  }, [roomData, roomId])

  const attack = useCallback(async (card) => {
    const state = stateRef.current
    if (!state) return { ok: false }

    const check = canAttack(state, userId, card)
    if (!check.ok) return check

    const newState = applyAttack(state, userId, card)
    setGameState(newState)
    await persistState(newState)
    return { ok: true }
  }, [userId])

  const defend = useCallback(async (attackCard, defenseCard) => {
    const state = stateRef.current
    if (!state) return { ok: false }

    const check = canDefend(state, userId, attackCard, defenseCard)
    if (!check.ok) return check

    const newState = applyDefense(state, userId, attackCard, defenseCard)
    setGameState(newState)
    await persistState(newState)
    return { ok: true }
  }, [userId])

  const pass = useCallback(async (card) => {
    const state = stateRef.current
    if (!state) return { ok: false }

    const check = canPass(state, userId, card)
    if (!check.ok) return check

    const newState = applyPass(state, userId, card)
    setGameState(newState)
    await persistState(newState)
    return { ok: true }
  }, [userId])

  const takeCards = useCallback(async () => {
    const state = stateRef.current
    if (!state || state.defender_id !== userId) return { ok: false }

    const newState = applyTake(state, userId)
    setGameState(newState)
    await persistState(newState)
    return { ok: true }
  }, [userId])

  const endAttack = useCallback(async () => {
    const state = stateRef.current
    if (!state) return { ok: false }

    const hasUndefended = state.table.some(s => !s.defense)
    if (hasUndefended) return { ok: false, reason: 'Jsou neobráněné karty' }

    const newState = applyEndAttack(state, userId)
    setGameState(newState)
    await persistState(newState)
    return { ok: true }
  }, [userId])

  return {
    gameState,
    roomData,
    players,
    error,
    loading,
    myId: userId,
    isAttacker: gameState?.attacker_id === userId,
    isDefender: gameState?.defender_id === userId,
    myHand: gameState?.players?.[userId]?.hand || [],
    actions: { startGame, attack, defend, pass, takeCards, endAttack }
  }
}
