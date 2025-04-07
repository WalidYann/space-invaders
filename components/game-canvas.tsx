"use client"

import { useEffect, useRef, useState } from "react"
import { useToast } from "@/hooks/use-toast"

// Game constants
const PLAYER_WIDTH = 50
const PLAYER_HEIGHT = 60
const ENEMY_WIDTH = 40
const ENEMY_HEIGHT = 40
const ARROW_WIDTH = 5
const ARROW_HEIGHT = 20
const ENEMY_ROWS = 3 // Reduced from 4 to 3
const ENEMIES_PER_ROW = 5 // Reduced from 8 to 5
const ENEMY_PADDING = 40 // Increased from 15 to 40
const ENEMY_MOVE_SPEED_BASE = 0.5
const ENEMY_MOVE_DOWN = 20
const ARROW_SPEED = 7
const ENEMY_SHOOT_CHANCE_BASE = 0.002

// Arrow colors for player
const ARROW_COLORS = ["#fbbf24", "#ef4444", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899"]

interface GameCanvasProps {
  onGameOver: () => void
  onScoreIncrement: (points: number) => void
  onLevelUp: () => void
  level: number
}

interface GameObject {
  x: number
  y: number
  width: number
  height: number
  active: boolean
}

interface Player extends GameObject {
  speed: number
  lives: number
}

interface Enemy extends GameObject {
  type: number
  points: number
}

interface Arrow extends GameObject {
  isPlayerArrow: boolean
  color?: string // Added color property for player arrows
}

export default function GameCanvas({ onGameOver, onScoreIncrement, onLevelUp, level }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })
  const playerRef = useRef<Player>({
    x: 0,
    y: 0,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    speed: 5,
    lives: 3,
    active: true,
  })
  const enemiesRef = useRef<Enemy[]>([])
  const arrowsRef = useRef<Arrow[]>([])
  const keysRef = useRef<{ [key: string]: boolean }>({})
  const lastShotTimeRef = useRef<number>(0)
  const enemyDirectionRef = useRef<number>(1)
  const gameFrameRef = useRef<number>(0)
  const enemiesDefeatedRef = useRef<number>(0)
  const totalEnemiesRef = useRef<number>(0)
  const { toast } = useToast()

  // Audio refs
  const bgMusicRef = useRef<HTMLAudioElement | null>(null)
  const shootSoundRef = useRef<HTMLAudioElement | null>(null)
  const [audioInitialized, setAudioInitialized] = useState(false)

  // Initialize audio
  useEffect(() => {
    if (typeof window !== "undefined") {
      bgMusicRef.current = new Audio("/sounds/background-music.mp3")
      bgMusicRef.current.loop = true
      bgMusicRef.current.volume = 0.5

      shootSoundRef.current = new Audio("/sounds/shoot.mp3")
      shootSoundRef.current.volume = 0.3

      setAudioInitialized(true)
    }

    return () => {
      if (bgMusicRef.current) {
        bgMusicRef.current.pause()
        bgMusicRef.current = null
      }
      if (shootSoundRef.current) {
        shootSoundRef.current = null
      }
    }
  }, [])

  // Start background music when game starts
  useEffect(() => {
    const startAudio = () => {
      if (audioInitialized && bgMusicRef.current) {
        bgMusicRef.current.play().catch((e) => console.log("Audio play failed:", e))
      }
    }

    startAudio()

    // Add event listeners to start audio on user interaction
    const handleUserInteraction = () => {
      startAudio()
      window.removeEventListener("click", handleUserInteraction)
      window.removeEventListener("keydown", handleUserInteraction)
    }

    window.addEventListener("click", handleUserInteraction)
    window.addEventListener("keydown", handleUserInteraction)

    return () => {
      window.removeEventListener("click", handleUserInteraction)
      window.removeEventListener("keydown", handleUserInteraction)
    }
  }, [audioInitialized])

  // Initialize game
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const width = Math.min(800, window.innerWidth - 40)
        const height = Math.min(600, (width * 3) / 4)
        setCanvasSize({ width, height })

        // Reposition player when canvas resizes
        playerRef.current.x = width / 2 - PLAYER_WIDTH / 2
        playerRef.current.y = height - PLAYER_HEIGHT - 20
      }
    }

    window.addEventListener("resize", handleResize)
    handleResize()

    // Initialize player
    if (canvasRef.current) {
      playerRef.current = {
        x: canvasSize.width / 2 - PLAYER_WIDTH / 2,
        y: canvasSize.height - PLAYER_HEIGHT - 20,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        speed: 5,
        lives: 3,
        active: true,
      }
    }

    // Initialize enemies
    initializeEnemies()

    // Set up keyboard controls
    window.addEventListener("keydown", (e) => {
      keysRef.current[e.key] = true
    })
    window.addEventListener("keyup", (e) => {
      keysRef.current[e.key] = false
    })

    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("keydown", (e) => {
        keysRef.current[e.key] = true
      })
      window.removeEventListener("keyup", (e) => {
        keysRef.current[e.key] = false
      })
    }
  }, [])

  // Reset game when level changes
  useEffect(() => {
    if (level > 1) {
      toast({
        title: `Level ${level}`,
        description: "Enemies are getting stronger!",
        duration: 2000,
      })

      // Reset player lives to 3 when advancing to a new level
      playerRef.current.lives = 3
    }

    initializeEnemies()
    arrowsRef.current = []
    enemiesDefeatedRef.current = 0
  }, [level, toast])

  // Initialize enemies based on level
  const initializeEnemies = () => {
    const enemies: Enemy[] = []
    // Center enemies better with more padding
    const startX = (canvasSize.width - ((ENEMY_WIDTH + ENEMY_PADDING) * ENEMIES_PER_ROW - ENEMY_PADDING)) / 2

    for (let row = 0; row < ENEMY_ROWS; row++) {
      for (let col = 0; col < ENEMIES_PER_ROW; col++) {
        const enemyType = ENEMY_ROWS - row - 1 // Higher rows have stronger enemies
        enemies.push({
          x: startX + col * (ENEMY_WIDTH + ENEMY_PADDING),
          y: 80 + row * (ENEMY_HEIGHT + ENEMY_PADDING), // Start a bit lower (80 instead of 50)
          width: ENEMY_WIDTH,
          height: ENEMY_HEIGHT,
          active: true,
          type: enemyType,
          points: (enemyType + 1) * 10 * level, // Points based on enemy type and level
        })
      }
    }

    enemiesRef.current = enemies
    totalEnemiesRef.current = enemies.length
    enemyDirectionRef.current = 1
  }

  // Game loop
  useEffect(() => {
    let animationFrameId: number

    const gameLoop = () => {
      if (!canvasRef.current) return

      const ctx = canvasRef.current.getContext("2d")
      if (!ctx) return

      // Clear canvas
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)

      // Update game state
      updatePlayer()
      updateEnemies()
      updateArrows()
      checkCollisions()

      // Draw everything
      drawBackground(ctx)
      drawPlayer(ctx)
      drawEnemies(ctx)
      drawArrows(ctx)
      drawUI(ctx)

      // Check win condition
      if (enemiesRef.current.filter((e) => e.active).length === 0) {
        onLevelUp()
        return
      }

      // Check game over condition
      if (!playerRef.current.active) {
        // Stop background music on game over
        if (bgMusicRef.current) {
          bgMusicRef.current.pause()
          bgMusicRef.current.currentTime = 0
        }
        onGameOver()
        return
      }

      gameFrameRef.current++
      animationFrameId = requestAnimationFrame(gameLoop)
    }

    animationFrameId = requestAnimationFrame(gameLoop)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [canvasSize, onGameOver, onLevelUp])

  // Update player position and handle shooting
  const updatePlayer = () => {
    const player = playerRef.current

    // Move left/right
    if (keysRef.current["ArrowLeft"] || keysRef.current["a"]) {
      player.x = Math.max(0, player.x - player.speed)
    }
    if (keysRef.current["ArrowRight"] || keysRef.current["d"]) {
      player.x = Math.min(canvasSize.width - player.width, player.x + player.speed)
    }

    // Shoot arrows
    if ((keysRef.current[" "] || keysRef.current["ArrowUp"]) && gameFrameRef.current - lastShotTimeRef.current > 15) {
      // Limit firing rate
      // Get random color for the arrow
      const randomColor = ARROW_COLORS[Math.floor(Math.random() * ARROW_COLORS.length)]

      arrowsRef.current.push({
        x: player.x + player.width / 2 - ARROW_WIDTH / 2,
        y: player.y,
        width: ARROW_WIDTH,
        height: ARROW_HEIGHT,
        active: true,
        isPlayerArrow: true,
        color: randomColor,
      })

      // Play shoot sound
      if (shootSoundRef.current) {
        // Clone the audio to allow multiple sounds at once
        const shootSound = shootSoundRef.current.cloneNode() as HTMLAudioElement
        shootSound.volume = 0.3
        shootSound.play().catch((e) => console.log("Audio play failed:", e))
      }

      lastShotTimeRef.current = gameFrameRef.current
    }
  }

  // Update enemy positions and handle enemy shooting
  const updateEnemies = () => {
    const enemies = enemiesRef.current
    let moveDown = false
    const activeEnemies = enemies.filter((e) => e.active)

    // Check if enemies need to change direction
    if (activeEnemies.length > 0) {
      const rightmostEnemy = Math.max(...activeEnemies.map((e) => e.x + e.width))
      const leftmostEnemy = Math.min(...activeEnemies.map((e) => e.x))

      if (rightmostEnemy >= canvasSize.width) {
        enemyDirectionRef.current = -1
        moveDown = true
      } else if (leftmostEnemy <= 0) {
        enemyDirectionRef.current = 1
        moveDown = true
      }
    }

    // Calculate enemy speed based on level and remaining enemies
    const speedMultiplier = 1 + (level - 1) * 0.2
    const remainingRatio = activeEnemies.length / totalEnemiesRef.current
    const enemySpeed = ENEMY_MOVE_SPEED_BASE * speedMultiplier * (2 - remainingRatio)

    // Move enemies
    enemies.forEach((enemy) => {
      if (!enemy.active) return

      enemy.x += enemyDirectionRef.current * enemySpeed
      if (moveDown) {
        enemy.y += ENEMY_MOVE_DOWN
      }

      // Check if enemies reached the player
      if (enemy.y + enemy.height >= playerRef.current.y) {
        playerRef.current.active = false
      }

      // Enemy shooting
      const shootChance = ENEMY_SHOOT_CHANCE_BASE * level * (1 + enemy.type / 3)
      if (Math.random() < shootChance) {
        arrowsRef.current.push({
          x: enemy.x + enemy.width / 2 - ARROW_WIDTH / 2,
          y: enemy.y + enemy.height,
          width: ARROW_WIDTH,
          height: ARROW_HEIGHT,
          active: true,
          isPlayerArrow: false,
        })
      }
    })
  }

  // Update arrow positions
  const updateArrows = () => {
    arrowsRef.current.forEach((arrow) => {
      if (!arrow.active) return

      if (arrow.isPlayerArrow) {
        arrow.y -= ARROW_SPEED
        if (arrow.y + arrow.height < 0) {
          arrow.active = false
        }
      } else {
        arrow.y += ARROW_SPEED * 0.4 // Reduced from 0.7 to 0.4 to make enemy arrows slower
        if (arrow.y > canvasSize.height) {
          arrow.active = false
        }
      }
    })

    // Remove inactive arrows
    arrowsRef.current = arrowsRef.current.filter((arrow) => arrow.active)
  }

  // Check for collisions
  const checkCollisions = () => {
    const player = playerRef.current
    const enemies = enemiesRef.current
    const arrows = arrowsRef.current

    // Check player arrows hitting enemies
    arrows.forEach((arrow) => {
      if (!arrow.active || !arrow.isPlayerArrow) return

      enemies.forEach((enemy) => {
        if (!enemy.active) return

        if (checkCollision(arrow, enemy)) {
          arrow.active = false
          enemy.active = false
          onScoreIncrement(enemy.points)
          enemiesDefeatedRef.current++
        }
      })
    })

    // Check enemy arrows hitting player
    arrows.forEach((arrow) => {
      if (!arrow.active || arrow.isPlayerArrow) return

      if (checkCollision(arrow, player)) {
        arrow.active = false
        player.lives--

        if (player.lives <= 0) {
          player.active = false
        }
      }
    })
  }

  // Helper function to check collision between two objects
  const checkCollision = (obj1: GameObject, obj2: GameObject) => {
    return (
      obj1.x < obj2.x + obj2.width &&
      obj1.x + obj1.width > obj2.x &&
      obj1.y < obj2.y + obj2.height &&
      obj1.y + obj1.height > obj2.y
    )
  }

  // Draw functions
  const drawBackground = (ctx: CanvasRenderingContext2D) => {
    // Draw starry background
    ctx.fillStyle = "#0f172a"
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)

    // Draw some stars
    ctx.fillStyle = "#f8fafc"
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * canvasSize.width
      const y = Math.random() * (canvasSize.height - 100)
      const size = Math.random() * 2 + 1
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw castle silhouette at the bottom
    ctx.fillStyle = "#1e293b"
    const castleHeight = 40
    ctx.fillRect(0, canvasSize.height - castleHeight, canvasSize.width, castleHeight)

    // Draw castle towers
    const towerWidth = 30
    const towerHeight = 60
    const numTowers = Math.floor(canvasSize.width / 100) + 1

    for (let i = 0; i < numTowers; i++) {
      const x = i * (canvasSize.width / (numTowers - 1)) - towerWidth / 2
      ctx.fillRect(x, canvasSize.height - towerHeight, towerWidth, towerHeight)

      // Draw tower top
      ctx.beginPath()
      ctx.moveTo(x, canvasSize.height - towerHeight)
      ctx.lineTo(x + towerWidth / 2, canvasSize.height - towerHeight - 10)
      ctx.lineTo(x + towerWidth, canvasSize.height - towerHeight)
      ctx.fill()
    }
  }

  const drawPlayer = (ctx: CanvasRenderingContext2D) => {
    const player = playerRef.current
    if (!player.active) return

    // Draw archer
    ctx.fillStyle = "#fbbf24"

    // Body
    ctx.fillRect(player.x + player.width / 4, player.y + player.height / 3, player.width / 2, (player.height * 2) / 3)

    // Head
    ctx.beginPath()
    ctx.arc(player.x + player.width / 2, player.y + player.height / 4, player.width / 4, 0, Math.PI * 2)
    ctx.fill()

    // Bow
    ctx.strokeStyle = "#92400e"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(player.x + player.width / 2, player.y + player.height / 3, player.width / 3, Math.PI * 0.8, Math.PI * 2.2)
    ctx.stroke()

    // Draw lives
    for (let i = 0; i < player.lives; i++) {
      ctx.fillStyle = "#ef4444"
      const heartSize = 15
      const heartX = 10 + i * (heartSize + 5)
      const heartY = 10

      ctx.beginPath()
      ctx.moveTo(heartX, heartY + heartSize / 4)
      ctx.bezierCurveTo(heartX, heartY, heartX - heartSize / 2, heartY, heartX - heartSize / 2, heartY + heartSize / 4)
      ctx.bezierCurveTo(
        heartX - heartSize / 2,
        heartY + heartSize / 2,
        heartX,
        heartY + (heartSize * 3) / 4,
        heartX,
        heartY + heartSize,
      )
      ctx.bezierCurveTo(
        heartX,
        heartY + (heartSize * 3) / 4,
        heartX + heartSize / 2,
        heartY + heartSize / 2,
        heartX + heartSize / 2,
        heartY + heartSize / 4,
      )
      ctx.bezierCurveTo(heartX + heartSize / 2, heartY, heartX, heartY, heartX, heartY + heartSize / 4)
      ctx.fill()
    }
  }

  const drawEnemies = (ctx: CanvasRenderingContext2D) => {
    enemiesRef.current.forEach((enemy) => {
      if (!enemy.active) return

      // Different enemy types have different colors and shapes
      switch (enemy.type) {
        case 0: // Basic enemy (goblin)
          ctx.fillStyle = "#4ade80"
          // Body
          ctx.fillRect(enemy.x + 5, enemy.y + 15, enemy.width - 10, enemy.height - 15)
          // Head
          ctx.beginPath()
          ctx.arc(enemy.x + enemy.width / 2, enemy.y + 10, 10, 0, Math.PI * 2)
          ctx.fill()
          break

        case 1: // Medium enemy (orc)
          ctx.fillStyle = "#a3e635"
          // Body
          ctx.fillRect(enemy.x + 5, enemy.y + 12, enemy.width - 10, enemy.height - 12)
          // Head
          ctx.beginPath()
          ctx.arc(enemy.x + enemy.width / 2, enemy.y + 10, 12, 0, Math.PI * 2)
          ctx.fill()
          // Horns
          ctx.beginPath()
          ctx.moveTo(enemy.x + 10, enemy.y + 8)
          ctx.lineTo(enemy.x + 5, enemy.y)
          ctx.lineTo(enemy.x + 15, enemy.y + 8)
          ctx.fill()
          ctx.beginPath()
          ctx.moveTo(enemy.x + enemy.width - 10, enemy.y + 8)
          ctx.lineTo(enemy.x + enemy.width - 5, enemy.y)
          ctx.lineTo(enemy.x + enemy.width - 15, enemy.y + 8)
          ctx.fill()
          break

        case 2: // Strong enemy (troll)
          ctx.fillStyle = "#84cc16"
          // Body
          ctx.fillRect(enemy.x + 3, enemy.y + 15, enemy.width - 6, enemy.height - 15)
          // Head
          ctx.beginPath()
          ctx.arc(enemy.x + enemy.width / 2, enemy.y + 10, 13, 0, Math.PI * 2)
          ctx.fill()
          // Club
          ctx.fillStyle = "#78350f"
          ctx.fillRect(enemy.x + enemy.width - 5, enemy.y + 10, 8, 15)
          break

        case 3: // Boss enemy (dragon)
          ctx.fillStyle = "#65a30d"
          // Body
          ctx.fillRect(enemy.x, enemy.y + 15, enemy.width, enemy.height - 15)
          // Head
          ctx.beginPath()
          ctx.arc(enemy.x + enemy.width / 2, enemy.y + 10, 15, 0, Math.PI * 2)
          ctx.fill()
          // Wings
          ctx.beginPath()
          ctx.moveTo(enemy.x, enemy.y + 20)
          ctx.lineTo(enemy.x - 10, enemy.y + 5)
          ctx.lineTo(enemy.x, enemy.y + 10)
          ctx.fill()
          ctx.beginPath()
          ctx.moveTo(enemy.x + enemy.width, enemy.y + 20)
          ctx.lineTo(enemy.x + enemy.width + 10, enemy.y + 5)
          ctx.lineTo(enemy.x + enemy.width, enemy.y + 10)
          ctx.fill()
          break
      }
    })
  }

  const drawArrows = (ctx: CanvasRenderingContext2D) => {
    arrowsRef.current.forEach((arrow) => {
      if (!arrow.active) return

      if (arrow.isPlayerArrow) {
        // Player arrow (up) - multicolored
        ctx.fillStyle = arrow.color || "#fbbf24"
        ctx.fillRect(arrow.x, arrow.y, arrow.width, arrow.height)
        // Arrow head
        ctx.beginPath()
        ctx.moveTo(arrow.x, arrow.y)
        ctx.lineTo(arrow.x + arrow.width / 2, arrow.y - 5)
        ctx.lineTo(arrow.x + arrow.width, arrow.y)
        ctx.fill()

        // Add glow effect
        ctx.shadowColor = arrow.color || "#fbbf24"
        ctx.shadowBlur = 5
        ctx.fillRect(arrow.x, arrow.y, arrow.width, arrow.height)
        ctx.shadowBlur = 0
      } else {
        // Enemy arrow (down)
        ctx.fillStyle = "#84cc16"
        ctx.fillRect(arrow.x, arrow.y, arrow.width, arrow.height)
        // Arrow head
        ctx.beginPath()
        ctx.moveTo(arrow.x, arrow.y + arrow.height)
        ctx.lineTo(arrow.x + arrow.width / 2, arrow.y + arrow.height + 5)
        ctx.lineTo(arrow.x + arrow.width, arrow.y + arrow.height)
        ctx.fill()
      }
    })
  }

  const drawUI = (ctx: CanvasRenderingContext2D) => {
    // Level indicator
    ctx.fillStyle = "#f8fafc"
    ctx.font = "16px 'Press Start 2P', system-ui"
    ctx.textAlign = "left"
    ctx.fillText(`Level: ${level}`, 10, 40)

    // Progress indicator
    const progress = enemiesDefeatedRef.current / totalEnemiesRef.current
    ctx.fillStyle = "#475569"
    ctx.fillRect(10, 50, 150, 10)
    ctx.fillStyle = "#fbbf24"
    ctx.fillRect(10, 50, 150 * progress, 10)
  }

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.width}
      height={canvasSize.height}
      className="border-2 border-amber-600 bg-slate-800 rounded-md shadow-lg"
    />
  )
}

