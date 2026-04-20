import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export function HomePage() {
  const { user, nickname, signInAnonymously } = useAuth()
  const navigate = useNavigate()

  const [nickInput, setNickInput] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [phase, setPhase] = useState('welcome') // welcome | nickname | menu

  async function handleNickname() {
    if (!nickInput.trim()) return
    setLoading(true)
    try {
      await signInAnonymously(nickInput.trim())
      setPhase('menu')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function createRoom() {
    if (!user) { setPhase('nickname'); return }
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('rooms')
        .insert({
          creator_id: user.id,
          status: 'waiting',
          settings: {
            deck_size: 36,
            max_players: 4,
            mode: 'throw-in',
            attack_type: 'all',
            fair_play: true,
            once_caught_stop: true,
          }
        })
        .select()
        .single()

      if (err) throw err
      navigate(`/lobby/${data.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function joinRoom() {
    if (!user) { setPhase('nickname'); return }
    if (!joinCode.trim()) return
    setLoading(true)
    setError('')

    // Support both full URL and just room ID
    const roomId = joinCode.includes('/') ? joinCode.split('/').pop() : joinCode.trim()

    try {
      const { data, error: err } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (err || !data) throw new Error('Místnost nenalezena')
      if (data.status === 'finished') throw new Error('Hra již skončila')

      navigate(data.status === 'playing' ? `/game/${roomId}` : `/lobby/${roomId}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">

      {/* Decorative cards */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {['♠', '♥', '♦', '♣'].map((suit, i) => (
          <div
            key={suit}
            className="absolute text-8xl opacity-5 animate-float"
            style={{
              top: `${[10, 70, 20, 60][i]}%`,
              left: `${[5, 85, 45, 15][i]}%`,
              animationDelay: `${i * 0.8}s`,
              color: ['♥', '♦'].includes(suit) ? '#c0392b' : '#fdf6e3'
            }}
          >
            {suit}
          </div>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-7xl mb-4 animate-float">🃏</div>
          <h1 className="font-display text-6xl font-black text-gold mb-2"
            style={{ textShadow: '0 0 40px rgba(201,168,76,0.4)' }}>
            Durak
          </h1>
          <p className="font-body italic text-gold/50 text-lg">Online multiplayer</p>
        </div>

        <div className="glass-panel p-6 animate-slide-up">

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {/* WELCOME PHASE */}
          {phase === 'welcome' && (
            <div className="space-y-4">
              <p className="text-center text-gold/60 font-body mb-6">
                Klasická ruská kartová hra pro 2–6 hráčů
              </p>
              <button className="btn-primary w-full text-xl py-4" onClick={() => setPhase('nickname')}>
                🎮 Začít hrát
              </button>
              <div className="text-center text-gold/30 text-xs mt-4 font-mono">
                Žádná registrace není potřeba
              </div>
            </div>
          )}

          {/* NICKNAME PHASE */}
          {phase === 'nickname' && (
            <div className="space-y-4">
              <h2 className="font-display text-xl text-gold text-center mb-4">Jak ti říkají?</h2>
              <input
                className="input-field text-center text-lg"
                placeholder="Tvoje přezdívka…"
                value={nickInput}
                onChange={e => setNickInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNickname()}
                maxLength={20}
                autoFocus
              />
              <button
                className="btn-primary w-full"
                onClick={handleNickname}
                disabled={!nickInput.trim() || loading}
              >
                {loading ? 'Načítám…' : 'Pokračovat →'}
              </button>
              <button className="btn-ghost w-full text-sm" onClick={() => setPhase('welcome')}>
                ← Zpět
              </button>
            </div>
          )}

          {/* MENU PHASE */}
          {phase === 'menu' && (
            <div className="space-y-4">
              <p className="text-center text-gold/60 mb-4">
                Vítej, <span className="text-gold font-bold">{user?.user_metadata?.nickname || nickname}</span>! 👋
              </p>

              <button className="btn-primary w-full text-lg py-4" onClick={createRoom} disabled={loading}>
                {loading ? 'Vytvářím…' : '🏠 Vytvořit místnost'}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gold/15" />
                </div>
                <div className="relative text-center">
                  <span className="px-3 text-gold/30 text-sm bg-transparent font-body">nebo</span>
                </div>
              </div>

              <div className="space-y-2">
                <input
                  className="input-field text-center"
                  placeholder="Kód nebo odkaz místnosti…"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && joinRoom()}
                />
                <button
                  className="btn-ghost w-full"
                  onClick={joinRoom}
                  disabled={!joinCode.trim() || loading}
                >
                  🚪 Připojit se
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rules summary */}
        <div className="mt-6 text-center text-gold/20 text-xs font-mono space-y-1">
          <p>Podhazovací · Přesouvací · 24/36/52 karet</p>
          <p>2–6 hráčů · Realtime multiplayer</p>
        </div>
      </div>
    </div>
  )
}
