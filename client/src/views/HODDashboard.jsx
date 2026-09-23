import React from 'react';
import { useData } from '../context/DataContext';

export function HODDashboard() {
  const { dbData, saveItem } = useData();
  const todos = dbData.biomed_todos || [];
  const workOrders = dbData.biomed_work_orders || [];

  const handleApproveWorkOrder = (wo) => {
    const updated = { ...wo, status: 'Approved by HOD' };
    saveItem('biomed_work_orders', updated);
    alert(`Work order ${wo.id} successfully approved with Dr. Alok Verma HOD digital seal.`);
  };

  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--amber-warning)' }}>
          <div>
            <div className="kpi-label">Pending HOD Approvals</div>
            <div className="kpi-value">{workOrders.filter(w => w.status !== 'Approved by HOD').length}</div>
          </div>
          <div style={{ fontSize: '1.8rem' }}>👑</div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid var(--blue-primary)' }}>
          <div>
            <div className="kpi-label">Active Assigned Tasks</div>
            <div className="kpi-value">{todos.length}</div>
          </div>
          <div style={{ fontSize: '1.8rem' }}>📝</div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid var(--emerald-success)' }}>
          <div>
            <div className="kpi-label">Preventive Maintenance Due</div>
            <div className="kpi-value">3</div>
          </div>
          <div style={{ fontSize: '1.8rem' }}>🛠️</div>
        </div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <div className="table-title">👑 Executive HOD Approval Queue</div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Equipment</th>
              <th>Department</th>
              <th>Assigned Engineer</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {workOrders.map(wo => (
              <tr key={wo.id}>
                <td><strong>{wo.id}</strong></td>
                <td>{wo.equipmentName}</td>
                <td>{wo.department}</td>
                <td>{wo.assignedTo}</td>
                <td>
                  <span className={`badge ${wo.status === 'Approved by HOD' ? 'badge-success' : 'badge-warning'}`}>
                    {wo.status}
                  </span>
                </td>
                <td>
                  {wo.status !== 'Approved by HOD' && (
                    <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handleApproveWorkOrder(wo)}>
                      ✓ Approve
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-card">
        <div className="table-header">
          <div className="table-title">📝 Assigned BioMed Staff Tasks & Inspections</div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Task ID</th>
              <th>Title</th>
              <th>Assigned To</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {todos.map(t => (
              <tr key={t.id}>
                <td><strong>{t.id}</strong></td>
                <td>{t.title}</td>
                <td>{t.assignedTo}</td>
                <td>{t.category}</td>
                <td><span className="badge badge-warning">{t.priority}</span></td>
                <td><span className="badge badge-success">{t.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
