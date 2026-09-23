import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LoginModal } from './components/LoginModal';

import { AdminDashboard } from './views/AdminDashboard';
import { HODDashboard } from './views/HODDashboard';
import { WorkOrdersHub } from './views/WorkOrdersHub';
import { InventoryView } from './views/InventoryView';
import { ReportsHub } from './views/ReportsHub';
import { DicomViewer } from './components/DicomViewer';
import { Telemetry } from './components/Telemetry';

function MainAppContent() {
  const [currentView, setCurrentView] = useState('admin');

  const renderView = () => {
    switch (currentView) {
      case 'admin':
        return <AdminDashboard />;
      case 'hod-dashboard':
        return <HODDashboard />;
      case 'work-orders':
        return <WorkOrdersHub />;
      case 'inventory':
        return <InventoryView />;
      case 'reports':
        return <ReportsHub />;
      case 'dicom':
        return <DicomViewer />;
      case 'telemetry':
        return <Telemetry />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="app-main">
        <Header currentView={currentView} onActionClick={() => alert('Quick Action Triggered')} />
        <div className="content-body">
          {renderView()}
        </div>
      </main>
      <LoginModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <MainAppContent />
      </DataProvider>
    </AuthProvider>
  );
}
