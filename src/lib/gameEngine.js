// ============================================================
// DURAK GAME ENGINE
// Full implementation of Durak card game logic
// ============================================================

export const SUITS = ['♠', '♣', '♥', '♦']
export const SUIT_NAMES = { '♠': 'spades', '♣': 'clubs', '♥': 'hearts', '♦': 'diamonds' }
export const RED_SUITS = ['♥', '♦']

export const RANKS_24 = ['9', '10', 'J', 'Q', 'K', 'A']
export const RANKS_36 = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
export const RANKS_52 = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

export const RANK_ORDER = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
}

// ─── Deck creation ───────────────────────────────────────────

export function createDeck(size = 36) {
  const ranks = size === 24 ? RANKS_24 : size === 52 ? RANKS_52 : RANKS_36
  const deck = []
  for (const suit of SUITS) {
    for (const rank of ranks) {
      deck.push({ suit, rank, id: `${rank}${suit}` })
    }
  }
  return deck
}

export function shuffleDeck(deck) {
  const d = [...deck]
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[d[i], d[j]] = [d[j], d[i]]
  }
  return d
}

// ─── Card comparison ─────────────────────────────────────────

// Returns true if `defenseCard` beats `attackCard`
export function cardBeats(defenseCard, attackCard, trump) {
  if (!defenseCard || !attackCard) return false
  const dRank = RANK_ORDER[defenseCard.rank]
  const aRank = RANK_ORDER[attackCard.rank]

  // Trump beats non-trump always
  if (defenseCard.suit === trump && attackCard.suit !== trump) return true
  // Non-trump cannot beat trump
  if (attackCard.suit === trump && defenseCard.suit !== trump) return false
  // Different non-trump suits: cannot beat
  if (defenseCard.suit !== attackCard.suit) return false
  // Same suit: higher rank wins
  return dRank > aRank
}

export function isRed(suit) {
  return RED_SUITS.includes(suit)
}

// ─── Game initialization ─────────────────────────────────────

export function initGame(settings, playerIds) {
  const { deck_size = 36, mode = 'throw-in', attack_type = 'all',
          fair_play = true, once_caught_stop = true } = settings

  const deck = shuffleDeck(createDeck(deck_size))

  // Deal 6 cards to each player
  const players = {}
  let deckIdx = 0
  for (const pid of playerIds) {
    players[pid] = { hand: [], score: 0, is_durak: false }
    for (let i = 0; i < 6 && deckIdx < deck.length; i++) {
      players[pid].hand.push(deck[deckIdx++])
    }
  }

  // Trump = last card in remaining deck
  const remainingDeck = deck.slice(deckIdx)
  const trumpCard = remainingDeck[remainingDeck.length - 1] || null
  const trump = trumpCard ? trumpCard.suit : SUITS[0]

  // Determine first attacker: player with lowest trump card
  const firstAttacker = findFirstAttacker(players, trump, playerIds)

  // Defender is next player after attacker
  const attackerIdx = playerIds.indexOf(firstAttacker)
  const defenderIdx = (attackerIdx + 1) % playerIds.length

  return {
    deck: remainingDeck,
    trump_card: trumpCard,
    trump,
    players,
    player_order: playerIds,
    attacker_id: firstAttacker,
    defender_id: playerIds[defenderIdx],
    table: [],           // Array of { attack: card, defense: card|null }
    graveyard: [],       // Discarded cards
    phase: 'attack',     // attack | defense | refill | finished
    mode,
    attack_type,
    fair_play,
    once_caught_stop,
    caught_this_round: false,   // Defender already took cards this round
    pass_count: 0,              // For passing mode chain tracking
    pass_origin: null,          // Original attacker in pass chain
    winner: null,
    turn_number: 0,
  }
}

function findFirstAttacker(players, trump, order) {
  let bestPlayer = order[0]
  let bestRank = Infinity

  for (const pid of order) {
    for (const card of players[pid].hand) {
      if (card.suit === trump) {
        const r = RANK_ORDER[card.rank]
        if (r < bestRank) {
          bestRank = r
          bestPlayer = pid
        }
      }
    }
  }
  return bestPlayer
}

