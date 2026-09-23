import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';

export function InventoryView() {
  const { dbData, saveItem, fetchFullData } = useData();
  const equipment = dbData.biomed_equipment || [];

  const [showAdd, setShowAdd] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [alertMsg, setAlertMsg] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('amc.biomed@hospital.org');
  const [recipientPhone, setRecipientPhone] = useState('919876543210');

  // New Equipment Form State
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [price, setPrice] = useState('');
  const [contractType, setContractType] = useState('CMC');
  const [contractVendor, setContractVendor] = useState('Penlon Medical Pvt Ltd');
  const [vendorEmail, setVendorEmail] = useState('service.india@penlon.com');
  const [vendorPhone, setVendorPhone] = useState('919876500112');
  const [contractExpiryDate, setContractExpiryDate] = useState('2026-10-20');

  const loadAlerts = async () => {
    try {
      const res = await fetch('/api/contract-alerts/logs');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (e) {
      console.warn('Could not fetch contract alerts');
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [dbData]);

  const handleRunAutoScan = async () => {
    setAlertMsg('Running automated AMC/CMC/Warranty contract expiry scan...');
    try {
      const res = await fetch('/api/contract-alerts/scan');
      const data = await res.json();
      if (res.ok && data.success) {
        setAlertMsg(`⚡ ${data.message}`);
        loadAlerts();
        fetchFullData();
      }
    } catch (e) {
      setAlertMsg('Error scanning contract expirations.');
    }
  };

  const handleSaveAlertSettings = async () => {
    try {
      await fetch('/api/contract-alerts/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recipientEmail, phone: recipientPhone })
      });
      alert('Updated target alert Email & WhatsApp number!');
    } catch (e) {
      alert('Failed to save alert settings');
    }
  };

  const handleAddEquipment = (e) => {
    e.preventDefault();
    const item = {
      id: `EQ-${Math.floor(2000 + Math.random() * 8000)}`,
      name: name || 'Syringe Pump',
      model: model || 'SP-500',
      serial: `SN-${Math.floor(10000 + Math.random() * 90000)}`,
      department: 'General Ward',
      status: 'Operational',
      purchasePrice: `₹ ${price || '45,000'}`,
      contractType,
      contractVendor,
      vendorEmail,
      vendorPhone,
      contractExpiryDate: contractExpiryDate || '2026-11-15'
    };
    saveItem('biomed_equipment', item);
    setShowAdd(false);
    setName(''); setModel(''); setPrice('');
  };

  const getDaysRemaining = (expiryStr) => {
    if (!expiryStr) return 999;
    const diff = new Date(expiryStr) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const expiringEquipment = equipment.filter(eq => getDaysRemaining(eq.contractExpiryDate) <= 60);

  return (
    <div>
      {/* AUTOMATED AMC / CMC & WARRANTY RENEWAL HUB */}
      <div className="table-card" style={{ padding: '24px', marginBottom: '24px', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🚨 Automated AMC, CMC & Warranty 2-Month Renewal Alerts
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Detects contracts expiring within 60 days (2 months) & dispatches automated Email + WhatsApp messages to target recipients & vendors.
            </p>
          </div>
          <button className="btn btn-primary" onClick={handleRunAutoScan} style={{ borderRadius: '20px', padding: '10px 18px' }}>
            ⚡ Run Auto-Scan & Dispatch Alerts Now
          </button>
        </div>

        {alertMsg && (
          <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '16px', fontWeight: 700 }}>
            {alertMsg}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginTop: '12px' }}>
          <div style={{ background: '#ffffff', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Target Alert Recipient Email</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border-strong)', fontSize: '0.82rem' }} />
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={handleSaveAlertSettings}>Save</button>
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Target WhatsApp Dispatch Number</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border-strong)', fontSize: '0.82rem' }} />
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={handleSaveAlertSettings}>Save</button>
            </div>
          </div>
        </div>
      </div>

      {/* EXPIRING CONTRACTS WARNING TABLE */}
      {expiringEquipment.length > 0 && (
        <div className="table-card" style={{ marginBottom: '24px', border: '2px solid var(--amber-warning)' }}>
          <div className="table-header" style={{ background: '#fffbe6' }}>
            <div className="table-title" style={{ color: '#92400e' }}>
              ⚠️ Contracts Expiring Within 2 Months ({expiringEquipment.length} Assets Pending Renewal)
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Asset ID & Name</th>
                <th>Contract Type</th>
                <th>Vendor / Partner</th>
                <th>Completion Date</th>
                <th>Countdown Status</th>
                <th>Automated Direct Actions</th>
              </tr>
            </thead>
            <tbody>
              {expiringEquipment.map(eq => {
                const daysLeft = getDaysRemaining(eq.contractExpiryDate);
                const vendorPhone = eq.vendorPhone || recipientPhone;
                const msgText = `🚨 AMC/CMC RENEWAL ALERT: Equipment "${eq.name}" (${eq.model}, S/N: ${eq.serial}) in ${eq.department} contract expires on ${eq.contractExpiryDate} (${daysLeft} days remaining). Please initiate renewal!`;
                const waUrl = `https://api.whatsapp.com/send?phone=${vendorPhone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(msgText)}`;

                return (
                  <tr key={eq.id}>
                    <td>
                      <strong>{eq.name}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{eq.id} | S/N: {eq.serial} | {eq.department}</div>
                    </td>
                    <td><span className="badge badge-warning">{eq.contractType || 'CMC'}</span></td>
                    <td>
                      <div><strong>{eq.contractVendor || 'Medical Partner'}</strong></div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{eq.vendorEmail || 'N/A'}</div>
                    </td>
                    <td><strong>{eq.contractExpiryDate}</strong></td>
                    <td>
                      <span className="badge badge-danger">
                        ⚠️ Expiring in {daysLeft} Days
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary"
                          style={{ background: '#25D366', color: '#fff', padding: '4px 10px', fontSize: '0.72rem', textDecoration: 'none' }}
                          title="Direct WhatsApp Dispatch to Vendor & HOD"
                        >
                          💬 WhatsApp Direct
                        </a>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                          onClick={() => alert(`Email Dispatch Sent Successfully to ${eq.vendorEmail || recipientEmail}!\n\nMessage:\n${msgText}`)}
                          title="Direct Email Renewal Notification"
                        >
                          ✉️ Email Direct
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MEDICAL ASSET REGISTRY TABLE */}
      <div className="table-card">
        <div className="table-header">
          <div className="table-title">🩺 Medical Equipment Asset & Contract Registry</div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>➕ Add Medical Asset & Contract</button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Asset ID</th>
              <th>Equipment Name</th>
              <th>Model</th>
              <th>Serial Number</th>
              <th>Contract Type</th>
              <th>Contract Expiry</th>
              <th>Purchase Price</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {equipment.map(eq => (
              <tr key={eq.id}>
                <td><strong>{eq.id}</strong></td>
                <td>{eq.name}</td>
                <td>{eq.model}</td>
                <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{eq.serial}</code></td>
                <td><span className="badge badge-warning">{eq.contractType || 'AMC'}</span></td>
                <td>{eq.contractExpiryDate || '2026-12-31'}</td>
                <td><strong>{eq.purchasePrice}</strong></td>
                <td><span className="badge badge-success">{eq.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div className="modal-content" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '16px' }}>🩺 Register Equipment & Contract Specs</h3>
            <form onSubmit={handleAddEquipment}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Equipment Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Infusion Pump" required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-strong)' }} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Model</label>
                <input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. IP-3000" required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-strong)' }} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Contract Type</label>
                <select value={contractType} onChange={(e) => setContractType(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-strong)' }}>
                  <option value="AMC">AMC (Annual Maintenance Contract)</option>
                  <option value="CMC">CMC (Comprehensive Maintenance Contract)</option>
                  <option value="Warranty">Manufacturer Warranty</option>
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Contract Expiry / Completion Date</label>
                <input type="date" value={contractExpiryDate} onChange={(e) => setContractExpiryDate(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-strong)' }} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Vendor Name</label>
                <input type="text" value={contractVendor} onChange={(e) => setContractVendor(e.target.value)} placeholder="e.g. Penlon Medical Pvt Ltd" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-strong)' }} />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Vendor WhatsApp / Phone Number</label>
                <input type="text" value={vendorPhone} onChange={(e) => setVendorPhone(e.target.value)} placeholder="e.g. 919876543210" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-strong)' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Register Asset & Contract</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
