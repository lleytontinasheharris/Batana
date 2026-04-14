'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search, CheckCircle, XCircle, AlertCircle,
  Loader, User, Phone, CreditCard, Clock,
  LogOut, ShieldCheck, ArrowLeft, Hash,
} from 'lucide-react';
import BatanaLogo from '../components/BatanaLogo';
import { getUserProfile, storeLookup, storeConfirm, storeReject } from '../lib/api';

// ── Types ──────────────────────────────────────────────────
type View = 'idle' | 'found' | 'confirmed' | 'rejected';

interface LoanUser {
  full_name: string;
  phone_number: string;
  national_id: string;
  passport_photo_base64?: string;
}

interface LookupResult {
  loan_id: string;
  verification_code: string;
  user: LoanUser;
  next_of_kin: {
    full_name: string;
    relationship: string;
    phone_number: string;
  } | null;
  expires_at: string;
}

function getToken(): string | null {
  if (typeof window !== 'undefined') return localStorage.getItem('batana_token');
  return null;
}

// ══════════════════════════════════════════════════════════
export default function StorePage() {
  const [authLoading, setAuthLoading]     = useState(true);
  const [attendant, setAttendant]         = useState<any>(null);

  const [code, setCode]                   = useState('');
  const [view, setView]                   = useState<View>('idle');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [result, setResult]               = useState<LookupResult | null>(null);
  const [notes, setNotes]                 = useState('');
  const [rejectReason, setRejectReason]   = useState('');

  // ── Auth check ────────────────────────────────────────────
  // Only store attendants can access this page.
  // Regular users and non-auth visitors are redirected.
  const checkAuth = useCallback(async () => {
    const token = getToken();
    if (!token) { window.location.href = '/login'; return; }
    try {
      const data = await getUserProfile(token);
      const user = data?.user;
      if (!user?.is_store_attendant) {
        // Regular user — send to normal dashboard
        window.location.href = '/dashboard';
        return;
      }
      setAttendant(user);
    } catch {
      localStorage.removeItem('batana_token');
      localStorage.removeItem('batana_phone');
      window.location.href = '/login';
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  // ── Lookup ────────────────────────────────────────────────
  async function handleLookup() {
    const token = getToken();
    if (!token) return;
    const cleaned = code.trim().toUpperCase();
    if (!cleaned) { setError('Enter a verification code'); return; }
    if (!cleaned.startsWith('BAT-')) {
      setError('Code must start with BAT- (e.g. BAT-A1B2C3)');
      return;
    }
    try {
      setLookupLoading(true);
      setError(null);
      const data = await storeLookup(token, cleaned);
      setResult(data);
      setView('found');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Code not found or expired');
    } finally {
      setLookupLoading(false);
    }
  }

  // ── Confirm identity ──────────────────────────────────────
  async function handleConfirm() {
    const token = getToken();
    if (!token || !result) return;
    try {
      setActionLoading(true);
      setError(null);
      await storeConfirm(token, {
        loan_id: result.loan_id,
        verification_code: result.verification_code,
        notes: notes.trim() || undefined,
      });
      setView('confirmed');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Confirmation failed');
    } finally {
      setActionLoading(false);
    }
  }

  // ── Reject ────────────────────────────────────────────────
  async function handleReject() {
    const token = getToken();
    if (!token || !result) return;
    if (!rejectReason.trim()) {
      setError('Please state a reason for rejection');
      return;
    }
    try {
      setActionLoading(true);
      setError(null);
      await storeReject(token, {
        loan_id: result.loan_id,
        verification_code: result.verification_code,
        reason: rejectReason.trim(),
      });
      setView('rejected');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  }

  // ── Reset ─────────────────────────────────────────────────
  function reset() {
    setView('idle');
    setCode('');
    setResult(null);
    setNotes('');
    setRejectReason('');
    setError(null);
  }

  function handleSignOut() {
    localStorage.removeItem('batana_token');
    localStorage.removeItem('batana_phone');
    window.location.href = '/login';
  }

  // ── AUTH LOADING ──────────────────────────────────────────
  if (authLoading) {
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
        @keyframes fadeUp  { from { opacity:0; transform:translateY(12px) }
                             to   { opacity:1; transform:translateY(0)    } }
      `}</style>

      {/* ── Header ── */}
      <header style={{
        padding: '1.25rem 1.5rem',
        background: 'rgba(250,248,245,0.97)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(168,132,90,0.15)',
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', gap: '1rem',
      }}>
        <BatanaLogo size={32} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1rem', fontWeight: '800', color: '#1c1917' }}>
            Store Portal
          </div>
          <div style={{ fontSize: '0.72rem', color: '#78716c' }}>
            {attendant?.first_name} {attendant?.last_name} · Identity Verification
          </div>
        </div>
        <button
          onClick={handleSignOut}
          style={{
            background: 'rgba(168,132,90,0.08)',
            border: '1px solid rgba(168,132,90,0.2)',
            borderRadius: '0.75rem', padding: '0.5rem 0.875rem',
            cursor: 'pointer', display: 'flex',
            alignItems: 'center', gap: '0.375rem',
            color: '#a8845a', fontSize: '0.75rem', fontWeight: '600',
          }}
        >
          <LogOut size={14} />
          Sign out
        </button>
      </header>

      <div style={{ padding: '1.5rem', paddingBottom: '3rem' }}>

        {/* ── ROLE NOTICE ── */}
        <div style={{
          background: 'linear-gradient(135deg, #3a2a1c, #6f5336)',
          borderRadius: '1.25rem', padding: '1.125rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '1rem',
          boxShadow: '0 4px 16px rgba(58,42,28,0.2)',
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '0.875rem',
            background: 'rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <ShieldCheck size={20} color="white" />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: '700', color: 'white' }}>
              Identity Verification Only
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', lineHeight: '1.5' }}>
              You confirm the person matches their ID.
              Loan amounts and financials are not shown here.
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════ */}
        {/* VIEW: IDLE — code input                         */}
        {/* ════════════════════════════════════════════════ */}
        {view === 'idle' && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            <div style={{
              fontSize: '0.75rem', fontWeight: '700', color: '#78716c',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              marginBottom: '0.875rem',
            }}>
              Enter Customer Code
            </div>

            {/* Code input */}
            <div style={{
              background: 'rgba(255,255,255,0.9)',
              borderRadius: '1.375rem', padding: '1.5rem',
              border: '1px solid rgba(168,132,90,0.15)',
              marginBottom: '1rem',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                marginBottom: '1.25rem',
              }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '0.875rem',
                  background: 'rgba(168,132,90,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Hash size={20} color="#a8845a" />
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#1c1917' }}>
                    Verification Code
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#78716c' }}>
                    Customer shows this on their phone
                  </div>
                </div>
              </div>

              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError(null);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleLookup(); }}
                placeholder="BAT-A1B2C3"
                maxLength={10}
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  borderRadius: '1rem',
                  border: '1.5px solid rgba(168,132,90,0.25)',
                  background: 'rgba(255,255,255,0.8)',
                  fontSize: '1.5rem',
                  fontWeight: '800',
                  color: '#1c1917',
                  outline: 'none',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box',
                  letterSpacing: '0.15em',
                  textAlign: 'center',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#a8845a'; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(168,132,90,0.25)'; }}
              />
            </div>

            {error && (
              <div style={{ marginBottom: '1rem' }}>
                <ErrorBox message={error} />
              </div>
            )}

            <button
              onClick={handleLookup}
              disabled={lookupLoading || !code.trim()}
              style={{
                width: '100%',
                background: lookupLoading || !code.trim()
                  ? 'rgba(168,132,90,0.35)'
                  : 'linear-gradient(135deg, #a8845a, #967554)',
                color: 'white', padding: '1rem',
                borderRadius: '1.25rem', border: 'none',
                fontSize: '1rem', fontWeight: '700',
                cursor: lookupLoading || !code.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '0.5rem',
                boxShadow: lookupLoading || !code.trim()
                  ? 'none' : '0 8px 24px rgba(168,132,90,0.3)',
              }}
            >
              {lookupLoading
                ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Searching…</>
                : <><Search size={18} /> Look Up Customer</>
              }
            </button>

            {/* Instructions */}
            <div style={{
              marginTop: '1.5rem',
              background: 'rgba(168,132,90,0.05)',
              borderRadius: '1.125rem', padding: '1.125rem',
              border: '1px solid rgba(168,132,90,0.1)',
            }}>
              <div style={{
                fontSize: '0.72rem', fontWeight: '700', color: '#a8845a',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                marginBottom: '0.75rem',
              }}>
                How to verify
              </div>
              {[
                'Ask the customer to show their BATANA code',
                'Type the 6-character code (e.g. BAT-A1B2C3)',
                'Check their face matches the photo shown',
                'Check their National ID matches the details',
                'Press Confirm Identity if everything matches',
                'Press Reject if anything looks wrong',
              ].map((step, i) => (
                <div key={i} style={{
                  display: 'flex', gap: '0.75rem',
                  alignItems: 'flex-start', padding: '0.3rem 0',
                }}>
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: 'rgba(168,132,90,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: '1px',
                  }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: '800', color: '#a8845a' }}>
                      {i + 1}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#57534e', lineHeight: '1.5' }}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════ */}
        {/* VIEW: FOUND — identity card                     */}
        {/* ════════════════════════════════════════════════ */}
        {view === 'found' && result && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>

            {/* Back */}
            <button
              onClick={reset}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#a8845a', display: 'flex', alignItems: 'center',
                gap: '0.375rem', fontSize: '0.875rem', fontWeight: '600',
                padding: 0, marginBottom: '1.25rem',
              }}
            >
              <ArrowLeft size={16} /> Enter different code
            </button>

            {/* Code badge */}
            <div style={{
              display: 'flex', justifyContent: 'center', marginBottom: '1.25rem',
            }}>
              <div style={{
                background: 'rgba(168,132,90,0.08)',
                border: '1.5px solid rgba(168,132,90,0.25)',
                borderRadius: '2rem', padding: '0.5rem 1.25rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <Hash size={14} color="#a8845a" />
                <span style={{
                  fontSize: '1.125rem', fontWeight: '900',
                  color: '#a8845a', letterSpacing: '0.12em',
                  fontFamily: 'monospace',
                }}>
                  {result.verification_code}
                </span>
              </div>
            </div>

            {/* Identity card */}
            <div style={{
              background: 'rgba(255,255,255,0.92)',
              borderRadius: '1.5rem', overflow: 'hidden',
              border: '1px solid rgba(168,132,90,0.15)',
              marginBottom: '1rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
            }}>
              {/* Photo area */}
              <div style={{
                background: 'linear-gradient(135deg, #3a2a1c, #6f5336)',
                padding: '1.5rem',
                display: 'flex', alignItems: 'center', gap: '1.25rem',
              }}>
                {/* Photo or placeholder */}
                <div style={{
                  width: '80px', height: '80px', borderRadius: '1rem',
                  background: result.user.passport_photo_base64
                    ? 'transparent'
                    : 'rgba(255,255,255,0.15)',
                  border: '2px solid rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, overflow: 'hidden',
                }}>
                  {result.user.passport_photo_base64 ? (
                    <img
                      src={result.user.passport_photo_base64}
                      alt="Customer photo"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <User size={36} color="rgba(255,255,255,0.6)" />
                  )}
                </div>

                <div>
                  <div style={{
                    fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    marginBottom: '0.3rem',
                  }}>
                    Customer Name
                  </div>
                  <div style={{
                    fontSize: '1.25rem', fontWeight: '900',
                    color: 'white', lineHeight: '1.2',
                  }}>
                    {result.user.full_name}
                  </div>
                  {!result.user.passport_photo_base64 && (
                    <div style={{
                      fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)',
                      marginTop: '0.4rem',
                    }}>
                      No photo on file — verify by ID only
                    </div>
                  )}
                </div>
              </div>

              {/* Details */}
              <div style={{ padding: '1.25rem' }}>
                <div style={{
                  fontSize: '0.65rem', fontWeight: '700', color: '#78716c',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  marginBottom: '0.875rem',
                }}>
                  Identity Details — Check these against the physical ID
                </div>

                {[
                  {
                    icon: <CreditCard size={16} color="#a8845a" />,
                    label: 'National ID',
                    value: result.user.national_id || 'Not provided',
                  },
                  {
                    icon: <Phone size={16} color="#a8845a" />,
                    label: 'Phone Number',
                    value: result.user.phone_number,
                  },
                ].map((item) => (
                  <div key={item.label} style={{
                    display: 'flex', alignItems: 'center', gap: '0.875rem',
                    padding: '0.875rem',
                    background: 'rgba(168,132,90,0.04)',
                    borderRadius: '0.875rem',
                    marginBottom: '0.625rem',
                  }}>
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '0.625rem',
                      background: 'rgba(168,132,90,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: '#a8a29e', marginBottom: '0.15rem' }}>
                        {item.label}
                      </div>
                      <div style={{
                        fontSize: '0.9rem', fontWeight: '700', color: '#1c1917',
                        fontFamily: item.label === 'National ID' ? 'monospace' : 'inherit',
                        letterSpacing: item.label === 'National ID' ? '0.06em' : 0,
                      }}>
                        {item.value}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Next of kin */}
                {result.next_of_kin && (
                  <div style={{
                    background: 'rgba(116,140,61,0.06)',
                    border: '1px solid rgba(116,140,61,0.15)',
                    borderRadius: '0.875rem', padding: '0.875rem',
                    marginTop: '0.25rem',
                  }}>
                    <div style={{
                      fontSize: '0.65rem', fontWeight: '700', color: '#748c3d',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      marginBottom: '0.4rem',
                    }}>
                      Next of Kin
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1c1917' }}>
                      {result.next_of_kin.full_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#78716c' }}>
                      {result.next_of_kin.relationship} · {result.next_of_kin.phone_number}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Expiry notice */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              fontSize: '0.72rem', color: '#78716c',
              marginBottom: '1.25rem', justifyContent: 'center',
            }}>
              <Clock size={12} />
              Code expires: {new Date(result.expires_at).toLocaleString()}
            </div>

            {error && (
              <div style={{ marginBottom: '1rem' }}>
                <ErrorBox message={error} />
              </div>
            )}

            {/* Attendant notes */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Customer presented valid Zimbabwean passport"
                rows={2}
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                  lineHeight: '1.6',
                  fontSize: '0.875rem',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#a8845a'; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(168,132,90,0.25)'; }}
              />
            </div>

            {/* Confirm button */}
            <button
              onClick={handleConfirm}
              disabled={actionLoading}
              style={{
                width: '100%',
                background: actionLoading
                  ? 'rgba(116,140,61,0.35)'
                  : 'linear-gradient(135deg, #748c3d, #5a6e2d)',
                color: 'white', padding: '1rem',
                borderRadius: '1.25rem', border: 'none',
                fontSize: '1rem', fontWeight: '700',
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '0.5rem',
                boxShadow: actionLoading ? 'none' : '0 8px 24px rgba(116,140,61,0.3)',
                marginBottom: '0.75rem',
              }}
            >
              {actionLoading
                ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Processing…</>
                : <><CheckCircle size={18} /> Confirm Identity</>
              }
            </button>

            {/* Reject section */}
            <div style={{
              background: 'rgba(239,68,68,0.04)',
              border: '1px solid rgba(239,68,68,0.12)',
              borderRadius: '1.25rem', padding: '1rem',
            }}>
              <div style={{
                fontSize: '0.72rem', fontWeight: '700', color: '#dc2626',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                marginBottom: '0.625rem',
              }}>
                Identity does not match?
              </div>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="State the reason (e.g. Photo does not match person present)"
                rows={2}
                style={{
                  ...inputStyle,
                  border: '1.5px solid rgba(239,68,68,0.2)',
                  resize: 'vertical',
                  fontSize: '0.85rem',
                  marginBottom: '0.75rem',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#dc2626'; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
              />
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                style={{
                  width: '100%',
                  background: actionLoading || !rejectReason.trim()
                    ? 'rgba(239,68,68,0.25)'
                    : 'rgba(239,68,68,0.9)',
                  color: 'white', padding: '0.875rem',
                  borderRadius: '1rem', border: 'none',
                  fontSize: '0.9rem', fontWeight: '700',
                  cursor: actionLoading || !rejectReason.trim()
                    ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '0.5rem',
                }}
              >
                <XCircle size={16} />
                Reject — Identity Mismatch
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════ */}
        {/* VIEW: CONFIRMED                                  */}
        {/* ════════════════════════════════════════════════ */}
        {view === 'confirmed' && (
          <div style={{
            animation: 'fadeUp 0.3s ease',
            textAlign: 'center', padding: '2rem 1rem',
          }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'rgba(116,140,61,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}>
              <CheckCircle size={40} color="#748c3d" />
            </div>
            <div style={{
              fontSize: '1.25rem', fontWeight: '900',
              color: '#1c1917', marginBottom: '0.5rem',
            }}>
              Identity Confirmed
            </div>
            <p style={{
              fontSize: '0.875rem', color: '#78716c',
              lineHeight: '1.65', marginBottom: '2rem',
            }}>
              {result?.user.full_name} has been verified.
              Their loan application is now pending admin approval.
              They will be notified when the funds are approved.
            </p>

            <div style={{
              background: 'rgba(116,140,61,0.06)',
              border: '1px solid rgba(116,140,61,0.2)',
              borderRadius: '1.125rem', padding: '1rem',
              marginBottom: '1.5rem',
            }}>
              <div style={{ fontSize: '0.72rem', color: '#748c3d', fontWeight: '700', marginBottom: '0.25rem' }}>
                What happens next
              </div>
              <div style={{ fontSize: '0.825rem', color: '#57534e', lineHeight: '1.6' }}>
                A BATANA admin will review the application and approve the loan.
                The customer will receive a notification when funds are disbursed to their wallet.
              </div>
            </div>

            <button
              onClick={reset}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #a8845a, #967554)',
                color: 'white', padding: '1rem',
                borderRadius: '1.25rem', border: 'none',
                fontSize: '1rem', fontWeight: '700', cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(168,132,90,0.3)',
              }}
            >
              Verify Another Customer
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════ */}
        {/* VIEW: REJECTED                                   */}
        {/* ════════════════════════════════════════════════ */}
        {view === 'rejected' && (
          <div style={{
            animation: 'fadeUp 0.3s ease',
            textAlign: 'center', padding: '2rem 1rem',
          }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'rgba(239,68,68,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}>
              <XCircle size={40} color="#dc2626" />
            </div>
            <div style={{
              fontSize: '1.25rem', fontWeight: '900',
              color: '#1c1917', marginBottom: '0.5rem',
            }}>
              Verification Rejected
            </div>
            <p style={{
              fontSize: '0.875rem', color: '#78716c',
              lineHeight: '1.65', marginBottom: '2rem',
            }}>
              The identity mismatch has been recorded.
              The loan application has been flagged and the customer
              will be notified that their verification did not pass.
            </p>

            <button
              onClick={reset}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #a8845a, #967554)',
                color: 'white', padding: '1rem',
                borderRadius: '1.25rem', border: 'none',
                fontSize: '1rem', fontWeight: '700', cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(168,132,90,0.3)',
              }}
            >
              Verify Another Customer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared styles ──────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  fontSize: '0.75rem', fontWeight: '700', color: '#57534e',
  display: 'block', marginBottom: '0.5rem',
  textTransform: 'uppercase', letterSpacing: '0.05em',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.875rem 1.125rem',
  borderRadius: '1rem', border: '1.5px solid rgba(168,132,90,0.25)',
  background: 'rgba(255,255,255,0.85)', fontSize: '1rem',
  color: '#1c1917', outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box', transition: 'border-color 0.2s',
};

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{
      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
      borderRadius: '0.875rem', padding: '1rem',
      display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
    }}>
      <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: '1px' }} />
      <span style={{ fontSize: '0.875rem', color: '#dc2626' }}>{message}</span>
    </div>
  );
}