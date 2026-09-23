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

  const handleQuickLogin = (id, pass) => {
    setLoginId(id);
    setPassword(pass);
    loginWithCredentials(id, pass);
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget && currentUser) setShowLoginModal(false); }}>
      <div className="modal-content" style={{ position: 'relative' }}>
        {currentUser && (
          <button
            onClick={() => setShowLoginModal(false)}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#ffffff',
              fontSize: '1.1rem',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              cursor: 'pointer',
              zIndex: 10
            }}
            title="Close Login Modal"
          >
            ✕
          </button>
        )}

        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', background: '#ffffff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/assets/stavya-symbol-transparent.png" alt="Stavya" style={{ width: '32px', height: '32px' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Stavya Intelligence</h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Biomedical Engineering Suite</p>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          <h4 style={{ textAlign: 'center', marginBottom: '4px', fontSize: '1.05rem', color: 'var(--text-main)' }}>Portal Authentication</h4>
          <p style={{ textAlign: 'center', marginBottom: '18px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sign in with your Login ID & Password to access features.</p>

          {errorMsg && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '14px', textAlign: 'center', fontWeight: 600 }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Login ID / Username</label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="Enter ID (e.g. admin, hod, staff)"
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.88rem' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Password"
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.88rem' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '42px', borderRadius: '21px', justifyContent: 'center' }}>
              🔐 Sign In to Stavya Intelligence
            </button>
          </form>

          <div style={{ marginTop: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
            <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '8px', color: 'var(--blue-primary)' }}>
              🔑 Quick 1-Click Role Switch:
            </div>
            <div
              onClick={() => handleQuickLogin('admin', 'admin123')}
              style={{ fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center', padding: '8px 12px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}
            >
              <span>🛡️ <strong>System Admin:</strong> admin</span>
              <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.72rem' }}>1-Click Login ⚡</span>
            </div>
            <div
              onClick={() => handleQuickLogin('hod', 'hod123')}
              style={{ fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center', padding: '8px 12px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}
            >
              <span>👑 <strong>Biomed HOD:</strong> hod</span>
              <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.72rem' }}>1-Click Login ⚡</span>
            </div>
            <div
              onClick={() => handleQuickLogin('staff', 'staff123')}
              style={{ fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}
            >
              <span>🛠️ <strong>BioMed Engineer:</strong> staff</span>
              <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.72rem' }}>1-Click Login ⚡</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
