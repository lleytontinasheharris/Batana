'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Loader, AlertCircle, CheckCircle, TrendingUp,
  Leaf, Users, Clock, Shield, BarChart2, MapPin, Award,
  Plus, Minus, X, Wheat, ShoppingCart, Factory, Beef,
  Briefcase, PieChart, Sprout,
} from 'lucide-react';
import BatanaLogo from '../components/BatanaLogo';
import BottomNav from '../components/BottomNav';
import {
  getInvestmentPools, contributeToPool, getMyInvestments,
} from '../lib/api';

// ── Types ──────────────────────────────────────────────────
type Tab = 'pools' | 'portfolio';

interface Pool {
  id: string;
  name: string;
  description: string;
  category: string;
  status: string;
  status_label: string;
  risk_level: string;
  expected_return_pct: number;
  cycle_days: number;
  insurance_trigger: string;
  notes: string;
  target_usd: number;
  target_zig: number;
  total_raised_usd: number;
  total_raised_zig: number;
  remaining_usd: number;
  funded_pct: number;
  contributor_count: number;
  farmer: Farmer | null;
  my_contribution: MyContribution | null;
  rate_used: number;
}

interface Farmer {
  id: string;
  full_name: string;
  province: string;
  district: string;
  primary_activity: string;
  farm_size_hectares: number;
  land_ownership: string;
  verification: string;
  gmb_supplier_number: string;
  zfu_membership_number: string;
  max_funding_usd: number;
}

interface MyContribution {
  total_invested_usd: number;
  total_invested_zig: number;
  expected_return_usd: number;
  expected_return_zig: number;
}

interface Portfolio {
  total_invested_usd: number;
  total_invested_zig: number;
  total_expected_usd: number;
  total_expected_zig: number;
  total_profit_usd: number;
  total_received_usd: number;
  active_pools: number;
  completed_pools: number;
}

function getToken(): string | null {
  if (typeof window !== 'undefined') return localStorage.getItem('batana_token');
  return null;
}

// ── Colour helpers ─────────────────────────────────────────
function riskBadge(level: string) {
  switch (level) {
    case 'low':    return { bg: 'rgba(116,140,61,0.12)',  color: '#748c3d', label: 'Low Risk' };
    case 'medium': return { bg: 'rgba(217,119,6,0.12)',   color: '#d97706', label: 'Medium Risk' };
    case 'high':   return { bg: 'rgba(220,38,38,0.12)',   color: '#dc2626', label: 'Higher Risk' };
    default:       return { bg: 'rgba(120,113,108,0.12)', color: '#78716c', label: level };
  }
}

function CategoryIcon({ category }: { category: string }) {
  const props = { size: 14, color: 'white' };
  switch (category) {
    case 'Agriculture':   return <Wheat {...props} />;
    case 'Retail':        return <ShoppingCart {...props} />;
    case 'Manufacturing': return <Factory {...props} />;
    case 'Livestock':     return <Beef {...props} />;
    default:              return <Briefcase {...props} />;
  }
}

function categoryAccent(category: string): string {
  switch (category) {
    case 'Agriculture':   return '#748c3d';
    case 'Retail':        return '#2563eb';
    case 'Manufacturing': return '#d97706';
    case 'Livestock':     return '#a8845a';
    default:              return '#78716c';
  }
}

function statusStyle(status: string): React.CSSProperties {
  switch (status) {
    case 'open':     return { background: 'rgba(116,140,61,0.12)',  color: '#748c3d' };
    case 'funded':   return { background: 'rgba(168,132,90,0.12)',  color: '#a8845a' };
    case 'active':   return { background: 'rgba(59,130,246,0.12)',  color: '#2563eb' };
    case 'repaying': return { background: 'rgba(124,58,237,0.12)',  color: '#7c3aed' };
    case 'complete': return { background: 'rgba(22,163,74,0.12)',   color: '#16a34a' };
    default:         return { background: 'rgba(120,113,108,0.12)', color: '#78716c' };
  }
}

