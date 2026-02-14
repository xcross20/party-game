import { motion } from 'framer-motion'
import Confetti from 'react-confetti'
import type { GameState } from '../App'

export default function GameOver({
  state,
  onPlayAgain,
}: {
  state: GameState
  onPlayAgain: () => void
}) {
  const p1 = state.player1
  const p2 = state.player2

  const winner =
    p1.score > p2.score
      ? p1.name
      : p2.score > p1.score
        ? p2.name
        : null

  const isTie = winner === null

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      <Confetti numberOfPieces={300} recycle={false} />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="w-full max-w-lg bg-gray-800/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 sm:p-10 border border-gray-700 text-center"
      >
        <motion.h1
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className="text-4xl sm:text-5xl font-extrabold mb-4 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 bg-clip-text text-transparent"
        >
          Game Over!
        </motion.h1>

        {isTie ? (
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="text-2xl sm:text-3xl font-bold mb-6 text-gray-300"
          >
            It&apos;s a tie!
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 0.6, repeat: 2 }}
            className="text-2xl sm:text-3xl font-bold mb-6"
          >
            <span className="text-yellow-400">{winner}</span> wins!
          </motion.div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-blue-900/30 border border-blue-700/50 rounded-xl p-4">
            <div className="text-blue-400 font-bold text-lg mb-1">
              {p1.name}
            </div>
            <div className="text-3xl font-extrabold">{p1.score}</div>
            <div className="text-sm text-gray-400">
              {p1.categoriesWon} categories won
            </div>
          </div>
          <div className="bg-pink-900/30 border border-pink-700/50 rounded-xl p-4">
            <div className="text-pink-400 font-bold text-lg mb-1">
              {p2.name}
            </div>
            <div className="text-3xl font-extrabold">{p2.score}</div>
            <div className="text-sm text-gray-400">
              {p2.categoriesWon} categories won
            </div>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.03 }}
          onClick={onPlayAgain}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xl font-bold py-5 rounded-2xl shadow-lg transition-all"
        >
          Play Again
        </motion.button>
      </motion.div>
    </div>
  )
}
