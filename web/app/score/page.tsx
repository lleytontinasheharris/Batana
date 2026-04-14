'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Star, TrendingUp, Loader, AlertCircle,
  CheckCircle, ChevronRight, Users, Coins, Shield,
  Activity, Award,
} from 'lucide-react';
import BatanaLogo from '../components/BatanaLogo';
import BottomNav from '../components/BottomNav';
import { getVimbisoScore } from '../lib/api';

function getPhone(): string | null {
  if (typeof window !== 'undefined') return localStorage.getItem('batana_phone');
  return null;
}

function getToken(): string | null {
  if (typeof window !== 'undefined') return localStorage.getItem('batana_token');
  return null;
}

const FACTORS: Record<string, {
  label: string;
  max: number;
  icon: React.ReactNode;
  description: string;
  howTo: string;
}> = {
  mukando_history: {
    label: 'Mukando History',
    max: 30,
    icon: <Users size={16} color="#a8845a" />,
    description: 'Consistency of monthly contributions to mukando groups',
    howTo: 'Never miss a monthly contribution',
  },
  mukando_duration: {
    label: 'Mukando Duration',
    max: 10,
    icon: <Users size={16} color="#a8845a" />,
    description: 'How long you have been participating in mukando',
    howTo: 'Complete full mukando cycles',
  },
  savings_consistency: {
    label: 'Savings',
    max: 15,
    icon: <Coins size={16} color="#a8845a" />,
    description: 'How regularly you deposit to your wallet',
    howTo: 'Make regular deposits, even small ones',
  },
  savings_growth: {
    label: 'Savings Growth',
    max: 5,
    icon: <TrendingUp size={16} color="#a8845a" />,
    description: 'Whether your gold savings are growing over time',
    howTo: 'Increase your deposits each month',
  },
  transaction_activity: {
    label: 'Activity',
    max: 15,
    icon: <Activity size={16} color="#a8845a" />,
    description: 'How actively you use BATANA for transactions',
    howTo: 'Use BATANA for daily payments and transfers',
  },
  insurance_premiums: {
    label: 'Insurance',
    max: 5,
    icon: <Shield size={16} color="#a8845a" />,
    description: 'Whether you have active insurance coverage',
    howTo: 'Get funeral or hospital cover',
  },
  loan_repayment: {
    label: 'Loan Repayment',
    max: 10,
    icon: <Award size={16} color="#a8845a" />,
    description: 'Your history of repaying BATANA loans on time',
    howTo: 'Repay loans before the due date',
  },
  community_verification: {
    label: 'Community',
    max: 10,
    icon: <CheckCircle size={16} color="#a8845a" />,
    description: 'How many community members have vouched for you',
    howTo: 'Ask 3 trusted community members to vouch for you',
  },
};

function getScoreColor(score: number): string {
  if (score >= 80) return '#748c3d';
  if (score >= 60) return '#a8845a';
  if (score >= 40) return '#ca8a04';
  return '#78716c';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Building';
  if (score >= 20) return 'Starting';
  return 'New';
}

function getScoreStars(score: number): string {
  if (score >= 80) return '★★★★★';
  if (score >= 60) return '★★★★☆';
  if (score >= 40) return '★★★☆☆';
  if (score >= 20) return '★★☆☆☆';
  return '★☆☆☆☆';
}

function getLoanLabel(score: number): string {
  if (score >= 80) return 'Up to US$500';
  if (score >= 60) return 'Up to US$200';
  if (score >= 40) return 'Up to US$50';
  if (score >= 20) return 'Up to US$20';
  return 'Not yet eligible';
}

