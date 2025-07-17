import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from './ui/button'

interface Bird {
  x: number
  y: number
  velocity: number
}

interface Pipe {
  x: number
  topHeight: number
  bottomY: number
  passed: boolean
}

const BIRD_SIZE = 40
const PIPE_WIDTH = 80
const PIPE_GAP = 220
const GRAVITY = 0.8
const JUMP_FORCE = -8
const PIPE_SPEED = 3
const MAX_VELOCITY = 10
const GAME_HEIGHT = 600
const GAME_WIDTH = 800

export default function FlappyBird() {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameOver'>('start')
  const [bird, setBird] = useState<Bird>({ x: 100, y: GAME_HEIGHT / 2, velocity: 0 })
  const [pipes, setPipes] = useState<Pipe[]>([])
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('flappyBirdHighScore')
    return saved ? parseInt(saved) : 0
  })
  
  const gameLoopRef = useRef<number>()
  const gameAreaRef = useRef<HTMLDivElement>(null)

  const resetGame = useCallback(() => {
    setBird({ x: 100, y: GAME_HEIGHT / 2, velocity: 0 })
    setPipes([])
    setScore(0)
  }, [])

  const jump = useCallback(() => {
    if (gameState === 'start') {
      setGameState('playing')
      setBird(prev => ({ ...prev, velocity: JUMP_FORCE }))
    } else if (gameState === 'playing') {
      setBird(prev => ({ ...prev, velocity: JUMP_FORCE }))
    } else if (gameState === 'gameOver') {
      resetGame()
      setGameState('playing')
      setBird(prev => ({ ...prev, velocity: JUMP_FORCE }))
    }
  }, [gameState, resetGame])

  const generatePipe = useCallback((): Pipe => {
    const topHeight = Math.random() * (GAME_HEIGHT - PIPE_GAP - 100) + 50
    return {
      x: GAME_WIDTH,
      topHeight,
      bottomY: topHeight + PIPE_GAP,
      passed: false
    }
  }, [])

  const checkCollision = useCallback((bird: Bird, pipes: Pipe[]): boolean => {
    // Check ground and ceiling collision
    if (bird.y <= 0 || bird.y >= GAME_HEIGHT - BIRD_SIZE) {
      return true
    }

    // Check pipe collision
    for (const pipe of pipes) {
      if (
        bird.x < pipe.x + PIPE_WIDTH &&
        bird.x + BIRD_SIZE > pipe.x &&
        (bird.y < pipe.topHeight || bird.y + BIRD_SIZE > pipe.bottomY)
      ) {
        return true
      }
    }

    return false
  }, [])

  const gameLoop = useCallback(() => {
    if (gameState !== 'playing') return

    setBird(prev => {
      const newVelocity = Math.min(prev.velocity + GRAVITY, MAX_VELOCITY)
      const newBird = {
        ...prev,
        y: prev.y + newVelocity,
        velocity: newVelocity
      }

      return newBird
    })

    setPipes(prev => {
      let newPipes = prev.map(pipe => ({ ...pipe, x: pipe.x - PIPE_SPEED }))
      
      // Remove pipes that are off screen
      newPipes = newPipes.filter(pipe => pipe.x > -PIPE_WIDTH)
      
      // Add new pipe if needed
      if (newPipes.length === 0 || newPipes[newPipes.length - 1].x < GAME_WIDTH - 300) {
        newPipes.push(generatePipe())
      }

      // Check for score increase
      newPipes.forEach(pipe => {
        if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
          pipe.passed = true
          setScore(s => s + 1)
        }
      })

      return newPipes
    })
  }, [gameState, bird.x, generatePipe])

  // Game loop effect
  useEffect(() => {
    const runGameLoop = () => {
      if (gameState === 'playing') {
        gameLoop()
        gameLoopRef.current = requestAnimationFrame(runGameLoop)
      }
    }

    if (gameState === 'playing') {
      gameLoopRef.current = requestAnimationFrame(runGameLoop)
    }

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [gameState, gameLoop])

  // Collision detection effect
  useEffect(() => {
    if (gameState === 'playing' && checkCollision(bird, pipes)) {
      setGameState('gameOver')
      if (score > highScore) {
        setHighScore(score)
        localStorage.setItem('flappyBirdHighScore', score.toString())
      }
    }
  }, [bird, pipes, gameState, checkCollision, score, highScore])

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault()
        jump()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [jump])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="mb-4 text-center">
        <h1 className="text-4xl font-pixel text-primary mb-2">Flappy Bird</h1>
        <div className="flex gap-8 text-lg font-pixel">
          <span className="text-foreground">Score: {score}</span>
          <span className="text-accent">Best: {highScore}</span>
        </div>
      </div>

      <div 
        ref={gameAreaRef}
        className="relative bg-gradient-to-b from-blue-300 to-blue-500 border-4 border-primary rounded-lg overflow-hidden cursor-pointer"
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
        onClick={jump}
      >
        {/* Background clouds */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-16 h-10 bg-white rounded-full opacity-80"></div>
          <div className="absolute top-32 left-60 w-20 h-12 bg-white rounded-full opacity-70"></div>
          <div className="absolute top-16 right-40 w-14 h-8 bg-white rounded-full opacity-75"></div>
          <div className="absolute top-40 right-20 w-18 h-10 bg-white rounded-full opacity-65"></div>
        </div>

        {/* Ground */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-green-500 border-t-4 border-green-600">
          <div className="h-full bg-gradient-to-r from-green-400 to-green-600"></div>
        </div>

        {/* Pipes */}
        {pipes.map((pipe, index) => (
          <div key={index}>
            {/* Top pipe */}
            <div
              className="absolute bg-green-600 border-2 border-green-700"
              style={{
                left: pipe.x,
                top: 0,
                width: PIPE_WIDTH,
                height: pipe.topHeight,
              }}
            >
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-green-700"></div>
            </div>
            {/* Bottom pipe */}
            <div
              className="absolute bg-green-600 border-2 border-green-700"
              style={{
                left: pipe.x,
                top: pipe.bottomY,
                width: PIPE_WIDTH,
                height: GAME_HEIGHT - pipe.bottomY - 80, // Account for ground
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-8 bg-green-700"></div>
            </div>
          </div>
        ))}

        {/* Bird */}
        <div
          className="absolute transition-transform duration-100"
          style={{
            left: bird.x,
            top: bird.y,
            width: BIRD_SIZE,
            height: BIRD_SIZE,
            transform: `rotate(${Math.min(Math.max(bird.velocity * 3, -30), 30)}deg)`,
          }}
        >
          <div className="w-full h-full bg-accent rounded-full border-2 border-yellow-600 relative animate-bird-flap">
            {/* Bird eye */}
            <div className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full">
              <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-black rounded-full"></div>
            </div>
            {/* Bird beak */}
            <div className="absolute top-4 -right-1 w-0 h-0 border-l-4 border-l-orange-500 border-t-2 border-t-transparent border-b-2 border-b-transparent"></div>
          </div>
        </div>

        {/* Game state overlays */}
        {gameState === 'start' && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-center text-white">
              <h2 className="text-3xl font-pixel mb-4">Ready to Fly?</h2>
              <p className="text-lg mb-6">Click or press SPACE to jump!</p>
              <Button onClick={jump} className="font-pixel bg-accent hover:bg-accent/90 text-black">
                Start Game
              </Button>
            </div>
          </div>
        )}

        {gameState === 'gameOver' && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-center text-white">
              <h2 className="text-3xl font-pixel mb-4 text-red-400">Game Over!</h2>
              <p className="text-xl font-pixel mb-2">Score: {score}</p>
              {score === highScore && score > 0 && (
                <p className="text-lg font-pixel mb-4 text-accent">New High Score! 🎉</p>
              )}
              <Button onClick={jump} className="font-pixel bg-accent hover:bg-accent/90 text-black">
                Play Again
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-center text-sm text-muted-foreground">
        <p>Click the game area or press SPACE to jump</p>
        <p className="mt-1">Avoid the pipes and try to get the highest score!</p>
      </div>
    </div>
  )
}