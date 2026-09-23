import React from 'react';
import { useAuth } from '../context/AuthContext';

export function Sidebar({ currentView, onViewChange }) {
  const { currentRole, currentUser } = useAuth();

  const roleLabel =
    currentRole === 'ADMIN' ? 'System Admin' :
    currentRole === 'HOD' ? 'Biomedical HOD' :
    currentRole === 'STAFF' ? 'BioMed Engineer' :
    'Guest';

  const sections = [
    {
      label: 'Command',
      items: [
        { id: 'admin', label: 'Admin Control Panel', icon: '🛡', roleReq: 'ADMIN' },
        { id: 'hod-dashboard', label: 'HOD Executive Dashboard', icon: '👑', roleReq: 'HOD' },
      ]
    },
    {
      label: 'Operations',
      items: [
        { id: 'work-orders', label: 'Work Orders & Tickets', icon: '📋' },
        { id: 'inventory', label: 'Asset & Inventory Registry', icon: '🩺' },
        { id: 'reports', label: 'Master Reports & Audit', icon: '📊' },
      ]
    },
    {
      label: 'Clinical tools',
      items: [
        { id: 'dicom', label: 'DICOM Radiology Viewer', icon: '🔬' },
        { id: 'telemetry', label: 'ICU Waveform Telemetry', icon: '📈' },
      ]
    }
  ];

  return (
    <aside className="app-sidebar">
      <div className="brand-block">
        <img
          className="sidebar-brand-logo"
          src="/assets/stavya_logo.png"
          alt="Stavya Intelligence"
        />
      </div>

      <div className="sidebar-role">
        <span>Signed in as</span>
        <strong>{roleLabel}</strong>
        <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500, marginTop: 2 }}>
          {currentUser?.name ? currentUser.name.split('(')[0].trim() : 'Not logged in'}
        </span>
      </div>

      <nav className="sidebar-nav">
        {sections.map((section) => {
          const visibleItems = section.items.filter((item) => {
            if (item.roleReq === 'ADMIN' && currentRole !== 'ADMIN') return false;
            if (item.roleReq === 'HOD' && currentRole !== 'HOD' && currentRole !== 'ADMIN') return false;
            return true;
          });
          if (!visibleItems.length) return null;

          return (
            <div key={section.label} className="nav-section">
              <div className="nav-section-label">{section.label}</div>
              {visibleItems.map((item) => {
                const isActive = currentView === item.id;
                return (
                  <div
                    key={item.id}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => onViewChange(item.id)}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
