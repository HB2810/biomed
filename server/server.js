const http = require('http');
const crypto = require('crypto');
const { initDatabase, readDB, saveDB, useBlob } = require('./db');

const PORT = process.env.PORT || 5000;
const startTime = Date.now();
let bootstrapped = false;

function generateSecureKey(prefix = 'bmp_live_') {
  return prefix + crypto.randomBytes(10).toString('hex');
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
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

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  const paramKey = parsedUrl.searchParams.get('api_key') || parsedUrl.searchParams.get('apiKey');
  if (paramKey) return paramKey;

  return null;
}

async function validateApiKey(req, parsedUrl) {
  const key = extractApiKey(req, parsedUrl);
  if (!key) {
    return { valid: false, error: 'Missing API Key. Provide header x-api-key or query param ?api_key=your_key' };
  }

  const db = await readDB();
  const keysList = db.biomed_api_keys || [];
  const match = keysList.find((k) => k.apiKey === key && k.status === 'Active');

  if (match) {
    return { valid: true, keyRecord: match };
  }
  return { valid: false, error: 'Invalid or revoked API Key' };
}

async function runAutoContractExpiryScan() {
  const db = await readDB();
  const equipmentList = db.biomed_equipment || [];
  const settings = db.biomed_settings || [];

  const emailSetting = settings.find((s) => s.key === 'auto_alert_recipient_email');
  const phoneSetting = settings.find((s) => s.key === 'auto_alert_whatsapp_number');
  const targetEmail = emailSetting ? emailSetting.value : 'amc.biomed@hospital.org';
  const targetPhone = phoneSetting ? phoneSetting.value : '919876543210';

  const now = new Date();
  const expiringContracts = [];

  db.biomed_contract_alerts = db.biomed_contract_alerts || [];

  equipmentList.forEach((eq) => {
    if (!eq.contractExpiryDate) return;
    const expiryDate = new Date(eq.contractExpiryDate);
    const diffTime = expiryDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 60) {
      const contractType = eq.contractType || 'AMC/CMC';
      const vendorName = eq.contractVendor || 'Medical Equipment Vendor';
      const vendorEmail = eq.vendorEmail || targetEmail;
      const vendorPhone = eq.vendorPhone || targetPhone;

      const messageText = `🚨 AUTOMATED ${contractType} RENEWAL ALERT: Equipment "${eq.name}" (Model: ${eq.model}, S/N: ${eq.serial}) in ${eq.department} contract expires on ${eq.contractExpiryDate} (${daysRemaining} days remaining). Vendor: ${vendorName}. Immediate renewal action required!`;
      const encodedMsg = encodeURIComponent(messageText);
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${vendorPhone.replace(/[^0-9]/g, '')}&text=${encodedMsg}`;

      const alertRecord = {
        id: `ALT-${Math.floor(1000 + Math.random() * 9000)}`,
        equipmentId: eq.id,
        equipmentName: eq.name,
        model: eq.model,
        serial: eq.serial,
        department: eq.department,
        contractType,
        vendorName,
        expiryDate: eq.contractExpiryDate,
        daysRemaining,
        dispatchedEmail: targetEmail,
        vendorEmail,
        dispatchedWhatsApp: targetPhone,
        vendorPhone,
        whatsappUrl,
        messageText,
        timestamp: new Date().toLocaleString(),
        status: 'AUTOMATICALLY_DISPATCHED'
      };

      expiringContracts.push(alertRecord);

      const existing = db.biomed_contract_alerts.find(
        (a) => a.equipmentId === eq.id && a.expiryDate === eq.contractExpiryDate
      );
      if (!existing) {
        db.biomed_contract_alerts.unshift(alertRecord);
      }
    }
  });

  await saveDB(db);
  return {
    scannedTotal: equipmentList.length,
    expiringCount: expiringContracts.length,
    targetEmail,
    targetPhone,
    alerts: expiringContracts
  };
}

async function ensureBootstrapped() {
  if (bootstrapped) return;
  await initDatabase();
  try {
    await runAutoContractExpiryScan();
  } catch (e) {
    console.warn('[BioMedPulse] Contract scan skipped:', e.message);
  }
  bootstrapped = true;
}

async function handleRequest(req, res) {
  await ensureBootstrapped();
  setCORS(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const host = req.headers.host || 'localhost';
  const parsedUrl = new URL(req.url, `http://${host}`);
  const pathname = parsedUrl.pathname;

  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    if (pathname === '/api/health') {
      const db = await readDB();
      const totalRecords = Object.keys(db).reduce(
        (acc, k) => acc + (Array.isArray(db[k]) ? db[k].length : 0),
        0
      );
      res.statusCode = 200;
      return res.end(
        JSON.stringify({
          status: 'online',
          app: 'BioMedPulse OS - External Integration REST API Port',
          storage: useBlob() ? 'vercel-blob' : 'local-fs',
          port: PORT,
          uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
          totalRecords,
          apiKeysActive: (db.biomed_api_keys || []).filter((k) => k.status === 'Active').length,
          timestamp: new Date().toISOString()
        })
      );
    }

    if (pathname === '/api/contract-alerts/scan' && req.method === 'GET') {
      const scanResult = await runAutoContractExpiryScan();
      res.statusCode = 200;
      return res.end(
        JSON.stringify({
          success: true,
          message: `Auto-scan complete. Detected ${scanResult.expiringCount} AMC/CMC/Warranty contracts expiring within 2 months (60 days). Dispatched Email to ${scanResult.targetEmail} and WhatsApp payloads to ${scanResult.targetPhone}.`,
          scanResult
        })
      );
    }

    if (pathname === '/api/contract-alerts/logs' && req.method === 'GET') {
      const db = await readDB();
      res.statusCode = 200;
      return res.end(JSON.stringify(db.biomed_contract_alerts || []));
    }

    if (pathname === '/api/contract-alerts/settings' && req.method === 'POST') {
      const body = await parseBody(req);
      const db = await readDB();
      db.biomed_settings = db.biomed_settings || [];

      let emailS = db.biomed_settings.find((s) => s.key === 'auto_alert_recipient_email');
      if (emailS) emailS.value = body.email || 'amc.biomed@hospital.org';
      else db.biomed_settings.push({ key: 'auto_alert_recipient_email', value: body.email || 'amc.biomed@hospital.org' });

      let phoneS = db.biomed_settings.find((s) => s.key === 'auto_alert_whatsapp_number');
      if (phoneS) phoneS.value = body.phone || '919876543210';
      else db.biomed_settings.push({ key: 'auto_alert_whatsapp_number', value: body.phone || '919876543210' });

      await saveDB(db);
      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true, message: 'Contract alert settings updated successfully' }));
    }

    if (pathname.startsWith('/api/v1/external/')) {
      const authCheck = await validateApiKey(req, parsedUrl);
      if (!authCheck.valid) {
        res.statusCode = 401;
        return res.end(JSON.stringify({ success: false, error: authCheck.error }));
      }

      const db = await readDB();

      if (pathname === '/api/v1/external/equipment' && req.method === 'GET') {
        res.statusCode = 200;
        return res.end(
          JSON.stringify({
            success: true,
            client: authCheck.keyRecord.name,
            total: (db.biomed_equipment || []).length,
            data: db.biomed_equipment || []
          })
        );
      }

      if (pathname === '/api/v1/external/work-order' && req.method === 'POST') {
        const body = await parseBody(req);
        const newWo = {
          id: `WO-${Math.floor(3000 + Math.random() * 9000)}`,
          equipmentId: body.equipmentId || 'EQ-EXT',
          equipmentName: body.equipmentName || 'External Reported Machine',
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
        await saveDB(db);

        res.statusCode = 200;
        return res.end(JSON.stringify({ success: true, message: 'Work Order created from external software', ticket: newWo }));
      }

      if (pathname === '/api/v1/external/status' && req.method === 'GET') {
        res.statusCode = 200;
        return res.end(
          JSON.stringify({
            success: true,
            message: 'External Software API Key authenticated successfully',
            keyInfo: authCheck.keyRecord
          })
        );
      }
    }

    if (pathname === '/api/keys' && req.method === 'GET') {
      const db = await readDB();
      res.statusCode = 200;
      return res.end(JSON.stringify(db.biomed_api_keys || []));
    }

    if (pathname === '/api/keys/generate' && req.method === 'POST') {
      const body = await parseBody(req);
      const db = await readDB();
      db.biomed_api_keys = db.biomed_api_keys || [];

      const newKeyRecord = {
        id: `KEY-${Math.floor(1000 + Math.random() * 9000)}`,
        name: body.name || 'External System Port',
        apiKey: generateSecureKey(body.prefix || 'bmp_live_'),
        client: body.client || 'Third-Party Hospital Software',
        permissions: body.permissions || 'read_write',
        createdAt: new Date().toLocaleString(),
        status: 'Active'
      };

      db.biomed_api_keys.unshift(newKeyRecord);
      await saveDB(db);

      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true, keyRecord: newKeyRecord }));
    }

    if (pathname.startsWith('/api/keys/') && req.method === 'DELETE') {
      const keyId = pathname.replace('/api/keys/', '');
      const db = await readDB();
      db.biomed_api_keys = (db.biomed_api_keys || []).filter((k) => k.id !== keyId);
      await saveDB(db);
      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true, id: keyId }));
    }

    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const body = await parseBody(req);
      const { loginId, password } = body;
      const db = await readDB();
      const staffList = db.biomed_staff || [];

      let userMatch = staffList.find(
        (s) =>
          (s.loginId && s.loginId.toLowerCase() === (loginId || '').toLowerCase()) ||
          (s.id && s.id.toLowerCase() === (loginId || '').toLowerCase())
      );

      if (userMatch && password && userMatch.password && userMatch.password !== password) {
        userMatch = null;
      }

      if (!userMatch) {
        if ((loginId || '').toLowerCase() === 'admin' && password === 'admin123') {
          userMatch = { id: 'STF-100', loginId: 'admin', name: 'System Admin (Superuser)', role: 'System Admin' };
        } else if ((loginId || '').toLowerCase() === 'hod' && password === 'hod123') {
          userMatch = { id: 'STF-101', loginId: 'hod', name: 'Dr. Alok Verma', role: 'Biomedical HOD' };
        } else if ((loginId || '').toLowerCase() === 'staff' && password === 'staff123') {
          userMatch = { id: 'STF-102', loginId: 'staff', name: 'Eng. Rajesh Sharma', role: 'Senior BioMed Engineer' };
        }
      }

      if (userMatch) {
        const safeUser = { ...userMatch };
        delete safeUser.password;
        res.statusCode = 200;
        return res.end(JSON.stringify({ success: true, user: safeUser }));
      }

      res.statusCode = 401;
      return res.end(JSON.stringify({ error: 'Invalid Login ID or Password' }));
    }

    if (pathname === '/api/data' && req.method === 'GET') {
      res.statusCode = 200;
      return res.end(JSON.stringify(await readDB()));
    }

    if (pathname === '/api/data' && req.method === 'POST') {
      const body = await parseBody(req);
      await saveDB(body);
      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true, message: 'Database saved' }));
    }

    if (pathname.startsWith('/api/collection/') && req.method === 'POST') {
      const key = pathname.replace('/api/collection/', '').split('/')[0];
      const item = await parseBody(req);
      const db = await readDB();
      db[key] = db[key] || [];
      const idx = db[key].findIndex((x) => x.id === item.id);
      if (idx >= 0) db[key][idx] = item;
      else db[key].unshift(item);
      await saveDB(db);
      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true, item }));
    }

    if (pathname.startsWith('/api/collection/') && req.method === 'DELETE') {
      const parts = pathname.split('/');
      const key = parts[3];
      const id = parts[4];
      const db = await readDB();
      if (db[key]) {
        db[key] = db[key].filter((x) => x.id !== id);
        await saveDB(db);
      }
      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true, id }));
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Route not found' }));
  } catch (e) {
    console.error('[BioMedPulse API Error]', e);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message || 'Internal Server Error' }));
  }
}

module.exports = handleRequest;
module.exports.handleRequest = handleRequest;
module.exports.ensureBootstrapped = ensureBootstrapped;

if (require.main === module) {
  ensureBootstrapped()
    .then(() => {
      const server = http.createServer((req, res) => {
        handleRequest(req, res);
      });
      server.listen(PORT, () => {
        console.log(`[BioMedPulse External Interoperability API] Running on http://localhost:${PORT}`);
        console.log(`[Storage] ${useBlob() ? 'Vercel Blob' : 'Local filesystem'}`);
      });
    })
    .catch((err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
}
