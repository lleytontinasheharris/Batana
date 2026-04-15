'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Send,
  Loader,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Coins,
  TrendingUp,
  Shield,
  AlertTriangle,
  Phone,
  UserCheck,
  Clock,
} from 'lucide-react';
import BatanaLogo from '../components/BatanaLogo';
import {
  getWallet,
  depositFunds,
  withdrawFunds,
} from '../lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type ActiveView = 'home' | 'deposit' | 'withdraw' | 'transfer' | 'guardian';

interface GuardianData {
  riskLevel:  'MEDIUM' | 'HIGH';
  riskScore:  number;
  warnings:   string[];
  recipient:  {
    name:           string;
    phone:          string;
    verified:       boolean;
    priorTransfers: number;
  };
  transfer: {
    amount:   number;
    currency: string;
    purpose:  string;
  };
}

function getToken(): string | null {
  if (typeof window !== 'undefined') return localStorage.getItem('batana_token');
  return null;
}

function getPhone(): string | null {
  if (typeof window !== 'undefined') return localStorage.getItem('batana_phone');
  return null;
}

function riskColor(level: string) {
  return level === 'HIGH' ? '#dc2626' : '#d97706';
}
function riskBg(level: string) {
  return level === 'HIGH' ? 'rgba(220,38,38,0.06)' : 'rgba(217,119,6,0.06)';
}
function riskBorder(level: string) {
  return level === 'HIGH' ? 'rgba(220,38,38,0.2)' : 'rgba(217,119,6,0.2)';
}

