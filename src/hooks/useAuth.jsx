import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signInAnonymously(nickname) {
    // Use anonymous sign-in with nickname stored in metadata
    const email = `${nickname.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}@durak.game`
    const password = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nickname, avatar: getRandomAvatar() } }
    })

    if (error) throw error
    setDisplayName(nickname)
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const nickname = user?.user_metadata?.nickname || displayName || 'Hráč'
  const avatar = user?.user_metadata?.avatar || '🃏'

  return (
    <AuthContext.Provider value={{ user, loading, nickname, avatar, signInAnonymously, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}

function getRandomAvatar() {
  const avatars = ['🦊', '🐻', '🦁', '🐺', '🦅', '🐯', '🦄', '🐲', '🦋', '🐬']
  return avatars[Math.floor(Math.random() * avatars.length)]
}
