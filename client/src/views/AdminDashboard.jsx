import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';

export function AdminDashboard() {
  const { dbData, fetchFullData } = useData();
  const [apiKeys, setApiKeys] = useState([]);
  const [showGenModal, setShowGenModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [clientName, setClientName] = useState('');

  const staffList = dbData.biomed_staff || [];
  const auditLogs = dbData.biomed_audit_log || [];
  const equipment = dbData.biomed_equipment || [];
  const workOrders = dbData.biomed_work_orders || [];

  const loadApiKeys = async () => {
    try {
      const res = await fetch('/api/keys');
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data);
      } else {
        setApiKeys(dbData.biomed_api_keys || []);
      }
    } catch (e) {
      setApiKeys(dbData.biomed_api_keys || []);
    }
  };

  useEffect(() => {
    loadApiKeys();
  }, [dbData]);

  const handleGenerateKey = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/keys/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: keyName || 'Hospital Information System (HIS)',
          client: clientName || 'External Software Port'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`New API Key Generated Successfully!\nAPI Key: ${data.keyRecord.apiKey}`);
        setShowGenModal(false);
        setKeyName(''); setClientName('');
        loadApiKeys();
        fetchFullData();
      }
    } catch (e) {
      alert('Error generating API key');
    }
  };

  const handleRevokeKey = async (id) => {
    if (confirm('Are you sure you want to revoke this API key? External software using this key will lose access immediately.')) {
      try {
        await fetch(`/api/keys/${id}`, { method: 'DELETE' });
        loadApiKeys();
        fetchFullData();
      } catch (e) {
        alert('Failed to revoke API key');
      }
    }
  };

  const copySnippet = (apiKey) => {
    const snippet = `curl -X GET "http://localhost:5000/api/v1/external/equipment" -H "x-api-key: ${apiKey}"`;
    navigator.clipboard.writeText(snippet);
    alert(`cURL Interoperability Command Copied to Clipboard:\n\n${snippet}`);
  };

  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--blue-primary)' }}>
          <div>
            <div className="kpi-label">Total Staff Members</div>
            <div className="kpi-value">{staffList.length}</div>
          </div>
          <div style={{ fontSize: '1.8rem' }}>👥</div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid var(--emerald-success)' }}>
          <div>
            <div className="kpi-label">Registered Medical Assets</div>
            <div className="kpi-value">{equipment.length}</div>
          </div>
          <div style={{ fontSize: '1.8rem' }}>🩺</div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid var(--amber-warning)' }}>
          <div>
            <div className="kpi-label">Active Work Orders</div>
            <div className="kpi-value">{workOrders.length}</div>
          </div>
          <div style={{ fontSize: '1.8rem' }}>📋</div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid var(--purple-accent)' }}>
          <div>
            <div className="kpi-label">Active External API Keys</div>
            <div className="kpi-value">{apiKeys.filter(k => k.status === 'Active').length}</div>
          </div>
          <div style={{ fontSize: '1.8rem' }}>🔑</div>
        </div>
      </div>

      {/* EXTERNAL SOFTWARE API KEY INTEROPERABILITY PORT */}
      <div className="table-card">
        <div className="table-header">
          <div>
            <div className="table-title">🔑 External Software API Integration Keys (Port 5000)</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Secure API authentication keys for third-party hospital software (HIS, EMR, PACS, LIMS).</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowGenModal(true)}>🔑 Generate API Key</button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Key ID</th>
              <th>Integration System Name</th>
              <th>Client Port</th>
              <th>API Secret Key</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {apiKeys.map(k => (
              <tr key={k.id}>
                <td><strong>{k.id}</strong></td>
                <td>{k.name}</td>
                <td>{k.client}</td>
                <td><code style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '6px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{k.apiKey}</code></td>
                <td><span className="badge badge-success">{k.status}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.72rem' }} onClick={() => copySnippet(k.apiKey)} title="Copy cURL fetch code snippet">
                      📋 Copy Port Code
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.72rem', color: '#991b1b' }} onClick={() => handleRevokeKey(k.id)} title="Revoke API Key">
                      🗑️ Revoke
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-card">
        <div className="table-header">
          <div className="table-title">👥 Authorized System Users & Privilege Roles</div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Login ID</th>
              <th>Role</th>
              <th>Contact Email</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map(s => (
              <tr key={s.id}>
                <td><strong>{s.id}</strong></td>
                <td>{s.name}</td>
                <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{s.loginId}</code></td>
                <td><span className="badge badge-success">{s.role}</span></td>
                <td>{s.email || 'N/A'}</td>
                <td><span className="badge badge-success">ACTIVE</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showGenModal && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowGenModal(false); }}>
          <div className="modal-content" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '16px' }}>🔑 Generate API Key for External Software</h3>
            <form onSubmit={handleGenerateKey}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>System / Integration Name</label>
                <input type="text" value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="e.g. Hospital Information System (HIS)" required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-strong)' }} />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Client Software Client/Port Label</label>
                <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. EMR Portal Gateway" required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-strong)' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowGenModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">⚡ Generate Secure Key</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
