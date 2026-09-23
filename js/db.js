/**
 * BioMedPulse OS - Offline LocalStorage Database Layer
 * Taxonomies, Roles & Admin Controls:
 * - 🛡️ System Administrator (Admin) & 👑 Biomedical HOD: Full Universal Edit, Delete & Approval Access
 * - 🛠️ Biomedical Staff Engineers: Task Logging & Read-Only Access
 */

const DB_KEYS = {
    BIO_EQUIPMENT: 'biomed_equipment',
    INSTRUMENTS: 'biomed_instruments',
    CONSUMABLES: 'biomed_consumables',
    DISPOSABLES: 'biomed_disposables',
    IMPLANTS: 'biomed_implants',
    SPARE_PARTS: 'biomed_spare_parts',
    CONDEMNATION: 'biomed_condemnation',
    TRAINING: 'biomed_training',
    WORK_ORDERS: 'biomed_work_orders',
    STAFF_MEMBERS: 'biomed_staff',
    SYSTEM_SETTINGS: 'biomed_settings',
    AUDIT_LOG: 'biomed_audit_log',
    TODOS: 'biomed_todos'
};

// Initial Seed Data (strictly INR ₹)
const SEED_DATA = {
    [DB_KEYS.STAFF_MEMBERS]: [
        { id: 'STF-100', loginId: 'admin', password: 'admin123', name: 'System Admin (Superuser)', role: 'System Admin', email: 'admin.biomed@hospital.org', phone: '+91 98765 00000', privileges: 'System Admin (Full IT & User Control)' },
        { id: 'STF-101', loginId: 'hod', password: 'hod123', name: 'Dr. Alok Verma', role: 'Biomedical HOD', email: 'hod.biomed@hospital.org', phone: '+91 98765 43210', privileges: 'HOD Executive (Approvals & Oversight)' },
        { id: 'STF-102', loginId: 'staff', password: 'staff123', name: 'Eng. Rajesh Sharma', role: 'Senior BioMed Engineer', specialty: 'ICU & Life Support', phone: '+91 98765 43211', privileges: 'Staff Technician (Task Execution)' },
        { id: 'STF-103', loginId: 'anita', password: 'staff123', name: 'Tech. Anita Verma', role: 'Biomedical Technician', specialty: 'Radiology & Imaging', phone: '+91 98765 43212', privileges: 'Staff Technician (Task Execution)' },
        { id: 'STF-104', loginId: 'vikas', password: 'staff123', name: 'Eng. Vikas Kumar', role: 'Field Maintenance Engineer', specialty: 'OT Instruments & Lasers', phone: '+91 98765 43213', privileges: 'Staff Technician (Task Execution)' }
    ],

    [DB_KEYS.SYSTEM_SETTINGS]: [
        { key: 'hospital_name', value: 'City General Super-Specialty Hospital' },
        { key: 'biomed_department_code', value: 'MED-TECH-BIO-01' },
        { key: 'currency_symbol', value: '₹' },
        { key: 'pm_due_alert_days', value: '30' },
        { key: 'calibration_tolerance_percentage', value: '5%' }
    ],

    [DB_KEYS.AUDIT_LOG]: [
        { id: 'LOG-501', timestamp: '2025-09-14 10:15', user: 'System Admin', action: 'System Initialization & Database Health Check Passed' },
        { id: 'LOG-502', timestamp: '2025-09-14 11:30', user: 'Dr. Alok Verma (HOD)', action: 'Approved Condemnation Certificate CND-CERT-2025-089' }
    ],

    [DB_KEYS.TODOS]: [
        {
            id: 'TODO-1001',
            title: 'Quarterly Preventive Maintenance on ER Ventilators',
            assignedTo: 'Eng. Rajesh Sharma',
            assignedBy: 'Dr. Alok Verma (HOD)',
            category: 'Preventive Maintenance',
            priority: 'High',
            dueDate: '2025-09-20',
            status: 'In Progress',
            assignedDate: '2025-09-14',
            description: 'Perform complete sensor check, O2 cell replacement calibration, and flow sensor test for 4 ICU ventilators in Block A.',
            notes: 'Sensors calibrated. Flow sensor replacement pending.'
        },
        {
            id: 'TODO-1002',
            title: 'Radiology Lead Apron Integrity Leak Audit',
            assignedTo: 'Tech. Anita Verma',
            assignedBy: 'Dr. Alok Verma (HOD)',
            category: 'Inspection & Audit',
            priority: 'Urgent',
            dueDate: '2025-09-18',
            status: 'Pending',
            assignedDate: '2025-09-15',
            description: 'Execute fluoroscopic radiation crack check on 12 lead aprons in Cath Lab & CT suite.',
            notes: ''
        },
        {
            id: 'TODO-1003',
            title: 'OT Electrosurgical Generator Annual Calibration',
            assignedTo: 'Eng. Vikas Kumar',
            assignedBy: 'Dr. Alok Verma (HOD)',
            category: 'Calibration & Testing',
            priority: 'Medium',
            dueDate: '2025-09-25',
            status: 'Completed',
            assignedDate: '2025-09-10',
            description: 'Measure monopolar and bipolar RF power output against standard analyzer (ESU-2000).',
            notes: 'Calibration certificate generated. Power within ±2% tolerance.'
        },
        {
            id: 'TODO-1004',
            title: 'Critical Spare Parts Stock Reconciliation',
            assignedTo: 'Eng. Rajesh Sharma',
            assignedBy: 'Dr. Alok Verma (HOD)',
            category: 'Inventory Check',
            priority: 'Low',
            dueDate: '2025-09-30',
            status: 'Pending',
            assignedDate: '2025-09-15',
            description: 'Audit physical stock of hemodialysis filters and ECG patient cables in Main Biomedical Store.',
            notes: ''
        }
    ],

    [DB_KEYS.WORK_ORDERS]: [
        {
            id: 'WO-9001',
            title: 'Biphasic Defibrillator Battery Charge Failure',
            equipmentId: 'EQ-1004',
            equipmentName: 'Biphasic Defibrillator Monitor (Zoll R Series)',
            department: 'Emergency Room',
            priority: 'P1 Critical',
            reportedBy: 'Dr. K. S. Nair (ER In-Charge)',
            assignedStaff: 'Eng. Rajesh Sharma',
            status: 'In Progress',
            dateLogged: '2025-09-12',
            symptom: 'Battery indicator flashing RED during self-test. Does not hold charge on battery power.',
            actionTaken: 'Tested battery internal resistance. Sealed lead acid battery replacement required.',
            partsRequested: 'Rechargeable Sealed Lead Battery 12V 7Ah (PRT-6002)',
            hodApprovalStatus: 'Approved by HOD'
        },
        {
            id: 'WO-9002',
            title: 'ICU Ventilator Oxygen Sensor Calibration Error',
            equipmentId: 'EQ-1001',
            equipmentName: 'High-End ICU Ventilator V900',
            department: 'ICU Bed 04',
            priority: 'P1 Critical',
            reportedBy: 'Staff Nurse Priya',
            assignedStaff: 'Tech. Anita Verma',
            status: 'Resolved',
            dateLogged: '2025-09-10',
            symptom: 'FiO2 reading variance +12% from target setting.',
            actionTaken: 'Replaced O2 sensor cell (PRT-6001). Performed 21% and 100% two-point calibration check.',
            partsRequested: 'Oxygen Sensor Cell (PRT-6001)',
            hodApprovalStatus: 'Approved by HOD'
        },
        {
            id: 'WO-9003',
            title: 'CT Scanner Gantry Slip-Ring Maintenance',
            equipmentId: 'EQ-1003',
            equipmentName: 'Multislice CT Scanner 64',
            department: 'Radiology',
            priority: 'P2 High',
            reportedBy: 'Tech. Suresh (Radiology)',
            assignedStaff: 'Eng. Vikas Kumar',
            status: 'Open',
            dateLogged: '2025-09-14',
            symptom: 'Routine 500-hour rotational slip-ring brush inspection due.',
            actionTaken: 'Scheduled OEM engineer visit under warranty contract.',
            partsRequested: 'None (Under Warranty)',
            hodApprovalStatus: 'Pending HOD Review'
        }
    ],

    [DB_KEYS.BIO_EQUIPMENT]: [
        {
            id: 'EQ-2001',
            name: 'High-End Anesthesia Workstation',
            category: 'Major',
            department: 'Operation Theatre 3',
            manufacturer: 'Penlon Medical',
            model: 'Prima 450',
            serialNumber: 'SN-ANESTH-8842',
            contractType: 'CMC',
            contractVendor: 'Penlon Medical Pvt Ltd',
            vendorEmail: 'service.india@penlon.com',
            vendorPhone: '919876500112',
            contractStartDate: '2023-10-20',
            contractEndDate: '2026-10-20',
            contractExpiryDate: '2026-10-20',
            contractCost: '₹1,85,000/yr',
            status: 'In Service',
            riskClass: 'Class III',
            location: 'OT 3',
            purchaseDate: '2023-04-12',
            purchaseCost: '₹18,50,000'
        },
        {
            id: 'EQ-2002',
            name: 'High-Frequency C-Arm X-Ray Machine',
            category: 'Major',
            department: 'Radiology / Cath Lab',
            manufacturer: 'Ziehm Imaging',
            model: 'Ziehm Solo FD',
            serialNumber: 'SN-CARM-9910',
            contractType: 'AMC',
            contractVendor: 'Ziehm Imaging India',
            vendorEmail: 'amc.service@ziehm.in',
            vendorPhone: '919876500113',
            contractStartDate: '2024-11-05',
            contractEndDate: '2026-11-05',
            contractExpiryDate: '2026-11-05',
            contractCost: '₹4,20,000/yr',
            status: 'In Service',
            riskClass: 'Class III',
            location: 'Cath Lab',
            purchaseDate: '2022-11-05',
            purchaseCost: '₹42,00,000'
        },
        {
            id: 'EQ-1001',
            name: 'High-End ICU Ventilator V900',
            category: 'Major',
            department: 'ICU',
            manufacturer: 'Draeger Medical',
            model: 'Evita V500',
            serialNumber: 'DRG-8849-V5',
            contractType: 'CMC',
            contractVendor: 'Draeger India Ltd',
            vendorEmail: 'service.india@draeger.com',
            vendorPhone: '919876500115',
            contractStartDate: '2024-10-15',
            contractEndDate: '2026-10-15',
            contractExpiryDate: '2026-10-15',
            contractCost: '₹3,50,000/yr',
            status: 'In Service',
            riskClass: 'Class III (Life Support)',
            location: 'ICU Bed 04',
            purchaseDate: '2022-03-10',
            purchaseCost: '₹28,00,000'
        },
        {
            id: 'EQ-1002',
            name: '12-Lead ECG Machine Touch',
            category: 'Minor',
            department: 'Cardiology',
            manufacturer: 'GE Healthcare',
            model: 'MAC 2000',
            serialNumber: 'GE-ECG-9921',
            contractType: 'AMC',
            contractVendor: 'GE BioService',
            contractStartDate: '2025-02-01',
            contractEndDate: '2026-01-31',
            contractCost: '₹45,000/yr',
            status: 'In Service',
            riskClass: 'Class IIa',
            location: 'OPD Cardiology Room 12',
            purchaseDate: '2023-05-18',
            purchaseCost: '₹3,20,000'
        },
        {
            id: 'EQ-1003',
            name: 'Multislice CT Scanner 64',
            category: 'Major',
            department: 'Radiology',
            manufacturer: 'Siemens Healthineers',
            model: 'SOMATOM Go Top',
            serialNumber: 'SIE-CT-4001',
            contractType: 'Warranty',
            contractVendor: 'Siemens Healthcare',
            contractStartDate: '2025-06-01',
            contractEndDate: '2027-05-31',
            contractCost: 'Covered under Warranty',
            status: 'In Service',
            riskClass: 'Class III',
            location: 'CT Bay 01',
            purchaseDate: '2025-05-20',
            purchaseCost: '₹2,50,00,000'
        },
        {
            id: 'EQ-1004',
            name: 'Biphasic Defibrillator Monitor',
            category: 'Major',
            department: 'Emergency',
            manufacturer: 'Zoll Medical',
            model: 'R Series ALS',
            serialNumber: 'ZOL-DEF-7731',
            contractType: 'CMC',
            contractVendor: 'Zoll India Corp',
            contractStartDate: '2024-04-10',
            contractEndDate: '2026-04-09',
            contractCost: '₹95,000/yr',
            status: 'Under Maintenance',
            riskClass: 'Class III (Life Support)',
            location: 'ER Crash Cart 02',
            purchaseDate: '2021-08-14',
            purchaseCost: '₹11,50,000'
        },
        {
            id: 'EQ-1005',
            name: 'Volumetric Syringe Infusion Pump',
            category: 'Minor',
            department: 'NICU',
            manufacturer: 'B. Braun',
            model: 'Space Infusomat',
            serialNumber: 'BBR-SP-3310',
            contractType: 'Warranty',
            contractVendor: 'B. Braun Medical',
            contractStartDate: '2025-01-01',
            contractEndDate: '2026-12-31',
            contractCost: 'Warranty',
            status: 'In Service',
            riskClass: 'Class IIb',
            location: 'NICU Incubator 03',
            purchaseDate: '2024-11-05',
            purchaseCost: '₹1,45,000'
        }
    ],

    [DB_KEYS.INSTRUMENTS]: [
        {
            id: 'INS-2001',
            name: 'Rigid Laparoscope Telescope 10mm 30°',
            category: 'Minor Instrument',
            department: 'Laparoscopic Surgery',
            manufacturer: 'Karl Storz',
            model: 'Hopkins II',
            serialNumber: 'KS-LAP-0091',
            contractType: 'CMC',
            contractVendor: 'Karl Storz Endoscopy',
            contractStartDate: '2024-03-01',
            contractEndDate: '2026-02-28',
            status: 'Active',
            lastServiced: '2025-07-10',
            historyLog: 'Autoclave sterilization count: 420. Lens optical check passed.'
        },
        {
            id: 'INS-2002',
            name: 'Bipolar Surgical Forceps Set',
            category: 'Minor Instrument',
            department: 'OT Main',
            manufacturer: 'Erbe Medical',
            model: 'VIO 300D Accessories',
            serialNumber: 'ERB-FOR-552',
            contractType: 'AMC',
            contractVendor: 'Erbe MedTech',
            contractStartDate: '2025-01-01',
            contractEndDate: '2025-12-31',
            status: 'Active',
            lastServiced: '2025-05-15',
            historyLog: 'Insulation integrity check verified.'
        }
    ],

    [DB_KEYS.CONSUMABLES]: [
        {
            id: 'CON-3001',
            name: 'ECG Electrodes Hydrogel (Adult Pack of 50)',
            category: 'Consumable',
            department: 'Cardiology / ICU',
            brand: '3M Red Dot',
            stockQty: 450,
            unit: 'Packs',
            minStockLevel: 100,
            unitPrice: '₹950',
            location: 'Central Store Shelf B2'
        },
        {
            id: 'CON-3002',
            name: 'Capnography CO2 Sampling Lines',
            category: 'Consumable',
            department: 'Anaesthesia / OT',
            brand: 'Medtronic Oridion',
            stockQty: 180,
            unit: 'Pieces',
            minStockLevel: 50,
            unitPrice: '₹650',
            location: 'OT Store Cabinet 04'
        }
    ],

    [DB_KEYS.DISPOSABLES]: [
        {
            id: 'DIS-4001',
            name: 'Disposable Patient Ventilator Circuit (Adult Dual Limb)',
            category: 'Disposable',
            department: 'ICU',
            brand: 'Intersurgical',
            stockQty: 85,
            unit: 'Kits',
            minStockLevel: 30,
            unitPrice: '₹1,400',
            expiryDate: '2027-08-30'
        },
        {
            id: 'DIS-4002',
            name: 'Disposable SpO2 Finger Sensor',
            category: 'Disposable',
            department: 'NICU / ER',
            brand: 'Masimo LNCS',
            stockQty: 140,
            unit: 'Pieces',
            minStockLevel: 40,
            unitPrice: '₹1,200',
            expiryDate: '2028-01-15'
        }
    ],

    [DB_KEYS.IMPLANTS]: [
        {
            id: 'IMP-5001',
            name: 'Dual Chamber Rate-Adaptive Pacemaker',
            type: 'Cardiovascular Implant',
            manufacturer: 'Medtronic',
            model: 'Azure XT DR',
            batchNumber: 'MDT-PAC-90412',
            serialNumber: 'SN-7740192',
            stockQty: 4,
            unit: 'Sets',
            sterilizationDate: '2025-01-10',
            expiryDate: '2028-01-09',
            unitPrice: '₹3,20,000',
            storageLocation: 'Cardiac Catheterization Lab Safe'
        },
        {
            id: 'IMP-5002',
            name: 'Total Knee Arthroplasty Implant Set (Size 4)',
            type: 'Orthopedic Implant',
            manufacturer: 'Stryker',
            model: 'Triathlon Knee System',
            batchNumber: 'STR-TKA-4401',
            serialNumber: 'SN-998231',
            stockQty: 6,
            unit: 'Kits',
            sterilizationDate: '2024-11-15',
            expiryDate: '2029-11-14',
            unitPrice: '₹2,85,000',
            storageLocation: 'Orthopedic OT Store B'
        }
    ],

    [DB_KEYS.SPARE_PARTS]: [
        {
            id: 'PRT-6001',
            name: 'Oxygen Sensor Cell (Ventilator)',
            partNumber: 'O2-CELL-DRG-01',
            compatibleModels: 'Draeger Evita V500 / Savina 300',
            stockQty: 8,
            minStockLevel: 3,
            unitPrice: '₹22,000',
            location: 'BioMed Lab Shelf A1',
            status: 'In Stock'
        },
        {
            id: 'PRT-6002',
            name: 'Rechargeable Sealed Lead Battery 12V 7Ah',
            partNumber: 'BAT-12V-ZOL',
            compatibleModels: 'Zoll Defibrillator R Series',
            stockQty: 5,
            minStockLevel: 2,
            unitPrice: '₹8,500',
            location: 'BioMed Battery Store',
            status: 'In Stock'
        }
    ],

    [DB_KEYS.CONDEMNATION]: [
        {
            id: 'CND-7001',
            itemType: 'Equipment',
            itemName: 'Defibrillator Heartstart XL (Legacy)',
            serialNumber: 'PHI-DEF-1002',
            category: 'Major Equipment',
            department: 'Emergency Ward',
            reason: 'Cathode capacitor failure & non-availability of OEM spares (End of Life)',
            condemnDate: '2025-06-14',
            requestedBy: 'Eng. Rajesh Sharma',
            committeeApproval: 'Approved by HOD',
            scrapValue: '₹12,000 (Components Salvage)',
            certificateNo: 'CND-CERT-2025-089'
        },
        {
            id: 'CND-7002',
            itemType: 'Parts',
            itemName: 'Expired SpO2 Probes & Damaged Flow Sensors',
            serialNumber: 'BATCH-MISC-2023',
            category: 'Spare Parts',
            department: 'BioMed Workshop',
            reason: 'Physical wire fraying and sensor insulation breakdown',
            condemnDate: '2025-07-02',
            requestedBy: 'Tech. Anita Verma',
            committeeApproval: 'Pending HOD Approval',
            scrapValue: '₹1,500',
            certificateNo: 'Pending'
        }
    ],

    [DB_KEYS.TRAINING]: [
        {
            id: 'TRN-8001',
            category: 'O&M / OEM',
            title: 'Draeger Evita V500 Advanced Mechanical Ventilation O&M Training',
            targetItem: 'ICU Ventilator V900',
            trainer: 'Mr. David Miller (Senior OEM Specialist, Draeger)',
            date: '2025-05-20',
            location: 'Hospital Auditorium',
            attendeesCount: 18,
            attendeeNames: 'Dr. Alok Verma (HOD), Eng. R. Sharma, Tech. Anita + 15 staff',
            durationHours: '6 Hours',
            notes: 'Hands-on operational workflow, alarm limits setup, daily bio-calibration.'
        },
        {
            id: 'TRN-8002',
            category: 'PRN',
            title: 'PRN Training: Infusion Pump Rate Calculations & Occlusion Alarms',
            targetItem: 'B. Braun Space Infusomat',
            trainer: 'Eng. Vikas Kumar',
            date: '2025-07-04',
            location: 'NICU Nursing Station',
            attendeesCount: 12,
            attendeeNames: 'NICU Night Shift Staff Nurses',
            durationHours: '1.5 Hours',
            notes: 'Requested PRN by HOD due to new nursing staff onboarding.'
        }
    ]
};

