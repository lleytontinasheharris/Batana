'use client';

import { useState } from 'react';
import {
  Eye, EyeOff, ArrowRight, ArrowLeft,
  Loader, AlertCircle, CheckCircle, X,
  Lock, Flag, Landmark, Globe,
} from 'lucide-react';
import BatanaLogo from '../components/BatanaLogo';
import { registerUser } from '../lib/api';

// ── Terms content ──────────────────────────────────────────
const TERMS_SECTIONS = [
  {
    title: '1. Who We Are',
    body: 'BATANA is a financial inclusion platform operated in partnership with ZB Bank Zimbabwe (licence holder). All deposits, loans, and insurance products are regulated under the Reserve Bank of Zimbabwe Act and administered by ZB Bank.',
  },
  {
    title: '2. Data We Collect',
    body: 'We collect your name, phone number, date of birth, national ID number, biometric photo (optional), and financial transaction data. This data is stored securely in encrypted databases hosted in the European Union (Supabase, GDPR-compliant).',
  },
  {
    title: '3. How We Use Your Data',
    body: 'Your data is used to: (a) calculate your Vimbiso Credit Score, (b) process loan applications, (c) manage your mukando group membership, (d) deliver insurance cover, (e) comply with KYC/AML obligations under Zimbabwean law. We do NOT sell your personal data to third parties.',
  },
  {
    title: '4. Credit Scoring',
    body: 'By registering, you consent to BATANA calculating and storing a Vimbiso Credit Score based on your transaction history, mukando contributions, and repayment behaviour. This score determines your loan eligibility and limit.',
  },
  {
    title: '5. Financial Risk',
    body: 'GROW investment pools carry risk. Returns are not guaranteed. ZiG savings are held in gold-gram equivalents and may fluctuate with gold prices. Loans accrue interest as disclosed at application. Insurance claims are subject to policy terms.',
  },
  {
    title: '6. Identity Verification',
    body: 'You consent to BATANA collecting and verifying your national ID or passport details. For loans above US$20, in-person identity verification at a BATANA agent point is required. False identity information may result in account termination and referral to authorities.',
  },
  {
    title: '7. USSD & SMS',
    body: 'By registering with your phone number, you consent to receive transactional SMS notifications. Standard network rates apply. USSD sessions (*227#) are charged at your network operator\'s rate.',
  },
  {
    title: '8. Account Termination',
    body: 'BATANA reserves the right to suspend accounts found to be engaging in fraud, money laundering, or violation of RBZ directives. Outstanding loan balances remain due regardless of account status.',
  },
  {
    title: '9. Governing Law',
    body: 'These terms are governed by the laws of Zimbabwe. Disputes shall be resolved through the Zimbabwe Financial Intelligence Unit or the courts of Zimbabwe.',
  },
  {
    title: '10. Updates',
    body: 'We may update these terms with 30 days\' notice via SMS. Continued use of BATANA after notice constitutes acceptance of updated terms.',
  },
];

const TRUST_TAGS = [
  { icon: Lock,     label: 'Data encrypted' },
  { icon: Flag,     label: 'RBZ regulated' },
  { icon: Landmark, label: 'ZB Bank custody' },
  { icon: Globe,    label: 'GDPR compliant' },
];

