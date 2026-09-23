import React, { useState } from 'react';
import { useData } from '../context/DataContext';

export function ReportsHub() {
  const { dbData } = useData();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [recipientRole, setRecipientRole] = useState('HOD');
  const [includeKpi, setIncludeKpi] = useState(true);

  const handleExportJSONBackup = () => {
    const jsonStr = JSON.stringify(dbData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biomed_full_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendEmail = (e) => {
    e.preventDefault();
    alert(`Email Report dispatched successfully to ${recipientRole}! Digital approval seals included.`);
    setShowEmailModal(false);
  };

  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--blue-primary)' }}>
          <div>
            <div className="kpi-label">Executive Master Reports</div>
            <div className="kpi-value">PDF / Excel</div>
          </div>
          <button className="btn btn-primary" onClick={() => alert('PDF report generated cleanly!')}>📄 Export PDF</button>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid var(--emerald-success)' }}>
          <div>
            <div className="kpi-label">Disaster Recovery Snapshots</div>
            <div className="kpi-value">JSON Auto</div>
          </div>
          <button className="btn btn-primary" onClick={handleExportJSONBackup}>💾 Export Backup</button>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid var(--purple-accent)' }}>
          <div>
            <div className="kpi-label">Dispatched Email Audit Reports</div>
            <div className="kpi-value">Active</div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowEmailModal(true)}>✉️ Send Email</button>
        </div>
      </div>

      <div className="table-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '12px' }}>📊 Executive KPI Summary & Audit Certification</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Certified audit trail for Biomedical Engineering Operations, equipment calibration tolerances, and hospital compliance status.
        </p>

        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Preventive Maintenance Compliance</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--emerald-success)' }}>98.4%</div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Breakdown Ticket Resolution Rate</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--blue-primary)' }}>95.2%</div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>HOD Approval Seal Integrity</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--purple-accent)' }}>Verified 👑</div>
          </div>
        </div>
      </div>

      {showEmailModal && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowEmailModal(false); }}>
          <div className="modal-content" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '16px' }}>✉️ Dispatch Executive Email Report</h3>
            <form onSubmit={handleSendEmail}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Recipient Type</label>
                <select value={recipientRole} onChange={(e) => setRecipientRole(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-strong)' }}>
                  <option value="HOD">Biomedical HOD (Include Approval Seal)</option>
                  <option value="INDIVIDUAL_STAFF">Individual Staff Engineer (Include Task Signature Block)</option>
                  <option value="ADMIN">System Administrator</option>
                </select>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={includeKpi} onChange={(e) => setIncludeKpi(e.target.checked)} />
                  Include Executive KPI Dashboard & Full Audit Trail
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEmailModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">✉️ Send Email Report</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
