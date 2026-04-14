'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Loader, AlertCircle, CheckCircle, ChevronRight,
  Coins, Calendar, TrendingUp, Shield, Star, ArrowDownLeft,
  User, Plus, Phone, CreditCard, Lock, Copy, MapPin, Clock,
  X, Check,
} from 'lucide-react';
import BatanaLogo from '../components/BatanaLogo';
import {
  getLoanEligibility, applyForLoan, getMyLoans, repayLoan,
  getMyKin, addKin,
} from '../lib/api';

// ── Types ──────────────────────────────────────────────────
type View = 'home' | 'apply_kin' | 'apply_amount' | 'apply_pin'
          | 'apply_code' | 'repay';

interface Kin {
  id: string;
  full_name: string;
  relationship: string;
  phone_number: string;
  national_id: string;
  is_primary: boolean;
}

interface Eligibility {
  eligible: boolean;
  score: number;
  score_label: string;
  max_loan_usd: number;
  max_loan_zig: number;
  interest_rate: number;
  interest_rate_pct: string;
  term_days: number;
  requires_store: boolean;
  rate_used: number;
  reason?: string;
  example?: {
    borrow_zig: number; borrow_usd: number;
    repay_zig: number;  repay_usd: number;
    interest_zig: number; interest_usd: number;
  };
  active_loan?: any;
}

function getToken(): string | null {
  if (typeof window !== 'undefined') return localStorage.getItem('batana_token');
  return null;
}

const PURPOSES = [
  'school_fees', 'medical', 'stock', 'equipment',
  'rent', 'food', 'general',
];

const RELATIONSHIPS = [
  'spouse', 'parent', 'child', 'sibling',
  'aunt/uncle', 'cousin', 'friend', 'other',
];

// ── Status colours ─────────────────────────────────────────
function statusColor(status: string) {
  switch (status) {
    case 'pending_store': return '#d97706';
    case 'pending_admin': return '#7c3aed';
    case 'disbursed':
    case 'active':        return '#748c3d';
    case 'completed':     return '#16a34a';
    case 'rejected':      return '#dc2626';
    default:              return '#78716c';
  }
}

function statusLabel(status: string, isOverdue = false) {
  if (isOverdue) return 'Overdue';
  switch (status) {
    case 'pending_store': return 'Awaiting Store Visit';
    case 'pending_admin': return 'Under Review';
    case 'disbursed':
    case 'active':        return 'Active';
    case 'completed':     return 'Repaid';
    case 'rejected':      return 'Rejected';
    default:              return status;
  }
}

