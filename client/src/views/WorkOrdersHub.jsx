import React, { useState } from 'react';
import { useData } from '../context/DataContext';

export function WorkOrdersHub() {
  const { dbData, saveItem } = useData();
  const workOrders = dbData.biomed_work_orders || [];
  const [showNewModal, setShowNewModal] = useState(false);
  const [eqName, setEqName] = useState('');
  const [dept, setDept] = useState('ICU');
  const [assigned, setAssigned] = useState('Eng. Rajesh Sharma');

  const handleCreateTicket = (e) => {
    e.preventDefault();
    const newTicket = {
      id: `WO-${Math.floor(3000 + Math.random() * 9000)}`,
      equipmentId: 'EQ-GENERIC',
      equipmentName: eqName || 'Infusion Pump',
      department: dept,
      breakdownType: 'Calibration Drift',
      priority: 'High',
      assignedTo: assigned,
      reportedDate: new Date().toLocaleString(),
      status: 'Open Ticket'
    };
    saveItem('biomed_work_orders', newTicket);
    setShowNewModal(false);
    setEqName('');
  };

  return (
    <div>
      <div className="table-card">
        <div className="table-header">
          <div className="table-title">📋 Active Work Orders & Maintenance Breakdown Tickets</div>
          <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>➕ Create Work Order</button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Work Order ID</th>
              <th>Equipment</th>
              <th>Department</th>
              <th>Issue Breakdown</th>
              <th>Priority</th>
              <th>Assigned Engineer</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {workOrders.map(wo => (
              <tr key={wo.id}>
                <td><strong>{wo.id}</strong></td>
                <td>{wo.equipmentName}</td>
                <td>{wo.department}</td>
                <td>{wo.breakdownType}</td>
                <td><span className={`badge ${wo.priority === 'Critical' ? 'badge-danger' : 'badge-warning'}`}>{wo.priority}</span></td>
                <td>{wo.assignedTo}</td>
                <td><span className="badge badge-success">{wo.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNewModal && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowNewModal(false); }}>
          <div className="modal-content" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '16px' }}>📋 Log New Biomedical Work Order</h3>
            <form onSubmit={handleCreateTicket}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Equipment Name</label>
                <input type="text" value={eqName} onChange={(e) => setEqName(e.target.value)} placeholder="e.g. Defibrillator monitor" required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-strong)' }} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Hospital Department</label>
                <select value={dept} onChange={(e) => setDept(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-strong)' }}>
                  <option value="Operation Theatre 1">Operation Theatre 1</option>
                  <option value="ICU Block A">ICU Block A</option>
                  <option value="Radiology">Radiology</option>
                  <option value="Emergency Room">Emergency Room</option>
                </select>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Assign BioMed Engineer</label>
                <select value={assigned} onChange={(e) => setAssigned(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-strong)' }}>
                  <option value="Eng. Rajesh Sharma">Eng. Rajesh Sharma</option>
                  <option value="Tech. Anita Verma">Tech. Anita Verma</option>
                  <option value="Eng. Vikas Kumar">Eng. Vikas Kumar</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Work Order Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
