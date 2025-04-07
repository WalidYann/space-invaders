"use client"

import { useEffect, useRef, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Text, OrbitControls, Sky } from "@react-three/drei"
import * as THREE from "three"

// Game constants
const PLAYER_WIDTH = 1
const PLAYER_HEIGHT = 1.2
const ENEMY_WIDTH = 0.8
const ENEMY_HEIGHT = 0.8
const ARROW_WIDTH = 0.1
const ARROW_HEIGHT = 0.4
const ENEMY_ROWS = 3
const ENEMIES_PER_ROW = 5
const ENEMY_PADDING = 2
const ENEMY_MOVE_SPEED_BASE = 0.01
const ENEMY_MOVE_DOWN = 0.4
const ARROW_SPEED = 0.15
const ENEMY_SHOOT_CHANCE_BASE = 0.002

// Arrow colors for player
const ARROW_COLORS = [0xfbbf24, 0xef4444, 0x3b82f6, 0x10b981, 0x8b5cf6, 0xec4899]

interface GameCanvas3DProps {
  onGameOver: () => void
  onScoreIncrement: (points: number) => void
  onLevelUp: () => void
  level: number
}

interface GameObject3D {
  position: THREE.Vector3
  size: THREE.Vector3
  active: boolean
}

interface Player3D extends GameObject3D {
  speed: number
  lives: number
}

interface Enemy3D extends GameObject3D {
  type: number
  points: number
}

interface Arrow3D extends GameObject3D {
  isPlayerArrow: boolean
  color?: number
}

