"use client"

import { Button } from "@/components/ui/button"
import { Skull } from "lucide-react"

interface GameOverScreenProps {
  score: number
  highScore: number
  onRestart: () => void
  is3D?: boolean
}

export default function GameOverScreen({ score, highScore, onRestart, is3D = false }: GameOverScreenProps) {
  const isNewHighScore = score > highScore

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-slate-800 rounded-md border-2 border-amber-600 shadow-lg text-white">
      <Skull className="h-16 w-16 text-red-500 mb-4" />
      <h2 className="text-2xl font-bold text-red-500 mb-2">Game Over</h2>

      <div className="mb-6 text-center">
        <p className="text-xl mb-2">Your Score: {score}</p>
        {isNewHighScore ? <p className="text-amber-400 font-bold">New High Score!</p> : <p>High Score: {highScore}</p>}
      </div>

      <Button onClick={onRestart} className="bg-amber-600 hover:bg-amber-700 text-white" size="lg">
        Play Again
      </Button>
    </div>
  )
}

