'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  Coins,
  Smartphone,
  Star,
  TrendingUp,
  Users,
  ArrowRight,
  Globe,
  Lock,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import BatanaLogo from './components/BatanaLogo';

const pillars = [
  {
    number: '01',
    title: 'TRUST',
    subtitle: 'ZiG Intelligence Engine',
    description:
      'Live gold prices. Real purchasing power. Transparent exchange rates. See the truth about your money before you commit to anything.',
    color: '#a8845a',
    lightColor: '#f5ece0',
    icon: Shield,
    image: 'trust',
    stats: [
      { label: 'Gold Backing', value: '78%', up: true },
      { label: 'ZiG / USD Official', value: '27.5', up: false },
      { label: 'Market Spread', value: '12%', up: false },
    ],
  },
  {
    number: '02',
    title: 'PROTECT',
    subtitle: 'Gold-Gram Savings & Mukando',
    description:
      'Your savings held in grams of gold. Mukando groups with full transparency. Insurance that pays out automatically with no paperwork.',
    color: '#967554',
    lightColor: '#f0e8d8',
    icon: Coins,
    image: 'protect',
    stats: [
      { label: 'Total Gold Saved', value: '342.8g', up: true },
      { label: 'Active Mukando Groups', value: '1,247', up: true },
      { label: 'Claims Paid (24hrs)', value: '98%', up: true },
    ],
  },
  {
    number: '03',
    title: 'CONNECT',
    subtitle: 'Any Phone. Anywhere. Always.',
    description:
      'Works on a Nokia 3310 in Binga with no internet. USSD *227#. Free transfers under US$20. Your money moves without losing value to fees.',
    color: '#748c3d',
    lightColor: '#e8f0d8',
    icon: Smartphone,
    image: 'connect',
    stats: [
      { label: 'Free Under', value: 'US$20', up: true },
      { label: 'Avg EcoCash Fee Saved', value: '$6.80', up: true },
      { label: 'Works Without Internet', value: 'Yes', up: true },
    ],
  },
  {
    number: '04',
    title: 'BUILD',
    subtitle: 'Credit Without Payslips',
    description:
      'Banks require payslips. You have mukando. BATANA turns your contribution history, savings behaviour, and community trust into a credit score that opens real financial doors.',
    color: '#c4a57e',
    lightColor: '#f8f0e0',
    icon: Star,
    image: 'build',
    stats: [
      { label: 'Min Score for Loan', value: '20/100', up: true },
      { label: 'Max Loan (Score 80+)', value: 'US$500', up: true },
      { label: 'Interest Rate', value: '5-15%', up: true },
    ],
  },
  {
    number: '05',
    title: 'GROW',
    subtitle: 'Community Investment Pools',
    description:
      'Pool US$5 with your neighbors. Fund a farmer or small business through one season. Earn 15-30% when the harvest comes in. Every dollar stays inside Zimbabwe.',
    color: '#f59e0b',
    lightColor: '#fff8e0',
    icon: TrendingUp,
    image: 'grow',
    stats: [
      { label: 'Min Investment', value: 'US$5', up: true },
      { label: 'Target Return', value: '15-30%', up: true },
      { label: 'Cycle Length', value: '90 days', up: true },
    ],
  },
];

const stats = [
  { label: 'ZiG Health Index', value: '78%', sub: 'Gold backing strong', color: '#748c3d' },
  { label: 'Gold Price / Gram', value: 'US$75.55', sub: 'ZiG 2,077 today', color: '#f59e0b' },
  { label: 'Active Mukando Groups', value: '1,247', sub: '+43 this week', color: '#a8845a' },
  { label: 'Total Gold Saved', value: '342.8g', sub: 'Across all users', color: '#967554' },
];

