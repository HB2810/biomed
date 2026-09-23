import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export function Header({ currentView, onActionClick }) {
  const { currentUser, currentRole, logout, setShowLoginModal } = useAuth();
  const [clock, setClock] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date().toLocaleTimeString());
    }, 1000);
    setClock(new Date().toLocaleTimeString());
    return () => clearInterval(timer);
  }, []);

  const getRoleEmoji = () => {
    if (currentRole === 'ADMIN') return '🛡️';
    if (currentRole === 'HOD') return '👑';
    return '🛠️';
  };

  const getRoleDisplayName = () => {
    if (!currentUser) return 'Not Logged In';
    return (currentUser.name || 'User').split('(')[0].trim();
  };

  const viewTitles = {
    'admin': { title: 'Admin Control Panel', sub: 'System Settings & Audit Trail' },
    'hod-dashboard': { title: 'Biomedical HOD Executive Dashboard', sub: 'Work Order Approval Oversight & Staff Workload KPIs' },
    'work-orders': { title: 'Work Orders & Breakdown Tickets', sub: 'Preventive Maintenance & Corrective Maintenance Hub' },
    'inventory': { title: 'Biomedical Asset & Inventory Registry', sub: 'Medical Equipment, Implants, Spare Parts & Condemnation' },
    'reports': { title: 'Executive Master Reports & Analytics', sub: 'Audit Certification & KPI Performance Hub' },
    'dicom': { title: 'DICOM Radiographic Viewer', sub: 'Clinical Diagnostic Image Processing' },
    'telemetry': { title: 'Real-Time Telemetry Monitor', sub: 'ICU Patient Parameter Waveform Monitor' }
  };

  const currentMeta = viewTitles[currentView] || { title: 'Stavya Intelligence', sub: 'Biomedical Engineering Suite' };

  return (
    <header className="app-header">
      <div className="header-title-area">
        <h2>{currentMeta.title}</h2>
        <p>{currentMeta.sub}</p>
      </div>

      <div className="header-actions">
        <div className="header-clock-pill">
          {clock || '--:--:--'}
        </div>

        <div
          className="user-profile-badge"
          onClick={() => setShowLoginModal(true)}
          title="Click to Switch User / Role Access"
        >
          <span>{getRoleEmoji()}</span>
          <span style={{ fontWeight: 700, fontSize: '0.78rem' }}>{getRoleDisplayName()}</span>
          <span style={{ fontSize: '0.7rem', opacity: 0.85, fontFamily: 'var(--font-mono)' }}>
            ({currentUser?.loginId || currentUser?.id || 'guest'})
          </span>
        </div>

        <button className="btn btn-secondary" onClick={logout} title="Sign Out">
          🚪 Logout
        </button>

        <button className="btn btn-primary" onClick={onActionClick}>
          ➕ Action
        </button>
      </div>
    </header>
  );
}
