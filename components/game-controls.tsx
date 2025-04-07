"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, ArrowUp, HelpCircle, X } from "lucide-react"

interface GameControlsProps {
  is3D?: boolean
}

export default function GameControls({ is3D = false }: GameControlsProps) {
  const [showHelp, setShowHelp] = useState(false)

  return (
    <div className="mt-4">
      {!showHelp ? (
        <div className="flex flex-col items-center">
          <div className="hidden md:flex gap-2 mb-4">
            <Button variant="outline" className="text-white">
              <ArrowLeft className="mr-2 h-4 w-4" /> Move Left (or A)
            </Button>
            <Button variant="outline" className="text-white">
              <ArrowRight className="mr-2 h-4 w-4" /> Move Right (or D)
            </Button>
            <Button variant="outline" className="text-white">
              <ArrowUp className="mr-2 h-4 w-4" /> Shoot (or Space)
            </Button>
          </div>

          <div className="md:hidden grid grid-cols-3 gap-2 w-full max-w-xs mb-4">
            <Button
              variant="outline"
              className="h-16 text-white"
              onTouchStart={() => {
                window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }))
              }}
              onTouchEnd={() => {
                window.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowLeft" }))
              }}
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="outline"
              className="h-16 text-white"
              onTouchStart={() => {
                window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }))
              }}
              onTouchEnd={() => {
                window.dispatchEvent(new KeyboardEvent("keyup", { key: " " }))
              }}
            >
              <ArrowUp className="h-6 w-6" />
            </Button>
            <Button
              variant="outline"
              className="h-16 text-white"
              onTouchStart={() => {
                window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }))
              }}
              onTouchEnd={() => {
                window.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowRight" }))
              }}
            >
              <ArrowRight className="h-6 w-6" />
            </Button>
          </div>

          <Button variant="ghost" size="sm" onClick={() => setShowHelp(true)} className="text-slate-400">
            <HelpCircle className="mr-2 h-4 w-4" /> Game Instructions
          </Button>
        </div>
      ) : (
        <div className="bg-slate-800 p-4 rounded-md text-white">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold">Game Instructions</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowHelp(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2 text-sm">
            <p>
              <strong>Controls:</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Use <strong>Left/Right Arrow Keys</strong> or <strong>A/D</strong> to move your archer
              </li>
              <li>
                Press <strong>Space</strong> or <strong>Up Arrow</strong> to shoot arrows
              </li>
              {is3D && (
                <li>
                  Use <strong>mouse</strong> to rotate the camera view
                </li>
              )}
            </ul>

            <p>
              <strong>Enemies:</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Defeat all enemies to advance to the next level</li>
              <li>Different enemies have different point values</li>
              <li>Enemies move faster and shoot more frequently as levels progress</li>
            </ul>

            <p>
              <strong>Lives:</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You start with 3 lives</li>
              <li>Lose a life when hit by an enemy arrow</li>
              <li>Game over when all lives are lost or enemies reach the bottom</li>
              <li>Lives are restored to 3 when advancing to a new level</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

