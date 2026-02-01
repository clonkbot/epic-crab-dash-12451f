import { useState, useEffect, useCallback, useRef } from 'react'

interface GameObject {
  id: number
  x: number
  y: number
  type: 'rock' | 'wave' | 'seagull' | 'jellyfish' | 'pearl'
  width: number
  height: number
}

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

type CrabState = 'running' | 'jumping' | 'sliding'

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu')
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('epicCrabDashHighScore')
    return saved ? parseInt(saved) : 0
  })
  const [multiplier, setMultiplier] = useState(1)
  const [crabY, setCrabY] = useState(200)
  const [crabState, setCrabState] = useState<CrabState>('running')
  const [objects, setObjects] = useState<GameObject[]>([])
  const [particles, setParticles] = useState<Particle[]>([])
  const [pearlStreak, setPearlStreak] = useState(0)
  const [gameSpeed, setGameSpeed] = useState(6)
  const [crabFrame, setCrabFrame] = useState(0)
  
  const gameLoopRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)
  const objectIdRef = useRef(0)
  const particleIdRef = useRef(0)
  const jumpVelocityRef = useRef(0)
  const isJumpingRef = useRef(false)
  const isSlidingRef = useRef(false)
  const groundY = 200

  const spawnParticles = useCallback((x: number, y: number, color: string, count: number) => {
    const newParticles: Particle[] = []
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: particleIdRef.current++,
        x,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 1,
        color
      })
    }
    setParticles(prev => [...prev, ...newParticles])
  }, [])

  const startGame = useCallback(() => {
    setGameState('playing')
    setScore(0)
    setMultiplier(1)
    setCrabY(groundY)
    setCrabState('running')
    setObjects([])
    setParticles([])
    setPearlStreak(0)
    setGameSpeed(6)
    isJumpingRef.current = false
    isSlidingRef.current = false
    jumpVelocityRef.current = 0
  }, [])

  const endGame = useCallback(() => {
    setGameState('gameover')
    if (score > highScore) {
      setHighScore(score)
      localStorage.setItem('epicCrabDashHighScore', score.toString())
    }
    spawnParticles(120, crabY + 25, '#ff6b9d', 20)
  }, [score, highScore, crabY, spawnParticles])

  const jump = useCallback(() => {
    if (!isJumpingRef.current && !isSlidingRef.current && gameState === 'playing') {
      isJumpingRef.current = true
      jumpVelocityRef.current = -18
      setCrabState('jumping')
    }
  }, [gameState])

  const slide = useCallback(() => {
    if (!isJumpingRef.current && !isSlidingRef.current && gameState === 'playing') {
      isSlidingRef.current = true
      setCrabState('sliding')
      setTimeout(() => {
        isSlidingRef.current = false
        if (gameState === 'playing') setCrabState('running')
      }, 500)
    }
  }, [gameState])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'menu' || gameState === 'gameover') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault()
          startGame()
        }
        return
      }
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault()
        jump()
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault()
        slide()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameState, jump, slide, startGame])

  useEffect(() => {
    const handleTouch = (e: TouchEvent) => {
      if (gameState === 'menu' || gameState === 'gameover') {
        startGame()
        return
      }
      const touch = e.touches[0]
      const screenHeight = window.innerHeight
      if (touch.clientY < screenHeight / 2) {
        jump()
      } else {
        slide()
      }
    }
    window.addEventListener('touchstart', handleTouch)
    return () => window.removeEventListener('touchstart', handleTouch)
  }, [gameState, jump, slide, startGame])

  useEffect(() => {
    if (gameState !== 'playing') return

    const gameLoop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp
      const delta = timestamp - lastTimeRef.current
      
      if (delta > 16) {
        lastTimeRef.current = timestamp
        
        // Update crab animation frame
        setCrabFrame(f => (f + 1) % 4)

        // Update jump physics
        if (isJumpingRef.current) {
          jumpVelocityRef.current += 1.2
          setCrabY(y => {
            const newY = y + jumpVelocityRef.current
            if (newY >= groundY) {
              isJumpingRef.current = false
              jumpVelocityRef.current = 0
              setCrabState('running')
              return groundY
            }
            return newY
          })
        }

        // Spawn objects
        if (Math.random() < 0.025) {
          const types: ('rock' | 'wave' | 'seagull' | 'jellyfish' | 'pearl')[] = 
            ['rock', 'wave', 'seagull', 'jellyfish', 'pearl', 'pearl']
          const type = types[Math.floor(Math.random() * types.length)]
          
          let y = groundY + 10
          let width = 40
          let height = 40
          
          if (type === 'seagull') {
            y = 80 + Math.random() * 60
            width = 50
            height = 30
          } else if (type === 'jellyfish') {
            y = 100 + Math.random() * 80
            width = 35
            height = 45
          } else if (type === 'wave') {
            width = 60
            height = 50
          } else if (type === 'pearl') {
            y = groundY - 20 + (Math.random() > 0.5 ? -60 : 0)
            width = 25
            height = 25
          }

          setObjects(prev => [...prev, {
            id: objectIdRef.current++,
            x: 900,
            y,
            type,
            width,
            height
          }])
        }

        // Update objects
        setObjects(prev => {
          const updated = prev
            .map(obj => ({ ...obj, x: obj.x - gameSpeed }))
            .filter(obj => obj.x > -100)
          
          // Check collisions
          updated.forEach(obj => {
            const crabBox = {
              x: 100,
              y: crabY,
              width: isSlidingRef.current ? 50 : 40,
              height: isSlidingRef.current ? 25 : 50
            }
            
            const objBox = {
              x: obj.x,
              y: obj.y,
              width: obj.width,
              height: obj.height
            }

            if (
              crabBox.x < objBox.x + objBox.width - 10 &&
              crabBox.x + crabBox.width > objBox.x + 10 &&
              crabBox.y < objBox.y + objBox.height - 10 &&
              crabBox.y + crabBox.height > objBox.y + 10
            ) {
              if (obj.type === 'pearl') {
                setScore(s => s + (10 * multiplier))
                setPearlStreak(p => {
                  const newStreak = p + 1
                  if (newStreak % 5 === 0) {
                    setMultiplier(m => Math.min(m + 1, 5))
                  }
                  return newStreak
                })
                spawnParticles(obj.x, obj.y, '#00ffff', 8)
                obj.x = -1000
              } else {
                endGame()
              }
            }
          })

          return updated.filter(obj => obj.x > -100)
        })

        // Update particles
        setParticles(prev => 
          prev
            .map(p => ({
              ...p,
              x: p.x + p.vx,
              y: p.y + p.vy,
              life: p.life - 0.03
            }))
            .filter(p => p.life > 0)
        )

        // Increase speed over time
        setGameSpeed(s => Math.min(s + 0.001, 15))
        
        // Add score over time
        setScore(s => s + 1)
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop)
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current)
    }
  }, [gameState, crabY, multiplier, gameSpeed, endGame, spawnParticles])

  // Add trail particles while running
  useEffect(() => {
    if (gameState !== 'playing') return
    const interval = setInterval(() => {
      spawnParticles(90, crabY + 40, '#ff6b9d', 1)
    }, 100)
    return () => clearInterval(interval)
  }, [gameState, crabY, spawnParticles])

  const renderCrab = () => {
    const isSliding = crabState === 'sliding'
    const bobOffset = crabState === 'running' ? Math.sin(crabFrame * 0.5) * 3 : 0
    
    return (
      <div 
        className="absolute transition-transform crab-glow"
        style={{ 
          left: 100, 
          top: crabY + bobOffset,
          transform: isSliding ? 'scaleY(0.5) translateY(25px)' : 'scaleY(1)',
          zIndex: 50
        }}
      >
        {/* Crab body */}
        <svg width="50" height="50" viewBox="0 0 50 50">
          {/* Shell */}
          <ellipse cx="25" cy="28" rx="20" ry="15" fill="url(#crabGradient)" />
          <ellipse cx="25" cy="28" rx="16" ry="11" fill="url(#crabInnerGradient)" />
          
          {/* Eyes */}
          <ellipse cx="18" cy="18" rx="6" ry="8" fill="#ff6b9d" />
          <ellipse cx="32" cy="18" rx="6" ry="8" fill="#ff6b9d" />
          <circle cx="18" cy="16" r="4" fill="white" />
          <circle cx="32" cy="16" r="4" fill="white" />
          <circle cx="19" cy="15" r="2" fill="#1a0a2e" />
          <circle cx="33" cy="15" r="2" fill="#1a0a2e" />
          <circle cx="20" cy="14" r="1" fill="white" />
          <circle cx="34" cy="14" r="1" fill="white" />
          
          {/* Claws */}
          <g transform={`rotate(${crabFrame % 2 === 0 ? -10 : 10} 8 35)`}>
            <ellipse cx="5" cy="38" rx="8" ry="5" fill="#ff8fab" />
            <ellipse cx="2" cy="36" rx="4" ry="3" fill="#ff8fab" />
          </g>
          <g transform={`rotate(${crabFrame % 2 === 0 ? 10 : -10} 42 35)`}>
            <ellipse cx="45" cy="38" rx="8" ry="5" fill="#ff8fab" />
            <ellipse cx="48" cy="36" rx="4" ry="3" fill="#ff8fab" />
          </g>
          
          {/* Legs */}
          {[0, 1, 2].map(i => (
            <g key={i}>
              <line 
                x1="10" y1={32 + i * 4} 
                x2={-2 + (crabFrame + i) % 2 * 4} y2={38 + i * 5} 
                stroke="#ff8fab" strokeWidth="3" strokeLinecap="round"
              />
              <line 
                x1="40" y1={32 + i * 4} 
                x2={52 - (crabFrame + i) % 2 * 4} y2={38 + i * 5} 
                stroke="#ff8fab" strokeWidth="3" strokeLinecap="round"
              />
            </g>
          ))}
          
          {/* Smile */}
          <path d="M 20 32 Q 25 36 30 32" stroke="#1a0a2e" strokeWidth="2" fill="none" />
          
          <defs>
            <linearGradient id="crabGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ff6b9d" />
              <stop offset="100%" stopColor="#ff3d7f" />
            </linearGradient>
            <linearGradient id="crabInnerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ff8fab" />
              <stop offset="100%" stopColor="#ff6b9d" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    )
  }

  const renderObject = (obj: GameObject) => {
    switch (obj.type) {
      case 'rock':
        return (
          <svg width={obj.width} height={obj.height} viewBox="0 0 40 40">
            <polygon points="20,2 38,15 35,38 5,38 2,15" fill="url(#rockGrad)" />
            <polygon points="20,8 32,18 30,32 10,32 8,18" fill="#4a4a6a" />
            <defs>
              <linearGradient id="rockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6b6b8a" />
                <stop offset="100%" stopColor="#3a3a5a" />
              </linearGradient>
            </defs>
          </svg>
        )
      case 'wave':
        return (
          <svg width={obj.width} height={obj.height} viewBox="0 0 60 50" className="animate-pulse">
            <path 
              d="M 0 40 Q 15 20 30 40 Q 45 60 60 40 L 60 50 L 0 50 Z" 
              fill="url(#waveGrad)"
            />
            <path 
              d="M 5 38 Q 18 22 30 38" 
              stroke="#80ffff" strokeWidth="2" fill="none" opacity="0.6"
            />
            <defs>
              <linearGradient id="waveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00d4ff" />
                <stop offset="100%" stopColor="#0066ff" />
              </linearGradient>
            </defs>
          </svg>
        )
      case 'seagull':
        return (
          <svg width={obj.width} height={obj.height} viewBox="0 0 50 30" style={{ animation: 'float 0.3s ease-in-out infinite' }}>
            <path 
              d="M 25 15 Q 10 5 0 15 M 25 15 Q 40 5 50 15" 
              stroke="white" strokeWidth="4" fill="none" strokeLinecap="round"
            />
            <circle cx="25" cy="18" r="6" fill="white" />
            <circle cx="23" cy="17" r="2" fill="#1a0a2e" />
            <path d="M 28 19 L 34 18" stroke="#ff9933" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )
      case 'jellyfish':
        return (
          <svg width={obj.width} height={obj.height} viewBox="0 0 35 45" style={{ animation: 'float 1s ease-in-out infinite' }}>
            <ellipse cx="17" cy="12" rx="15" ry="12" fill="url(#jellyGrad)" opacity="0.8" />
            <ellipse cx="17" cy="12" rx="10" ry="8" fill="#ff80ff" opacity="0.5" />
            {[0, 1, 2, 3, 4].map(i => (
              <path 
                key={i}
                d={`M ${7 + i * 5} 22 Q ${9 + i * 5} 32 ${6 + i * 5} 42`}
                stroke="#cc66ff" strokeWidth="2" fill="none" opacity="0.7"
                style={{ animation: `float ${0.5 + i * 0.1}s ease-in-out infinite` }}
              />
            ))}
            <circle cx="12" cy="10" r="2" fill="white" opacity="0.8" />
            <circle cx="22" cy="10" r="2" fill="white" opacity="0.8" />
            <defs>
              <radialGradient id="jellyGrad">
                <stop offset="0%" stopColor="#ff99ff" />
                <stop offset="100%" stopColor="#9933ff" />
              </radialGradient>
            </defs>
          </svg>
        )
      case 'pearl':
        return (
          <svg width={obj.width} height={obj.height} viewBox="0 0 25 25" className="pearl-glow">
            <circle cx="12.5" cy="12.5" r="10" fill="url(#pearlGrad)" />
            <ellipse cx="9" cy="9" rx="4" ry="3" fill="white" opacity="0.7" />
            <defs>
              <radialGradient id="pearlGrad">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="50%" stopColor="#e0ffff" />
                <stop offset="100%" stopColor="#80ffff" />
              </radialGradient>
            </defs>
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a1a] scanlines overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Gradient sky */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, #1a0a2e 0%, #2d1b4e 30%, #0a2a4a 60%, #0a1a3a 100%)'
          }}
        />
        
        {/* Stars */}
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 40}%`,
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              opacity: Math.random() * 0.8 + 0.2,
              animation: `pulse-glow ${2 + Math.random() * 3}s ease-in-out infinite`
            }}
          />
        ))}

        {/* Moon */}
        <div 
          className="absolute w-20 h-20 rounded-full"
          style={{
            top: '10%',
            right: '15%',
            background: 'radial-gradient(circle at 30% 30%, #ffffd0, #ffcc80)',
            boxShadow: '0 0 40px #ffcc80, 0 0 80px #ff9940'
          }}
        />

        {/* Parallax waves */}
        <svg className="absolute bottom-0 left-0 w-full" height="200" preserveAspectRatio="none">
          <path 
            d="M0 150 Q 200 100 400 150 Q 600 200 800 150 Q 1000 100 1200 150 L 1200 200 L 0 200 Z"
            fill="#0a2a4a"
            opacity="0.5"
          >
            <animate attributeName="d" dur="8s" repeatCount="indefinite"
              values="M0 150 Q 200 100 400 150 Q 600 200 800 150 Q 1000 100 1200 150 L 1200 200 L 0 200 Z;
                      M0 150 Q 200 200 400 150 Q 600 100 800 150 Q 1000 200 1200 150 L 1200 200 L 0 200 Z;
                      M0 150 Q 200 100 400 150 Q 600 200 800 150 Q 1000 100 1200 150 L 1200 200 L 0 200 Z"
            />
          </path>
          <path 
            d="M0 170 Q 150 140 300 170 Q 450 200 600 170 Q 750 140 900 170 Q 1050 200 1200 170 L 1200 200 L 0 200 Z"
            fill="#0d3d5c"
            opacity="0.7"
          >
            <animate attributeName="d" dur="6s" repeatCount="indefinite"
              values="M0 170 Q 150 140 300 170 Q 450 200 600 170 Q 750 140 900 170 Q 1050 200 1200 170 L 1200 200 L 0 200 Z;
                      M0 170 Q 150 200 300 170 Q 450 140 600 170 Q 750 200 900 170 Q 1050 140 1200 170 L 1200 200 L 0 200 Z;
                      M0 170 Q 150 140 300 170 Q 450 200 600 170 Q 750 140 900 170 Q 1050 200 1200 170 L 1200 200 L 0 200 Z"
            />
          </path>
        </svg>
      </div>

      {/* Game container */}
      <div className="flex-1 flex items-center justify-center relative z-10">
        <div 
          className="relative bg-gradient-to-b from-[#1a0a2e]/80 to-[#0a2a4a]/80 rounded-2xl overflow-hidden"
          style={{
            width: 'min(800px, 95vw)',
            height: 'min(400px, 60vh)',
            boxShadow: '0 0 40px rgba(0, 200, 255, 0.3), inset 0 0 60px rgba(0, 0, 0, 0.5)',
            border: '2px solid rgba(0, 255, 255, 0.2)'
          }}
        >
          {/* Ground */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-16"
            style={{
              background: 'linear-gradient(180deg, #c2a060 0%, #8b7040 50%, #6b5030 100%)',
              boxShadow: 'inset 0 5px 15px rgba(0,0,0,0.3)'
            }}
          >
            {/* Sand texture dots */}
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-[#d4b896]"
                style={{
                  left: `${(i * 3.5) % 100}%`,
                  top: `${20 + (i % 3) * 20}%`,
                  width: 4,
                  height: 4,
                  opacity: 0.4
                }}
              />
            ))}
          </div>

          {/* Score UI */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
            <div>
              <div className="arcade-font text-[#00ffff] text-xs neon-text mb-1">SCORE</div>
              <div className="arcade-font text-white text-xl">{score.toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="arcade-font text-[#ff6b9d] text-xs neon-text mb-1">
                {multiplier > 1 ? `${multiplier}X MULTIPLIER` : 'MULTIPLIER'}
              </div>
              <div className="flex gap-1 justify-end">
                {[1, 2, 3, 4, 5].map(m => (
                  <div 
                    key={m}
                    className={`w-4 h-4 rounded-full ${m <= multiplier ? 'bg-[#ff6b9d]' : 'bg-[#3a3a5a]'}`}
                    style={{ boxShadow: m <= multiplier ? '0 0 10px #ff6b9d' : 'none' }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* High score */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center">
            <div className="arcade-font text-[#ffcc00] text-xs neon-text">HIGH SCORE</div>
            <div className="arcade-font text-[#ffcc00] text-sm">{highScore.toLocaleString()}</div>
          </div>

          {/* Game objects */}
          {objects.map(obj => (
            <div
              key={obj.id}
              className="absolute"
              style={{ left: obj.x, top: obj.y }}
            >
              {renderObject(obj)}
            </div>
          ))}

          {/* Particles */}
          {particles.map(p => (
            <div
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: p.x,
                top: p.y,
                width: 6,
                height: 6,
                backgroundColor: p.color,
                opacity: p.life,
                boxShadow: `0 0 6px ${p.color}`
              }}
            />
          ))}

          {/* Crab */}
          {gameState !== 'menu' && renderCrab()}

          {/* Menu overlay */}
          {gameState === 'menu' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a1a]/80 backdrop-blur-sm">
              <h1 
                className="arcade-font text-2xl sm:text-4xl text-[#ff6b9d] neon-text mb-2 text-center px-4"
                style={{ textShadow: '0 0 20px #ff6b9d, 0 0 40px #ff3d7f, 0 0 60px #ff6b9d' }}
              >
                EPIC CRAB DASH
              </h1>
              <div className="text-[#00ffff] text-lg mb-8">🦀</div>
              
              <div className="flex flex-col items-center gap-4 mb-8">
                <div className="text-gray-300 text-sm text-center px-4">
                  <span className="text-[#00ffff]">↑ / SPACE / W</span> to Jump
                </div>
                <div className="text-gray-300 text-sm text-center px-4">
                  <span className="text-[#ff6b9d]">↓ / S</span> to Slide
                </div>
                <div className="text-gray-400 text-xs mt-2">Mobile: Tap top half to jump, bottom half to slide</div>
              </div>

              <button
                onClick={startGame}
                className="arcade-font text-lg px-8 py-4 bg-gradient-to-r from-[#ff6b9d] to-[#ff3d7f] text-white rounded-lg
                  hover:scale-105 transition-transform active:scale-95"
                style={{ boxShadow: '0 0 30px rgba(255, 107, 157, 0.5)' }}
              >
                START GAME
              </button>
            </div>
          )}

          {/* Game over overlay */}
          {gameState === 'gameover' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a1a]/90 backdrop-blur-sm">
              <h2 
                className="arcade-font text-2xl sm:text-3xl text-[#ff3d7f] neon-text mb-4"
              >
                GAME OVER
              </h2>
              
              <div className="text-center mb-6">
                <div className="text-gray-400 text-sm mb-1">FINAL SCORE</div>
                <div className="arcade-font text-3xl text-white">{score.toLocaleString()}</div>
                {score >= highScore && score > 0 && (
                  <div className="arcade-font text-sm text-[#ffcc00] neon-text mt-2 animate-pulse">
                    NEW HIGH SCORE!
                  </div>
                )}
              </div>

              <button
                onClick={startGame}
                className="arcade-font text-sm px-6 py-3 bg-gradient-to-r from-[#00d4ff] to-[#0066ff] text-white rounded-lg
                  hover:scale-105 transition-transform active:scale-95"
                style={{ boxShadow: '0 0 20px rgba(0, 212, 255, 0.5)' }}
              >
                PLAY AGAIN
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center py-4 text-gray-500 text-xs tracking-wide">
        Requested by @hiighphill · Built by @clonkbot
      </footer>
    </div>
  )
}