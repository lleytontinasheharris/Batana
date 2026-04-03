'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Coins,
  TrendingUp,
  Users,
  Star,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Shield,
  Plus,
  Bell,
  Settings,
  Loader,
  AlertCircle,
} from 'lucide-react';
import BatanaLogo from '../components/BatanaLogo';
import {
  getUserProfile,
  getWallet,
  getUserMukandoGroups,
  getVimbisoScore,
} from '../lib/api';

// Score factor breakdown
const scoreFactorLabels: Record<string, string> = {
  mukando_history: 'Mukando History',
  savings_consistency: 'Savings',
  transaction_activity: 'Activity',
  loan_repayment: 'Loan Repayment',
  community_verification: 'Community',
  insurance_premiums: 'Insurance',
  mukando_duration: 'Mukando Duration',
  savings_growth: 'Savings Growth',
};

const scoreFactorMax: Record<string, number> = {
  mukando_history: 30,
  savings_consistency: 15,
  transaction_activity: 15,
  loan_repayment: 10,
  community_verification: 10,
  insurance_premiums: 5,
  mukando_duration: 10,
  savings_growth: 5,
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real data state
  const [profile, setProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [mukandoGroups, setMukandoGroups] = useState<any[]>([]);
  const [vimbisoScore, setVimbisoScore] = useState<any>(null);

  // Get token from localStorage
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('batana_token');
    }
    return null;
  };

  const getPhone = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('batana_phone');
    }
    return null;
  };

  const loadDashboardData = useCallback(async () => {
    const token = getToken();
    const phone = getPhone();

    if (!token) {
      // No token — redirect to login
      window.location.href = '/login';
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load all data in parallel
      const [profileData, walletData, scoreData] = await Promise.all([
        getUserProfile(token),
        getWallet(token),
        phone ? getVimbisoScore(phone) : Promise.resolve(null),
      ]);

      setProfile(profileData);
      setWallet(walletData);
      setVimbisoScore(scoreData);

      // Load mukando groups if we have phone
      if (phone) {
        try {
          const mukandoData = await getUserMukandoGroups(phone);
          setMukandoGroups(mukandoData.mukando_groups || []);
        } catch {
          setMukandoGroups([]);
        }
      }

    } catch (err: any) {
      if (err.message.includes('expired') || err.message.includes('Invalid token')) {
        localStorage.removeItem('batana_token');
        localStorage.removeItem('batana_phone');
        window.location.href = '/login';
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const tabs = [
    { id: 'home', label: 'Home', icon: Shield },
    { id: 'wallet', label: 'Wallet', icon: Coins },
    { id: 'mukando', label: 'Mukando', icon: Users },
    { id: 'score', label: 'Vimbiso', icon: Star },
    { id: 'grow', label: 'Grow', icon: TrendingUp },
  ];

  // Loading state
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
        <BatanaLogo size={48} />
        <Loader size={24} color="#a8845a" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#78716c', fontSize: '0.875rem' }}>Loading your account...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Error state
  if (error) {
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
        padding: '2rem',
        textAlign: 'center',
      }}>
        <AlertCircle size={48} color="#a8845a" />
        <h2 style={{ color: '#1c1917', fontWeight: '700' }}>Something went wrong</h2>
        <p style={{ color: '#78716c', fontSize: '0.875rem' }}>{error}</p>
        <button
          onClick={loadDashboardData}
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
    );
  }

  const user = profile?.user;
  const walletData = wallet?.wallet;
  const score = vimbisoScore?.vimbiso_score ?? vimbisoScore?.chivimbiso_score ?? vimbisoScore?.score ?? 0;
  const factors = vimbisoScore?.factors || {};
  const maxLoan = vimbisoScore?.max_loan_eligible?.replace('US$', '') || vimbisoScore?.max_loan_amount_usd || 0;
  const activeMukando = mukandoGroups.filter(g => g.status === 'active');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
      maxWidth: '480px',
      margin: '0 auto',
      position: 'relative',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>

      {/* ===== TOP BAR ===== */}
      <header style={{
        padding: '1.25rem 1.5rem 1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(250, 248, 245, 0.9)',
        backdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderBottom: '1px solid rgba(168, 132, 90, 0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <BatanaLogo size={32} />
          <span style={{
            fontSize: '1.125rem',
            fontWeight: '900',
            color: '#3a2a1c',
            letterSpacing: '0.06em',
          }}>
            BATANA
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.5rem',
            color: '#78716c',
          }}>
            <Bell size={20} />
          </button>
          <button style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.5rem',
            color: '#78716c',
          }}>
            <Settings size={20} />
          </button>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #a8845a, #967554)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: '700',
            fontSize: '0.875rem',
          }}>
            {user?.first_name?.charAt(0) || 'B'}
          </div>
        </div>
      </header>

      {/* ===== SCROLLABLE CONTENT ===== */}
      <div style={{
        padding: '1.5rem',
        paddingBottom: '6rem',
      }}>

        {/* Greeting */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{
            fontSize: '0.875rem',
            color: '#78716c',
            marginBottom: '0.25rem',
          }}>
            Welcome back,
          </p>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: '800',
            color: '#1c1917',
          }}>
            {user?.first_name} {user?.last_name}
          </h1>
        </div>

        {/* ===== WALLET CARD ===== */}
        <div style={{
          background: 'linear-gradient(135deg, #3a2a1c, #6f5336)',
          borderRadius: '1.75rem',
          padding: '1.75rem',
          marginBottom: '1.25rem',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 16px 40px rgba(58, 42, 28, 0.3)',
        }}>
          <div style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(168,132,90,0.3), transparent)',
            borderRadius: '50%',
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-60px',
            left: '-30px',
            width: '180px',
            height: '180px',
            background: 'radial-gradient(circle, rgba(245,158,11,0.15), transparent)',
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
              Total Gold Savings
            </div>

            <div style={{
              fontSize: '2.5rem',
              fontWeight: '900',
              color: 'white',
              lineHeight: '1',
              marginBottom: '0.25rem',
            }}>
              {parseFloat(walletData?.gold_grams || 0).toFixed(4)}g
            </div>

            <div style={{
              fontSize: '0.875rem',
              color: '#f59e0b',
              fontWeight: '600',
              marginBottom: '1.5rem',
            }}>
              US${parseFloat(walletData?.gold_value_usd || 0).toFixed(2)} · ZiG {parseFloat(walletData?.zig_balance || 0).toLocaleString()}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '0.75rem',
            }}>
              {[
                { label: 'Deposit', icon: ArrowDownLeft },
                { label: 'Send', icon: ArrowUpRight },
                { label: 'More', icon: Plus },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <button key={action.label} style={{
                    background: 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '1rem',
                    padding: '0.75rem',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.375rem',
                  }}>
                    <Icon size={18} />
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ===== VIMBISO SCORE CARD ===== */}
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
                Vimbiso Score
              </div>
              <div style={{
                fontSize: '2.5rem',
                fontWeight: '900',
                color: '#1c1917',
                lineHeight: '1',
              }}>
                {score}
              </div>
              <div style={{
                fontSize: '0.8rem',
                color: score >= 60 ? '#748c3d' : '#a8845a',
                fontWeight: '600',
                marginTop: '0.25rem',
              }}>
                {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Building' : 'Starting'}
                {maxLoan > 0 ? ` · US$${maxLoan} loan eligible` : ''}
              </div>
            </div>

            {/* Score Ring */}
            <div style={{ position: 'relative', width: '80px', height: '80px' }}>
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle
                  cx="40" cy="40" r="32"
                  fill="none"
                  stroke="#f2ede4"
                  strokeWidth="8"
                />
                <circle
                  cx="40" cy="40" r="32"
                  fill="none"
                  stroke="#a8845a"
                  strokeWidth="8"
                  strokeDasharray={`${(score / 100) * 201} 201`}
                  strokeLinecap="round"
                  transform="rotate(-90 40 40)"
                />
              </svg>
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: '700',
                color: '#a8845a',
              }}>
                {score}
              </div>
            </div>
          </div>

          {/* Score Bars from real factors */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {Object.entries(factors).slice(0, 4).map(([key, value]) => {
              const max = scoreFactorMax[key] || 10;
              const val = value as number;
              return (
                <div key={key}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.25rem',
                  }}>
                    <span style={{ fontSize: '0.75rem', color: '#57534e' }}>
                      {scoreFactorLabels[key] || key}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#1c1917' }}>
                      {val}/{max}
                    </span>
                  </div>
                  <div style={{
                    height: '6px',
                    background: '#f2ede4',
                    borderRadius: '1rem',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${(val / max) * 100}%`,
                      background: 'linear-gradient(to right, #a8845a, #f59e0b)',
                      borderRadius: '1rem',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          <button style={{
            width: '100%',
            marginTop: '1.25rem',
            padding: '0.75rem',
            background: 'transparent',
            border: '1.5px solid rgba(168,132,90,0.3)',
            borderRadius: '1rem',
            color: '#a8845a',
            fontWeight: '600',
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}>
            View full score breakdown
            <ChevronRight size={16} />
          </button>
        </div>

        {/* ===== MUKANDO CARD ===== */}
        {activeMukando.length > 0 ? (
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
                My Mukando
              </div>
              <span style={{
                background: '#e8f0d8',
                color: '#748c3d',
                fontSize: '0.7rem',
                fontWeight: '700',
                padding: '0.25rem 0.75rem',
                borderRadius: '2rem',
              }}>
                {activeMukando.length} Active
              </span>
            </div>

            {activeMukando.slice(0, 1).map((group) => (
              <div key={group.group_id}>
                <div style={{
                  fontSize: '1rem',
                  fontWeight: '700',
                  color: '#1c1917',
                  marginBottom: '0.25rem',
                }}>
                  {group.name}
                </div>
                <div style={{
                  fontSize: '0.8rem',
                  color: '#78716c',
                  marginBottom: '1.25rem',
                }}>
                  Month {group.current_month} · Your payout: Month {group.your_payout_month}
                  {group.has_received_payout ? ' · Received' : ''}
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f5ece0, #f0e4d0)',
                  borderRadius: '1rem',
                  padding: '1.25rem',
                  marginBottom: '1rem',
                }}>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#78716c',
                    marginBottom: '0.25rem',
                  }}>
                    Total Contributed
                  </div>
                  <div style={{
                    fontSize: '1.75rem',
                    fontWeight: '900',
                    color: '#3a2a1c',
                  }}>
                    {parseFloat(group.total_contributed?.gold_grams || 0).toFixed(4)}g gold
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#a8845a',
                    fontWeight: '600',
                    marginTop: '0.25rem',
                  }}>
                    ZiG {parseFloat(group.total_contributed?.zig || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}

            <button style={{
              width: '100%',
              padding: '0.75rem',
              background: 'transparent',
              border: '1.5px solid rgba(168,132,90,0.3)',
              borderRadius: '1rem',
              color: '#a8845a',
              fontWeight: '600',
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}>
              View all groups
              <ChevronRight size={16} />
            </button>
          </div>
        ) : (
          <div style={{
            background: 'rgba(255,255,255,0.75)',
            borderRadius: '1.5rem',
            padding: '1.5rem',
            marginBottom: '1.25rem',
            border: '1.5px dashed rgba(168,132,90,0.3)',
            textAlign: 'center',
          }}>
            <Users size={32} color="#d4c0a3" style={{ margin: '0 auto 0.75rem' }} />
            <div style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#57534e',
              marginBottom: '0.5rem',
            }}>
              No mukando groups yet
            </div>
            <div style={{
              fontSize: '0.8rem',
              color: '#78716c',
              marginBottom: '1.25rem',
            }}>
              Join or create a group to start building your Vimbiso Score
            </div>
            <button style={{
              background: 'linear-gradient(135deg, #a8845a, #967554)',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '1rem',
              border: 'none',
              fontWeight: '600',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}>
              Start a Mukando Group
            </button>
          </div>
        )}
      </div>

      {/* ===== BOTTOM NAVIGATION ===== */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '480px',
        background: 'rgba(250,248,245,0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(168,132,90,0.15)',
        padding: '0.75rem 1.5rem 1rem',
        display: 'flex',
        justifyContent: 'space-around',
        zIndex: 50,
      }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.5rem',
                color: isActive ? '#a8845a' : '#a8a29e',
              }}
            >
              <div style={{
                width: '40px',
                height: '32px',
                borderRadius: '1rem',
                background: isActive ? 'rgba(168,132,90,0.12)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}>
                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
              </div>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: isActive ? '700' : '500',
              }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}