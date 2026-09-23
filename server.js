const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

// MIME types dictionary for static file server
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

// Seed Data for initial database population
const SEED_DATA = {
    "biomed_staff": [
        { "id": "STF-100", "loginId": "admin", "password": "admin123", "name": "System Admin (Superuser)", "role": "System Admin", "email": "admin.biomed@hospital.org", "phone": "+91 98765 00000", "privileges": "System Admin (Full IT & User Control)" },
        { "id": "STF-101", "loginId": "hod", "password": "hod123", "name": "Dr. Alok Verma", "role": "Biomedical HOD", "email": "hod.biomed@hospital.org", "phone": "+91 98765 43210", "privileges": "HOD Executive (Approvals & Oversight)" },
        { "id": "STF-102", "loginId": "staff", "password": "staff123", "name": "Eng. Rajesh Sharma", "role": "Senior BioMed Engineer", "specialty": "ICU & Life Support", "phone": "+91 98765 43211", "privileges": "Staff Technician (Task Execution)" }
    ],
    "biomed_api_keys": [
        {
            "id": "KEY-8080-01",
            "name": "Hospital Information System (HIS) Port 8080 Key",
            "apiKey": "bmp_live_his_8080_9a8b7c6d5e",
            "client": "City General HIS Port 8080",
            "permissions": "read_write",
            "createdAt": "2025-09-15 10:00",
            "status": "Active"
        },
        {
            "id": "KEY-8080-02",
            "name": "Radiology PACS Gateway Port 8080 Key",
            "apiKey": "bmp_live_pacs_8080_1a2b3c4d5e",
            "client": "CathLab & CT Suite",
            "permissions": "read_only",
            "createdAt": "2025-09-15 11:30",
            "status": "Active"
        },
        {
            "id": "KEY-8080-03",
            "name": "Biomedical Engineering Suite Master API Key",
            "apiKey": "bmp_live_bme_suite_8080_7f8e9d0c1b",
            "client": "Biomedical Engineering Suite",
            "permissions": "full_admin_interop",
            "createdAt": "2025-09-15 12:00",
            "status": "Active"
        }
    ],
    "biomed_settings": [
        { "key": "hospital_name", "value": "City General Super-Specialty Hospital" },
        { "key": "biomed_department_code", "value": "MED-TECH-BIO-01" },
        { "key": "currency_symbol", "value": "₹" },
        { "key": "auto_alert_recipient_email", "value": "amc.biomed@hospital.org" },
        { "key": "auto_alert_whatsapp_number", "value": "919876543210" }
    ],
    "biomed_contract_alerts": [],
    "biomed_audit_log": [
        { "id": "LOG-501", "timestamp": "2025-09-14 10:15", "user": "System Admin", "action": "Port 8080 Node.js Integrated REST API Initialized" }
    ],
    "biomed_todos": [
        { "id": "TODO-1001", "title": "Quarterly Preventive Maintenance on ER Ventilators", "assignedTo": "Eng. Rajesh Sharma", "category": "Preventive Maintenance", "priority": "High", "dueDate": "2025-09-20", "status": "In Progress" }
    ],
    "biomed_equipment": [
        {
            "id": "EQ-2001",
            "name": "High-End Anesthesia Workstation",
            "model": "Prima 450",
            "serial": "SN-ANESTH-8842",
            "department": "Operation Theatre 3",
            "status": "Operational",
            "purchasePrice": "₹ 18,50,000",
            "contractType": "CMC",
            "contractVendor": "Penlon Medical Pvt Ltd",
            "vendorEmail": "service.india@penlon.com",
            "vendorPhone": "919876500112",
            "contractStartDate": "2023-10-20",
            "contractEndDate": "2026-10-20",
            "contractExpiryDate": "2026-10-20"
        },
        {
            "id": "EQ-2002",
            "name": "High-Frequency C-Arm X-Ray Machine",
            "model": "Ziehm Solo FD",
            "serial": "SN-CARM-9910",
            "department": "Radiology / Cath Lab",
            "status": "Under Calibration",
            "purchasePrice": "₹ 42,00,000",
            "contractType": "AMC",
            "contractVendor": "Ziehm Imaging India",
            "vendorEmail": "amc.service@ziehm.in",
            "vendorPhone": "919876500113",
            "contractStartDate": "2024-11-05",
            "contractEndDate": "2026-11-05",
            "contractExpiryDate": "2026-11-05"
        }
    ],
    "biomed_work_orders": [
        { "id": "WO-3001", "equipmentId": "EQ-2001", "equipmentName": "High-End Anesthesia Workstation", "department": "Operation Theatre 3", "breakdownType": "Vaporizer Flow Leak", "priority": "Critical", "assignedTo": "Eng. Rajesh Sharma", "status": "In Progress" }
    ]
};

