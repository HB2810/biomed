# BioMedPulse OS - External Software API Key Interoperability Port Guide

This guide documents how third-party hospital software (HIS, EMR, PACS, LIMS) can port to and exchange data with the **BioMedPulse OS** Node.js backend port using **API Keys**.

---

## 1. Port & Server Configuration

- **API Base URL**: `http://localhost:5000` (or host IP)
- **Protocol**: HTTP/REST JSON
- **Authentication**: API Key via Request Header `x-api-key` or query parameter `?api_key=your_key`

---

## 2. Default Pre-Configured API Keys

| System Integration Name | API Key Secret | Scope / Permissions |
| :--- | :--- | :--- |
| **Hospital Information System (HIS)** | `bmp_live_his_8892f3c7a109` | Read / Write (`read_write`) |
| **Radiology PACS Gateway** | `bmp_live_pacs_44b1c8e9021f` | Read Only (`read_only`) |

---

## 3. API Integration Endpoints

### A. Verify API Key & System Status
- **Endpoint**: `GET /api/v1/external/status`
- **Header**: `x-api-key: bmp_live_his_8892f3c7a109`

#### cURL Example:
```bash
curl -X GET "http://localhost:5000/api/v1/external/status" \
     -H "x-api-key: bmp_live_his_8892f3c7a109"
```

#### Expected JSON Response:
```json
{
  "success": true,
  "message": "External Software API Key authenticated successfully",
  "keyInfo": {
    "id": "KEY-1001",
    "name": "Hospital Information System (HIS) Integration",
    "permissions": "read_write",
    "status": "Active"
  }
}
```

---

### B. Fetch All Registered Medical Equipment
- **Endpoint**: `GET /api/v1/external/equipment`
- **Header**: `x-api-key: bmp_live_his_8892f3c7a109`

#### JavaScript `fetch` Example:
```javascript
const response = await fetch('http://localhost:5000/api/v1/external/equipment', {
  headers: {
    'x-api-key': 'bmp_live_his_8892f3c7a109'
  }
});
const result = await response.json();
console.log('Medical Equipment List:', result.data);
```

#### Python `requests` Example:
```python
import requests

headers = {
    'x-api-key': 'bmp_live_his_8892f3c7a109'
}
res = requests.get('http://localhost:5000/api/v1/external/equipment', headers=headers)
print(res.json())
```

---

### C. Create Work Order Breakdown Ticket from External HIS / EMR
- **Endpoint**: `POST /api/v1/external/work-order`
- **Header**: `x-api-key: bmp_live_his_8892f3c7a109`
- **Body Payload**:
```json
{
  "equipmentId": "EQ-2001",
  "equipmentName": "High-End Anesthesia Workstation",
  "department": "Operation Theatre 3",
  "breakdownType": "Pressure Alarm Failure",
  "priority": "Critical"
}
```

#### cURL Example:
```bash
curl -X POST "http://localhost:5000/api/v1/external/work-order" \
     -H "x-api-key: bmp_live_his_8892f3c7a109" \
     -H "Content-Type: application/json" \
     -d '{
       "equipmentName": "Ventilator Block A",
       "department": "ICU",
       "breakdownType": "Low O2 Pressure",
       "priority": "Critical"
     }'
```

---

## 4. API Key Management via Port 5000

- **Generate New API Key**: `POST /api/keys/generate` (Body: `{ "name": "EMR Port", "client": "LIMS System" }`)
- **List All Active Keys**: `GET /api/keys`
- **Revoke Key**: `DELETE /api/keys/:id`
