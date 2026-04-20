-- ================================================================
-- DURAK ONLINE - Supabase SQL Schema
-- Spusť v Supabase SQL Editoru (https://app.supabase.com)
-- ================================================================

-- ── Rooms ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  creator_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'waiting'
              CHECK (status IN ('waiting', 'playing', 'finished')),
  settings    JSONB NOT NULL DEFAULT '{
    "deck_size": 36,
    "max_players": 4,
    "mode": "throw-in",
    "attack_type": "all",
    "fair_play": true,
    "once_caught_stop": true
  }'::jsonb
);

-- ── Room members (lobby) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.room_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname   TEXT,
  avatar     TEXT,
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (room_id, user_id)
);

-- ── Game state ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.game_states (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID REFERENCES public.rooms(id) ON DELETE CASCADE UNIQUE,
  state      JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER game_states_updated_at
  BEFORE UPDATE ON public.game_states
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Enable Realtime ───────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_states;

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_states ENABLE ROW LEVEL SECURITY;

-- Rooms: anyone can read, authenticated users can create
CREATE POLICY "rooms_select" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "rooms_insert" ON public.rooms FOR INSERT
  WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "rooms_update" ON public.rooms FOR UPDATE
  USING (auth.uid() = creator_id OR status = 'playing');

-- Room members: anyone can read, users can join
CREATE POLICY "members_select" ON public.room_members FOR SELECT USING (true);
CREATE POLICY "members_insert" ON public.room_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "members_update" ON public.room_members FOR UPDATE
  USING (auth.uid() = user_id);

-- Game states: anyone in the room can read/write
CREATE POLICY "game_state_select" ON public.game_states FOR SELECT USING (true);
CREATE POLICY "game_state_insert" ON public.game_states FOR INSERT WITH CHECK (true);
CREATE POLICY "game_state_update" ON public.game_states FOR UPDATE USING (true);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS rooms_creator_idx ON public.rooms(creator_id);
CREATE INDEX IF NOT EXISTS rooms_status_idx ON public.rooms(status);
CREATE INDEX IF NOT EXISTS members_room_idx ON public.room_members(room_id);
CREATE INDEX IF NOT EXISTS members_user_idx ON public.room_members(user_id);
CREATE INDEX IF NOT EXISTS game_states_room_idx ON public.game_states(room_id);

-- ================================================================
-- HOTOVO! Nyní nastav v Supabase:
-- 1. Authentication → Email: vypni "Confirm email"
-- 2. Authentication → JWT Expiry: nastav na 604800 (7 dní)
-- 3. Realtime je zapnutý (přidáno výše)
-- ================================================================