class BioMedDB {
    constructor() {
        this.init();
    }

    init() {
        Object.keys(SEED_DATA).forEach(key => {
            const existingStr = localStorage.getItem(key);
            if (!existingStr) {
                localStorage.setItem(key, JSON.stringify(SEED_DATA[key]));
            } else {
                let updatedStr = existingStr;
                if (existingStr.includes('$')) {
                    updatedStr = existingStr.replace(/\$/g, '₹');
                }
                if (key === DB_KEYS.STAFF_MEMBERS) {
                    try {
                        const items = JSON.parse(updatedStr);
                        let modified = false;
                        const seedItems = SEED_DATA[DB_KEYS.STAFF_MEMBERS];
                        items.forEach(item => {
                            const seedMatch = seedItems.find(s => s.id === item.id);
                            if (seedMatch) {
                                if (!item.loginId) { item.loginId = seedMatch.loginId; modified = true; }
                                if (!item.password) { item.password = seedMatch.password; modified = true; }
                            } else {
                                if (!item.loginId) { item.loginId = (item.name || 'user').split(' ')[0].toLowerCase(); modified = true; }
                                if (!item.password) { item.password = 'staff123'; modified = true; }
                            }
                        });
                        if (modified) {
                            updatedStr = JSON.stringify(items);
                        }
                    } catch (e) {
                        updatedStr = JSON.stringify(SEED_DATA[key]);
                    }
                }
                localStorage.setItem(key, updatedStr);
            }
        });
    }

