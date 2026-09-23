import React, { createContext, useContext, useState, useEffect } from 'react';

const DataContext = createContext();

const SEED = {
  biomed_staff: [
    { id: 'STF-100', loginId: 'admin', name: 'System Admin (Superuser)', role: 'System Admin', email: 'admin.biomed@hospital.org' },
    { id: 'STF-101', loginId: 'hod', name: 'Dr. Alok Verma', role: 'Biomedical HOD', email: 'hod.biomed@hospital.org' },
    { id: 'STF-102', loginId: 'staff', name: 'Eng. Rajesh Sharma', role: 'Senior BioMed Engineer', email: 'rajesh.biomed@hospital.org' }
  ],
  biomed_equipment: [
    { id: 'EQ-2001', name: 'High-End Anesthesia Workstation', model: 'Prima 450', serial: 'SN-ANESTH-8842', department: 'Operation Theatre 3', status: 'Operational', purchasePrice: '₹ 18,50,000' },
    { id: 'EQ-2002', name: 'High-Frequency C-Arm X-Ray Machine', model: 'Ziehm Solo FD', serial: 'SN-CARM-9910', department: 'Radiology / Cath Lab', status: 'Under Calibration', purchasePrice: '₹ 42,00,000' }
  ],
  biomed_work_orders: [
    { id: 'WO-3001', equipmentId: 'EQ-2001', equipmentName: 'High-End Anesthesia Workstation', department: 'Operation Theatre 3', breakdownType: 'Vaporizer Flow Leak', priority: 'Critical', assignedTo: 'Eng. Rajesh Sharma', status: 'In Progress' }
  ],
  biomed_todos: [
    { id: 'TODO-1001', title: 'Quarterly Preventive Maintenance on ER Ventilators', assignedTo: 'Eng. Rajesh Sharma', category: 'Preventive Maintenance', priority: 'High', status: 'In Progress' }
  ],
  biomed_audit_log: [
    { id: 'LOG-501', timestamp: new Date().toLocaleString(), user: 'System Admin', action: 'React Frontend Data Context Initialized' }
  ]
};

export function DataProvider({ children }) {
  const [dbData, setDbData] = useState(SEED);
  const [loading, setLoading] = useState(true);

  const fetchFullData = async () => {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const data = await res.json();
        setDbData(data);
      }
    } catch (e) {
      console.warn('Backend API unreachable, using local reactive state');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFullData();
  }, []);

  const saveItem = async (collectionKey, item) => {
    const updatedCollection = [...(dbData[collectionKey] || [])];
    const index = updatedCollection.findIndex(x => x.id === item.id);
    if (index >= 0) {
      updatedCollection[index] = item;
    } else {
      updatedCollection.unshift(item);
    }

    const updatedData = { ...dbData, [collectionKey]: updatedCollection };
    setDbData(updatedData);

    try {
      await fetch(`/api/collection/${collectionKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
    } catch (e) {
      console.warn('Failed to sync saveItem with Express API');
    }
  };

  const deleteItem = async (collectionKey, id) => {
    const updatedCollection = (dbData[collectionKey] || []).filter(x => x.id !== id);
    const updatedData = { ...dbData, [collectionKey]: updatedCollection };
    setDbData(updatedData);

    try {
      await fetch(`/api/collection/${collectionKey}/${id}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.warn('Failed to sync deleteItem with Express API');
    }
  };

  const addAuditLog = (action, user = 'Current User') => {
    const logItem = {
      id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toLocaleString(),
      user: user,
      action: action
    };
    saveItem('biomed_audit_log', logItem);
  };

  return (
    <DataContext.Provider
      value={{
        dbData,
        loading,
        fetchFullData,
        saveItem,
        deleteItem,
        addAuditLog
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
