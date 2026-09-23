import React from 'react';
import { useAuth } from '../context/AuthContext';

export function Sidebar({ currentView, onViewChange }) {
  const { currentRole } = useAuth();

  const navItems = [
    { id: 'admin', label: 'Admin Control Panel', icon: '🛡️', roleReq: 'ADMIN' },
    { id: 'hod-dashboard', label: 'HOD Executive Dashboard', icon: '👑', roleReq: 'HOD' },
    { id: 'work-orders', label: 'Work Orders & Tickets', icon: '📋' },
    { id: 'inventory', label: 'Asset & Inventory Registry', icon: '🩺' },
    { id: 'reports', label: 'Master Reports & Audit', icon: '📊' },
    { id: 'dicom', label: 'DICOM Radiology Viewer', icon: '🔬' },
    { id: 'telemetry', label: 'ICU Waveform Telemetry', icon: '📈' }
  ];

  return (
    <aside className="app-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand-icon">
          <img src="/assets/stavya-symbol-transparent.png" alt="Stavya Symbol" />
        </div>
        <div>
          <div className="sidebar-title">Stavya Intelligence</div>
          <div className="sidebar-sub">BioMedPulse OS React</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => {
          if (item.roleReq === 'ADMIN' && currentRole !== 'ADMIN') return null;
          if (item.roleReq === 'HOD' && currentRole !== 'HOD' && currentRole !== 'ADMIN') return null;

          const isActive = currentView === item.id;
          return (
            <div
              key={item.id}
              className={`nav-link ${isActive ? 'active' : ''}`}
              onClick={() => onViewChange(item.id)}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
