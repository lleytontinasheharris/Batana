'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Shield,
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  AlertCircle,
  Loader,
  Camera,
  FileText,
} from 'lucide-react';
import BatanaLogo from '../components/BatanaLogo';
import {
  submitVerification,
  getVerificationStatus,
} from '../lib/api';

type VerificationStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';

type Step = 'status' | 'choose_doc' | 'upload' | 'review' | 'submitted';

export default function VerifyPage() {
  const [step, setStep] = useState<Step>('status');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('not_submitted');
  const [verificationData, setVerificationData] = useState<any>(null);

  // Form state
  const [docType, setDocType] = useState<'national_id' | 'passport'>('national_id');
  const [docNumber, setDocNumber] = useState('');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [frontFileName, setFrontFileName] = useState('');
  const [backFileName, setBackFileName] = useState('');

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const getToken = () => {
    if (typeof window !== 'undefined') return localStorage.getItem('batana_token');
    return null;
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      window.location.href = '/login';
      return;
    }
    loadStatus(token);
  }, []);

  async function loadStatus(token: string) {
    try {
      setLoading(true);
      const data = await getVerificationStatus(token);
      setVerificationData(data);
      setVerificationStatus(data.verification_status as VerificationStatus);
    } catch (err: any) {
      // If error is auth-related, redirect
      if (err.message?.includes('token') || err.message?.includes('expired')) {
        window.location.href = '/login';
      }
      // Otherwise assume not submitted
      setVerificationStatus('not_submitted');
    } finally {
      setLoading(false);
    }
  }

  // Convert file to base64
  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  }

  async function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    side: 'front' | 'back'
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, etc.)');
      return;
    }

    // Validate file size — max 2MB
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be smaller than 2MB');
      return;
    }

    setError(null);

    try {
      const base64 = await fileToBase64(file);
      if (side === 'front') {
        setFrontImage(base64);
        setFrontFileName(file.name);
      } else {
        setBackImage(base64);
        setBackFileName(file.name);
      }
    } catch {
      setError('Failed to process image. Please try again.');
    }
  }

  function canProceedToReview() {
    if (!docNumber || docNumber.length < 5) return false;
    if (!frontImage) return false;
    if (docType === 'national_id' && !backImage) return false;
    return true;
  }

  async function handleSubmit() {
    const token = getToken();
    if (!token) return;

    try {
      setSubmitting(true);
      setError(null);

      await submitVerification(token, {
        document_type: docType,
        document_number: docNumber,
        document_front_base64: frontImage!,
        document_back_base64: backImage || undefined,
      });

      setVerificationStatus('pending');
      setStep('submitted');
    } catch (err: any) {
      setError(err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ─── LOADING ───────────────────────────────────────────────
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
        <BatanaLogo size={48} />
        <Loader size={24} color="#a8845a" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ─── SUBMITTED SUCCESS ─────────────────────────────────────
  if (step === 'submitted' || verificationStatus === 'pending') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
        maxWidth: '480px',
        margin: '0 auto',
        padding: '2rem 1.5rem',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(234, 179, 8, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
        }}>
          <Clock size={40} color="#ca8a04" />
        </div>

        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: '800',
          color: '#1c1917',
          marginBottom: '1rem',
        }}>
          Under Review
        </h1>

        <p style={{
          fontSize: '0.9375rem',
          color: '#57534e',
          lineHeight: '1.7',
          marginBottom: '0.75rem',
          maxWidth: '320px',
        }}>
          Your identity documents have been submitted. Our team will review them within <strong>24 hours</strong>.
        </p>

        <p style={{
          fontSize: '0.8125rem',
          color: '#78716c',
          lineHeight: '1.6',
          marginBottom: '2.5rem',
          maxWidth: '300px',
        }}>
          You'll have full access to all BATANA features once approved.
        </p>

        {/* Status timeline */}
        <div style={{
          width: '100%',
          background: 'rgba(255,255,255,0.8)',
          borderRadius: '1.25rem',
          padding: '1.5rem',
          border: '1px solid rgba(168,132,90,0.15)',
          marginBottom: '2rem',
          textAlign: 'left',
        }}>
          {[
            { label: 'Documents submitted', done: true },
            { label: 'Under admin review', done: false, active: true },
            { label: 'Identity verified', done: false },
            { label: 'Full access unlocked', done: false },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '0.625rem 0',
              borderBottom: i < 3 ? '1px solid rgba(168,132,90,0.1)' : 'none',
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                flexShrink: 0,
                background: item.done
                  ? '#748c3d'
                  : item.active
                  ? '#ca8a04'
                  : 'rgba(168,132,90,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {item.done ? (
                  <CheckCircle size={14} color="white" />
                ) : item.active ? (
                  <Clock size={12} color="white" />
                ) : (
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'rgba(168,132,90,0.4)',
                  }} />
                )}
              </div>
              <span style={{
                fontSize: '0.875rem',
                fontWeight: item.active ? '600' : '500',
                color: item.done
                  ? '#748c3d'
                  : item.active
                  ? '#ca8a04'
                  : '#a8a29e',
              }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={() => window.location.href = '/dashboard'}
          style={{
            background: 'linear-gradient(135deg, #a8845a, #967554)',
            color: 'white',
            padding: '1rem 2rem',
            borderRadius: '1.25rem',
            border: 'none',
            fontSize: '1rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 8px 24px rgba(168,132,90,0.3)',
          }}
        >
          Back to Dashboard
          <ChevronRight size={18} />
        </button>
      </div>
    );
  }

  // ─── APPROVED ──────────────────────────────────────────────
  if (verificationStatus === 'approved') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
        maxWidth: '480px',
        margin: '0 auto',
        padding: '2rem 1.5rem',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(116, 140, 61, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
        }}>
          <CheckCircle size={40} color="#748c3d" />
        </div>

        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: '800',
          color: '#1c1917',
          marginBottom: '1rem',
        }}>
          Verified ✓
        </h1>

        <p style={{
          fontSize: '0.9375rem',
          color: '#57534e',
          lineHeight: '1.7',
          marginBottom: '2.5rem',
          maxWidth: '300px',
        }}>
          Your identity has been verified. You have full access to all BATANA features.
        </p>

        <button
          onClick={() => window.location.href = '/dashboard'}
          style={{
            background: 'linear-gradient(135deg, #748c3d, #5d7030)',
            color: 'white',
            padding: '1rem 2rem',
            borderRadius: '1.25rem',
            border: 'none',
            fontSize: '1rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 8px 24px rgba(116,140,61,0.3)',
          }}
        >
          Go to Dashboard
          <ChevronRight size={18} />
        </button>
      </div>
    );
  }

  // ─── REJECTED ──────────────────────────────────────────────
  if (verificationStatus === 'rejected' && step === 'status') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
        maxWidth: '480px',
        margin: '0 auto',
        padding: '2rem 1.5rem',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
        }}>
          <XCircle size={40} color="#dc2626" />
        </div>

        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: '800',
          color: '#1c1917',
          marginBottom: '1rem',
        }}>
          Verification Rejected
        </h1>

        {verificationData?.rejection_reason && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '1rem',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            width: '100%',
            textAlign: 'left',
          }}>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              color: '#dc2626',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem',
            }}>
              Reason
            </div>
            <div style={{
              fontSize: '0.9rem',
              color: '#7f1d1d',
              lineHeight: '1.6',
            }}>
              {verificationData.rejection_reason}
            </div>
          </div>
        )}

        <p style={{
          fontSize: '0.875rem',
          color: '#78716c',
          lineHeight: '1.6',
          marginBottom: '2rem',
        }}>
          Please fix the issue above and resubmit your documents.
        </p>

        <button
          onClick={() => {
            setFrontImage(null);
            setBackImage(null);
            setDocNumber('');
            setFrontFileName('');
            setBackFileName('');
            setStep('choose_doc');
          }}
          style={{
            background: 'linear-gradient(135deg, #a8845a, #967554)',
            color: 'white',
            padding: '1rem 2rem',
            borderRadius: '1.25rem',
            border: 'none',
            fontSize: '1rem',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(168,132,90,0.3)',
            marginBottom: '1rem',
            width: '100%',
          }}
        >
          Resubmit Documents
        </button>

        <button
          onClick={() => window.location.href = '/dashboard'}
          style={{
            background: 'transparent',
            color: '#78716c',
            padding: '1rem',
            borderRadius: '1.25rem',
            border: '1.5px solid rgba(168,132,90,0.25)',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // ─── STEP: CHOOSE DOCUMENT TYPE ────────────────────────────
  if (step === 'choose_doc') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
        maxWidth: '480px',
        margin: '0 auto',
        padding: '1.5rem',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <button
          onClick={() => setStep('status')}
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

        {/* Progress */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '2rem',
        }}>
          {[1, 2, 3].map((n) => (
            <div key={n} style={{
              height: '4px',
              flex: 1,
              borderRadius: '2px',
              background: n === 1 ? '#a8845a' : 'rgba(168,132,90,0.2)',
            }} />
          ))}
        </div>

        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: '800',
          color: '#1c1917',
          marginBottom: '0.5rem',
        }}>
          Choose document type
        </h1>
        <p style={{
          fontSize: '0.875rem',
          color: '#78716c',
          marginBottom: '2rem',
          lineHeight: '1.6',
        }}>
          Select the identity document you'll use to verify your account.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          {[
            {
              type: 'national_id' as const,
              title: 'National ID',
              subtitle: 'Zimbabwean National Registration Card',
              note: 'Front + back photo required',
            },
            {
              type: 'passport' as const,
              title: 'Passport',
              subtitle: 'Valid Zimbabwean or foreign passport',
              note: 'Photo page only',
            },
          ].map((option) => {
            const selected = docType === option.type;
            return (
              <button
                key={option.type}
                onClick={() => setDocType(option.type)}
                style={{
                  background: selected
                    ? 'rgba(168,132,90,0.08)'
                    : 'rgba(255,255,255,0.8)',
                  border: selected
                    ? '2px solid #a8845a'
                    : '1.5px solid rgba(168,132,90,0.2)',
                  borderRadius: '1.25rem',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '1rem',
                  background: selected
                    ? 'rgba(168,132,90,0.15)'
                    : 'rgba(168,132,90,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <FileText size={22} color="#a8845a" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: '#1c1917',
                    marginBottom: '0.25rem',
                  }}>
                    {option.title}
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#78716c',
                    marginBottom: '0.25rem',
                  }}>
                    {option.subtitle}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#a8845a',
                    fontWeight: '600',
                  }}>
                    {option.note}
                  </div>
                </div>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: selected ? '6px solid #a8845a' : '2px solid rgba(168,132,90,0.3)',
                  flexShrink: 0,
                  transition: 'all 0.2s',
                }} />
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setStep('upload')}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #a8845a, #967554)',
            color: 'white',
            padding: '1rem',
            borderRadius: '1.25rem',
            border: 'none',
            fontSize: '1rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxShadow: '0 8px 24px rgba(168,132,90,0.3)',
          }}
        >
          Continue
          <ChevronRight size={18} />
        </button>
      </div>
    );
  }

  // ─── STEP: UPLOAD ──────────────────────────────────────────
  if (step === 'upload') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
        maxWidth: '480px',
        margin: '0 auto',
        padding: '1.5rem',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <button
          onClick={() => setStep('choose_doc')}
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

        {/* Progress */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
          {[1, 2, 3].map((n) => (
            <div key={n} style={{
              height: '4px',
              flex: 1,
              borderRadius: '2px',
              background: n <= 2 ? '#a8845a' : 'rgba(168,132,90,0.2)',
            }} />
          ))}
        </div>

        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: '800',
          color: '#1c1917',
          marginBottom: '0.5rem',
        }}>
          Upload your {docType === 'national_id' ? 'National ID' : 'Passport'}
        </h1>
        <p style={{
          fontSize: '0.875rem',
          color: '#78716c',
          marginBottom: '2rem',
          lineHeight: '1.6',
        }}>
          Make sure photos are clear, well-lit, and all text is readable.
        </p>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '0.875rem',
            padding: '1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start',
          }}>
            <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.875rem', color: '#dc2626' }}>{error}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>

          {/* Document number */}
          <div>
            <label style={{
              fontSize: '0.8rem',
              fontWeight: '600',
              color: '#57534e',
              display: 'block',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {docType === 'national_id' ? 'National ID Number' : 'Passport Number'}
            </label>
            <input
              type="text"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value.toUpperCase())}
              placeholder={docType === 'national_id' ? 'e.g. 63-123456A78' : 'e.g. FN123456'}
              style={{
                width: '100%',
                padding: '1rem 1.25rem',
                borderRadius: '1rem',
                border: '1.5px solid rgba(168,132,90,0.25)',
                background: 'rgba(255,255,255,0.8)',
                fontSize: '1rem',
                color: '#1c1917',
                outline: 'none',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
                letterSpacing: '0.05em',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#a8845a'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(168,132,90,0.25)'; }}
            />
          </div>

          {/* Front photo */}
          <div>
            <label style={{
              fontSize: '0.8rem',
              fontWeight: '600',
              color: '#57534e',
              display: 'block',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {docType === 'national_id' ? 'Front of ID' : 'Photo Page'}
            </label>
            <input
              ref={frontInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleImageUpload(e, 'front')}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => frontInputRef.current?.click()}
              style={{
                width: '100%',
                padding: '1.5rem',
                borderRadius: '1rem',
                border: frontImage
                  ? '2px solid #748c3d'
                  : '2px dashed rgba(168,132,90,0.35)',
                background: frontImage
                  ? 'rgba(116,140,61,0.06)'
                  : 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                transition: 'all 0.2s',
                boxSizing: 'border-box',
              }}
            >
              {frontImage ? (
                <>
                  <CheckCircle size={28} color="#748c3d" />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#748c3d' }}>
                      Photo uploaded
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#78716c', marginTop: '0.25rem' }}>
                      {frontFileName}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#a8845a' }}>
                    Tap to replace
                  </div>
                </>
              ) : (
                <>
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '1rem',
                    background: 'rgba(168,132,90,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Camera size={24} color="#a8845a" />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#57534e' }}>
                      Take or upload photo
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#78716c', marginTop: '0.25rem' }}>
                      JPG, PNG · Max 2MB
                    </div>
                  </div>
                </>
              )}
            </button>
          </div>

          {/* Back photo — National ID only */}
          {docType === 'national_id' && (
            <div>
              <label style={{
                fontSize: '0.8rem',
                fontWeight: '600',
                color: '#57534e',
                display: 'block',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Back of ID
              </label>
              <input
                ref={backInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleImageUpload(e, 'back')}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => backInputRef.current?.click()}
                style={{
                  width: '100%',
                  padding: '1.5rem',
                  borderRadius: '1rem',
                  border: backImage
                    ? '2px solid #748c3d'
                    : '2px dashed rgba(168,132,90,0.35)',
                  background: backImage
                    ? 'rgba(116,140,61,0.06)'
                    : 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                }}
              >
                {backImage ? (
                  <>
                    <CheckCircle size={28} color="#748c3d" />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#748c3d' }}>
                        Photo uploaded
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#78716c', marginTop: '0.25rem' }}>
                        {backFileName}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#a8845a' }}>Tap to replace</div>
                  </>
                ) : (
                  <>
                    <div style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '1rem',
                      background: 'rgba(168,132,90,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Camera size={24} color="#a8845a" />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#57534e' }}>
                        Take or upload photo
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#78716c', marginTop: '0.25rem' }}>
                        JPG, PNG · Max 2MB
                      </div>
                    </div>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => setStep('review')}
          disabled={!canProceedToReview()}
          style={{
            width: '100%',
            background: canProceedToReview()
              ? 'linear-gradient(135deg, #a8845a, #967554)'
              : 'rgba(168,132,90,0.3)',
            color: 'white',
            padding: '1rem',
            borderRadius: '1.25rem',
            border: 'none',
            fontSize: '1rem',
            fontWeight: '700',
            cursor: canProceedToReview() ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxShadow: canProceedToReview() ? '0 8px 24px rgba(168,132,90,0.3)' : 'none',
          }}
        >
          Review & Submit
          <ChevronRight size={18} />
        </button>
      </div>
    );
  }

  // ─── STEP: REVIEW ──────────────────────────────────────────
  if (step === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
        maxWidth: '480px',
        margin: '0 auto',
        padding: '1.5rem',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <button
          onClick={() => setStep('upload')}
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

        {/* Progress */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
          {[1, 2, 3].map((n) => (
            <div key={n} style={{
              height: '4px',
              flex: 1,
              borderRadius: '2px',
              background: '#a8845a',
            }} />
          ))}
        </div>

        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: '800',
          color: '#1c1917',
          marginBottom: '0.5rem',
        }}>
          Review and confirm
        </h1>
        <p style={{
          fontSize: '0.875rem',
          color: '#78716c',
          marginBottom: '2rem',
          lineHeight: '1.6',
        }}>
          Check everything looks correct before submitting.
        </p>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '0.875rem',
            padding: '1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start',
          }}>
            <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.875rem', color: '#dc2626' }}>{error}</span>
          </div>
        )}

        <div style={{
          background: 'rgba(255,255,255,0.8)',
          borderRadius: '1.25rem',
          padding: '1.5rem',
          border: '1px solid rgba(168,132,90,0.15)',
          marginBottom: '1.5rem',
        }}>
          {[
            {
              label: 'Document Type',
              value: docType === 'national_id' ? 'National ID' : 'Passport',
            },
            { label: 'Document Number', value: docNumber },
            { label: 'Front Photo', value: frontFileName || 'Uploaded' },
            ...(docType === 'national_id'
              ? [{ label: 'Back Photo', value: backFileName || 'Uploaded' }]
              : []),
          ].map((item, i, arr) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 0',
                borderBottom: i < arr.length - 1 ? '1px solid rgba(168,132,90,0.1)' : 'none',
              }}
            >
              <span style={{ fontSize: '0.875rem', color: '#78716c' }}>{item.label}</span>
              <span style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#1c1917',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
              }}>
                {item.value.includes('.')
                  ? <><CheckCircle size={14} color="#748c3d" /> {item.value}</>
                  : item.value}
              </span>
            </div>
          ))}
        </div>

        {/* Privacy note */}
        <div style={{
          background: 'rgba(168,132,90,0.06)',
          border: '1px solid rgba(168,132,90,0.15)',
          borderRadius: '1rem',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start',
        }}>
          <Shield size={18} color="#a8845a" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{
            fontSize: '0.8rem',
            color: '#57534e',
            lineHeight: '1.6',
            margin: 0,
          }}>
            Your documents are reviewed only by authorized BATANA staff. Photos may be deleted after approval. We never share your ID with third parties.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: '100%',
            background: submitting
              ? 'rgba(168,132,90,0.5)'
              : 'linear-gradient(135deg, #a8845a, #967554)',
            color: 'white',
            padding: '1rem',
            borderRadius: '1.25rem',
            border: 'none',
            fontSize: '1rem',
            fontWeight: '700',
            cursor: submitting ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxShadow: submitting ? 'none' : '0 8px 24px rgba(168,132,90,0.3)',
          }}
        >
          {submitting ? (
            <>
              <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
              Submitting...
            </>
          ) : (
            <>
              <Upload size={18} />
              Submit for Verification
            </>
          )}
        </button>

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ─── DEFAULT: NOT SUBMITTED ────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
      maxWidth: '480px',
      margin: '0 auto',
      padding: '1.5rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <button
        onClick={() => window.location.href = '/dashboard'}
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
        Back to Dashboard
      </button>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #3a2a1c, #6f5336)',
        borderRadius: '1.75rem',
        padding: '2rem',
        marginBottom: '2rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: '-40px', right: '-40px',
          width: '180px', height: '180px',
          background: 'radial-gradient(circle, rgba(168,132,90,0.3), transparent)',
          borderRadius: '50%',
        }} />
        <Shield size={36} color="#f59e0b" style={{ marginBottom: '1rem', position: 'relative', zIndex: 1 }} />
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: '800',
          color: 'white',
          marginBottom: '0.5rem',
          position: 'relative',
          zIndex: 1,
        }}>
          Verify Your Identity
        </h1>
        <p style={{
          fontSize: '0.875rem',
          color: 'rgba(255,255,255,0.7)',
          lineHeight: '1.6',
          position: 'relative',
          zIndex: 1,
        }}>
          One-time verification to unlock savings, loans, mukando, and insurance.
        </p>
      </div>

      {/* What you unlock */}
      <div style={{
        background: 'rgba(255,255,255,0.8)',
        borderRadius: '1.25rem',
        padding: '1.5rem',
        border: '1px solid rgba(168,132,90,0.15)',
        marginBottom: '1.5rem',
      }}>
        <div style={{
          fontSize: '0.75rem',
          fontWeight: '700',
          color: '#78716c',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: '1rem',
        }}>
          What you unlock
        </div>
        {[
          'Deposit and withdraw money',
          'Join or create mukando groups',
          'Apply for loans up to US$500',
          'Get funeral and hospital insurance',
          'Build your Vimbiso Score',
          'Send money to anyone',
        ].map((item) => (
          <div key={item} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.5rem 0',
          }}>
            <CheckCircle size={16} color="#748c3d" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.875rem', color: '#57534e' }}>{item}</span>
          </div>
        ))}
      </div>

      {/* What you need */}
      <div style={{
        background: 'rgba(255,255,255,0.8)',
        borderRadius: '1.25rem',
        padding: '1.5rem',
        border: '1px solid rgba(168,132,90,0.15)',
        marginBottom: '2rem',
      }}>
        <div style={{
          fontSize: '0.75rem',
          fontWeight: '700',
          color: '#78716c',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: '1rem',
        }}>
          What you need
        </div>
        {[
          'National ID card (front + back)',
          'Or a valid passport (photo page)',
          'Clear, well-lit photos',
        ].map((item) => (
          <div key={item} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.5rem 0',
          }}>
            <div style={{
              width: '6px', height: '6px',
              borderRadius: '50%',
              background: '#a8845a',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: '0.875rem', color: '#57534e' }}>{item}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => setStep('choose_doc')}
        style={{
          width: '100%',
          background: 'linear-gradient(135deg, #a8845a, #967554)',
          color: 'white',
          padding: '1rem',
          borderRadius: '1.25rem',
          border: 'none',
          fontSize: '1rem',
          fontWeight: '700',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          boxShadow: '0 8px 24px rgba(168,132,90,0.3)',
          marginBottom: '1rem',
        }}
      >
        Start Verification
        <ChevronRight size={18} />
      </button>

      <button
        onClick={() => window.location.href = '/dashboard'}
        style={{
          width: '100%',
          background: 'transparent',
          color: '#78716c',
          padding: '1rem',
          borderRadius: '1.25rem',
          border: '1.5px solid rgba(168,132,90,0.25)',
          fontSize: '0.9rem',
          fontWeight: '600',
          cursor: 'pointer',
        }}
      >
        Maybe later
      </button>
    </div>
  );
}