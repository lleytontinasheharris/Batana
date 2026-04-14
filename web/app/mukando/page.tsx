'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Users,
  Plus,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader,
  AlertCircle,
  CheckCircle,
  Coins,
  Calendar,
  Trophy,
  UserPlus,
} from 'lucide-react';
import BatanaLogo from '../components/BatanaLogo';
import {
  getUserMukandoGroups,
  getMukandoGroup,
  createMukandoGroup,
  joinMukandoGroup,
  contributeMukando,
} from '../lib/api';

type View = 'list' | 'detail' | 'create' | 'join';

function getToken(): string | null {
  if (typeof window !== 'undefined') return localStorage.getItem('batana_token');
  return null;
}

function getPhone(): string | null {
  if (typeof window !== 'undefined') return localStorage.getItem('batana_phone');
  return null;
}

export default function MukandoPage() {
  const [view, setView] = useState<View>('list');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  // Create form
  const [createName, setCreateName] = useState('');
  const [createContribution, setCreateContribution] = useState('');
  const [createCycle, setCreateCycle] = useState('3');

  // Join form
  const [joinGroupId, setJoinGroupId] = useState('');
  const [joinPreview, setJoinPreview] = useState<any>(null);
  const [joinPreviewLoading, setJoinPreviewLoading] = useState(false);

  const loadGroups = useCallback(async () => {
    const phone = getPhone();
    const token = getToken();
    if (!token) {
      window.location.href = '/login';
      return;
    }
    try {
      setLoading(true);
      setError(null);
      if (phone) {
        const data = await getUserMukandoGroups(phone);
        setGroups(data.mukando_groups || []);
      }
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadGroupDetail = useCallback(async (groupId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMukandoGroup(groupId);
      setSelectedGroup(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load group');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (selectedGroupId) {
      loadGroupDetail(selectedGroupId);
    }
  }, [selectedGroupId, loadGroupDetail]);

  function resetForms() {
    setCreateName('');
    setCreateContribution('');
    setCreateCycle('3');
    setJoinGroupId('');
    setJoinPreview(null);
    setError(null);
    setSuccess(null);
  }

  async function handleCreate() {
    const token = getToken();
    if (!token) return;

    if (!createName || createName.trim().length < 3) {
      setError('Group name must be at least 3 characters');
      return;
    }
    const contrib = parseFloat(createContribution);
    if (!contrib || contrib <= 0) {
      setError('Enter a valid contribution amount');
      return;
    }
    const cycle = parseInt(createCycle);
    if (!cycle || cycle < 2 || cycle > 24) {
      setError('Cycle must be between 2 and 24 months');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      const data = await createMukandoGroup(token, {
        name: createName.trim(),
        contribution_zig: contrib,
        cycle_months: cycle,
      });
      setSuccess(`"${data.group.name}" created successfully!`);
      await loadGroups();
      setTimeout(() => {
        setSuccess(null);
        setView('list');
        resetForms();
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleJoinPreview() {
    if (!joinGroupId || joinGroupId.trim().length < 10) {
      setError('Enter a valid group ID');
      return;
    }
    try {
      setJoinPreviewLoading(true);
      setError(null);
      const data = await getMukandoGroup(joinGroupId.trim());
      setJoinPreview(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Group not found');
      setJoinPreview(null);
    } finally {
      setJoinPreviewLoading(false);
    }
  }

  async function handleJoin() {
    const token = getToken();
    if (!token || !joinGroupId) return;
    try {
      setActionLoading(true);
      setError(null);
      await joinMukandoGroup(token, joinGroupId.trim());
      setSuccess('You have joined the group!');
      await loadGroups();
      setTimeout(() => {
        setSuccess(null);
        setView('list');
        resetForms();
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to join group');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleContribute(groupId: string) {
    const token = getToken();
    if (!token) return;
    try {
      setActionLoading(true);
      setError(null);
      await contributeMukando(token, groupId);
      setSuccess('Contribution confirmed!');
      await loadGroupDetail(groupId);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Contribution failed');
    } finally {
      setActionLoading(false);
    }
  }

  // ── LOADING ────────────────────────────────────────────────
  if (loading && view === 'list') {
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

  // ── GROUP DETAIL VIEW ──────────────────────────────────────
  if (view === 'detail' && selectedGroupId) {
    const phone = getPhone();

    if (loading) {
      return (
        <PageShell
          title="Loading..."
          subtitle=""
          onBack={() => { setView('list'); setSelectedGroupId(null); setSelectedGroup(null); }}
        >
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Loader size={28} color="#a8845a" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        </PageShell>
      );
    }

    if (!selectedGroup) {
      return (
        <PageShell
          title="Group"
          subtitle=""
          onBack={() => { setView('list'); setSelectedGroupId(null); }}
        >
          <ErrorBox message="Could not load group details" />
        </PageShell>
      );
    }

    const g = selectedGroup.group;
    const pool = selectedGroup.pool;
    const contribution = selectedGroup.contribution;
    const thisMonth = selectedGroup.this_month;
    const members = selectedGroup.members || [];

    // Find current user's member record
    const myMember = members.find((m: any) => {
      const myPhone = phone?.replace(/^0/, '+263');
      return m.name && phone;
    });

    const isMyPayoutMonth = thisMonth?.month === myMember?.payout_month;
    const canPayout = thisMonth?.all_paid && isMyPayoutMonth;

    return (
      <PageShell
        title={g.name}
        subtitle={`Month ${g.current_month} of ${g.cycle_months} · ${g.status}`}
        onBack={() => {
          setView('list');
          setSelectedGroupId(null);
          setSelectedGroup(null);
          setError(null);
          setSuccess(null);
        }}
      >
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

        {success && <SuccessBox message={success} />}
        {error && <ErrorBox message={error} />}

        {/* Pool card */}
        <div style={{
          background: 'linear-gradient(135deg, #3a2a1c, #6f5336)',
          borderRadius: '1.5rem',
          padding: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 12px 32px rgba(58,42,28,0.25)',
        }}>
          <div style={{
            position: 'absolute',
            top: '-30px', right: '-30px',
            width: '150px', height: '150px',
            background: 'radial-gradient(circle, rgba(168,132,90,0.3), transparent)',
            borderRadius: '50%',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              fontSize: '0.7rem',
              color: 'rgba(255,255,255,0.6)',
              fontWeight: '600',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '0.375rem',
            }}>
              Current Pool
            </div>
            <div style={{
              fontSize: '2.25rem',
              fontWeight: '900',
              color: 'white',
              lineHeight: '1',
              marginBottom: '0.25rem',
            }}>
              {parseFloat(pool?.gold_grams || 0).toFixed(4)}g
            </div>
            <div style={{
              fontSize: '0.875rem',
              color: '#f59e0b',
              fontWeight: '600',
              marginBottom: '1.25rem',
            }}>
              ZiG {parseFloat(pool?.zig || 0).toLocaleString('en', { maximumFractionDigits: 0 })}
              {' · '}US${parseFloat(pool?.usd || 0).toFixed(2)}
            </div>

            {/* This month info */}
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '1rem',
              padding: '0.875rem 1rem',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{
                    fontSize: '0.7rem',
                    color: 'rgba(255,255,255,0.55)',
                    marginBottom: '0.2rem',
                  }}>
                    This month's recipient
                  </div>
                  <div style={{
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    color: 'white',
                  }}>
                    {thisMonth?.recipient || '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: '0.7rem',
                    color: 'rgba(255,255,255,0.55)',
                    marginBottom: '0.2rem',
                  }}>
                    Contributions
                  </div>
                  <div style={{
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    color: thisMonth?.all_paid ? '#86efac' : '#fcd34d',
                  }}>
                    {thisMonth?.contributions || '0/0'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly contribution */}
        <div style={{
          background: 'rgba(255,255,255,0.8)',
          borderRadius: '1.25rem',
          padding: '1.25rem',
          border: '1px solid rgba(168,132,90,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{
              fontSize: '0.7rem',
              color: '#78716c',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.25rem',
            }}>
              Monthly contribution
            </div>
            <div style={{
              fontSize: '1.1rem',
              fontWeight: '800',
              color: '#1c1917',
            }}>
              {parseFloat(contribution?.gold_grams || 0).toFixed(6)}g gold
            </div>
            <div style={{ fontSize: '0.8rem', color: '#a8845a', fontWeight: '600' }}>
              ZiG {parseFloat(contribution?.zig_today || 0).toLocaleString('en', { maximumFractionDigits: 0 })} today
            </div>
          </div>
          <Coins size={28} color="#a8845a" />
        </div>

        {/* Contribute button */}
        <button
          onClick={() => handleContribute(g.id)}
          disabled={actionLoading || thisMonth?.all_paid}
          style={{
            width: '100%',
            background: thisMonth?.all_paid
              ? 'rgba(116,140,61,0.15)'
              : actionLoading
              ? 'rgba(168,132,90,0.4)'
              : 'linear-gradient(135deg, #a8845a, #967554)',
            color: thisMonth?.all_paid ? '#748c3d' : 'white',
            padding: '1rem',
            borderRadius: '1.25rem',
            border: thisMonth?.all_paid
              ? '1.5px solid rgba(116,140,61,0.3)'
              : 'none',
            fontSize: '1rem',
            fontWeight: '700',
            cursor: thisMonth?.all_paid || actionLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxShadow: thisMonth?.all_paid || actionLoading
              ? 'none'
              : '0 8px 24px rgba(168,132,90,0.3)',
          }}
        >
          {actionLoading ? (
            <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
          ) : thisMonth?.all_paid ? (
            <><CheckCircle size={18} /> All contributions in</>
          ) : (
            <><Coins size={18} /> Contribute this month</>
          )}
        </button>

        {/* Members list */}
        <div>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: '700',
            color: '#78716c',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '0.875rem',
          }}>
            Members · {members.length}/{g.cycle_months}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {members.map((member: any, i: number) => {
              const isExpanded = expandedMember === `${i}`;
              const isRecipient = member.payout_month === g.current_month;
              const hasPaid = member.paid_this_month;

              return (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.8)',
                    borderRadius: '1rem',
                    border: isRecipient
                      ? '1.5px solid rgba(245,158,11,0.4)'
                      : '1px solid rgba(168,132,90,0.12)',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => setExpandedMember(isExpanded ? null : `${i}`)}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      padding: '0.875rem 1rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      textAlign: 'left',
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: member.has_received_payout
                        ? 'linear-gradient(135deg, #748c3d, #5d7030)'
                        : isRecipient
                        ? 'linear-gradient(135deg, #ca8a04, #a16207)'
                        : 'linear-gradient(135deg, #a8845a, #967554)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '800',
                      fontSize: '0.875rem',
                      flexShrink: 0,
                    }}>
                      {member.name?.charAt(0) || '?'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: '700',
                        color: '#1c1917',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        flexWrap: 'wrap',
                      }}>
                        {member.name}
                        {isRecipient && (
                          <span style={{
                            fontSize: '0.65rem',
                            background: 'rgba(245,158,11,0.15)',
                            color: '#ca8a04',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '2rem',
                            fontWeight: '700',
                          }}>
                            This month
                          </span>
                        )}
                        {member.has_received_payout && (
                          <span style={{
                            fontSize: '0.65rem',
                            background: 'rgba(116,140,61,0.12)',
                            color: '#748c3d',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '2rem',
                            fontWeight: '700',
                          }}>
                            ✓ Received
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#78716c',
                        marginTop: '0.1rem',
                      }}>
                        Payout: Month {member.payout_month}
                      </div>
                    </div>

                    {/* Payment status */}
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {hasPaid
                        ? <CheckCircle size={16} color="#748c3d" />
                        : <div style={{
                            width: '16px', height: '16px',
                            borderRadius: '50%',
                            border: '2px solid rgba(168,132,90,0.3)',
                          }} />
                      }
                      {isExpanded
                        ? <ChevronUp size={14} color="#a8a29e" />
                        : <ChevronDown size={14} color="#a8a29e" />
                      }
                    </div>
                  </button>

                  {isExpanded && (
                    <div style={{
                      borderTop: '1px solid rgba(168,132,90,0.1)',
                      padding: '0.875rem 1rem',
                      background: 'rgba(250,248,245,0.5)',
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '0.5rem',
                      }}>
                        <span style={{ fontSize: '0.8rem', color: '#78716c' }}>
                          Total contributed
                        </span>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1c1917' }}>
                          {parseFloat(member.total_contributed_gold_grams || 0).toFixed(6)}g gold
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.8rem', color: '#78716c' }}>
                          This month
                        </span>
                        <span style={{
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          color: hasPaid ? '#748c3d' : '#a8845a',
                        }}>
                          {hasPaid ? '✓ Paid' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Group ID for sharing */}
        <div style={{
          background: 'rgba(168,132,90,0.06)',
          borderRadius: '1rem',
          padding: '1rem 1.25rem',
          border: '1px solid rgba(168,132,90,0.12)',
        }}>
          <div style={{
            fontSize: '0.7rem',
            fontWeight: '700',
            color: '#78716c',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.375rem',
          }}>
            Group ID - share with members
          </div>
          <div style={{
            fontSize: '0.8rem',
            fontWeight: '600',
            color: '#a8845a',
            fontFamily: 'monospace',
            wordBreak: 'break-all',
          }}>
            {g.id}
          </div>
        </div>
      </PageShell>
    );
  }

  // ── CREATE VIEW ────────────────────────────────────────────
  if (view === 'create') {
    const contrib = parseFloat(createContribution) || 0;
    const cycle = parseInt(createCycle) || 3;
    const totalPool = contrib * cycle;

    return (
      <PageShell
        title="Start a Mukando"
        subtitle="Create a gold-backed savings group"
        onBack={() => { setView('list'); resetForms(); }}
      >
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

        {success && <SuccessBox message={success} />}
        {error && <ErrorBox message={error} />}

        {/* Group name */}
        <div>
          <label style={labelStyle}>Group Name</label>
          <input
            type="text"
            value={createName}
            onChange={(e) => { setCreateName(e.target.value); setError(null); }}
            placeholder="e.g. Zengeza Market Ladies"
            maxLength={100}
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#a8845a'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(168,132,90,0.25)'; }}
          />
        </div>

        {/* Monthly contribution */}
        <div>
          <label style={labelStyle}>Monthly Contribution (ZiG)</label>
          <input
            type="number"
            value={createContribution}
            onChange={(e) => { setCreateContribution(e.target.value); setError(null); }}
            placeholder="e.g. 500"
            min="1"
            step="1"
            style={{ ...inputStyle, fontSize: '1.25rem', fontWeight: '700' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#a8845a'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(168,132,90,0.25)'; }}
          />
          <p style={{
            fontSize: '0.75rem',
            color: '#78716c',
            marginTop: '0.375rem',
          }}>
            Each member pays this amount every month
          </p>
        </div>

        {/* Cycle length */}
        <div>
          <label style={labelStyle}>Number of Members / Months</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
              <button
                key={n}
                onClick={() => setCreateCycle(String(n))}
                style={{
                  padding: '0.625rem 1rem',
                  borderRadius: '0.875rem',
                  border: createCycle === String(n)
                    ? '2px solid #a8845a'
                    : '1.5px solid rgba(168,132,90,0.25)',
                  background: createCycle === String(n)
                    ? 'rgba(168,132,90,0.1)'
                    : 'rgba(255,255,255,0.7)',
                  color: createCycle === String(n) ? '#a8845a' : '#78716c',
                  fontSize: '0.9rem',
                  fontWeight: createCycle === String(n) ? '700' : '500',
                  cursor: 'pointer',
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <p style={{ fontSize: '0.75rem', color: '#78716c', marginTop: '0.375rem' }}>
            {cycle} members · {cycle} months · 1 payout per month
          </p>
        </div>

        {/* Preview */}
        {contrib > 0 && (
          <div style={{
            background: 'rgba(168,132,90,0.06)',
            border: '1px solid rgba(168,132,90,0.15)',
            borderRadius: '1.25rem',
            padding: '1.25rem',
          }}>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              color: '#78716c',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '1rem',
            }}>
              Group Preview
            </div>
            {[
              { label: 'Monthly contribution', value: `ZiG ${contrib.toLocaleString()}` },
              { label: 'Members', value: `${cycle} people` },
              { label: 'Each member receives', value: `ZiG ${totalPool.toLocaleString()}` },
              { label: 'Duration', value: `${cycle} months` },
              { label: 'Denominated in', value: 'Gold grams (inflation-proof)' },
            ].map((item, i, arr) => (
              <div key={item.label} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.5rem 0',
                borderBottom: i < arr.length - 1
                  ? '1px solid rgba(168,132,90,0.1)'
                  : 'none',
              }}>
                <span style={{ fontSize: '0.8rem', color: '#78716c' }}>{item.label}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1c1917' }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* How it works */}
        <div style={{
          background: 'rgba(116,140,61,0.06)',
          border: '1px solid rgba(116,140,61,0.15)',
          borderRadius: '1rem',
          padding: '1rem 1.25rem',
        }}>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: '700',
            color: '#748c3d',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.75rem',
          }}>
            How Mukando works
          </div>
          {[
            'All contributions are stored in gold grams - not ZiG',
            'Gold protects the pool from inflation between months',
            'Each member receives the full pool on their turn',
            'Every contribution builds your Vimbiso Score',
            'Batana holds the funds - no treasurer risk',
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              gap: '0.625rem',
              padding: '0.375rem 0',
              alignItems: 'flex-start',
            }}>
              <CheckCircle size={14} color="#748c3d" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={{ fontSize: '0.8rem', color: '#57534e', lineHeight: '1.5' }}>
                {item}
              </span>
            </div>
          ))}
        </div>

        <SubmitButton
          label="Create Group"
          loading={actionLoading}
          onClick={handleCreate}
          icon={<Plus size={18} />}
        />
      </PageShell>
    );
  }

  // ── JOIN VIEW ──────────────────────────────────────────────
  if (view === 'join') {
    return (
      <PageShell
        title="Join a Mukando"
        subtitle="Enter the group ID shared by your group leader"
        onBack={() => { setView('list'); resetForms(); }}
      >
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

        {success && <SuccessBox message={success} />}
        {error && <ErrorBox message={error} />}

        <div>
          <label style={labelStyle}>Group ID</label>
          <input
            type="text"
            value={joinGroupId}
            onChange={(e) => {
              setJoinGroupId(e.target.value);
              setJoinPreview(null);
              setError(null);
            }}
            placeholder="Paste the group ID here"
            style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.875rem' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#a8845a'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(168,132,90,0.25)'; }}
          />
        </div>

        <button
          onClick={handleJoinPreview}
          disabled={joinPreviewLoading}
          style={{
            width: '100%',
            background: 'rgba(168,132,90,0.08)',
            color: '#a8845a',
            padding: '0.875rem',
            borderRadius: '1.25rem',
            border: '1.5px solid rgba(168,132,90,0.25)',
            fontSize: '0.9rem',
            fontWeight: '700',
            cursor: joinPreviewLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          {joinPreviewLoading
            ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Looking up...</>
            : 'Look up group'
          }
        </button>

        {/* Group preview */}
        {joinPreview && (
          <>
            <div style={{
              background: 'rgba(255,255,255,0.85)',
              borderRadius: '1.25rem',
              padding: '1.25rem',
              border: '1px solid rgba(168,132,90,0.2)',
            }}>
              <div style={{
                fontSize: '1rem',
                fontWeight: '800',
                color: '#1c1917',
                marginBottom: '0.25rem',
              }}>
                {joinPreview.group?.name}
              </div>
              <div style={{
                fontSize: '0.8rem',
                color: '#78716c',
                marginBottom: '1rem',
              }}>
                {joinPreview.group?.status} · Month {joinPreview.group?.current_month} of {joinPreview.group?.cycle_months}
              </div>

              {[
                {
                  label: 'Monthly contribution',
                  value: `ZiG ${parseFloat(joinPreview.contribution?.zig_today || 0).toLocaleString('en', { maximumFractionDigits: 0 })}`,
                },
                {
                  label: 'Members',
                  value: `${joinPreview.members?.length || 0} / ${joinPreview.group?.cycle_months}`,
                },
                {
                  label: 'Pool denomination',
                  value: `${parseFloat(joinPreview.contribution?.gold_grams || 0).toFixed(6)}g gold/month`,
                },
              ].map((item, i, arr) => (
                <div key={item.label} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0',
                  borderBottom: i < arr.length - 1
                    ? '1px solid rgba(168,132,90,0.1)'
                    : 'none',
                }}>
                  <span style={{ fontSize: '0.8rem', color: '#78716c' }}>{item.label}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1c1917' }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            <SubmitButton
              label="Join Group"
              loading={actionLoading}
              onClick={handleJoin}
              icon={<UserPlus size={18} />}
            />
          </>
        )}
      </PageShell>
    );
  }

  // ── LIST VIEW ──────────────────────────────────────────────
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
            Mukando
          </div>
          <div style={{ fontSize: '0.75rem', color: '#78716c' }}>
            Gold-backed rotating savings
          </div>
        </div>
        <BatanaLogo size={32} />
      </header>

      <div style={{ padding: '1.5rem', paddingBottom: '3rem' }}>

        {/* Action buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}>
          <button
            onClick={() => { resetForms(); setView('create'); }}
            style={{
              background: 'linear-gradient(135deg, #a8845a, #967554)',
              color: 'white',
              padding: '1rem',
              borderRadius: '1.25rem',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 8px 20px rgba(168,132,90,0.3)',
            }}
          >
            <Plus size={18} />
            Start Group
          </button>
          <button
            onClick={() => { resetForms(); setView('join'); }}
            style={{
              background: 'rgba(255,255,255,0.85)',
              color: '#a8845a',
              padding: '1rem',
              borderRadius: '1.25rem',
              border: '1.5px solid rgba(168,132,90,0.3)',
              fontSize: '0.875rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <UserPlus size={18} />
            Join Group
          </button>
        </div>

        {/* Groups list */}
        {groups.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            background: 'rgba(255,255,255,0.6)',
            borderRadius: '1.5rem',
            border: '1.5px dashed rgba(168,132,90,0.3)',
          }}>
            <Users size={48} color="#d4c0a3" style={{ margin: '0 auto 1rem' }} />
            <div style={{
              fontSize: '1rem',
              fontWeight: '700',
              color: '#57534e',
              marginBottom: '0.5rem',
            }}>
              No mukando groups yet
            </div>
            <div style={{
              fontSize: '0.8rem',
              color: '#78716c',
              lineHeight: '1.6',
              marginBottom: '1.5rem',
              maxWidth: '260px',
              margin: '0 auto 1.5rem',
            }}>
              Start or join a group to begin building your Vimbiso Score through collective savings
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              color: '#78716c',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              Your Groups · {groups.length}
            </div>

            {groups.map((group) => {
              const isActive = group.status === 'active';
              const hasReceived = group.has_received_payout;

              return (
                <button
                  key={group.group_id}
                  onClick={() => {
                    setSelectedGroupId(group.group_id);
                    setView('detail');
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.85)',
                    borderRadius: '1.25rem',
                    padding: '1.25rem',
                    border: '1px solid rgba(168,132,90,0.15)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '1rem',
                    background: hasReceived
                      ? 'linear-gradient(135deg, #748c3d, #5d7030)'
                      : isActive
                      ? 'linear-gradient(135deg, #a8845a, #967554)'
                      : 'rgba(168,132,90,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {hasReceived
                      ? <Trophy size={22} color="white" />
                      : <Users size={22} color={isActive ? 'white' : '#a8845a'} />
                    }
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.9375rem',
                      fontWeight: '700',
                      color: '#1c1917',
                      marginBottom: '0.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      flexWrap: 'wrap',
                    }}>
                      {group.name}
                      <span style={{
                        fontSize: '0.65rem',
                        background: isActive
                          ? 'rgba(116,140,61,0.12)'
                          : 'rgba(168,132,90,0.12)',
                        color: isActive ? '#748c3d' : '#a8845a',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '2rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                      }}>
                        {group.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#78716c' }}>
                      Month {group.current_month} · Your payout: Month {group.your_payout_month}
                    </div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#a8845a',
                      fontWeight: '600',
                      marginTop: '0.2rem',
                    }}>
                      {parseFloat(group.total_contributed?.gold_grams || 0).toFixed(4)}g contributed
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={14} color="#a8a29e" />
                    <ChevronRight size={16} color="#a8a29e" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* What is Mukando */}
        {groups.length === 0 && (
          <div style={{
            marginTop: '1.5rem',
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
              What is Mukando?
            </div>
            <p style={{
              fontSize: '0.8rem',
              color: '#57534e',
              lineHeight: '1.7',
              margin: 0,
            }}>
              Mukando (also called rounds) is Zimbabwe's traditional rotating savings club. A group of people each contribute the same amount monthly. Each month, one member receives the full pool. BATANA digitises this with gold-gram protection and secure custody so the money never loses value and no one can steal it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SHARED COMPONENTS ──────────────────────────────────────

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
}: {
  label: string;
  loading: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        width: '100%',
        background: loading
          ? 'rgba(168,132,90,0.4)'
          : 'linear-gradient(135deg, #a8845a, #967554)',
        color: 'white',
        padding: '1rem',
        borderRadius: '1.25rem',
        border: 'none',
        fontSize: '1rem',
        fontWeight: '700',
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        boxShadow: loading ? 'none' : '0 8px 24px rgba(168,132,90,0.3)',
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