    getAll(key) {
        try {
            const data = localStorage.getItem(key);
            if (!data) return [];
            const sanitized = data.replace(/\$/g, '₹');
            return JSON.parse(sanitized);
        } catch (e) {
            console.error('Error fetching key:', key, e);
            return [];
        }
    }

    getById(key, id) {
        const items = this.getAll(key);
        return items.find(item => item.id === id);
    }

    save(key, item, currentUser = 'System User') {
        const items = this.getAll(key);
        if (!item.id) {
            item.id = this.generateId(key);
            items.push(item);
            this.logAudit(`Added new ${key} entry (${item.id})`, currentUser);
        } else {
            const index = items.findIndex(i => i.id === item.id);
            if (index !== -1) {
                items[index] = item;
                this.logAudit(`Updated ${key} entry (${item.id})`, currentUser);
            } else {
                items.push(item);
                this.logAudit(`Saved ${key} entry (${item.id})`, currentUser);
            }
        }
        localStorage.setItem(key, JSON.stringify(items).replace(/\$/g, '₹'));
        return item;
    }

    delete(key, id, currentUser = 'System User') {
        let items = this.getAll(key);
        items = items.filter(item => item.id !== id);
        localStorage.setItem(key, JSON.stringify(items));
        this.logAudit(`Deleted ${key} entry (${id})`, currentUser);
    }