export default function GameCanvas3D({ onGameOver, onScoreIncrement, onLevelUp, level }: GameCanvas3DProps) {
  const [audioInitialized, setAudioInitialized] = useState(false)

  // Initialize audio
  useEffect(() => {
    if (typeof window !== "undefined") {
      const bgMusic = new Audio("/sounds/background-music.mp3")
      bgMusic.loop = true
      bgMusic.volume = 0.5

      const startAudio = () => {
        bgMusic.play().catch((e) => console.log("Audio play failed:", e))
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

      setAudioInitialized(true)

      return () => {
        bgMusic.pause()
        window.removeEventListener("click", handleUserInteraction)
        window.removeEventListener("keydown", handleUserInteraction)
      }
    }
  }, [])

  return (
    <div className="w-full aspect-video border-2 border-amber-600 bg-slate-800 rounded-md shadow-lg overflow-hidden">
      <Canvas shadows camera={{ position: [0, 5, 10], fov: 60 }}>
        <Sky sunPosition={[100, 20, 100]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <Game onGameOver={onGameOver} onScoreIncrement={onScoreIncrement} onLevelUp={onLevelUp} level={level} />
        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2.2} />
      </Canvas>
    </div>
  )
}

function Game({ onGameOver, onScoreIncrement, onLevelUp, level }: GameCanvas3DProps) {
  const { toast } = useToast()
  const { camera } = useThree()

  // Game state refs
  const playerRef = useRef<Player3D>({
    position: new THREE.Vector3(0, PLAYER_HEIGHT / 2, 8),
    size: new THREE.Vector3(PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_WIDTH),
    speed: 0.1,
    lives: 3,
    active: true,
  })
  const enemiesRef = useRef<Enemy3D[]>([])
  const arrowsRef = useRef<Arrow3D[]>([])
  const keysRef = useRef<{ [key: string]: boolean }>({})
  const lastShotTimeRef = useRef<number>(0)
  const enemyDirectionRef = useRef<number>(1)
  const gameFrameRef = useRef<number>(0)
  const enemiesDefeatedRef = useRef<number>(0)
  const totalEnemiesRef = useRef<number>(0)
  const shootSoundRef = useRef<HTMLAudioElement | null>(null)

  // Initialize game
  useEffect(() => {
    // Initialize shoot sound
    shootSoundRef.current = new Audio("/sounds/shoot.mp3")
    shootSoundRef.current.volume = 0.3

    // Initialize enemies
    initializeEnemies()

    // Set up keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
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
    const enemies: Enemy3D[] = []
    const startX = -((ENEMY_WIDTH + ENEMY_PADDING) * ENEMIES_PER_ROW - ENEMY_PADDING) / 2

    for (let row = 0; row < ENEMY_ROWS; row++) {
      for (let col = 0; col < ENEMIES_PER_ROW; col++) {
        const enemyType = ENEMY_ROWS - row - 1 // Higher rows have stronger enemies
        enemies.push({
          position: new THREE.Vector3(
            startX + col * (ENEMY_WIDTH + ENEMY_PADDING),
            ENEMY_HEIGHT / 2,
            -2 - row * (ENEMY_HEIGHT + ENEMY_PADDING),
          ),
          size: new THREE.Vector3(ENEMY_WIDTH, ENEMY_HEIGHT, ENEMY_WIDTH),
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
  useFrame((state, delta) => {
    gameFrameRef.current++

    // Update game state
    updatePlayer()
    updateEnemies()
    updateArrows()
    checkCollisions()

    // Check win condition
    if (enemiesRef.current.filter((e) => e.active).length === 0) {
      onLevelUp()
      return
    }

    // Check game over condition
    if (!playerRef.current.active) {
      onGameOver()
      return
    }
  })

  // Update player position and handle shooting
  const updatePlayer = () => {
    const player = playerRef.current

    // Move left/right
    if (keysRef.current["ArrowLeft"] || keysRef.current["a"]) {
      player.position.x = Math.max(-8, player.position.x - player.speed)
    }
    if (keysRef.current["ArrowRight"] || keysRef.current["d"]) {
      player.position.x = Math.min(8, player.position.x + player.speed)
    }

    // Shoot arrows
    if ((keysRef.current[" "] || keysRef.current["ArrowUp"]) && gameFrameRef.current - lastShotTimeRef.current > 15) {
      // Get random color for the arrow
      const randomColor = ARROW_COLORS[Math.floor(Math.random() * ARROW_COLORS.length)]

      arrowsRef.current.push({
        position: new THREE.Vector3(player.position.x, player.position.y, player.position.z - player.size.z / 2),
        size: new THREE.Vector3(ARROW_WIDTH, ARROW_HEIGHT, ARROW_WIDTH),
        active: true,
        isPlayerArrow: true,
        color: randomColor,
      })

      // Play shoot sound
      if (shootSoundRef.current) {
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
      const rightmostEnemy = Math.max(...activeEnemies.map((e) => e.position.x + e.size.x / 2))
      const leftmostEnemy = Math.min(...activeEnemies.map((e) => e.position.x - e.size.x / 2))

      if (rightmostEnemy >= 8) {
        enemyDirectionRef.current = -1
        moveDown = true
      } else if (leftmostEnemy <= -8) {
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

      enemy.position.x += enemyDirectionRef.current * enemySpeed
      if (moveDown) {
        enemy.position.z += ENEMY_MOVE_DOWN
      }

      // Check if enemies reached the player
      if (enemy.position.z + enemy.size.z / 2 >= playerRef.current.position.z) {
        playerRef.current.active = false
      }

      // Enemy shooting
      const shootChance = ENEMY_SHOOT_CHANCE_BASE * level * (1 + enemy.type / 3)
      if (Math.random() < shootChance) {
        arrowsRef.current.push({
          position: new THREE.Vector3(enemy.position.x, enemy.position.y, enemy.position.z + enemy.size.z / 2),
          size: new THREE.Vector3(ARROW_WIDTH, ARROW_HEIGHT, ARROW_WIDTH),
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
        arrow.position.z -= ARROW_SPEED
        if (arrow.position.z < -10) {
          arrow.active = false
        }
      } else {
        arrow.position.z += ARROW_SPEED * 0.4
        if (arrow.position.z > 10) {
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

        if (checkCollision3D(arrow, enemy)) {
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

      if (checkCollision3D(arrow, player)) {
        arrow.active = false
        player.lives--

        if (player.lives <= 0) {
          player.active = false
        }
      }
    })
  }

  // Helper function to check collision between two 3D objects
  const checkCollision3D = (obj1: GameObject3D, obj2: GameObject3D) => {
    return (
      Math.abs(obj1.position.x - obj2.position.x) < (obj1.size.x + obj2.size.x) / 2 &&
      Math.abs(obj1.position.y - obj2.position.y) < (obj1.size.y + obj2.size.y) / 2 &&
      Math.abs(obj1.position.z - obj2.position.z) < (obj1.size.z + obj2.size.z) / 2
    )
  }

  return (
    <>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* Castle in the background */}
      <group position={[0, 0, 10]}>
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[10, 1, 1]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        {[-4, -2, 0, 2, 4].map((x, i) => (
          <mesh key={i} position={[x, 1.5, 0]} castShadow>
            <boxGeometry args={[1, 2, 1]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
        ))}
      </group>

      {/* Player */}
      {playerRef.current.active && (
        <group position={[playerRef.current.position.x, playerRef.current.position.y, playerRef.current.position.z]}>
          {/* Body */}
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_WIDTH]} />
            <meshStandardMaterial color="#fbbf24" />
          </mesh>

          {/* Bow */}
          <mesh position={[0, 0.2, -0.3]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <torusGeometry args={[0.3, 0.05, 16, 32, Math.PI * 1.5]} />
            <meshStandardMaterial color="#92400e" />
          </mesh>

          {/* Lives display */}
          {Array.from({ length: playerRef.current.lives }).map((_, i) => (
            <mesh key={i} position={[-0.8 + i * 0.4, 1, 0]} castShadow>
              <sphereGeometry args={[0.15, 16, 16]} />
              <meshStandardMaterial color="#ef4444" />
            </mesh>
          ))}
        </group>
      )}

      {/* Enemies */}
      {enemiesRef.current
        .filter((e) => e.active)
        .map((enemy, index) => (
          <group key={index} position={[enemy.position.x, enemy.position.y, enemy.position.z]}>
            <mesh castShadow>
              <boxGeometry args={[enemy.size.x, enemy.size.y, enemy.size.z]} />
              <meshStandardMaterial
                color={
                  enemy.type === 0 ? "#4ade80" : enemy.type === 1 ? "#a3e635" : enemy.type === 2 ? "#84cc16" : "#65a30d"
                }
              />
            </mesh>

            {/* Additional details based on enemy type */}
            {enemy.type >= 1 && (
              <>
                <mesh position={[-0.2, 0.5, -0.2]} castShadow>
                  <coneGeometry args={[0.1, 0.2, 16]} />
                  <meshStandardMaterial color="#d97706" />
                </mesh>
                <mesh position={[0.2, 0.5, -0.2]} castShadow>
                  <coneGeometry args={[0.1, 0.2, 16]} />
                  <meshStandardMaterial color="#d97706" />
                </mesh>
              </>
            )}

            {enemy.type >= 2 && (
              <mesh position={[0.4, 0, 0]} castShadow>
                <boxGeometry args={[0.1, 0.5, 0.1]} />
                <meshStandardMaterial color="#78350f" />
              </mesh>
            )}

            {enemy.type >= 3 && (
              <>
                <mesh position={[-0.5, 0, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
                  <boxGeometry args={[0.6, 0.1, 0.3]} />
                  <meshStandardMaterial color="#65a30d" />
                </mesh>
                <mesh position={[0.5, 0, 0]} rotation={[0, 0, -Math.PI / 4]} castShadow>
                  <boxGeometry args={[0.6, 0.1, 0.3]} />
                  <meshStandardMaterial color="#65a30d" />
                </mesh>
              </>
            )}
          </group>
        ))}

      {/* Arrows */}
      {arrowsRef.current
        .filter((a) => a.active)
        .map((arrow, index) => (
          <mesh
            key={index}
            position={[arrow.position.x, arrow.position.y, arrow.position.z]}
            rotation={[arrow.isPlayerArrow ? -Math.PI / 2 : Math.PI / 2, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.05, 0.05, 0.4, 8]} />
            <meshStandardMaterial
              color={arrow.isPlayerArrow ? arrow.color || 0xfbbf24 : 0x84cc16}
              emissive={arrow.isPlayerArrow ? arrow.color || 0xfbbf24 : 0}
              emissiveIntensity={arrow.isPlayerArrow ? 0.5 : 0}
            />
          </mesh>
        ))}

      {/* Level and progress indicator */}
      <Text position={[-5, 3, 0]} color="white" fontSize={0.5} anchorX="left" anchorY="middle">
        {`Level: ${level}`}
      </Text>

      <group position={[-5, 2.5, 0]}>
        <mesh>
          <boxGeometry args={[3, 0.2, 0.1]} />
          <meshBasicMaterial color="#475569" />
        </mesh>
        <mesh position={[-(3 - 3 * (enemiesDefeatedRef.current / totalEnemiesRef.current)) / 2, 0, 0]}>
          <boxGeometry args={[3 * (enemiesDefeatedRef.current / totalEnemiesRef.current), 0.2, 0.15]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
      </group>
    </>
  )
}

