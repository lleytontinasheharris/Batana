'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader,
  AlertCircle,
  ArrowLeft,
  Users,
  Eye,
} from 'lucide-react';
import BatanaLogo from '../components/BatanaLogo';
import {
  getAdminVerifications,
  approveVerification,
  rejectVerification,
  makeMeAdmin,
} from '../lib/api';

type TabStatus = 'pending' | 'approved' | 'rejected';

interface Verification {
  id: string;
  user_id: string;
  user: {
    first_name: string;
    last_name: string;
    phone_number: string;
    date_of_birth: string;
  };
  document_type: string;
  document_number: string;
  document_front_url: string;
  document_back_url: string | null;
  status: string;
  submitted_at: string;
  rejection_reason: string | null;
  approved_at: string | null;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabStatus>('pending');
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [makingAdmin, setMakingAdmin] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const getToken = () => {
    if (typeof window !== 'undefined') return localStorage.getItem('batana_token');
    return null;
  };

  const loadVerifications = useCallback(async (status: TabStatus) => {
    const token = getToken();
    if (!token) {
      window.location.href = '/login';
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getAdminVerifications(token, status);
      setVerifications(data.verifications || []);
      setIsAdmin(true);
    } catch (err: any) {
      if (err.message?.includes('Admin access required')) {
        setIsAdmin(false);
      } else if (err.message?.includes('token') || err.message?.includes('expired')) {
        window.location.href = '/login';
      } else {
        setError(err.message);
        setIsAdmin(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVerifications(activeTab);
  }, [activeTab, loadVerifications]);

  async function handleMakeAdmin() {
    const token = getToken();
    if (!token) return;

    try {
      setMakingAdmin(true);
      await makeMeAdmin(token);
      setIsAdmin(true);
      loadVerifications('pending');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setMakingAdmin(false);
    }
  }

  async function handleApprove(verificationId: string) {
    const token = getToken();
    if (!token) return;

    try {
      setActionLoading(verificationId);
      setError(null);
      await approveVerification(token, verificationId);
      setSuccessMessage('User verified successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
      setExpandedId(null);
      loadVerifications(activeTab);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(verificationId: string) {
    const token = getToken();
    if (!token) return;

    if (!rejectReason || rejectReason.trim().length < 5) {
      setError('Please provide a rejection reason (at least 5 characters)');
      return;
    }

    try {
      setActionLoading(verificationId);
      setError(null);
      await rejectVerification(token, verificationId, rejectReason.trim());
      setSuccessMessage('Verification rejected.');
      setTimeout(() => setSuccessMessage(null), 3000);
      setRejectingId(null);
      setRejectReason('');
      setExpandedId(null);
      loadVerifications(activeTab);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatDocType(type: string) {
    return type === 'national_id' ? 'National ID' : 'Passport';
  }

  // ─── NOT ADMIN ─────────────────────────────────────────────
  if (isAdmin === false) {
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
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(168,132,90,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
        }}>
          <Shield size={36} color="#a8845a" />
        </div>

        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: '800',
          color: '#1c1917',
          marginBottom: '0.75rem',
        }}>
          Admin Access Required
        </h1>

        <p style={{
          fontSize: '0.875rem',
          color: '#78716c',
          lineHeight: '1.6',
          marginBottom: '2rem',
          maxWidth: '300px',
        }}>
          You don't have admin privileges. If you are the first admin, click below to claim access.
        </p>

        <button
          onClick={handleMakeAdmin}
          disabled={makingAdmin}
          style={{
            background: makingAdmin
              ? 'rgba(168,132,90,0.4)'
              : 'linear-gradient(135deg, #a8845a, #967554)',
            color: 'white',
            padding: '1rem 2rem',
            borderRadius: '1.25rem',
            border: 'none',
            fontSize: '1rem',
            fontWeight: '700',
            cursor: makingAdmin ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 8px 24px rgba(168,132,90,0.3)',
            marginBottom: '1rem',
          }}
        >
          {makingAdmin ? (
            <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Claiming...</>
          ) : (
            'Claim Admin Access'
          )}
        </button>

        <button
          onClick={() => window.location.href = '/dashboard'}
          style={{
            background: 'transparent',
            color: '#78716c',
            padding: '0.875rem',
            borderRadius: '1.25rem',
            border: '1.5px solid rgba(168,132,90,0.25)',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Back to Dashboard
        </button>

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ─── LOADING ───────────────────────────────────────────────
  if (loading && isAdmin === null) {
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

  // ─── IMAGE VIEWER MODAL ────────────────────────────────────
  if (viewingImage) {
    return (
      <div
        onClick={() => setViewingImage(null)}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.92)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem',
          cursor: 'pointer',
        }}
      >
        <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '90vh' }}>
          <img
            src={viewingImage}
            alt="Document"
            style={{
              maxWidth: '100%',
              maxHeight: '85vh',
              borderRadius: '1rem',
              objectFit: 'contain',
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: '-2.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.8rem',
          }}>
            Tap anywhere to close
          </div>
        </div>
      </div>
    );
  }

  // ─── MAIN ADMIN UI ─────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
      maxWidth: '480px',
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

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
          onClick={() => window.location.href = '/dashboard'}
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
          <div style={{
            fontSize: '1rem',
            fontWeight: '800',
            color: '#1c1917',
          }}>
            Verification Admin
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#78716c',
          }}>
            BATANA · Identity Review
          </div>
        </div>
        <div style={{
          background: 'rgba(168,132,90,0.1)',
          borderRadius: '0.625rem',
          padding: '0.375rem 0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
        }}>
          <Shield size={14} color="#a8845a" />
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a8845a' }}>
            Admin
          </span>
        </div>
      </header>

      <div style={{ padding: '1.25rem 1.5rem 2rem' }}>

        {/* Success toast */}
        {successMessage && (
          <div style={{
            background: 'rgba(116,140,61,0.1)',
            border: '1px solid rgba(116,140,61,0.25)',
            borderRadius: '0.875rem',
            padding: '0.875rem 1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
          }}>
            <CheckCircle size={16} color="#748c3d" />
            <span style={{ fontSize: '0.875rem', color: '#748c3d', fontWeight: '600' }}>
              {successMessage}
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '0.875rem',
            padding: '0.875rem 1rem',
            marginBottom: '1rem',
            display: 'flex',
            gap: '0.625rem',
            alignItems: 'flex-start',
          }}>
            <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontSize: '0.875rem', color: '#dc2626' }}>{error}</span>
          </div>
        )}

        {/* Tabs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          background: 'rgba(168,132,90,0.08)',
          borderRadius: '1rem',
          padding: '0.375rem',
        }}>
          {([
            { id: 'pending', label: 'Pending', icon: Clock },
            { id: 'approved', label: 'Approved', icon: CheckCircle },
            { id: 'rejected', label: 'Rejected', icon: XCircle },
          ] as { id: TabStatus; label: string; icon: any }[]).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setExpandedId(null);
                  setRejectingId(null);
                  setError(null);
                }}
                style={{
                  background: active ? 'white' : 'transparent',
                  border: 'none',
                  borderRadius: '0.75rem',
                  padding: '0.625rem 0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.375rem',
                  color: active ? '#a8845a' : '#78716c',
                  fontWeight: active ? '700' : '500',
                  fontSize: '0.8rem',
                  boxShadow: active ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Loading state for tab switch */}
        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem',
            gap: '0.75rem',
            color: '#78716c',
            fontSize: '0.875rem',
          }}>
            <Loader size={20} color="#a8845a" style={{ animation: 'spin 1s linear infinite' }} />
            Loading...
          </div>
        ) : verifications.length === 0 ? (
          /* Empty state */
          <div style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            background: 'rgba(255,255,255,0.6)',
            borderRadius: '1.25rem',
            border: '1px solid rgba(168,132,90,0.12)',
          }}>
            <Users size={40} color="#d4c0a3" style={{ margin: '0 auto 1rem' }} />
            <div style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: '#78716c',
              marginBottom: '0.5rem',
            }}>
              No {activeTab} verifications
            </div>
            <div style={{ fontSize: '0.8rem', color: '#a8a29e' }}>
              {activeTab === 'pending'
                ? 'New submissions will appear here'
                : `No ${activeTab} verifications yet`}
            </div>
          </div>
        ) : (
          /* Verification list */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {verifications.map((v) => {
              const isExpanded = expandedId === v.id;
              const isRejecting = rejectingId === v.id;
              const isActioning = actionLoading === v.id;

              return (
                <div
                  key={v.id}
                  style={{
                    background: 'rgba(255,255,255,0.85)',
                    borderRadius: '1.25rem',
                    border: '1px solid rgba(168,132,90,0.15)',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  {/* Card header */}
                  <button
                    onClick={() => {
                      setExpandedId(isExpanded ? null : v.id);
                      setRejectingId(null);
                      setRejectReason('');
                      setError(null);
                    }}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      padding: '1.125rem 1.25rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      textAlign: 'left',
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #a8845a, #967554)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '800',
                      fontSize: '1rem',
                      flexShrink: 0,
                    }}>
                      {v.user?.first_name?.charAt(0) || '?'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.9375rem',
                        fontWeight: '700',
                        color: '#1c1917',
                        marginBottom: '0.2rem',
                      }}>
                        {v.user?.first_name} {v.user?.last_name}
                      </div>
                      <div style={{
                        fontSize: '0.8rem',
                        color: '#78716c',
                      }}>
                        {v.user?.phone_number} · {formatDocType(v.document_type)}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#a8a29e',
                        marginTop: '0.15rem',
                      }}>
                        Submitted {formatDate(v.submitted_at)}
                      </div>
                    </div>

                    {isExpanded
                      ? <ChevronUp size={18} color="#a8845a" style={{ flexShrink: 0 }} />
                      : <ChevronDown size={18} color="#a8a29e" style={{ flexShrink: 0 }} />
                    }
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{
                      borderTop: '1px solid rgba(168,132,90,0.1)',
                      padding: '1.25rem',
                    }}>

                      {/* Details grid */}
                      <div style={{
                        background: 'rgba(250,248,245,0.8)',
                        borderRadius: '1rem',
                        padding: '1rem',
                        marginBottom: '1rem',
                      }}>
                        {[
                          { label: 'Document Type', value: formatDocType(v.document_type) },
                          { label: 'Document Number', value: v.document_number },
                          { label: 'Date of Birth', value: v.user?.date_of_birth
                            ? new Date(v.user.date_of_birth).toLocaleDateString('en-GB')
                            : '—' },
                          ...(v.rejection_reason
                            ? [{ label: 'Rejection Reason', value: v.rejection_reason }]
                            : []),
                          ...(v.approved_at
                            ? [{ label: 'Approved At', value: formatDate(v.approved_at) }]
                            : []),
                        ].map((item, i, arr) => (
                          <div key={item.label} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            padding: '0.5rem 0',
                            borderBottom: i < arr.length - 1
                              ? '1px solid rgba(168,132,90,0.1)'
                              : 'none',
                            gap: '1rem',
                          }}>
                            <span style={{
                              fontSize: '0.8rem',
                              color: '#78716c',
                              flexShrink: 0,
                            }}>
                              {item.label}
                            </span>
                            <span style={{
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              color: '#1c1917',
                              textAlign: 'right',
                              wordBreak: 'break-all',
                            }}>
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Document photos */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: v.document_back_url ? '1fr 1fr' : '1fr',
                        gap: '0.75rem',
                        marginBottom: '1.25rem',
                      }}>
                        {[
                          { url: v.document_front_url, label: 'Front' },
                          ...(v.document_back_url
                            ? [{ url: v.document_back_url, label: 'Back' }]
                            : []),
                        ].map((photo) => (
                          <button
                            key={photo.label}
                            onClick={() => setViewingImage(photo.url)}
                            style={{
                              background: 'rgba(168,132,90,0.06)',
                              border: '1.5px solid rgba(168,132,90,0.2)',
                              borderRadius: '0.875rem',
                              padding: '0',
                              cursor: 'pointer',
                              overflow: 'hidden',
                              position: 'relative',
                              aspectRatio: '4/3',
                            }}
                          >
                            <img
                              src={photo.url}
                              alt={`${photo.label} of document`}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <div style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                              padding: '0.5rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}>
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: 'white',
                              }}>
                                {photo.label}
                              </span>
                              <Eye size={14} color="white" />
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* Action buttons — only for pending */}
                      {v.status === 'pending' && (
                        <>
                          {!isRejecting ? (
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                              <button
                                onClick={() => handleApprove(v.id)}
                                disabled={isActioning}
                                style={{
                                  flex: 1,
                                  background: isActioning
                                    ? 'rgba(116,140,61,0.4)'
                                    : 'linear-gradient(135deg, #748c3d, #5d7030)',
                                  color: 'white',
                                  padding: '0.875rem',
                                  borderRadius: '1rem',
                                  border: 'none',
                                  fontSize: '0.875rem',
                                  fontWeight: '700',
                                  cursor: isActioning ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.5rem',
                                  boxShadow: isActioning
                                    ? 'none'
                                    : '0 4px 12px rgba(116,140,61,0.3)',
                                }}
                              >
                                {isActioning ? (
                                  <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                ) : (
                                  <CheckCircle size={16} />
                                )}
                                Approve
                              </button>

                              <button
                                onClick={() => setRejectingId(v.id)}
                                disabled={isActioning}
                                style={{
                                  flex: 1,
                                  background: 'rgba(239,68,68,0.08)',
                                  color: '#dc2626',
                                  padding: '0.875rem',
                                  borderRadius: '1rem',
                                  border: '1.5px solid rgba(239,68,68,0.2)',
                                  fontSize: '0.875rem',
                                  fontWeight: '700',
                                  cursor: isActioning ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.5rem',
                                }}
                              >
                                <XCircle size={16} />
                                Reject
                              </button>
                            </div>
                          ) : (
                            /* Rejection form */
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
                                Rejection Reason
                              </label>
                              <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="e.g. Photo is blurry, ID appears expired, name does not match..."
                                rows={3}
                                style={{
                                  width: '100%',
                                  padding: '0.875rem 1rem',
                                  borderRadius: '0.875rem',
                                  border: '1.5px solid rgba(239,68,68,0.3)',
                                  background: 'rgba(255,255,255,0.9)',
                                  fontSize: '0.875rem',
                                  color: '#1c1917',
                                  outline: 'none',
                                  fontFamily: 'inherit',
                                  resize: 'vertical',
                                  boxSizing: 'border-box',
                                  marginBottom: '0.875rem',
                                }}
                              />
                              <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                  onClick={() => {
                                    setRejectingId(null);
                                    setRejectReason('');
                                    setError(null);
                                  }}
                                  style={{
                                    flex: 1,
                                    background: 'transparent',
                                    color: '#78716c',
                                    padding: '0.875rem',
                                    borderRadius: '1rem',
                                    border: '1.5px solid rgba(168,132,90,0.25)',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleReject(v.id)}
                                  disabled={isActioning}
                                  style={{
                                    flex: 1,
                                    background: isActioning
                                      ? 'rgba(239,68,68,0.4)'
                                      : 'linear-gradient(135deg, #dc2626, #b91c1c)',
                                    color: 'white',
                                    padding: '0.875rem',
                                    borderRadius: '1rem',
                                    border: 'none',
                                    fontSize: '0.875rem',
                                    fontWeight: '700',
                                    cursor: isActioning ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                  }}
                                >
                                  {isActioning ? (
                                    <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                  ) : (
                                    <XCircle size={16} />
                                  )}
                                  Confirm Reject
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Status badge for non-pending */}
                      {v.status !== 'pending' && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          padding: '0.875rem',
                          borderRadius: '1rem',
                          background: v.status === 'approved'
                            ? 'rgba(116,140,61,0.08)'
                            : 'rgba(239,68,68,0.06)',
                          border: `1px solid ${v.status === 'approved'
                            ? 'rgba(116,140,61,0.2)'
                            : 'rgba(239,68,68,0.15)'}`,
                        }}>
                          {v.status === 'approved'
                            ? <CheckCircle size={16} color="#748c3d" />
                            : <XCircle size={16} color="#dc2626" />
                          }
                          <span style={{
                            fontSize: '0.875rem',
                            fontWeight: '700',
                            color: v.status === 'approved' ? '#748c3d' : '#dc2626',
                          }}>
                            {v.status === 'approved' ? 'Approved' : 'Rejected'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}