    logAudit(actionText, userName = 'System User') {
        const logs = this.getAll(DB_KEYS.AUDIT_LOG);
        const newLog = {
            id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
            timestamp: new Date().toLocaleString(),
            user: userName,
            action: actionText
        };
        logs.unshift(newLog);
        if (logs.length > 50) logs.pop();
        localStorage.setItem(DB_KEYS.AUDIT_LOG, JSON.stringify(logs));
    }

    resetToSeed() {
        Object.keys(SEED_DATA).forEach(key => {
            localStorage.setItem(key, JSON.stringify(SEED_DATA[key]));
        });
    }

    generateId(key) {
        const prefixMap = {
            [DB_KEYS.BIO_EQUIPMENT]: 'EQ',
            [DB_KEYS.INSTRUMENTS]: 'INS',
            [DB_KEYS.CONSUMABLES]: 'CON',
            [DB_KEYS.DISPOSABLES]: 'DIS',
            [DB_KEYS.IMPLANTS]: 'IMP',
            [DB_KEYS.SPARE_PARTS]: 'PRT',
            [DB_KEYS.CONDEMNATION]: 'CND',
            [DB_KEYS.TRAINING]: 'TRN',
            [DB_KEYS.WORK_ORDERS]: 'WO',
            [DB_KEYS.TODOS]: 'TODO'
        };
        const prefix = prefixMap[key] || 'BM';
        const num = Math.floor(1000 + Math.random() * 9000);
        return `${prefix}-${num}`;
    }

