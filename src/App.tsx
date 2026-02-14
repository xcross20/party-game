import { useState } from 'react'
import GameSetup from './components/GameSetup'
import BattleScreen from './components/BattleScreen'
import GameOver from './components/GameOver'

export interface PlayerState {
  name: string
  score: number
  categoriesWon: number
}

export interface Lifelines {
  veto: { p1: boolean; p2: boolean }
  judgesClue: { p1: boolean; p2: boolean }
  doubleDown: { p1: boolean; p2: boolean }
  crowdHype: { p1: boolean; p2: boolean }
  songSwap: { p1: boolean; p2: boolean }
  stealPick: { p1: boolean; p2: boolean }
  timeOut: { p1: boolean; p2: boolean }
  phoneFriend: { p1: boolean; p2: boolean }
}

export type Phase = 'setup' | 'battle' | 'gameover'

export interface GameState {
  phase: Phase
  player1: PlayerState
  player2: PlayerState
  round: number
  roundValue: number
  currentCategory: string | null
  categoryIndex: number
  categoriesPlayed: number
  totalCategories: number
  lifelines: Lifelines
  lastMessage: string | undefined
  splitMode: boolean
  usedCategories: string[]
}

const defaultLifelines: Lifelines = {
  veto: { p1: true, p2: true },
  judgesClue: { p1: true, p2: true },
  doubleDown: { p1: true, p2: true },
  crowdHype: { p1: true, p2: true },
  songSwap: { p1: true, p2: true },
  stealPick: { p1: true, p2: true },
  timeOut: { p1: true, p2: true },
  phoneFriend: { p1: true, p2: true },
}

const initialState: GameState = {
  phase: 'setup',
  player1: { name: 'Player 1', score: 0, categoriesWon: 0 },
  player2: { name: 'Player 2', score: 0, categoriesWon: 0 },
  round: 1,
  roundValue: 1,
  currentCategory: null,
  categoryIndex: 0,
  categoriesPlayed: 0,
  totalCategories: 3,
  lifelines: defaultLifelines,
  lastMessage: undefined,
  splitMode: false,
  usedCategories: [],
}

export default function App() {
  const [state, setState] = useState<GameState>(initialState)

  const resetGame = () => setState(initialState)

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {state.phase === 'setup' && (
        <GameSetup state={state} setState={setState} />
      )}
      {state.phase === 'battle' && (
        <BattleScreen state={state} setState={setState} />
      )}
      {state.phase === 'gameover' && (
        <GameOver state={state} onPlayAgain={resetGame} />
      )}
    </div>
  )
}