function initDatabase() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify(SEED_DATA, null, 2), 'utf-8');
        console.log('[Port 8080 Backend] Initialized db.json at:', DB_FILE);
    }
}

function readDB() {
    try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.biomed_api_keys) {
            parsed.biomed_api_keys = SEED_DATA.biomed_api_keys;
            saveDB(parsed);
        }
        return parsed;
    } catch (err) {
        return SEED_DATA;
    }
}

function saveDB(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
        return true;
    } catch (err) {
        return false;
    }
}

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            if (!body) return resolve({});
            try { resolve(JSON.parse(body)); } catch (err) { reject(err); }
        });
        req.on('error', reject);
    });
}

function setCORS(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
}

function extractApiKey(req, parsedUrl) {
    const headerKey = req.headers['x-api-key'];
    if (headerKey) return headerKey;

    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    const paramKey = parsedUrl.searchParams.get('api_key') || parsedUrl.searchParams.get('apiKey');
    if (paramKey) return paramKey;

    return null;
}

function validateApiKey(req, parsedUrl) {
    const key = extractApiKey(req, parsedUrl);
    if (!key) return { valid: false, error: 'Missing API Key. Provide header x-api-key or query param ?api_key=your_key' };

    const db = readDB();
    const keysList = db.biomed_api_keys || [];
    const match = keysList.find(k => k.apiKey === key && k.status === 'Active');

    if (match) {
        return { valid: true, keyRecord: match };
    }
    return { valid: false, error: 'Invalid or revoked API Key for Port 8080' };
}

function generateSecureKey(prefix = 'bmp_live_8080_') {
    return prefix + crypto.randomBytes(10).toString('hex');
}

function runAutoContractExpiryScan() {
    const db = readDB();
    const equipmentList = db.biomed_equipment || [];
    const settings = db.biomed_settings || [];

    const emailSetting = settings.find(s => s.key === 'auto_alert_recipient_email');
    const phoneSetting = settings.find(s => s.key === 'auto_alert_whatsapp_number');
    const targetEmail = emailSetting ? emailSetting.value : 'amc.biomed@hospital.org';
    const targetPhone = phoneSetting ? phoneSetting.value : '919876543210';

    const now = new Date();
    const expiringContracts = [];
    db.biomed_contract_alerts = db.biomed_contract_alerts || [];

    equipmentList.forEach(eq => {
        const expiryStr = eq.contractExpiryDate || eq.contractEndDate;
        if (!expiryStr) return;
        const expiryDate = new Date(expiryStr);
        const diffTime = expiryDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysRemaining <= 60) {
            const contractType = eq.contractType || 'CMC';
            const vendorName = eq.contractVendor || 'Medical Equipment Partner';
            const vendorEmail = eq.vendorEmail || targetEmail;
            const vendorPhone = eq.vendorPhone || targetPhone;

            const msgText = `🚨 AUTOMATED ${contractType} RENEWAL ALERT (Port 8080): Equipment "${eq.name}" (${eq.model}, S/N: ${eq.serial || eq.serialNumber}) in ${eq.department} contract expires on ${expiryStr} (${daysRemaining} days remaining). Vendor: ${vendorName}. Immediate renewal required!`;
            const encodedMsg = encodeURIComponent(msgText);
            const whatsappUrl = `https://api.whatsapp.com/send?phone=${vendorPhone.replace(/[^0-9]/g, '')}&text=${encodedMsg}`;

            const alertRecord = {
                id: `ALT-${Math.floor(1000 + Math.random() * 9000)}`,
                equipmentId: eq.id,
                equipmentName: eq.name,
                contractType: contractType,
                vendorName: vendorName,
                expiryDate: expiryStr,
                daysRemaining: daysRemaining,
                dispatchedEmail: targetEmail,
                dispatchedWhatsApp: targetPhone,
                whatsappUrl: whatsappUrl,
                messageText: msgText,
                timestamp: new Date().toLocaleString(),
                status: 'AUTOMATICALLY_DISPATCHED'
            };

            expiringContracts.push(alertRecord);
            const existing = db.biomed_contract_alerts.find(a => a.equipmentId === eq.id && a.expiryDate === expiryStr);
            if (!existing) {
                db.biomed_contract_alerts.unshift(alertRecord);
            }
        }
    });

    saveDB(db);
    return {
        scannedTotal: equipmentList.length,
        expiringCount: expiringContracts.length,
        targetEmail: targetEmail,
        targetPhone: targetPhone,
        alerts: expiringContracts
    };
}

