"use client"

import { Button } from "@/components/ui/button"
import { Shield } from "lucide-react"

interface StartScreenProps {
  onStart: () => void
  highScore: number
  is3D?: boolean
}

export default function StartScreen({ onStart, highScore, is3D = false }: StartScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-slate-800 rounded-md border-2 border-amber-600 shadow-lg text-white">
      <Shield className="h-16 w-16 text-amber-400 mb-4" />
      <h2 className="text-2xl font-bold text-amber-400 mb-2">Medieval Invaders {is3D && "3D"}</h2>
      <p className="mb-6 text-center">Defend your kingdom from waves of invaders!</p>

      {highScore > 0 && <p className="mb-4 text-amber-300">High Score: {highScore}</p>}

      <Button onClick={onStart} className="bg-amber-600 hover:bg-amber-700 text-white" size="lg">
        Start Game
      </Button>

      <div className="mt-8 text-sm text-slate-300 max-w-md">
        <p className="mb-2 text-center">Use arrow keys or A/D to move, Space to shoot</p>
        {is3D && <p className="mb-2 text-center">Use mouse to rotate the camera view</p>}
        <p className="text-center">Defeat all enemies to advance to the next level!</p>
      </div>
    </div>
  )
}

