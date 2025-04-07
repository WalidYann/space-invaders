"use client"

import { useEffect, useState } from "react"
import GameCanvas from "@/components/game-canvas"
import GameCanvas3D from "@/components/game-canvas-3d"
import GameControls from "@/components/game-controls"
import GameOverScreen from "@/components/game-over-screen"
import StartScreen from "@/components/start-screen"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export default function MedievalInvadersGame() {
  const [gameState, setGameState] = useState<"start" | "playing" | "gameOver">("start")
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [highScore, setHighScore] = useState(0)
  const [use3D, setUse3D] = useState(false)

  useEffect(() => {
    // Load high score from localStorage if available
    const savedHighScore = localStorage.getItem("medievalInvadersHighScore")
    if (savedHighScore) {
      setHighScore(Number.parseInt(savedHighScore, 10))
    }

    // Load 3D preference if available
    const saved3DPref = localStorage.getItem("medievalInvaders3D")
    if (saved3DPref) {
      setUse3D(saved3DPref === "true")
    }
  }, [])

  useEffect(() => {
    // Save high score to localStorage when it changes
    if (score > highScore) {
      setHighScore(score)
      localStorage.setItem("medievalInvadersHighScore", score.toString())
    }
  }, [score, highScore])

  // Save 3D preference when it changes
  useEffect(() => {
    localStorage.setItem("medievalInvaders3D", use3D.toString())
  }, [use3D])

  const startGame = () => {
    setGameState("playing")
    setScore(0)
    setLevel(1)
  }

  const endGame = () => {
    setGameState("gameOver")
  }

  const incrementScore = (points: number) => {
    setScore((prev) => prev + points)
  }

  const incrementLevel = () => {
    setLevel((prev) => prev + 1)
  }

  const toggle3D = () => {
    setUse3D((prev) => !prev)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-4">
      <h1 className="text-3xl md:text-4xl font-bold text-amber-400 mb-4">Medieval Invaders</h1>

      <div className="relative w-full max-w-2xl">
        {gameState === "start" && (
          <>
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center space-x-2">
                <Label htmlFor="3d-mode" className="text-white">
                  2D
                </Label>
                <Switch id="3d-mode" checked={use3D} onCheckedChange={toggle3D} />
                <Label htmlFor="3d-mode" className="text-white">
                  3D
                </Label>
              </div>
            </div>
            <StartScreen onStart={startGame} highScore={highScore} is3D={use3D} />
          </>
        )}

        {gameState === "playing" && (
          <>
            <div className="flex justify-between mb-2 text-white">
              <div className="text-lg">Level: {level}</div>
              <div className="text-lg">Score: {score}</div>
            </div>

            {use3D ? (
              <GameCanvas3D
                onGameOver={endGame}
                onScoreIncrement={incrementScore}
                onLevelUp={incrementLevel}
                level={level}
              />
            ) : (
              <GameCanvas
                onGameOver={endGame}
                onScoreIncrement={incrementScore}
                onLevelUp={incrementLevel}
                level={level}
              />
            )}

            <GameControls is3D={use3D} />
          </>
        )}

        {gameState === "gameOver" && (
          <GameOverScreen score={score} highScore={highScore} onRestart={startGame} is3D={use3D} />
        )}
      </div>
    </div>
  )
}

