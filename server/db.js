const fs = require('fs');
const path = require('path');
const { put, list, get } = require('@vercel/blob');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const BLOB_PATHNAME = 'biomed-db.json';

const SEED_DATA = {
  biomed_staff: [
    { id: 'STF-100', loginId: 'admin', password: 'admin123', name: 'System Admin (Superuser)', role: 'System Admin', email: 'admin.biomed@hospital.org', phone: '+91 98765 00000', privileges: 'System Admin (Full IT & User Control)' },
    { id: 'STF-101', loginId: 'hod', password: 'hod123', name: 'Dr. Alok Verma', role: 'Biomedical HOD', email: 'hod.biomed@hospital.org', phone: '+91 98765 43210', privileges: 'HOD Executive (Approvals & Oversight)' },
    { id: 'STF-102', loginId: 'staff', password: 'staff123', name: 'Eng. Rajesh Sharma', role: 'Senior BioMed Engineer', specialty: 'ICU & Life Support', phone: '+91 98765 43211', privileges: 'Staff Technician (Task Execution)' }
  ],
  biomed_api_keys: [
    {
      id: 'KEY-1001',
      name: 'Hospital Information System (HIS) Integration',
      apiKey: 'bmp_live_his_8892f3c7a109',
      client: 'City General HIS Port',
      permissions: 'read_write',
      createdAt: '2025-09-15 10:00',
      status: 'Active'
    },
    {
      id: 'KEY-1002',
      name: 'Radiology PACS Gateway',
      apiKey: 'bmp_live_pacs_44b1c8e9021f',
      client: 'CathLab & CT Suite',
      permissions: 'read_only',
      createdAt: '2025-09-15 11:30',
      status: 'Active'
    }
  ],
  biomed_settings: [
    { key: 'hospital_name', value: 'City General Super-Specialty Hospital' },
    { key: 'biomed_department_code', value: 'MED-TECH-BIO-01' },
    { key: 'currency_symbol', value: '₹' },
    { key: 'auto_alert_recipient_email', value: 'amc.biomed@hospital.org' },
    { key: 'auto_alert_whatsapp_number', value: '919876543210' },
    { key: 'contract_alert_threshold_days', value: '60' }
  ],
  biomed_contract_alerts: [
    {
      id: 'ALT-9001',
      equipmentId: 'EQ-2001',
      equipmentName: 'High-End Anesthesia Workstation',
      contractType: 'CMC',
      expiryDate: '2026-10-20',
      daysRemaining: 35,
      dispatchedEmail: 'amc.biomed@hospital.org',
      dispatchedWhatsApp: '919876543210',
      timestamp: '2026-09-15 19:00',
      status: 'AUTOMATICALLY_SENT'
    }
  ],
  biomed_audit_log: [
    { id: 'LOG-501', timestamp: '2025-09-14 10:15', user: 'System Admin', action: 'Node.js Pure Native REST API Server Initialized' }
  ],
  biomed_todos: [
    { id: 'TODO-1001', title: 'Quarterly Preventive Maintenance on ER Ventilators', assignedTo: 'Eng. Rajesh Sharma', category: 'Preventive Maintenance', priority: 'High', status: 'In Progress' }
  ],
  biomed_equipment: [
    {
      id: 'EQ-2001',
      name: 'High-End Anesthesia Workstation',
      model: 'Prima 450',
      serial: 'SN-ANESTH-8842',
      department: 'Operation Theatre 3',
      status: 'Operational',
      purchasePrice: '₹ 18,50,000',
      contractType: 'CMC',
      contractVendor: 'Penlon Medical Pvt Ltd',
      vendorEmail: 'service.india@penlon.com',
      vendorPhone: '919876500112',
      contractStartDate: '2023-10-20',
      contractExpiryDate: '2026-10-20'
    },
    {
      id: 'EQ-2002',
      name: 'High-Frequency C-Arm X-Ray Machine',
      model: 'Ziehm Solo FD',
      serial: 'SN-CARM-9910',
      department: 'Radiology / Cath Lab',
      status: 'Under Calibration',
      purchasePrice: '₹ 42,00,000',
      contractType: 'AMC',
      contractVendor: 'Ziehm Imaging India',
      vendorEmail: 'amc.service@ziehm.in',
      vendorPhone: '919876500113',
      contractStartDate: '2024-11-05',
      contractExpiryDate: '2026-11-05'
    },
    {
      id: 'EQ-2003',
      name: 'ICU Multi-Para Patient Monitor',
      model: 'IntelliVue MX550',
      serial: 'SN-MON-5541',
      department: 'ICU Block B',
      status: 'Operational',
      purchasePrice: '₹ 6,20,000',
      contractType: 'Warranty',
      contractVendor: 'Philips Healthcare India',
      vendorEmail: 'biomed.warranty@philips.com',
      vendorPhone: '919876500114',
      contractStartDate: '2025-10-15',
      contractExpiryDate: '2026-10-15'
    }
  ],
  biomed_work_orders: [
    { id: 'WO-3001', equipmentId: 'EQ-2001', equipmentName: 'High-End Anesthesia Workstation', department: 'Operation Theatre 3', breakdownType: 'Vaporizer Flow Leak', priority: 'Critical', assignedTo: 'Eng. Rajesh Sharma', status: 'In Progress' }
  ]
};

function useBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readDBLocal() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return JSON.parse(JSON.stringify(SEED_DATA));
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.biomed_api_keys) {
      parsed.biomed_api_keys = SEED_DATA.biomed_api_keys;
      await saveDBLocal(parsed);
    }
    return parsed;
  } catch {
    return JSON.parse(JSON.stringify(SEED_DATA));
  }
}

async function saveDBLocal(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  return true;
}

async function readDBBlob() {
  const { blobs } = await list({ prefix: BLOB_PATHNAME, limit: 10 });
  const match = blobs.find((b) => b.pathname === BLOB_PATHNAME) || blobs[0];
  if (!match) {
    const seed = JSON.parse(JSON.stringify(SEED_DATA));
    await saveDBBlob(seed);
    return seed;
  }

  const result = await get(match.url, { access: 'private' });
  if (!result || !result.stream) {
    const seed = JSON.parse(JSON.stringify(SEED_DATA));
    await saveDBBlob(seed);
    return seed;
  }

  const raw = await new Response(result.stream).text();
  const parsed = JSON.parse(raw);
  if (!parsed.biomed_api_keys) {
    parsed.biomed_api_keys = SEED_DATA.biomed_api_keys;
    await saveDBBlob(parsed);
  }
  return parsed;
}

async function saveDBBlob(data) {
  await put(BLOB_PATHNAME, JSON.stringify(data), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    token: process.env.BLOB_READ_WRITE_TOKEN
  });
  return true;
}

async function initDatabase() {
  if (useBlob()) {
    const { blobs } = await list({ prefix: BLOB_PATHNAME, limit: 1 });
    if (!blobs.length) {
      await saveDBBlob(JSON.parse(JSON.stringify(SEED_DATA)));
      console.log('[Blob Storage] Seeded biomed-db.json');
    }
    return;
  }

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(SEED_DATA, null, 2), 'utf-8');
    console.log('[Local Storage] Initialized db.json at:', DB_FILE);
  }
}

async function readDB() {
  return useBlob() ? readDBBlob() : readDBLocal();
}

async function saveDB(data) {
  return useBlob() ? saveDBBlob(data) : saveDBLocal(data);
}

module.exports = {
  SEED_DATA,
  initDatabase,
  readDB,
  saveDB,
  useBlob
};
