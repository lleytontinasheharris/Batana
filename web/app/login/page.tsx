'use client';

import { useState } from 'react';
import { Eye, EyeOff, ArrowRight, Loader } from 'lucide-react';
import BatanaLogo from '../components/BatanaLogo';
import { loginUser } from '../lib/api';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !pin) {
      setError('Phone number and PIN are required');
      return;
    }
    if (pin.length !== 4) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const data = await loginUser(phone, pin);

      // Save token and phone to localStorage
      localStorage.setItem('batana_token', data.token);
      localStorage.setItem('batana_phone', phone);

      // Redirect to dashboard
      window.location.href = '/dashboard';

    } catch (err: any) {
      setError(err.message || 'Login failed. Check your details.');
    } finally {
      setLoading(false);
    }
  };

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
    }}>

      {/* Background blobs */}
      <div style={{
        position: 'fixed',
        top: '-10%',
        right: '-10%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(168,132,90,0.15), transparent)',
        borderRadius: '50%',
        filter: 'blur(40px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed',
        bottom: '10%',
        left: '-10%',
        width: '250px',
        height: '250px',
        background: 'radial-gradient(circle, rgba(168,132,90,0.1), transparent)',
        borderRadius: '50%',
        filter: 'blur(40px)',
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '3rem',
      }}>
        <BatanaLogo size={40} />
        <div>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: '900',
            color: '#3a2a1c',
            letterSpacing: '0.08em',
            lineHeight: '1',
          }}>
            BATANA
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#a8845a',
            fontStyle: 'italic',
          }}>
            building together
          </div>
        </div>
      </div>

      {/* Heading */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '800',
          color: '#1c1917',
          marginBottom: '0.5rem',
          lineHeight: '1.2',
        }}>
          Sign in to<br />your account
        </h1>
        <p style={{
          fontSize: '0.875rem',
          color: '#78716c',
        }}>
          Enter your phone number and PIN to continue
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        flex: 1,
      }}>
        {/* Phone field */}
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
            Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07X XXX XXXX"
            maxLength={10}
            style={{
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
            }}
            onFocus={(e) => { e.target.style.borderColor = '#a8845a'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(168,132,90,0.25)'; }}
          />
        </div>

        {/* PIN field */}
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
            PIN
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="4-digit PIN"
              maxLength={4}
              style={{
                width: '100%',
                padding: '1rem 3rem 1rem 1.25rem',
                borderRadius: '1rem',
                border: '1.5px solid rgba(168,132,90,0.25)',
                background: 'rgba(255,255,255,0.8)',
                fontSize: '1.5rem',
                letterSpacing: '0.5rem',
                color: '#1c1917',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#a8845a'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(168,132,90,0.25)'; }}
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#78716c',
                padding: '0.25rem',
              }}
            >
              {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '0.75rem',
            padding: '0.875rem 1rem',
            fontSize: '0.875rem',
            color: '#dc2626',
          }}>
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            background: loading
              ? 'rgba(168,132,90,0.5)'
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
            transition: 'all 0.3s',
            marginTop: '0.5rem',
          }}
        >
          {loading ? (
            <>
              <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
              Signing in...
            </>
          ) : (
            <>
              Sign In
              <ArrowRight size={18} />
            </>
          )}
        </button>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>

        {/* Register link */}
        <p style={{
          textAlign: 'center',
          fontSize: '0.875rem',
          color: '#78716c',
          marginTop: '0.5rem',
        }}>
          New to BATANA?{' '}
          <a href="/register" style={{
            color: '#a8845a',
            fontWeight: '600',
            textDecoration: 'none',
          }}>
            Create an account
          </a>
        </p>
      </form>
    </div>
  );
}