export default function WalletPage() {
  const [view, setView]                     = useState<ActiveView>('home');
  const [loading, setLoading]               = useState(true);
  const [actionLoading, setActionLoading]   = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [success, setSuccess]               = useState<any>(null);
  const [walletData, setWalletData]         = useState<any>(null);
  const [goldPrice, setGoldPrice]           = useState<any>(null);
  const [guardianData, setGuardianData]     = useState<GuardianData | null>(null);
  const [pendingTransfer, setPendingTransfer] = useState<any>(null);

  // Form state
  const [amount, setAmount]     = useState('');
  const [currency, setCurrency] = useState<'ZiG' | 'USD'>('ZiG');
  const [toPhone, setToPhone]   = useState('');
  const [purpose, setPurpose]   = useState('');

  const loadWallet = useCallback(async () => {
    const token = getToken();
    if (!token) { window.location.href = '/login'; return; }
    try {
      setLoading(true);
      setError(null);
      const data = await getWallet(token);
      setWalletData(data.wallet);
      setGoldPrice(data.gold_price);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load wallet';
      if (message.includes('token') || message.includes('expired')) {
        window.location.href = '/login';
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadWallet(); }, [loadWallet]);

  function resetForm() {
    setAmount('');
    setCurrency('ZiG');
    setToPhone('');
    setPurpose('');
    setError(null);
    setSuccess(null);
    setGuardianData(null);
    setPendingTransfer(null);
  }

  function goBack() {
    resetForm();
    setView('home');
  }

  // ── DEPOSIT ───────────────────────────────────────────────
  async function handleDeposit() {
    const token = getToken();
    if (!token) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    try {
      setActionLoading(true);
      setError(null);
      const data = await depositFunds(token, amt, currency);
      setSuccess(data);
      setWalletData(data.wallet);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Deposit failed');
    } finally {
      setActionLoading(false);
    }
  }

  // ── WITHDRAW ──────────────────────────────────────────────
  async function handleWithdraw() {
    const token = getToken();
    if (!token) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    try {
      setActionLoading(true);
      setError(null);
      const data = await withdrawFunds(token, amt, currency);
      setSuccess(data);
      setWalletData(data.wallet);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Withdrawal failed');
    } finally {
      setActionLoading(false);
    }
  }

  // ── SEND — runs Guardian check ────────────────────────────
  async function handleTransfer(confirmed = false) {
    const token = getToken();
    if (!token) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    if (!toPhone || toPhone.length < 10) { setError('Enter a valid phone number'); return; }
    if (toPhone === getPhone()) { setError('You cannot transfer to yourself'); return; }

    try {
      setActionLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/wallet/transfer`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          to_phone:  toPhone,
          amount:    amt,
          currency,
          purpose:   purpose || undefined,
          confirmed,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Transfer failed');
      }

      // ── Guardian intercept ────────────────────────────
      if (data.status === 'requires_confirmation') {
        setGuardianData({
          riskLevel:  data.riskLevel,
          riskScore:  data.riskScore,
          warnings:   data.warnings,
          recipient:  data.recipient,
          transfer:   data.transfer,
        });
        setPendingTransfer({ toPhone, amount: amt, currency, purpose });
        setView('guardian');
        return;
      }

      // ── Success ───────────────────────────────────────
      setSuccess(data);
      await loadWallet();

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Transfer failed');
    } finally {
      setActionLoading(false);
    }
  }

  // ── GUARDIAN: user clicks "Send anyway" ──────────────────
  async function handleGuardianConfirm() {
    const token = getToken();
    if (!token || !pendingTransfer) return;
    try {
      setActionLoading(true);
      setError('');

      const response = await fetch(`${API_URL}/api/wallet/transfer`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          to_phone:  pendingTransfer.toPhone,
          amount:    pendingTransfer.amount,
          currency:  pendingTransfer.currency,
          purpose:   pendingTransfer.purpose || undefined,
          confirmed: true,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Transfer failed');

      setGuardianData(null);
      setPendingTransfer(null);
      setSuccess(data);
      await loadWallet();

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Transfer failed');
      setView('transfer');
    } finally {
      setActionLoading(false);
    }
  }

  // ── LOADING ───────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
        maxWidth: '480px', margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '1rem',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <BatanaLogo size={48} />
        <Loader size={24} color="#a8845a" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  // ── SUCCESS SCREEN ────────────────────────────────────────
  if (success) {
    const isTransfer = view === 'transfer' || view === 'guardian';
    const isDeposit  = view === 'deposit';

    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
        maxWidth: '480px', margin: '0 auto', padding: '2rem 1.5rem',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', textAlign: 'center',
      }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: 'rgba(116,140,61,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '1.5rem',
        }}>
          <CheckCircle size={40} color="#748c3d" />
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1c1917', marginBottom: '0.75rem' }}>
          {isDeposit ? 'Deposit Successful' : isTransfer ? 'Transfer Sent' : 'Withdrawal Successful'}
        </h1>

        <div style={{
          background: 'rgba(255,255,255,0.85)', borderRadius: '1.25rem', padding: '1.5rem',
          width: '100%', border: '1px solid rgba(168,132,90,0.15)', marginBottom: '1.25rem', textAlign: 'left',
        }}>
          {isTransfer && success.transfer && (
            <>
              <Row label="Sent to"  value={success.transfer.receiver} />
              <Row label="Amount"   value={`${success.transfer.currency} ${success.transfer.amount}`} />
              <Row label="Fee"      value={success.transfer.fee === 0 ? 'Free' : `${success.transfer.currency} ${success.transfer.fee}`} last />
            </>
          )}
          {isDeposit && success.deposit && (
            <>
              <Row label="Deposited"        value={`${success.deposit.currency} ${success.deposit.amount}`} />
              <Row label="Gold equivalent"  value={`${success.deposit.gold_grams_equivalent}g`} last />
            </>
          )}
          {!isTransfer && !isDeposit && success.wallet && (
            <>
              <Row label="New ZiG Balance" value={`ZiG ${parseFloat(success.wallet.zig_balance).toFixed(2)}`} />
              <Row label="New USD Balance" value={`US$ ${parseFloat(success.wallet.usd_balance).toFixed(2)}`} last />
            </>
          )}
        </div>

        {isTransfer && success.transfer && success.transfer.fee === 0 && (
          <div style={{
            background: 'rgba(116,140,61,0.08)', border: '1px solid rgba(116,140,61,0.2)',
            borderRadius: '1rem', padding: '1rem 1.25rem', width: '100%',
            marginBottom: '1.25rem', textAlign: 'left',
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#748c3d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Transfer Fee</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#748c3d' }}>FREE</div>
            <div style={{ fontSize: '0.75rem', color: '#57534e', marginTop: '0.25rem' }}>Transfers under US$20 are always free on BATANA</div>
          </div>
        )}

        {isDeposit && success.insight && (
          <div style={{
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: '1rem', padding: '1rem 1.25rem', width: '100%',
            marginBottom: '1.25rem', textAlign: 'left',
          }}>
            <div style={{ fontSize: '0.8rem', color: '#92400e', lineHeight: '1.6' }}>{success.insight}</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
          <button onClick={() => { resetForm(); setView('home'); setSuccess(null); }} style={{
            background: 'linear-gradient(135deg, #a8845a, #967554)', color: 'white',
            padding: '1rem', borderRadius: '1.25rem', border: 'none',
            fontSize: '1rem', fontWeight: '700', cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(168,132,90,0.3)',
          }}>
            Back to Wallet
          </button>
          <button onClick={() => { window.location.href = '/dashboard'; }} style={{
            background: 'transparent', color: '#78716c', padding: '1rem',
            borderRadius: '1.25rem', border: '1.5px solid rgba(168,132,90,0.25)',
            fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer',
          }}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── GUARDIAN WARNING SCREEN ───────────────────────────────
  if (view === 'guardian' && guardianData) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
        maxWidth: '480px', margin: '0 auto',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

        <header style={{
          padding: '1.25rem 1.5rem', background: 'rgba(250,248,245,0.95)',
          backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(168,132,90,0.12)',
          position: 'sticky', top: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', gap: '1rem',
        }}>
          <button onClick={() => { setView('transfer'); setGuardianData(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a8845a', padding: '0.25rem', display: 'flex' }}>
            <ArrowLeft size={20} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1rem', fontWeight: '800', color: riskColor(guardianData.riskLevel) }}>
              Guardian Alert
            </div>
            <div style={{ fontSize: '0.75rem', color: '#78716c' }}>Please review before sending</div>
          </div>
          <AlertTriangle size={22} color={riskColor(guardianData.riskLevel)} />
        </header>

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '3rem' }}>

          {/* Risk header */}
          <div style={{
            background: riskBg(guardianData.riskLevel),
            border: `1.5px solid ${riskBorder(guardianData.riskLevel)}`,
            borderRadius: '1.5rem', padding: '1.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1rem' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '1rem', flexShrink: 0,
                background: `rgba(${guardianData.riskLevel === 'HIGH' ? '220,38,38' : '217,119,6'},0.12)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AlertTriangle size={24} color={riskColor(guardianData.riskLevel)} />
              </div>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: '800', color: riskColor(guardianData.riskLevel) }}>
                  {guardianData.riskLevel === 'HIGH' ? 'High Risk Transfer' : 'Please Verify This Transfer'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#78716c', marginTop: '0.1rem' }}>
                  Risk score: {guardianData.riskScore}/100
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {guardianData.warnings.map((w, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                  padding: '0.625rem 0.75rem',
                  background: 'rgba(255,255,255,0.6)', borderRadius: '0.75rem',
                }}>
                  <AlertCircle size={14} color={riskColor(guardianData.riskLevel)} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                  <span style={{ fontSize: '0.8rem', color: '#1c1917', lineHeight: '1.5' }}>{w}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recipient card */}
          <div style={{
            background: 'rgba(255,255,255,0.85)', borderRadius: '1.5rem', padding: '1.25rem',
            border: '1px solid rgba(168,132,90,0.15)',
          }}>
            <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.875rem' }}>
              Recipient Details
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {[
                { icon: Phone,     label: 'Phone',              value: guardianData.recipient.phone },
                { icon: UserCheck, label: 'Name on account',    value: `${guardianData.recipient.name}${guardianData.recipient.verified ? ' ✓ Verified' : ''}` },
                { icon: Clock,     label: 'Previous transfers', value: guardianData.recipient.priorTransfers === 0 ? 'None — first time sending to this number' : `${guardianData.recipient.priorTransfers} previous transfers` },
              ].map((row) => {
                const Icon = row.icon;
                return (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Icon size={16} color="#a8845a" />
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#a8a29e', fontWeight: '600' }}>{row.label}</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1c1917' }}>{row.value}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Transfer summary */}
          <div style={{
            background: 'rgba(58,42,28,0.04)', borderRadius: '1.25rem', padding: '1.25rem',
            border: '1px solid rgba(168,132,90,0.1)',
          }}>
            <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
              You are sending
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '900', color: '#1c1917' }}>
              {guardianData.transfer.currency} {guardianData.transfer.amount}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#78716c', marginTop: '0.25rem' }}>
              to {guardianData.recipient.phone}
            </div>
          </div>

          {/* Guardian note */}
          <div style={{
            padding: '0.875rem 1rem',
            background: 'rgba(116,140,61,0.06)', border: '1px solid rgba(116,140,61,0.15)',
            borderRadius: '1rem', fontSize: '0.78rem', color: '#1a2e0a',
            fontWeight: '600', lineHeight: '1.5', textAlign: 'center',
          }}>
            BATANA will never call you and ask you to approve a transfer.
            If someone told you to send this money, stop and verify first.
          </div>

          {/* Cancel — primary (green = safe choice) */}
          <button
            onClick={() => { resetForm(); setView('transfer'); }}
            style={{
              width: '100%', padding: '1rem',
              background: 'linear-gradient(135deg, #748c3d, #5a6e2e)',
              color: 'white', borderRadius: '1.25rem', border: 'none',
              fontSize: '1rem', fontWeight: '700', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              boxShadow: '0 8px 24px rgba(116,140,61,0.3)',
            }}
          >
            <Shield size={18} /> Cancel — I will verify first
          </button>

          {/* Send anyway — secondary (risk colour) */}
          <button
            onClick={handleGuardianConfirm}
            disabled={actionLoading}
            style={{
              width: '100%', padding: '1rem', background: 'transparent',
              border: `1.5px solid ${riskBorder(guardianData.riskLevel)}`,
              borderRadius: '1.25rem', color: riskColor(guardianData.riskLevel),
              fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            }}
          >
            {actionLoading
              ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Sending...</>
              : <>I understand the risk — send anyway <ChevronRight size={16} /></>}
          </button>

          {error && <ErrorBox message={error} />}
        </div>
      </div>
    );
  }

  // ── DEPOSIT VIEW ──────────────────────────────────────────
  if (view === 'deposit') {
    return (
      <ActionLayout title="Deposit Funds" subtitle="Add money to your gold-backed wallet" onBack={goBack}>
        <AmountInput amount={amount} setAmount={setAmount} currency={currency} setCurrency={setCurrency} walletData={walletData} />
        {amount && parseFloat(amount) > 0 && goldPrice && (
          <GoldPreview amount={parseFloat(amount)} currency={currency} goldPrice={goldPrice} />
        )}
        {error && <ErrorBox message={error} />}
        <SubmitButton label="Deposit" loading={actionLoading} onClick={handleDeposit} icon={<ArrowDownLeft size={18} />} />
      </ActionLayout>
    );
  }

  // ── WITHDRAW VIEW ─────────────────────────────────────────
  if (view === 'withdraw') {
    return (
      <ActionLayout title="Withdraw Funds" subtitle="Cash out from your wallet" onBack={goBack}>
        <AmountInput amount={amount} setAmount={setAmount} currency={currency} setCurrency={setCurrency} walletData={walletData} showBalance />
        {error && <ErrorBox message={error} />}
        <SubmitButton label="Withdraw" loading={actionLoading} onClick={handleWithdraw} icon={<ArrowUpRight size={18} />} />
      </ActionLayout>
    );
  }

  // ── TRANSFER VIEW ─────────────────────────────────────────
  if (view === 'transfer') {
    const amt = parseFloat(amount) || 0;
    let feePreview = 0;
    if (amt > 100) feePreview = amt * 0.005;
    else if (amt > 20) feePreview = 0.5;

    return (
      <ActionLayout title="Send Money" subtitle="Guardian protected · Free under US$20" onBack={goBack}>

        {/* Guardian info strip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.625rem',
          padding: '0.75rem 1rem',
          background: 'rgba(116,140,61,0.06)', border: '1px solid rgba(116,140,61,0.15)',
          borderRadius: '1rem',
        }}>
          <Shield size={15} color="#748c3d" />
          <span style={{ fontSize: '0.78rem', color: '#1a2e0a', fontWeight: '600' }}>
            Transaction Guardian is active — every transfer is scanned for fraud
          </span>
        </div>

        {/* Recipient phone */}
        <div>
          <label style={labelStyle}>Recipient Phone Number</label>
          <input
            type="tel" value={toPhone}
            onChange={(e) => setToPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="07X XXX XXXX" style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#a8845a'; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(168,132,90,0.25)'; }}
          />
        </div>

        <AmountInput amount={amount} setAmount={setAmount} currency={currency} setCurrency={setCurrency} walletData={walletData} showBalance />

        {/* Purpose tags */}
        <div>
          <label style={labelStyle}>Purpose (optional)</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['school_fees', 'rent', 'food', 'medical', 'general'].map((p) => (
              <button key={p} onClick={() => setPurpose(purpose === p ? '' : p)} style={{
                padding: '0.5rem 0.875rem', borderRadius: '2rem',
                border: purpose === p ? '2px solid #a8845a' : '1.5px solid rgba(168,132,90,0.25)',
                background: purpose === p ? 'rgba(168,132,90,0.1)' : 'rgba(255,255,255,0.7)',
                color: purpose === p ? '#a8845a' : '#78716c',
                fontSize: '0.8rem', fontWeight: purpose === p ? '700' : '500',
                cursor: 'pointer', textTransform: 'capitalize',
              }}>
                {p.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Fee preview */}
        {amt > 0 && (
          <div style={{
            background: feePreview === 0 ? 'rgba(116,140,61,0.08)' : 'rgba(168,132,90,0.06)',
            border: `1px solid ${feePreview === 0 ? 'rgba(116,140,61,0.2)' : 'rgba(168,132,90,0.15)'}`,
            borderRadius: '1rem', padding: '1rem 1.25rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#57534e' }}>BATANA fee</span>
              <span style={{ fontSize: '1rem', fontWeight: '800', color: feePreview === 0 ? '#748c3d' : '#1c1917' }}>
                {feePreview === 0 ? 'FREE' : `ZiG ${feePreview.toFixed(2)}`}
              </span>
            </div>
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(168,132,90,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#57534e' }}>Total deducted</span>
              <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1c1917' }}>
                {currency} {(amt + feePreview).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {error && <ErrorBox message={error} />}

        <SubmitButton
          label="Send Money"
          loading={actionLoading}
          onClick={() => handleTransfer(false)}
          icon={<Send size={18} />}
        />
      </ActionLayout>
    );
  }

  // ── HOME VIEW ─────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)',
      maxWidth: '480px', margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      <header style={{
        padding: '1.25rem 1.5rem',
        background: 'rgba(250,248,245,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(168,132,90,0.12)',
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', gap: '1rem',
      }}>
        <button onClick={() => { window.location.href = '/dashboard'; }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a8845a', padding: '0.25rem', display: 'flex' }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1rem', fontWeight: '800', color: '#1c1917' }}>My Wallet</div>
          <div style={{ fontSize: '0.75rem', color: '#78716c' }}>Gold-backed · Always liquid</div>
        </div>
        <BatanaLogo size={32} />
      </header>

      <div style={{ padding: '1.5rem', paddingBottom: '3rem' }}>

        {error && <ErrorBox message={error} />}

        {/* Main balance card */}
        <div style={{
          background: 'linear-gradient(135deg, #3a2a1c, #6f5336)',
          borderRadius: '1.75rem', padding: '1.75rem', marginBottom: '1.25rem',
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 16px 40px rgba(58,42,28,0.3)',
        }}>
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(168,132,90,0.3), transparent)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: '-60px', left: '-30px', width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(245,158,11,0.15), transparent)', borderRadius: '50%' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Total Gold Savings
            </div>
            <div style={{ fontSize: '2.75rem', fontWeight: '900', color: 'white', lineHeight: '1', marginBottom: '0.25rem' }}>
              {parseFloat(walletData?.gold_grams || 0).toFixed(4)}g
            </div>
            <div style={{ fontSize: '0.9rem', color: '#f59e0b', fontWeight: '600', marginBottom: '1.75rem' }}>
              US${parseFloat(walletData?.gold_value_usd || 0).toFixed(2)}
              {goldPrice && <span style={{ color: 'rgba(255,255,255,0.45)', fontWeight: '400', marginLeft: '0.5rem' }}>· US${goldPrice.per_gram_usd}/g</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              {[
                { label: 'Deposit',  icon: ArrowDownLeft, view: 'deposit'  as ActiveView },
                { label: 'Withdraw', icon: ArrowUpRight,  view: 'withdraw' as ActiveView },
                { label: 'Send',     icon: Send,          view: 'transfer' as ActiveView },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <button key={action.label} onClick={() => { resetForm(); setView(action.view); }} style={{
                    background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '1rem', padding: '0.875rem 0.5rem', color: 'white',
                    fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
                  }}>
                    <Icon size={20} /> {action.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Currency breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {[
            { label: 'ZiG Balance', value: `ZiG ${parseFloat(walletData?.zig_balance || 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: goldPrice ? `1g gold = ZiG ${parseFloat(goldPrice.per_gram_zig).toLocaleString()}` : '' },
            { label: 'USD Balance', value: `US$ ${parseFloat(walletData?.usd_balance || 0).toFixed(2)}`,                                                                       sub: goldPrice ? `1g gold = US$${goldPrice.per_gram_usd}` : '' },
          ].map((item) => (
            <div key={item.label} style={{ background: 'rgba(255,255,255,0.8)', borderRadius: '1.25rem', padding: '1.25rem', border: '1px solid rgba(168,132,90,0.12)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{item.label}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1c1917', marginBottom: '0.25rem' }}>{item.value}</div>
              <div style={{ fontSize: '0.7rem', color: '#a8a29e' }}>{item.sub}</div>
            </div>
          ))}
        </div>

        {/* Guardian info panel */}
        <div style={{
          background: 'rgba(116,140,61,0.06)', borderRadius: '1.25rem', padding: '1.25rem',
          border: '1px solid rgba(116,140,61,0.15)', marginBottom: '1.25rem',
          display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
        }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '0.875rem', background: 'rgba(116,140,61,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Shield size={18} color="#748c3d" />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1a2e0a', marginBottom: '0.25rem' }}>Transaction Guardian Active</div>
            <div style={{ fontSize: '0.78rem', color: '#57534e', lineHeight: '1.6' }}>
              Every transfer is scanned for fraud before it is sent. BATANA will never call you and ask you to approve a transfer.
            </div>
          </div>
        </div>

        {/* Gold price info */}
        {goldPrice && (
          <div style={{ background: 'rgba(255,255,255,0.8)', borderRadius: '1.25rem', padding: '1.25rem', border: '1px solid rgba(168,132,90,0.12)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '1rem', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Coins size={22} color="#ca8a04" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', color: '#78716c', marginBottom: '0.2rem' }}>Live Gold Price</div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: '#1c1917' }}>US${goldPrice.per_gram_usd} per gram</div>
            </div>
            <button onClick={() => { window.location.href = '/trust'; }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a8845a', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: '600' }}>
              Trust Engine <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Why gold matters */}
        <div style={{ background: 'rgba(168,132,90,0.06)', borderRadius: '1.25rem', padding: '1.25rem', border: '1px solid rgba(168,132,90,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <TrendingUp size={16} color="#a8845a" />
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#a8845a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Why gold-backed?</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#57534e', lineHeight: '1.7', margin: 0 }}>
            Every ZiG or USD you deposit is immediately converted to gold grams. When ZiG loses value, your gold holds its real-world purchasing power. You always know what your money is worth.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── SHARED COMPONENTS ──────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: '0.8rem', fontWeight: '600', color: '#57534e',
  display: 'block', marginBottom: '0.5rem',
  textTransform: 'uppercase', letterSpacing: '0.05em',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '1rem 1.25rem', borderRadius: '1rem',
  border: '1.5px solid rgba(168,132,90,0.25)', background: 'rgba(255,255,255,0.8)',
  fontSize: '1rem', color: '#1c1917', outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s',
};

function Row({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0', borderBottom: last ? 'none' : '1px solid rgba(168,132,90,0.1)' }}>
      <span style={{ fontSize: '0.875rem', color: '#78716c' }}>{label}</span>
      <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#1c1917' }}>{value}</span>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.875rem', padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
      <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
      <span style={{ fontSize: '0.875rem', color: '#dc2626' }}>{message}</span>
    </div>
  );
}

function GoldPreview({ amount, currency, goldPrice }: { amount: number; currency: string; goldPrice: any }) {
  const usdAmount = currency === 'USD' ? amount : amount / 13.56;
  const grams     = usdAmount / goldPrice.per_gram_usd;
  return (
    <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '1rem', padding: '1rem 1.25rem' }}>
      <div style={{ fontSize: '0.75rem', color: '#78716c', marginBottom: '0.375rem' }}>Gold equivalent</div>
      <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#92400e' }}>≈ {grams.toFixed(6)}g gold</div>
      <div style={{ fontSize: '0.75rem', color: '#a8a29e', marginTop: '0.25rem' }}>At US${goldPrice.per_gram_usd}/g · Inflation-protected</div>
    </div>
  );
}

function AmountInput({ amount, setAmount, currency, setCurrency, walletData, showBalance = false }: {
  amount: string; setAmount: (v: string) => void;
  currency: 'ZiG' | 'USD'; setCurrency: (v: 'ZiG' | 'USD') => void;
  walletData: any; showBalance?: boolean;
}) {
  const balance = currency === 'USD' ? parseFloat(walletData?.usd_balance || 0) : parseFloat(walletData?.zig_balance || 0);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <label style={labelStyle}>Amount</label>
        {showBalance && <span style={{ fontSize: '0.75rem', color: '#a8845a', fontWeight: '600' }}>Balance: {currency} {balance.toFixed(2)}</span>}
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <div style={{ display: 'flex', background: 'rgba(168,132,90,0.08)', borderRadius: '0.875rem', padding: '0.25rem', gap: '0.25rem', flexShrink: 0 }}>
          {(['ZiG', 'USD'] as const).map((c) => (
            <button key={c} onClick={() => setCurrency(c)} style={{
              background: currency === c ? 'white' : 'transparent', border: 'none',
              borderRadius: '0.625rem', padding: '0.5rem 0.75rem',
              fontSize: '0.8rem', fontWeight: currency === c ? '700' : '500',
              color: currency === c ? '#a8845a' : '#78716c', cursor: 'pointer',
              boxShadow: currency === c ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            }}>{c}</button>
          ))}
        </div>
        <input
          type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00" min="0" step="0.01"
          style={{ ...inputStyle, fontSize: '1.25rem', fontWeight: '700', flex: 1 }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#a8845a'; }}
          onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(168,132,90,0.25)'; }}
        />
      </div>
      {showBalance && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          {[25, 50, 75, 100].map((pct) => (
            <button key={pct} onClick={() => setAmount((balance * pct / 100).toFixed(2))} style={{
              padding: '0.375rem 0.75rem', borderRadius: '2rem',
              border: '1.5px solid rgba(168,132,90,0.25)', background: 'rgba(255,255,255,0.7)',
              color: '#78716c', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer',
            }}>{pct}%</button>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionLayout({ title, subtitle, onBack, children }: { title: string; subtitle: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #faf8f5 0%, #f2ede4 100%)', maxWidth: '480px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <header style={{ padding: '1.25rem 1.5rem', background: 'rgba(250,248,245,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(168,132,90,0.12)', position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a8845a', padding: '0.25rem', display: 'flex' }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1rem', fontWeight: '800', color: '#1c1917' }}>{title}</div>
          <div style={{ fontSize: '0.75rem', color: '#78716c' }}>{subtitle}</div>
        </div>
      </header>
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '3rem' }}>
        {children}
      </div>
    </div>
  );
}

function SubmitButton({ label, loading, onClick, icon }: { label: string; loading: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      width: '100%', background: loading ? 'rgba(168,132,90,0.4)' : 'linear-gradient(135deg, #a8845a, #967554)',
      color: 'white', padding: '1rem', borderRadius: '1.25rem', border: 'none',
      fontSize: '1rem', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
      boxShadow: loading ? 'none' : '0 8px 24px rgba(168,132,90,0.3)', marginTop: '0.5rem',
    }}>
      {loading ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</> : <>{icon} {label}</>}
    </button>
  );
}