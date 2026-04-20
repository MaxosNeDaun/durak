import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const DEFAULT_SETTINGS = {
  deck_size: 36,
  max_players: 4,
  mode: 'throw-in',
  attack_type: 'all',
  fair_play: true,
  once_caught_stop: true,
}

export function LobbyPage() {
  const { roomId } = useParams()
  const { user, nickname, avatar } = useAuth()
  const navigate = useNavigate()

  const [room, setRoom] = useState(null)
  const [members, setMembers] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const isCreator = room?.creator_id === user?.id

  useEffect(() => {
    if (!roomId) return
    loadRoom()
    joinLobby()
  }, [roomId])

  async function loadRoom() {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (error) { setError('Místnost nenalezena'); return }

    if (data.status === 'playing') {
      navigate(`/game/${roomId}`)
      return
    }

    setRoom(data)
    setSettings(data.settings || DEFAULT_SETTINGS)

    // Load members
    const { data: memberData } = await supabase
      .from('room_members')
      .select('*')
      .eq('room_id', roomId)

    setMembers(memberData || [])
  }

  async function joinLobby() {
    if (!user) return
    await supabase.from('room_members').upsert({
      room_id: roomId,
      user_id: user.id,
      nickname,
      avatar,
      joined_at: new Date().toISOString()
    }, { onConflict: 'room_id,user_id' })

    // Subscribe to member changes
    const channel = supabase.channel(`lobby:${roomId}`)
    channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'room_members',
        filter: `room_id=eq.${roomId}`
      }, () => loadRoom())
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`
      }, (payload) => {
        if (payload.new.status === 'playing') {
          navigate(`/game/${roomId}`)
        }
        setRoom(payload.new)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }

  async function updateSettings(newSettings) {
    if (!isCreator) return
    setSettings(newSettings)
    await supabase.from('rooms').update({ settings: newSettings }).eq('id', roomId)
  }

  async function startGame() {
    if (!isCreator || members.length < 2) return
    setLoading(true)

    try {
      await supabase.from('rooms').update({ status: 'playing' }).eq('id', roomId)
      navigate(`/game/${roomId}`)
    } finally {
      setLoading(false)
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-panel p-6 w-full max-w-lg animate-slide-up">

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="font-display text-4xl font-bold text-gold mb-1">Čekárna</h1>
          <p className="text-gold/50 font-mono text-sm">{roomId?.slice(0, 8)}…</p>
        </div>

        {error && (
          <div className="text-red-400 text-center mb-4 p-3 rounded-lg bg-red-900/20 border border-red-500/30">
            {error}
          </div>
        )}

        {/* Players list */}
        <div className="mb-6">
          <h2 className="font-display text-sm text-gold/60 uppercase tracking-widest mb-3">
            Hráči ({members.length}/{settings.max_players})
          </h2>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.user_id} className="flex items-center gap-3 p-3 rounded-lg bg-black/20">
                <span className="text-2xl">{m.avatar || '👤'}</span>
                <span className="font-body text-gold">{m.nickname}</span>
                {m.user_id === room?.creator_id && (
                  <span className="ml-auto text-xs text-gold/40 border border-gold/20 px-2 py-0.5 rounded-full">
                    Tvůrce
                  </span>
                )}
              </div>
            ))}
            {Array.from({ length: Math.max(0, settings.max_players - members.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-gold/10">
                <span className="text-2xl opacity-20">👤</span>
                <span className="text-gold/20 text-sm italic">Čeká na hráče…</span>
              </div>
            ))}
          </div>
        </div>

        {/* Settings (creator only) */}
        {isCreator && (
          <div className="mb-6 space-y-4">
            <h2 className="font-display text-sm text-gold/60 uppercase tracking-widest">
              Nastavení hry
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {/* Deck size */}
              <div>
                <label className="text-xs text-gold/50 block mb-1">Balíček</label>
                <select
                  className="input-field text-sm"
                  value={settings.deck_size}
                  onChange={e => updateSettings({ ...settings, deck_size: +e.target.value })}
                >
                  <option value={24}>24 karet</option>
                  <option value={36}>36 karet</option>
                  <option value={52}>52 karet</option>
                </select>
              </div>

              {/* Max players */}
              <div>
                <label className="text-xs text-gold/50 block mb-1">Hráčů</label>
                <select
                  className="input-field text-sm"
                  value={settings.max_players}
                  onChange={e => updateSettings({ ...settings, max_players: +e.target.value })}
                >
                  {[2, 3, 4, 5, 6].map(n => (
                    <option key={n} value={n}>{n} hráčů</option>
                  ))}
                </select>
              </div>

              {/* Game mode */}
              <div>
                <label className="text-xs text-gold/50 block mb-1">Režim</label>
                <select
                  className="input-field text-sm"
                  value={settings.mode}
                  onChange={e => updateSettings({ ...settings, mode: e.target.value })}
                >
                  <option value="throw-in">Podhazovací</option>
                  <option value="passing">Přesouvací</option>
                </select>
              </div>

              {/* Attack type */}
              <div>
                <label className="text-xs text-gold/50 block mb-1">Podhazování</label>
                <select
                  className="input-field text-sm"
                  value={settings.attack_type}
                  onChange={e => updateSettings({ ...settings, attack_type: e.target.value })}
                >
                  <option value="all">Všichni</option>
                  <option value="neighbours">Jen sousedé</option>
                </select>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2">
              <label className="flex items-center justify-between p-3 rounded-lg bg-black/20 cursor-pointer">
                <span className="text-sm text-gold/80">Jednou a dost (po sebrání nelze přihodit)</span>
                <input
                  type="checkbox"
                  checked={settings.once_caught_stop}
                  onChange={e => updateSettings({ ...settings, once_caught_stop: e.target.checked })}
                  className="w-4 h-4 accent-yellow-500"
                />
              </label>
              <label className="flex items-center justify-between p-3 rounded-lg bg-black/20 cursor-pointer">
                <span className="text-sm text-gold/80">Čistá hra (fair play)</span>
                <input
                  type="checkbox"
                  checked={settings.fair_play}
                  onChange={e => updateSettings({ ...settings, fair_play: e.target.checked })}
                  className="w-4 h-4 accent-yellow-500"
                />
              </label>
            </div>
          </div>
        )}

        {/* Settings display (non-creator) */}
        {!isCreator && room && (
          <div className="mb-6 p-4 rounded-lg bg-black/20 border border-gold/10">
            <h2 className="font-display text-sm text-gold/60 uppercase tracking-widest mb-2">Nastavení</h2>
            <div className="grid grid-cols-2 gap-2 text-sm text-gold/70">
              <span>Balíček: {settings.deck_size} karet</span>
              <span>Hráčů: {settings.max_players}</span>
              <span>Režim: {settings.mode === 'passing' ? 'Přesouvací' : 'Podhazovací'}</span>
              <span>Útok: {settings.attack_type === 'all' ? 'Všichni' : 'Sousedé'}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {/* Invite link */}
          <button className="btn-ghost w-full flex items-center justify-center gap-2" onClick={copyLink}>
            {copied ? '✅ Zkopírováno!' : '🔗 Kopírovat pozvánku'}
          </button>

          {isCreator && (
            <button
              className="btn-primary w-full text-lg"
              onClick={startGame}
              disabled={members.length < 2 || loading}
            >
              {loading ? 'Spouštím…' : members.length < 2
                ? `Čekám na hráče (${members.length}/2)`
                : `▶ Spustit hru (${members.length} hráčů)`
              }
            </button>
          )}

          {!isCreator && (
            <div className="text-center text-gold/40 font-display animate-pulse">
              Čeká se na tvůrce místnosti…
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
