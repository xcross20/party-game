import { useState } from 'react'
import { motion } from 'framer-motion'
import type { GameState } from '../App'

export default function GameSetup({
  state,
  setState,
}: {
  state: GameState
  setState: React.Dispatch<React.SetStateAction<GameState>>
}) {
  const [p1Name, setP1Name] = useState(state.player1.name)
  const [p2Name, setP2Name] = useState(state.player2.name)
  const [numCategories, setNumCategories] = useState(state.totalCategories)

  const startGame = () => {
    if (!p1Name.trim() || !p2Name.trim()) return
    setState(s => ({
      ...s,
      phase: 'battle',
      player1: { ...s.player1, name: p1Name.trim() },
      player2: { ...s.player2, name: p2Name.trim() },
      totalCategories: numCategories,
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg bg-gray-800/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 sm:p-10 border border-gray-700"
      >
        <h1 className="text-4xl sm:text-5xl font-extrabold text-center mb-2 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
          Song Battle Royale
        </h1>
        <p className="text-center text-gray-400 mb-8 text-lg">
          Pick songs. Battle it out. Crown a champion.
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Player 1 Name
            </label>
            <input
              type="text"
              value={p1Name}
              onChange={e => setP1Name(e.target.value)}
              placeholder="Enter name"
              className="w-full p-4 bg-gray-700/50 border border-gray-600 rounded-xl text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Player 2 Name
            </label>
            <input
              type="text"
              value={p2Name}
              onChange={e => setP2Name(e.target.value)}
              placeholder="Enter name"
              className="w-full p-4 bg-gray-700/50 border border-gray-600 rounded-xl text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Number of Categories
            </label>
            <select
              value={numCategories}
              onChange={e => setNumCategories(Number(e.target.value))}
              className="w-full p-4 bg-gray-700/50 border border-gray-600 rounded-xl text-lg focus:border-blue-500 outline-none text-white"
            >
              <option value={1}>1 (Quick game)</option>
              <option value={3}>3 (Standard)</option>
              <option value={5}>5 (Extended)</option>
              <option value={7}>7 (Marathon)</option>
            </select>
          </div>

          <div className="pt-2">
            <label className="flex items-center justify-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={state.splitMode}
                onChange={e =>
                  setState(s => ({ ...s, splitMode: e.target.checked }))
                }
                className="w-5 h-5 rounded border-gray-600 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-lg text-gray-200">
                Enable Split-Screen Mode (open two tabs)
              </span>
            </label>
            <p className="text-sm text-gray-400 mt-1 text-center">
              One tab per player — suspense when opponent picks!
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            onClick={startGame}
            disabled={!p1Name.trim() || !p2Name.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xl font-bold py-5 rounded-2xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Start Battle!
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
