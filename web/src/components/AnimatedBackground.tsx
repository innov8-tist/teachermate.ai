import { useEffect, useRef } from 'react'
import './AnimatedBackground.css'

export function AnimatedBackground() {
  const containerRef = useRef<HTMLDivElement>(null)
  const parallaxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!parallaxRef.current) return
      
      const { clientX, clientY } = e
      const { innerWidth, innerHeight } = window
      
      const xPercent = (clientX / innerWidth - 0.5) * 8
      const yPercent = (clientY / innerHeight - 0.5) * 8
      
      parallaxRef.current.style.transform = `translate(${xPercent}px, ${yPercent}px)`
    }

    window.addEventListener('mousemove', handleMouseMove)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  // Generate petals
  const petals = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 8,
    duration: 12 + Math.random() * 8,
    size: 8 + Math.random() * 6,
    rotation: Math.random() * 360,
  }))

  return (
    <div className="cinematic-bg-container" ref={containerRef}>
      {/* Main background layer with zoom and pan */}
      <div className="bg-layer-main">
        <div className="bg-image-wrapper" ref={parallaxRef}>
          <img 
            src="/toch.png" 
            alt="Toc H Institute" 
            className="bg-college-image"
          />
        </div>
      </div>

      {/* Cinematic overlay with lighting */}
      <div className="cinematic-overlay">
        <div className="light-rays"></div>
        <div className="vignette"></div>
      </div>

      {/* Animated clouds */}
      <div className="clouds-layer">
        <div className="cloud cloud-1"></div>
        <div className="cloud cloud-2"></div>
        <div className="cloud cloud-3"></div>
      </div>

      {/* Floating flower petals */}
      <div className="petals-container">
        {petals.map((petal) => (
          <div
            key={petal.id}
            className="petal"
            style={{
              left: `${petal.left}%`,
              animationDelay: `${petal.delay}s`,
              animationDuration: `${petal.duration}s`,
              width: `${petal.size}px`,
              height: `${petal.size * 1.5}px`,
              '--rotation': `${petal.rotation}deg`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Birds in distance */}
      <div className="birds-layer">
        <div className="bird bird-1"></div>
        <div className="bird bird-2"></div>
        <div className="bird bird-3"></div>
      </div>

      {/* Lens flare */}
      <div className="lens-flare"></div>
    </div>
  )
}
