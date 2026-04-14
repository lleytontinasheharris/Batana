'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Wallet',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        {/* Wallet body */}
        <rect
          x="3" y="7" width="18" height="13" rx="2.5"
          stroke={active ? '#a8845a' : '#a8a29e'} strokeWidth="2"
          fill={active ? 'rgba(168,132,90,0.15)' : 'none'}
        />
        {/* Card slot */}
        <path
          d="M3 11h18"
          stroke={active ? '#a8845a' : '#a8a29e'} strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Flap */}
        <path
          d="M7 7V5.5C7 4.67 7.67 4 8.5 4h7c.83 0 1.5.67 1.5 1.5V7"
          stroke={active ? '#a8845a' : '#a8a29e'} strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Card dot */}
        {active && (
          <circle cx="17" cy="14.5" r="1.5" fill="#a8845a" />
        )}
        {!active && (
          <circle cx="17" cy="14.5" r="1" fill="#a8a29e" />
        )}
      </svg>
    ),
  },
  {
    href: '/mukando',
    label: 'Mukando',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        {/* Main person */}
        <circle
          cx="9" cy="7" r="3.5"
          stroke={active ? '#a8845a' : '#a8a29e'} strokeWidth="2"
          fill={active ? 'rgba(168,132,90,0.15)' : 'none'}
        />
        <path
          d="M2 20c0-3.866 3.582-7 8-7 4.418 0 8 3.134 8 7"
          stroke={active ? '#a8845a' : '#a8a29e'} strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Second person */}
        <circle
          cx="17" cy="9" r="2.5"
          stroke={active ? '#a8845a' : '#a8a29e'} strokeWidth="2"
          fill={active ? 'rgba(168,132,90,0.1)' : 'none'}
        />
        <path
          d="M22 20v-2c0-2.21-1.79-4-4-4"
          stroke={active ? '#a8845a' : '#a8a29e'} strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: '/score',
    label: 'Score',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        {/* Star outline */}
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          stroke={active ? '#a8845a' : '#a8a29e'}
          strokeWidth="2"
          fill={active ? 'rgba(168,132,90,0.2)' : 'none'}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Inner glow when active */}
        {active && (
          <path
            d="M12 6l1.5 3.5L17 10.5l-2.5 2.5.5 3.5L12 15l-3 1.5.5-3.5L7 10.5l3.5-1L12 6z"
            fill="rgba(168,132,90,0.3)"
          />
        )}
      </svg>
    ),
  },
  {
    href: '/insurance',
    label: 'Protect',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        {/* Shield */}
        <path
          d="M12 3L4.5 6.5v5.5c0 5.25 3.5 9.5 7.5 10.5 4-1 7.5-5.25 7.5-10.5V6.5L12 3z"
          stroke={active ? '#a8845a' : '#a8a29e'}
          strokeWidth="2"
          fill={active ? 'rgba(168,132,90,0.15)' : 'none'}
          strokeLinejoin="round"
        />
        {/* Checkmark */}
        <path
          d="M9 12l2 2 4-4"
          stroke={active ? '#a8845a' : '#a8a29e'}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: '/grow',
    label: 'Grow',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        {/* Stem */}
        <path
          d="M12 22V11"
          stroke={active ? '#748c3d' : '#a8a29e'}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Left leaf */}
        <path
          d="M12 11C12 11 8.5 9.5 6 5c4.5 0 6 3 6 6z"
          stroke={active ? '#748c3d' : '#a8a29e'}
          strokeWidth="2"
          fill={active ? 'rgba(116,140,61,0.25)' : 'none'}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Right leaf */}
        <path
          d="M12 11C12 11 15.5 9.5 18 5c-4.5 0-6 3-6 6z"
          stroke={active ? '#748c3d' : '#a8a29e'}
          strokeWidth="2"
          fill={active ? 'rgba(116,140,61,0.25)' : 'none'}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Bottom leaf */}
        <path
          d="M12 16C12 16 9 14.5 7.5 11c3 0 4.5 2.5 4.5 5z"
          stroke={active ? '#748c3d' : '#a8a29e'}
          strokeWidth="2"
          fill={active ? 'rgba(116,140,61,0.2)' : 'none'}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [pressed, setPressed] = useState<string | null>(null);

  function isActive(href: string): boolean {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  function activeColor(href: string): string {
    if (href === '/grow') return '#748c3d';
    return '#a8845a';
  }

  return (
    <>
      {/* Spacer */}
      <div style={{ height: '80px' }} />

      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '480px',
        background: 'linear-gradient(180deg, rgba(250,248,245,0.95) 0%, rgba(250,248,245,0.98) 100%)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(168,132,90,0.15)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.04)',
        display: 'flex',
        alignItems: 'stretch',
        zIndex: 100,
        paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
        paddingTop: '4px',
      }}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const color  = active ? activeColor(item.href) : '#a8a29e';
          const isPressed = pressed === item.href;

          return (
            <a
              key={item.href}
              href={item.href}
              onMouseDown={() => setPressed(item.href)}
              onMouseUp={() => setPressed(null)}
              onMouseLeave={() => setPressed(null)}
              onTouchStart={() => setPressed(item.href)}
              onTouchEnd={() => setPressed(null)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.75rem 0.5rem 0.625rem',
                textDecoration: 'none',
                gap: '0.375rem',
                position: 'relative',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isPressed ? 'scale(0.92)' : 'scale(1)',
                opacity: isPressed ? 0.7 : 1,
              }}
            >
              {/* Active indicator pill */}
              {active && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '32px',
                  height: '4px',
                  borderRadius: '0 0 4px 4px',
                  background: `linear-gradient(180deg, ${color}, ${color}cc)`,
                  boxShadow: `0 2px 8px ${color}40`,
                }} />
              )}

              {/* Icon container with background glow */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '44px',
                height: '32px',
                borderRadius: '12px',
                background: active
                  ? item.href === '/grow'
                    ? 'linear-gradient(135deg, rgba(116,140,61,0.15), rgba(116,140,61,0.08))'
                    : 'linear-gradient(135deg, rgba(168,132,90,0.15), rgba(168,132,90,0.08))'
                  : 'transparent',
                transition: 'all 0.2s ease',
                boxShadow: active
                  ? `0 2px 8px ${item.href === '/grow' ? 'rgba(116,140,61,0.2)' : 'rgba(168,132,90,0.2)'}`
                  : 'none',
              }}>
                {item.icon(active)}
              </div>

              {/* Label with weight animation */}
              <span style={{
                fontSize: '0.65rem',
                fontWeight: active ? '700' : '500',
                color,
                letterSpacing: active ? '0.03em' : '0.01em',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                transition: 'all 0.2s ease',
                textTransform: active ? 'none' : 'none',
              }}>
                {item.label}
              </span>

              {/* Subtle ripple effect on press */}
              {isPressed && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${color}20, transparent)`,
                  pointerEvents: 'none',
                  animation: 'ripple 0.6s ease-out',
                }} />
              )}
            </a>
          );
        })}
      </nav>
      

      {/* Ripple animation */}
      <style>{`
        @keyframes ripple {
          from {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
          }
          to {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}

