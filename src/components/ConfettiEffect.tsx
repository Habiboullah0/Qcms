'use client'

import { useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'

export default function ConfettiEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    
    const myConfetti = confetti.create(canvasRef.current, {
      resize: true,
      useWorker: true
    })
    
    // Fire confetti
    const duration = 3 * 1000
    const end = Date.now() + duration
    
    const colors = ['#4F46E5', '#10B981', '#F59E0B']
    
    // Initial burst
    myConfetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors
    })
    
    // Continuous animation
    const interval = setInterval(() => {
      if (Date.now() > end) {
        clearInterval(interval)
        return
      }
      
      myConfetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors
      })
      
      myConfetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors
      })
    }, 250)
    
    return () => {
      clearInterval(interval)
    }
  }, [])
  
  return (
    <canvas 
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ width: '100vw', height: '100vh' }}
    />
  )
}