// ─── Attack validation ────────────────────────────────────────

export function canAttack(gameState, attackerId, card) {
  const { table, players, attacker_id, once_caught_stop,
          caught_this_round, phase, player_order } = gameState

  // Allow attack in both 'attack' and 'defense' phases (for throw-ins)
  if (phase !== 'attack' && phase !== 'defense') {
    return { ok: false, reason: 'Není čas útočit' }
  }

  // Only attacker can start; others can throw in on existing table
  if (table.length === 0 && attackerId !== attacker_id) {
    return { ok: false, reason: 'Nejsi útočník' }
  }
  if (table.length > 0 && !canThrowIn(gameState, attackerId)) {
    return { ok: false, reason: 'Nemůžeš přihodit' }
  }

  // Check once_caught_stop
  if (once_caught_stop && caught_this_round) {
    return { ok: false, reason: 'Obránce už sebral, nelze přihodit' }
  }

  // Max 6 cards on table (or equal to defender's hand size)
  const attackCount = table.filter(s => s.attack).length
  const defenderId = gameState.defender_id
  const defenderHandSize = players[defenderId]?.hand.length ?? 0
  if (attackCount >= 6 || attackCount >= defenderHandSize) {
    return { ok: false, reason: 'Stůl je plný' }
  }

  // First attack: anything goes
  if (table.length === 0) return { ok: true }

  // Subsequent attacks: card rank must match a rank already on table
  const tableRanks = new Set()
  table.forEach(slot => {
    if (slot.attack) tableRanks.add(slot.attack.rank)
    if (slot.defense) tableRanks.add(slot.defense.rank)
  })

  if (!tableRanks.has(card.rank)) {
    return { ok: false, reason: `Hodnota ${card.rank} není na stole` }
  }

  return { ok: true }
}

function canThrowIn(gameState, playerId) {
  const { attack_type, player_order, defender_id, attacker_id } = gameState
  if (playerId === defender_id) return false
  if (playerId === attacker_id) return true

  if (attack_type === 'all') return true

  // neighbours only
  const defIdx = player_order.indexOf(defender_id)
  const n = player_order.length
  const left = player_order[(defIdx - 1 + n) % n]
  const right = player_order[(defIdx + 1) % n]
  return playerId === left || playerId === right
}

// ─── Defense validation ───────────────────────────────────────

export function canDefend(gameState, defenderId, attackCard, defenseCard) {
  const { trump, phase, defender_id } = gameState

  if (phase !== 'attack' && phase !== 'defense') {
    return { ok: false, reason: 'Není čas bránit se' }
  }
  if (defenderId !== defender_id) {
    return { ok: false, reason: 'Nejsi obránce' }
  }
  if (!attackCard || !defenseCard) {
    return { ok: false, reason: 'Chybí karta' }
  }

  // Find the undefended attack card on table
  const slot = gameState.table.find(
    s => s.attack.id === attackCard.id && !s.defense
  )
  if (!slot) return { ok: false, reason: 'Karta není na stole nebo je již pokryta' }

  if (!cardBeats(defenseCard, attackCard, trump)) {
    return { ok: false, reason: `${defenseCard.rank}${defenseCard.suit} tuto kartu nepokryje` }
  }

  return { ok: true }
}

// ─── Passing logic (Переводной) ───────────────────────────────