// ══════════════════════════════════════════════════════════
export default function LoansPage() {
  const [view, setView]               = useState<View>('home');
  const [loading, setLoading]         = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [success, setSuccess]         = useState<string | null>(null);

  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [loans, setLoans]             = useState<any[]>([]);
  const [activeLoan, setActiveLoan]   = useState<any>(null);
  const [kin, setKin]                 = useState<Kin[]>([]);

  // Apply flow state
  const [selectedKinId, setSelectedKinId]   = useState<string | null>(null);
  const [showAddKin, setShowAddKin]         = useState(false);
  const [applyAmountUsd, setApplyAmountUsd] = useState('');
  const [purpose, setPurpose]               = useState('general');
  const [pin, setPin]                       = useState('');
  const [pinVisible, setPinVisible]         = useState(false);
  const [loanResult, setLoanResult]         = useState<any>(null);
  const [codeCopied, setCodeCopied]         = useState(false);

  // Add kin form
  const [kinForm, setKinForm] = useState({
    full_name: '', relationship: 'spouse',
    phone_number: '', national_id: '',
  });

  // Repay state
  const [repayAmount, setRepayAmount]   = useState('');
  const [repayingLoan, setRepayingLoan] = useState<any>(null);

  // ── Load data ────────────────────────────────────────────
  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) { window.location.href = '/login'; return; }
    try {
      setLoading(true);
      setError(null);
      const [eligData, loansData, kinData] = await Promise.all([
        getLoanEligibility(token),
        getMyLoans(token),
        getMyKin(token),
      ]);
      setEligibility(eligData);
      setLoans(loansData.loans || []);
      setActiveLoan(loansData.active_loan || null);
      setKin(kinData.kin || []);
      // Auto-select primary kin
      const primary = (kinData.kin || []).find((k: Kin) => k.is_primary);
      if (primary) setSelectedKinId(primary.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Add kin ──────────────────────────────────────────────
  async function handleAddKin() {
    const token = getToken();
    if (!token) return;
    if (!kinForm.full_name || !kinForm.phone_number || !kinForm.national_id) {
      setError('All fields are required to add next of kin');
      return;
    }
    try {
      setActionLoading(true);
      setError(null);
      const data = await addKin(token, {
        ...kinForm,
        is_primary: kin.length === 0,
      });
      setKin((prev) => [...prev, data.kin]);
      setSelectedKinId(data.kin.id);
      setShowAddKin(false);
      setKinForm({ full_name: '', relationship: 'spouse', phone_number: '', national_id: '' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add next of kin');
    } finally {
      setActionLoading(false);
    }
  }

  // ── Submit loan ──────────────────────────────────────────
  async function handleApply() {
    const token = getToken();
    if (!token) return;
    if (!pin || pin.length < 4) {
      setError('Enter your 4-digit PIN to confirm');
      return;
    }
    try {
      setActionLoading(true);
      setError(null);
      const data = await applyForLoan(token, {
        amount_usd: parseFloat(applyAmountUsd),
        purpose,
        pin,
        next_of_kin_id: selectedKinId || undefined,
      });
      setLoanResult(data);
      setView('apply_code');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Application failed');
    } finally {
      setActionLoading(false);
    }
  }

  // ── Copy code ────────────────────────────────────────────
  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  }

  // ── Repay ────────────────────────────────────────────────
  async function handleRepay() {
    const token = getToken();
    if (!token || !repayingLoan) return;
    const amt = parseFloat(repayAmount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    try {
      setActionLoading(true);
      setError(null);
      const data = await repayLoan(token, repayingLoan.id, amt);
      setSuccess(data.message);
      await loadData();
      setTimeout(() => {
        setSuccess(null);
        setView('home');
        setRepayAmount('');
        setRepayingLoan(null);
      }, 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Repayment failed');
    } finally {
      setActionLoading(false);
    }
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
        <Loader size={24} color="#a8845a" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // VIEW: STEP 1 — KIN SELECTION
  // ════════════════════════════════════════════════════════
  if (view === 'apply_kin') {
    return (
      <PageShell
        title="Next of Kin"
        subtitle="Step 1 of 3 — Who should we contact?"
        onBack={() => { setView('home'); setError(null); }}
        step={1}
      >
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        {error && <ErrorBox message={error} />}

        <p style={{ fontSize: '0.825rem', color: '#78716c', margin: 0, lineHeight: '1.6' }}>
          Your next of kin is recorded as part of your loan application.
          They are not responsible for repayment — this is for emergency contact only.
        </p>

        {/* Existing kin list */}
        {kin.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {kin.map((k) => (
              <button
                key={k.id}
                onClick={() => setSelectedKinId(k.id)}
                style={{
                  width: '100%',
                  background: selectedKinId === k.id
                    ? 'rgba(168,132,90,0.1)'
                    : 'rgba(255,255,255,0.85)',
                  border: selectedKinId === k.id
                    ? '2px solid #a8845a'
                    : '1.5px solid rgba(168,132,90,0.2)',
                  borderRadius: '1.125rem',
                  padding: '1rem 1.125rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.875rem',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: selectedKinId === k.id
                    ? 'rgba(168,132,90,0.2)'
                    : 'rgba(168,132,90,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <User size={18} color="#a8845a" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '0.9rem', fontWeight: '700', color: '#1c1917',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                  }}>
                    {k.full_name}
                    {k.is_primary && (
                      <span style={{
                        fontSize: '0.6rem', fontWeight: '700',
                        background: 'rgba(168,132,90,0.15)',
                        color: '#a8845a', padding: '0.1rem 0.4rem',
                        borderRadius: '1rem', textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>Primary</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#78716c', textTransform: 'capitalize' }}>
                    {k.relationship} · {k.phone_number}
                  </div>
                </div>
                {selectedKinId === k.id && (
                  <Check size={18} color="#a8845a" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Add new kin toggle */}
        {!showAddKin ? (
          <button
            onClick={() => setShowAddKin(true)}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.7)',
              border: '1.5px dashed rgba(168,132,90,0.35)',
              borderRadius: '1.125rem',
              padding: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              color: '#a8845a',
              fontSize: '0.875rem',
              fontWeight: '600',
            }}
          >
            <Plus size={16} />
            Add next of kin
          </button>
        ) : (
          /* Add kin form */
          <div style={{
            background: 'rgba(255,255,255,0.9)',
            borderRadius: '1.25rem',
            padding: '1.25rem',
            border: '1px solid rgba(168,132,90,0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.875rem',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#1c1917' }}>
                New next of kin
              </span>
              <button
                onClick={() => { setShowAddKin(false); setError(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#78716c' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Full name */}
            <div>
              <label style={labelStyle}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={15} color="#a8845a" style={{
                  position: 'absolute', left: '1rem', top: '50%',
                  transform: 'translateY(-50%)', pointerEvents: 'none',
                }} />
                <input
                  type="text"
                  value={kinForm.full_name}
                  onChange={(e) => setKinForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="e.g. Rudo Moyo"
                  style={{ ...inputStyle, paddingLeft: '2.5rem' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#a8845a'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(168,132,90,0.25)'; }}
                />
              </div>
            </div>

            {/* Relationship */}
            <div>
              <label style={labelStyle}>Relationship</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {RELATIONSHIPS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setKinForm((f) => ({ ...f, relationship: r }))}
                    style={{
                      padding: '0.375rem 0.75rem',
                      borderRadius: '2rem',
                      border: kinForm.relationship === r
                        ? '2px solid #a8845a'
                        : '1.5px solid rgba(168,132,90,0.2)',
                      background: kinForm.relationship === r
                        ? 'rgba(168,132,90,0.1)'
                        : 'rgba(255,255,255,0.7)',
                      color: kinForm.relationship === r ? '#a8845a' : '#78716c',
                      fontSize: '0.75rem',
                      fontWeight: kinForm.relationship === r ? '700' : '500',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Phone */}
            <div>
              <label style={labelStyle}>Phone Number</label>
              <div style={{ position: 'relative' }}>
                <Phone size={15} color="#a8845a" style={{
                  position: 'absolute', left: '1rem', top: '50%',
                  transform: 'translateY(-50%)', pointerEvents: 'none',
                }} />
                <input
                  type="tel"
                  value={kinForm.phone_number}
                  onChange={(e) => setKinForm((f) => ({ ...f, phone_number: e.target.value }))}
                  placeholder="07XXXXXXXX"
                  style={{ ...inputStyle, paddingLeft: '2.5rem' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#a8845a'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(168,132,90,0.25)'; }}
                />
              </div>
            </div>

            {/* National ID */}
            <div>
              <label style={labelStyle}>National ID Number</label>
              <div style={{ position: 'relative' }}>
                <CreditCard size={15} color="#a8845a" style={{
                  position: 'absolute', left: '1rem', top: '50%',
                  transform: 'translateY(-50%)', pointerEvents: 'none',
                }} />
                <input
                  type="text"
                  value={kinForm.national_id}
                  onChange={(e) => setKinForm((f) => ({ ...f, national_id: e.target.value }))}
                  placeholder="e.g. 63-123456A78"
                  style={{ ...inputStyle, paddingLeft: '2.5rem' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#a8845a'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(168,132,90,0.25)'; }}
                />
              </div>
            </div>

            <SubmitButton
              label="Save Next of Kin"
              loading={actionLoading}
              onClick={handleAddKin}
              icon={<Check size={16} />}
              disabled={!kinForm.full_name || !kinForm.phone_number || !kinForm.national_id}
            />
          </div>
        )}

        {/* Skip / continue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <SubmitButton
            label="Continue"
            loading={false}
            onClick={() => { setError(null); setView('apply_amount'); }}
            icon={<ChevronRight size={18} />}
            disabled={false}
          />
          {!selectedKinId && (
            <button
              onClick={() => { setError(null); setView('apply_amount'); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#78716c', fontSize: '0.8rem', textDecoration: 'underline',
                padding: '0.25rem',
              }}
            >
              Skip — I'll add next of kin later
            </button>
          )}
        </div>
      </PageShell>
    );
  }

  // ════════════════════════════════════════════════════════
  // VIEW: STEP 2 — AMOUNT + PURPOSE
  // ════════════════════════════════════════════════════════
  if (view === 'apply_amount') {
    const amtUsd    = parseFloat(applyAmountUsd) || 0;
    const rate      = eligibility?.rate_used || 25.37;
    const amtZig    = Math.round(amtUsd * rate * 100) / 100;
    const intRate   = eligibility?.interest_rate || 0;
    const repayUsd  = Math.round(amtUsd * (1 + intRate) * 100) / 100;
    const repayZig  = Math.round(repayUsd * rate * 100) / 100;
    const intZig    = Math.round(amtUsd * intRate * rate * 100) / 100;

    return (
      <PageShell
        title="Loan Amount"
        subtitle="Step 2 of 3 — How much do you need?"
        onBack={() => { setView('apply_kin'); setError(null); }}
        step={2}
      >
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        {error && <ErrorBox message={error} />}

        {/* Score badge */}
        <div style={{
          background: 'linear-gradient(135deg, #3a2a1c, #6f5336)',
          borderRadius: '1.25rem', padding: '1rem 1.25rem',
          display: 'flex', alignItems: 'center', gap: '1rem',
        }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '50%',
            background: 'rgba(245,158,11,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Star size={20} color="#f59e0b" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.15rem' }}>
              Vimbiso Score · {eligibility?.score_label}
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: '900', color: 'white' }}>
              {eligibility?.score} points
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.15rem' }}>
              Max
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#f59e0b' }}>
              ZiG {eligibility?.max_loan_zig?.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>
              US${eligibility?.max_loan_usd}
            </div>
          </div>
        </div>

        {/* Amount input */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <label style={labelStyle}>Amount (USD)</label>
            {amtUsd > 0 && (
              <span style={{ fontSize: '0.75rem', color: '#a8845a', fontWeight: '600' }}>
                ≈ ZiG {amtZig.toLocaleString()}
              </span>
            )}
          </div>
          <input
            type="number"
            value={applyAmountUsd}
            onChange={(e) => { setApplyAmountUsd(e.target.value); setError(null); }}
            placeholder="0"
            min="1"
            max={eligibility?.max_loan_usd || 500}
            style={{ ...inputStyle, fontSize: '1.75rem', fontWeight: '900', textAlign: 'center' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#a8845a'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(168,132,90,0.25)'; }}
          />
          {/* Quick picks */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            {[10, 20, 50, eligibility?.max_loan_usd]
              .filter((v): v is number => !!v && v <= (eligibility?.max_loan_usd || 500))
              .filter((v, i, arr) => arr.indexOf(v) === i)
              .map((amt) => (
                <button
                  key={amt}
                  onClick={() => setApplyAmountUsd(String(amt))}
                  style={{
                    padding: '0.375rem 0.875rem', borderRadius: '2rem',
                    border: parseFloat(applyAmountUsd) === amt
                      ? '2px solid #a8845a'
                      : '1.5px solid rgba(168,132,90,0.25)',
                    background: parseFloat(applyAmountUsd) === amt
                      ? 'rgba(168,132,90,0.1)'
                      : 'rgba(255,255,255,0.7)',
                    color: parseFloat(applyAmountUsd) === amt ? '#a8845a' : '#78716c',
                    fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer',
                  }}
                >
                  US${amt}
                </button>
              ))}
          </div>
        </div>

        {/* Purpose */}
        <div>
          <label style={labelStyle}>Purpose</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {PURPOSES.map((p) => (
              <button
                key={p}
                onClick={() => setPurpose(p)}
                style={{
                  padding: '0.5rem 0.875rem', borderRadius: '2rem',
                  border: purpose === p
                    ? '2px solid #a8845a'
                    : '1.5px solid rgba(168,132,90,0.25)',
                  background: purpose === p
                    ? 'rgba(168,132,90,0.1)'
                    : 'rgba(255,255,255,0.7)',
                  color: purpose === p ? '#a8845a' : '#78716c',
                  fontSize: '0.8rem',
                  fontWeight: purpose === p ? '700' : '500',
                  cursor: 'pointer', textTransform: 'capitalize',
                }}
              >
                {p.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Repayment preview */}
        {amtUsd > 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.85)',
            borderRadius: '1.25rem', padding: '1.25rem',
            border: '1px solid rgba(168,132,90,0.15)',
          }}>
            <div style={{
              fontSize: '0.7rem', fontWeight: '700', color: '#78716c',
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.875rem',
            }}>
              Repayment Summary
            </div>
            {[
              { label: 'You receive', zig: amtZig, usd: amtUsd },
              { label: `Interest (${eligibility?.interest_rate_pct})`, zig: intZig, usd: Math.round(amtUsd * intRate * 100) / 100 },
              { label: 'Total to repay', zig: repayZig, usd: repayUsd },
            ].map((row, i, arr) => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.5rem 0',
                borderBottom: i < arr.length - 1 ? '1px solid rgba(168,132,90,0.1)' : 'none',
                borderTop: i === arr.length - 1 ? '2px solid rgba(168,132,90,0.15)' : 'none',
                marginTop: i === arr.length - 1 ? '0.25rem' : 0,
              }}>
                <span style={{ fontSize: '0.825rem', color: '#57534e' }}>{row.label}</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: i === arr.length - 1 ? '900' : '700',
                    color: '#1c1917',
                  }}>
                    ZiG {row.zig.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#a8a29e' }}>US${row.usd}</div>
                </div>
              </div>
            ))}
            <div style={{
              marginTop: '0.75rem', display: 'flex',
              alignItems: 'center', gap: '0.5rem', color: '#78716c', fontSize: '0.75rem',
            }}>
              <Calendar size={13} />
              Repay within {eligibility?.term_days} days · Due{' '}
              {new Date(Date.now() + (eligibility?.term_days || 30) * 86400000)
                .toLocaleDateString('en-GB')}
            </div>
          </div>
        )}

        {/* Store visit notice */}
        {eligibility?.requires_store && amtUsd > 0 && (
          <div style={{
            background: 'rgba(124,58,237,0.06)',
            border: '1px solid rgba(124,58,237,0.18)',
            borderRadius: '1rem', padding: '1rem 1.25rem',
            display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
          }}>
            <MapPin size={16} color="#7c3aed" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{ fontSize: '0.8rem', color: '#57534e', lineHeight: '1.6', margin: 0 }}>
              Your loan requires a <strong>store visit</strong> to verify your identity.
              You'll receive a code to show at any BATANA agent or ZB Bank branch.
            </p>
          </div>
        )}

        {/* Insurance note */}
        <div style={{
          background: 'rgba(116,140,61,0.06)',
          border: '1px solid rgba(116,140,61,0.15)',
          borderRadius: '1rem', padding: '1rem 1.25rem',
          display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
        }}>
          <Shield size={16} color="#748c3d" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '0.8rem', color: '#57534e', lineHeight: '1.6', margin: 0 }}>
            Active insurance is automatically linked to protect this loan in a crisis.
          </p>
        </div>

        <SubmitButton
          label="Continue to Confirm"
          loading={false}
          onClick={() => {
            if (!applyAmountUsd || parseFloat(applyAmountUsd) <= 0) {
              setError('Enter a loan amount to continue');
              return;
            }
            if (eligibility?.max_loan_usd && parseFloat(applyAmountUsd) > eligibility.max_loan_usd) {
              setError(`Maximum loan is US$${eligibility.max_loan_usd}`);
              return;
            }
            setError(null);
            setView('apply_pin');
          }}
          icon={<ChevronRight size={18} />}
          disabled={!applyAmountUsd || parseFloat(applyAmountUsd) <= 0}
        />
      </PageShell>
    );
  }

  // ════════════════════════════════════════════════════════
  // VIEW: STEP 3 — PIN CONFIRMATION
  // ════════════════════════════════════════════════════════
  if (view === 'apply_pin') {
    const amtUsd   = parseFloat(applyAmountUsd) || 0;
    const rate     = eligibility?.rate_used || 25.37;
    const amtZig   = Math.round(amtUsd * rate * 100) / 100;
    const intRate  = eligibility?.interest_rate || 0;
    const repayUsd = Math.round(amtUsd * (1 + intRate) * 100) / 100;
    const repayZig = Math.round(repayUsd * rate * 100) / 100;

    return (
      <PageShell
        title="Confirm with PIN"
        subtitle="Step 3 of 3 — Authorise your application"
        onBack={() => { setView('apply_amount'); setError(null); setPin(''); }}
        step={3}
      >
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        {error && <ErrorBox message={error} />}

        {/* Summary card */}
        <div style={{
          background: 'linear-gradient(135deg, #3a2a1c, #6f5336)',
          borderRadius: '1.25rem', padding: '1.25rem',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '-20px', right: '-20px',
            width: '100px', height: '100px',
            background: 'radial-gradient(circle, rgba(168,132,90,0.3), transparent)',
            borderRadius: '50%',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>
              You are applying for
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', lineHeight: '1' }}>
              ZiG {amtZig.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '0.25rem' }}>
              US${amtUsd} · Repay ZiG {repayZig.toLocaleString()} in {eligibility?.term_days} days
            </div>
            <div style={{
              marginTop: '0.875rem', fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.55)',
              textTransform: 'capitalize',
            }}>
              Purpose: {purpose.replace('_', ' ')}
              {selectedKinId && kin.find((k) => k.id === selectedKinId) && (
                <> · Kin: {kin.find((k) => k.id === selectedKinId)?.full_name}</>
              )}
            </div>
          </div>
        </div>

        {/* PIN input */}
        <div>
          <label style={labelStyle}>Enter your BATANA PIN</label>
          <div style={{ position: 'relative' }}>
            <Lock size={15} color="#a8845a" style={{
              position: 'absolute', left: '1rem', top: '50%',
              transform: 'translateY(-50%)', pointerEvents: 'none',
            }} />
            <input
              type={pinVisible ? 'text' : 'password'}
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setPin(val);
                setError(null);
              }}
              placeholder="••••"
              inputMode="numeric"
              maxLength={6}
              style={{
                ...inputStyle,
                paddingLeft: '2.5rem',
                paddingRight: '3rem',
                fontSize: '1.5rem',
                letterSpacing: '0.3em',
                textAlign: 'center',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#a8845a'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(168,132,90,0.25)'; }}
              onKeyDown={(e) => { if (e.key === 'Enter' && pin.length >= 4) handleApply(); }}
            />
            <button
              onClick={() => setPinVisible((v) => !v)}
              style={{
                position: 'absolute', right: '1rem', top: '50%',
                transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#78716c', fontSize: '0.75rem', fontWeight: '600',
              }}
            >
              {pinVisible ? 'Hide' : 'Show'}
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#78716c', marginTop: '0.5rem', marginBottom: 0 }}>
            This authorises your loan application. Your PIN is never stored in plain text.
          </p>
        </div>

        <SubmitButton
          label={eligibility?.requires_store ? 'Submit Application' : 'Get Loan Now'}
          loading={actionLoading}
          onClick={handleApply}
          icon={<ArrowDownLeft size={18} />}
          disabled={pin.length < 4}
        />
      </PageShell>
    );
  }

  // ════════════════════════════════════════════════════════
  // VIEW: RESULT — CODE DISPLAY or INSTANT CONFIRM
  // ════════════════════════════════════════════════════════
  if (view === 'apply_code' && loanResult) {
    const isInstant = loanResult.flow === 'instant';
    const code      = loanResult.verification_code;

    return (
      <PageShell
        title={isInstant ? 'Loan Approved!' : 'Application Submitted'}
        subtitle={isInstant ? 'Funds are in your wallet' : 'Visit a store to verify'}
        onBack={() => {
          setView('home');
          setError(null);
          setPin('');
          setApplyAmountUsd('');
          setPurpose('general');
          loadData();
        }}
        step={undefined}
      >
        {isInstant ? (
          /* ── INSTANT DISBURSEMENT ── */
          <>
            <div style={{
              background: 'linear-gradient(135deg, #2d5016, #4a7c28)',
              borderRadius: '1.5rem', padding: '2rem 1.5rem',
              textAlign: 'center', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: '-30px', right: '-30px',
                width: '120px', height: '120px',
                background: 'radial-gradient(circle, rgba(116,140,61,0.4), transparent)',
                borderRadius: '50%',
              }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}>
                  <CheckCircle size={32} color="white" />
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem' }}>
                  Disbursed to your wallet
                </div>
                <div style={{ fontSize: '2.25rem', fontWeight: '900', color: 'white', lineHeight: '1' }}>
                  ZiG {loanResult.loan?.amount_zig?.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem' }}>
                  US${loanResult.loan?.amount_usd}
                </div>
                <div style={{
                  marginTop: '1rem', fontSize: '0.8rem',
                  color: 'rgba(255,255,255,0.55)',
                }}>
                  Repay ZiG {loanResult.loan?.total_repayment_zig?.toLocaleString()} by{' '}
                  {loanResult.loan?.due_date
                    ? new Date(loanResult.loan.due_date).toLocaleDateString('en-GB')
                    : '—'}
                </div>
              </div>
            </div>

            <div style={{
              background: 'rgba(116,140,61,0.06)',
              border: '1px solid rgba(116,140,61,0.15)',
              borderRadius: '1rem', padding: '1rem 1.25rem',
            }}>
              <p style={{ fontSize: '0.8rem', color: '#57534e', lineHeight: '1.7', margin: 0 }}>
                {loanResult.note}
              </p>
            </div>

            <SubmitButton
              label="View My Wallet"
              loading={false}
              onClick={() => { window.location.href = '/dashboard'; }}
              icon={<Coins size={18} />}
              disabled={false}
            />
          </>
        ) : (
          /* ── STORE VERIFICATION REQUIRED ── */
          <>
            {/* Code card */}
            <div style={{
              background: 'linear-gradient(135deg, #3a2a1c, #6f5336)',
              borderRadius: '1.5rem', padding: '2rem 1.5rem',
              textAlign: 'center', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: '-20px', right: '-20px',
                width: '100px', height: '100px',
                background: 'radial-gradient(circle, rgba(168,132,90,0.3), transparent)',
                borderRadius: '50%',
              }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
                  Your verification code
                </div>
                {/* The code — big and clear */}
                <div style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '1rem', padding: '1rem 1.5rem',
                  marginBottom: '1rem', display: 'inline-block',
                }}>
                  <div style={{
                    fontSize: '2rem', fontWeight: '900',
                    color: '#f59e0b', letterSpacing: '0.15em',
                    fontFamily: 'monospace',
                  }}>
                    {code}
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
                  Valid until{' '}
                  {loanResult.code_expires
                    ? new Date(loanResult.code_expires).toLocaleDateString('en-GB')
                    : '7 days'}
                </div>
                {/* Copy button */}
                <button
                  onClick={() => copyCode(code)}
                  style={{
                    marginTop: '1rem',
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '2rem', padding: '0.5rem 1.25rem',
                    color: 'white', fontSize: '0.8rem', fontWeight: '600',
                    cursor: 'pointer', display: 'inline-flex',
                    alignItems: 'center', gap: '0.5rem',
                  }}
                >
                  {codeCopied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Code</>}
                </button>
              </div>
            </div>

            {/* Loan summary */}
            <div style={{
              background: 'rgba(255,255,255,0.85)',
              borderRadius: '1.25rem', padding: '1.125rem 1.25rem',
              border: '1px solid rgba(168,132,90,0.15)',
            }}>
              <div style={{
                fontSize: '0.7rem', fontWeight: '700', color: '#78716c',
                textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem',
              }}>
                Loan Summary
              </div>
              {[
                { label: 'Amount', value: `ZiG ${loanResult.loan?.amount_zig?.toLocaleString()} · US$${loanResult.loan?.amount_usd}` },
                { label: 'Total repayment', value: `ZiG ${loanResult.loan?.total_repayment_zig?.toLocaleString()}` },
                { label: 'Interest', value: loanResult.loan?.interest_rate_pct },
                { label: 'Term', value: `${loanResult.loan?.term_days} days` },
              ].map((row) => (
                <div key={row.label} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '0.4rem 0',
                  borderBottom: '1px solid rgba(168,132,90,0.08)',
                }}>
                  <span style={{ fontSize: '0.8rem', color: '#78716c' }}>{row.label}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1c1917' }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Next steps */}
            <div style={{
              background: 'rgba(124,58,237,0.05)',
              border: '1px solid rgba(124,58,237,0.15)',
              borderRadius: '1.25rem', padding: '1.25rem',
            }}>
              <div style={{
                fontSize: '0.75rem', fontWeight: '700', color: '#7c3aed',
                textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.875rem',
              }}>
                What happens next
              </div>
              {(loanResult.next_steps || []).map((step: string, i: number) => (
                <div key={i} style={{
                  display: 'flex', gap: '0.75rem',
                  alignItems: 'flex-start', padding: '0.375rem 0',
                }}>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: 'rgba(124,58,237,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: '1px',
                  }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#7c3aed' }}>
                      {i + 1}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#57534e', lineHeight: '1.5' }}>
                    {step}
                  </span>
                </div>
              ))}
            </div>

            <SubmitButton
              label="Done"
              loading={false}
              onClick={() => {
                setView('home');
                setPin('');
                setApplyAmountUsd('');
                setPurpose('general');
                loadData();
              }}
              icon={<Check size={18} />}
              disabled={false}
            />
          </>
        )}
      </PageShell>
    );
  }

  // ════════════════════════════════════════════════════════
  // VIEW: REPAY
  // ════════════════════════════════════════════════════════
  if (view === 'repay' && repayingLoan) {
    const remainingZig = repayingLoan.remaining_zig || 0;
    const repayAmt     = parseFloat(repayAmount) || 0;

    return (
      <PageShell
        title="Repay Loan"
        subtitle={`ZiG ${remainingZig.toLocaleString()} remaining`}
        onBack={() => {
          setView('home'); setError(null);
          setRepayAmount(''); setRepayingLoan(null);
        }}
        step={undefined}
      >
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        {success && <SuccessBox message={success} />}
        {error && <ErrorBox message={error} />}

        {/* Balance card */}
        <div style={{
          background: repayingLoan.is_overdue
            ? 'linear-gradient(135deg, #7f1d1d, #991b1b)'
            : 'linear-gradient(135deg, #3a2a1c, #6f5336)',
          borderRadius: '1.25rem', padding: '1.5rem',
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 12px 32px rgba(58,42,28,0.25)',
        }}>
          <div style={{
            position: 'absolute', top: '-30px', right: '-30px',
            width: '140px', height: '140px',
            background: 'radial-gradient(circle, rgba(168,132,90,0.25), transparent)',
            borderRadius: '50%',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>
              Remaining balance
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', lineHeight: '1' }}>
              ZiG {remainingZig.toLocaleString('en', { maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '0.25rem' }}>
              US${repayingLoan.remaining_usd?.toFixed(2)}
              {' · '}Due {new Date(repayingLoan.due_date).toLocaleDateString('en-GB')}
            </div>
            {/* Progress */}
            <div style={{ marginTop: '1rem' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.375rem',
              }}>
                <span>{repayingLoan.progress_pct}% repaid</span>
              </div>
              <div style={{
                height: '6px', background: 'rgba(255,255,255,0.15)',
                borderRadius: '3px', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: `${repayingLoan.progress_pct}%`,
                  background: 'linear-gradient(to right, #f59e0b, #fbbf24)',
                  borderRadius: '3px',
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* Amount input */}
        <div>
          <label style={labelStyle}>Repayment Amount (ZiG)</label>
          <input
            type="number"
            value={repayAmount}
            onChange={(e) => { setRepayAmount(e.target.value); setError(null); }}
            placeholder="0.00"
            min="1" step="0.01"
            style={{ ...inputStyle, fontSize: '1.5rem', fontWeight: '800', textAlign: 'center' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#a8845a'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(168,132,90,0.25)'; }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                onClick={() =>
                  setRepayAmount(
                    (Math.round(remainingZig * pct / 100 * 100) / 100).toString()
                  )
                }
                style={{
                  padding: '0.375rem 0.75rem', borderRadius: '2rem',
                  border: '1.5px solid rgba(168,132,90,0.25)',
                  background: 'rgba(255,255,255,0.7)',
                  color: '#78716c', fontSize: '0.75rem',
                  fontWeight: '600', cursor: 'pointer',
                }}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Impact */}
        {repayAmt > 0 && (
          <div style={{
            background: 'rgba(116,140,61,0.06)',
            border: '1px solid rgba(116,140,61,0.15)',
            borderRadius: '1rem', padding: '1rem 1.25rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#57534e' }}>After this payment</span>
              <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#748c3d' }}>
                ZiG {Math.max(0, remainingZig - repayAmt).toLocaleString('en', { maximumFractionDigits: 0 })} left
              </span>
            </div>
            {repayAmt >= remainingZig && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                <CheckCircle size={14} color="#748c3d" />
                <span style={{ fontSize: '0.8rem', color: '#748c3d', fontWeight: '600' }}>
                  This will fully repay your loan
                </span>
              </div>
            )}
          </div>
        )}

        <SubmitButton
          label="Make Repayment"
          loading={actionLoading}
          onClick={handleRepay}
          icon={<Coins size={18} />}
          disabled={!repayAmount || parseFloat(repayAmount) <= 0}
        />
      </PageShell>
    );
  }

  // ════════════════════════════════════════════════════════
  // VIEW: HOME
  // ════════════════════════════════════════════════════════
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
      maxWidth: '480px', margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

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
          <div style={{ fontSize: '1rem', fontWeight: '800', color: '#1c1917' }}>Loans</div>
          <div style={{ fontSize: '0.75rem', color: '#78716c' }}>Powered by your Vimbiso Score</div>
        </div>
        <BatanaLogo size={32} />
      </header>

      <div style={{ padding: '1.5rem', paddingBottom: '6rem' }}>

        {error   && <div style={{ marginBottom: '1rem' }}><ErrorBox message={error} /></div>}
        {success && <div style={{ marginBottom: '1rem' }}><SuccessBox message={success} /></div>}

        {/* ── ACTIVE LOAN CARD ── */}
        {activeLoan && (
          <div style={{ marginBottom: '1.5rem' }}>
            <SectionLabel text="Active Loan" />

            {/* Pending store — show code prominently */}
            {activeLoan.status === 'pending_store' && (
              <div style={{
                background: 'linear-gradient(135deg, #451a03, #92400e)',
                borderRadius: '1.5rem', padding: '1.5rem',
                boxShadow: '0 12px 32px rgba(146,64,14,0.25)',
                marginBottom: '0.75rem',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem',
                }}>
                  <Clock size={16} color="#fbbf24" />
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#fbbf24' }}>
                    Awaiting Store Visit
                  </span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.375rem' }}>
                  Show this code at any BATANA agent
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '0.875rem', padding: '0.75rem 1rem',
                  fontFamily: 'monospace', fontSize: '1.75rem',
                  fontWeight: '900', color: '#fbbf24', letterSpacing: '0.15em',
                  marginBottom: '0.875rem',
                }}>
                  {activeLoan.verification_code || 'BAT-??????'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
                  ZiG {activeLoan.amount_zig?.toLocaleString()} ·{' '}
                  {activeLoan.purpose?.replace('_', ' ')}
                </div>
                <button
                  onClick={() => copyCode(activeLoan.verification_code)}
                  style={{
                    marginTop: '0.875rem',
                    background: 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '2rem', padding: '0.5rem 1rem',
                    color: 'white', fontSize: '0.75rem', fontWeight: '600',
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  }}
                >
                  {codeCopied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy Code</>}
                </button>
              </div>
            )}

            {/* Pending admin */}
            {activeLoan.status === 'pending_admin' && (
              <div style={{
                background: 'linear-gradient(135deg, #2e1065, #4c1d95)',
                borderRadius: '1.5rem', padding: '1.5rem',
                boxShadow: '0 12px 32px rgba(76,29,149,0.25)',
                marginBottom: '0.75rem',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem',
                }}>
                  <Clock size={16} color="#c4b5fd" />
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c4b5fd' }}>
                    Under Admin Review
                  </span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'white', lineHeight: '1' }}>
                  ZiG {activeLoan.amount_zig?.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>
                  US${activeLoan.amount_usd} · {activeLoan.purpose?.replace('_', ' ')}
                </div>
                <div style={{
                  marginTop: '0.875rem', fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.45)', lineHeight: '1.5',
                }}>
                  Identity verified at store. Your loan is being reviewed by our team.
                  You will be notified within 24 hours.
                </div>
              </div>
            )}

            {/* Active / disbursed */}
            {['disbursed', 'active'].includes(activeLoan.status) && (
              <div style={{
                background: activeLoan.is_overdue
                  ? 'linear-gradient(135deg, #7f1d1d, #991b1b)'
                  : 'linear-gradient(135deg, #3a2a1c, #6f5336)',
                borderRadius: '1.5rem', padding: '1.5rem',
                boxShadow: '0 12px 32px rgba(58,42,28,0.25)',
              }}>
                {activeLoan.is_overdue && (
                  <div style={{
                    background: 'rgba(239,68,68,0.3)',
                    borderRadius: '2rem', padding: '0.2rem 0.625rem',
                    fontSize: '0.65rem', fontWeight: '700', color: 'white',
                    display: 'inline-block', marginBottom: '0.625rem',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>Overdue</div>
                )}
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.2rem' }}>
                  Remaining balance
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', lineHeight: '1', marginBottom: '0.2rem' }}>
                  ZiG {(activeLoan.remaining_zig || 0).toLocaleString('en', { maximumFractionDigits: 0 })}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#f59e0b', marginBottom: '1rem' }}>
                  US${activeLoan.remaining_usd?.toFixed(2)}
                  {' · '}Due {new Date(activeLoan.due_date).toLocaleDateString('en-GB')}
                </div>
                {/* Progress */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.375rem',
                  }}>
                    <span>{activeLoan.progress_pct}% repaid</span>
                    <span>ZiG {(activeLoan.amount_repaid_zig || 0).toLocaleString('en', { maximumFractionDigits: 0 })} of ZiG {(activeLoan.total_repayment_zig || 0).toLocaleString('en', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div style={{
                    height: '6px', background: 'rgba(255,255,255,0.15)',
                    borderRadius: '3px', overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', width: `${activeLoan.progress_pct}%`,
                      background: 'linear-gradient(to right, #f59e0b, #fbbf24)',
                      borderRadius: '3px',
                    }} />
                  </div>
                </div>
                <button
                  onClick={() => {
                    setRepayingLoan(activeLoan);
                    setRepayAmount(String(activeLoan.remaining_zig || ''));
                    setView('repay');
                  }}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '1rem', padding: '0.875rem',
                    color: 'white', fontSize: '0.9rem', fontWeight: '700',
                    cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  }}
                >
                  <Coins size={16} /> Make a Repayment
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── ELIGIBILITY / APPLY CTA ── */}
        {!activeLoan && (
          <div style={{ marginBottom: '1.5rem' }}>
            {eligibility?.eligible ? (
              <>
                <div style={{
                  background: 'linear-gradient(135deg, #3a2a1c, #6f5336)',
                  borderRadius: '1.5rem', padding: '1.5rem',
                  boxShadow: '0 12px 32px rgba(58,42,28,0.25)',
                  marginBottom: '1rem', position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', top: '-30px', right: '-30px',
                    width: '140px', height: '140px',
                    background: 'radial-gradient(circle, rgba(168,132,90,0.3), transparent)',
                    borderRadius: '50%',
                  }} />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', marginBottom: '0.25rem' }}>
                      You qualify for up to
                    </div>
                    <div style={{ fontSize: '2.25rem', fontWeight: '900', color: 'white', lineHeight: '1', marginBottom: '0.25rem' }}>
                      ZiG {eligibility.max_loan_zig?.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#f59e0b', marginBottom: '1.25rem' }}>
                      US${eligibility.max_loan_usd}
                      {' · '}{eligibility.interest_rate_pct} interest
                      {' · '}{eligibility.term_days} days
                    </div>
                    {eligibility.requires_store && (
                      <div style={{
                        fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)',
                        marginBottom: '1rem',
                        display: 'flex', alignItems: 'center', gap: '0.375rem',
                      }}>
                        <MapPin size={11} />
                        Requires store identity verification
                      </div>
                    )}
                    <button
                      onClick={() => { setView('apply_kin'); setError(null); }}
                      style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.15)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '1rem', padding: '0.875rem',
                        color: 'white', fontSize: '0.9rem', fontWeight: '700',
                        cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      }}
                    >
                      <ArrowDownLeft size={18} /> Apply Now
                    </button>
                  </div>
                </div>

                {/* Example breakdown */}
                {eligibility.example && (
                  <div style={{
                    background: 'rgba(255,255,255,0.8)',
                    borderRadius: '1.25rem', padding: '1.25rem',
                    border: '1px solid rgba(168,132,90,0.12)',
                  }}>
                    <div style={{
                      fontSize: '0.7rem', fontWeight: '700', color: '#78716c',
                      textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.875rem',
                    }}>
                      Example — Maximum Loan
                    </div>
                    {[
                      { label: 'Borrow', zig: eligibility.example.borrow_zig, usd: eligibility.example.borrow_usd },
                      { label: `Interest (${eligibility.interest_rate_pct})`, zig: eligibility.example.interest_zig, usd: eligibility.example.interest_usd },
                      { label: 'Total repayment', zig: eligibility.example.repay_zig, usd: eligibility.example.repay_usd },
                    ].map((row, i, arr) => (
                      <div key={row.label} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '0.5rem 0',
                        borderBottom: i < arr.length - 1 ? '1px solid rgba(168,132,90,0.1)' : 'none',
                        borderTop: i === arr.length - 1 ? '2px solid rgba(168,132,90,0.15)' : 'none',
                      }}>
                        <span style={{ fontSize: '0.8rem', color: '#57534e' }}>{row.label}</span>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{
                            fontSize: '0.875rem',
                            fontWeight: i === arr.length - 1 ? '900' : '700',
                            color: '#1c1917',
                          }}>
                            ZiG {Number(row.zig).toLocaleString()}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#a8a29e' }}>US${Number(row.usd).toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* Not eligible */
              <div style={{
                background: 'rgba(255,255,255,0.8)',
                borderRadius: '1.5rem', padding: '1.5rem',
                border: '1.5px dashed rgba(168,132,90,0.3)',
                textAlign: 'center',
              }}>
                <Star size={36} color="#d4c0a3" style={{ margin: '0 auto 0.875rem' }} />
                <div style={{ fontSize: '1rem', fontWeight: '700', color: '#57534e', marginBottom: '0.5rem' }}>
                  Score needed: 20+
                </div>
                <div style={{ fontSize: '0.8rem', color: '#78716c', lineHeight: '1.6', marginBottom: '1.25rem' }}>
                  {eligibility?.reason || 'Build your Vimbiso Score to unlock loans'}
                </div>
                <button
                  onClick={() => { window.location.href = '/score'; }}
                  style={{
                    background: 'linear-gradient(135deg, #a8845a, #967554)',
                    color: 'white', padding: '0.75rem 1.5rem',
                    borderRadius: '1rem', border: 'none',
                    fontWeight: '600', fontSize: '0.875rem',
                    cursor: 'pointer', display: 'inline-flex',
                    alignItems: 'center', gap: '0.5rem',
                  }}
                >
                  View Vimbiso Score <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── LOAN HISTORY ── */}
        {loans.filter((l) => !['pending_store', 'pending_admin', 'disbursed', 'active'].includes(l.status)).length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <SectionLabel text={`Loan History · ${loans.filter((l) => !['pending_store','pending_admin','disbursed','active'].includes(l.status)).length}`} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {loans
                .filter((l) => !['pending_store', 'pending_admin', 'disbursed', 'active'].includes(l.status))
                .map((loan) => (
                  <div key={loan.id} style={{
                    background: 'rgba(255,255,255,0.8)',
                    borderRadius: '1.125rem', padding: '1rem 1.125rem',
                    border: '1px solid rgba(168,132,90,0.12)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#1c1917', textTransform: 'capitalize' }}>
                          {loan.purpose?.replace('_', ' ') || 'General'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#78716c' }}>
                          {loan.disbursed_at
                            ? new Date(loan.disbursed_at).toLocaleDateString('en-GB')
                            : new Date(loan.applied_at).toLocaleDateString('en-GB')}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: '800', color: '#1c1917' }}>
                          ZiG {(loan.amount_zig || 0).toLocaleString('en', { maximumFractionDigits: 0 })}
                        </div>
                        <div style={{
                          fontSize: '0.65rem', fontWeight: '700',
                          color: statusColor(loan.status),
                          textTransform: 'uppercase', marginTop: '0.1rem',
                        }}>
                          {statusLabel(loan.status, loan.is_overdue)}
                        </div>
                      </div>
                    </div>
                    <div style={{ height: '4px', background: '#f2ede4', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${loan.progress_pct}%`,
                        background: loan.status === 'completed'
                          ? '#748c3d'
                          : 'linear-gradient(to right, #a8845a, #f59e0b)',
                        borderRadius: '2px',
                      }} />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#a8a29e', marginTop: '0.3rem' }}>
                      {loan.progress_pct}% repaid
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── HOW IT WORKS ── */}
        <div style={{
          background: 'rgba(168,132,90,0.06)',
          borderRadius: '1.25rem', padding: '1.25rem',
          border: '1px solid rgba(168,132,90,0.12)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
            <TrendingUp size={16} color="#a8845a" />
            <span style={{
              fontSize: '0.75rem', fontWeight: '700', color: '#a8845a',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              How BATANA loans work
            </span>
          </div>
          {[
            'No payslip or bank statement needed',
            'Your Vimbiso Score determines your limit',
            'Loans under US$20 approved instantly',
            'Larger loans verified at a BATANA agent point',
            'Repay in ZiG — no exchange rate surprises',
            'On-time repayment improves your Vimbiso Score',
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', padding: '0.35rem 0' }}>
              <CheckCircle size={14} color="#748c3d" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={{ fontSize: '0.8rem', color: '#57534e', lineHeight: '1.5' }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── SHARED COMPONENTS ──────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: '0.75rem', fontWeight: '700', color: '#57534e',
  display: 'block', marginBottom: '0.5rem',
  textTransform: 'uppercase', letterSpacing: '0.05em',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.875rem 1.125rem',
  borderRadius: '1rem',
  border: '1.5px solid rgba(168,132,90,0.25)',
  background: 'rgba(255,255,255,0.85)',
  fontSize: '1rem', color: '#1c1917',
  outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box', transition: 'border-color 0.2s',
};

function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{
      fontSize: '0.72rem', fontWeight: '700', color: '#78716c',
      textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem',
    }}>
      {text}
    </div>
  );
}

function PageShell({
  title, subtitle, onBack, children, step,
}: {
  title: string; subtitle: string; onBack: () => void;
  children: React.ReactNode; step?: number;
}) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
      maxWidth: '480px', margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <header style={{
        padding: '1.25rem 1.5rem',
        background: 'rgba(250,248,245,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(168,132,90,0.12)',
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', gap: '1rem',
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none',
            cursor: 'pointer', color: '#a8845a',
            padding: '0.25rem', display: 'flex',
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1rem', fontWeight: '800', color: '#1c1917' }}>{title}</div>
          <div style={{ fontSize: '0.72rem', color: '#78716c' }}>{subtitle}</div>
        </div>
        {/* Step dots */}
        {step !== undefined && (
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {[1, 2, 3].map((s) => (
              <div key={s} style={{
                width: s === step ? '20px' : '6px',
                height: '6px', borderRadius: '3px',
                background: s === step
                  ? '#a8845a'
                  : s < step
                  ? 'rgba(168,132,90,0.5)'
                  : 'rgba(168,132,90,0.2)',
                transition: 'all 0.3s ease',
              }} />
            ))}
          </div>
        )}
      </header>
      <div style={{
        padding: '1.5rem', display: 'flex',
        flexDirection: 'column', gap: '1.25rem', paddingBottom: '3rem',
      }}>
        {children}
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{
      background: 'rgba(239,68,68,0.08)',
      border: '1px solid rgba(239,68,68,0.2)',
      borderRadius: '0.875rem', padding: '0.875rem 1rem',
      display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
    }}>
      <AlertCircle size={17} color="#dc2626" style={{ flexShrink: 0, marginTop: '1px' }} />
      <span style={{ fontSize: '0.85rem', color: '#dc2626' }}>{message}</span>
    </div>
  );
}

function SuccessBox({ message }: { message: string }) {
  return (
    <div style={{
      background: 'rgba(116,140,61,0.1)',
      border: '1px solid rgba(116,140,61,0.25)',
      borderRadius: '0.875rem', padding: '0.875rem 1rem',
      display: 'flex', gap: '0.75rem', alignItems: 'center',
    }}>
      <CheckCircle size={17} color="#748c3d" style={{ flexShrink: 0 }} />
      <span style={{ fontSize: '0.85rem', color: '#748c3d', fontWeight: '600' }}>{message}</span>
    </div>
  );
}

function SubmitButton({
  label, loading, onClick, icon, disabled = false,
}: {
  label: string; loading: boolean;
  onClick: () => void; icon: React.ReactNode; disabled?: boolean;
}) {
  const isDisabled = loading || disabled;
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      style={{
        width: '100%',
        background: isDisabled
          ? 'rgba(168,132,90,0.35)'
          : 'linear-gradient(135deg, #a8845a, #967554)',
        color: 'white', padding: '1rem',
        borderRadius: '1.25rem', border: 'none',
        fontSize: '1rem', fontWeight: '700',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: '0.5rem',
        boxShadow: isDisabled ? 'none' : '0 8px 24px rgba(168,132,90,0.3)',
        marginTop: '0.25rem',
      }}
    >
      {loading
        ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
        : <>{icon} {label}</>
      }
    </button>
  );
}