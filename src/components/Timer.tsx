import { useState, useEffect, useRef } from 'react'

export default function Timer({
  seconds,
  onEnd,
}: {
  seconds: number
  onEnd: () => void
}) {
  const [remaining, setRemaining] = useState(seconds)
  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd

  useEffect(() => {
    setRemaining(seconds)
  }, [seconds])

  useEffect(() => {
    if (remaining <= 0) {
      onEndRef.current()
      return
    }

    const id = setInterval(() => {
      setRemaining(r => r - 1)
    }, 1000)

    return () => clearInterval(id)
  }, [remaining])

  const pct = (remaining / seconds) * 100
  const isLow = remaining <= 10
  const barColor = isLow ? 'bg-red-500' : remaining <= 20 ? 'bg-yellow-500' : 'bg-green-500'

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-400">Time</span>
        <span
          className={`text-2xl font-mono font-bold tabular-nums ${
            isLow ? 'text-red-400 animate-pulse' : 'text-white'
          }`}
        >
          {remaining}s
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
        <div
          className={`${barColor} h-3 rounded-full transition-all duration-1000 ease-linear`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
