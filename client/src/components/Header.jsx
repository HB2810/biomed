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

  const getRoleDisplayName = () => {
    if (!currentUser) return 'Not Logged In';
    return (currentUser.name || 'User').split('(')[0].trim();
  };

  const roleShort =
    currentRole === 'ADMIN' ? 'Admin' :
    currentRole === 'HOD' ? 'HOD' :
    currentRole === 'STAFF' ? 'Engineer' :
    'Guest';

  const viewTitles = {
    admin: { title: 'Admin Control Panel', sub: 'System Settings & Audit Trail' },
    'hod-dashboard': { title: 'Biomedical HOD Executive Dashboard', sub: 'Work Order Approval Oversight & Staff Workload KPIs' },
    'work-orders': { title: 'Work Orders & Breakdown Tickets', sub: 'Preventive & Corrective Maintenance Hub' },
    inventory: { title: 'Biomedical Asset & Inventory Registry', sub: 'Equipment, Implants, Spares & Condemnation' },
    reports: { title: 'Executive Master Reports & Analytics', sub: 'Audit Certification & KPI Performance Hub' },
    dicom: { title: 'DICOM Radiographic Viewer', sub: 'Clinical Diagnostic Image Processing' },
    telemetry: { title: 'Real-Time Telemetry Monitor', sub: 'ICU Patient Parameter Waveform Monitor' }
  };

  const currentMeta = viewTitles[currentView] || { title: 'Stavya Intelligence', sub: 'Biomedical Engineering Suite' };

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="module-title">
          <span aria-hidden="true">🩺</span>
          <span>BioMedPulse OS</span>
        </div>
        <div className="header-context">
          <strong>{currentMeta.title}</strong>
          <span>{currentMeta.sub}</span>
        </div>
      </div>

      <div className="header-actions">
        <div className="header-clock-pill">{clock || '--:--:--'}</div>

        <div
          className="user-profile-badge"
          onClick={() => setShowLoginModal(true)}
          title="Switch user / role access"
        >
          <div className="profile-copy">
            <strong>{getRoleDisplayName()}</strong>
            <small>
              {roleShort} · {currentUser?.loginId || currentUser?.id || 'guest'}
            </small>
          </div>
        </div>

        <button type="button" className="btn btn-secondary" onClick={logout} title="Sign Out">
          Logout
        </button>

        <button type="button" className="btn btn-primary" onClick={onActionClick}>
          Action
        </button>
      </div>
    </header>
  );
}