// ══════════════════════════════════════════════════════════
export default function GrowPage() {
  const [tab, setTab]                       = useState<Tab>('pools');
  const [loading, setLoading]               = useState(true);
  const [actionLoading, setActionLoading]   = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [success, setSuccess]               = useState<string | null>(null);

  const [pools, setPools]                   = useState<Pool[]>([]);
  const [portfolio, setPortfolio]           = useState<Portfolio | null>(null);
  const [investments, setInvestments]       = useState<any[]>([]);
  const [openPoolCount, setOpenPoolCount]   = useState(0);
  const [rate, setRate]                     = useState(25.37);

  // Contribute modal
  const [selectedPool, setSelectedPool]     = useState<Pool | null>(null);
  const [amountUsd, setAmountUsd]           = useState('');
  const [showModal, setShowModal]           = useState(false);
  const [investResult, setInvestResult]     = useState<any>(null);

  // ── Load ─────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) { window.location.href = '/login'; return; }
    try {
      setLoading(true);
      setError(null);
      const [poolsData, portfolioData] = await Promise.all([
        getInvestmentPools(token),
        getMyInvestments(token),
      ]);
      setPools(poolsData.pools || []);
      setOpenPoolCount(poolsData.open_count || 0);
      setRate(poolsData.rate_used || 25.37);
      setPortfolio(portfolioData.portfolio || null);
      setInvestments(portfolioData.investments || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Contribute ───────────────────────────────────────────
  async function handleContribute() {
    const token = getToken();
    if (!token || !selectedPool) return;
    const amt = parseFloat(amountUsd);
    if (!amt || amt < 5) {
      setError('Minimum investment is US$5');
      return;
    }
    if (amt > selectedPool.remaining_usd) {
      setError(`Maximum available is US$${selectedPool.remaining_usd.toFixed(2)}`);
      return;
    }
    try {
      setActionLoading(true);
      setError(null);
      const data = await contributeToPool(token, {
        pool_id: selectedPool.id,
        amount_usd: amt,
      });
      setInvestResult(data);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Investment failed');
    } finally {
      setActionLoading(false);
    }
  }

  function openModal(pool: Pool) {
    setSelectedPool(pool);
    setAmountUsd('');
    setError(null);
    setInvestResult(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setSelectedPool(null);
    setAmountUsd('');
    setError(null);
    setInvestResult(null);
  }

  // ── LOADING ──────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #faf8f5, #f2ede4)',
        maxWidth: '480px', margin: '0 auto',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', gap: '1rem',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <BatanaLogo size={48} />
        <Loader size={24} color="#748c3d" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '0.8rem', color: '#78716c' }}>Loading investment pools…</span>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
      maxWidth: '480px', margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <style>{`
        @keyframes spin    { from { transform:rotate(0deg)  } to { transform:rotate(360deg) } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(16px) }
                             to   { opacity:1; transform:translateY(0)    } }
      `}</style>

      {/* ── Header ── */}
      <header style={{
        padding: '1.25rem 1.5rem',
        background: 'rgba(250,248,245,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(116,140,61,0.15)',
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', gap: '1rem',
      }}>
        <button
          onClick={() => { window.location.href = '/dashboard'; }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#748c3d', padding: '0.25rem', display: 'flex',
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1rem', fontWeight: '800', color: '#1c1917' }}>GROW</div>
          <div style={{ fontSize: '0.72rem', color: '#78716c' }}>
            Community Investment Pools · {openPoolCount} open
          </div>
        </div>
        <BatanaLogo size={32} />
      </header>

      {/* ── Tab bar ── */}
      <div style={{
        display: 'flex',
        background: 'rgba(250,248,245,0.9)',
        borderBottom: '1px solid rgba(116,140,61,0.1)',
        padding: '0 1.5rem',
      }}>
        {([
          { key: 'pools',     label: 'Investment Pools', icon: <Wheat size={14} />     },
          { key: 'portfolio', label: 'My Portfolio',     icon: <PieChart size={14} />  },
        ] as { key: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '0.875rem 0',
              background: 'none', border: 'none',
              borderBottom: tab === t.key
                ? '2.5px solid #748c3d'
                : '2.5px solid transparent',
              color: tab === t.key ? '#748c3d' : '#78716c',
              fontSize: '0.825rem', fontWeight: tab === t.key ? '700' : '500',
              cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '0.4rem',
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '1.5rem', paddingBottom: '6rem' }}>

        {error && (
          <div style={{ marginBottom: '1rem' }}>
            <ErrorBox message={error} onDismiss={() => setError(null)} />
          </div>
        )}
        {success && (
          <div style={{ marginBottom: '1rem' }}>
            <SuccessBox message={success} />
          </div>
        )}

        {/* ════════════════════════════════════════════════ */}
        {/* TAB: POOLS                                       */}
        {/* ════════════════════════════════════════════════ */}
        {tab === 'pools' && (
          <>
            {/* Stat strip */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              gap: '0.625rem', marginBottom: '1.5rem',
            }}>
              {[
                { label: 'Open Pools', value: String(openPoolCount),
                  icon: <Leaf size={14} color="#748c3d" />,        accent: '#748c3d' },
                { label: 'Avg Return',
                  value: pools.length
                    ? Math.round(pools.reduce((s, p) => s + p.expected_return_pct, 0) / pools.length) + '%'
                    : '—',
                  icon: <TrendingUp size={14} color="#a8845a" />,  accent: '#a8845a' },
                { label: 'Investors',
                  value: String(pools.reduce((s, p) => s + p.contributor_count, 0)),
                  icon: <Users size={14} color="#7c3aed" />,       accent: '#7c3aed' },
              ].map((stat) => (
                <div key={stat.label} style={{
                  background: 'rgba(255,255,255,0.85)',
                  borderRadius: '1rem', padding: '0.875rem',
                  border: '1px solid rgba(116,140,61,0.1)', textAlign: 'center',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.375rem' }}>
                    {stat.icon}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '900', color: stat.accent, lineHeight: '1' }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#78716c', marginTop: '0.2rem' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* What is GROW banner */}
            <div style={{
              background: 'linear-gradient(135deg, #1a2e0a, #2d5016)',
              borderRadius: '1.25rem', padding: '1.25rem',
              marginBottom: '1.5rem', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: '-20px', right: '-20px',
                width: '100px', height: '100px',
                background: 'radial-gradient(circle, rgba(116,140,61,0.4), transparent)',
                borderRadius: '50%',
              }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  fontSize: '0.7rem', fontWeight: '700', color: 'rgba(255,255,255,0.5)',
                  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem',
                }}>
                  What is GROW?
                </div>
                <p style={{
                  fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)',
                  lineHeight: '1.65', margin: '0 0 0.875rem',
                }}>
                  Pool your ZiG savings with other community members to fund verified
                  Zimbabwean farmers and small businesses. Earn returns while growing
                  the real economy — together.
                </p>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {[
                    { icon: <Shield size={13} />,     text: 'Agritex verified' },
                    { icon: <Award size={13} />,      text: 'ZB Bank custody'  },
                    { icon: <TrendingUp size={13} />, text: '15–25% returns'   },
                  ].map((item) => (
                    <div key={item.text} style={{
                      display: 'flex', alignItems: 'center', gap: '0.35rem',
                      color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem',
                    }}>
                      {item.icon}{item.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pool cards */}
            {pools.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '3rem 1rem',
                color: '#78716c', fontSize: '0.875rem',
              }}>
                No investment pools available right now.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {pools.map((pool, idx) => {
                  const risk         = riskBadge(pool.risk_level);
                  const accent       = categoryAccent(pool.category);
                  const isOpen       = pool.status === 'open';
                  const hasMyContrib = !!pool.my_contribution;

                  return (
                    <div
                      key={pool.id}
                      style={{
                        background: 'rgba(255,255,255,0.9)',
                        borderRadius: '1.375rem',
                        border: hasMyContrib
                          ? '2px solid rgba(116,140,61,0.35)'
                          : '1px solid rgba(116,140,61,0.12)',
                        overflow: 'hidden',
                        animation: `fadeUp 0.4s ease ${idx * 0.06}s both`,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                      }}
                    >
                      {/* Pool header */}
                      <div style={{
                        padding: '1.125rem 1.25rem 0.875rem',
                        borderBottom: '1px solid rgba(116,140,61,0.08)',
                      }}>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          alignItems: 'flex-start', marginBottom: '0.625rem',
                        }}>
                          <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                            {/* Category icon + name */}
                            <div style={{
                              display: 'flex', alignItems: 'center',
                              gap: '0.5rem', marginBottom: '0.25rem',
                            }}>
                              <div style={{
                                width: '28px', height: '28px', borderRadius: '0.625rem',
                                background: accent,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                              }}>
                                <CategoryIcon category={pool.category} />
                              </div>
                              <span style={{
                                fontSize: '0.875rem', fontWeight: '800',
                                color: '#1c1917', lineHeight: '1.3',
                              }}>
                                {pool.name}
                              </span>
                            </div>
                            {pool.farmer && (
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.35rem',
                                fontSize: '0.72rem', color: '#78716c',
                              }}>
                                <MapPin size={11} />
                                {pool.farmer.full_name} · {pool.farmer.province}
                              </div>
                            )}
                          </div>

                          {/* Status + risk badges */}
                          <div style={{
                            display: 'flex', flexDirection: 'column',
                            gap: '0.35rem', alignItems: 'flex-end',
                          }}>
                            <div style={{
                              ...statusStyle(pool.status),
                              fontSize: '0.62rem', fontWeight: '700',
                              padding: '0.2rem 0.6rem', borderRadius: '2rem',
                              textTransform: 'uppercase', letterSpacing: '0.04em',
                            }}>
                              {pool.status_label}
                            </div>
                            <div style={{
                              background: risk.bg, color: risk.color,
                              fontSize: '0.62rem', fontWeight: '700',
                              padding: '0.2rem 0.6rem', borderRadius: '2rem',
                            }}>
                              {risk.label}
                            </div>
                          </div>
                        </div>

                        {/* Return / term / investors */}
                        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                          {[
                            { value: pool.expected_return_pct + '%', label: 'expected return', color: '#748c3d' },
                            { value: String(pool.cycle_days),        label: 'day cycle',       color: '#a8845a' },
                            { value: String(pool.contributor_count), label: 'investors',        color: '#7c3aed' },
                          ].map((s) => (
                            <div key={s.label}>
                              <div style={{ fontSize: '1.5rem', fontWeight: '900', color: s.color, lineHeight: '1' }}>
                                {s.value}
                              </div>
                              <div style={{ fontSize: '0.65rem', color: '#78716c' }}>{s.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div style={{ padding: '0.875rem 1.25rem' }}>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          fontSize: '0.72rem', color: '#78716c', marginBottom: '0.5rem',
                        }}>
                          <span>
                            US${pool.total_raised_usd.toFixed(0)} raised of US${pool.target_usd.toFixed(0)}
                          </span>
                          <span style={{ fontWeight: '700', color: '#748c3d' }}>{pool.funded_pct}%</span>
                        </div>
                        <div style={{
                          height: '8px', background: 'rgba(116,140,61,0.1)',
                          borderRadius: '4px', overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%', width: `${pool.funded_pct}%`,
                            background: pool.funded_pct >= 100
                              ? '#748c3d'
                              : 'linear-gradient(to right, #748c3d, #9ab55a)',
                            borderRadius: '4px', transition: 'width 0.6s ease',
                          }} />
                        </div>
                        {isOpen && pool.remaining_usd > 0 && (
                          <div style={{ fontSize: '0.72rem', color: '#78716c', marginTop: '0.375rem' }}>
                            US${pool.remaining_usd.toFixed(2)} still needed
                            · ZiG {Math.round(pool.remaining_usd * rate).toLocaleString()}
                          </div>
                        )}
                      </div>

                      {/* Farmer detail */}
                      {pool.farmer && (
                        <div style={{
                          padding: '0.75rem 1.25rem',
                          borderTop: '1px solid rgba(116,140,61,0.08)',
                          background: 'rgba(116,140,61,0.03)',
                        }}>
                          <div style={{
                            fontSize: '0.65rem', fontWeight: '700', color: '#748c3d',
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                            marginBottom: '0.5rem',
                          }}>
                            Verified Farmer
                          </div>
                          <div style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap' }}>
                            {[
                              { label: 'Activity', value: pool.farmer.primary_activity },
                              { label: 'Farm size', value: pool.farmer.farm_size_hectares + ' ha' },
                              { label: 'Province',  value: pool.farmer.province },
                              { label: 'Land',      value: pool.farmer.land_ownership },
                            ].map((item) => (
                              <div key={item.label}>
                                <div style={{ fontSize: '0.6rem', color: '#a8a29e' }}>{item.label}</div>
                                <div style={{
                                  fontSize: '0.75rem', fontWeight: '600',
                                  color: '#57534e', textTransform: 'capitalize',
                                }}>
                                  {item.value}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Verification badges */}
                          <div style={{
                            display: 'flex', gap: '0.5rem',
                            marginTop: '0.625rem', flexWrap: 'wrap',
                          }}>
                            {pool.farmer.gmb_supplier_number && (
                              <span style={{
                                fontSize: '0.62rem', fontWeight: '600', color: '#748c3d',
                                background: 'rgba(116,140,61,0.1)',
                                padding: '0.15rem 0.5rem', borderRadius: '2rem',
                                display: 'flex', alignItems: 'center', gap: '0.25rem',
                              }}>
                                <CheckCircle size={10} />
                                GMB Supplier
                              </span>
                            )}
                            {pool.farmer.zfu_membership_number && (
                              <span style={{
                                fontSize: '0.62rem', fontWeight: '600', color: '#748c3d',
                                background: 'rgba(116,140,61,0.1)',
                                padding: '0.15rem 0.5rem', borderRadius: '2rem',
                                display: 'flex', alignItems: 'center', gap: '0.25rem',
                              }}>
                                <CheckCircle size={10} />
                                ZFU Member
                              </span>
                            )}
                            {pool.farmer.verification === 'approved' && (
                              <span style={{
                                fontSize: '0.62rem', fontWeight: '600', color: '#748c3d',
                                background: 'rgba(116,140,61,0.1)',
                                padding: '0.15rem 0.5rem', borderRadius: '2rem',
                                display: 'flex', alignItems: 'center', gap: '0.25rem',
                              }}>
                                <CheckCircle size={10} />
                                Agritex Verified
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* My contribution */}
                      {hasMyContrib && (
                        <div style={{
                          padding: '0.75rem 1.25rem',
                          borderTop: '1px solid rgba(116,140,61,0.1)',
                          background: 'rgba(116,140,61,0.06)',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <CheckCircle size={14} color="#748c3d" />
                            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#748c3d' }}>
                              You invested US${pool.my_contribution!.total_invested_usd.toFixed(2)}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#748c3d' }}>
                            US${pool.my_contribution!.expected_return_usd.toFixed(2)} expected
                          </span>
                        </div>
                      )}

                      {/* Invest button */}
                      {isOpen && (
                        <div style={{ padding: '0 1.25rem 1.25rem' }}>
                          <button
                            onClick={() => openModal(pool)}
                            style={{
                              width: '100%',
                              background: 'linear-gradient(135deg, #748c3d, #5a6e2d)',
                              color: 'white', padding: '0.875rem',
                              borderRadius: '1rem', border: 'none',
                              fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer',
                              display: 'flex', alignItems: 'center',
                              justifyContent: 'center', gap: '0.5rem',
                              boxShadow: '0 6px 20px rgba(116,140,61,0.3)',
                            }}
                          >
                            <TrendingUp size={16} />
                            {hasMyContrib ? 'Invest More' : 'Invest Now'}
                          </button>
                        </div>
                      )}

                      {/* Not open notice */}
                      {!isOpen && (
                        <div style={{
                          padding: '0.75rem 1.25rem',
                          borderTop: '1px solid rgba(116,140,61,0.08)',
                          display: 'flex', alignItems: 'center',
                          gap: '0.5rem', color: '#78716c', fontSize: '0.75rem',
                        }}>
                          <Clock size={13} />
                          {pool.status_label} — not accepting new investments
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* How it works */}
            <div style={{
              marginTop: '1.5rem',
              background: 'rgba(116,140,61,0.05)',
              borderRadius: '1.25rem', padding: '1.25rem',
              border: '1px solid rgba(116,140,61,0.12)',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                marginBottom: '0.875rem',
              }}>
                <BarChart2 size={15} color="#748c3d" />
                <span style={{
                  fontSize: '0.75rem', fontWeight: '700', color: '#748c3d',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  How GROW works
                </span>
              </div>
              {[
                'Choose a verified farmer or business to fund',
                'Invest any amount from US$5 using your ZiG wallet',
                'Your funds are held in custody by ZB Bank',
                'Farmer uses funds for their growing cycle',
                'At maturity, receive your principal and returns',
                'Insurance covers the pool if the harvest fails',
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', gap: '0.75rem',
                  alignItems: 'flex-start', padding: '0.35rem 0',
                }}>
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: 'rgba(116,140,61,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: '1px',
                  }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: '800', color: '#748c3d' }}>
                      {i + 1}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#57534e', lineHeight: '1.5' }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════ */}
        {/* TAB: PORTFOLIO                                   */}
        {/* ════════════════════════════════════════════════ */}
        {tab === 'portfolio' && (
          <>
            {portfolio && portfolio.total_invested_usd > 0 ? (
              <>
                {/* Summary card */}
                <div style={{
                  background: 'linear-gradient(135deg, #1a2e0a, #2d5016)',
                  borderRadius: '1.5rem', padding: '1.5rem',
                  marginBottom: '1.5rem', position: 'relative', overflow: 'hidden',
                  boxShadow: '0 12px 32px rgba(45,80,22,0.3)',
                }}>
                  <div style={{
                    position: 'absolute', top: '-30px', right: '-30px',
                    width: '140px', height: '140px',
                    background: 'radial-gradient(circle, rgba(116,140,61,0.4), transparent)',
                    borderRadius: '50%',
                  }} />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>
                      Total invested
                    </div>
                    <div style={{
                      fontSize: '2.25rem', fontWeight: '900',
                      color: 'white', lineHeight: '1', marginBottom: '0.25rem',
                    }}>
                      ZiG {portfolio.total_invested_zig.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#86efac', marginBottom: '1.25rem' }}>
                      US${portfolio.total_invested_usd.toFixed(2)}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      {[
                        {
                          label: 'Expected total',
                          value: `US$${portfolio.total_expected_usd.toFixed(2)}`,
                          sub: `ZiG ${portfolio.total_expected_zig.toLocaleString()}`,
                          color: '#86efac',
                        },
                        {
                          label: 'Expected profit',
                          value: `US$${portfolio.total_profit_usd.toFixed(2)}`,
                          sub: portfolio.total_invested_usd > 0
                            ? `+${Math.round((portfolio.total_profit_usd / portfolio.total_invested_usd) * 100)}%`
                            : '+0%',
                          color: '#fbbf24',
                        },
                        { label: 'Active pools',  value: String(portfolio.active_pools),    sub: 'growing',      color: 'white' },
                        { label: 'Completed',     value: String(portfolio.completed_pools), sub: 'pools repaid', color: 'white' },
                      ].map((stat) => (
                        <div key={stat.label} style={{
                          background: 'rgba(255,255,255,0.08)',
                          borderRadius: '0.875rem', padding: '0.75rem',
                        }}>
                          <div style={{
                            fontSize: '0.6rem', color: 'rgba(255,255,255,0.45)',
                            marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                          }}>
                            {stat.label}
                          </div>
                          <div style={{ fontSize: '1.1rem', fontWeight: '900', color: stat.color }}>
                            {stat.value}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>
                            {stat.sub}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Investment list */}
                <div style={{
                  fontSize: '0.72rem', fontWeight: '700', color: '#78716c',
                  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem',
                }}>
                  Your Investments · {investments.length}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {investments.map((inv) => {
                    const risk = riskBadge(inv.risk_level);
                    return (
                      <div key={inv.pool_id} style={{
                        background: 'rgba(255,255,255,0.88)',
                        borderRadius: '1.25rem', padding: '1.125rem 1.25rem',
                        border: '1px solid rgba(116,140,61,0.12)',
                      }}>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          alignItems: 'flex-start', marginBottom: '0.75rem',
                        }}>
                          <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                            <div style={{
                              fontSize: '0.875rem', fontWeight: '800',
                              color: '#1c1917', marginBottom: '0.2rem',
                            }}>
                              {inv.pool_name}
                            </div>
                            {inv.farmer && (
                              <div style={{ fontSize: '0.72rem', color: '#78716c' }}>{inv.farmer}</div>
                            )}
                          </div>
                          <div style={{
                            ...statusStyle(inv.pool_status),
                            fontSize: '0.6rem', fontWeight: '700',
                            padding: '0.2rem 0.55rem', borderRadius: '2rem',
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                            whiteSpace: 'nowrap',
                          }}>
                            {inv.pool_status_label}
                          </div>
                        </div>

                        <div style={{
                          display: 'grid', gridTemplateColumns: '1fr 1fr',
                          gap: '0.625rem', marginBottom: '0.75rem',
                        }}>
                          {[
                            { label: 'Invested',        value: `US$${inv.total_invested_usd.toFixed(2)}`,  color: '#57534e' },
                            { label: 'Expected return', value: `US$${inv.expected_return_usd.toFixed(2)}`, color: '#748c3d' },
                            { label: 'Profit',          value: `+US$${inv.profit_usd.toFixed(2)}`,         color: '#748c3d' },
                            { label: 'Matures',         value: inv.maturity_date_formatted,                color: '#57534e' },
                          ].map((item) => (
                            <div key={item.label} style={{
                              background: 'rgba(116,140,61,0.04)',
                              borderRadius: '0.75rem', padding: '0.625rem 0.75rem',
                            }}>
                              <div style={{ fontSize: '0.6rem', color: '#a8a29e', marginBottom: '0.2rem' }}>
                                {item.label}
                              </div>
                              <div style={{ fontSize: '0.875rem', fontWeight: '800', color: item.color }}>
                                {item.value}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{
                            background: risk.bg, color: risk.color,
                            fontSize: '0.62rem', fontWeight: '700',
                            padding: '0.2rem 0.55rem', borderRadius: '2rem',
                          }}>
                            {risk.label}
                          </span>
                          <span style={{
                            background: 'rgba(116,140,61,0.1)', color: '#748c3d',
                            fontSize: '0.62rem', fontWeight: '700',
                            padding: '0.2rem 0.55rem', borderRadius: '2rem',
                          }}>
                            {inv.expected_return_pct}% return
                          </span>
                          <span style={{
                            background: 'rgba(168,132,90,0.1)', color: '#a8845a',
                            fontSize: '0.62rem', fontWeight: '700',
                            padding: '0.2rem 0.55rem', borderRadius: '2rem',
                          }}>
                            {inv.cycle_days}d cycle
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* Empty state */
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%',
                  background: 'rgba(116,140,61,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}>
                  <Sprout size={32} color="#748c3d" />
                </div>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: '#57534e', marginBottom: '0.5rem' }}>
                  No investments yet
                </div>
                <p style={{
                  fontSize: '0.825rem', color: '#78716c',
                  lineHeight: '1.65', marginBottom: '1.5rem',
                }}>
                  Start with as little as US$5. Choose a verified farmer,
                  invest your ZiG, and earn returns while growing Zimbabwe's economy.
                </p>
                <button
                  onClick={() => setTab('pools')}
                  style={{
                    background: 'linear-gradient(135deg, #748c3d, #5a6e2d)',
                    color: 'white', padding: '0.875rem 2rem',
                    borderRadius: '1.25rem', border: 'none',
                    fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    boxShadow: '0 8px 24px rgba(116,140,61,0.3)',
                  }}
                >
                  <TrendingUp size={16} />
                  Browse Open Pools
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── BottomNav ── */}
      <BottomNav />

      {/* ════════════════════════════════════════════════════ */}
      {/* CONTRIBUTE MODAL                                    */}
      {/* ════════════════════════════════════════════════════ */}
      {showModal && selectedPool && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          <div style={{
            background: 'linear-gradient(180deg, #faf8f5, #f2ede4)',
            borderRadius: '1.75rem 1.75rem 0 0',
            padding: '1.75rem 1.5rem 2.5rem',
            width: '100%', maxWidth: '480px',
            animation: 'fadeUp 0.3s ease',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            {/* Modal header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', marginBottom: '1.25rem',
            }}>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: '800', color: '#1c1917' }}>
                  Invest in Pool
                </div>
                <div style={{ fontSize: '0.75rem', color: '#78716c', marginTop: '0.15rem' }}>
                  {selectedPool.name}
                </div>
              </div>
              <button
                onClick={closeModal}
                style={{
                  background: 'rgba(120,113,108,0.1)', border: 'none',
                  borderRadius: '50%', width: '32px', height: '32px',
                  cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: '#78716c',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Success state */}
            {investResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #1a2e0a, #2d5016)',
                  borderRadius: '1.25rem', padding: '1.5rem', textAlign: 'center',
                }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 0.875rem',
                  }}>
                    <CheckCircle size={28} color="white" />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>
                    Investment confirmed
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '900', color: 'white', lineHeight: '1' }}>
                    ZiG {investResult.investment?.amount_zig?.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#86efac', marginTop: '0.25rem' }}>
                    US${investResult.investment?.amount_usd} invested
                  </div>
                  <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                    Expected return: US${investResult.investment?.expected_return_usd}
                    · Matures {investResult.investment?.maturity_date_formatted}
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #748c3d, #5a6e2d)',
                    color: 'white', padding: '1rem', borderRadius: '1.25rem',
                    border: 'none', fontSize: '1rem', fontWeight: '700', cursor: 'pointer',
                  }}
                >
                  Done
                </button>
              </div>
            ) : (
              /* Input state */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {error && <ErrorBox message={error} onDismiss={() => setError(null)} />}

                {/* Pool summary strip */}
                <div style={{
                  background: 'rgba(255,255,255,0.85)',
                  borderRadius: '1.125rem', padding: '1rem 1.125rem',
                  border: '1px solid rgba(116,140,61,0.15)',
                  display: 'flex', gap: '1.25rem',
                }}>
                  {[
                    { value: selectedPool.expected_return_pct + '%', label: 'return',    color: '#748c3d' },
                    { value: selectedPool.cycle_days + 'd',          label: 'cycle',     color: '#a8845a' },
                    { value: 'US$' + selectedPool.remaining_usd.toFixed(0), label: 'available', color: '#57534e' },
                  ].map((s) => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.35rem', fontWeight: '900', color: s.color }}>
                        {s.value}
                      </div>
                      <div style={{ fontSize: '0.62rem', color: '#78716c' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Amount input */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label style={labelStyle}>Amount (USD)</label>
                    {parseFloat(amountUsd) > 0 && (
                      <span style={{ fontSize: '0.75rem', color: '#748c3d', fontWeight: '600' }}>
                        ZiG {Math.round(parseFloat(amountUsd) * rate).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                      onClick={() => setAmountUsd((v) => String(Math.max(0, (parseFloat(v) || 0) - 5)))}
                      style={{
                        width: '44px', height: '44px', borderRadius: '50%',
                        background: 'rgba(116,140,61,0.1)', border: 'none',
                        cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        color: '#748c3d', flexShrink: 0,
                      }}
                    >
                      <Minus size={18} />
                    </button>
                    <input
                      type="number"
                      value={amountUsd}
                      onChange={(e) => { setAmountUsd(e.target.value); setError(null); }}
                      placeholder="0"
                      min="5" step="5"
                      style={{
                        ...inputStyle, fontSize: '1.75rem',
                        fontWeight: '900', textAlign: 'center', flex: 1,
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#748c3d'; }}
                      onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(116,140,61,0.25)'; }}
                    />
                    <button
                      onClick={() =>
                        setAmountUsd((v) =>
                          String(Math.min(selectedPool.remaining_usd, (parseFloat(v) || 0) + 5))
                        )
                      }
                      style={{
                        width: '44px', height: '44px', borderRadius: '50%',
                        background: 'rgba(116,140,61,0.1)', border: 'none',
                        cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        color: '#748c3d', flexShrink: 0,
                      }}
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  {/* Quick amounts */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    {[5, 10, 20, 50]
                      .filter((v) => v <= selectedPool.remaining_usd)
                      .map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setAmountUsd(String(amt))}
                          style={{
                            padding: '0.375rem 0.875rem', borderRadius: '2rem',
                            border: parseFloat(amountUsd) === amt
                              ? '2px solid #748c3d'
                              : '1.5px solid rgba(116,140,61,0.25)',
                            background: parseFloat(amountUsd) === amt
                              ? 'rgba(116,140,61,0.1)'
                              : 'rgba(255,255,255,0.7)',
                            color: parseFloat(amountUsd) === amt ? '#748c3d' : '#78716c',
                            fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer',
                          }}
                        >
                          US${amt}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Return preview */}
                {parseFloat(amountUsd) >= 5 && (
                  <div style={{
                    background: 'rgba(116,140,61,0.06)',
                    border: '1px solid rgba(116,140,61,0.15)',
                    borderRadius: '1rem', padding: '1rem 1.125rem',
                  }}>
                    <div style={{
                      fontSize: '0.65rem', fontWeight: '700', color: '#748c3d',
                      textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.625rem',
                    }}>
                      Return Preview
                    </div>
                    {(() => {
                      const amt  = parseFloat(amountUsd) || 0;
                      const ret  = parseFloat(String(selectedPool.expected_return_pct)) / 100;
                      const earn = Math.round(amt * (1 + ret) * 100) / 100;
                      const prof = Math.round(amt * ret * 100) / 100;
                      return (
                        <>
                          {[
                            { label: 'You invest',                                      value: `US$${amt.toFixed(2)}`  },
                            { label: `Return (${selectedPool.expected_return_pct}%)`,   value: `+US$${prof.toFixed(2)}` },
                            { label: 'You receive',                                     value: `US$${earn.toFixed(2)}`  },
                          ].map((row, i, arr) => (
                            <div key={row.label} style={{
                              display: 'flex', justifyContent: 'space-between',
                              padding: '0.375rem 0',
                              borderTop: i === arr.length - 1 ? '1.5px solid rgba(116,140,61,0.15)' : 'none',
                              marginTop: i === arr.length - 1 ? '0.25rem' : 0,
                            }}>
                              <span style={{ fontSize: '0.8rem', color: '#57534e' }}>{row.label}</span>
                              <span style={{
                                fontSize: '0.875rem',
                                fontWeight: i === arr.length - 1 ? '900' : '700',
                                color: i === arr.length - 1 ? '#748c3d' : '#1c1917',
                              }}>
                                {row.value}
                              </span>
                            </div>
                          ))}
                          <div style={{
                            fontSize: '0.72rem', color: '#78716c', marginTop: '0.5rem',
                            display: 'flex', alignItems: 'center', gap: '0.35rem',
                          }}>
                            <Clock size={11} />
                            Matures in {selectedPool.cycle_days} days
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Confirm button */}
                <button
                  onClick={handleContribute}
                  disabled={actionLoading || !amountUsd || parseFloat(amountUsd) < 5}
                  style={{
                    width: '100%',
                    background:
                      actionLoading || !amountUsd || parseFloat(amountUsd) < 5
                        ? 'rgba(116,140,61,0.35)'
                        : 'linear-gradient(135deg, #748c3d, #5a6e2d)',
                    color: 'white', padding: '1rem', borderRadius: '1.25rem',
                    border: 'none', fontSize: '1rem', fontWeight: '700',
                    cursor:
                      actionLoading || !amountUsd || parseFloat(amountUsd) < 5
                        ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: '0.5rem',
                    boxShadow:
                      actionLoading || !amountUsd || parseFloat(amountUsd) < 5
                        ? 'none' : '0 8px 24px rgba(116,140,61,0.3)',
                  }}
                >
                  {actionLoading
                    ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Investing…</>
                    : <><TrendingUp size={18} /> Confirm Investment</>
                  }
                </button>

                <p style={{
                  fontSize: '0.72rem', color: '#a8a29e',
                  textAlign: 'center', margin: 0, lineHeight: '1.5',
                }}>
                  Funds are deducted from your ZiG wallet and held in custody by ZB Bank
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── SHARED ─────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  fontSize: '0.75rem', fontWeight: '700', color: '#57534e',
  display: 'block', marginBottom: '0.5rem',
  textTransform: 'uppercase', letterSpacing: '0.05em',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.875rem 1.125rem',
  borderRadius: '1rem', border: '1.5px solid rgba(116,140,61,0.25)',
  background: 'rgba(255,255,255,0.85)', fontSize: '1rem', color: '#1c1917',
  outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box', transition: 'border-color 0.2s',
};

function ErrorBox({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div style={{
      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
      borderRadius: '0.875rem', padding: '0.875rem 1rem',
      display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
    }}>
      <AlertCircle size={17} color="#dc2626" style={{ flexShrink: 0, marginTop: '1px' }} />
      <span style={{ fontSize: '0.85rem', color: '#dc2626', flex: 1 }}>{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#dc2626', padding: 0, flexShrink: 0,
        }}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}

function SuccessBox({ message }: { message: string }) {
  return (
    <div style={{
      background: 'rgba(116,140,61,0.1)', border: '1px solid rgba(116,140,61,0.25)',
      borderRadius: '0.875rem', padding: '0.875rem 1rem',
      display: 'flex', gap: '0.75rem', alignItems: 'center',
    }}>
      <CheckCircle size={17} color="#748c3d" style={{ flexShrink: 0 }} />
      <span style={{ fontSize: '0.85rem', color: '#748c3d', fontWeight: '600' }}>{message}</span>
    </div>
  );
}