export function canPass(gameState, defenderId, card) {
  const { mode, table, player_order, defender_id, players } = gameState

  if (mode !== 'passing') return { ok: false, reason: 'Přesouvání není povoleno' }
  if (defenderId !== defender_id) return { ok: false, reason: 'Nejsi obránce' }

  // Can only pass if no cards have been defended yet
  const hasDefended = table.some(s => s.defense !== null)
  if (hasDefended) return { ok: false, reason: 'Již jsi bránil, nemůžeš přesunout' }

  // All cards on table must have the same rank as the passed card
  const tableRanks = new Set(table.map(s => s.attack.rank))
  if (tableRanks.size !== 1) return { ok: false, reason: 'Přesunout lze jen pokud jsou na stole karty jedné hodnoty' }
  if (!tableRanks.has(card.rank)) {
    return { ok: false, reason: `Přesouvat lze jen kartou hodnoty ${[...tableRanks][0]}` }
  }

  // Next player (after defender) must have enough cards to pick up
  const defIdx = player_order.indexOf(defender_id)
  const nextDefenderId = player_order[(defIdx + 1) % player_order.length]
  const nextDefender = players[nextDefenderId]
  const totalCards = table.length + 1 // current table + the passed card

  // CRITICAL CHECK: next defender must have enough cards
  if (nextDefender.hand.length < totalCards) {
    return { ok: false, reason: `Další hráč nemá dost karet (potřeba ${totalCards}, má ${nextDefender.hand.length})` }
  }

  // Cannot pass back to the attacker (would create infinite loop)
  const originalAttacker = gameState.pass_origin || gameState.attacker_id
  if (nextDefenderId === originalAttacker) {
    return { ok: false, reason: 'Nelze přesunout zpět útočníkovi' }
  }

  return { ok: true, nextDefenderId }
}

// ─── Apply moves ──────────────────────────────────────────────

export function applyAttack(gameState, attackerId, card) {
  const state = deepClone(gameState)
  
  // Remove card from attacker's hand
  state.players[attackerId].hand = state.players[attackerId].hand.filter(c => c.id !== card.id)

  // Add to table
  state.table.push({ attack: card, defense: null })
  state.phase = 'defense'

  return state
}

export function applyDefense(gameState, defenderId, attackCard, defenseCard) {
  const state = deepClone(gameState)

  // Remove card from defender's hand
  state.players[defenderId].hand = state.players[defenderId].hand.filter(c => c.id !== defenseCard.id)

  // Place defense card
  const slot = state.table.find(s => s.attack.id === attackCard.id && !s.defense)
  if (slot) slot.defense = defenseCard

  // Check if all attacks are defended
  const allDefended = state.table.every(s => s.defense !== null)
  if (allDefended) {
    state.phase = 'attack' // attackers can continue or end
  }

  return state
}

export function applyPass(gameState, defenderId, card) {
  const state = deepClone(gameState)
  const check = canPass(state, defenderId, card)
  if (!check.ok) return state

  // Remove card from current defender's hand
  state.players[defenderId].hand = state.players[defenderId].hand.filter(c => c.id !== card.id)

  // Add to table as attack
  state.table.push({ attack: card, defense: null })

  // Shift roles
  if (!state.pass_origin) state.pass_origin = state.attacker_id
  state.pass_count = (state.pass_count || 0) + 1

  const defIdx = state.player_order.indexOf(defenderId)
  const n = state.player_order.length
  state.defender_id = check.nextDefenderId
  state.attacker_id = state.player_order[(defIdx - 1 + n) % n]

  state.phase = 'defense'

  return state
}

// Defender takes all cards (sebrání)
export function applyTake(gameState, defenderId) {
  let state = deepClone(gameState)
  if (defenderId !== state.defender_id) return state

  // Give all table cards to defender
  const allCards = state.table.flatMap(slot => [slot.attack, slot.defense].filter(Boolean))
  state.players[defenderId].hand.push(...allCards)
  state.table = []
  state.caught_this_round = true

  // Refill all other players (not defender this turn)
  state = refillHands(state, false)

  // Next attacker is player after defender (defender sits out)
  state = advanceTurn(state, true) // skip_defender = true
  state.phase = 'attack'
  state.caught_this_round = false
  state.pass_origin = null
  state.pass_count = 0
  state.turn_number++

  // Check win condition
  state = checkWinCondition(state)

  return state
}

