'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  
  useEffect(() => {
    // Instant redirect to login (mobile-first flow)
    router.push('/login')
  }, [router])

  // Minimal loading state while redirect happens
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(160deg, #faf8f5, #f2ede4)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '320px',
        padding: '24px'
      }}>
        {/* BATANA Logo */}
        <div style={{
          width: '64px',
          height: '64px',
          background: '#a8845a',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 8px 24px rgba(168, 132, 90, 0.2)'
        }}>
          <span style={{
            fontSize: '32px',
            fontWeight: '700',
            color: 'white'
          }}>B</span>
        </div>

        {/* Loading text */}
        <p style={{
          fontSize: '15px',
          color: '#57534e',
          fontWeight: '500'
        }}>
          Opening BATANA...
        </p>

        {/* Subtle loading indicator */}
        <div style={{
          width: '32px',
          height: '4px',
          background: '#e7e5e4',
          borderRadius: '2px',
          margin: '16px auto 0',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '50%',
            height: '100%',
            background: '#a8845a',
            borderRadius: '2px',
            animation: 'slide 1s ease-in-out infinite'
          }} />
        </div>
      </div>

      {/* CSS animation */}
      <style>{`
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  )
}