    exportJSON() {
        const exportObj = {
            metadata: {
                system: 'Stavya Intelligence - Biomedical Engineering Suite',
                version: 'v4.0',
                exportedAt: new Date().toISOString(),
                facility: 'City General Super-Specialty Hospital'
            }
        };
        Object.keys(DB_KEYS).forEach(k => {
            const keyName = DB_KEYS[k];
            exportObj[keyName] = this.getAll(keyName);
        });
        return JSON.stringify(exportObj, null, 2);
    }

    importJSON(jsonString, currentUser = 'System User') {
        try {
            const parsed = JSON.parse(jsonString);
            if (typeof parsed !== 'object' || parsed === null) {
                throw new Error('Invalid JSON backup file structure.');
            }

            // Create Emergency Rollback Snapshot before overwriting
            this.createSnapshot('Pre-Restore Emergency Rollback', currentUser);

            let restoredKeysCount = 0;
            let totalRecordsRestored = 0;

            Object.keys(DB_KEYS).forEach(k => {
                const keyName = DB_KEYS[k];
                if (Array.isArray(parsed[keyName])) {
                    localStorage.setItem(keyName, JSON.stringify(parsed[keyName]).replace(/\$/g, '₹'));
                    restoredKeysCount++;
                    totalRecordsRestored += parsed[keyName].length;
                }
            });

            this.logAudit(`Disaster Recovery: Database Restored from Backup File (${totalRecordsRestored} records across ${restoredKeysCount} modules)`, currentUser);
            return { success: true, count: totalRecordsRestored, modules: restoredKeysCount };
        } catch (err) {
            console.error('Backup Import Failed:', err);
            return { success: false, error: err.message };
        }
    }

