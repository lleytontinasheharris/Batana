'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader,
  ChevronRight,
  Heart,
  Activity,
  XCircle,
  FileText,
} from 'lucide-react';
import BatanaLogo from '../components/BatanaLogo';
import BottomNav from '../components/BottomNav';
import {
  getInsurancePlans,
  getMyPolicies,
  enrollInsurance,
  cancelPolicy,
  submitClaim,
} from '../lib/api';

type View = 'home' | 'enroll' | 'claim';

function getToken(): string | null {
  if (typeof window !== 'undefined') return localStorage.getItem('batana_token');
  return null;
}

const PLAN_ICONS: Record<string, React.ReactNode> = {
  funeral: <Heart size={22} color="white" />,
  hospital: <Activity size={22} color="white" />,
};

const PLAN_COLORS: Record<string, string> = {
  funeral: 'linear-gradient(135deg, #3a2a1c, #6f5336)',
  hospital: 'linear-gradient(135deg, #1a3a2a, #2d6b4f)',
};

const PLAN_ACCENT: Record<string, string> = {
  funeral: '#a8845a',
  hospital: '#34d399',
};

export default function InsurancePage() {
  const [view, setView] = useState<View>('home');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [claimingPolicy, setClaimingPolicy] = useState<any>(null);
  const [claimDescription, setClaimDescription] = useState('');
  const [claimDays, setClaimDays] = useState('');
  const [exchangeRate, setExchangeRate] = useState<number>(25.3745);

  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) {
      window.location.href = '/login';
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const [plansData, policiesData] = await Promise.all([
        getInsurancePlans(),
        getMyPolicies(token),
      ]);
      setPlans(plansData.plans || []);
      setPolicies(policiesData.policies || []);
      if (plansData.plans?.length > 0) {
        setExchangeRate(plansData.plans[0]?.rate_used || 25.3745);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load insurance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleEnroll() {
    const token = getToken();
    if (!token || !selectedPlan) return;
    try {
      setActionLoading(true);
      setError(null);
      const data = await enrollInsurance(token, selectedPlan);
      setSuccess(data.message);
      await loadData();
      setTimeout(() => {
        setSuccess(null);
        setView('home');
        setSelectedPlan(null);
      }, 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Enrollment failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel(policyId: string) {
    const token = getToken();
    if (!token) return;
    if (!confirm('Are you sure you want to cancel this policy? Coverage ends immediately.')) return;
    try {
      setActionLoading(true);
      setError(null);
      await cancelPolicy(token, policyId);
      setSuccess('Policy cancelled.');
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Cancellation failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleClaim() {
    const token = getToken();
    if (!token || !claimingPolicy) return;
    if (!claimDescription || claimDescription.trim().length < 10) {
      setError('Please describe your claim in at least 10 characters');
      return;
    }
    try {
      setActionLoading(true);
      setError(null);
      await submitClaim(token, claimingPolicy.id, {
        description: claimDescription,
        days_hospitalised: claimDays ? parseInt(claimDays) : undefined,
      });
      setSuccess('Claim submitted. We will review it within 48 hours.');
      setView('home');
      setClaimDescription('');
      setClaimDays('');
      setClaimingPolicy(null);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Claim submission failed');
    } finally {
      setActionLoading(false);
    }
  }

  const activePolicies = policies.filter((p) => p.status === 'active');
  const activeTypes = activePolicies.map((p) => p.type);

  // ── LOADING ──────────────────────────────────────────────
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
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <BatanaLogo size={48} />
        <Loader size={24} color="#a8845a" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  // ── CLAIM VIEW ───────────────────────────────────────────
  if (view === 'claim' && claimingPolicy) {
    const isHospital = claimingPolicy.type === 'hospital';
    const plan = claimingPolicy.plan_details;

    return (
      <PageShell
        title="Submit a Claim"
        subtitle={plan?.name || 'Insurance Claim'}
        onBack={() => {
          setView('home');
          setClaimDescription('');
          setClaimDays('');
          setError(null);
        }}
      >
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

        {/* Sensitive notice */}
        <div style={{
          background: 'rgba(168,132,90,0.06)',
          border: '1px solid rgba(168,132,90,0.15)',
          borderRadius: '1rem',
          padding: '1rem 1.25rem',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start',
        }}>
          <Heart size={18} color="#a8845a" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{
            fontSize: '0.8rem',
            color: '#57534e',
            lineHeight: '1.6',
            margin: 0,
          }}>
            {isHospital
              ? 'We will process your hospital claim as quickly as possible. Your wellbeing comes first.'
              : 'We understand this is a difficult time. Your claim will be handled with care and urgency.'}
          </p>
        </div>

        {/* Policy summary */}
        <div style={{
          background: 'rgba(255,255,255,0.85)',
          borderRadius: '1.25rem',
          padding: '1.25rem',
          border: '1px solid rgba(168,132,90,0.15)',
        }}>
          <div style={{
            fontSize: '0.7rem',
            fontWeight: '700',
            color: '#78716c',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.75rem',
          }}>
            Your Coverage
          </div>
          <div style={{
            fontSize: '1.25rem',
            fontWeight: '900',
            color: '#1c1917',
            marginBottom: '0.1rem',
          }}>
            ZiG {parseFloat(claimingPolicy.cover_zig || 0).toLocaleString('en', { maximumFractionDigits: 0 })}
            {isHospital && '/day'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#78716c', marginBottom: '0.25rem' }}>
            US${claimingPolicy.cover_amount_usd}{isHospital && '/day'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#78716c' }}>
            {plan?.name}
          </div>
        </div>

        {/* Hospital days input */}
        {isHospital && (
          <div>
            <label style={labelStyle}>Days hospitalised</label>
            <input
              type="number"
              value={claimDays}
              onChange={(e) => setClaimDays(e.target.value)}
              placeholder="e.g. 3"
              min="1"
              max="30"
              style={{ ...inputStyle, fontSize: '1.25rem', fontWeight: '700' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#a8845a'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(168,132,90,0.25)'; }}
            />
            {claimDays && parseInt(claimDays) > 0 && (
              <div style={{ marginTop: '0.375rem' }}>
                <p style={{
                  fontSize: '0.9rem',
                  color: '#748c3d',
                  fontWeight: '800',
                  margin: '0 0 0.1rem',
                }}>
                  ZiG {(Math.min(parseInt(claimDays), 30) * 10 * exchangeRate).toLocaleString('en', { maximumFractionDigits: 0 })}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#78716c', margin: 0 }}>
                  US${Math.min(parseInt(claimDays), 30) * 10}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        <div>
          <label style={labelStyle}>
            {isHospital ? 'Hospital and reason for admission' : 'Details of the loss'}
          </label>
          <textarea
            value={claimDescription}
            onChange={(e) => setClaimDescription(e.target.value)}
            placeholder={isHospital
              ? 'e.g. Admitted to Parirenyatwa Hospital on 12 Jan for malaria treatment'
              : 'e.g. My father passed away on 10 January 2025 at home in Chitungwiza'}
            rows={4}
            style={{
              ...inputStyle,
              resize: 'vertical',
              lineHeight: '1.6',
              fontSize: '0.9rem',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#a8845a'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(168,132,90,0.25)'; }}
          />
        </div>

        {error && <ErrorBox message={error} />}

        <SubmitButton
          label="Submit Claim"
          loading={actionLoading}
          onClick={handleClaim}
          icon={<FileText size={18} />}
        />

        {/* BottomNav — claim view */}
        <BottomNav />
      </PageShell>
    );
  }

  // ── ENROLL VIEW ──────────────────────────────────────────
  if (view === 'enroll') {
    const funeralPlans = plans.filter((p) => p.type === 'funeral');
    const hospitalPlans = plans.filter((p) => p.type === 'hospital');
    const hasFuneral = activeTypes.includes('funeral');
    const hasHospital = activeTypes.includes('hospital');

    return (
      <PageShell
        title="Choose a Plan"
        subtitle="Pay monthly · Cancel anytime"
        onBack={() => {
          setView('home');
          setSelectedPlan(null);
          setError(null);
        }}
      >
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

        {error && <ErrorBox message={error} />}
        {success && <SuccessBox message={success} />}

        {/* Funeral plans */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            marginBottom: '0.875rem',
          }}>
            <div style={{
              width: '28px', height: '28px',
              borderRadius: '0.625rem',
              background: 'linear-gradient(135deg, #3a2a1c, #6f5336)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Heart size={14} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#1c1917' }}>
                Nhaka Funeral Cover
              </div>
              {hasFuneral && (
                <div style={{
                  fontSize: '0.7rem', color: '#748c3d', fontWeight: '600',
                  display: 'flex', alignItems: 'center', gap: '0.25rem',
                }}>
                  <CheckCircle size={11} color="#748c3d" /> Already active
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {funeralPlans.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              return (
                <button
                  key={plan.id}
                  onClick={() => !hasFuneral && setSelectedPlan(isSelected ? null : plan.id)}
                  disabled={hasFuneral}
                  style={{
                    background: isSelected ? 'rgba(168,132,90,0.08)' : 'rgba(255,255,255,0.85)',
                    border: isSelected ? '2px solid #a8845a' : '1.5px solid rgba(168,132,90,0.2)',
                    borderRadius: '1.25rem',
                    padding: '1.25rem',
                    cursor: hasFuneral ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    opacity: hasFuneral ? 0.5 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '0.875rem',
                  }}>
                    <div>
                      <div style={{
                        fontSize: '1rem', fontWeight: '800',
                        color: '#1c1917', marginBottom: '0.2rem',
                      }}>
                        {plan.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#78716c' }}>
                        {plan.description}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#a8845a' }}>
                        ZiG {plan.premium_zig?.toLocaleString('en', { maximumFractionDigits: 0 })}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#78716c' }}>
                        /month · US${plan.premium_usd}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    background: 'rgba(168,132,90,0.06)',
                    borderRadius: '0.875rem',
                    padding: '0.875rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span style={{ fontSize: '0.8rem', color: '#57534e' }}>Covers up to</span>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: '900', color: '#1c1917' }}>
                        ZiG {plan.cover_zig?.toLocaleString('en', { maximumFractionDigits: 0 })}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#78716c' }}>
                        US${plan.cover_usd}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <div style={{ marginTop: '0.875rem' }}>
                      {plan.features.map((f: string, i: number) => (
                        <div key={i} style={{
                          display: 'flex', gap: '0.5rem',
                          alignItems: 'flex-start', padding: '0.3rem 0',
                        }}>
                          <CheckCircle size={13} color="#748c3d" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span style={{ fontSize: '0.8rem', color: '#57534e' }}>{f}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Hospital plans */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            marginBottom: '0.875rem',
          }}>
            <div style={{
              width: '28px', height: '28px',
              borderRadius: '0.625rem',
              background: 'linear-gradient(135deg, #1a3a2a, #2d6b4f)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Activity size={14} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#1c1917' }}>
                Maruva Hospital Cash
              </div>
              {hasHospital && (
                <div style={{
                  fontSize: '0.7rem', color: '#748c3d', fontWeight: '600',
                  display: 'flex', alignItems: 'center', gap: '0.25rem',
                }}>
                  <CheckCircle size={11} color="#748c3d" /> Already active
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {hospitalPlans.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              return (
                <button
                  key={plan.id}
                  onClick={() => !hasHospital && setSelectedPlan(isSelected ? null : plan.id)}
                  disabled={hasHospital}
                  style={{
                    background: isSelected ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.85)',
                    border: isSelected ? '2px solid #34d399' : '1.5px solid rgba(168,132,90,0.2)',
                    borderRadius: '1.25rem',
                    padding: '1.25rem',
                    cursor: hasHospital ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    opacity: hasHospital ? 0.5 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '0.875rem',
                  }}>
                    <div>
                      <div style={{
                        fontSize: '1rem', fontWeight: '800',
                        color: '#1c1917', marginBottom: '0.2rem',
                      }}>
                        {plan.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#78716c' }}>
                        {plan.description}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#34d399' }}>
                        ZiG {plan.premium_zig?.toLocaleString('en', { maximumFractionDigits: 0 })}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#78716c' }}>
                        /month · US${plan.premium_usd}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    background: 'rgba(52,211,153,0.06)',
                    borderRadius: '0.875rem',
                    padding: '0.875rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span style={{ fontSize: '0.8rem', color: '#57534e' }}>Daily payout</span>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: '900', color: '#1c1917' }}>
                        ZiG {Math.round(10 * exchangeRate).toLocaleString()}/day
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#78716c' }}>US$10/day</div>
                    </div>
                  </div>
                  {isSelected && (
                    <div style={{ marginTop: '0.875rem' }}>
                      {plan.features.map((f: string, i: number) => (
                        <div key={i} style={{
                          display: 'flex', gap: '0.5rem',
                          alignItems: 'flex-start', padding: '0.3rem 0',
                        }}>
                          <CheckCircle size={13} color="#748c3d" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span style={{ fontSize: '0.8rem', color: '#57534e' }}>{f}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Premium summary */}
        {selectedPlan && (
          <div style={{
            background: 'rgba(168,132,90,0.06)',
            border: '1px solid rgba(168,132,90,0.15)',
            borderRadius: '1rem',
            padding: '1rem 1.25rem',
            marginTop: '0.5rem',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '0.875rem', color: '#57534e' }}>
                First premium deducted now
              </span>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: '800', color: '#1c1917' }}>
                  ZiG {plans.find((p) => p.id === selectedPlan)?.premium_zig?.toLocaleString('en', { maximumFractionDigits: 0 })}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#78716c' }}>
                  US${plans.find((p) => p.id === selectedPlan)?.premium_usd}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#78716c', marginTop: '0.25rem' }}>
              From your ZiG or USD wallet balance
            </div>
          </div>
        )}

        <SubmitButton
          label={selectedPlan ? 'Enroll Now' : 'Select a plan above'}
          loading={actionLoading}
          onClick={handleEnroll}
          icon={<Shield size={18} />}
          disabled={!selectedPlan}
        />

        {/* BottomNav — enroll view */}
        <BottomNav />
      </PageShell>
    );
  }

  // ── HOME VIEW ────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
      maxWidth: '480px',
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <header style={{
        padding: '1.25rem 1.5rem',
        background: 'rgba(250,248,245,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(168,132,90,0.12)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}>
        <button
          onClick={() => { window.location.href = '/dashboard'; }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#a8845a',
            padding: '0.25rem',
            display: 'flex',
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1rem', fontWeight: '800', color: '#1c1917' }}>
            Protect
          </div>
          <div style={{ fontSize: '0.75rem', color: '#78716c' }}>
            Funeral · Hospital · Peace of mind
          </div>
        </div>
        <BatanaLogo size={32} />
      </header>

      <div style={{ padding: '1.5rem', paddingBottom: '3rem' }}>

        {success && <SuccessBox message={success} />}
        {error && <ErrorBox message={error} />}

        {/* Active policies */}
        {activePolicies.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              color: '#78716c',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '0.875rem',
            }}>
              Active Coverage · {activePolicies.length}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {activePolicies.map((policy) => {
                const plan = policy.plan_details;
                return (
                  <div
                    key={policy.id}
                    style={{
                      background: PLAN_COLORS[policy.type],
                      borderRadius: '1.5rem',
                      padding: '1.5rem',
                      position: 'relative',
                      overflow: 'hidden',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: '-30px', right: '-30px',
                      width: '120px', height: '120px',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '50%',
                    }} />
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '1rem',
                      }}>
                        <div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.25rem',
                          }}>
                            <div style={{
                              width: '28px', height: '28px',
                              borderRadius: '0.625rem',
                              background: 'rgba(255,255,255,0.15)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {PLAN_ICONS[policy.type]}
                            </div>
                            <span style={{ fontSize: '1rem', fontWeight: '800', color: 'white' }}>
                              {plan?.name || policy.plan_id}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)' }}>
                            {policy.premiums_paid} premium{policy.premiums_paid !== 1 ? 's' : ''} paid
                          </div>
                        </div>
                        <div style={{
                          background: 'rgba(255,255,255,0.15)',
                          borderRadius: '2rem',
                          padding: '0.25rem 0.75rem',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          color: 'white',
                          textTransform: 'uppercase',
                        }}>
                          Active
                        </div>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '0.75rem',
                        marginBottom: '1rem',
                      }}>
                        <div style={{
                          background: 'rgba(255,255,255,0.1)',
                          borderRadius: '0.875rem',
                          padding: '0.75rem',
                        }}>
                          <div style={{
                            fontSize: '0.65rem',
                            color: 'rgba(255,255,255,0.5)',
                            marginBottom: '0.25rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}>
                            {policy.type === 'hospital' ? 'Per day' : 'Cover'}
                          </div>
                          <div style={{ fontSize: '1.1rem', fontWeight: '900', color: 'white' }}>
                            ZiG {parseFloat(policy.cover_zig || 0).toLocaleString('en', { maximumFractionDigits: 0 })}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.1rem' }}>
                            US${policy.cover_amount_usd}
                          </div>
                        </div>
                        <div style={{
                          background: 'rgba(255,255,255,0.1)',
                          borderRadius: '0.875rem',
                          padding: '0.75rem',
                        }}>
                          <div style={{
                            fontSize: '0.65rem',
                            color: 'rgba(255,255,255,0.5)',
                            marginBottom: '0.25rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}>
                            Monthly
                          </div>
                          <div style={{ fontSize: '1.1rem', fontWeight: '900', color: 'white' }}>
                            ZiG {parseFloat(policy.premium_zig || 0).toLocaleString('en', { maximumFractionDigits: 0 })}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.1rem' }}>
                            US${policy.premium_usd}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.625rem' }}>
                        <button
                          onClick={() => {
                            setClaimingPolicy(policy);
                            setView('claim');
                          }}
                          style={{
                            flex: 1,
                            background: 'rgba(255,255,255,0.15)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '0.875rem',
                            padding: '0.75rem',
                            color: 'white',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.375rem',
                          }}
                        >
                          <FileText size={14} />
                          Claim
                        </button>
                        <button
                          onClick={() => handleCancel(policy.id)}
                          disabled={actionLoading}
                          style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '0.875rem',
                            padding: '0.75rem',
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Get covered CTA */}
        <button
          onClick={() => { setView('enroll'); setError(null); }}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #a8845a, #967554)',
            color: 'white',
            padding: '1rem 1.25rem',
            borderRadius: '1.25rem',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            textAlign: 'left',
            boxShadow: '0 8px 24px rgba(168,132,90,0.3)',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{
            width: '44px', height: '44px',
            borderRadius: '1rem',
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Shield size={22} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'white' }}>
              {activePolicies.length === 0 ? 'Get covered today' : 'Add more coverage'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)' }}>
              From ZiG {Math.round(2 * exchangeRate).toLocaleString()}/month · No medical exam
            </div>
          </div>
          <ChevronRight size={18} color="rgba(255,255,255,0.6)" />
        </button>

        {/* Plan overview cards */}
        <div style={{
          fontSize: '0.75rem',
          fontWeight: '700',
          color: '#78716c',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: '0.875rem',
        }}>
          Available Plans
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {plans.map((plan) => {
            const hasType = activeTypes.includes(plan.type);
            return (
              <div
                key={plan.id}
                style={{
                  background: 'rgba(255,255,255,0.8)',
                  borderRadius: '1.25rem',
                  padding: '1.125rem 1.25rem',
                  border: hasType
                    ? '1.5px solid rgba(116,140,61,0.3)'
                    : '1px solid rgba(168,132,90,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  opacity: hasType ? 0.7 : 1,
                }}
              >
                <div style={{
                  width: '40px', height: '40px',
                  borderRadius: '0.875rem',
                  background: plan.type === 'funeral'
                    ? 'linear-gradient(135deg, #3a2a1c, #6f5336)'
                    : 'linear-gradient(135deg, #1a3a2a, #2d6b4f)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {PLAN_ICONS[plan.type]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: '700',
                    color: '#1c1917',
                    marginBottom: '0.15rem',
                  }}>
                    {plan.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#78716c' }}>
                    ZiG {plan.premium_zig?.toLocaleString('en', { maximumFractionDigits: 0 })}/month
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#a8a29e' }}>
                    US${plan.premium_usd}/month · Cover: ZiG {plan.cover_zig?.toLocaleString('en', { maximumFractionDigits: 0 })}
                  </div>
                </div>
                {hasType
                  ? <CheckCircle size={18} color="#748c3d" />
                  : <ChevronRight size={16} color="#a8a29e" />
                }
              </div>
            );
          })}
        </div>

        {/* Why insurance */}
        <div style={{
          background: 'rgba(168,132,90,0.06)',
          borderRadius: '1.25rem',
          padding: '1.25rem',
          border: '1px solid rgba(168,132,90,0.12)',
        }}>
          <div style={{
            fontSize: '0.8rem',
            fontWeight: '700',
            color: '#a8845a',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.75rem',
          }}>
            Why BATANA insurance?
          </div>
          {[
            'No medical exam or paperwork to get started',
            'Claims processed in 48 hours, not weeks',
            'Pay monthly from your wallet - no bank needed',
            'Active insurance adds to your Vimbiso Score',
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              gap: '0.625rem',
              alignItems: 'flex-start',
              padding: '0.375rem 0',
            }}>
              <CheckCircle size={14} color="#748c3d" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={{ fontSize: '0.8rem', color: '#57534e', lineHeight: '1.5' }}>
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* BottomNav — home view */}
      <BottomNav />
    </div>
  );
}

// ── SHARED COMPONENTS ────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: '600',
  color: '#57534e',
  display: 'block',
  marginBottom: '0.5rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '1rem 1.25rem',
  borderRadius: '1rem',
  border: '1.5px solid rgba(168,132,90,0.25)',
  background: 'rgba(255,255,255,0.8)',
  fontSize: '1rem',
  color: '#1c1917',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

function PageShell({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
      maxWidth: '480px',
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <header style={{
        padding: '1.25rem 1.5rem',
        background: 'rgba(250,248,245,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(168,132,90,0.12)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#a8845a',
            padding: '0.25rem',
            display: 'flex',
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1rem', fontWeight: '800', color: '#1c1917' }}>{title}</div>
          {subtitle && (
            <div style={{ fontSize: '0.75rem', color: '#78716c' }}>{subtitle}</div>
          )}
        </div>
      </header>
      <div style={{
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        paddingBottom: '3rem',
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
      borderRadius: '0.875rem',
      padding: '1rem',
      display: 'flex',
      gap: '0.75rem',
      alignItems: 'flex-start',
    }}>
      <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
      <span style={{ fontSize: '0.875rem', color: '#dc2626' }}>{message}</span>
    </div>
  );
}

function SuccessBox({ message }: { message: string }) {
  return (
    <div style={{
      background: 'rgba(116,140,61,0.1)',
      border: '1px solid rgba(116,140,61,0.25)',
      borderRadius: '0.875rem',
      padding: '1rem',
      display: 'flex',
      gap: '0.75rem',
      alignItems: 'center',
    }}>
      <CheckCircle size={18} color="#748c3d" style={{ flexShrink: 0 }} />
      <span style={{ fontSize: '0.875rem', color: '#748c3d', fontWeight: '600' }}>{message}</span>
    </div>
  );
}

function SubmitButton({
  label,
  loading,
  onClick,
  icon,
  disabled = false,
}: {
  label: string;
  loading: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  disabled?: boolean;
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
        color: 'white',
        padding: '1rem',
        borderRadius: '1.25rem',
        border: 'none',
        fontSize: '1rem',
        fontWeight: '700',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        boxShadow: isDisabled ? 'none' : '0 8px 24px rgba(168,132,90,0.3)',
        marginTop: '0.5rem',
      }}
    >
      {loading
        ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
        : <>{icon} {label}</>
      }
    </button>
  );
}