function PillarVisual({ pillar }: { pillar: typeof pillars[0] }) {
  const Icon = pillar.icon;
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
    }}>
      {/* Icon area */}
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '1.5rem',
        background: `linear-gradient(135deg, ${pillar.color}, ${pillar.color}99)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 12px 32px ${pillar.color}40`,
      }}>
        <Icon size={36} color="white" strokeWidth={1.5} />
      </div>

      {/* Pillar number watermark */}
      <div style={{
        fontSize: '8rem',
        fontWeight: '900',
        color: pillar.color,
        opacity: 0.08,
        lineHeight: '1',
        position: 'absolute',
        right: '2rem',
        top: '1rem',
        userSelect: 'none',
      }}>
        {pillar.number}
      </div>

      {/* Stats */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        flex: 1,
      }}>
        {pillar.stats.map((stat, i) => (
          <div key={i} style={{
            background: 'rgba(255, 255, 255, 0.7)',
            borderRadius: '1rem',
            padding: '1rem 1.25rem',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${pillar.color}20`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{
              fontSize: '0.8rem',
              color: '#78716c',
              fontWeight: '500',
            }}>
              {stat.label}
            </div>
            <div style={{
              fontSize: '1.125rem',
              fontWeight: '700',
              color: stat.up ? pillar.color : '#1c1917',
            }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  useEffect(() => {
    const interval = setInterval(() => {
      handleNext();
    }, 6000);
    return () => clearInterval(interval);
  }, [current]);

  const handleNext = () => {
    if (animating) return;
    setDirection('right');
    setAnimating(true);
    setTimeout(() => {
      setCurrent((prev) => (prev + 1) % pillars.length);
      setAnimating(false);
    }, 400);
  };

  const handlePrev = () => {
    if (animating) return;
    setDirection('left');
    setAnimating(true);
    setTimeout(() => {
      setCurrent((prev) => (prev - 1 + pillars.length) % pillars.length);
      setAnimating(false);
    }, 400);
  };

  const goTo = (index: number) => {
    if (animating || index === current) return;
    setDirection(index > current ? 'right' : 'left');
    setAnimating(true);
    setTimeout(() => {
      setCurrent(index);
      setAnimating(false);
    }, 400);
  };

  const pillar = pillars[current];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#faf8f5',
      position: 'relative',
      overflowX: 'hidden',
    }}>
      {/* LIQUID BACKGROUND — prominent and alive */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}>
        {/* Blob 1 — top right, large */}
        <div style={{
          position: 'absolute',
          top: '-15%',
          right: '-10%',
          width: '700px',
          height: '700px',
          background: `radial-gradient(ellipse, ${pillar.color}35 0%, ${pillar.color}10 50%, transparent 80%)`,
          borderRadius: '60% 40% 70% 30% / 50% 60% 40% 50%',
          filter: 'blur(40px)',
          transition: 'background 1.5s ease, border-radius 4s ease',
          animation: 'blob1 10s ease-in-out infinite',
        }} />

        {/* Blob 2 — bottom left, medium */}
        <div style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-5%',
          width: '500px',
          height: '500px',
          background: `radial-gradient(ellipse, ${pillar.color}25 0%, ${pillar.color}08 50%, transparent 80%)`,
          borderRadius: '30% 70% 40% 60% / 60% 30% 70% 40%',
          filter: 'blur(50px)',
          transition: 'background 1.5s ease',
          animation: 'blob2 12s ease-in-out infinite',
        }} />

        {/* Blob 3 — center, subtle */}
        <div style={{
          position: 'absolute',
          top: '40%',
          left: '40%',
          width: '400px',
          height: '400px',
          background: `radial-gradient(ellipse, ${pillar.color}12 0%, transparent 70%)`,
          borderRadius: '50% 50% 30% 70% / 40% 60% 40% 60%',
          filter: 'blur(60px)',
          transition: 'background 1.5s ease',
          animation: 'blob3 8s ease-in-out infinite',
        }} />

        {/* Blob 4 — top left accent */}
        <div style={{
          position: 'absolute',
          top: '5%',
          left: '5%',
          width: '300px',
          height: '300px',
          background: `radial-gradient(ellipse, ${pillar.color}20 0%, transparent 70%)`,
          borderRadius: '70% 30% 50% 50% / 30% 70% 30% 70%',
          filter: 'blur(45px)',
          transition: 'background 1.5s ease',
          animation: 'blob4 15s ease-in-out infinite',
        }} />
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes blob1 {
          0%, 100% { border-radius: 60% 40% 70% 30% / 50% 60% 40% 50%; transform: translate(0, 0) scale(1); }
          33% { border-radius: 40% 60% 30% 70% / 60% 40% 60% 40%; transform: translate(-3%, 5%) scale(1.05); }
          66% { border-radius: 70% 30% 50% 50% / 40% 70% 30% 60%; transform: translate(3%, -3%) scale(0.95); }
        }
        @keyframes blob2 {
          0%, 100% { border-radius: 30% 70% 40% 60% / 60% 30% 70% 40%; transform: translate(0, 0); }
          33% { border-radius: 60% 40% 70% 30% / 40% 60% 30% 70%; transform: translate(4%, -4%); }
          66% { border-radius: 50% 50% 30% 70% / 70% 40% 60% 30%; transform: translate(-3%, 3%); }
        }
        @keyframes blob3 {
          0%, 100% { border-radius: 50% 50% 30% 70% / 40% 60% 40% 60%; transform: scale(1); }
          50% { border-radius: 30% 70% 60% 40% / 60% 40% 60% 40%; transform: scale(1.1); }
        }
        @keyframes blob4 {
          0%, 100% { border-radius: 70% 30% 50% 50% / 30% 70% 30% 70%; transform: translate(0, 0); }
          50% { border-radius: 40% 60% 70% 30% / 60% 30% 70% 40%; transform: translate(5%, 8%); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* CONTENT */}
      <div style={{
        position: 'relative',
        zIndex: 1,
      }}>
        {/* ===== HEADER ===== */}
        <header style={{
          padding: '1.5rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(250, 248, 245, 0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(168, 132, 90, 0.15)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          {/* Logo + Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <BatanaLogo size={48} />
            <div>
              <div style={{
                fontSize: '1.75rem',
                fontWeight: '900',
                color: '#3a2a1c',
                letterSpacing: '0.08em',
                lineHeight: '1',
              }}>
                BATANA
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: '#a8845a',
                fontStyle: 'italic',
                marginTop: '0.1rem',
              }}>
                building together
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{
            display: 'flex',
            gap: '0.25rem',
            background: 'rgba(255, 255, 255, 0.6)',
            padding: '0.5rem',
            borderRadius: '1.5rem',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(168, 132, 90, 0.2)',
          }}>
            {['Trust', 'Wallet', 'Mukando', 'Vimbiso', 'Invest'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                style={{
                  color: '#78716c',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  textDecoration: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '1rem',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(168, 132, 90, 0.1)';
                  e.currentTarget.style.color = '#a8845a';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#78716c';
                }}
              >
                {item}
              </a>
            ))}
          </nav>

          {/* Auth buttons */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button style={{
              background: 'transparent',
              color: '#a8845a',
              padding: '0.625rem 1.5rem',
              borderRadius: '1rem',
              border: '1.5px solid #d4c0a3',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}>
              Sign In
            </button>
            <button style={{
              background: 'linear-gradient(135deg, #a8845a, #967554)',
              color: 'white',
              padding: '0.625rem 1.5rem',
              borderRadius: '1rem',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(168, 132, 90, 0.3)',
            }}>
              Open Account
            </button>
          </div>
        </header>

        {/* ===== HERO ===== */}
        <section style={{
          padding: '5rem 2rem 3rem',
          maxWidth: '1400px',
          margin: '0 auto',
          textAlign: 'center',
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(168, 132, 90, 0.1)',
            border: '1px solid rgba(168, 132, 90, 0.3)',
            borderRadius: '2rem',
            padding: '0.5rem 1.25rem',
            marginBottom: '2rem',
            fontSize: '0.875rem',
            color: '#a8845a',
            fontWeight: '500',
          }}>
            <Globe size={14} />
            <span>Built for every Zimbabwean  from Binga to Borrowdale</span>
          </div>

          <h2 style={{
            fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
            fontWeight: '900',
            color: '#1c1917',
            lineHeight: '1.1',
            marginBottom: '1.5rem',
          }}>
            Your community built your trust.<br />
            <span style={{
              color: '#a8845a',
            }}>
              Now let it build your future.
            </span>
          </h2>

          <p style={{
            fontSize: '1.25rem',
            color: '#57534e',
            maxWidth: '680px',
            margin: '0 auto 2.5rem',
            lineHeight: '1.75',
          }}>
            Save in gold. Build credit through your community.
            Access financial services from any phone, anywhere in Zimbabwe.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button style={{
              background: 'linear-gradient(135deg, #a8845a, #967554)',
              color: 'white',
              padding: '1rem 2.5rem',
              borderRadius: '1.25rem',
              border: 'none',
              fontSize: '1rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(168, 132, 90, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.3s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(168, 132, 90, 0.45)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(168, 132, 90, 0.35)';
            }}>
              Open Your Account
              <ArrowRight size={18} />
            </button>
            <button style={{
              background: 'rgba(255, 255, 255, 0.85)',
              color: '#57534e',
              padding: '1rem 2.5rem',
              borderRadius: '1.25rem',
              border: '1.5px solid #d6d3d1',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = '#a8845a';
              e.currentTarget.style.color = '#a8845a';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.85)';
              e.currentTarget.style.borderColor = '#d6d3d1';
              e.currentTarget.style.color = '#57534e';
            }}>
              Dial *227# to Start
            </button>
          </div>
        </section>

        {/* ===== STATS STRIP ===== */}
        <section style={{
          padding: '0 2rem 3rem',
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1.25rem',
        }}>
          {stats.map((stat, i) => (
            <div key={i} style={{
              background: 'rgba(255, 255, 255, 0.7)',
              borderRadius: '1.5rem',
              padding: '1.75rem',
              border: '1px solid rgba(168, 132, 90, 0.15)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.3s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.08)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.04)';
            }}>
              <div style={{
                fontSize: '0.7rem',
                color: '#78716c',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '0.75rem',
              }}>
                {stat.label}
              </div>
              <div style={{
                fontSize: '2rem',
                fontWeight: '900',
                color: '#1c1917',
                marginBottom: '0.35rem',
                lineHeight: '1',
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: '0.8rem',
                color: stat.color,
                fontWeight: '600',
              }}>
                {stat.sub}
              </div>
            </div>
          ))}
        </section>

        {/* ===== PILLARS CAROUSEL ===== */}
        <section style={{
          padding: '2rem 2rem 4rem',
          maxWidth: '1400px',
          margin: '0 auto',
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '3rem',
          }}>
            <h3 style={{
              fontSize: '2rem',
              fontWeight: '800',
              color: '#1c1917',
              marginBottom: '0.75rem',
            }}>
              Five Pillars. One System.
            </h3>
            <p style={{
              fontSize: '1rem',
              color: '#78716c',
            }}>
              Each pillar makes the next one stronger.
            </p>
          </div>

          {/* Carousel Container */}
          <div style={{
            background: `linear-gradient(135deg, ${pillar.lightColor}, rgba(255,255,255,0.9))`,
            borderRadius: '2.5rem',
            border: `2px solid ${pillar.color}25`,
            boxShadow: `0 24px 80px ${pillar.color}20`,
            overflow: 'hidden',
            transition: 'all 0.8s ease',
            position: 'relative',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              minHeight: '500px',
            }}>
              {/* Left: Text Content */}
              <div style={{
                padding: '4rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                opacity: animating ? 0 : 1,
                transform: animating
                  ? direction === 'right' ? 'translateX(-30px)' : 'translateX(30px)'
                  : 'translateX(0)',
                transition: 'all 0.4s ease',
              }}>
                <div style={{
                  fontSize: '0.7rem',
                  fontWeight: '800',
                  color: pillar.color,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  marginBottom: '0.75rem',
                }}>
                  Pillar {pillar.number}
                </div>

                <h4 style={{
                  fontSize: '3.5rem',
                  fontWeight: '900',
                  color: '#1c1917',
                  marginBottom: '0.5rem',
                  lineHeight: '1',
                  letterSpacing: '0.02em',
                }}>
                  {pillar.title}
                </h4>

                <p style={{
                  fontSize: '1.125rem',
                  color: pillar.color,
                  fontWeight: '600',
                  marginBottom: '1.5rem',
                }}>
                  {pillar.subtitle}
                </p>

                <p style={{
                  fontSize: '1rem',
                  color: '#57534e',
                  lineHeight: '1.8',
                  marginBottom: '2.5rem',
                }}>
                  {pillar.description}
                </p>

                {/* Dot Nav */}
                <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
                  {pillars.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => goTo(i)}
                      style={{
                        width: current === i ? '2.5rem' : '0.625rem',
                        height: '0.625rem',
                        borderRadius: '1rem',
                        border: 'none',
                        background: current === i ? p.color : '#d6d3d1',
                        cursor: 'pointer',
                        transition: 'all 0.4s ease',
                        padding: 0,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Right: Visual */}
              <div style={{
                padding: '3rem',
                background: `linear-gradient(135deg, ${pillar.color}15, ${pillar.color}05)`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                position: 'relative',
                opacity: animating ? 0 : 1,
                transform: animating
                  ? direction === 'right' ? 'translateX(30px)' : 'translateX(-30px)'
                  : 'translateX(0)',
                transition: 'all 0.4s ease',
              }}>
                <PillarVisual pillar={pillar} />
              </div>
            </div>

            {/* Arrow controls */}
            <button
              onClick={handlePrev}
              style={{
                position: 'absolute',
                left: '1.5rem',
                bottom: '2rem',
                width: '3rem',
                height: '3rem',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.9)',
                border: `1.5px solid ${pillar.color}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: pillar.color,
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleNext}
              style={{
                position: 'absolute',
                right: '1.5rem',
                bottom: '2rem',
                width: '3rem',
                height: '3rem',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #a8845a, #967554)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
                transition: 'all 0.2s',
                boxShadow: `0 4px 16px ${pillar.color}40`,
              }}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </section>

        {/* ===== TRUST STRIP ===== */}
        <section style={{
          padding: '3rem 2rem',
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1.5rem',
        }}>
          {[
            { icon: Lock, title: 'Bank-Grade Security', desc: 'Your PIN is bcrypt-hashed. JWT tokens. Rate limiting on every endpoint.' },
            { icon: Smartphone, title: 'Works on Any Phone', desc: 'Nokia 3310 to iPhone 16. USSD to web app. No internet required for core features.' },
            { icon: BarChart3, title: 'Real Financial Data', desc: 'Live gold prices from LBMA. Real ZiG exchange rates. No estimates, no guesses.' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} style={{
                background: 'rgba(255, 255, 255, 0.65)',
                borderRadius: '1.5rem',
                padding: '2.25rem 2.5rem',
                border: '1px solid rgba(168, 132, 90, 0.15)',
                backdropFilter: 'blur(20px)',
                display: 'flex',
                gap: '1.5rem',
                alignItems: 'flex-start',
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '1rem',
                  background: 'linear-gradient(135deg, #a8845a20, #a8845a10)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={22} color="#a8845a" strokeWidth={1.5} />
                </div>
                <div>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: '#1c1917',
                    marginBottom: '0.5rem',
                  }}>
                    {item.title}
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#78716c',
                    lineHeight: '1.6',
                  }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* ===== FINAL CTA ===== */}
        <section style={{
          padding: '2rem 2rem 5rem',
          maxWidth: '1400px',
          margin: '0 auto',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #3a2a1c, #523c28)',
            borderRadius: '2.5rem',
            padding: '4rem',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Inner glow */}
            <div style={{
              position: 'absolute',
              top: '-30%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '60%',
              height: '200%',
              background: 'radial-gradient(ellipse, rgba(168, 132, 90, 0.2), transparent)',
              pointerEvents: 'none',
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <h3 style={{
                fontSize: 'clamp(1.75rem, 4vw, 3rem)',
                fontWeight: '900',
                color: 'white',
                marginBottom: '1rem',
                lineHeight: '1.2',
              }}>
                Your mukando history.<br />
                <span style={{ color: '#f59e0b' }}>Your credit score.</span>
              </h3>
              <p style={{
                fontSize: '1.125rem',
                color: '#d4c0a3',
                marginBottom: '2.5rem',
                maxWidth: '600px',
                margin: '0 auto 2.5rem',
                lineHeight: '1.75',
              }}>
                Contribute consistently to your mukando. Hit your savings targets.
                Repay on time. BATANA tracks it all and converts it into a
                Vimbiso Score - your key to loans, insurance, and investment pools
                without ever setting foot in a bank.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: 'white',
                  padding: '1rem 2.5rem',
                  borderRadius: '1.25rem',
                  border: 'none',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(245, 158, 11, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.3s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}>
                  Open Your Account
                  <ArrowRight size={18} />
                </button>
                <button style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  padding: '1rem 2.5rem',
                  borderRadius: '1.25rem',
                  border: '1.5px solid rgba(255, 255, 255, 0.2)',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                }}>
                  Dial *227# on any phone
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer style={{
          background: 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(168, 132, 90, 0.15)',
          padding: '3rem 2rem',
        }}>
          <div style={{
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            gap: '3rem',
          }}>
            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <BatanaLogo size={36} />
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#3a2a1c', letterSpacing: '0.08em' }}>
                    BATANA
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#a8845a', fontStyle: 'italic' }}>
                    building together
                  </div>
                </div>
              </div>
              <p style={{
                fontSize: '0.875rem',
                color: '#78716c',
                lineHeight: '1.6',
                maxWidth: '280px',
              }}>
                A unified financial operating system for every Zimbabwean. Banking, assurance, trading, and nationwide adoption.
              </p>
            </div>

            {/* Links */}
            {[
              {
                title: 'Features',
                links: ['Trust Engine', 'Mukando', 'Gold Savings', 'Vimbiso Score', 'Invest'],
              },
              {
                title: 'Access',
                links: ['Web App', 'USSD *227#', 'Android App', 'Agent Network'],
              },
              {
                title: 'Support',
                links: ['How It Works', 'FAQ', 'Contact', 'Privacy Policy'],
              },
            ].map((col) => (
              <div key={col.title}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  color: '#3a2a1c',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '1rem',
                }}>
                  {col.title}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {col.links.map((link) => (
                    <a key={link} href="#" style={{
                      fontSize: '0.875rem',
                      color: '#78716c',
                      textDecoration: 'none',
                      transition: 'color 0.2s',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.color = '#a8845a'; }}
                    onMouseOut={(e) => { e.currentTarget.style.color = '#78716c'; }}>
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div style={{
            maxWidth: '1400px',
            margin: '2.5rem auto 0',
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(168, 132, 90, 0.15)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <p style={{ fontSize: '0.8rem', color: '#a8a29e' }}>
              © 2026 BATANA. Building financial freedom across Zimbabwe.
            </p>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <Users size={16} color="#a8a29e" />
              <Globe size={16} color="#a8a29e" />
              <Lock size={16} color="#a8a29e" />
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}