    createSnapshot(snapshotName = 'Manual System Snapshot', currentUser = 'System User') {
        try {
            const snapshots = JSON.parse(localStorage.getItem('biomed_snapshots') || '[]');
            const snapshotData = {};
            let totalRecords = 0;

            Object.keys(DB_KEYS).forEach(k => {
                const keyName = DB_KEYS[k];
                const items = this.getAll(keyName);
                snapshotData[keyName] = items;
                totalRecords += items.length;
            });

            const newSnapshot = {
                id: `SNP-${Math.floor(10000 + Math.random() * 90000)}`,
                name: snapshotName,
                timestamp: new Date().toLocaleString(),
                createdBy: currentUser,
                totalRecords: totalRecords,
                data: snapshotData
            };

            snapshots.unshift(newSnapshot);
            if (snapshots.length > 10) snapshots.pop(); // Keep last 10 snapshots
            localStorage.setItem('biomed_snapshots', JSON.stringify(snapshots));
            this.logAudit(`Created System Snapshot (${newSnapshot.id}: ${snapshotName})`, currentUser);
            return newSnapshot;
        } catch (err) {
            console.error('Create Snapshot Error:', err);
            return null;
        }
    }

    getSnapshots() {
        try {
            return JSON.parse(localStorage.getItem('biomed_snapshots') || '[]');
        } catch (err) {
            return [];
        }
    }