export default function ScorePage() {
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [scoreData, setScoreData]       = useState<any>(null);
  const [expandedFactor, setExpandedFactor] = useState<string | null>(null);

  const loadScore = useCallback(async () => {
    const phone = getPhone();
    const token = getToken();

    if (!token) {
      window.location.href = '/login';
      return;
    }

    if (!phone) {
      setError('Phone number not found. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getVimbisoScore(phone);
      setScoreData(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load score';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadScore(); }, [loadScore]);

  // ── LOADING ──────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
        maxWidth: '480px', margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '1rem',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <BatanaLogo size={48} />
        <Loader size={24} color="#a8845a" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#78716c', fontSize: '0.875rem' }}>Calculating your score...</p>
      </div>
    );
  }

  // ── ERROR ────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
        maxWidth: '480px', margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '1rem',
        padding: '2rem', textAlign: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <AlertCircle size={48} color="#a8845a" />
        <h2 style={{ color: '#1c1917', fontWeight: '700' }}>Could not load score</h2>
        <p style={{ color: '#78716c', fontSize: '0.875rem' }}>{error}</p>
        <button
          onClick={loadScore}
          style={{
            background: 'linear-gradient(135deg, #a8845a, #967554)',
            color: 'white', padding: '0.75rem 2rem',
            borderRadius: '1rem', border: 'none',
            fontWeight: '600', cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  const score         = scoreData?.vimbiso_score ?? 0;
  const factors       = scoreData?.factors ?? {};
  const tips          = scoreData?.how_to_improve ?? [];
  const scoreColor    = getScoreColor(score);
  const circumference = 2 * Math.PI * 54;
  const dashOffset    = circumference - (score / 100) * circumference;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
      maxWidth: '480px', margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fillRing {
          from { stroke-dashoffset: ${circumference}; }
          to   { stroke-dashoffset: ${dashOffset}; }
        }
      `}</style>

      {/* Header */}
      <header style={{
        padding: '1.25rem 1.5rem',
        background: 'rgba(250,248,245,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(168,132,90,0.12)',
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', gap: '1rem',
      }}>
        <button
          onClick={() => { window.location.href = '/dashboard'; }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#a8845a', padding: '0.25rem', display: 'flex',
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1rem', fontWeight: '800', color: '#1c1917' }}>
            Vimbiso Score
          </div>
          <div style={{ fontSize: '0.72rem', color: '#78716c' }}>
            Your financial identity
          </div>
        </div>
        <BatanaLogo size={32} />
      </header>

      <div style={{ padding: '1.5rem', paddingBottom: '6rem' }}>

        {/* Hero score card */}
        <div style={{
          background: 'linear-gradient(135deg, #3a2a1c, #6f5336)',
          borderRadius: '1.75rem', padding: '2rem 1.75rem',
          marginBottom: '1.25rem', position: 'relative', overflow: 'hidden',
          boxShadow: '0 16px 40px rgba(58,42,28,0.3)',
          display: 'flex', alignItems: 'center', gap: '1.5rem',
        }}>
          {/* Background blobs */}
          <div style={{
            position: 'absolute', top: '-40px', right: '-40px',
            width: '180px', height: '180px',
            background: 'radial-gradient(circle, rgba(168,132,90,0.3), transparent)',
            borderRadius: '50%',
          }} />
          <div style={{
            position: 'absolute', bottom: '-50px', left: '-20px',
            width: '160px', height: '160px',
            background: 'radial-gradient(circle, rgba(245,158,11,0.15), transparent)',
            borderRadius: '50%',
          }} />

          {/* Ring */}
          <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle
                cx="60" cy="60" r="54"
                fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10"
              />
              <circle
                cx="60" cy="60" r="54"
                fill="none" stroke={scoreColor} strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
                style={{ animation: 'fillRing 1.2s ease-out forwards' }}
              />
              <text
                x="60" y="52" textAnchor="middle"
                fill="white" fontSize="11" fontWeight="600"
                style={{ fontFamily: 'inherit' }}
              >
                {getScoreStars(score)}
              </text>
              <text
                x="60" y="70" textAnchor="middle"
                fill="white" fontSize="24" fontWeight="900"
                style={{ fontFamily: 'inherit' }}
              >
                {score}
              </text>
              <text
                x="60" y="84" textAnchor="middle"
                fill="rgba(255,255,255,0.5)" fontSize="10"
                style={{ fontFamily: 'inherit' }}
              >
                out of 100
              </text>
            </svg>
          </div>

          {/* Score info */}
          <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
            <div style={{
              fontSize: '1.5rem', fontWeight: '900',
              color: 'white', marginBottom: '0.25rem',
            }}>
              {getScoreLabel(score)}
            </div>
            <div style={{
              fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)',
              marginBottom: '1rem', lineHeight: '1.5',
            }}>
              {scoreData?.rating || getScoreLabel(score)}
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '0.875rem', padding: '0.75rem 1rem',
            }}>
              <div style={{
                fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                marginBottom: '0.25rem',
              }}>
                Loan eligible
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '800', color: '#f59e0b' }}>
                {getLoanLabel(score)}
              </div>
            </div>
          </div>
        </div>

        {/* Score range guide */}
        <div style={{
          background: 'rgba(255,255,255,0.8)',
          borderRadius: '1.25rem', padding: '1.25rem',
          border: '1px solid rgba(168,132,90,0.12)',
          marginBottom: '1.25rem',
        }}>
          <div style={{
            fontSize: '0.75rem', fontWeight: '700', color: '#78716c',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            marginBottom: '1rem',
          }}>
            Score Ranges
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { range: '80–100', label: 'Excellent', loan: 'US$500', color: '#748c3d' },
              { range: '60–79', label: 'Good', loan: 'US$200', color: '#a8845a' },
              { range: '40–59', label: 'Building', loan: 'US$50', color: '#ca8a04' },
              { range: '20–39', label: 'Starting', loan: 'US$20', color: '#92400e' },
              { range: '0–19', label: 'New', loan: 'Not yet', color: '#78716c' },
            ].map((item) => {
              const isCurrentRange =
                (item.range === '80–100' && score >= 80) ||
                (item.range === '60–79' && score >= 60 && score < 80) ||
                (item.range === '40–59' && score >= 40 && score < 60) ||
                (item.range === '20–39' && score >= 20 && score < 40) ||
                (item.range === '0–19' && score < 20);

              return (
                <div key={item.range} style={{
                  display: 'flex', alignItems: 'center', gap: '0.875rem',
                  padding: '0.625rem 0.875rem', borderRadius: '0.875rem',
                  background: isCurrentRange
                    ? `rgba(${item.color === '#748c3d' ? '116,140,61' : '168,132,90'},0.1)`
                    : 'transparent',
                  border: isCurrentRange
                    ? `1.5px solid rgba(${item.color === '#748c3d' ? '116,140,61' : '168,132,90'},0.25)`
                    : '1.5px solid transparent',
                }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: item.color, flexShrink: 0,
                  }} />
                  <div style={{
                    flex: 1, display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <span style={{
                        fontSize: '0.875rem',
                        fontWeight: isCurrentRange ? '700' : '500',
                        color: isCurrentRange ? '#1c1917' : '#57534e',
                      }}>
                        {item.label}
                      </span>
                      <span style={{
                        fontSize: '0.75rem', color: '#a8a29e', marginLeft: '0.5rem',
                      }}>
                        {item.range}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '0.8rem', fontWeight: '600', color: item.color,
                    }}>
                      {item.loan}
                    </span>
                  </div>
                  {isCurrentRange && <Star size={14} color={item.color} fill={item.color} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Factor breakdown */}
        <div style={{
          background: 'rgba(255,255,255,0.8)',
          borderRadius: '1.25rem', padding: '1.25rem',
          border: '1px solid rgba(168,132,90,0.12)',
          marginBottom: '1.25rem',
        }}>
          <div style={{
            fontSize: '0.75rem', fontWeight: '700', color: '#78716c',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            marginBottom: '1rem',
          }}>
            Score Breakdown
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {Object.entries(FACTORS).map(([key, config]) => {
              const value      = factors[key] ?? 0;
              const pct        = (value / config.max) * 100;
              const isExpanded = expandedFactor === key;
              const isFull     = value === config.max;

              return (
                <div key={key}>
                  <button
                    onClick={() => setExpandedFactor(isExpanded ? null : key)}
                    style={{
                      width: '100%', background: 'none', border: 'none',
                      padding: '0.75rem 0', cursor: 'pointer', textAlign: 'left',
                      borderBottom: isExpanded
                        ? 'none'
                        : '1px solid rgba(168,132,90,0.08)',
                    }}
                  >
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', marginBottom: '0.5rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {config.icon}
                        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1c1917' }}>
                          {config.label}
                        </span>
                        {isFull && <CheckCircle size={13} color="#748c3d" />}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          fontSize: '0.8rem', fontWeight: '700',
                          color: isFull ? '#748c3d' : '#1c1917',
                        }}>
                          {value}/{config.max}
                        </span>
                        <ChevronRight
                          size={14} color="#a8a29e"
                          style={{
                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{
                      height: '6px', background: '#f2ede4',
                      borderRadius: '3px', overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: isFull
                          ? 'linear-gradient(to right, #748c3d, #5d7030)'
                          : 'linear-gradient(to right, #a8845a, #f59e0b)',
                        borderRadius: '3px', transition: 'width 0.6s ease',
                      }} />
                    </div>
                  </button>

                  {isExpanded && (
                    <div style={{
                      padding: '0.75rem 0 0.875rem',
                      borderBottom: '1px solid rgba(168,132,90,0.08)',
                    }}>
                      <p style={{
                        fontSize: '0.8rem', color: '#57534e',
                        lineHeight: '1.6', margin: '0 0 0.625rem',
                      }}>
                        {config.description}
                      </p>
                      {value < config.max && (
                        <div style={{
                          display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
                          background: 'rgba(168,132,90,0.06)',
                          borderRadius: '0.75rem', padding: '0.625rem 0.875rem',
                        }}>
                          <TrendingUp size={14} color="#a8845a" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span style={{
                            fontSize: '0.8rem', color: '#a8845a',
                            fontWeight: '600', lineHeight: '1.5',
                          }}>
                            {config.howTo}
                          </span>
                        </div>
                      )}
                      {value === config.max && (
                        <div style={{
                          display: 'flex', gap: '0.5rem', alignItems: 'center',
                          background: 'rgba(116,140,61,0.08)',
                          borderRadius: '0.75rem', padding: '0.625rem 0.875rem',
                        }}>
                          <CheckCircle size={14} color="#748c3d" style={{ flexShrink: 0 }} />
                          <span style={{ fontSize: '0.8rem', color: '#748c3d', fontWeight: '600' }}>
                            Maximum points earned
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: '1rem', paddingTop: '1rem',
            borderTop: '2px solid rgba(168,132,90,0.15)',
          }}>
            <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#57534e' }}>
              Total Score
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: '900', color: scoreColor }}>
              {score} / 100
            </span>
          </div>
        </div>

        {/* Improvement tips */}
        {tips.length > 0 && tips[0] !== 'Keep up the great work!' && (
          <div style={{
            background: 'rgba(255,255,255,0.8)',
            borderRadius: '1.25rem', padding: '1.25rem',
            border: '1px solid rgba(168,132,90,0.12)',
            marginBottom: '1.25rem',
          }}>
            <div style={{
              fontSize: '0.75rem', fontWeight: '700', color: '#78716c',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              marginBottom: '1rem', display: 'flex',
              alignItems: 'center', gap: '0.5rem',
            }}>
              <TrendingUp size={14} color="#a8845a" />
              How to improve
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {tips.map((tip: string, i: number) => (
                <div key={i} style={{
                  display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                  padding: '0.875rem', background: 'rgba(168,132,90,0.05)',
                  borderRadius: '0.875rem', border: '1px solid rgba(168,132,90,0.1)',
                }}>
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%',
                    background: 'rgba(168,132,90,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontSize: '0.7rem', fontWeight: '800', color: '#a8845a',
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: '0.875rem', color: '#57534e', lineHeight: '1.5' }}>
                    {tip}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Max score achieved */}
        {tips[0] === 'Keep up the great work!' && (
          <div style={{
            background: 'rgba(116,140,61,0.08)',
            border: '1px solid rgba(116,140,61,0.2)',
            borderRadius: '1.25rem', padding: '1.25rem',
            marginBottom: '1.25rem', textAlign: 'center',
          }}>
            <CheckCircle size={32} color="#748c3d" style={{ margin: '0 auto 0.75rem' }} />
            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#748c3d', marginBottom: '0.375rem' }}>
              Outstanding score!
            </div>
            <div style={{ fontSize: '0.8rem', color: '#57534e' }}>
              Keep up the great work!
            </div>
          </div>
        )}

        {/* What is Vimbiso */}
        <div style={{
          background: 'rgba(168,132,90,0.06)',
          borderRadius: '1.25rem', padding: '1.25rem',
          border: '1px solid rgba(168,132,90,0.12)',
          marginBottom: '1.25rem',
        }}>
          <div style={{
            fontSize: '0.8rem', fontWeight: '700', color: '#a8845a',
            textTransform: 'uppercase', letterSpacing: '0.05em',
            marginBottom: '0.75rem',
          }}>
            What is Vimbiso?
          </div>
          <p style={{ fontSize: '0.8rem', color: '#57534e', lineHeight: '1.7', margin: 0 }}>
            Vimbiso is BATANA's credit score built entirely from your financial behaviour - not your
            employer or payslip. Your mukando contributions, savings habits, and community reputation
            become your financial identity. No bank statement required.
          </p>
        </div>

        {/* CTA — apply for loan */}
        {score >= 20 && (
          <button
            onClick={() => { window.location.href = '/loans'; }}
            style={{
              width: '100%', marginTop: '0.5rem',
              background: 'linear-gradient(135deg, #a8845a, #967554)',
              color: 'white', padding: '1rem', borderRadius: '1.25rem',
              border: 'none', fontSize: '1rem', fontWeight: '700',
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              boxShadow: '0 8px 24px rgba(168,132,90,0.3)',
            }}
          >
            Apply for a loan
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      {/* ── BOTTOM NAV ── */}
      <BottomNav />
    </div>
  );
}