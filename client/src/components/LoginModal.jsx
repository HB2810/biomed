import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function LoginModal() {
  const { showLoginModal, setShowLoginModal, loginWithCredentials, currentUser } = useAuth();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!showLoginModal) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const result = await loginWithCredentials(loginId, password);
    if (!result.success) {
      setErrorMsg(result.error || 'Invalid credentials');
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && currentUser) setShowLoginModal(false);
      }}
    >
      <div className="modal-content" style={{ position: 'relative' }}>
        {currentUser && (
          <button
            type="button"
            onClick={() => setShowLoginModal(false)}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'transparent',
              border: '1px solid var(--line)',
              color: 'var(--muted)',
              fontSize: '0.95rem',
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              cursor: 'pointer',
              zIndex: 10
            }}
            title="Close"
          >
            ✕
          </button>
        )}

        <div className="login-brand-bar">
          <img src="/assets/stavya_logo.png" alt="Stavya Intelligence" />
          <div>
            <h3>Stavya Intelligence</h3>
            <p>Biomedical Engineering Suite</p>
          </div>
        </div>

        <div style={{ padding: '8px 24px 24px' }}>
          <div className="login-safety-chip">
            Secure portal authentication for hospital biomed staff
          </div>

          <h4
            style={{
              textAlign: 'center',
              marginBottom: '4px',
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--navy)'
            }}
          >
            Sign in
          </h4>
          <p
            style={{
              textAlign: 'center',
              marginBottom: '18px',
              fontSize: '0.8125rem',
              color: 'var(--muted)'
            }}
          >
            Enter your Login ID and password to continue.
          </p>

          {errorMsg && (
            <div
              style={{
                background: '#fef2f2',
                color: '#b91c1c',
                border: '1px solid #fecaca',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.8125rem',
                marginBottom: '14px',
                textAlign: 'center',
                fontWeight: 600
              }}
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  marginBottom: '6px',
                  color: 'var(--muted)',
                  letterSpacing: '0.02em'
                }}
              >
                Login ID
              </label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="Enter your Login ID"
                required
                autoComplete="username"
                style={{
                  width: '100%',
                  height: '44px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--line-strong)',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  marginBottom: '6px',
                  color: 'var(--muted)',
                  letterSpacing: '0.02em'
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                autoComplete="current-password"
                style={{
                  width: '100%',
                  height: '44px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--line-strong)',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', height: '42px', justifyContent: 'center' }}
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
