import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Confetti from 'react-confetti'
import Timer from './Timer'
import SceneBackground from './SceneBackground'
import { categories } from '../assets/categories'
import type { GameState } from '../App'

const CHANNEL_NAME = 'song-battle-channel'

type PlayerKey = 'p1' | 'p2'

interface YouTubeResult {
  id: { videoId: string }
  snippet: { title: string; thumbnails: { medium: { url: string } } }
}

/* ─── Lifeline icon SVGs ─────────────────────────────────────────── */
function IconClue() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}
function IconClock() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}
function IconDoubleDown() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="7 7 12 12 17 7" />
      <polyline points="7 13 12 18 17 13" />
    </svg>
  )
}
function IconVeto() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  )
}
function IconHype() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}
function IconSwap() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  )
}
function IconSteal() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

/* ─── Lifeline button component ──────────────────────────────────── */
function LifelineBtn({
  icon,
  label,
  available,
  onClick,
  accentClass,
}: {
  icon: React.ReactNode
  label: string
  available: boolean
  onClick: () => void
  accentClass: string
}) {
  return (
    <motion.button
      whileTap={available ? { scale: 0.93 } : undefined}
      onClick={onClick}
      disabled={!available}
      className={`glass-btn flex flex-col items-center gap-1.5 py-3 px-2 ${accentClass}`}
    >
      <span className="opacity-80">{icon}</span>
      <span className="text-[11px] leading-tight font-medium">{label}</span>
      {!available && (
        <span className="text-[9px] uppercase tracking-wider opacity-40">
          Used
        </span>
      )}
    </motion.button>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function BattleScreen({
  state,
  setState,
}: {
  state: GameState
  setState: React.Dispatch<React.SetStateAction<GameState>>
}) {
  const [turn, setTurn] = useState<PlayerKey>('p1')
  const [p1Song, setP1Song] = useState('')
  const [p2Song, setP2Song] = useState('')
  const [judging, setJudging] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [ready, setReady] = useState(false)
  const [opponentThinking, setOpponentThinking] = useState(false)
  const [crowdVotes, setCrowdVotes] = useState({ up: 0, down: 0 })
  const [searchResultsP1, setSearchResultsP1] = useState<YouTubeResult[]>([])
  const [searchResultsP2, setSearchResultsP2] = useState<YouTubeResult[]>([])
  const [shakeSubmit, setShakeSubmit] = useState(false)
  const [clueText, setClueText] = useState<string | null>(null)

  const isP1 = turn === 'p1'
  const isSplitMode = state.splitMode
  const channelRef = useRef<BroadcastChannel | null>(null)

  // ─── BroadcastChannel setup ────────────────────────────────────────
  useEffect(() => {
    if (!isSplitMode) return
    channelRef.current = new BroadcastChannel(CHANNEL_NAME)
    channelRef.current.onmessage = (ev) => {
      const data = ev.data
      if (data.type === 'stateUpdate') {
        setState(data.payload)
      } else if (data.type === 'pickSubmitted') {
        if (data.player === 'p1') setP1Song(data.song)
        if (data.player === 'p2') {
          setP2Song(data.song)
          setJudging(true)
        }
      } else if (data.type === 'ready') {
        setOpponentThinking(true)
        setTimeout(() => setOpponentThinking(false), Math.random() * 5000 + 3000)
      } else if (data.type === 'roundReset') {
        resetRoundLocal()
      }
    }
    return () => { channelRef.current?.close() }
  }, [isSplitMode])

  const broadcast = useCallback(
    (type: string, payload?: unknown) => {
      if (!channelRef.current || !isSplitMode) return
      channelRef.current.postMessage({ type, payload })
    },
    [isSplitMode],
  )

  // ─── Category lifecycle ────────────────────────────────────────────
  useEffect(() => {
    if (state.currentCategory) return
    const unused = categories.filter(c => !state.usedCategories.includes(c.name))
    const pool = unused.length > 0 ? unused : categories
    const pick = pool[Math.floor(Math.random() * pool.length)]
    setState(s => ({
      ...s,
      currentCategory: pick.name,
      usedCategories: [...s.usedCategories, pick.name],
    }))
  }, [state.currentCategory])

  // ─── YouTube search ────────────────────────────────────────────────
  const searchSong = async (query: string, forPlayer: PlayerKey) => {
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY
    if (!apiKey) return
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
          query + ' official audio',
        )}&type=video&maxResults=1&key=${apiKey}`,
      )
      const data = await res.json()
      const results: YouTubeResult[] = data.items || []
      if (forPlayer === 'p1') setSearchResultsP1(results)
      else setSearchResultsP2(results)
    } catch (err) {
      console.error('YouTube search failed', err)
    }
  }

  useEffect(() => {
    if (!judging) return
    if (p1Song) searchSong(p1Song, 'p1')
    if (p2Song) searchSong(p2Song, 'p2')
  }, [judging])

  // ─── Helpers ───────────────────────────────────────────────────────
  const currentCategory = categories.find(c => c.name === state.currentCategory)

  const resetRoundLocal = () => {
    setP1Song('')
    setP2Song('')
    setJudging(false)
    setTurn('p1')
    setReady(false)
    setOpponentThinking(false)
    setCrowdVotes({ up: 0, down: 0 })
    setSearchResultsP1([])
    setSearchResultsP2([])
    setClueText(null)
  }

  const resetRound = () => {
    resetRoundLocal()
    setState(s => ({ ...s, roundValue: 1, lastMessage: undefined }))
    broadcast('roundReset')
  }

  const triggerShake = () => {
    setShakeSubmit(true)
    setTimeout(() => setShakeSubmit(false), 500)
  }

  // ─── Lifeline handlers ────────────────────────────────────────────
  const handleJudgesClue = () => {
    if (!state.lifelines.judgesClue[turn]) return
    triggerShake()
    const hints = currentCategory?.hints || ['No hints available']
    const hint = hints[Math.floor(Math.random() * hints.length)]
    setClueText(hint)
    setState(s => ({
      ...s,
      lifelines: { ...s.lifelines, judgesClue: { ...s.lifelines.judgesClue, [turn]: false } },
      lastMessage: `${isP1 ? s.player1.name : s.player2.name} used Judge's Clue!`,
    }))
  }

  const handleVeto = () => {
    if (!state.lifelines.veto[turn]) return
    triggerShake()
    const opponent: PlayerKey = isP1 ? 'p2' : 'p1'
    setState(s => ({
      ...s,
      lifelines: { ...s.lifelines, veto: { ...s.lifelines.veto, [turn]: false } },
      lastMessage: `${isP1 ? s.player1.name : s.player2.name} used Veto! Opponent must re-pick.`,
    }))
    if (judging) {
      if (opponent === 'p1') setP1Song('')
      else setP2Song('')
      setJudging(false)
      setTurn(opponent)
      setReady(true)
    }
  }

  const handleDoubleDown = () => {
    if (state.round !== 3 || !state.lifelines.doubleDown[turn]) return
    triggerShake()
    setState(s => ({
      ...s,
      roundValue: s.roundValue * 2,
      lifelines: { ...s.lifelines, doubleDown: { ...s.lifelines.doubleDown, [turn]: false } },
      lastMessage: `${isP1 ? s.player1.name : s.player2.name} used Double Down! Points are now ${s.roundValue * 2}x!`,
    }))
  }

  const handleCrowdHype = () => {
    if (!state.lifelines.crowdHype[turn]) return
    triggerShake()
    setState(s => ({
      ...s,
      roundValue: s.roundValue + 1,
      lifelines: { ...s.lifelines, crowdHype: { ...s.lifelines.crowdHype, [turn]: false } },
      lastMessage: `${isP1 ? s.player1.name : s.player2.name} hyped the crowd! +1 bonus point if they win!`,
    }))
  }

  const handleSongSwap = () => {
    if (!state.lifelines.songSwap[turn]) return
    triggerShake()
    if (judging) {
      setJudging(false)
      setTurn(turn)
      setReady(true)
    }
    setState(s => ({
      ...s,
      lifelines: { ...s.lifelines, songSwap: { ...s.lifelines.songSwap, [turn]: false } },
      lastMessage: `${isP1 ? s.player1.name : s.player2.name} used Song Swap! Pick a new song.`,
    }))
  }

  const handleStealPick = () => {
    if (!state.lifelines.stealPick[turn]) return
    triggerShake()
    if (judging) {
      const temp = p1Song
      setP1Song(p2Song)
      setP2Song(temp)
    }
    setState(s => ({
      ...s,
      lifelines: { ...s.lifelines, stealPick: { ...s.lifelines.stealPick, [turn]: false } },
      lastMessage: `${isP1 ? s.player1.name : s.player2.name} stole the opponent's pick! Songs swapped!`,
    }))
  }

  const handleTimeOut = () => {
    if (!state.lifelines.timeOut[turn]) return
    triggerShake()
    setState(s => ({
      ...s,
      lifelines: { ...s.lifelines, timeOut: { ...s.lifelines.timeOut, [turn]: false } },
      lastMessage: `${isP1 ? s.player1.name : s.player2.name} called Time Out! Extra 30 seconds!`,
    }))
  }

  const handlePhoneFriend = () => {
    if (!state.lifelines.phoneFriend[turn]) return
    triggerShake()
    const suggestions = [
      'Your friend says: "Go with a classic everyone knows!"',
      'Your friend says: "Pick something with a great chorus!"',
      'Your friend says: "Think about what fits the vibe, not just what you like!"',
      'Your friend says: "Sometimes the underdog pick wins — surprise the judge!"',
      'Your friend says: "Go with your gut feeling!"',
    ]
    setState(s => ({
      ...s,
      lifelines: { ...s.lifelines, phoneFriend: { ...s.lifelines.phoneFriend, [turn]: false } },
      lastMessage: suggestions[Math.floor(Math.random() * suggestions.length)],
    }))
  }

  // ─── Submit & Award ────────────────────────────────────────────────
  const submitPick = () => {
    const song = isP1 ? p1Song.trim() : p2Song.trim()
    if (!song) return
    triggerShake()
    broadcast('pickSubmitted', { player: turn, song })
    if (isP1) {
      setTurn('p2')
      setReady(false)
      setClueText(null)
    } else {
      setJudging(true)
    }
  }

  const awardRound = (winner: 'p1' | 'p2' | 'tie') => {
    const points = state.roundValue
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 2500)

    setState(s => {
      const newP1Score =
        winner === 'p1' ? s.player1.score + points :
        winner === 'tie' ? s.player1.score + Math.ceil(points / 2) :
        s.player1.score
      const newP2Score =
        winner === 'p2' ? s.player2.score + points :
        winner === 'tie' ? s.player2.score + Math.ceil(points / 2) :
        s.player2.score

      const nextRound = s.round + 1
      if (nextRound > 3) {
        const catWinnerKey = newP1Score > newP2Score ? 'p1' : newP2Score > newP1Score ? 'p2' : null
        const newP1CatWins = catWinnerKey === 'p1' ? s.player1.categoriesWon + 1 : s.player1.categoriesWon
        const newP2CatWins = catWinnerKey === 'p2' ? s.player2.categoriesWon + 1 : s.player2.categoriesWon
        const nextCategoriesPlayed = s.categoriesPlayed + 1
        if (nextCategoriesPlayed >= s.totalCategories) {
          return {
            ...s,
            phase: 'gameover' as const,
            player1: { ...s.player1, score: newP1Score, categoriesWon: newP1CatWins },
            player2: { ...s.player2, score: newP2Score, categoriesWon: newP2CatWins },
            lastMessage: winner === 'tie' ? "It's a tie this round!" : `${winner === 'p1' ? s.player1.name : s.player2.name} wins this round!`,
          }
        }
        return {
          ...s,
          player1: { ...s.player1, score: newP1Score, categoriesWon: newP1CatWins },
          player2: { ...s.player2, score: newP2Score, categoriesWon: newP2CatWins },
          round: 1, roundValue: 1, currentCategory: null, categoriesPlayed: nextCategoriesPlayed,
          lastMessage: `Category complete! ${catWinnerKey ? `${catWinnerKey === 'p1' ? s.player1.name : s.player2.name} wins the category!` : 'Category tied!'} Next category...`,
        }
      }
      return {
        ...s,
        player1: { ...s.player1, score: newP1Score },
        player2: { ...s.player2, score: newP2Score },
        round: nextRound, roundValue: 1,
        lastMessage: winner === 'tie' ? "It's a tie this round!" : `${winner === 'p1' ? s.player1.name : s.player2.name} wins! +${points} pt${points > 1 ? 's' : ''}`,
      }
    })
    resetRound()
  }

  const handleReady = () => {
    setReady(true)
    broadcast('ready', { player: turn })
    if (isSplitMode) {
      setOpponentThinking(true)
      setTimeout(() => setOpponentThinking(false), Math.random() * 5000 + 3000)
    }
  }

  const handleTimeUp = () => {
    if (isP1) {
      if (!p1Song.trim()) setP1Song('(no pick)')
      setTurn('p2')
      setReady(false)
      setClueText(null)
    } else {
      if (!p2Song.trim()) setP2Song('(no pick)')
      setJudging(true)
    }
  }

  // ─── Derived ───────────────────────────────────────────────────────
  const playerName = isP1 ? state.player1.name : state.player2.name
  const timerSeconds = state.lifelines.timeOut[turn] === false ? 60 : 30

  const renderYouTubeEmbed = (results: YouTubeResult[], label: string) => {
    if (!results[0]) return null
    return (
      <div className="mt-3">
        <div className="text-[11px] text-white/40 uppercase tracking-wider mb-2">
          Preview
        </div>
        <div className="rounded-lg overflow-hidden border border-white/[0.06]">
          <iframe
            width="100%"
            height="160"
            src={`https://www.youtube.com/embed/${results[0].id.videoId}?autoplay=1&mute=1&start=0&end=30&rel=0`}
            title={`${label} preview`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <p className="text-[11px] text-white/30 mt-1.5 truncate">
          {results[0].snippet.title}
        </p>
      </div>
    )
  }

  // ─── Scoreboard component ─────────────────────────────────────────
  const Scoreboard = () => {
    const total = state.player1.score + state.player2.score
    const p1Pct = total > 0 ? (state.player1.score / total) * 100 : 50

    return (
      <div className="mb-6">
        {/* Score row */}
        <div className="flex items-end justify-between mb-3">
          <div className="text-left">
            <div className="text-xs text-white/40 uppercase tracking-wider mb-0.5">
              {state.player1.name}
            </div>
            <div className="font-display text-3xl font-bold text-blue-400">
              {state.player1.score}
            </div>
          </div>

          <div className="text-center flex-1 px-4">
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">
              Round {state.round}/3
              {state.roundValue > 1 && (
                <span className="text-amber-400 ml-1">{state.roundValue}x</span>
              )}
            </div>
            {/* VS badge */}
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08]">
              <span className="font-display text-xs font-bold text-white/40">VS</span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-white/40 uppercase tracking-wider mb-0.5">
              {state.player2.name}
            </div>
            <div className="font-display text-3xl font-bold text-pink-400">
              {state.player2.score}
            </div>
          </div>
        </div>

        {/* Score bar */}
        <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden flex">
          <div
            className="h-full bg-blue-400 transition-all duration-700 ease-out"
            style={{
              width: `${p1Pct}%`,
              boxShadow: '0 0 8px rgba(96,165,250,0.4)',
            }}
          />
          <div
            className="h-full bg-pink-400 transition-all duration-700 ease-out"
            style={{
              width: `${100 - p1Pct}%`,
              boxShadow: '0 0 8px rgba(244,114,182,0.4)',
            }}
          />
        </div>

        {/* Meta row */}
        <div className="flex justify-between mt-2 text-[10px] text-white/30 uppercase tracking-wider">
          <span>{state.player1.categoriesWon} cat wins</span>
          <span>
            Game {state.categoriesPlayed + 1}/{state.totalCategories}
          </span>
          <span>{state.player2.categoriesWon} cat wins</span>
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════════════════════ */
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 sm:p-6">
      <SceneBackground />

      {/* Confetti */}
      <AnimatePresence>
        {showConfetti && (
          <Confetti
            numberOfPieces={200}
            recycle={false}
            style={{ position: 'fixed', top: 0, left: 0, zIndex: 50 }}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-xl glass-card-elevated p-6 sm:p-8"
      >
        {/* Category header */}
        <motion.div
          key={state.currentCategory}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4"
        >
          <div className="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-1">
            Category
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold gradient-text-hero">
            {state.currentCategory || 'Loading...'}
          </h2>
        </motion.div>

        {/* Scoreboard */}
        <Scoreboard />

        {/* Event message */}
        <AnimatePresence mode="wait">
          {state.lastMessage && (
            <motion.div
              key={state.lastMessage}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-5 text-center py-2.5 px-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300/90 text-sm"
            >
              {state.lastMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── PICKING PHASE ──────────────────────────────────────── */}
        {!judging ? (
          <AnimatePresence mode="wait">
            <motion.div
              className="space-y-5"
              key={`picking-${turn}-${state.round}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              {!ready ? (
                /* ── Ready gate ── */
                <div className="text-center py-10">
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
                    style={{
                      background: isP1
                        ? 'radial-gradient(circle, rgba(96,165,250,0.15) 0%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(244,114,182,0.15) 0%, transparent 70%)',
                      boxShadow: isP1
                        ? '0 0 40px rgba(96,165,250,0.15)'
                        : '0 0 40px rgba(244,114,182,0.15)',
                    }}
                  >
                    <span className="font-display text-3xl font-bold" style={{ color: isP1 ? '#60a5fa' : '#f472b6' }}>
                      {isP1 ? '1' : '2'}
                    </span>
                  </motion.div>
                  <h3 className="text-xl mb-2 text-white/80">
                    <span className="font-bold" style={{ color: isP1 ? '#60a5fa' : '#f472b6' }}>
                      {playerName}
                    </span>
                  </h3>
                  <p className="text-sm text-white/40 mb-8">
                    Ready to pick your song?
                  </p>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={handleReady}
                    className="glass-btn px-10 py-4 text-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                  >
                    I&apos;m Ready
                  </motion.button>
                </div>
              ) : opponentThinking && isSplitMode ? (
                /* ── Opponent thinking ── */
                <div className="text-center py-14">
                  <div className="text-lg text-white/60 mb-6">
                    Opponent is thinking&hellip;
                  </div>
                  <div className="flex justify-center gap-2">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="w-2.5 h-2.5 rounded-full bg-purple-400"
                        animate={{ y: [0, -14, 0] }}
                        transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                /* ── Song input ── */
                <>
                  <div className="text-center">
                    <span className="text-sm text-white/40">
                      <span className="font-semibold" style={{ color: isP1 ? '#60a5fa' : '#f472b6' }}>
                        {playerName}
                      </span>
                      &apos;s turn
                    </span>
                  </div>

                  <Timer seconds={timerSeconds} onEnd={handleTimeUp} />

                  {/* Clue display */}
                  <AnimatePresence>
                    {clueText && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3.5 text-center text-sm">
                          <span className="text-indigo-300/80 font-medium">Clue:</span>{' '}
                          <span className="text-white/70">{clueText}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Input */}
                  <input
                    type="text"
                    value={isP1 ? p1Song : p2Song}
                    onChange={e => isP1 ? setP1Song(e.target.value) : setP2Song(e.target.value)}
                    placeholder="Song Title — Artist"
                    className="w-full py-4 px-5 glass-input text-white placeholder-white/20 text-base"
                    autoFocus
                  />

                  {/* Submit */}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={submitPick}
                    disabled={!(isP1 ? p1Song.trim() : p2Song.trim())}
                    className={`glass-btn w-full py-4 text-base bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-glow-purple disabled:shadow-none disabled:from-gray-700 disabled:to-gray-700 ${shakeSubmit ? 'animate-shake' : ''}`}
                  >
                    Submit Pick
                  </motion.button>

                  {/* Lifeline grid */}
                  <div className="grid grid-cols-4 gap-2">
                    <LifelineBtn icon={<IconClue />} label="Clue" available={state.lifelines.judgesClue[turn]} onClick={handleJudgesClue} accentClass="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300" />
                    <LifelineBtn icon={<IconClock />} label="Time Out" available={state.lifelines.timeOut[turn]} onClick={handleTimeOut} accentClass="bg-teal-500/10 border border-teal-500/20 text-teal-300" />
                    <LifelineBtn icon={<IconPhone />} label="Phone" available={state.lifelines.phoneFriend[turn]} onClick={handlePhoneFriend} accentClass="bg-cyan-500/10 border border-cyan-500/20 text-cyan-300" />
                    <LifelineBtn icon={<IconDoubleDown />} label="Double" available={state.round === 3 && state.lifelines.doubleDown[turn]} onClick={handleDoubleDown} accentClass="bg-red-500/10 border border-red-500/20 text-red-300" />
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          /* ─── JUDGING PHASE ─────────────────────────────────────── */
          <motion.div
            className="space-y-5"
            key="judging"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Song cards side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* P1 card */}
              <motion.div
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="relative rounded-2xl p-4 overflow-hidden"
                style={{
                  background: 'rgba(96,165,250,0.06)',
                  border: '1px solid rgba(96,165,250,0.15)',
                  boxShadow: '0 0 30px rgba(96,165,250,0.08)',
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-blue-400">1</span>
                  </div>
                  <span className="text-sm font-semibold text-blue-400">
                    {state.player1.name}
                  </span>
                </div>
                <div className="font-display text-lg font-bold text-white/90 break-words">
                  {p1Song || '(no pick)'}
                </div>
                {renderYouTubeEmbed(searchResultsP1, state.player1.name)}
              </motion.div>

              {/* P2 card */}
              <motion.div
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="relative rounded-2xl p-4 overflow-hidden"
                style={{
                  background: 'rgba(244,114,182,0.06)',
                  border: '1px solid rgba(244,114,182,0.15)',
                  boxShadow: '0 0 30px rgba(244,114,182,0.08)',
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-pink-500/20 border border-pink-400/30 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-pink-400">2</span>
                  </div>
                  <span className="text-sm font-semibold text-pink-400">
                    {state.player2.name}
                  </span>
                </div>
                <div className="font-display text-lg font-bold text-white/90 break-words">
                  {p2Song || '(no pick)'}
                </div>
                {renderYouTubeEmbed(searchResultsP2, state.player2.name)}
              </motion.div>
            </div>

            {/* Crowd vote */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl p-4 bg-white/[0.03] border border-white/[0.06]"
            >
              <div className="text-[10px] text-white/30 uppercase tracking-[0.15em] text-center mb-3">
                Crowd Vote
              </div>
              <div className="flex justify-center gap-6">
                <motion.button
                  whileTap={{ scale: 1.25 }}
                  onClick={() => setCrowdVotes(v => ({ ...v, up: v.up + 1 }))}
                  className="flex flex-col items-center gap-1 select-none group"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl group-hover:bg-emerald-500/20 transition-colors">
                    <span role="img" aria-label="thumbs up">👍</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-400 tabular-nums">
                    {crowdVotes.up}
                  </span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 1.25 }}
                  onClick={() => setCrowdVotes(v => ({ ...v, down: v.down + 1 }))}
                  className="flex flex-col items-center gap-1 select-none group"
                >
                  <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-xl group-hover:bg-red-500/20 transition-colors">
                    <span role="img" aria-label="thumbs down">👎</span>
                  </div>
                  <span className="text-lg font-bold text-red-400 tabular-nums">
                    {crowdVotes.down}
                  </span>
                </motion.button>
              </div>
              {(crowdVotes.up > 0 || crowdVotes.down > 0) && (
                <div className={`mt-2.5 text-center text-xs font-medium ${
                  crowdVotes.up > crowdVotes.down ? 'text-emerald-400/70' :
                  crowdVotes.down > crowdVotes.up ? 'text-red-400/70' :
                  'text-white/30'
                }`}>
                  Crowd leans {
                    crowdVotes.up > crowdVotes.down ? state.player1.name :
                    crowdVotes.down > crowdVotes.up ? state.player2.name :
                    'neutral'
                  }
                </div>
              )}
            </motion.div>

            {/* Judge decision */}
            <div>
              <div className="text-[10px] text-white/30 uppercase tracking-[0.15em] text-center mb-3">
                Judge&apos;s Decision
              </div>
              <div className="grid grid-cols-3 gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => awardRound('p1')}
                  className="glass-btn py-4 bg-blue-500/15 border border-blue-500/25 text-blue-300 hover:bg-blue-500/25"
                >
                  <div className="font-bold text-base">{state.player1.name}</div>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => awardRound('tie')}
                  className="glass-btn py-4 bg-white/[0.04] border border-white/[0.08] text-white/50 hover:bg-white/[0.08]"
                >
                  <div className="font-bold text-base">Tie</div>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => awardRound('p2')}
                  className="glass-btn py-4 bg-pink-500/15 border border-pink-500/25 text-pink-300 hover:bg-pink-500/25"
                >
                  <div className="font-bold text-base">{state.player2.name}</div>
                </motion.button>
              </div>
            </div>

            {/* Judging-phase lifelines */}
            <div className="grid grid-cols-4 gap-2">
              <LifelineBtn icon={<IconVeto />} label="Veto" available={state.lifelines.veto[turn]} onClick={handleVeto} accentClass="bg-amber-500/10 border border-amber-500/20 text-amber-300" />
              <LifelineBtn icon={<IconHype />} label="Hype" available={state.lifelines.crowdHype[turn]} onClick={handleCrowdHype} accentClass="bg-pink-500/10 border border-pink-500/20 text-pink-300" />
              <LifelineBtn icon={<IconSwap />} label="Swap" available={state.lifelines.songSwap[turn]} onClick={handleSongSwap} accentClass="bg-orange-500/10 border border-orange-500/20 text-orange-300" />
              <LifelineBtn icon={<IconSteal />} label="Steal" available={state.lifelines.stealPick[turn]} onClick={handleStealPick} accentClass="bg-purple-500/10 border border-purple-500/20 text-purple-300" />
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
