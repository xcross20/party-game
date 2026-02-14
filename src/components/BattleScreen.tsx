import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Confetti from 'react-confetti'
import Timer from './Timer'
import { categories } from '../assets/categories'
import type { GameState } from '../App'

const CHANNEL_NAME = 'song-battle-channel'

type PlayerKey = 'p1' | 'p2'

interface YouTubeResult {
  id: { videoId: string }
  snippet: { title: string; thumbnails: { medium: { url: string } } }
}

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
  const [shakeLifeline, setShakeLifeline] = useState(false)
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
        setTimeout(
          () => setOpponentThinking(false),
          Math.random() * 5000 + 3000,
        )
      } else if (data.type === 'roundReset') {
        resetRoundLocal()
      }
    }

    return () => {
      channelRef.current?.close()
    }
  }, [isSplitMode])

  const broadcast = useCallback(
    (type: string, payload?: unknown) => {
      if (!channelRef.current || !isSplitMode) return
      channelRef.current.postMessage({ type, payload })
    },
    [isSplitMode],
  )

  // ─── Pick a random unused category on mount / new category ─────────
  useEffect(() => {
    if (state.currentCategory) return

    const unused = categories.filter(
      c => !state.usedCategories.includes(c.name),
    )
    const pool = unused.length > 0 ? unused : categories
    const pick = pool[Math.floor(Math.random() * pool.length)]

    setState(s => ({
      ...s,
      currentCategory: pick.name,
      usedCategories: [...s.usedCategories, pick.name],
    }))
  }, [state.currentCategory])

  // ─── YouTube search for previews ───────────────────────────────────
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

  const triggerShake = (which: 'submit' | 'lifeline') => {
    if (which === 'submit') {
      setShakeSubmit(true)
      setTimeout(() => setShakeSubmit(false), 500)
    } else {
      setShakeLifeline(true)
      setTimeout(() => setShakeLifeline(false), 500)
    }
  }

  // ─── Lifeline handlers ────────────────────────────────────────────
  const handleJudgesClue = () => {
    if (!state.lifelines.judgesClue[turn]) return
    triggerShake('lifeline')
    const hints = currentCategory?.hints || ['No hints available']
    const hint = hints[Math.floor(Math.random() * hints.length)]
    setClueText(hint)
    setState(s => ({
      ...s,
      lifelines: {
        ...s.lifelines,
        judgesClue: { ...s.lifelines.judgesClue, [turn]: false },
      },
      lastMessage: `${isP1 ? s.player1.name : s.player2.name} used Judge's Clue!`,
    }))
  }

  const handleVeto = () => {
    if (!state.lifelines.veto[turn]) return
    triggerShake('lifeline')

    // Veto forces opponent to re-pick
    const opponent: PlayerKey = isP1 ? 'p2' : 'p1'
    setState(s => ({
      ...s,
      lifelines: {
        ...s.lifelines,
        veto: { ...s.lifelines.veto, [turn]: false },
      },
      lastMessage: `${isP1 ? s.player1.name : s.player2.name} used Veto! Opponent must re-pick.`,
    }))

    // In judging phase, reset opponent's song and go back to their turn
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
    triggerShake('lifeline')
    setState(s => ({
      ...s,
      roundValue: s.roundValue * 2,
      lifelines: {
        ...s.lifelines,
        doubleDown: { ...s.lifelines.doubleDown, [turn]: false },
      },
      lastMessage: `${isP1 ? s.player1.name : s.player2.name} used Double Down! Points are now ${s.roundValue * 2}×!`,
    }))
  }

  const handleCrowdHype = () => {
    if (!state.lifelines.crowdHype[turn]) return
    triggerShake('lifeline')
    // Crowd hype adds +1 bonus point to the user if they win this round
    setState(s => ({
      ...s,
      roundValue: s.roundValue + 1,
      lifelines: {
        ...s.lifelines,
        crowdHype: { ...s.lifelines.crowdHype, [turn]: false },
      },
      lastMessage: `${isP1 ? s.player1.name : s.player2.name} hyped the crowd! +1 bonus point if they win!`,
    }))
  }

  const handleSongSwap = () => {
    if (!state.lifelines.songSwap[turn]) return
    triggerShake('lifeline')
    // Allow current player to change their pick
    if (judging) {
      setJudging(false)
      setTurn(turn)
      setReady(true)
    }
    setState(s => ({
      ...s,
      lifelines: {
        ...s.lifelines,
        songSwap: { ...s.lifelines.songSwap, [turn]: false },
      },
      lastMessage: `${isP1 ? s.player1.name : s.player2.name} used Song Swap! Pick a new song.`,
    }))
  }

  const handleStealPick = () => {
    if (!state.lifelines.stealPick[turn]) return
    triggerShake('lifeline')
    // Steal opponent's song: swap the picks
    if (judging) {
      const temp = p1Song
      setP1Song(p2Song)
      setP2Song(temp)
    }
    setState(s => ({
      ...s,
      lifelines: {
        ...s.lifelines,
        stealPick: { ...s.lifelines.stealPick, [turn]: false },
      },
      lastMessage: `${isP1 ? s.player1.name : s.player2.name} stole the opponent's pick! Songs swapped!`,
    }))
  }

  const handleTimeOut = () => {
    if (!state.lifelines.timeOut[turn]) return
    triggerShake('lifeline')
    setState(s => ({
      ...s,
      lifelines: {
        ...s.lifelines,
        timeOut: { ...s.lifelines.timeOut, [turn]: false },
      },
      lastMessage: `${isP1 ? s.player1.name : s.player2.name} called Time Out! Extra 30 seconds!`,
    }))
  }

  const handlePhoneFriend = () => {
    if (!state.lifelines.phoneFriend[turn]) return
    triggerShake('lifeline')
    // Generate a random "friend suggestion"
    const suggestions = [
      'Your friend says: "Go with a classic everyone knows!"',
      'Your friend says: "Pick something with a great chorus!"',
      'Your friend says: "Think about what fits the vibe, not just what you like!"',
      'Your friend says: "Sometimes the underdog pick wins — surprise the judge!"',
      'Your friend says: "Go with your gut feeling!"',
    ]
    const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)]
    setState(s => ({
      ...s,
      lifelines: {
        ...s.lifelines,
        phoneFriend: { ...s.lifelines.phoneFriend, [turn]: false },
      },
      lastMessage: suggestion,
    }))
  }

  // ─── Submit & Award ────────────────────────────────────────────────
  const submitPick = () => {
    const song = isP1 ? p1Song.trim() : p2Song.trim()
    if (!song) return

    triggerShake('submit')
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

    // Confetti burst
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 2000)

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
      const roundsPerCategory = 3

      // Check if category is done
      if (nextRound > roundsPerCategory) {
        // Award category win
        const catWinnerKey =
          newP1Score > newP2Score ? 'p1' :
          newP2Score > newP1Score ? 'p2' :
          null

        const newP1CatWins =
          catWinnerKey === 'p1'
            ? s.player1.categoriesWon + 1
            : s.player1.categoriesWon
        const newP2CatWins =
          catWinnerKey === 'p2'
            ? s.player2.categoriesWon + 1
            : s.player2.categoriesWon

        const nextCategoriesPlayed = s.categoriesPlayed + 1

        // Check if game is over
        if (nextCategoriesPlayed >= s.totalCategories) {
          return {
            ...s,
            phase: 'gameover' as const,
            player1: {
              ...s.player1,
              score: newP1Score,
              categoriesWon: newP1CatWins,
            },
            player2: {
              ...s.player2,
              score: newP2Score,
              categoriesWon: newP2CatWins,
            },
            lastMessage:
              winner === 'tie'
                ? "It's a tie this round!"
                : `${winner === 'p1' ? s.player1.name : s.player2.name} wins this round!`,
          }
        }

        // Next category
        return {
          ...s,
          player1: {
            ...s.player1,
            score: newP1Score,
            categoriesWon: newP1CatWins,
          },
          player2: {
            ...s.player2,
            score: newP2Score,
            categoriesWon: newP2CatWins,
          },
          round: 1,
          roundValue: 1,
          currentCategory: null, // triggers re-pick
          categoriesPlayed: nextCategoriesPlayed,
          lastMessage: `Category complete! ${
            catWinnerKey
              ? `${catWinnerKey === 'p1' ? s.player1.name : s.player2.name} wins the category!`
              : 'Category tied!'
          } Moving to next category...`,
        }
      }

      // Next round in same category
      return {
        ...s,
        player1: { ...s.player1, score: newP1Score },
        player2: { ...s.player2, score: newP2Score },
        round: nextRound,
        roundValue: 1,
        lastMessage:
          winner === 'tie'
            ? "It's a tie this round!"
            : `${winner === 'p1' ? s.player1.name : s.player2.name} wins this round! +${points} point${points > 1 ? 's' : ''}`,
      }
    })

    resetRound()
  }

  const handleReady = () => {
    setReady(true)
    broadcast('ready', { player: turn })
    if (isSplitMode) {
      setOpponentThinking(true)
      setTimeout(
        () => setOpponentThinking(false),
        Math.random() * 5000 + 3000,
      )
    }
  }

  const handleTimeUp = () => {
    // Auto-submit empty or skip turn
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

  // ─── Render helpers ────────────────────────────────────────────────
  const playerName = isP1 ? state.player1.name : state.player2.name
  const timerSeconds = state.lifelines.timeOut[turn] === false ? 60 : 30

  const renderYouTubeEmbed = (results: YouTubeResult[], label: string) => {
    if (!results[0]) return null
    return (
      <div className="mt-4">
        <div className="text-sm opacity-80 mb-2">Preview:</div>
        <iframe
          width="100%"
          height="180"
          src={`https://www.youtube.com/embed/${results[0].id.videoId}?autoplay=1&mute=1&start=0&end=30&rel=0`}
          title={`${label} preview`}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="rounded-lg"
        />
        <p className="text-xs text-gray-400 mt-1 truncate">
          {results[0].snippet.title}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-gray-900 to-black text-white">
      <AnimatePresence>
        {showConfetti && (
          <Confetti
            numberOfPieces={150}
            recycle={false}
            style={{ position: 'fixed', top: 0, left: 0, zIndex: 50 }}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl bg-gray-800/80 backdrop-blur-md rounded-3xl shadow-2xl p-6 sm:p-10 border border-gray-700"
      >
        {/* Header */}
        <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-4 tracking-tight bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent">
          {state.currentCategory || 'Loading...'}
        </h2>

        {/* Status bar */}
        <div className="text-center mb-6 space-y-1">
          <div className="text-xl font-semibold">
            Round {state.round}/3
            {state.roundValue > 1 && (
              <span className="text-yellow-400 ml-2">
                {state.roundValue}&times; points
              </span>
            )}
          </div>
          <div className="text-lg">
            <span className="text-blue-400">{state.player1.name}</span>:{' '}
            {state.player1.score} &nbsp;&bull;&nbsp;{' '}
            <span className="text-pink-400">{state.player2.name}</span>:{' '}
            {state.player2.score}
          </div>
          <div className="text-sm opacity-80">
            Categories: {state.player1.categoriesWon} &ndash;{' '}
            {state.player2.categoriesWon} &nbsp;|&nbsp; Game{' '}
            {state.categoriesPlayed + 1}/{state.totalCategories}
          </div>
          {state.lastMessage && (
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-yellow-400 font-medium text-sm mt-2"
            >
              {state.lastMessage}
            </motion.div>
          )}
        </div>

        {/* ─── PICKING PHASE ──────────────────────────────────────── */}
        {!judging ? (
          <motion.div
            className="space-y-6"
            key={`picking-${turn}-${state.round}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {!ready ? (
              /* Ready screen */
              <div className="text-center py-8">
                <h3 className="text-2xl mb-6">
                  <span className={isP1 ? 'text-blue-400' : 'text-pink-400'}>
                    {playerName}
                  </span>
                  , ready?
                </h3>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={handleReady}
                  className="bg-green-600 hover:bg-green-500 text-white text-xl font-bold py-6 px-12 rounded-2xl shadow-lg transition-colors"
                >
                  I&apos;m Ready!
                </motion.button>
              </div>
            ) : opponentThinking && isSplitMode ? (
              /* Opponent thinking (split mode) */
              <div className="text-center py-12">
                <div className="text-2xl animate-pulse mb-4">
                  Opponent is thinking&hellip;
                </div>
                <div className="flex justify-center gap-1">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      className="w-3 h-3 bg-purple-500 rounded-full"
                      animate={{ y: [0, -12, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.15,
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              /* Song input */
              <>
                <div className="text-center text-2xl font-bold">
                  <span
                    className={isP1 ? 'text-blue-400' : 'text-pink-400'}
                  >
                    {playerName}
                  </span>
                  &apos;s turn
                </div>

                <Timer seconds={timerSeconds} onEnd={handleTimeUp} />

                {clueText && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-indigo-900/60 border border-indigo-500 rounded-xl p-4 text-center"
                  >
                    <span className="text-indigo-300 font-medium">
                      Judge&apos;s Clue:
                    </span>{' '}
                    {clueText}
                  </motion.div>
                )}

                <motion.input
                  whileFocus={{ scale: 1.01 }}
                  type="text"
                  value={isP1 ? p1Song : p2Song}
                  onChange={e =>
                    isP1
                      ? setP1Song(e.target.value)
                      : setP2Song(e.target.value)
                  }
                  placeholder="Song Title – Artist"
                  className="w-full p-5 bg-gray-700/50 border border-gray-600 rounded-xl text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
                  autoFocus
                />

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={submitPick}
                    disabled={!(isP1 ? p1Song.trim() : p2Song.trim())}
                    className={`bg-blue-600 hover:bg-blue-500 py-5 rounded-xl text-lg font-bold disabled:opacity-50 col-span-2 transition-colors ${
                      shakeSubmit ? 'animate-shake' : ''
                    }`}
                  >
                    Submit Pick
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleJudgesClue}
                    disabled={!state.lifelines.judgesClue[turn]}
                    className={`bg-indigo-600 hover:bg-indigo-500 py-4 rounded-xl font-bold disabled:opacity-50 transition-colors ${
                      shakeLifeline ? 'animate-shake' : ''
                    }`}
                  >
                    Judge&apos;s Clue
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleTimeOut}
                    disabled={!state.lifelines.timeOut[turn]}
                    className="bg-teal-600 hover:bg-teal-500 py-4 rounded-xl font-bold disabled:opacity-50 transition-colors"
                  >
                    Time Out (+30s)
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handlePhoneFriend}
                    disabled={!state.lifelines.phoneFriend[turn]}
                    className="bg-cyan-600 hover:bg-cyan-500 py-4 rounded-xl font-bold disabled:opacity-50 transition-colors"
                  >
                    Phone a Friend
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDoubleDown}
                    disabled={
                      state.round !== 3 || !state.lifelines.doubleDown[turn]
                    }
                    className="bg-red-600 hover:bg-red-500 py-4 rounded-xl font-bold disabled:opacity-50 transition-colors"
                  >
                    Double Down &times;2
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        ) : (
          /* ─── JUDGING PHASE ─────────────────────────────────────── */
          <motion.div
            className="space-y-6"
            key="judging"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Song cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Player 1 card */}
              <motion.div
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-blue-900/30 border border-blue-700/50 p-5 rounded-xl"
              >
                <div className="font-bold text-lg mb-2 text-blue-400">
                  {state.player1.name}
                </div>
                <div className="text-base break-words mb-1">
                  {p1Song || '(no pick)'}
                </div>
                {renderYouTubeEmbed(searchResultsP1, state.player1.name)}
              </motion.div>

              {/* Player 2 card */}
              <motion.div
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-pink-900/30 border border-pink-700/50 p-5 rounded-xl"
              >
                <div className="font-bold text-lg mb-2 text-pink-400">
                  {state.player2.name}
                </div>
                <div className="text-base break-words mb-1">
                  {p2Song || '(no pick)'}
                </div>
                {renderYouTubeEmbed(searchResultsP2, state.player2.name)}
              </motion.div>
            </div>

            {/* Crowd vote */}
            <div className="text-center bg-gray-700/30 rounded-xl p-4">
              <p className="text-lg mb-3 font-semibold">Crowd Vote</p>
              <div className="flex justify-center gap-8 text-3xl">
                <motion.button
                  whileTap={{ scale: 1.3 }}
                  onClick={() =>
                    setCrowdVotes(v => ({ ...v, up: v.up + 1 }))
                  }
                  className="hover:scale-110 transition-transform select-none"
                >
                  <span role="img" aria-label="thumbs up">
                    👍
                  </span>{' '}
                  <span className="text-green-400">{crowdVotes.up}</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 1.3 }}
                  onClick={() =>
                    setCrowdVotes(v => ({ ...v, down: v.down + 1 }))
                  }
                  className="hover:scale-110 transition-transform select-none"
                >
                  <span role="img" aria-label="thumbs down">
                    👎
                  </span>{' '}
                  <span className="text-red-400">{crowdVotes.down}</span>
                </motion.button>
              </div>
              <div
                className={`mt-2 text-lg font-bold ${
                  crowdVotes.up > crowdVotes.down
                    ? 'text-green-400'
                    : crowdVotes.down > crowdVotes.up
                      ? 'text-red-400'
                      : 'text-gray-400'
                }`}
              >
                Crowd leans{' '}
                {crowdVotes.up > crowdVotes.down
                  ? 'Player 1'
                  : crowdVotes.down > crowdVotes.up
                    ? 'Player 2'
                    : 'neutral'}
              </div>
            </div>

            {/* Judge decision */}
            <p className="text-center text-xl font-semibold">
              Judge &mdash; who wins this round?
            </p>

            <div className="grid grid-cols-3 gap-3">
              <motion.button
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.03 }}
                onClick={() => awardRound('p1')}
                className="bg-blue-600 hover:bg-blue-500 py-5 text-lg font-bold rounded-xl transition-colors"
              >
                {state.player1.name}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.03 }}
                onClick={() => awardRound('tie')}
                className="bg-gray-600 hover:bg-gray-500 py-5 text-lg font-bold rounded-xl transition-colors"
              >
                Tie
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.03 }}
                onClick={() => awardRound('p2')}
                className="bg-pink-600 hover:bg-pink-500 py-5 text-lg font-bold rounded-xl transition-colors"
              >
                {state.player2.name}
              </motion.button>
            </div>

            {/* Judging-phase lifelines */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleVeto}
                disabled={!state.lifelines.veto[turn]}
                className="bg-yellow-600 hover:bg-yellow-500 py-3 rounded-xl font-bold disabled:opacity-50 transition-colors"
              >
                Veto
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleCrowdHype}
                disabled={!state.lifelines.crowdHype[turn]}
                className="bg-pink-600 hover:bg-pink-500 py-3 rounded-xl font-bold disabled:opacity-50 transition-colors"
              >
                Crowd Hype
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleSongSwap}
                disabled={!state.lifelines.songSwap[turn]}
                className="bg-orange-600 hover:bg-orange-500 py-3 rounded-xl font-bold disabled:opacity-50 transition-colors"
              >
                Song Swap
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleStealPick}
                disabled={!state.lifelines.stealPick[turn]}
                className="bg-purple-700 hover:bg-purple-600 py-3 rounded-xl font-bold disabled:opacity-50 transition-colors"
              >
                Steal Pick
              </motion.button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