export default function Register() {
  const [step, setStep]               = useState<'form' | 'success'>('form');
  const [loading, setLoading]         = useState(false);
  const [errors, setErrors]           = useState<string[]>([]);
  const [showPin, setShowPin]         = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<any>(null);
  const [agreeTerms, setAgreeTerms]   = useState(false);
  const [showTerms, setShowTerms]     = useState(false);

  const [formData, setFormData] = useState({
    phone_number: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    pin: '',
    confirm_pin: '',
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    if (name === 'phone_number') {
      setFormData((p) => ({ ...p, [name]: value.replace(/\D/g, '').slice(0, 10) }));
    } else if (name === 'pin' || name === 'confirm_pin') {
      setFormData((p) => ({ ...p, [name]: value.replace(/\D/g, '').slice(0, 4) }));
    } else {
      setFormData((p) => ({ ...p, [name]: value }));
    }
    if (errors.length > 0) setErrors([]);
  }

  function validateForm() {
    const errs: string[] = [];
    if (!formData.phone_number || formData.phone_number.length < 10)
      errs.push('Valid 10-digit phone number is required');
    if (!formData.first_name || formData.first_name.length < 2)
      errs.push('First name must be at least 2 characters');
    if (!formData.last_name || formData.last_name.length < 2)
      errs.push('Last name must be at least 2 characters');
    if (!formData.date_of_birth) {
      errs.push('Date of birth is required');
    } else {
      const dob   = new Date(formData.date_of_birth);
      const today = new Date();
      const age   = today.getFullYear() - dob.getFullYear();
      const mDiff = today.getMonth() - dob.getMonth();
      if (age < 18 || (age === 18 && mDiff < 0))
        errs.push('You must be at least 18 years old');
      if (dob > today)
        errs.push('Date of birth cannot be in the future');
    }
    if (!formData.pin || formData.pin.length !== 4)
      errs.push('PIN must be exactly 4 digits');
    if (formData.pin !== formData.confirm_pin)
      errs.push('PINs do not match');
    if (!agreeTerms)
      errs.push('You must agree to the Terms & Conditions to continue');
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validateForm();
    if (validationErrors.length > 0) { setErrors(validationErrors); return; }

    try {
      setLoading(true);
      setErrors([]);
      const data = await registerUser({
        phone_number: formData.phone_number,
        first_name:   formData.first_name,
        last_name:    formData.last_name,
        date_of_birth: formData.date_of_birth,
        pin:          formData.pin,
      });
      localStorage.setItem('batana_token', data.token);
      localStorage.setItem('batana_phone', formData.phone_number);
      setRegisteredUser(data);
      setStep('success');
    } catch (err: any) {
      setErrors([err.message || 'Registration failed. Please try again.']);
    } finally {
      setLoading(false);
    }
  }

  // ── STYLES ────────────────────────────────────────────────
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

  const labelStyle: React.CSSProperties = {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#57534e',
    display: 'block',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  // ── SUCCESS STATE ─────────────────────────────────────────
  if (step === 'success') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
        maxWidth: '480px', margin: '0 auto',
        padding: '2rem 1.5rem',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: 'rgba(116,140,61,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '1.5rem',
        }}>
          <CheckCircle size={44} color="#748c3d" />
        </div>

        <h1 style={{
          fontSize: '1.75rem', fontWeight: '800',
          color: '#1c1917', textAlign: 'center', marginBottom: '0.75rem',
        }}>
          Welcome to BATANA
        </h1>

        <p style={{
          fontSize: '1rem', color: '#57534e',
          textAlign: 'center', marginBottom: '0.5rem', lineHeight: '1.6',
        }}>
          {registeredUser?.user?.first_name}, your account is ready.
        </p>

        <p style={{
          fontSize: '0.875rem', color: '#78716c',
          textAlign: 'center', marginBottom: '2.5rem', lineHeight: '1.6',
        }}>
          Browse BATANA freely. To unlock savings, loans, and insurance —
          verify your identity with a national ID or passport.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
          <button
            onClick={() => { window.location.href = '/dashboard'; }}
            style={{
              background: 'linear-gradient(135deg, #a8845a, #967554)',
              color: 'white', padding: '1rem', borderRadius: '1.25rem',
              border: 'none', fontSize: '1rem', fontWeight: '700',
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              boxShadow: '0 8px 24px rgba(168,132,90,0.3)',
            }}
          >
            Go to Dashboard <ArrowRight size={18} />
          </button>

          <button
            onClick={() => { window.location.href = '/verify'; }}
            style={{
              background: 'rgba(255,255,255,0.9)',
              color: '#a8845a', padding: '1rem', borderRadius: '1.25rem',
              border: '1.5px solid #d4c0a3', fontSize: '1rem', fontWeight: '600',
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            }}
          >
            Verify Identity Now <ArrowRight size={18} />
          </button>
        </div>

        <div style={{
          marginTop: '2rem', padding: '1rem 1.25rem',
          background: 'rgba(116,140,61,0.08)',
          border: '1px solid rgba(116,140,61,0.2)',
          borderRadius: '1rem', fontSize: '0.8rem',
          color: '#57534e', textAlign: 'center', lineHeight: '1.6',
        }}>
          <strong style={{ color: '#748c3d' }}>Unverified Account:</strong>{' '}
          You can browse rates, view mukando groups, and check gold prices.
          Full financial features require identity verification.
        </div>
      </div>
    );
  }

  // ── FORM STATE ────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
      maxWidth: '480px', margin: '0 auto',
      padding: '1.5rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Background blobs */}
      <div style={{
        position: 'fixed', top: '-10%', right: '-10%',
        width: '300px', height: '300px',
        background: 'radial-gradient(circle, rgba(168,132,90,0.15), transparent)',
        borderRadius: '50%', filter: 'blur(40px)',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'fixed', bottom: '10%', left: '-10%',
        width: '250px', height: '250px',
        background: 'radial-gradient(circle, rgba(168,132,90,0.1), transparent)',
        borderRadius: '50%', filter: 'blur(40px)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Back */}
        <button
          onClick={() => window.history.back()}
          style={{
            background: 'none', border: 'none', color: '#a8845a',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            fontSize: '0.875rem', fontWeight: '600',
            cursor: 'pointer', marginBottom: '2rem',
          }}
        >
          <ArrowLeft size={18} /> Back
        </button>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <BatanaLogo size={40} />
          <div>
            <div style={{
              fontSize: '1.5rem', fontWeight: '900',
              color: '#3a2a1c', letterSpacing: '0.08em', lineHeight: '1',
            }}>
              BATANA
            </div>
            <div style={{ fontSize: '0.75rem', color: '#a8845a', fontStyle: 'italic' }}>
              building together
            </div>
          </div>
        </div>

        {/* Heading */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '1.75rem', fontWeight: '800',
            color: '#1c1917', marginBottom: '0.5rem', lineHeight: '1.2',
          }}>
            Create your account
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#78716c' }}>
            Join Zimbabwe's community finance platform
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Errors */}
          {errors.length > 0 && (
            <div style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '0.875rem', padding: '1rem',
              display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
            }}>
              <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                {errors.map((err, i) => (
                  <div key={i} style={{
                    fontSize: '0.875rem', color: '#dc2626',
                    marginBottom: i < errors.length - 1 ? '0.375rem' : 0,
                  }}>
                    {err}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phone */}
          <div>
            <label style={labelStyle}>Phone Number</label>
            <input
              type="tel" name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              placeholder="07X XXX XXXX" maxLength={10}
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#a8845a'; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(168,132,90,0.25)'; }}
            />
          </div>

          {/* Name row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
            <div>
              <label style={labelStyle}>First Name</label>
              <input
                type="text" name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="Tendai"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#a8845a'; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(168,132,90,0.25)'; }}
              />
            </div>
            <div>
              <label style={labelStyle}>Last Name</label>
              <input
                type="text" name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Moyo"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#a8845a'; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(168,132,90,0.25)'; }}
              />
            </div>
          </div>

          {/* DOB */}
          <div>
            <label style={labelStyle}>Date of Birth</label>
            <input
              type="date" name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#a8845a'; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(168,132,90,0.25)'; }}
            />
            <p style={{ fontSize: '0.72rem', color: '#a8a29e', marginTop: '0.375rem', marginBottom: 0 }}>
              Must be 18 or older to register
            </p>
          </div>

          {/* PIN */}
          <div>
            <label style={labelStyle}>Create PIN</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPin ? 'text' : 'password'}
                name="pin" value={formData.pin}
                onChange={handleChange}
                placeholder="••••" maxLength={4}
                inputMode="numeric"
                style={{
                  ...inputStyle,
                  paddingRight: '3rem',
                  fontSize: '1.5rem',
                  letterSpacing: '0.5rem',
                  textAlign: 'center',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#a8845a'; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(168,132,90,0.25)'; }}
              />
              <button
                type="button" onClick={() => setShowPin((v) => !v)}
                style={{
                  position: 'absolute', right: '1rem', top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  cursor: 'pointer', color: '#78716c', padding: '0.25rem',
                }}
              >
                {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Confirm PIN */}
          <div>
            <label style={labelStyle}>Confirm PIN</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPin ? 'text' : 'password'}
                name="confirm_pin" value={formData.confirm_pin}
                onChange={handleChange}
                placeholder="••••" maxLength={4}
                inputMode="numeric"
                style={{
                  ...inputStyle,
                  paddingRight: '3rem',
                  fontSize: '1.5rem',
                  letterSpacing: '0.5rem',
                  textAlign: 'center',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#a8845a'; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(168,132,90,0.25)'; }}
              />
              <button
                type="button" onClick={() => setShowConfirmPin((v) => !v)}
                style={{
                  position: 'absolute', right: '1rem', top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  cursor: 'pointer', color: '#78716c', padding: '0.25rem',
                }}
              >
                {showConfirmPin ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {formData.pin.length === 4 && formData.confirm_pin.length === 4 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                marginTop: '0.5rem', fontSize: '0.75rem',
                color: formData.pin === formData.confirm_pin ? '#748c3d' : '#dc2626',
              }}>
                {formData.pin === formData.confirm_pin
                  ? <><CheckCircle size={13} /> PINs match</>
                  : <><AlertCircle size={13} /> PINs do not match</>
                }
              </div>
            )}
          </div>

          {/* ── TERMS & CONDITIONS ── */}
          <div style={{
            background: 'rgba(255,255,255,0.7)',
            borderRadius: '1.125rem',
            border: agreeTerms
              ? '1.5px solid rgba(116,140,61,0.4)'
              : '1.5px solid rgba(168,132,90,0.2)',
            padding: '1rem 1.125rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
              {/* Custom checkbox */}
              <button
                type="button"
                onClick={() => setAgreeTerms((v) => !v)}
                style={{
                  width: '22px', height: '22px', borderRadius: '6px',
                  border: agreeTerms
                    ? '2px solid #748c3d'
                    : '2px solid rgba(168,132,90,0.35)',
                  background: agreeTerms ? '#748c3d' : 'rgba(255,255,255,0.9)',
                  cursor: 'pointer', flexShrink: 0, marginTop: '1px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
              >
                {agreeTerms && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="white" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>

              <div style={{ flex: 1 }}>
                <p style={{
                  fontSize: '0.825rem', color: '#57534e',
                  lineHeight: '1.55', margin: 0,
                }}>
                  I have read and agree to BATANA's{' '}
                  <button
                    type="button"
                    onClick={() => setShowTerms(true)}
                    style={{
                      background: 'none', border: 'none',
                      color: '#a8845a', fontWeight: '700',
                      fontSize: '0.825rem', cursor: 'pointer',
                      textDecoration: 'underline', padding: 0,
                      fontFamily: 'inherit',
                    }}
                  >
                    Terms & Conditions
                  </button>
                  {' '}and{' '}
                  <button
                    type="button"
                    onClick={() => setShowTerms(true)}
                    style={{
                      background: 'none', border: 'none',
                      color: '#a8845a', fontWeight: '700',
                      fontSize: '0.825rem', cursor: 'pointer',
                      textDecoration: 'underline', padding: 0,
                      fontFamily: 'inherit',
                    }}
                  >
                    Privacy Policy
                  </button>
                  , including the collection and processing of my personal and
                  financial data for the purposes described therein.
                </p>

                {/* Trust tags — icon + label, no emojis */}
                <div style={{
                  marginTop: '0.75rem',
                  display: 'flex', flexWrap: 'wrap', gap: '0.375rem',
                }}>
                  {TRUST_TAGS.map(({ icon: Icon, label }) => (
                    <span key={label} style={{
                      fontSize: '0.65rem', fontWeight: '600',
                      color: '#78716c',
                      background: 'rgba(168,132,90,0.08)',
                      padding: '0.2rem 0.5rem 0.2rem 0.375rem',
                      borderRadius: '2rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}>
                      <Icon size={10} strokeWidth={2} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !agreeTerms}
            style={{
              background: loading || !agreeTerms
                ? 'rgba(168,132,90,0.4)'
                : 'linear-gradient(135deg, #a8845a, #967554)',
              color: 'white', padding: '1rem',
              borderRadius: '1.25rem', border: 'none',
              fontSize: '1rem', fontWeight: '700',
              cursor: loading || !agreeTerms ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '0.5rem',
              boxShadow: loading || !agreeTerms
                ? 'none'
                : '0 8px 24px rgba(168,132,90,0.3)',
              transition: 'all 0.3s', marginTop: '0.25rem',
            }}
          >
            {loading
              ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Creating Account…</>
              : <><ArrowRight size={18} /> Create Account</>
            }
          </button>

          <p style={{
            textAlign: 'center', fontSize: '0.875rem',
            color: '#78716c', marginTop: '0.25rem',
          }}>
            Already have an account?{' '}
            <a href="/login" style={{ color: '#a8845a', fontWeight: '600', textDecoration: 'none' }}>
              Sign in here
            </a>
          </p>
        </form>
      </div>

      {/* ── TERMS MODAL ── */}
      {showTerms && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'flex-end',
          justifyContent: 'center',
        }}>
          <div style={{
            background: '#faf8f5',
            borderRadius: '1.75rem 1.75rem 0 0',
            width: '100%', maxWidth: '480px',
            maxHeight: '88vh',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(168,132,90,0.12)',
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', flexShrink: 0,
            }}>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: '800', color: '#1c1917' }}>
                  Terms & Conditions
                </div>
                <div style={{ fontSize: '0.72rem', color: '#78716c' }}>
                  BATANA Financial Platform · ZB Bank Partnership
                </div>
              </div>
              <button
                onClick={() => setShowTerms(false)}
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

            {/* Scrollable content */}
            <div style={{
              overflowY: 'auto', padding: '1.25rem 1.5rem',
              flex: 1,
            }}>
              <p style={{
                fontSize: '0.8rem', color: '#78716c',
                lineHeight: '1.6', marginBottom: '1.25rem',
                padding: '0.875rem 1rem',
                background: 'rgba(168,132,90,0.06)',
                borderRadius: '0.875rem',
                border: '1px solid rgba(168,132,90,0.12)',
              }}>
                Last updated: June 2025. These terms govern your use of the BATANA
                platform and all associated financial services. Please read carefully
                before creating an account.
              </p>

              {TERMS_SECTIONS.map((section, i) => (
                <div key={i} style={{ marginBottom: '1.25rem' }}>
                  <div style={{
                    fontSize: '0.825rem', fontWeight: '800',
                    color: '#3a2a1c', marginBottom: '0.5rem',
                  }}>
                    {section.title}
                  </div>
                  <p style={{
                    fontSize: '0.8rem', color: '#57534e',
                    lineHeight: '1.7', margin: 0,
                  }}>
                    {section.body}
                  </p>
                </div>
              ))}

              <div style={{
                padding: '1rem', marginTop: '0.5rem',
                background: 'rgba(116,140,61,0.06)',
                borderRadius: '1rem',
                border: '1px solid rgba(116,140,61,0.15)',
                fontSize: '0.8rem', color: '#57534e',
                lineHeight: '1.6',
              }}>
                <strong style={{ color: '#748c3d' }}>Contact:</strong> For data
                requests, account issues, or complaints contact{' '}
                <span style={{ color: '#a8845a', fontWeight: '600' }}>
                  support@batana.co.zw
                </span>{' '}
                or visit any ZB Bank branch.
              </div>
            </div>

            {/* Accept button */}
            <div style={{
              padding: '1.125rem 1.5rem',
              borderTop: '1px solid rgba(168,132,90,0.12)',
              flexShrink: 0,
              background: '#faf8f5',
            }}>
              <button
                onClick={() => { setAgreeTerms(true); setShowTerms(false); }}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #a8845a, #967554)',
                  color: 'white', padding: '1rem',
                  borderRadius: '1.25rem', border: 'none',
                  fontSize: '1rem', fontWeight: '700',
                  cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  boxShadow: '0 8px 24px rgba(168,132,90,0.3)',
                }}
              >
                <CheckCircle size={18} />
                I Agree - Continue Registration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}