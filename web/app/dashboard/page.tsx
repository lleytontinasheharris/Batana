'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Users, ChevronRight, Shield, Plus,
  Bell, Settings, Loader, AlertCircle,
  ArrowUpRight, ArrowDownLeft, CreditCard,
  BarChart2, Wheat, Activity, LogOut,
} from 'lucide-react';
import BatanaLogo from '../components/BatanaLogo';
import BottomNav from '../components/BottomNav';
import {
  getUserProfile, getWallet,
  getUserMukandoGroups, getVimbisoScore, getZigHealth,
} from '../lib/api';

const scoreFactorLabels: Record<string, string> = {
  mukando_history:        'Mukando History',
  savings_consistency:    'Savings',
  transaction_activity:   'Activity',
  loan_repayment:         'Loan Repayment',
  community_verification: 'Community',
  insurance_premiums:     'Insurance',
  mukando_duration:       'Mukando Duration',
  savings_growth:         'Savings Growth',
};

const scoreFactorMax: Record<string, number> = {
  mukando_history:        30,
  savings_consistency:    15,
  transaction_activity:   15,
  loan_repayment:         10,
  community_verification: 10,
  insurance_premiums:      5,
  mukando_duration:       10,
  savings_growth:          5,
};

function buildSparklinePoints(currentRate: number, width: number, height: number, points = 30): string {
  const seed = Math.floor(currentRate * 100);
  const values: number[] = [];
  let v = currentRate * (0.92 + (seed % 8) * 0.01);
  for (let i = 0; i < points; i++) {
    const noise = ((seed * (i + 1) * 7919) % 100) / 100 - 0.5;
    v = v + noise * currentRate * 0.012;
    v = Math.max(currentRate * 0.88, Math.min(currentRate * 1.08, v));
    values.push(v);
  }
  values[values.length - 1] = currentRate;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((val, i) => {
    const x = (i / (points - 1)) * width;
    const y = height - ((val - min) / range) * (height - 8) - 4;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

function ZigChart({ rate, width = 260, height = 56 }: { rate: number; width?: number; height?: number }) {
  const path = buildSparklinePoints(rate, width, height);
  const fillPath = path + ` L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="zigFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#zigFill)" />
      <path d={path} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={width}
        cy={(() => {
          const pts = buildSparklinePoints(rate, width, height).split(' ');
          const last = pts[pts.length - 1].replace('L', '');
          return parseFloat(last.split(',')[1]);
        })()}
        r="3.5"
        fill="#f59e0b"
      />
    </svg>
  );
}

function ScoreArc({ score }: { score: number }) {
  const r = 54; const cx = 64; const cy = 64;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score / 100, 1);
  const color = score >= 80 ? '#748c3d' : score >= 60 ? '#a8845a' : score >= 40 ? '#d97706' : '#a8845a';
  return (
    <svg width="128" height="128" viewBox="0 0 128 128">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(168,132,90,0.15)" strokeWidth="10" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="24" fontWeight="900" fill={color} fontFamily="-apple-system, sans-serif">{score}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fontWeight="600" fill="#78716c" fontFamily="-apple-system, sans-serif">
        {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Building' : 'Starting'}
      </text>
    </svg>
  );
}

function FactorBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
        <span style={{ fontSize: '0.72rem', color: '#57534e', fontWeight: '500' }}>{label}</span>
        <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#1c1917' }}>{value}/{max}</span>
      </div>
      <div style={{ height: '7px', background: 'rgba(168,132,90,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: pct >= 80 ? 'linear-gradient(to right, #748c3d, #9ab55a)' : pct >= 50 ? 'linear-gradient(to right, #a8845a, #d4af37)' : 'linear-gradient(to right, #a8845a, #c8975a)',
          borderRadius: '4px', transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  );
}

// ── Profile Drawer ─────────────────────────────────────────
function ProfileDrawer({ user, onClose }: { user: any; onClose: () => void }) {
  function handleLogout() {
    localStorage.removeItem('batana_token');
    localStorage.removeItem('batana_phone');
    window.location.href = '/login';
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 100, backdropFilter: 'blur(4px)',
        }}
      />
      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '280px', background: '#faf8f5',
        zIndex: 101, padding: '2rem 1.5rem',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column', gap: '1.5rem',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        {/* Avatar + name */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', paddingTop: '1rem' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #a8845a, #967554)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: '900', fontSize: '1.75rem',
          }}>
            {user?.first_name?.charAt(0) || 'B'}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1c1917' }}>
              {user?.first_name} {user?.last_name}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#78716c', marginTop: '0.2rem' }}>
              {user?.phone_number}
            </div>
            {user?.is_verified && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                fontSize: '0.65rem', fontWeight: '700',
                background: 'rgba(116,140,61,0.12)', color: '#748c3d',
                padding: '0.2rem 0.6rem', borderRadius: '2rem',
                marginTop: '0.5rem', textTransform: 'uppercase',
              }}>
                <Shield size={9} color="#748c3d" /> Verified
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(168,132,90,0.15)' }} />

        {/* Info rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { label: 'Member since', value: user?.member_since ? new Date(user.member_since).toLocaleDateString('en-ZW', { month: 'long', year: 'numeric' }) : '—' },
            { label: 'Date of birth', value: user?.date_of_birth || '—' },
            { label: 'Role', value: user?.is_admin ? 'Administrator' : user?.is_store_attendant ? 'Store Attendant' : 'Member' },
          ].map((row) => (
            <div key={row.label}>
              <div style={{ fontSize: '0.65rem', color: '#a8a29e', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
                {row.label}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#1c1917', fontWeight: '600' }}>
                {row.value}
              </div>
            </div>
          ))}
        </div>

        {/* Admin / Store links if applicable */}
        {user?.is_admin && (
          <button
            onClick={() => { window.location.href = '/admin'; }}
            style={{
              background: 'rgba(168,132,90,0.08)', border: '1px solid rgba(168,132,90,0.2)',
              borderRadius: '1rem', padding: '0.875rem 1rem',
              color: '#a8845a', fontWeight: '700', fontSize: '0.875rem',
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            Admin Dashboard
          </button>
        )}
        {user?.is_store_attendant && (
          <button
            onClick={() => { window.location.href = '/store'; }}
            style={{
              background: 'rgba(168,132,90,0.08)', border: '1px solid rgba(168,132,90,0.2)',
              borderRadius: '1rem', padding: '0.875rem 1rem',
              color: '#a8845a', fontWeight: '700', fontSize: '0.875rem',
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            Store Portal
          </button>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '1rem', padding: '0.875rem 1rem',
            color: '#ef4444', fontWeight: '700', fontSize: '0.875rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════
export default function Dashboard() {
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [profile, setProfile]               = useState<any>(null);
  const [wallet, setWallet]                 = useState<any>(null);
  const [mukandoGroups, setMukandoGroups]   = useState<any[]>([]);
  const [vimbisoScore, setVimbisoScore]     = useState<any>(null);
  const [zigHealth, setZigHealth]           = useState<any>(null);
  const [showProfile, setShowProfile]       = useState(false);

  function getToken() {
    if (typeof window !== 'undefined') return localStorage.getItem('batana_token');
    return null;
  }
  function getPhone() {
    if (typeof window !== 'undefined') return localStorage.getItem('batana_phone');
    return null;
  }

  const loadDashboardData = useCallback(async () => {
    const token = getToken();
    const phone = getPhone();
    if (!token) { window.location.href = '/login'; return; }
    try {
      setLoading(true);
      setError(null);
      const [profileData, walletData, scoreData, zigData] = await Promise.all([
        getUserProfile(token),
        getWallet(token),
        phone ? getVimbisoScore(phone) : Promise.resolve(null),
        getZigHealth(),
      ]);

      setProfile(profileData);
      setWallet(walletData);
      setVimbisoScore(scoreData);
      setZigHealth(zigData);

      // ── Role-based redirect ──────────────────────────
      const userData = profileData?.user || profileData;

      if (userData?.is_admin) {
        window.location.href = '/admin';
        return;
      }
      if (userData?.is_store_attendant) {
        window.location.href = '/store';
        return;
      }

      if (phone) {
        try {
          const mukandoData = await getUserMukandoGroups(phone);
          setMukandoGroups(mukandoData.mukando_groups || []);
        } catch { setMukandoGroups([]); }
      }
    } catch (err: any) {
      if (err.message?.includes('expired') || err.message?.includes('Invalid token')) {
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

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
        maxWidth: '480px', margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '1rem',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <BatanaLogo size={48} />
        <Loader size={24} color="#a8845a" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#78716c', fontSize: '0.875rem' }}>Loading your account...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh', background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
        maxWidth: '480px', margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '1rem',
        padding: '2rem', textAlign: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <AlertCircle size={48} color="#a8845a" />
        <h2 style={{ color: '#1c1917', fontWeight: '700' }}>Something went wrong</h2>
        <p style={{ color: '#78716c', fontSize: '0.875rem' }}>{error}</p>
        <button onClick={loadDashboardData} style={{
          background: 'linear-gradient(135deg, #a8845a, #967554)',
          color: 'white', padding: '0.75rem 2rem',
          borderRadius: '1rem', border: 'none', fontWeight: '600', cursor: 'pointer',
        }}>Try Again</button>
      </div>
    );
  }

  const user          = profile?.user;
  const walletData    = wallet?.wallet;
  const score         = vimbisoScore?.vimbiso_score ?? vimbisoScore?.score ?? 0;
  const factors       = vimbisoScore?.factors || {};
  const maxLoan       = vimbisoScore?.max_loan_eligible?.replace('US$', '') || vimbisoScore?.max_loan_amount_usd || 0;
  const activeMukando = mukandoGroups.filter((g) => g.status === 'active');

  const zigRate      = zigHealth?.official_rate_zig_per_usd ?? 25.37;
  const goldPriceUsd = zigHealth?.gold_price_usd_per_gram   ?? 95.0;
  const goldPriceZig = zigHealth?.gold_price_zig_per_gram   ?? goldPriceUsd * zigRate;

  const goldGrams    = parseFloat(walletData?.gold_grams     || 0);
  const goldValueUsd = parseFloat(walletData?.gold_value_usd || 0);
  const zigBalance   = parseFloat(walletData?.zig_balance    || 0);
  const usdBalance   = parseFloat(walletData?.usd_balance    || 0);

  const quickLinks = [
    { label: 'Loans',     href: '/loans',     icon: <CreditCard size={20} color="#a8845a" /> },
    { label: 'Insurance', href: '/insurance', icon: <Shield size={20} color="#a8845a" />     },
    { label: 'Grow',      href: '/grow',      icon: <Wheat size={20} color="#748c3d" />      },
    { label: 'Trust',     href: '/trust',     icon: <BarChart2 size={20} color="#a8845a" />  },
  ];

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
      maxWidth: '480px', margin: '0 auto', position: 'relative',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Profile drawer */}
      {showProfile && <ProfileDrawer user={user} onClose={() => setShowProfile(false)} />}

      {/* ── TOP BAR ── */}
      <header style={{
        padding: '1.25rem 1.5rem 1rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(250,248,245,0.95)', backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '1px solid rgba(168,132,90,0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <BatanaLogo size={32} />
          <span style={{ fontSize: '1.125rem', fontWeight: '900', color: '#3a2a1c', letterSpacing: '0.06em' }}>
            BATANA
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Bell — shows notification dot, opens drawer in future */}
          <button
            onClick={() => setShowProfile(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', color: '#78716c', position: 'relative' }}
          >
            <Bell size={20} />
          </button>

          {/* Settings — opens profile drawer */}
          <button
            onClick={() => setShowProfile(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', color: '#78716c' }}
          >
            <Settings size={20} />
          </button>

          {/* Avatar — opens profile drawer */}
          <button
            onClick={() => setShowProfile(true)}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #a8845a, #967554)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: '700', fontSize: '0.875rem',
              border: '2px solid rgba(168,132,90,0.3)', cursor: 'pointer',
            }}
          >
            {user?.first_name?.charAt(0) || 'B'}
          </button>
        </div>
      </header>

      <div style={{ padding: '1.5rem', paddingBottom: '6rem' }}>

        {/* Greeting */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.875rem', color: '#78716c', marginBottom: '0.25rem' }}>Welcome back,</p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1c1917', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {user?.first_name} {user?.last_name}
            {user?.is_verified && (
              <span style={{
                fontSize: '0.68rem', fontWeight: '700',
                background: 'rgba(116,140,61,0.12)', color: '#748c3d',
                padding: '0.2rem 0.6rem', borderRadius: '2rem',
                letterSpacing: '0.04em', textTransform: 'uppercase',
                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
              }}>
                <Shield size={9} color="#748c3d" /> Verified
              </span>
            )}
          </h1>
        </div>

        {/* Verification banner */}
        {!user?.is_verified && (
          <button
            onClick={() => { window.location.href = '/verify'; }}
            style={{
              width: '100%', background: 'linear-gradient(135deg, #1c1917, #3a2a1c)',
              borderRadius: '1.25rem', padding: '1.125rem 1.25rem',
              marginBottom: '1.25rem', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left',
              boxShadow: '0 4px 16px rgba(58,42,28,0.2)',
            }}
          >
            <div style={{ width: '40px', height: '40px', borderRadius: '0.875rem', background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Shield size={20} color="#f59e0b" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '700', color: 'white', marginBottom: '0.2rem' }}>
                {user?.verification_submitted ? 'Verification under review' : 'Verify your identity'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', lineHeight: '1.4' }}>
                {user?.verification_submitted ? 'Your documents are being reviewed. Usually within 24 hours.' : 'Unlock savings, loans, mukando and insurance'}
              </div>
            </div>
            <ChevronRight size={18} color="rgba(255,255,255,0.4)" style={{ flexShrink: 0 }} />
          </button>
        )}

        {/* ── WALLET CARD ── */}
        <div style={{
          background: 'linear-gradient(135deg, #3a2a1c 0%, #6f5336 60%, #8a6840 100%)',
          borderRadius: '1.75rem', padding: '1.75rem',
          marginBottom: '1rem', position: 'relative', overflow: 'hidden',
          boxShadow: '0 16px 40px rgba(58,42,28,0.35)',
        }}>
          <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(212,175,55,0.25), transparent)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: '-40px', left: '-20px', width: '160px', height: '160px', background: 'radial-gradient(circle, rgba(245,158,11,0.12), transparent)', borderRadius: '50%' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Activity size={11} color="rgba(255,255,255,0.4)" /> Vimbiso Wallet
            </div>
            <div style={{ fontSize: '2.75rem', fontWeight: '900', color: 'white', lineHeight: '1', marginBottom: '0.2rem' }}>
              {goldGrams.toFixed(4)}
              <span style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.7)', marginLeft: '0.3rem' }}>g gold</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.875rem', color: '#f59e0b', fontWeight: '700' }}>US${goldValueUsd.toFixed(2)}</div>
              <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.55)', fontWeight: '600' }}>ZiG {zigBalance.toLocaleString('en', { maximumFractionDigits: 2 })}</div>
              {usdBalance > 0 && <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.45)', fontWeight: '600' }}>+US${usdBalance.toFixed(2)} cash</div>}
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '1rem', padding: '0.875rem 1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ZiG / USD Rate · 30 days</div>
                <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#f59e0b' }}>1 USD = ZiG {zigRate.toFixed(2)}</div>
              </div>
              <ZigChart rate={zigRate} width={260} height={44} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>30d ago</span>
                <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>Today</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.625rem' }}>
              {[
                { label: 'Deposit', icon: ArrowDownLeft, href: '/wallet?action=deposit'  },
                { label: 'Send',    icon: ArrowUpRight,  href: '/wallet?action=transfer' },
                { label: 'Wallet',  icon: Plus,          href: '/wallet'                 },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <button key={action.label} onClick={() => { window.location.href = action.href; }} style={{
                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '0.875rem', padding: '0.75rem', color: 'white',
                    fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem',
                  }}>
                    <Icon size={18} /> {action.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── ZIG PERFORMANCE PANEL ── */}
        <div style={{ background: 'rgba(255,255,255,0.82)', borderRadius: '1.5rem', padding: '1.25rem', marginBottom: '1rem', border: '1px solid rgba(168,132,90,0.15)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', animation: 'fadeUp 0.4s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ZiG Performance</div>
              <div style={{ fontSize: '0.75rem', color: '#a8a29e', marginTop: '0.1rem' }}>Gold-backed · Inflation protected</div>
            </div>
            <button onClick={() => { window.location.href = '/trust'; }} style={{ background: 'rgba(168,132,90,0.08)', border: '1px solid rgba(168,132,90,0.2)', borderRadius: '2rem', padding: '0.35rem 0.875rem', fontSize: '0.7rem', fontWeight: '700', color: '#a8845a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <BarChart2 size={11} /> Trust Engine
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '1rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #faf5e8, #f5ece0)', borderRadius: '1rem', padding: '0.875rem', border: '1px solid rgba(212,175,55,0.2)' }}>
              <div style={{ fontSize: '0.6rem', color: '#a8845a', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Gold / gram</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#3a2a1c', lineHeight: '1' }}>US${goldPriceUsd.toFixed(2)}</div>
              <div style={{ fontSize: '0.7rem', color: '#a8845a', marginTop: '0.2rem', fontWeight: '600' }}>ZiG {goldPriceZig.toFixed(0)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.375rem' }}>
                <TrendingUp size={11} color="#748c3d" />
                <span style={{ fontSize: '0.65rem', color: '#748c3d', fontWeight: '600' }}>Live price</span>
              </div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #f0f4e8, #e8f0d8)', borderRadius: '1rem', padding: '0.875rem', border: '1px solid rgba(116,140,61,0.2)' }}>
              <div style={{ fontSize: '0.6rem', color: '#748c3d', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>ZiG / USD</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#1a2e0a', lineHeight: '1' }}>{zigRate.toFixed(2)}</div>
              <div style={{ fontSize: '0.7rem', color: '#748c3d', marginTop: '0.2rem', fontWeight: '600' }}>Official RBZ rate</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.375rem' }}>
                <Shield size={11} color="#748c3d" />
                <span style={{ fontSize: '0.65rem', color: '#748c3d', fontWeight: '600' }}>Backed by gold</span>
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(168,132,90,0.05)', borderRadius: '1rem', padding: '1rem', border: '1px solid rgba(168,132,90,0.1)', marginBottom: '0.875rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#57534e', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Purchasing Power — ZiG vs Unprotected Cash
            </div>
            <div style={{ marginBottom: '0.625rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.3rem' }}>
                <span style={{ color: '#748c3d', fontWeight: '700' }}>Your ZiG (gold-backed)</span>
                <span style={{ color: '#748c3d', fontWeight: '800' }}>100%</span>
              </div>
              <div style={{ height: '10px', background: 'rgba(116,140,61,0.12)', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '100%', background: 'linear-gradient(to right, #748c3d, #9ab55a)', borderRadius: '5px' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.3rem' }}>
                <span style={{ color: '#ea580c', fontWeight: '700' }}>Unprotected cash (est.)</span>
                <span style={{ color: '#ea580c', fontWeight: '800' }}>~97%</span>
              </div>
              <div style={{ height: '10px', background: 'rgba(234,88,12,0.1)', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '97%', background: 'linear-gradient(to right, #ea580c, #fb923c)', borderRadius: '5px' }} />
              </div>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#78716c', marginTop: '0.75rem', lineHeight: '1.5' }}>
              Gold-backed ZiG preserves your purchasing power. Unprotected cash loses value each month to inflation.
            </div>
          </div>

          <div style={{ background: 'rgba(58,42,28,0.04)', borderRadius: '1rem', padding: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#57534e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ZiG Rate Trend</span>
              <span style={{ fontSize: '0.7rem', color: '#a8845a', fontWeight: '700' }}>ZiG {zigRate.toFixed(2)} / USD</span>
            </div>
            <div style={{ width: '100%', overflowX: 'hidden' }}>
              <ZigChart rate={zigRate} width={380} height={60} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#a8a29e', marginTop: '0.4rem' }}>
              <span>30 days ago</span>
              <span>Today · {new Date().toLocaleDateString('en-ZW', { day: 'numeric', month: 'short' })}</span>
            </div>
          </div>
        </div>

        {/* ── QUICK LINKS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.625rem', marginBottom: '1rem' }}>
          {quickLinks.map((item) => (
            <button key={item.label} onClick={() => { window.location.href = item.href; }} style={{
              background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(168,132,90,0.15)',
              borderRadius: '1rem', padding: '0.875rem 0.5rem', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem',
            }}>
              {item.icon}
              <span style={{ fontSize: '0.68rem', fontWeight: '600', color: '#57534e' }}>{item.label}</span>
            </button>
          ))}
        </div>

        {/* ── VIMBISO SCORE CARD ── */}
        <div style={{ background: 'rgba(255,255,255,0.82)', borderRadius: '1.5rem', padding: '1.5rem', marginBottom: '1rem', border: '1px solid rgba(168,132,90,0.15)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>Vimbiso Credit Score</div>
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ flexShrink: 0 }}><ScoreArc score={score} /></div>
            <div style={{ flex: 1 }}>
              {maxLoan > 0 && (
                <div style={{ background: 'rgba(116,140,61,0.1)', border: '1px solid rgba(116,140,61,0.2)', borderRadius: '0.875rem', padding: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.62rem', color: '#748c3d', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' }}>Loan eligible</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#1a2e0a' }}>US${maxLoan}</div>
                </div>
              )}
              <div style={{ fontSize: '0.75rem', color: '#57534e', lineHeight: '1.55' }}>
                {score >= 80 ? 'Excellent standing. You qualify for the highest loan tier with the lowest interest rate.'
                  : score >= 60 ? 'Good standing. Keep contributing to your mukando to unlock more.'
                  : score >= 40 ? 'Building your history. Every contribution improves your score.'
                  : 'Just getting started. Join a mukando group to build credit.'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1rem' }}>
            {Object.entries(factors).slice(0, 5).map(([key, value]) => (
              <FactorBar key={key} label={scoreFactorLabels[key] || key} value={value as number} max={scoreFactorMax[key] || 10} />
            ))}
          </div>
          <button onClick={() => { window.location.href = '/score'; }} style={{ width: '100%', padding: '0.75rem', background: 'transparent', border: '1.5px solid rgba(168,132,90,0.3)', borderRadius: '1rem', color: '#a8845a', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            Full score breakdown <ChevronRight size={16} />
          </button>
        </div>

        {/* ── MUKANDO CARD ── */}
        {activeMukando.length > 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.82)', borderRadius: '1.5rem', padding: '1.5rem', marginBottom: '1rem', border: '1px solid rgba(168,132,90,0.15)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>My Mukando</div>
              <span style={{ background: 'rgba(116,140,61,0.1)', color: '#748c3d', fontSize: '0.68rem', fontWeight: '700', padding: '0.2rem 0.7rem', borderRadius: '2rem' }}>{activeMukando.length} Active</span>
            </div>
            {activeMukando.slice(0, 1).map((group) => {
              const totalMonths  = group.total_members || activeMukando.length || 3;
              const currentMonth = group.current_month || 1;
              const progress     = Math.min((currentMonth / totalMonths) * 100, 100);
              return (
                <div key={group.group_id}>
                  <div style={{ fontSize: '1rem', fontWeight: '700', color: '#1c1917', marginBottom: '0.2rem' }}>{group.name}</div>
                  <div style={{ fontSize: '0.78rem', color: '#78716c', marginBottom: '1rem' }}>
                    Month {currentMonth} of {totalMonths} · Payout month: {group.your_payout_month}
                    {group.has_received_payout && <span style={{ marginLeft: '0.5rem', background: 'rgba(116,140,61,0.1)', color: '#748c3d', fontSize: '0.65rem', fontWeight: '700', padding: '0.1rem 0.5rem', borderRadius: '2rem' }}>Received</span>}
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#a8a29e', marginBottom: '0.3rem' }}>
                      <span>Cycle progress</span>
                      <span style={{ fontWeight: '700', color: '#a8845a' }}>{Math.round(progress)}%</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(168,132,90,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(to right, #a8845a, #d4af37)', borderRadius: '4px', transition: 'width 0.6s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
                      {Array.from({ length: Math.min(totalMonths, 12) }, (_, i) => (
                        <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: i < currentMonth ? '#a8845a' : i === currentMonth - 1 ? '#d4af37' : 'rgba(168,132,90,0.2)' }} />
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '1rem' }}>
                    <div style={{ background: 'linear-gradient(135deg, #f5ece0, #f0e4d0)', borderRadius: '1rem', padding: '0.875rem' }}>
                      <div style={{ fontSize: '0.6rem', color: '#a8845a', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>Contributed</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#3a2a1c' }}>{parseFloat(group.total_contributed?.gold_grams || 0).toFixed(4)}g</div>
                      <div style={{ fontSize: '0.68rem', color: '#a8845a', fontWeight: '600', marginTop: '0.1rem' }}>ZiG {parseFloat(group.total_contributed?.zig || 0).toLocaleString('en', { maximumFractionDigits: 0 })}</div>
                    </div>
                    <div style={{ background: 'rgba(116,140,61,0.08)', borderRadius: '1rem', padding: '0.875rem', border: '1px solid rgba(116,140,61,0.15)' }}>
                      <div style={{ fontSize: '0.6rem', color: '#748c3d', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>Score impact</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#1a2e0a' }}>+{Math.min(currentMonth * 3, 30)}pts</div>
                      <div style={{ fontSize: '0.68rem', color: '#748c3d', fontWeight: '600', marginTop: '0.1rem' }}>From mukando history</div>
                    </div>
                  </div>
                </div>
              );
            })}
            <button onClick={() => { window.location.href = '/mukando'; }} style={{ width: '100%', padding: '0.75rem', background: 'transparent', border: '1.5px solid rgba(168,132,90,0.3)', borderRadius: '1rem', color: '#a8845a', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              View all groups <ChevronRight size={16} />
            </button>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.82)', borderRadius: '1.5rem', padding: '1.5rem', marginBottom: '1rem', border: '1.5px dashed rgba(168,132,90,0.3)', textAlign: 'center' }}>
            <Users size={32} color="#d4c0a3" style={{ margin: '0 auto 0.75rem' }} />
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#57534e', marginBottom: '0.5rem' }}>No mukando groups yet</div>
            <div style={{ fontSize: '0.8rem', color: '#78716c', marginBottom: '1.25rem' }}>Join or create a group to start building your Vimbiso Score</div>
            <button onClick={() => { window.location.href = '/mukando'; }} style={{ background: 'linear-gradient(135deg, #a8845a, #967554)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '1rem', border: 'none', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}>
              Start a Mukando Group
            </button>
          </div>
        )}

        {/* ── GROW TEASER ── */}
        <button onClick={() => { window.location.href = '/grow'; }} style={{ width: '100%', background: 'linear-gradient(135deg, #1a2e0a, #2d5016)', borderRadius: '1.5rem', padding: '1.25rem 1.5rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 8px 24px rgba(45,80,22,0.25)' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '1rem', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingUp size={22} color="white" />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'white', marginBottom: '0.15rem' }}>Invest in GROW pools</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)' }}>Fund verified farmers · Earn 15–25% returns</div>
          </div>
          <ChevronRight size={18} color="rgba(255,255,255,0.5)" />
        </button>
      </div>

      <BottomNav />
    </div>
  );
}