initDatabase();
const startTime = Date.now();
runAutoContractExpiryScan();

const server = http.createServer(async (req, res) => {
    setCORS(res);

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:8080'}`);
    const pathname = parsedUrl.pathname;

    // REST API Routes
    if (pathname.startsWith('/api/')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        try {
            // Health Check Endpoint
            if (pathname === '/api/health') {
                const db = readDB();
                const totalRecords = Object.keys(db).reduce((acc, key) => acc + (Array.isArray(db[key]) ? db[key].length : 0), 0);
                res.writeHead(200);
                return res.end(JSON.stringify({
                    status: 'online',
                    app: 'Stavya Intelligence - BioMedPulse OS Port 8080 API Server',
                    port: PORT,
                    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
                    nodeVersion: process.version,
                    totalRecords: totalRecords,
                    apiKeysActive: (db.biomed_api_keys || []).filter(k => k.status === 'Active').length,
                    timestamp: new Date().toISOString()
                }));
            }

            // EXTERNAL PORTING ENDPOINTS (Requires API Key on Port 8080)
            if (pathname.startsWith('/api/v1/external/')) {
                const authCheck = validateApiKey(req, parsedUrl);
                if (!authCheck.valid) {
                    res.writeHead(401);
                    return res.end(JSON.stringify({ success: false, error: authCheck.error }));
                }

                const db = readDB();

                if (pathname === '/api/v1/external/equipment' && req.method === 'GET') {
                    res.writeHead(200);
                    return res.end(JSON.stringify({
                        success: true,
                        port: 8080,
                        client: authCheck.keyRecord.name,
                        total: (db.biomed_equipment || []).length,
                        data: db.biomed_equipment || []
                    }));
                }

                if (pathname === '/api/v1/external/work-order' && req.method === 'POST') {
                    const body = await parseBody(req);
                    const newWo = {
                        id: `WO-${Math.floor(3000 + Math.random() * 9000)}`,
                        equipmentId: body.equipmentId || 'EQ-EXT-8080',
                        equipmentName: body.equipmentName || 'External Machine (Port 8080)',
                        department: body.department || 'External Ward',
                        breakdownType: body.breakdownType || 'External Ticket Logged via API Key',
                        priority: body.priority || 'High',
                        assignedTo: 'Eng. Rajesh Sharma',
                        status: 'Open Ticket',
                        createdViaApiKey: authCheck.keyRecord.name,
                        reportedDate: new Date().toLocaleString()
                    };
                    db.biomed_work_orders = db.biomed_work_orders || [];
                    db.biomed_work_orders.unshift(newWo);
                    saveDB(db);

                    res.writeHead(200);
                    return res.end(JSON.stringify({ success: true, message: 'Work Order created on Port 8080', ticket: newWo }));
                }
            }

            // API Key Management Routes on Port 8080
            if (pathname === '/api/keys' && req.method === 'GET') {
                const db = readDB();
                res.writeHead(200);
                return res.end(JSON.stringify(db.biomed_api_keys || []));
            }

            if (pathname === '/api/keys/generate' && req.method === 'POST') {
                const body = await parseBody(req);
                const db = readDB();
                db.biomed_api_keys = db.biomed_api_keys || [];

                const newKeyRecord = {
                    id: `KEY-8080-${Math.floor(1000 + Math.random() * 9000)}`,
                    name: body.name || 'Port 8080 System Integration',
                    apiKey: generateSecureKey(),
                    client: body.client || 'Third-Party Software Port 8080',
                    permissions: body.permissions || 'read_write',
                    createdAt: new Date().toLocaleString(),
                    status: 'Active'
                };

                db.biomed_api_keys.unshift(newKeyRecord);
                saveDB(db);

                res.writeHead(200);
                return res.end(JSON.stringify({ success: true, keyRecord: newKeyRecord }));
            }

            if (pathname.startsWith('/api/keys/') && req.method === 'DELETE') {
                const keyId = pathname.replace('/api/keys/', '');
                const db = readDB();
                db.biomed_api_keys = (db.biomed_api_keys || []).filter(k => k.id !== keyId);
                saveDB(db);
                res.writeHead(200);
                return res.end(JSON.stringify({ success: true, id: keyId }));
            }

            // AMC / CMC Auto-Contract Expiry Scan Route
            if (pathname === '/api/contract-alerts/scan' && req.method === 'GET') {
                const scanResult = runAutoContractExpiryScan();
                res.writeHead(200);
                return res.end(JSON.stringify({
                    success: true,
                    message: `Auto-scan complete on Port 8080. Detected ${scanResult.expiringCount} AMC/CMC/Warranty contracts expiring within 2 months (60 days).`,
                    scanResult: scanResult
                }));
            }

            if (pathname === '/api/contract-alerts/logs' && req.method === 'GET') {
                const db = readDB();
                res.writeHead(200);
                return res.end(JSON.stringify(db.biomed_contract_alerts || []));
            }

            // Get All Database Data
            if (pathname === '/api/data' && req.method === 'GET') {
                const db = readDB();
                res.writeHead(200);
                return res.end(JSON.stringify(db));
            }

            // Replace / Sync All Database Data
            if (pathname === '/api/data' && req.method === 'POST') {
                const body = await parseBody(req);
                if (body && typeof body === 'object') {
                    saveDB(body);
                    res.writeHead(200);
                    return res.end(JSON.stringify({ success: true, message: 'Database updated successfully' }));
                }
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'Invalid database payload' }));
            }

            // List Backup Snapshots
            if (pathname === '/api/backups' && req.method === 'GET') {
                const files = fs.readdirSync(BACKUPS_DIR);
                const backups = files.filter(f => f.endsWith('.json')).map(f => {
                    const stat = fs.statSync(path.join(BACKUPS_DIR, f));
                    return { filename: f, size: stat.size, createdAt: stat.birthtime };
                });
                res.writeHead(200);
                return res.end(JSON.stringify(backups));
            }

            // Create Backup Snapshot
            if (pathname === '/api/backup' && req.method === 'POST') {
                const db = readDB();
                const filename = `biomed_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
                const backupPath = path.join(BACKUPS_DIR, filename);
                fs.writeFileSync(backupPath, JSON.stringify(db, null, 2), 'utf-8');
                res.writeHead(200);
                return res.end(JSON.stringify({ success: true, filename, message: 'Backup snapshot created successfully' }));
            }

            // Restore from Backup Snapshot payload
            if (pathname === '/api/restore' && req.method === 'POST') {
                const body = await parseBody(req);
                if (body && typeof body === 'object') {
                    saveDB(body);
                    res.writeHead(200);
                    return res.end(JSON.stringify({ success: true, message: 'Database state restored successfully' }));
                }
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'Invalid restore payload' }));
            }

            // Entity Routes (/api/:key or /api/:key/:id)
            const parts = pathname.split('/').filter(Boolean); // ['api', ':key', ':id']
            const key = parts[1];
            const id = parts[2];

            if (key) {
                const db = readDB();

                if (!db[key]) {
                    db[key] = [];
                }

                // GET /api/:key -> List all items in array
                if (req.method === 'GET' && !id) {
                    res.writeHead(200);
                    return res.end(JSON.stringify(db[key]));
                }

                // GET /api/:key/:id -> Get single item by ID
                if (req.method === 'GET' && id) {
                    const item = db[key].find(x => x && (x.id === id || x.key === id));
                    if (item) {
                        res.writeHead(200);
                        return res.end(JSON.stringify(item));
                    }
                    res.writeHead(404);
                    return res.end(JSON.stringify({ error: 'Record not found' }));
                }

                // POST /api/:key -> Insert or Save item
                if (req.method === 'POST' && !id) {
                    const item = await parseBody(req);
                    if (!item) {
                        res.writeHead(400);
                        return res.end(JSON.stringify({ error: 'Empty item payload' }));
                    }

                    if (!item.id && !item.key) {
                        item.id = `REC-${Date.now()}`;
                    }

                    const targetId = item.id || item.key;
                    const existingIdx = db[key].findIndex(x => x && (x.id === targetId || x.key === targetId));

                    if (existingIdx >= 0) {
                        db[key][existingIdx] = { ...db[key][existingIdx], ...item };
                    } else {
                        db[key].push(item);
                    }

                    saveDB(db);
                    res.writeHead(200);
                    return res.end(JSON.stringify({ success: true, item }));
                }

                // PUT /api/:key/:id -> Update item
                if (req.method === 'PUT' && id) {
                    const updates = await parseBody(req);
                    const idx = db[key].findIndex(x => x && (x.id === id || x.key === id));
                    if (idx >= 0) {
                        db[key][idx] = { ...db[key][idx], ...updates };
                        saveDB(db);
                        res.writeHead(200);
                        return res.end(JSON.stringify({ success: true, item: db[key][idx] }));
                    }
                    res.writeHead(404);
                    return res.end(JSON.stringify({ error: 'Record not found for update' }));
                }

                // DELETE /api/:key/:id -> Delete item by ID
                if (req.method === 'DELETE' && id) {
                    const initialLen = db[key].length;
                    db[key] = db[key].filter(x => x && x.id !== id && x.key !== id);
                    if (db[key].length < initialLen) {
                        saveDB(db);
                        res.writeHead(200);
                        return res.end(JSON.stringify({ success: true, message: `Record ${id} deleted` }));
                    }
                    res.writeHead(404);
                    return res.end(JSON.stringify({ error: 'Record not found for deletion' }));
                }
            }

            res.writeHead(404);
            return res.end(JSON.stringify({ error: 'API route not found' }));

        } catch (err) {
            console.error('[BioMed Backend API Error]:', err);
            res.writeHead(500);
            return res.end(JSON.stringify({ error: 'Internal Server Error', details: err.message }));
        }
    }

    // Static File Server
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

    // Prevent directory traversal attacks
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        return res.end('Forbidden');
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            // Fallback to index.html if file not found
            filePath = path.join(__dirname, 'index.html');
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        fs.readFile(filePath, (readErr, content) => {
            if (readErr) {
                res.writeHead(500);
                return res.end('Server File Error');
            }
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        });
    });
});

server.listen(PORT, () => {
    console.log(`=============================================================`);
    console.log(` 🚀 STAVYA INTELLIGENCE - BIOMEDPULSE OS BACKEND SERVER`);
    console.log(` 🌐 Server URL  : http://localhost:${PORT}`);
    console.log(` 📡 REST API    : http://localhost:${PORT}/api/health`);
    console.log(` 💾 Database    : ${DB_FILE}`);
    console.log(`=============================================================`);
});
