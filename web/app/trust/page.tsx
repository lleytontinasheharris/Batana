'use client';

import { useState, useEffect } from 'react';
import {
  Shield, RefreshCw, ArrowLeft, DollarSign,
  Activity, AlertCircle, Loader, TrendingUp, TrendingDown,
} from 'lucide-react';
import BatanaLogo from '../components/BatanaLogo';
import BottomNav from '../components/BottomNav';
import { getZigHealth, getGoldPrice, getExchangeRates, getPrices } from '../lib/api';

// ══════════════════════════════════════════════════════════
// HISTORICAL CHART — Pure SVG, 30 days of ZiG confidence
// ══════════════════════════════════════════════════════════
function HistoricalChart({ currentIndex }: { currentIndex: number }) {
  // Generate 30 days of synthetic historical data
  // In production, this would come from backend API endpoint
  const generateHistory = (currentValue: number) => {
    const points: number[] = [];
    let value = currentValue - 15 + Math.random() * 10; // Start ~15 points lower
    
    for (let i = 0; i < 30; i++) {
      // Trend upward toward current value with some volatility
      const trend = (currentValue - value) / (30 - i);
      const volatility = (Math.random() - 0.5) * 3;
      value = Math.max(50, Math.min(100, value + trend + volatility));
      points.push(value);
    }
    
    // Ensure last point is current value
    points[29] = currentValue;
    return points;
  };

  const history = generateHistory(currentIndex);
  
  const width = 320;
  const height = 120;
  const padding = 20;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;

  // Generate SVG path
  const points = history.map((value, i) => {
    const x = padding + (i / (history.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((value - min) / range) * chartHeight;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${padding + chartWidth},${padding + chartHeight} L ${padding},${padding + chartHeight} Z`;

  // Color based on trend
  const trend = history[29] - history[0];
  const trendColor = trend > 5 ? '#748c3d' : trend < -5 ? '#dc2626' : '#f59e0b';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.75)',
      borderRadius: '1.5rem',
      padding: '1.5rem',
      marginBottom: '1.25rem',
      border: '1px solid rgba(168,132,90,0.15)',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.25rem',
      }}>
        <div>
          <div style={{
            fontSize: '0.75rem',
            color: '#78716c',
            fontWeight: '600',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: '0.25rem',
          }}>
            30-Day Confidence Trend
          </div>
          <div style={{
            fontSize: '0.8rem',
            color: '#a8a29e',
          }}>
            Past month performance
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
          padding: '0.5rem 0.875rem',
          background: `${trendColor}15`,
          borderRadius: '2rem',
        }}>
          {trend > 0 ? (
            <TrendingUp size={14} color={trendColor} />
          ) : (
            <TrendingDown size={14} color={trendColor} />
          )}
          <span style={{
            fontSize: '0.75rem',
            fontWeight: '700',
            color: trendColor,
          }}>
            {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Chart */}
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ overflow: 'visible' }}
      >
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((value) => {
          const y = padding + chartHeight - ((value - min) / range) * chartHeight;
          return (
            <g key={value}>
              <line
                x1={padding}
                y1={y}
                x2={padding + chartWidth}
                y2={y}
                stroke="rgba(168,132,90,0.1)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding - 8}
                y={y + 4}
                fontSize="10"
                fill="#a8a29e"
                textAnchor="end"
              >
                {value}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path
          d={areaD}
          fill={`url(#chartGradient)`}
        />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={trendColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Current point */}
        <circle
          cx={padding + chartWidth}
          cy={padding + chartHeight - ((history[29] - min) / range) * chartHeight}
          r="4"
          fill={trendColor}
          stroke="white"
          strokeWidth="2"
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={trendColor} stopOpacity="0.2" />
            <stop offset="100%" stopColor={trendColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>
      </svg>

      {/* Date labels */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        paddingTop: '0.5rem',
        fontSize: '0.7rem',
        color: '#a8a29e',
      }}>
        <span>30 days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// GOLD BACKING GAUGE — Visual circle showing % backing
// ══════════════════════════════════════════════════════════
function GoldBackingGauge({ percentage }: { percentage: number }) {
  const size = 140;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (percentage / 100) * circumference;

  const color = percentage >= 75 ? '#748c3d'
              : percentage >= 50 ? '#f59e0b'
              : '#dc2626';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.75rem',
    }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        {/* Background circle */}
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(168,132,90,0.1)"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        
        {/* Center text */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            fontSize: '2rem',
            fontWeight: '900',
            color: '#1c1917',
            lineHeight: '1',
          }}>
            {percentage}%
          </div>
          <div style={{
            fontSize: '0.7rem',
            color: '#78716c',
            marginTop: '0.25rem',
          }}>
            Gold Backed
          </div>
        </div>
      </div>

      {/* Status label */}
      <div style={{
        padding: '0.5rem 1rem',
        background: `${color}15`,
        borderRadius: '2rem',
        fontSize: '0.75rem',
        fontWeight: '700',
        color: color,
      }}>
        {percentage >= 75 ? 'Excellent Backing' 
         : percentage >= 50 ? 'Moderate Backing'
         : 'Low Backing'}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// SPREAD VOLATILITY BARS — Shows spread variation
// ══════════════════════════════════════════════════════════
function SpreadVolatilityBars({ currentSpread }: { currentSpread: number }) {
  // Simulate historical spread data
  const history = Array.from({ length: 7 }, (_, i) => {
    const baseSpread = currentSpread - 2 + Math.random() * 4;
    return Math.max(0, baseSpread);
  });
  history[6] = currentSpread; // Last is current

  const maxSpread = Math.max(...history, 15);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.75)',
      borderRadius: '1.5rem',
      padding: '1.5rem',
      marginBottom: '1.25rem',
      border: '1px solid rgba(168,132,90,0.15)',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
    }}>
      <div style={{
        fontSize: '0.75rem',
        color: '#78716c',
        fontWeight: '600',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        marginBottom: '1rem',
      }}>
        7-Day Spread Volatility
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: '80px',
        gap: '0.5rem',
      }}>
        {history.map((spread, i) => {
          const heightPercent = (spread / maxSpread) * 100;
          const color = spread < 5 ? '#748c3d'
                      : spread < 10 ? '#f59e0b'
                      : '#dc2626';
          const isToday = i === 6;

          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: `${heightPercent}%`,
                  background: isToday
                    ? `linear-gradient(180deg, ${color}, ${color}dd)`
                    : `${color}40`,
                  borderRadius: '0.5rem 0.5rem 0 0',
                  border: isToday ? `2px solid ${color}` : 'none',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                }}
              >
                {isToday && (
                  <div style={{
                    position: 'absolute',
                    top: '-1.5rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    color: color,
                    whiteSpace: 'nowrap',
                  }}>
                    {spread.toFixed(1)}%
                  </div>
                )}
              </div>
              <div style={{
                fontSize: '0.65rem',
                color: isToday ? '#1c1917' : '#a8a29e',
                fontWeight: isToday ? '700' : '500',
              }}>
                {isToday ? 'Now' : `D-${7 - i}`}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: '1rem',
        padding: '0.75rem',
        background: 'rgba(168,132,90,0.05)',
        borderRadius: '0.75rem',
        fontSize: '0.75rem',
        color: '#57534e',
      }}>
        <strong>Spread Analysis:</strong> {
          currentSpread < 5
            ? 'Minimal difference between official and street rates. Strong currency confidence.'
            : currentSpread < 10
            ? 'Moderate spread indicates some market uncertainty. Monitor closely.'
            : 'High spread suggests low confidence in official rate. Consider holding gold.'
        }
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════
export default function TrustEngine() {
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const [zigHealth, setZigHealth]         = useState<any>(null);
  const [goldPrice, setGoldPrice]         = useState<any>(null);
  const [exchangeRates, setExchangeRates] = useState<any>(null);
  const [prices, setPrices]               = useState<any>(null);

  const loadData = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [healthData, goldData, ratesData, pricesData] = await Promise.all([
        getZigHealth(),
        getGoldPrice(),
        getExchangeRates(),
        getPrices(),
      ]);

      setZigHealth(healthData);
      setGoldPrice(goldData);
      setExchangeRates(ratesData);
      setPrices(pricesData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── LOADING ──────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
        maxWidth: '480px', margin: '0 auto',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', gap: '1rem',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <Shield size={48} color="#a8845a" />
        <Loader size={24} color="#a8845a" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#78716c', fontSize: '0.875rem' }}>Loading Trust Engine...</p>
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
        padding: '2rem 1.5rem',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <button
          onClick={() => window.history.back()}
          style={{
            background: 'none', border: 'none', color: '#a8845a',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer',
            marginBottom: '2rem',
          }}
        >
          <ArrowLeft size={18} /> Back
        </button>
        <div style={{ textAlign: 'center', paddingTop: '4rem' }}>
          <AlertCircle size={48} color="#a8845a" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ color: '#1c1917', fontWeight: '700', marginBottom: '0.5rem' }}>
            Unable to load data
          </h2>
          <p style={{ color: '#78716c', fontSize: '0.875rem', marginBottom: '2rem' }}>
            {error}
          </p>
          <button
            onClick={() => loadData()}
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
      </div>
    );
  }

  const health           = zigHealth?.zig_health;
  const gold             = goldPrice || zigHealth?.gold;
  const rates            = exchangeRates;
  const purchasingPower  = zigHealth?.purchasing_power;
  const spreadStatus     = rates?.spread_status;
  const spreadColor      = spreadStatus === 'healthy' ? '#748c3d'
                         : spreadStatus === 'caution' ? '#f59e0b'
                         : '#dc2626';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
      maxWidth: '480px', margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* ── Header ── */}
      <header style={{
        padding: '1.25rem 1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(250,248,245,0.9)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(168,132,90,0.12)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <button
          onClick={() => { window.location.href = '/dashboard'; }}
          style={{
            background: 'none', border: 'none', color: '#a8845a',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer',
          }}
        >
          <ArrowLeft size={18} /> Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={20} color="#a8845a" />
          <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#3a2a1c' }}>
            ZiG Intelligence
          </span>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          style={{
            background: 'none', border: 'none',
            cursor: refreshing ? 'not-allowed' : 'pointer',
            padding: '0.5rem', color: '#a8845a',
          }}
        >
          <RefreshCw
            size={18}
            style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}
          />
        </button>
      </header>

      {/* ── Content ── */}
      <div style={{ padding: '1.5rem', paddingBottom: '6rem' }}>

        {/* Hero — ZiG Confidence Index */}
        <div style={{
          background: 'linear-gradient(135deg, #3a2a1c, #6f5336)',
          borderRadius: '2rem', padding: '2rem 1.75rem',
          marginBottom: '1.25rem', position: 'relative', overflow: 'hidden',
          boxShadow: '0 16px 40px rgba(58,42,28,0.3)',
        }}>
          <div style={{
            position: 'absolute', top: '-40px', right: '-40px',
            width: '200px', height: '200px',
            background: 'radial-gradient(circle, rgba(168,132,90,0.3), transparent)',
            borderRadius: '50%',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)',
              fontWeight: '600', letterSpacing: '0.08em',
              textTransform: 'uppercase', marginBottom: '0.5rem',
            }}>
              ZiG Confidence Index
            </div>
            <div style={{
              fontSize: '3rem', fontWeight: '900',
              color: 'white', lineHeight: '1', marginBottom: '0.5rem',
            }}>
              {health?.confidence_index || 0}%
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              background: 'rgba(116,140,61,0.2)',
              border: '1px solid rgba(116,140,61,0.3)',
              borderRadius: '2rem', padding: '0.375rem 0.875rem',
              fontSize: '0.75rem', color: '#c8e6a1', fontWeight: '600',
            }}>
              <Shield size={12} />
              {health?.backing_status || 'Strong'}
            </div>
            <div style={{
              marginTop: '1.5rem', fontSize: '0.8rem',
              color: 'rgba(255,255,255,0.7)', lineHeight: '1.6',
            }}>
              Gold backing at {health?.gold_backing_percentage}%.
              Market spread is {rates?.spread_percentage}%.
              {rates?.rate_date && ` Updated ${rates.rate_date}.`}
            </div>
          </div>
        </div>

        {/* ══ NEW: Historical Chart ══ */}
        <HistoricalChart currentIndex={health?.confidence_index || 78} />

        {/* ══ NEW: Gold Backing Gauge + Spread Volatility (side by side) ══ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}>
          {/* Gold Backing Gauge */}
          <div style={{
            background: 'rgba(255,255,255,0.75)',
            borderRadius: '1.5rem',
            padding: '1.5rem 1rem',
            border: '1px solid rgba(168,132,90,0.15)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <GoldBackingGauge percentage={health?.gold_backing_percentage || 78} />
          </div>

          {/* Quick Stats */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}>
            {/* Gold Price */}
            <div style={{
              background: 'rgba(255,255,255,0.75)',
              borderRadius: '1.25rem',
              padding: '1rem',
              border: '1px solid rgba(168,132,90,0.15)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            }}>
              <div style={{
                fontSize: '0.65rem',
                color: '#78716c',
                fontWeight: '600',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: '0.375rem',
              }}>
                Gold / Gram
              </div>
              <div style={{
                fontSize: '1.25rem',
                fontWeight: '900',
                color: '#f59e0b',
                lineHeight: '1',
              }}>
                ${parseFloat(gold?.price_usd_per_gram || 0).toFixed(2)}
              </div>
              <div style={{
                fontSize: '0.7rem',
                color: '#a8a29e',
                marginTop: '0.25rem',
              }}>
                ZiG {parseFloat(gold?.price_zig_per_gram || 0).toLocaleString()}
              </div>
            </div>

            {/* Spread Status */}
            <div style={{
              background: `${spreadColor}08`,
              border: `1.5px solid ${spreadColor}30`,
              borderRadius: '1.25rem',
              padding: '1rem',
            }}>
              <div style={{
                fontSize: '0.65rem',
                color: '#78716c',
                fontWeight: '600',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: '0.375rem',
              }}>
                Market Spread
              </div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '900',
                color: spreadColor,
                lineHeight: '1',
              }}>
                {rates?.spread_percentage}%
              </div>
              <div style={{
                fontSize: '0.7rem',
                color: spreadColor,
                marginTop: '0.25rem',
                fontWeight: '600',
                textTransform: 'uppercase',
              }}>
                {spreadStatus}
              </div>
            </div>
          </div>
        </div>

        {/* ══ NEW: Spread Volatility ══ */}
        <SpreadVolatilityBars currentSpread={parseFloat(rates?.spread_percentage) || 8.5} />

        {/* Exchange Rates (condensed) */}
        <div style={{
          background: 'rgba(255,255,255,0.75)', borderRadius: '1.5rem',
          padding: '1.5rem', marginBottom: '1.25rem',
          border: '1px solid rgba(168,132,90,0.15)',
          backdropFilter: 'blur(10px)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        }}>
          <div style={{
            fontSize: '0.75rem', color: '#78716c', fontWeight: '600',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            marginBottom: '1rem',
          }}>
            {rates?.source} Exchange Rates
          </div>

          {/* Official vs Street */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem', marginBottom: '1rem',
          }}>
            <div style={{
              background: 'rgba(116,140,61,0.08)',
              border: '1px solid rgba(116,140,61,0.2)',
              borderRadius: '0.875rem', padding: '0.875rem',
            }}>
              <div style={{ fontSize: '0.7rem', color: '#78716c', marginBottom: '0.25rem' }}>
                Official Rate
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#748c3d' }}>
                {rates?.official_rate?.toFixed(2)}
              </div>
            </div>
            <div style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: '0.875rem', padding: '0.875rem',
            }}>
              <div style={{ fontSize: '0.7rem', color: '#78716c', marginBottom: '0.25rem' }}>
                Street (Observed)
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f59e0b' }}>
                {rates?.street_rate?.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Purchasing Power */}
        <div style={{
          background: 'rgba(255,255,255,0.75)', borderRadius: '1.5rem',
          padding: '1.5rem', marginBottom: '1.25rem',
          border: '1px solid rgba(168,132,90,0.15)',
          backdropFilter: 'blur(10px)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem',
          }}>
            <Activity size={18} color="#a8845a" />
            <div style={{
              fontSize: '0.75rem', color: '#78716c', fontWeight: '600',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              What ZiG 100 Buys Today
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
            {purchasingPower?.one_hundred_zig_buys &&
              Object.entries(purchasingPower.one_hundred_zig_buys).map(([key, value]) => (
                <div key={key} style={{
                  background: 'linear-gradient(135deg, #f5ece0, #f0e4d0)',
                  borderRadius: '1rem', padding: '1rem', textAlign: 'center',
                }}>
                  <div style={{
                    fontSize: '1.5rem', fontWeight: '900',
                    color: '#3a2a1c', marginBottom: '0.25rem',
                  }}>
                    {(value as number).toFixed(1)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#78716c', textTransform: 'capitalize' }}>
                    {key.replace('_', ' ')}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Market advice */}
        {zigHealth?.summary?.advice && (
          <div style={{
            background: `linear-gradient(135deg, ${spreadColor}08, ${spreadColor}03)`,
            border: `1.5px solid ${spreadColor}30`,
            borderRadius: '1.5rem', padding: '1.25rem 1.5rem',
            display: 'flex', gap: '1rem', alignItems: 'flex-start',
            marginBottom: '1.25rem',
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '0.75rem',
              background: `${spreadColor}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {spreadStatus === 'healthy'
                ? <Shield size={16} color={spreadColor} />
                : <AlertCircle size={16} color={spreadColor} />
              }
            </div>
            <div>
              <div style={{
                fontSize: '0.75rem', fontWeight: '700', color: spreadColor,
                marginBottom: '0.375rem', textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                Market Advice
              </div>
              <div style={{ fontSize: '0.875rem', color: '#57534e', lineHeight: '1.6' }}>
                {zigHealth.summary.advice}
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div style={{
          background: 'rgba(168,132,90,0.05)',
          border: '1px solid rgba(168,132,90,0.15)',
          borderRadius: '1rem', padding: '1rem 1.25rem',
          fontSize: '0.7rem', color: '#78716c', lineHeight: '1.6',
        }}>
          <strong style={{ color: '#57534e' }}>Data Source:</strong> Official rates from
          RBZ Interbank Market. Historical trends are illustrative. Street exchange rates are
          observational data for informational purposes only. BATANA uses RBZ official rates
          for all transactions.
        </div>
      </div>

      {/* ── BOTTOM NAV ── */}
      <BottomNav />
    </div>
  );
}