    restoreSnapshot(snapshotId, currentUser = 'System User') {
        try {
            const snapshots = this.getSnapshots();
            const target = snapshots.find(s => s.id === snapshotId);
            if (!target || !target.data) {
                throw new Error('Target snapshot not found or corrupted.');
            }

            // Create Emergency Rollback before restoring snapshot
            this.createSnapshot(`Pre-Rollback Backup (${snapshotId})`, currentUser);

            let restoredCount = 0;
            Object.keys(target.data).forEach(keyName => {
                if (Array.isArray(target.data[keyName])) {
                    localStorage.setItem(keyName, JSON.stringify(target.data[keyName]));
                    restoredCount += target.data[keyName].length;
                }
            });

            this.logAudit(`Restored System Snapshot (${snapshotId}: ${target.name})`, currentUser);
            return { success: true, count: restoredCount };
        } catch (err) {
            console.error('Restore Snapshot Error:', err);
            return { success: false, error: err.message };
        }
    }

    deleteSnapshot(snapshotId) {
        try {
            let snapshots = this.getSnapshots();
            snapshots = snapshots.filter(s => s.id !== snapshotId);
            localStorage.setItem('biomed_snapshots', JSON.stringify(snapshots));
            return true;
        } catch (err) {
            return false;
        }
    }
}

window.DB = new BioMedDB();
window.DB_KEYS = DB_KEYS;
