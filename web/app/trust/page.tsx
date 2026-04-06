'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  RefreshCw,
  ArrowLeft,
  DollarSign,
  Activity,
  AlertCircle,
  Loader,
} from 'lucide-react';
import BatanaLogo from '../components/BatanaLogo';
import { getZigHealth, getGoldPrice, getExchangeRates, getPrices } from '../lib/api';

export default function TrustEngine() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [zigHealth, setZigHealth] = useState<any>(null);
  const [goldPrice, setGoldPrice] = useState<any>(null);
  const [exchangeRates, setExchangeRates] = useState<any>(null);
  const [prices, setPrices] = useState<any>(null);

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

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
        maxWidth: '480px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        <Shield size={48} color="#a8845a" />
        <Loader size={24} color="#a8845a" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#78716c', fontSize: '0.875rem' }}>Loading Trust Engine...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
        maxWidth: '480px',
        margin: '0 auto',
        padding: '2rem 1.5rem',
      }}>
        <button
          onClick={() => window.history.back()}
          style={{
            background: 'none',
            border: 'none',
            color: '#a8845a',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '2rem',
          }}
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <div style={{ textAlign: 'center', paddingTop: '4rem' }}>
          <AlertCircle size={48} color="#a8845a" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ color: '#1c1917', fontWeight: '700', marginBottom: '0.5rem' }}>
            Unable to load data
          </h2>
          <p style={{ color: '#78716c', fontSize: '0.875rem', marginBottom: '2rem' }}>{error}</p>
          <button
            onClick={() => loadData()}
            style={{
              background: 'linear-gradient(135deg, #a8845a, #967554)',
              color: 'white',
              padding: '0.75rem 2rem',
              borderRadius: '1rem',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const health = zigHealth?.zig_health;
  const gold = goldPrice || zigHealth?.gold;
  const rates = exchangeRates;
  const purchasingPower = zigHealth?.purchasing_power;

  const spreadStatus = rates?.spread_status;
  const spreadColor = spreadStatus === 'healthy' ? '#748c3d' : spreadStatus === 'caution' ? '#f59e0b' : '#dc2626';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
      maxWidth: '480px',
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>

      {/* Header */}
      <header style={{
        padding: '1.25rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(250, 248, 245, 0.9)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(168, 132, 90, 0.12)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <button
          onClick={() => window.history.back()}
          style={{
            background: 'none',
            border: 'none',
            color: '#a8845a',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={18} />
          Back
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={20} color="#a8845a" />
          <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#3a2a1c' }}>
            Trust Engine
          </span>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          style={{
            background: 'none',
            border: 'none',
            cursor: refreshing ? 'not-allowed' : 'pointer',
            padding: '0.5rem',
            color: '#a8845a',
          }}
        >
          <RefreshCw
            size={18}
            style={{
              animation: refreshing ? 'spin 1s linear infinite' : 'none',
            }}
          />
        </button>
      </header>

      {/* Content */}
      <div style={{ padding: '1.5rem', paddingBottom: '2rem' }}>

        {/* Hero Stats */}
        <div style={{
          background: 'linear-gradient(135deg, #3a2a1c, #6f5336)',
          borderRadius: '2rem',
          padding: '2rem 1.75rem',
          marginBottom: '1.25rem',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 16px 40px rgba(58, 42, 28, 0.3)',
        }}>
          {/* Background decoration */}
          <div style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(168,132,90,0.3), transparent)',
            borderRadius: '50%',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.6)',
              fontWeight: '600',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '0.5rem',
            }}>
              ZiG Confidence Index
            </div>

            <div style={{
              fontSize: '3rem',
              fontWeight: '900',
              color: 'white',
              lineHeight: '1',
              marginBottom: '0.5rem',
            }}>
              {health?.confidence_index || 0}%
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              background: 'rgba(116, 140, 61, 0.2)',
              border: '1px solid rgba(116, 140, 61, 0.3)',
              borderRadius: '2rem',
              padding: '0.375rem 0.875rem',
              fontSize: '0.75rem',
              color: '#c8e6a1',
              fontWeight: '600',
            }}>
              <Shield size={12} />
              {health?.backing_status || 'Strong'}
            </div>

            <div style={{
              marginTop: '1.5rem',
              fontSize: '0.8rem',
              color: 'rgba(255,255,255,0.7)',
              lineHeight: '1.6',
            }}>
              Gold backing at {health?.gold_backing_percentage}%. RBZ official rate vs observed street rate spread is {rates?.spread_percentage}%.
              {rates?.rate_date && ` RBZ rates updated ${rates.rate_date}.`}
            </div>
          </div>
        </div>

        {/* Gold Price */}
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
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1rem',
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
                Gold Price / Gram
              </div>
              <div style={{
                fontSize: '2rem',
                fontWeight: '900',
                color: '#1c1917',
                lineHeight: '1',
              }}>
                US${parseFloat(gold?.price_usd_per_gram || 0).toFixed(2)}
              </div>
              <div style={{
                fontSize: '0.8rem',
                color: '#f59e0b',
                fontWeight: '600',
                marginTop: '0.25rem',
              }}>
                ZiG {parseFloat(gold?.price_zig_per_gram || 0).toLocaleString()}
              </div>
            </div>

            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '1rem',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <DollarSign size={24} color="#f59e0b" />
            </div>
          </div>

          <div style={{
            fontSize: '0.75rem',
            color: '#a8a29e',
          }}>
            Source: {gold?.source} · {new Date(zigHealth?.timestamp).toLocaleDateString()}
          </div>
        </div>

        {/* Exchange Rates */}
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
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
          }}>
            <div style={{
              fontSize: '0.75rem',
              color: '#78716c',
              fontWeight: '600',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              {rates?.source} Rates
            </div>
            <span style={{
              background: `${spreadColor}15`,
              color: spreadColor,
              fontSize: '0.7rem',
              fontWeight: '700',
              padding: '0.25rem 0.75rem',
              borderRadius: '2rem',
              textTransform: 'uppercase',
            }}>
              {spreadStatus}
            </span>
          </div>

          {/* USD/ZWG */}
          <div style={{
            background: 'linear-gradient(135deg, #f5ece0, #f0e4d0)',
            borderRadius: '1rem',
            padding: '1.25rem',
            marginBottom: '1rem',
          }}>
            <div style={{
              fontSize: '0.75rem',
              color: '#78716c',
              marginBottom: '0.5rem',
            }}>
              USD / ZWG
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '1rem',
            }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#a8a29e', marginBottom: '0.125rem' }}>Bid</div>
                <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1c1917' }}>
                  {rates?.usd_zwg?.bid?.toFixed(4)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#a8a29e', marginBottom: '0.125rem' }}>Ask</div>
                <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1c1917' }}>
                  {rates?.usd_zwg?.ask?.toFixed(4)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#a8a29e', marginBottom: '0.125rem' }}>Avg</div>
                <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#a8845a' }}>
                  {rates?.usd_zwg?.avg?.toFixed(4)}
                </div>
              </div>
            </div>
          </div>

          {/* Official vs Street */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}>
            <div style={{
              background: 'rgba(116, 140, 61, 0.08)',
              border: '1px solid rgba(116, 140, 61, 0.2)',
              borderRadius: '0.875rem',
              padding: '0.875rem',
            }}>
              <div style={{ fontSize: '0.7rem', color: '#78716c', marginBottom: '0.25rem' }}>
                Official Rate
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#748c3d' }}>
                {rates?.official_rate?.toFixed(2)}
              </div>
            </div>
            <div style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: '0.875rem',
              padding: '0.875rem',
            }}>
              <div style={{ fontSize: '0.7rem', color: '#78716c', marginBottom: '0.25rem' }}>
                Street Rate (Observed)
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f59e0b' }}>
                {rates?.street_rate?.toFixed(2)}
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: `${spreadColor}08`,
            border: `1px solid ${spreadColor}20`,
            borderRadius: '0.75rem',
            padding: '0.75rem 1rem',
          }}>
            <span style={{ fontSize: '0.75rem', color: '#57534e', fontWeight: '500' }}>
              Market Spread
            </span>
            <span style={{ fontSize: '0.875rem', fontWeight: '700', color: spreadColor }}>
              {rates?.spread_percentage}%
            </span>
          </div>

          {/* Other Currencies */}
          {rates?.other_currencies && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{
                fontSize: '0.7rem',
                color: '#a8a29e',
                fontWeight: '600',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: '0.625rem',
              }}>
                Other Currencies
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
              }}>
                {Object.entries(rates.other_currencies).map(([key, value]) => (
                  <div key={key} style={{
                    fontSize: '0.75rem',
                    color: '#57534e',
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(168,132,90,0.04)',
                    borderRadius: '0.5rem',
                  }}>
                    <span style={{ textTransform: 'uppercase' }}>{key.replace('_', '/')}</span>
                    <span style={{ fontWeight: '700' }}>{(value as number).toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Purchasing Power */}
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
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem',
          }}>
            <Activity size={18} color="#a8845a" />
            <div style={{
              fontSize: '0.75rem',
              color: '#78716c',
              fontWeight: '600',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              What ZiG 100 Buys
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.875rem',
          }}>
            {purchasingPower?.one_hundred_zig_buys && Object.entries(purchasingPower.one_hundred_zig_buys).map(([key, value]) => (
              <div key={key} style={{
                background: 'linear-gradient(135deg, #f5ece0, #f0e4d0)',
                borderRadius: '1rem',
                padding: '1rem',
                textAlign: 'center',
              }}>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: '900',
                  color: '#3a2a1c',
                  marginBottom: '0.25rem',
                }}>
                  {(value as number).toFixed(1)}
                </div>
                <div style={{
                  fontSize: '0.7rem',
                  color: '#78716c',
                  textTransform: 'capitalize',
                }}>
                  {key.replace('_', ' ')}
                </div>
              </div>
            ))}
          </div>

          {zigHealth?.summary && (
            <div style={{
              marginTop: '1.25rem',
              padding: '1rem',
              background: 'rgba(168,132,90,0.06)',
              borderRadius: '0.875rem',
              fontSize: '0.8rem',
              color: '#57534e',
              lineHeight: '1.5',
              fontStyle: 'italic',
            }}>
              "{zigHealth.summary.purchasing_power}"
            </div>
          )}
        </div>

        {/* Market Summary */}
        {zigHealth?.summary?.advice && (
          <div style={{
            background: `linear-gradient(135deg, ${spreadColor}08, ${spreadColor}03)`,
            border: `1.5px solid ${spreadColor}30`,
            borderRadius: '1.5rem',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'flex-start',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '0.75rem',
              background: `${spreadColor}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {spreadStatus === 'healthy' ? (
                <Shield size={16} color={spreadColor} />
              ) : (
                <AlertCircle size={16} color={spreadColor} />
              )}
            </div>
            <div>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                color: spreadColor,
                marginBottom: '0.375rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                Market Advice
              </div>
              <div style={{
                fontSize: '0.875rem',
                color: '#57534e',
                lineHeight: '1.6',
              }}>
                {zigHealth.summary.advice}
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div style={{
          background: 'rgba(168,132,90,0.05)',
          border: '1px solid rgba(168,132,90,0.15)',
          borderRadius: '1rem',
          padding: '1rem 1.25rem',
          marginTop: '1.5rem',
          fontSize: '0.7rem',
          color: '#78716c',
          lineHeight: '1.6',
        }}>
          <strong style={{ color: '#57534e' }}>Data Source:</strong> Official rates from RBZ Interbank Market.
          Street exchange rates are observational data for informational purposes only.
          BATANA uses RBZ official rates for all transactions and does not facilitate unofficial exchange.
        </div>

      </div>
    </div>
  );
}