// Attacker ends attack (бито - all cards go to graveyard)
export function applyEndAttack(gameState, attackerId) {
  const state = deepClone(gameState)

  // Check if there are undefended cards
  const undefended = state.table.some(s => !s.defense)
  if (undefended) return state // Can't end if there are undefended cards

  // Discard all table cards
  const allCards = state.table.flatMap(slot => [slot.attack, slot.defense].filter(Boolean))
  state.graveyard.push(...allCards)
  state.table = []

  // Refill hands
  state = refillHands(state, true)

  // Advance turn normally
  state = advanceTurn(state, false)
  state.phase = 'attack'
  state.caught_this_round = false
  state.pass_origin = null
  state.pass_count = 0
  state.turn_number++

  state = checkWinCondition(state)

  return state
}

// ─── Hand refill ──────────────────────────────────────────────

function refillHands(state, includeDefender) {
  const { player_order, defender_id, attacker_id } = state

  const playersToRefill = includeDefender
    ? player_order
    : player_order.filter(id => id !== defender_id)

  // Attacker refills first, then the rest in order
  const ordered = [
    attacker_id,
    ...playersToRefill.filter(id => id !== attacker_id)
  ]

  for (const pid of ordered) {
    const player = state.players[pid]
    if (!player) continue
    while (player.hand.length < 6 && state.deck.length > 0) {
      player.hand.push(state.deck.shift())
    }
  }

  return state
}

// ─── Turn advancement ─────────────────────────────────────────

function advanceTurn(state, skipDefender) {
  const { player_order, defender_id } = state

  // Skip players with no cards (they've finished)
  const activePlayers = player_order.filter(id => state.players[id].hand.length > 0)

  if (activePlayers.length <= 1) {
    state.phase = 'finished'
    return state
  }

  const defIdx = player_order.indexOf(defender_id)
  const n = player_order.length

  // New attacker is current defender (unless they took cards)
  let newAttackerIdx = defIdx
  if (skipDefender) {
    // Defender took cards, skip them
    newAttackerIdx = (defIdx + 1) % n
    // Find next active player
    let tries = 0
    while (state.players[player_order[newAttackerIdx]].hand.length === 0 && tries < n) {
      newAttackerIdx = (newAttackerIdx + 1) % n
      tries++
    }
  }

  const newAttacker = player_order[newAttackerIdx]
  let newDefenderIdx = (newAttackerIdx + 1) % n
  let tries = 0
  while (
    (state.players[player_order[newDefenderIdx]].hand.length === 0 ||
     player_order[newDefenderIdx] === newAttacker) &&
    tries < n
  ) {
    newDefenderIdx = (newDefenderIdx + 1) % n
    tries++
  }

  state.attacker_id = newAttacker
  state.defender_id = player_order[newDefenderIdx]

  return state
}

// ─── Win condition ────────────────────────────────────────────

function checkWinCondition(state) {
  const { player_order, deck, players } = state

  // If deck is empty, players with no cards have finished (not durak)
  if (deck.length > 0) return state

  const activePlayers = player_order.filter(id => players[id].hand.length > 0)

  if (activePlayers.length === 1) {
    // Last player with cards is the DURAK (loser)
    state.players[activePlayers[0]].is_durak = true
    state.winner = activePlayers[0]
    state.phase = 'finished'
  } else if (activePlayers.length === 0) {
    // Draw (rare)
    state.phase = 'finished'
  }

  return state
}

// ─── Helper ───────────────────────────────────────────────────

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

export function getActiveSlots(table) {
  return table.filter(s => s.attack !== null)
}

export function getUndefendedSlots(table) {
  return table.filter(s => s.attack !== null && s.defense === null)
}

export function sortHand(hand, trump) {
  return [...hand].sort((a, b) => {
    // Trump suit last
    const aT = a.suit === trump ? 1 : 0
    const bT = b.suit === trump ? 1 : 0
    if (aT !== bT) return aT - bT
    // By suit
    if (a.suit !== b.suit) return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit)
    // By rank
    return RANK_ORDER[a.rank] - RANK_ORDER[b.rank]
  })
}

export function getPlayerPosition(playerIndex, totalPlayers, currentPlayerIndex) {
  // Returns position label for UI layout
  const positions = ['bottom', 'left', 'top', 'right', 'top-left', 'top-right']
  const relative = (playerIndex - currentPlayerIndex + totalPlayers) % totalPlayers
  return positions[relative] || 'top'
}
