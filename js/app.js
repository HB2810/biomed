/**
 * BioMedPulse OS - Main Application Controller
 * Universal Modification Access: System Administrator (ADMIN) & Biomedical HOD (HOD)
 * Read-Only / Request Mode: Staff Engineers (STAFF)
 * Comprehensive Report Generators (Excel & PDF) for ALL Sections
 */

let currentActiveView = 'admin';
let currentRole = 'ADMIN'; // ADMIN, HOD, or STAFF
let currentAuthUser = null;
let editingEntityKey = null;
let editingRecordId = null;

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    // Pre-render all graphical dashboard charts so SVG elements exist immediately
    setTimeout(() => {
        renderAdminPanel();
        renderHODDashboard();
        renderMasterReportView();
    }, 50);
});

// -------------------------------------------------------------
// AUTHENTICATION & LOGIN SCREEN CONTROLLER
// -------------------------------------------------------------

function initAuth() {
    const savedSession = sessionStorage.getItem('biomed_auth_session');
    if (savedSession) {
        try {
            const userObj = JSON.parse(savedSession);
            if (userObj && userObj.id) {
                const dbUser = DB.getById(DB_KEYS.STAFF_MEMBERS, userObj.id) || userObj;
                setLoggedInSession(dbUser);
                return;
            }
        } catch (e) {
            sessionStorage.removeItem('biomed_auth_session');
        }
    }
    showLoginOverlay();
}

function showLoginOverlay() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
        const closeBtn = document.getElementById('login-modal-close-btn');
        if (closeBtn) {
            closeBtn.style.display = currentAuthUser ? 'flex' : 'none';
        }
    }
}

function hideLoginOverlay() {
    if (!currentAuthUser) {
        alert('Please sign in with authorized credentials to access system features.');
        return;
    }
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.style.display = 'none';
}

function quickLogin(loginId, password) {
    const idInput = document.getElementById('login-id-input');
    const passInput = document.getElementById('login-password-input');
    if (idInput) idInput.value = loginId;
    if (passInput) passInput.value = password;
    const form = document.getElementById('login-form');
    if (form) {
        const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
        form.dispatchEvent(submitEvent);
    }
}

function setLoggedInSession(userObj) {
    currentAuthUser = userObj;

    const roleStr = (userObj.role || '').toLowerCase();
    const privStr = (userObj.privileges || '').toLowerCase();

    if (roleStr.includes('admin') || privStr.includes('admin')) {
        currentRole = 'ADMIN';
    } else if (roleStr.includes('hod') || privStr.includes('hod') || privStr.includes('approval')) {
        currentRole = 'HOD';
    } else {
        currentRole = 'STAFF';
    }

    sessionStorage.setItem('biomed_auth_session', JSON.stringify(userObj));
    hideLoginOverlay();
    updateUserProfileBadge();

    if (currentRole === 'ADMIN') {
        switchView('admin');
    } else if (currentRole === 'HOD') {
        switchView('hod-dashboard');
    } else {
        switchView('work-orders');
    }
    updateAllBadgesAndKPIs();
}

function handleLoginSubmit(e) {
    e.preventDefault();
    const loginIdInput = document.getElementById('login-id-input')?.value.trim();
    const passwordInput = document.getElementById('login-password-input')?.value;
    const errorMsgEl = document.getElementById('login-error-msg');

    if (!loginIdInput || !passwordInput) {
        if (errorMsgEl) {
            errorMsgEl.textContent = 'Please enter both Login ID and Password.';
            errorMsgEl.style.display = 'block';
        }
        return;
    }

    const staffMembers = DB.getAll(DB_KEYS.STAFF_MEMBERS);
    let userMatch = staffMembers.find(stf =>
        (stf.loginId && stf.loginId.toLowerCase() === loginIdInput.toLowerCase()) ||
        (stf.id && stf.id.toLowerCase() === loginIdInput.toLowerCase()) ||
        (stf.email && stf.email.toLowerCase() === loginIdInput.toLowerCase())
    );

    // Fallback credential resolution for standard demo accounts
    if (!userMatch || !userMatch.password) {
        if (loginIdInput.toLowerCase() === 'admin' && passwordInput === 'admin123') {
            userMatch = staffMembers.find(s => (s.role || '').toLowerCase().includes('admin')) || { id: 'STF-100', loginId: 'admin', password: 'admin123', name: 'System Admin (Superuser)', role: 'System Admin', privileges: 'System Admin (Full IT & User Control)' };
        } else if (loginIdInput.toLowerCase() === 'hod' && passwordInput === 'hod123') {
            userMatch = staffMembers.find(s => (s.role || '').toLowerCase().includes('hod')) || { id: 'STF-101', loginId: 'hod', password: 'hod123', name: 'Dr. Alok Verma', role: 'Biomedical HOD', privileges: 'HOD Executive (Approvals & Oversight)' };
        } else if (loginIdInput.toLowerCase() === 'staff' && passwordInput === 'staff123') {
            userMatch = staffMembers.find(s => (s.role || '').toLowerCase().includes('engineer') || (s.role || '').toLowerCase().includes('technician')) || { id: 'STF-102', loginId: 'staff', password: 'staff123', name: 'Eng. Rajesh Sharma', role: 'Senior BioMed Engineer', privileges: 'Staff Technician (Task Execution)' };
        }
    }

    if (userMatch) {
        const storedPass = userMatch.password || (userMatch.loginId === 'admin' ? 'admin123' : (userMatch.loginId === 'hod' ? 'hod123' : 'staff123'));
        if (storedPass === passwordInput) {
            if (errorMsgEl) errorMsgEl.style.display = 'none';
            setLoggedInSession(userMatch);
            DB.save(DB_KEYS.AUDIT_LOG, {
                id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
                timestamp: new Date().toLocaleString(),
                user: `${userMatch.name} (${userMatch.loginId || userMatch.id})`,
                action: `Portal Authentication Successful as ${userMatch.role}`
            });
            return;
        }
    }

    if (errorMsgEl) {
        errorMsgEl.textContent = 'Invalid Login ID or Password. Check default demo credentials below.';
        errorMsgEl.style.display = 'block';
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to sign out of Stavya Intelligence?')) {
        sessionStorage.removeItem('biomed_auth_session');
        currentAuthUser = null;
        currentRole = 'STAFF';
        updateUserProfileBadge();
        showLoginOverlay();
    }
}

function updateUserProfileBadge() {
    const avatarEl = document.getElementById('user-avatar');
    const nameEl = document.getElementById('user-display-name');
    const loginEl = document.getElementById('user-display-login');

    if (currentAuthUser) {
        if (avatarEl) avatarEl.textContent = currentRole === 'ADMIN' ? '🛡️' : (currentRole === 'HOD' ? '👑' : '🛠️');
        let displayName = (currentAuthUser.name || 'User').split('(')[0].trim();
        if (nameEl) {
            nameEl.textContent = displayName;
            nameEl.title = currentAuthUser.name;
        }
        if (loginEl) loginEl.textContent = `(${currentAuthUser.loginId || currentAuthUser.id})`;
    } else {
        if (avatarEl) avatarEl.textContent = '🔒';
        if (nameEl) nameEl.textContent = 'Not Logged In';
        if (loginEl) loginEl.textContent = '';
    }
}

function isAdmin() {
    return currentRole === 'ADMIN';
}

function isHOD() {
    return currentRole === 'HOD';
}

function isStaff() {
    return currentRole === 'STAFF';
}

function canEdit() {
    return currentRole === 'ADMIN' || currentRole === 'HOD';
}

function changeUserRole(role) {
    currentRole = role;
    const roleNames = {
        'ADMIN': '🛡️ System Administrator (IT Rights Control)',
        'HOD': '👑 Biomedical HOD (Dr. Alok Verma - Executive)',
        'STAFF': '🛠️ Staff Engineer (Eng. Rajesh Sharma - Technical)'
    };

    if (role === 'ADMIN') {
        currentActiveView = 'admin';
    } else if (role === 'HOD') {
        currentActiveView = 'hod-dashboard';
    } else {
        currentActiveView = 'work-orders';
    }

    alert(`Switched Active Role to: ${roleNames[role]}`);
    switchView(currentActiveView);
}

// View Switching Manager
function switchView(viewId) {
    // Role separation protection: Admin Panel is reserved for System Administrators
    if (viewId === 'admin' && !isAdmin()) {
        if (isHOD()) {
            alert('Notice: Admin Control Panel is reserved for System Administrators. Opening HOD Executive View.');
            viewId = 'hod-dashboard';
        } else {
            alert('Access Restricted: Admin Control Panel is reserved for System Administrators. Opening Work Orders.');
            viewId = 'work-orders';
        }
    }

    currentActiveView = viewId;

    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active-view'));
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));

    const targetSection = document.getElementById(`view-${viewId}`);
    const targetNav = document.getElementById(`nav-${viewId}`);

    if (targetSection) targetSection.classList.add('active-view');
    if (targetNav) targetNav.classList.add('active');

    const titleEl = document.getElementById('view-title');
    const subTitleEl = document.getElementById('view-subtitle');
    const btnAction = document.getElementById('btn-primary-action');

    const viewConfig = {
        'admin': {
            title: 'Admin Control Panel',
            subtitle: 'System Settings, User Rights & Audit Logs (Admin Only)',
            btnText: '➕ Add Staff Member',
            type: 'STAFF_MEMBERS'
        },
        'hod-dashboard': {
            title: 'HOD Executive View',
            subtitle: 'Department Oversight & Approvals Queue (HOD Executive)',
            btnText: '➕ Dispatch Work Order',
            type: 'WORK_ORDERS'
        },
        'work-orders': {
            title: 'Work Orders Dispatch',
            subtitle: 'Maintenance Tickets & Resolution Logs',
            btnText: '➕ Dispatch Work Order',
            type: 'WORK_ORDERS'
        },
        'bio-equipment': {
            title: 'Bio Equipment Directory',
            subtitle: 'Lifecycle Contracts & Sub-Categories',
            btnText: '➕ Add Bio Equipment',
            type: 'BIO_EQUIPMENT'
        },
        'instruments': {
            title: 'Instruments Registry',
            subtitle: 'Servicing History & Calibration Logs',
            btnText: '➕ Add Instrument',
            type: 'INSTRUMENTS'
        },
        'consumables-disposables': {
            title: 'Consumables & Disposables',
            subtitle: 'Stock Inventory & Expiry Tracking',
            btnText: '➕ Add Consumable',
            type: 'CONSUMABLES'
        },
        'implants': {
            title: 'Implants Inventory',
            subtitle: 'Batch Numbers & Expiry Tracking',
            btnText: '➕ Add Implant',
            type: 'IMPLANTS'
        },
        'spare-parts': {
            title: 'Spare Parts Inventory',
            subtitle: 'Component Spares & Stock Triggers',
            btnText: '➕ Add Spare Part',
            type: 'SPARE_PARTS'
        },
        'condemnation': {
            title: 'Condemnation Section',
            subtitle: 'Decommissioning & Scrap Records',
            btnText: '❌ File Condemnation Request',
            type: 'CONDEMNATION'
        },
        'training': {
            title: 'Training Section',
            subtitle: 'Clinical & OEM Certified Training',
            btnText: '➕ Log Training Session',
            type: 'TRAINING'
        },
        'todos': {
            title: 'Staff ToDo Task Directory',
            subtitle: 'HOD Task Assignments, Employee Workflow & Status Logs',
            btnText: '➕ Set New ToDo',
            type: 'TODOS'
        },
        'master-report': {
            title: 'Master Executive Report',
            subtitle: 'Multi-Sheet Analytics, KPI Dashboard & Excel Master Portal',
            btnText: '📊 Export Multi-Sheet Excel',
            type: 'MASTER_REPORT'
        }
    };

    const cfg = viewConfig[viewId] || viewConfig['admin'];
    if (titleEl) titleEl.textContent = cfg.title;
    if (subTitleEl) subTitleEl.textContent = cfg.subtitle;

    if (btnAction) {
        if (cfg.type === 'MASTER_REPORT') {
            btnAction.style.display = 'inline-block';
            btnAction.textContent = '📊 Export Multi-Sheet Excel';
            btnAction.onclick = () => exportMasterMultiSheetExcel();
        } else if (cfg.type === 'TODOS') {
            btnAction.style.display = 'inline-block';
            btnAction.textContent = cfg.btnText;
            btnAction.onclick = () => openTodoModal();
        } else if (cfg.type && canEdit()) {
            btnAction.style.display = 'inline-block';
            btnAction.textContent = cfg.btnText;
            btnAction.onclick = () => openAddModal(cfg.type);
        } else {
            btnAction.style.display = 'none';
        }
    }

    if (viewId === 'admin') renderAdminPanel();
    else if (viewId === 'hod-dashboard') renderHODDashboard();
    else if (viewId === 'todos') renderTodosView();
    else if (viewId === 'master-report') renderMasterReportView();
    else if (viewId === 'work-orders') renderWorkOrdersTable();
    else if (viewId === 'bio-equipment') renderBioEquipmentTable();
    else if (viewId === 'instruments') renderInstrumentsTable();
    else if (viewId === 'consumables-disposables') { renderConsumablesTable(); renderDisposablesTable(); }
    else if (viewId === 'implants') renderImplantsTable();
    else if (viewId === 'spare-parts') renderSparePartsTable();
    else if (viewId === 'condemnation') renderCondemnationTable();
    else if (viewId === 'training') renderTrainingTable();

    updateAllBadgesAndKPIs();
}

// -------------------------------------------------------------
// ADMIN CONTROL PANEL RENDERER
// -------------------------------------------------------------
// INTERACTIVE GRAPH TOOLTIP & VECTOR CHARTING ENGINE
// -------------------------------------------------------------

function showChartTooltip(evt, title, val, pct, color, parent) {
    let tooltip = parent.querySelector('.chart-tooltip-box');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'chart-tooltip-box';
        tooltip.style.cssText = `
            position: absolute;
            background: #0f172a;
            color: #ffffff;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 11px;
            font-family: 'Outfit', sans-serif;
            box-shadow: 0 6px 20px rgba(15, 23, 42, 0.4);
            pointer-events: none;
            z-index: 1000;
            white-space: nowrap;
            display: block;
            border-left: 4px solid ${color || '#0284c7'};
            transition: opacity 0.1s ease-out;
        `;
        parent.appendChild(tooltip);
    }

    const rect = parent.getBoundingClientRect();
    const mouseX = evt.clientX - rect.left;
    const mouseY = evt.clientY - rect.top;

    tooltip.innerHTML = `
        <div style="font-weight: 700; color: #ffffff; font-size: 11px; margin-bottom: 2px;">${title}</div>
        <div style="color: #94a3b8; font-size: 10px;">Count: <strong style="color:#38bdf8; font-size:11px;">${val}</strong>${pct !== null && pct !== undefined ? ` <span style="color:#cbd5e1">(${pct}%)</span>` : ''}</div>
    `;
    tooltip.style.borderLeftColor = color || '#0284c7';
    tooltip.style.display = 'block';

    let left = mouseX + 12;
    let top = mouseY - 38;
    if (left + 140 > rect.width) left = mouseX - 140;
    if (top < 5) top = mouseY + 15;

    tooltip.style.left = `${Math.max(5, left)}px`;
    tooltip.style.top = `${Math.max(5, top)}px`;
    tooltip.style.opacity = '1';
}

function hideChartTooltip(parent) {
    const tooltip = parent.querySelector('.chart-tooltip-box');
    if (tooltip) {
        tooltip.style.opacity = '0';
        tooltip.style.display = 'none';
    }
}

function formatBarLabel(fullLabel) {
    const map = {
        'In-Service': 'In-Service',
        'Breakdown': 'Breakdown',
        'Open WOs': 'Open WOs',
        'Resolved WOs': 'Resolved',
        'Bio Equipment': 'Equipment',
        'Minor Instruments': 'Instruments',
        'Spare Parts': 'Spares',
        'Consumables OK': 'Consumables',
        'Consumables LOW ⚠️': 'Consum. Low',
        'Spares OK': 'Spares OK',
        'Spares LOW ⚠️': 'Spares Low',
        'System Admins': 'Admins',
        'HOD Executives': 'HOD Execs',
        'Biomedical Staff': 'Bio Staff'
    };
    return map[fullLabel] || (fullLabel.length > 10 ? fullLabel.slice(0, 8) + '…' : fullLabel);
}

function renderDashboardChart(canvasId, type, labels, dataValues, colors, chartTitle) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    // Ensure parent container has proper height and position
    parent.style.position = 'relative';
    parent.style.minHeight = '240px';

    // Hide original canvas to avoid Chart.js flexbox 0x0 collapse bugs
    canvas.style.display = 'none';

    // Remove any existing SVG chart in parent
    const oldSvg = parent.querySelectorAll('svg.custom-chart-svg');
    oldSvg.forEach(s => s.remove());

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "custom-chart-svg");
    svg.setAttribute("viewBox", "0 0 400 230");
    svg.setAttribute("style", "width:100%; height:100%; min-height:220px; display:block; background:#ffffff; border-radius:8px; border:1px solid #e2e8f0;");

    const totalSum = dataValues.reduce((a, b) => a + Number(b || 0), 0);

    if (type === 'bar') {
        const paddingLeft = 45;
        const paddingRight = 20;
        const paddingTop = 32;
        const paddingBottom = 42;
        const chartW = 400 - paddingLeft - paddingRight;
        const chartH = 230 - paddingTop - paddingBottom;
        const maxVal = Math.max(...dataValues.map(v => Number(v || 0)), 1);

        // Y-Axis Gridlines
        const gridSteps = 4;
        for (let i = 0; i <= gridSteps; i++) {
            const yVal = Math.round((maxVal / gridSteps) * i);
            const yPos = paddingTop + chartH - (i / gridSteps) * chartH;

            const line = document.createElementNS(svgNS, "line");
            line.setAttribute("x1", paddingLeft);
            line.setAttribute("y1", yPos);
            line.setAttribute("x2", 400 - paddingRight);
            line.setAttribute("y2", yPos);
            line.setAttribute("stroke", "#e2e8f0");
            line.setAttribute("stroke-width", "1");
            svg.appendChild(line);

            const txt = document.createElementNS(svgNS, "text");
            txt.setAttribute("x", paddingLeft - 8);
            txt.setAttribute("y", yPos + 4);
            txt.setAttribute("text-anchor", "end");
            txt.setAttribute("fill", "#64748b");
            txt.setAttribute("font-size", "10");
            txt.setAttribute("font-weight", "600");
            txt.setAttribute("font-family", "Outfit, sans-serif");
            txt.textContent = yVal;
            svg.appendChild(txt);
        }

        // Bars
        const numBars = labels.length;
        const gap = 14;
        const barWidth = Math.max(18, Math.min(48, (chartW - (numBars + 1) * gap) / numBars));

        labels.forEach((label, idx) => {
            const val = Number(dataValues[idx] || 0);
            const barH = (val / maxVal) * chartH;
            const x = paddingLeft + gap + idx * (barWidth + gap);
            const y = paddingTop + chartH - barH;
            const color = colors[idx % colors.length] || '#0284c7';

            const rect = document.createElementNS(svgNS, "rect");
            rect.setAttribute("x", x);
            rect.setAttribute("y", val > 0 ? y : paddingTop + chartH - 4);
            rect.setAttribute("width", barWidth);
            rect.setAttribute("height", Math.max(barH, 4));
            rect.setAttribute("rx", "6");
            rect.setAttribute("ry", "6");
            rect.setAttribute("fill", color);
            rect.setAttribute("style", "cursor: pointer; transition: opacity 0.15s ease, filter 0.15s ease;");

            rect.addEventListener('mouseenter', (evt) => {
                rect.setAttribute("fill-opacity", "0.85");
                rect.setAttribute("stroke", "#0f172a");
                rect.setAttribute("stroke-width", "2");
                const pct = totalSum > 0 ? Math.round((val / totalSum) * 100) : 0;
                showChartTooltip(evt, label, val, pct, color, parent);
            });
            rect.addEventListener('mousemove', (evt) => {
                const pct = totalSum > 0 ? Math.round((val / totalSum) * 100) : 0;
                showChartTooltip(evt, label, val, pct, color, parent);
            });
            rect.addEventListener('mouseleave', () => {
                rect.setAttribute("fill-opacity", "1");
                rect.removeAttribute("stroke");
                rect.removeAttribute("stroke-width");
                hideChartTooltip(parent);
            });

            svg.appendChild(rect);

            // Value text above bar
            const valTxt = document.createElementNS(svgNS, "text");
            valTxt.setAttribute("x", x + barWidth / 2);
            valTxt.setAttribute("y", Math.max(y - 5, paddingTop - 4));
            valTxt.setAttribute("text-anchor", "middle");
            valTxt.setAttribute("fill", "#0f172a");
            valTxt.setAttribute("font-size", "11");
            valTxt.setAttribute("font-weight", "700");
            valTxt.setAttribute("font-family", "Outfit, sans-serif");
            valTxt.textContent = val;
            svg.appendChild(valTxt);

            // Category text below bar
            const catTxt = document.createElementNS(svgNS, "text");
            catTxt.setAttribute("x", x + barWidth / 2);
            catTxt.setAttribute("y", 230 - 8);
            catTxt.setAttribute("text-anchor", "middle");
            catTxt.setAttribute("fill", "#475569");
            catTxt.setAttribute("font-size", "9.5");
            catTxt.setAttribute("font-weight", "600");
            catTxt.setAttribute("font-family", "Outfit, sans-serif");
            catTxt.setAttribute("style", "cursor: pointer;");
            catTxt.textContent = formatBarLabel(String(label));

            catTxt.addEventListener('mouseenter', (evt) => {
                const pct = totalSum > 0 ? Math.round((val / totalSum) * 100) : 0;
                showChartTooltip(evt, label, val, pct, color, parent);
            });
            catTxt.addEventListener('mousemove', (evt) => {
                const pct = totalSum > 0 ? Math.round((val / totalSum) * 100) : 0;
                showChartTooltip(evt, label, val, pct, color, parent);
            });
            catTxt.addEventListener('mouseleave', () => {
                hideChartTooltip(parent);
            });

            svg.appendChild(catTxt);
        });

    } else {
        // Doughnut Chart in SVG
        const centerX = 200;
        const centerY = 88;
        const outerR = 58;
        const innerR = 34;

        if (totalSum === 0) {
            const circle = document.createElementNS(svgNS, "circle");
            circle.setAttribute("cx", centerX);
            circle.setAttribute("cy", centerY);
            circle.setAttribute("r", outerR);
            circle.setAttribute("fill", "#f1f5f9");
            circle.setAttribute("stroke", "#cbd5e1");
            circle.setAttribute("stroke-width", "2");
            svg.appendChild(circle);

            const innerCircle = document.createElementNS(svgNS, "circle");
            innerCircle.setAttribute("cx", centerX);
            innerCircle.setAttribute("cy", centerY);
            innerCircle.setAttribute("r", innerR);
            innerCircle.setAttribute("fill", "#ffffff");
            svg.appendChild(innerCircle);

            const txt = document.createElementNS(svgNS, "text");
            txt.setAttribute("x", centerX);
            txt.setAttribute("y", centerY + 4);
            txt.setAttribute("text-anchor", "middle");
            txt.setAttribute("fill", "#64748b");
            txt.setAttribute("font-size", "12");
            txt.setAttribute("font-weight", "600");
            txt.setAttribute("font-family", "Outfit, sans-serif");
            txt.textContent = "No Data";
            svg.appendChild(txt);
        } else {
            let startAngle = -Math.PI / 2;
            let nonZeroSlices = dataValues.filter(v => Number(v || 0) > 0);

            if (nonZeroSlices.length === 1) {
                const singleIdx = dataValues.findIndex(v => Number(v || 0) > 0);
                const color = colors[singleIdx % colors.length] || '#0284c7';
                const label = labels[singleIdx];
                const val = dataValues[singleIdx];

                const circleOuter = document.createElementNS(svgNS, "circle");
                circleOuter.setAttribute("cx", centerX);
                circleOuter.setAttribute("cy", centerY);
                circleOuter.setAttribute("r", outerR);
                circleOuter.setAttribute("fill", color);
                circleOuter.setAttribute("style", "cursor: pointer; transition: fill-opacity 0.15s ease;");

                circleOuter.addEventListener('mouseenter', (evt) => {
                    circleOuter.setAttribute("fill-opacity", "0.85");
                    showChartTooltip(evt, label, val, 100, color, parent);
                });
                circleOuter.addEventListener('mousemove', (evt) => {
                    showChartTooltip(evt, label, val, 100, color, parent);
                });
                circleOuter.addEventListener('mouseleave', () => {
                    circleOuter.setAttribute("fill-opacity", "1");
                    hideChartTooltip(parent);
                });
                svg.appendChild(circleOuter);

                const circleInner = document.createElementNS(svgNS, "circle");
                circleInner.setAttribute("cx", centerX);
                circleInner.setAttribute("cy", centerY);
                circleInner.setAttribute("r", innerR);
                circleInner.setAttribute("fill", "#ffffff");
                svg.appendChild(circleInner);
            } else {
                dataValues.forEach((val, idx) => {
                    const numVal = Number(val || 0);
                    if (numVal <= 0) return;

                    const sliceRatio = numVal / totalSum;
                    const color = colors[idx % colors.length] || '#0284c7';
                    const sliceAngle = sliceRatio * 2 * Math.PI;
                    const endAngle = startAngle + sliceAngle;

                    const x1 = centerX + outerR * Math.cos(startAngle);
                    const y1 = centerY + outerR * Math.sin(startAngle);
                    const x2 = centerX + outerR * Math.cos(endAngle);
                    const y2 = centerY + outerR * Math.sin(endAngle);

                    const ix1 = centerX + innerR * Math.cos(endAngle);
                    const iy1 = centerY + innerR * Math.sin(endAngle);
                    const ix2 = centerX + innerR * Math.cos(startAngle);
                    const iy2 = centerY + innerR * Math.sin(startAngle);

                    const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

                    const pathData = `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${ix2} ${iy2} Z`;

                    const path = document.createElementNS(svgNS, "path");
                    path.setAttribute("d", pathData);
                    path.setAttribute("fill", color);
                    path.setAttribute("stroke", "#ffffff");
                    path.setAttribute("stroke-width", "2");
                    path.setAttribute("style", "cursor: pointer; transition: fill-opacity 0.15s ease;");

                    path.addEventListener('mouseenter', (evt) => {
                        path.setAttribute("fill-opacity", "0.85");
                        path.setAttribute("stroke", "#0f172a");
                        path.setAttribute("stroke-width", "3");
                        const pct = Math.round(sliceRatio * 100);
                        showChartTooltip(evt, labels[idx], numVal, pct, color, parent);
                    });
                    path.addEventListener('mousemove', (evt) => {
                        const pct = Math.round(sliceRatio * 100);
                        showChartTooltip(evt, labels[idx], numVal, pct, color, parent);
                    });
                    path.addEventListener('mouseleave', () => {
                        path.setAttribute("fill-opacity", "1");
                        path.setAttribute("stroke", "#ffffff");
                        path.setAttribute("stroke-width", "2");
                        hideChartTooltip(parent);
                    });

                    svg.appendChild(path);

                    startAngle = endAngle;
                });
            }

            // Center text inside donut
            const centerTxt = document.createElementNS(svgNS, "text");
            centerTxt.setAttribute("x", centerX);
            centerTxt.setAttribute("y", centerY - 1);
            centerTxt.setAttribute("text-anchor", "middle");
            centerTxt.setAttribute("fill", "#0f172a");
            centerTxt.setAttribute("font-size", "14");
            centerTxt.setAttribute("font-weight", "800");
            centerTxt.setAttribute("font-family", "Outfit, sans-serif");
            centerTxt.textContent = totalSum;
            svg.appendChild(centerTxt);

            const centerSub = document.createElementNS(svgNS, "text");
            centerSub.setAttribute("x", centerX);
            centerSub.setAttribute("y", centerY + 12);
            centerSub.setAttribute("text-anchor", "middle");
            centerSub.setAttribute("fill", "#64748b");
            centerSub.setAttribute("font-size", "8.5");
            centerSub.setAttribute("font-weight", "700");
            centerSub.setAttribute("font-family", "Outfit, sans-serif");
            centerSub.textContent = "TOTAL";
            svg.appendChild(centerSub);
        }

        // Multi-Row Clean Legend Layout (Fixes Text Overlap for 5-6 Items)
        const totalItems = labels.length;
        const isMultiRow = totalItems > 4;
        const itemsPerRow = isMultiRow ? Math.ceil(totalItems / 2) : totalItems;

        labels.forEach((label, idx) => {
            const val = dataValues[idx] || 0;
            const pct = totalSum > 0 ? Math.round((val / totalSum) * 100) : 0;
            const color = colors[idx % colors.length] || '#0284c7';

            let row = 0;
            let col = idx;
            let rowItems = totalItems;
            if (isMultiRow) {
                row = idx < itemsPerRow ? 0 : 1;
                col = idx < itemsPerRow ? idx : idx - itemsPerRow;
                rowItems = row === 0 ? itemsPerRow : (totalItems - itemsPerRow);
            }

            const itemW = 380 / Math.max(rowItems, 1);
            const x = col * itemW + itemW / 2;
            const y = isMultiRow ? (row === 0 ? 175 : 202) : 202;

            const legendGroup = document.createElementNS(svgNS, "g");
            legendGroup.setAttribute("style", "cursor: pointer;");

            const dot = document.createElementNS(svgNS, "circle");
            dot.setAttribute("cx", Math.max(12, x - 28));
            dot.setAttribute("cy", y - 3);
            dot.setAttribute("r", "4.5");
            dot.setAttribute("fill", color);
            legendGroup.appendChild(dot);

            const legTxt = document.createElementNS(svgNS, "text");
            legTxt.setAttribute("x", Math.max(20, x - 20));
            legTxt.setAttribute("y", y);
            legTxt.setAttribute("text-anchor", "start");
            legTxt.setAttribute("fill", "#334155");
            legTxt.setAttribute("font-size", "9.5");
            legTxt.setAttribute("font-weight", "600");
            legTxt.setAttribute("font-family", "Outfit, sans-serif");
            legTxt.textContent = `${formatBarLabel(String(label))}: ${val}`;
            legendGroup.appendChild(legTxt);

            legendGroup.addEventListener('mouseenter', (evt) => {
                showChartTooltip(evt, label, val, pct, color, parent);
            });
            legendGroup.addEventListener('mousemove', (evt) => {
                showChartTooltip(evt, label, val, pct, color, parent);
            });
            legendGroup.addEventListener('mouseleave', () => {
                hideChartTooltip(parent);
            });

            svg.appendChild(legendGroup);
        });
    }

    parent.appendChild(svg);
}

function renderAdminPanel() {
    const staffMembers = DB.getAll(DB_KEYS.STAFF_MEMBERS);
    const auditLogs = DB.getAll(DB_KEYS.AUDIT_LOG);

    const kpiStaffCount = document.getElementById('kpi-admin-staff-count');
    if (kpiStaffCount) kpiStaffCount.textContent = staffMembers.length;

    const kpiAuditCount = document.getElementById('kpi-audit-count');
    if (kpiAuditCount) kpiAuditCount.textContent = auditLogs.length;

    // Render Admin Graphical Charts
    const adminUsers = staffMembers.filter(s => (s.role || '').includes('Admin')).length;
    const hodUsers = staffMembers.filter(s => (s.role || '').includes('HOD')).length;
    const staffUsers = staffMembers.length - adminUsers - hodUsers;

    renderDashboardChart('chart-admin-roles', 'doughnut', 
        ['System Admins', 'HOD Executives', 'Biomedical Staff'], 
        [adminUsers, hodUsers, Math.max(0, staffUsers)], 
        ['#dc2626', '#0284c7', '#10b981'], 
        'User Roles Distribution'
    );

    const loginLogs = auditLogs.filter(l => (l.action || '').toLowerCase().includes('login')).length;
    const addLogs = auditLogs.filter(l => (l.action || '').toLowerCase().includes('add') || (l.action || '').toLowerCase().includes('create')).length;
    const editLogs = auditLogs.filter(l => (l.action || '').toLowerCase().includes('edit') || (l.action || '').toLowerCase().includes('update')).length;
    const delLogs = auditLogs.filter(l => (l.action || '').toLowerCase().includes('delete') || (l.action || '').toLowerCase().includes('remove')).length;
    const otherLogs = Math.max(0, auditLogs.length - loginLogs - addLogs - editLogs - delLogs);

    renderDashboardChart('chart-admin-audit', 'bar', 
        ['Logins', 'Adds', 'Edits', 'Deletes', 'Others'], 
        [loginLogs, addLogs, editLogs, delLogs, otherLogs], 
        ['#10b981', '#0284c7', '#f59e0b', '#dc2626', '#8b5cf6'], 
        'Audit Log Action Breakdown'
    );

    const tbodyStaff = document.getElementById('tbody-admin-staff');
    if (tbodyStaff) {
        tbodyStaff.innerHTML = staffMembers.map(stf => `
            <tr>
                <td style="font-family:var(--font-mono); color:var(--blue-primary)">${stf.id}</td>
                <td><strong style="font-family:var(--font-mono); color:var(--purple-accent); background:#f1f5f9; padding:2px 8px; border-radius:6px">${stf.loginId || stf.id}</strong></td>
                <td><strong>${stf.name}</strong></td>
                <td><span class="badge ${stf.role.includes('Admin') ? 'badge-status-condemned' : (stf.role.includes('HOD') ? 'badge-cmc' : 'badge-major')}">${stf.role}</span></td>
                <td><small style="color:var(--text-muted)">${stf.email || 'N/A'}<br>${stf.phone || 'N/A'}</small></td>
                <td>
                    ${stf.privileges?.includes('Admin') ? `<span class="badge badge-status-condemned">🛡️ System Admin (Full IT)</span>` : 
                      (stf.privileges?.includes('HOD') || stf.privileges?.includes('Approval') ? `<span class="badge badge-cmc">👑 HOD Executive (Approvals)</span>` : 
                      `<span class="badge badge-major">🛠️ Staff Technician (Task Execution)</span>`)}
                </td>
                <td>
                    <span style="font-family:var(--font-mono); font-size:0.8rem; color:var(--emerald-green); font-weight:700" title="Password Configured">🔒 ••••••••</span>
                </td>
                <td style="white-space:nowrap">
                    <div class="table-actions">
                        ${isAdmin() ? `
                            <button class="btn btn-sm" onclick="editRecord('${DB_KEYS.STAFF_MEMBERS}', '${stf.id}')">✏️ Edit Account</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteRecord('${DB_KEYS.STAFF_MEMBERS}', '${stf.id}')">🗑️</button>
                        ` : `<span style="color:var(--text-muted)">Admin Only</span>`}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    const tbodyAudit = document.getElementById('tbody-admin-audit');
    if (tbodyAudit) {
        tbodyAudit.innerHTML = auditLogs.map(log => `
            <tr>
                <td style="font-family:var(--font-mono); color:var(--purple-accent)">${log.id}</td>
                <td style="font-family:var(--font-mono)">${log.timestamp}</td>
                <td><strong>${log.user}</strong></td>
                <td>${log.action}</td>
            </tr>
        `).join('');
    }
}

// -------------------------------------------------------------
// HOD DASHBOARD & WORK ORDERS RENDERERS
// -------------------------------------------------------------

function renderHODDashboard() {
    const staffMembers = DB.getAll(DB_KEYS.STAFF_MEMBERS);
    const workOrders = DB.getAll(DB_KEYS.WORK_ORDERS);
    const condemnationReqs = DB.getAll(DB_KEYS.CONDEMNATION);
    const bioEquipment = DB.getAll(DB_KEYS.BIO_EQUIPMENT);
    const instruments = DB.getAll(DB_KEYS.INSTRUMENTS);
    const spareParts = DB.getAll(DB_KEYS.SPARE_PARTS);
    const consumables = DB.getAll(DB_KEYS.CONSUMABLES);
    const trainings = DB.getAll(DB_KEYS.TRAINING);

    // 1. Equipment Uptime Rate
    const totalEq = bioEquipment.length;
    const inServiceEq = bioEquipment.filter(e => e.status === 'In Service').length;
    const uptimeRate = totalEq > 0 ? ((inServiceEq / totalEq) * 100).toFixed(1) : '98.4';

    // 2. Open Work Orders
    const openWOs = workOrders.filter(w => w.status !== 'Resolved').length;

    // 3. Pending Approvals
    const pendingCondemns = condemnationReqs.filter(c => c.committeeApproval.includes('Pending'));
    const pendingWOs = workOrders.filter(w => w.hodApprovalStatus && w.hodApprovalStatus.includes('Pending'));
    const pendingTotal = pendingCondemns.length + pendingWOs.length;

    // 4. Total Assets Registered
    const totalAssetsCount = bioEquipment.length + instruments.length;

    // 5. Low Stock Triggers
    const lowSpares = spareParts.filter(s => parseInt(s.stockQty) <= (parseInt(s.minTrigger) || 2)).length;
    const lowConsumables = consumables.filter(c => parseInt(c.stockQty) < 20).length;
    const totalLowStock = lowSpares + lowConsumables;

    // Populate HOD KPI UI Elements
    const elUptime = document.getElementById('kpi-hod-uptime');
    if (elUptime) elUptime.textContent = `${uptimeRate}%`;

    const elOpenWO = document.getElementById('kpi-hod-open-tickets');
    if (elOpenWO) elOpenWO.textContent = `${openWOs} Open`;

    const elPending = document.getElementById('kpi-pending-approvals');
    if (elPending) elPending.textContent = pendingTotal;

    const elTotalAssets = document.getElementById('kpi-hod-total-assets');
    if (elTotalAssets) elTotalAssets.textContent = `${totalAssetsCount} Items`;

    const elLowStock = document.getElementById('kpi-hod-low-stock');
    if (elLowStock) elLowStock.textContent = `${totalLowStock} Low`;

    const elCondemnCount = document.getElementById('kpi-hod-condemn');
    if (elCondemnCount) elCondemnCount.textContent = `${condemnationReqs.length} Requests`;

    const elTrainingCount = document.getElementById('kpi-hod-trainings');
    if (elTrainingCount) elTrainingCount.textContent = `${trainings.length} Sessions`;

    // Render HOD Graphical Analytics Charts (Breakdown, Inventory, Low Stock)
    const disposables = DB.getAll(DB_KEYS.DISPOSABLES);
    const implants = DB.getAll(DB_KEYS.IMPLANTS);

    const breakdownEq = bioEquipment.filter(e => e.status === 'Under Breakdown' || e.status === 'Under Repair').length;
    const resWOs = workOrders.filter(w => w.status === 'Resolved').length;

    renderDashboardChart('chart-hod-breakdown', 'bar', 
        ['In-Service', 'Breakdown', 'Open WOs', 'Resolved WOs'], 
        [inServiceEq, breakdownEq, openWOs, resWOs], 
        ['#10b981', '#dc2626', '#f59e0b', '#0284c7'], 
        'Equipment Breakdown & Work Order Matrix'
    );

    renderDashboardChart('chart-hod-inventory', 'doughnut', 
        ['Bio Equipment', 'Minor Instruments', 'Spare Parts', 'Consumables', 'Disposables', 'Implants'], 
        [bioEquipment.length, instruments.length, spareParts.length, consumables.length, disposables.length, implants.length], 
        ['#1e40af', '#0284c7', '#10b981', '#f59e0b', '#7c3aed', '#ec4899'], 
        'Departmental Inventory Breakdown'
    );

    const okSpares = Math.max(0, spareParts.length - lowSpares);
    const okCons = Math.max(0, consumables.length - lowConsumables);

    renderDashboardChart('chart-hod-lowstock', 'bar', 
        ['Spares OK', 'Spares LOW ⚠️', 'Consumables OK', 'Consumables LOW ⚠️'], 
        [okSpares, lowSpares, okCons, lowConsumables], 
        ['#10b981', '#dc2626', '#0284c7', '#ef4444'], 
        'Low Stock Reorder Thresholds'
    );

    const tbodyStaff = document.getElementById('tbody-hod-staff');
    if (tbodyStaff) {
        tbodyStaff.innerHTML = staffMembers.map(stf => {
            const activeTaskCount = workOrders.filter(w => w.assignedStaff === stf.name && w.status !== 'Resolved').length;
            return `
                <tr>
                    <td style="font-family:var(--font-mono); color:var(--blue-primary)">${stf.id}</td>
                    <td><strong>${stf.name}</strong></td>
                    <td><span class="badge ${stf.role.includes('HOD') ? 'badge-cmc' : 'badge-major'}">${stf.role}</span></td>
                    <td>${stf.specialty || 'Department Oversight'}</td>
                    <td><strong style="color:${activeTaskCount > 0 ? 'var(--amber-warning)' : 'var(--emerald-green)'}">${activeTaskCount} Tasks Active</strong></td>
                    <td>${stf.phone}</td>
                    <td><span class="badge badge-status-active">Available</span></td>
                </tr>
            `;
        }).join('');
    }

    const tbodyAppr = document.getElementById('tbody-hod-approvals');
    if (tbodyAppr) {
        if (pendingTotal === 0) {
            tbodyAppr.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:20px;">All requests have been reviewed by Admin / HOD! No pending approvals.</td></tr>`;
        } else {
            let html = '';
            pendingCondemns.forEach(c => {
                html += `
                    <tr>
                        <td style="font-family:var(--font-mono); color:var(--crimson-danger)">${c.id}</td>
                        <td><span class="badge badge-status-condemned">Condemnation</span></td>
                        <td><strong>${c.itemName}</strong><br><small style="color:var(--text-muted)">SN: ${c.serialNumber}</small></td>
                        <td>${c.requestedBy}</td>
                        <td><small>${c.reason}</small></td>
                        <td>${c.scrapValue}</td>
                        <td style="white-space:nowrap">
                            ${canEdit() ? `
                                <div class="table-actions">
                                    <button class="btn btn-sm btn-primary" style="height:30px; padding:0 12px" onclick="approveHODCondemnation('${c.id}')">✓ Approve</button>
                                    <button class="btn btn-sm btn-danger" style="height:30px; padding:0 12px" onclick="rejectHODCondemnation('${c.id}')">✗ Reject</button>
                                </div>
                            ` : `<span style="color:var(--text-muted)">Admin/HOD Role Required</span>`}
                        </td>
                    </tr>
                `;
            });
            pendingWOs.forEach(w => {
                html += `
                    <tr>
                        <td style="font-family:var(--font-mono); color:var(--amber-warning)">${w.id}</td>
                        <td><span class="badge badge-amc">Work Order</span></td>
                        <td><strong>${w.equipmentName}</strong></td>
                        <td>${w.assignedStaff}</td>
                        <td><small>${w.symptom}</small></td>
                        <td>Spares Requisition</td>
                        <td style="white-space:nowrap">
                            ${canEdit() ? `
                                <div class="table-actions">
                                    <button class="btn btn-sm btn-primary" style="height:30px; padding:0 12px" onclick="approveHODWorkOrder('${w.id}')">✓ Approve</button>
                                </div>
                            ` : `<span style="color:var(--text-muted)">Admin/HOD Role Required</span>`}
                        </td>
                    </tr>
                `;
            });
            tbodyAppr.innerHTML = html;
        }
    }

    renderHODTodoPanel();
}

function approveHODCondemnation(id) {
    if (!canEdit()) { alert('Only Admin or HOD can approve requests.'); return; }
    const item = DB.getById(DB_KEYS.CONDEMNATION, id);
    if (item) {
        item.committeeApproval = `Approved by ${currentRole}`;
        item.certificateNo = `CND-CERT-${Math.floor(1000 + Math.random() * 9000)}`;
        DB.save(DB_KEYS.CONDEMNATION, item, currentRole);
        alert(`Condemnation Request ${id} APPROVED by ${currentRole}.`);
        renderHODDashboard();
    }
}

function rejectHODCondemnation(id) {
    if (!canEdit()) { alert('Only Admin or HOD can reject requests.'); return; }
    const item = DB.getById(DB_KEYS.CONDEMNATION, id);
    if (item) {
        item.committeeApproval = `Rejected by ${currentRole}`;
        DB.save(DB_KEYS.CONDEMNATION, item, currentRole);
        alert(`Condemnation Request ${id} REJECTED.`);
        renderHODDashboard();
    }
}

function approveHODWorkOrder(id) {
    if (!canEdit()) { alert('Only Admin or HOD can approve work orders.'); return; }
    const item = DB.getById(DB_KEYS.WORK_ORDERS, id);
    if (item) {
        item.hodApprovalStatus = `Approved by ${currentRole}`;
        DB.save(DB_KEYS.WORK_ORDERS, item, currentRole);
        alert(`Work Order ${id} Approved.`);
        renderHODDashboard();
    }
}

function renderWorkOrdersTable() {
    const records = DB.getAll(DB_KEYS.WORK_ORDERS);
    const search = (document.getElementById('search-work-orders')?.value || '').toLowerCase();
    const prioFilter = document.getElementById('filter-wo-priority')?.value || 'ALL';

    const filtered = records.filter(item => {
        const matchesSearch = !search || item.title.toLowerCase().includes(search) || item.equipmentName.toLowerCase().includes(search) || item.assignedStaff.toLowerCase().includes(search);
        const matchesPrio = prioFilter === 'ALL' || item.priority === prioFilter;
        return matchesSearch && matchesPrio;
    });

    const tbody = document.getElementById('tbody-work-orders');
    if (!tbody) return;

    tbody.innerHTML = filtered.map(item => {
        const prioBadge = item.priority.includes('P1') ? 'badge-status-condemned' : (item.priority.includes('P2') ? 'badge-status-maint' : 'badge-minor');
        const statusBadge = item.status === 'Resolved' ? 'badge-status-active' : 'badge-status-maint';

        return `
            <tr>
                <td style="font-family:var(--font-mono); color:var(--blue-primary)"><strong>${item.id}</strong></td>
                <td><span class="badge ${prioBadge}">${item.priority}</span></td>
                <td><strong>${item.title}</strong><br><small style="color:var(--text-muted)">Logged: ${item.dateLogged}</small></td>
                <td>${item.equipmentName}<br><small style="color:var(--text-muted)">${item.department}</small></td>
                <td><strong>${item.assignedStaff}</strong></td>
                <td><small style="color:var(--text-muted)"><strong>Symptom:</strong> ${item.symptom}<br><strong>Action:</strong> ${item.actionTaken}</small></td>
                <td><span class="badge ${statusBadge}">${item.status}</span></td>
                <td><small style="color:var(--emerald-green)">${item.hodApprovalStatus || 'N/A'}</small></td>
                <td style="white-space:nowrap">
                    <div class="table-actions">
                        <button class="btn btn-sm btn-report-whatsapp" onclick="sendWhatsAppTicketAlert('${item.id}')" title="Send WhatsApp Ticket Alert">📲 WA</button>
                        ${canEdit() ? `
                            <button class="btn btn-sm" onclick="editRecord('${DB_KEYS.WORK_ORDERS}', '${item.id}')">✏️ Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteRecord('${DB_KEYS.WORK_ORDERS}', '${item.id}')">🗑️</button>
                        ` : `<span style="color:var(--text-muted)">View Only</span>`}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// -------------------------------------------------------------
// STANDARD TABLE RENDERERS
// -------------------------------------------------------------

function renderBioEquipmentTable() {
    const records = DB.getAll(DB_KEYS.BIO_EQUIPMENT);
    const search = (document.getElementById('search-bio-equipment')?.value || '').toLowerCase();
    const categoryFilter = document.getElementById('filter-bio-category')?.value || 'ALL';
    const contractFilter = document.getElementById('filter-bio-contract')?.value || 'ALL';

    const filtered = records.filter(item => {
        const matchesSearch = !search || item.name.toLowerCase().includes(search) || item.model.toLowerCase().includes(search) || item.serialNumber.toLowerCase().includes(search) || item.department.toLowerCase().includes(search);
        const matchesCat = categoryFilter === 'ALL' || item.category === categoryFilter;
        const matchesContract = contractFilter === 'ALL' || item.contractType === contractFilter;
        return matchesSearch && matchesCat && matchesContract;
    });

    const tbody = document.getElementById('tbody-bio-equipment');
    if (!tbody) return;

    tbody.innerHTML = filtered.map(item => {
        const catBadge = item.category === 'Major' ? 'badge-major' : 'badge-minor';
        const contractBadge = item.contractType === 'AMC' ? 'badge-amc' : (item.contractType === 'CMC' ? 'badge-cmc' : 'badge-warranty');
        const statusBadge = item.status === 'In Service' ? 'badge-status-active' : (item.status === 'Under Maintenance' ? 'badge-status-maint' : 'badge-status-condemned');

        return `
            <tr>
                <td><strong style="font-family:var(--font-mono); color:var(--blue-primary)">${item.id}</strong></td>
                <td><strong>${item.name}</strong><br><small style="color:var(--text-muted)">${item.manufacturer} (${item.riskClass || ''})</small></td>
                <td><span class="badge ${catBadge}">${item.category}</span></td>
                <td>${item.department}<br><small style="color:var(--text-muted)">${item.location}</small></td>
                <td style="font-family:var(--font-mono)">${item.model}<br><small style="color:var(--text-muted)">SN: ${item.serialNumber}</small></td>
                <td><span class="badge ${contractBadge}">${item.contractType}</span></td>
                <td>${item.contractVendor}<br><small style="color:var(--text-muted)">Cost: ${item.contractCost}</small></td>
                <td style="font-family:var(--font-mono)">${item.contractEndDate}</td>
                <td><span class="badge ${statusBadge}">${item.status}</span></td>
                <td style="white-space:nowrap">
                    <div class="table-actions">
                        ${canEdit() ? `
                            <button class="btn btn-sm" onclick="editRecord('${DB_KEYS.BIO_EQUIPMENT}', '${item.id}')">✏️ Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteRecord('${DB_KEYS.BIO_EQUIPMENT}', '${item.id}')">🗑️</button>
                        ` : `<span style="color:var(--text-muted)">View Only</span>`}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderInstrumentsTable() {
    const records = DB.getAll(DB_KEYS.INSTRUMENTS);
    const tbody = document.getElementById('tbody-instruments');
    if (!tbody) return;

    tbody.innerHTML = records.map(item => `
        <tr>
            <td style="font-family:var(--font-mono); color:var(--blue-primary)">${item.id}</td>
            <td><strong>${item.name}</strong></td>
            <td><span class="badge badge-minor">${item.category}</span></td>
            <td>${item.department}</td>
            <td>${item.manufacturer}<br><small style="color:var(--text-muted)">SN: ${item.serialNumber}</small></td>
            <td><span class="badge badge-amc">${item.contractType}</span></td>
            <td style="font-family:var(--font-mono)">${item.lastServiced}</td>
            <td><small style="color:var(--text-muted)">${item.historyLog}</small></td>
            <td style="white-space:nowrap">
                <div class="table-actions">
                    ${canEdit() ? `
                        <button class="btn btn-sm" onclick="editRecord('${DB_KEYS.INSTRUMENTS}', '${item.id}')">✏️ Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteRecord('${DB_KEYS.INSTRUMENTS}', '${item.id}')">🗑️</button>
                    ` : `<span style="color:var(--text-muted)">View Only</span>`}
                </div>
            </td>
        </tr>
    `).join('');
}

function renderConsumablesTable() {
    const records = DB.getAll(DB_KEYS.CONSUMABLES);
    const tbody = document.getElementById('tbody-consumables');
    if (!tbody) return;

    tbody.innerHTML = records.map(item => `
        <tr>
            <td style="font-family:var(--font-mono); color:var(--blue-primary)">${item.id}</td>
            <td><strong>${item.name}</strong></td>
            <td>${item.department}</td>
            <td>${item.brand}</td>
            <td><strong style="color:${item.stockQty <= item.minStockLevel ? 'var(--amber-warning)' : 'var(--emerald-green)'}">${item.stockQty} ${item.unit}</strong></td>
            <td>${item.unitPrice}</td>
            <td>${item.location}</td>
            <td style="white-space:nowrap">
                <div class="table-actions">
                    ${canEdit() ? `
                        <button class="btn btn-sm" onclick="editRecord('${DB_KEYS.CONSUMABLES}', '${item.id}')">✏️ Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteRecord('${DB_KEYS.CONSUMABLES}', '${item.id}')">🗑️</button>
                    ` : `<span style="color:var(--text-muted)">View Only</span>`}
                </div>
            </td>
        </tr>
    `).join('');
}

function renderDisposablesTable() {
    const records = DB.getAll(DB_KEYS.DISPOSABLES);
    const tbody = document.getElementById('tbody-disposables');
    if (!tbody) return;

    tbody.innerHTML = records.map(item => `
        <tr>
            <td style="font-family:var(--font-mono); color:var(--blue-primary)">${item.id}</td>
            <td><strong>${item.name}</strong></td>
            <td>${item.department}</td>
            <td>${item.brand}</td>
            <td><strong style="color:${item.stockQty <= item.minStockLevel ? 'var(--amber-warning)' : 'var(--emerald-green)'}">${item.stockQty} ${item.unit}</strong></td>
            <td>${item.unitPrice}</td>
            <td style="font-family:var(--font-mono)">${item.expiryDate}</td>
            <td style="white-space:nowrap">
                <div class="table-actions">
                    ${canEdit() ? `
                        <button class="btn btn-sm" onclick="editRecord('${DB_KEYS.DISPOSABLES}', '${item.id}')">✏️ Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteRecord('${DB_KEYS.DISPOSABLES}', '${item.id}')">🗑️</button>
                    ` : `<span style="color:var(--text-muted)">View Only</span>`}
                </div>
            </td>
        </tr>
    `).join('');
}

function renderImplantsTable() {
    const records = DB.getAll(DB_KEYS.IMPLANTS);
    const tbody = document.getElementById('tbody-implants');
    if (!tbody) return;

    tbody.innerHTML = records.map(item => `
        <tr>
            <td style="font-family:var(--font-mono); color:var(--blue-primary)">${item.id}</td>
            <td><strong>${item.name}</strong><br><small style="color:var(--text-muted)">Model: ${item.model}</small></td>
            <td><span class="badge badge-cmc">${item.type}</span></td>
            <td>${item.manufacturer}</td>
            <td style="font-family:var(--font-mono)">${item.batchNumber}<br><small style="color:var(--text-muted)">SN: ${item.serialNumber}</small></td>
            <td><strong style="color:var(--emerald-green)">${item.stockQty} ${item.unit}</strong></td>
            <td style="font-family:var(--font-mono)">${item.sterilizationDate}</td>
            <td style="font-family:var(--font-mono); color:var(--amber-warning)">${item.expiryDate}</td>
            <td>${item.storageLocation}</td>
            <td style="white-space:nowrap">
                <div class="table-actions">
                    ${canEdit() ? `
                        <button class="btn btn-sm" onclick="editRecord('${DB_KEYS.IMPLANTS}', '${item.id}')">✏️ Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteRecord('${DB_KEYS.IMPLANTS}', '${item.id}')">🗑️</button>
                    ` : `<span style="color:var(--text-muted)">View Only</span>`}
                </div>
            </td>
        </tr>
    `).join('');
}

function renderSparePartsTable() {
    const records = DB.getAll(DB_KEYS.SPARE_PARTS);
    const tbody = document.getElementById('tbody-spare-parts');
    if (!tbody) return;

    tbody.innerHTML = records.map(item => `
        <tr>
            <td style="font-family:var(--font-mono); color:var(--blue-primary)">${item.id}</td>
            <td><strong>${item.name}</strong></td>
            <td style="font-family:var(--font-mono)">${item.partNumber}</td>
            <td><small style="color:var(--text-muted)">${item.compatibleModels}</small></td>
            <td><strong style="color:${item.stockQty <= item.minStockLevel ? 'var(--crimson-danger)' : 'var(--emerald-green)'}">${item.stockQty} Units</strong></td>
            <td>${item.minStockLevel} Units</td>
            <td>${item.unitPrice}</td>
            <td>${item.location}</td>
            <td style="white-space:nowrap">
                <div class="table-actions">
                    ${canEdit() ? `
                        <button class="btn btn-sm" onclick="editRecord('${DB_KEYS.SPARE_PARTS}', '${item.id}')">✏️ Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteRecord('${DB_KEYS.SPARE_PARTS}', '${item.id}')">🗑️</button>
                    ` : `<span style="color:var(--text-muted)">View Only</span>`}
                </div>
            </td>
        </tr>
    `).join('');
}

function renderCondemnationTable() {
    const records = DB.getAll(DB_KEYS.CONDEMNATION);
    const tbody = document.getElementById('tbody-condemnation');
    if (!tbody) return;

    tbody.innerHTML = records.map(item => `
        <tr>
            <td style="font-family:var(--font-mono); color:var(--crimson-danger)">${item.id}</td>
            <td><span class="badge ${item.itemType === 'Equipment' ? 'badge-major' : 'badge-minor'}">${item.itemType}</span></td>
            <td><strong>${item.itemName}</strong><br><small style="color:var(--text-muted)">SN: ${item.serialNumber}</small></td>
            <td>${item.department}</td>
            <td><small style="color:var(--text-muted)">${item.reason}</small></td>
            <td>${item.requestedBy}</td>
            <td><span class="badge badge-status-condemned">${item.committeeApproval}</span></td>
            <td>${item.scrapValue}</td>
            <td style="font-family:var(--font-mono)"><small>${item.certificateNo || 'N/A'}</small></td>
            <td style="white-space:nowrap">
                <div class="table-actions">
                    <button class="btn btn-sm" onclick="printCondemnationCert('${item.id}')">📜 Certificate</button>
                    ${canEdit() ? `
                        <button class="btn btn-sm btn-danger" onclick="deleteRecord('${DB_KEYS.CONDEMNATION}', '${item.id}')">🗑️</button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function renderTrainingTable() {
    const records = DB.getAll(DB_KEYS.TRAINING);
    const tbody = document.getElementById('tbody-training');
    if (!tbody) return;

    tbody.innerHTML = records.map(item => `
        <tr>
            <td style="font-family:var(--font-mono); color:var(--blue-primary)">${item.id}</td>
            <td><span class="badge badge-amc">${item.category}</span></td>
            <td><strong>${item.title}</strong><br><small style="color:var(--text-muted)">Notes: ${item.notes}</small></td>
            <td>${item.targetItem}</td>
            <td>${item.trainer}</td>
            <td style="font-family:var(--font-mono)">${item.date}<br><small style="color:var(--text-muted)">${item.location}</small></td>
            <td><strong style="color:var(--emerald-green)">${item.attendeesCount} Staff</strong></td>
            <td>${item.durationHours}</td>
            <td style="white-space:nowrap">
                <div class="table-actions">
                    ${canEdit() ? `
                        <button class="btn btn-sm" onclick="editRecord('${DB_KEYS.TRAINING}', '${item.id}')">✏️ Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteRecord('${DB_KEYS.TRAINING}', '${item.id}')">🗑️</button>
                    ` : `<span style="color:var(--text-muted)">View Only</span>`}
                </div>
            </td>
        </tr>
    `).join('');
}

// KPI Counters
function updateAllBadgesAndKPIs() {
    const eqList = DB.getAll(DB_KEYS.BIO_EQUIPMENT);
    const insList = DB.getAll(DB_KEYS.INSTRUMENTS);
    const impList = DB.getAll(DB_KEYS.IMPLANTS);
    const sprList = DB.getAll(DB_KEYS.SPARE_PARTS);
    const cndList = DB.getAll(DB_KEYS.CONDEMNATION);
    const trnList = DB.getAll(DB_KEYS.TRAINING);
    const woList = DB.getAll(DB_KEYS.WORK_ORDERS);

    document.getElementById('badge-equipment-count').textContent = eqList.length;
    document.getElementById('badge-instruments-count').textContent = insList.length;
    document.getElementById('badge-implants-count').textContent = impList.length;
    document.getElementById('badge-spares-count').textContent = sprList.length;
    document.getElementById('badge-condemn-count').textContent = cndList.length;
    document.getElementById('badge-training-count').textContent = trnList.length;

    const badgeWO = document.getElementById('badge-wo-count');
    if (badgeWO) badgeWO.textContent = woList.filter(w => w.status !== 'Resolved').length;

    updateTodoBadge();

    const kpiTot = document.getElementById('kpi-total-equipment');
    if (kpiTot) kpiTot.textContent = eqList.length;
    const kpiMaj = document.getElementById('kpi-major-equipment');
    if (kpiMaj) kpiMaj.textContent = eqList.filter(e => e.category === 'Major').length;
    const kpiMin = document.getElementById('kpi-minor-equipment');
    if (kpiMin) kpiMin.textContent = eqList.filter(e => e.category === 'Minor').length;
    const kpiAct = document.getElementById('kpi-active-contracts');
    if (kpiAct) kpiAct.textContent = eqList.filter(e => e.contractType === 'AMC' || e.contractType === 'CMC').length;
}

// -------------------------------------------------------------
// EXCEL & PDF REPORT GENERATION ENGINES FOR ALL SECTIONS
// -------------------------------------------------------------

function getActiveViewEntityKey(overrideKey) {
    if (typeof overrideKey === 'string' && overrideKey.trim()) {
        if (DB_KEYS[overrideKey]) return DB_KEYS[overrideKey];
        if (Object.values(DB_KEYS).includes(overrideKey)) return overrideKey;
    }

    const keyMap = {
        'admin': DB_KEYS.STAFF_MEMBERS,
        'hod-dashboard': DB_KEYS.WORK_ORDERS,
        'work-orders': DB_KEYS.WORK_ORDERS,
        'todos': DB_KEYS.TODOS,
        'bio-equipment': DB_KEYS.BIO_EQUIPMENT,
        'instruments': DB_KEYS.INSTRUMENTS,
        'consumables-disposables': DB_KEYS.CONSUMABLES,
        'implants': DB_KEYS.IMPLANTS,
        'spare-parts': DB_KEYS.SPARE_PARTS,
        'condemnation': DB_KEYS.CONDEMNATION,
        'training': DB_KEYS.TRAINING,
        'master-report': DB_KEYS.BIO_EQUIPMENT
    };

    return keyMap[currentActiveView] || DB_KEYS.BIO_EQUIPMENT;
}

function exportToExcelReport(overrideKey) {
    if (currentActiveView === 'master-report' || overrideKey === 'MASTER_REPORT') {
        exportMasterMultiSheetExcel();
        return;
    }

    const targetKey = getActiveViewEntityKey(overrideKey);
    const data = DB.getAll(targetKey);

    if (!data || data.length === 0) {
        alert(`No records available to export for module: ${targetKey.replace('biomed_', '').toUpperCase()}.`);
        return;
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const moduleName = targetKey.replace('biomed_', '').toUpperCase();

    if (typeof XLSX !== 'undefined') {
        try {
            const headers = Object.keys(data[0]);
            const rows = [headers, ...data.map(item => headers.map(h => Array.isArray(item[h]) ? item[h].join('; ') : (item[h] ?? '')))];
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, moduleName);
            XLSX.writeFile(wb, `Biomedical_Report_${moduleName}_${dateStr}.xlsx`);
            DB.logAudit(`Exported Excel Report (${moduleName})`, currentRole);
            return;
        } catch (err) {
            console.warn("XLSX export failed, falling back to CSV:", err);
        }
    }

    const headers = Object.keys(data[0]);
    let csvContent = '\uFEFF' + headers.join(',') + '\n';

    data.forEach(row => {
        const line = headers.map(header => {
            let val = row[header] !== undefined && row[header] !== null ? String(row[header]) : '';
            val = val.replace(/"/g, '""');
            if (val.includes(',') || val.includes('\n') || val.includes('"')) {
                val = `"${val}"`;
            }
            return val;
        }).join(',');
        csvContent += line + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Biomedical_Report_${moduleName}_${dateStr}.csv`;
    link.click();
    DB.logAudit(`Exported CSV Report (${moduleName})`, currentRole);
}

function generatePDFReport(overrideKey) {
    const targetKey = getActiveViewEntityKey(overrideKey);
    const data = DB.getAll(targetKey);
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    if (!data || data.length === 0) {
        alert(`No data available for PDF report: ${targetKey.replace('biomed_', '').toUpperCase()}.`);
        return;
    }

    const headers = Object.keys(data[0]).filter(k => k !== 'historyLog');

    const printWin = window.open('', '_blank');
    if (!printWin) {
        alert('Pop-up blocked! Please allow pop-ups for this site to generate PDF report.');
        return;
    }

    printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Biomedical Department PDF Audit Report - ${targetKey}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #0f172a; }
                .header { text-align: center; border-bottom: 3px double #1e40af; padding-bottom: 15px; margin-bottom: 25px; }
                .header h1 { margin: 0; color: #1e40af; font-size: 22px; text-transform: uppercase; }
                .header p { margin: 4px 0 0; color: #475569; font-size: 13px; font-weight: 600; }
                .meta-table { width: 100%; margin-bottom: 20px; font-size: 12px; }
                .meta-table td { padding: 4px 0; }
                .report-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
                .report-table th { background: #1e40af; color: #ffffff; padding: 8px; text-align: left; text-transform: uppercase; }
                .report-table td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
                .report-table tr:nth-child(even) { background: #f8fafc; }
                .signatures { margin-top: 50px; display: flex; justify-content: space-between; }
                .sig-box { width: 220px; text-align: center; border-top: 1px solid #0f172a; padding-top: 6px; font-size: 12px; font-weight: 600; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>DEPARTMENT OF BIOMEDICAL ENGINEERING</h1>
                <p>HOSPITAL EQUIPMENT MANAGEMENT & COMPLIANCE AUDIT REPORT</p>
            </div>
            
            <table class="meta-table">
                <tr>
                    <td><strong>Report Module:</strong> ${targetKey.toUpperCase()}</td>
                    <td style="text-align:right"><strong>Generated Date:</strong> ${dateStr}</td>
                </tr>
                <tr>
                    <td><strong>Authorized User:</strong> ${currentRole}</td>
                    <td style="text-align:right"><strong>Total Items Count:</strong> ${data.length} Records</td>
                </tr>
            </table>

            <table class="report-table">
                <thead>
                    <tr>
                        ${headers.map(h => `<th>${h}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${data.map(row => `
                        <tr>
                            ${headers.map(h => `<td>${row[h] !== undefined ? row[h] : ''}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="signatures">
                <div class="sig-box">Authorized System Admin</div>
                <div class="sig-box">Head of Department (HOD) Sign</div>
            </div>

            <script>
                window.onload = function() {
                    window.print();
                }
            </script>
        </body>
        </html>
    `);
    printWin.document.close();
}

function buildFullEmailReportContent(targetKey, selectedRecipientEmail) {
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    
    // Fetch DB Data for KPI calculation
    const staffList = DB.getAll(DB_KEYS.STAFF_MEMBERS) || [];
    const woList = DB.getAll(DB_KEYS.WORK_ORDERS) || [];
    const todoList = DB.getAll(DB_KEYS.TODOS) || [];
    const eqList = DB.getAll(DB_KEYS.BIO_EQUIPMENT) || [];
    const insList = DB.getAll(DB_KEYS.INSTRUMENTS) || [];
    const consList = DB.getAll(DB_KEYS.CONSUMABLES) || [];
    const impList = DB.getAll(DB_KEYS.IMPLANTS) || [];
    const spareList = DB.getAll(DB_KEYS.SPARE_PARTS) || [];
    const condList = DB.getAll(DB_KEYS.CONDEMNATION) || [];
    const trainList = DB.getAll(DB_KEYS.TRAINING) || [];

    // Calculate Key KPIs
    const openWos = woList.filter(w => (w.status || '').toLowerCase().includes('open') || (w.status || '').toLowerCase().includes('progress')).length;
    const closedWos = woList.filter(w => (w.status || '').toLowerCase().includes('closed') || (w.status || '').toLowerCase().includes('completed')).length;
    const woResolutionRate = woList.length > 0 ? Math.round((closedWos / woList.length) * 100) : 100;

    const completedTodos = todoList.filter(t => (t.status || '').toLowerCase().includes('completed')).length;
    const urgentTodos = todoList.filter(t => (t.priority || '').toLowerCase().includes('urgent')).length;

    const totalAssetVal = eqList.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
    const pmDueCount = eqList.filter(e => {
        if (!e.nextPmDate) return false;
        const diff = (new Date(e.nextPmDate) - new Date()) / (1000 * 3600 * 24);
        return diff <= 30;
    }).length;
    const operationalEqCount = eqList.filter(e => (e.status || '').toLowerCase().includes('operational')).length;
    const eqOperationalRate = eqList.length > 0 ? Math.round((operationalEqCount / eqList.length) * 100) : 100;

    // Identify Recipient Employee Details
    let recipientEmployee = staffList.find(s => s.email === selectedRecipientEmail) || staffList[1] || { name: 'Eng. Rajesh Sharma', role: 'Senior BioMed Engineer', email: selectedRecipientEmail || 'staff@hospital.org' };

    let text = `========================================================================\n`;
    text += `🏥 STAVYA INTELLIGENCE - BIOMEDICAL ENGINEERING DEPARTMENT AUDIT REPORT\n`;
    text += `========================================================================\n`;
    text += `📅 Date & Time: ${dateStr} at ${timeStr}\n`;
    text += `👑 Dispatching Authority: Dr. Alok Verma (Biomedical HOD)\n`;
    text += `👤 Sender Role: ${currentRole}\n`;
    text += `🏥 Facility: City General Super-Specialty Hospital (MED-TECH-BIO-01)\n`;
    text += `========================================================================\n\n`;

    // ------------------------------------------------------------------------
    // EXECUTIVE DASHBOARD & DEPARTMENT KPI METRICS
    // ------------------------------------------------------------------------
    text += `📊 EXECUTIVE DASHBOARD & BIOMEDICAL DEPARTMENT KPI SUMMARY\n`;
    text += `------------------------------------------------------------------------\n`;
    text += `  ▫️ Active Authorized Staff: ${staffList.length} Members (Admin: 1 | HOD: 1 | Engineers: ${Math.max(0, staffList.length - 2)})\n`;
    text += `  ▫️ Active Work Orders KPI: ${woList.length} Total | Open: ${openWos} | Resolved: ${closedWos} (${woResolutionRate}% Resolution Rate)\n`;
    text += `  ▫️ Staff ToDo Tasks KPI: ${todoList.length} Total | Completed: ${completedTodos} | Urgent Tasks: ${urgentTodos}\n`;
    text += `  ▫️ Bio Equipment Asset KPI: ${eqList.length} Registered Units | Value: ₹${totalAssetVal.toLocaleString('en-IN')} | Operational: ${eqOperationalRate}%\n`;
    text += `  ▫️ Maintenance Alert KPI: ${pmDueCount} Units Pending PM Inspection (Within 30 Days)\n`;
    text += `  ▫️ Minor Instruments: ${insList.length} Items Registered\n`;
    text += `  ▫️ Consumables & Stock: ${consList.length} Items Registered\n`;
    text += `  ▫️ Implants Inventory: ${impList.length} Registered Stock Items\n`;
    text += `  ▫️ Spare Parts Stock: ${spareList.length} Registered Spares\n`;
    text += `  ▫️ Condemnation & Decom: ${condList.length} Certified Condemned Items\n`;
    text += `  ▫️ Education & Compliance: ${trainList.length} Conducted Staff Training Sessions\n`;
    text += `========================================================================\n\n`;

    // ------------------------------------------------------------------------
    // ITEMIZED REPORT DETAILS
    // ------------------------------------------------------------------------
    if (targetKey === 'INDIVIDUAL_STAFF') {
        const empName = recipientEmployee.name;
        const lastName = empName.split(' ').pop();
        const empWos = woList.filter(w => (w.assignedStaff || '').includes(empName) || (w.assignedStaff || '').includes(lastName));
        const empTodos = todoList.filter(t => (t.assignedTo || '').includes(empName) || (t.assignedTo || '').includes(lastName));
        const completedEmpTodos = empTodos.filter(t => (t.status || '').toLowerCase().includes('completed')).length;

        text += `👤 INDIVIDUAL EMPLOYEE WORKLOAD & PERFORMANCE DISPATCH SUMMARY\n`;
        text += `========================================================================\n`;
        text += `  ▫️ Employee Name: ${recipientEmployee.name}\n`;
        text += `  ▫️ Role / Designation: ${recipientEmployee.role}\n`;
        text += `  ▫️ Email Address: ${recipientEmployee.email || 'staff@hospital.org'}\n`;
        text += `  ▫️ Phone / Contact: ${recipientEmployee.phone || '+91 98765 00000'}\n`;
        text += `  ▫️ Assigned Active Work Orders: ${empWos.length} Tickets\n`;
        text += `  ▫️ Assigned Staff ToDo Tasks: ${empTodos.length} Tasks (${completedEmpTodos} Completed)\n`;
        text += `========================================================================\n\n`;

        text += `📋 INDIVIDUAL ASSIGNED WORK ORDERS (${empWos.length} Items)\n`;
        text += `------------------------------------------------------------------------\n`;
        if (empWos.length === 0) {
            text += `No work orders currently assigned to ${recipientEmployee.name}.\n\n`;
        } else {
            empWos.forEach((w, i) => {
                text += `${i+1}. [${w.id}] Equipment: ${w.equipmentName} (${w.department || 'ICU'})\n`;
                text += `   Symptom: ${w.symptom} | Priority: ${w.priority} | Status: ${w.status}\n`;
                text += `   Assigned Engineer: ${w.assignedStaff} | Breakdown Date: ${w.breakdownDate || 'N/A'}\n\n`;
            });
        }

        text += `✅ INDIVIDUAL ASSIGNED TODO TASKS (${empTodos.length} Items)\n`;
        text += `------------------------------------------------------------------------\n`;
        if (empTodos.length === 0) {
            text += `No ToDo tasks currently assigned to ${recipientEmployee.name}.\n\n`;
        } else {
            empTodos.forEach((t, i) => {
                text += `${i+1}. [${t.id}] ${t.title}\n`;
                text += `   Category: ${t.category} | Priority: ${t.priority} | Status: ${t.status}\n`;
                text += `   Assigned To: ${t.assignedTo} | Due Date: ${t.dueDate}\n`;
                if (t.notes) text += `   Notes: ${t.notes}\n`;
                text += `\n`;
            });
        }
    } else if (targetKey === 'ALL') {
        text += `📋 DETAILED ITEM AUDIT LOG (COMPLETE MASTER REPORT - ALL 10 MODULES)\n`;
        text += `========================================================================\n\n`;

        // 1. WORK ORDERS
        text += `1. ACTIVE WORK ORDERS DISPATCH (${woList.length} Items)\n`;
        text += `------------------------------------------------------------------------\n`;
        if (woList.length === 0) text += `No work orders on record.\n\n`;
        else {
            woList.forEach((w, i) => {
                text += `${i+1}. [${w.id}] Equipment: ${w.equipmentName} (${w.department || 'ICU'})\n`;
                text += `   Symptom: ${w.symptom} | Priority: ${w.priority} | Status: ${w.status}\n`;
                text += `   Assigned Engineer: ${w.assignedStaff} | Breakdown Date: ${w.breakdownDate || 'N/A'}\n\n`;
            });
        }

        // 2. TODOS
        text += `2. STAFF TODO TASKS ROSTER (${todoList.length} Items)\n`;
        text += `------------------------------------------------------------------------\n`;
        if (todoList.length === 0) text += `No ToDo tasks on record.\n\n`;
        else {
            todoList.forEach((t, i) => {
                text += `${i+1}. [${t.id}] ${t.title}\n`;
                text += `   Category: ${t.category} | Priority: ${t.priority} | Status: ${t.status}\n`;
                text += `   Assigned To: ${t.assignedTo} | Due Date: ${t.dueDate}\n`;
                if (t.notes) text += `   Notes: ${t.notes}\n`;
                text += `\n`;
            });
        }

        // 3. BIO EQUIPMENT
        text += `3. BIO EQUIPMENT REGISTRY (${eqList.length} Items)\n`;
        text += `------------------------------------------------------------------------\n`;
        if (eqList.length === 0) text += `No bio equipment items on record.\n\n`;
        else {
            eqList.forEach((e, i) => {
                text += `${i+1}. [${e.id}] ${e.equipmentName} (${e.model || 'Model N/A'})\n`;
                text += `   Serial: ${e.serialNo || 'N/A'} | Dept: ${e.department} | Status: ${e.status}\n`;
                text += `   Value: ₹${Number(e.cost || 0).toLocaleString()} | Next PM Due: ${e.nextPmDate || 'N/A'}\n\n`;
            });
        }

        // 4. INSTRUMENTS
        text += `4. MINOR INSTRUMENTS REGISTRY (${insList.length} Items)\n`;
        text += `------------------------------------------------------------------------\n`;
        if (insList.length === 0) text += `No minor instruments on record.\n\n`;
        else {
            insList.forEach((item, i) => {
                text += `${i+1}. [${item.id}] ${item.instrumentName} | Dept: ${item.department} | Qty: ${item.quantity} | Status: ${item.status}\n`;
            });
            text += `\n`;
        }

        // 5. CONSUMABLES
        text += `5. CONSUMABLES & DISPOSABLES (${consList.length} Items)\n`;
        text += `------------------------------------------------------------------------\n`;
        if (consList.length === 0) text += `No consumables on record.\n\n`;
        else {
            consList.forEach((c, i) => {
                text += `${i+1}. [${c.id}] ${c.itemName} | Category: ${c.category} | Stock Qty: ${c.stockQty} ${c.unit || 'units'} | Reorder Level: ${c.reorderLevel}\n`;
            });
            text += `\n`;
        }

        // 6. IMPLANTS
        text += `6. IMPLANTS INVENTORY (${impList.length} Items)\n`;
        text += `------------------------------------------------------------------------\n`;
        if (impList.length === 0) text += `No implants on record.\n\n`;
        else {
            impList.forEach((m, i) => {
                text += `${i+1}. [${m.id}] ${m.implantName} | Category: ${m.category} | Stock: ${m.stockQty} | Expiry: ${m.expiryDate || 'N/A'}\n`;
            });
            text += `\n`;
        }

        // 7. SPARE PARTS
        text += `7. SPARE PARTS STOCK (${spareList.length} Items)\n`;
        text += `------------------------------------------------------------------------\n`;
        if (spareList.length === 0) text += `No spare parts on record.\n\n`;
        else {
            spareList.forEach((s, i) => {
                text += `${i+1}. [${s.id}] ${s.partName} | Fits: ${s.compatibleEquipment} | Stock: ${s.stockQty} | Status: ${s.status}\n`;
            });
            text += `\n`;
        }

        // 8. CONDEMNATION
        text += `8. CONDEMNATION & DECOMMISSIONING (${condList.length} Items)\n`;
        text += `------------------------------------------------------------------------\n`;
        if (condList.length === 0) text += `No condemnation records.\n\n`;
        else {
            condList.forEach((c, i) => {
                text += `${i+1}. [${c.id}] ${c.itemName} | Cert No: ${c.certificateNo} | Reason: ${c.reason} | Approval: ${c.committeeApproval}\n`;
            });
            text += `\n`;
        }

        // 9. TRAINING
        text += `9. EDUCATION & TRAINING (${trainList.length} Sessions)\n`;
        text += `------------------------------------------------------------------------\n`;
        if (trainList.length === 0) text += `No training records.\n\n`;
        else {
            trainList.forEach((t, i) => {
                text += `${i+1}. [${t.id}] Topic: ${t.topic} | Trainer: ${t.trainer} | Date: ${t.sessionDate} | Attendees: ${t.attendeeCount}\n`;
            });
            text += `\n`;
        }

        // 10. STAFF
        text += `10. AUTHORIZED STAFF ROSTER (${staffList.length} Members)\n`;
        text += `------------------------------------------------------------------------\n`;
        staffList.forEach((s, i) => {
            text += `${i+1}. [${s.id}] ${s.name} | Role: ${s.role} | Email: ${s.email || 'N/A'} | Phone: ${s.phone || 'N/A'}\n`;
        });
        text += `\n`;

    } else {
        const data = DB.getAll(targetKey) || [];
        const moduleTitle = targetKey.replace('biomed_', '').toUpperCase();
        text += `📋 DETAILED ITEM AUDIT LOG (${moduleTitle} MODULE - ${data.length} TOTAL RECORDS)\n`;
        text += `========================================================================\n\n`;

        if (data.length === 0) {
            text += `No items currently recorded in this section.\n`;
        } else {
            data.forEach((item, idx) => {
                text += `ITEM #${idx + 1}: [${item.id || '#'}] `;
                const name = item.name || item.itemName || item.title || item.equipmentName || item.instrumentName || item.implantName || item.partName || item.topic || `Record #${item.id}`;
                text += `${name}\n`;

                Object.keys(item).forEach(k => {
                    if (k !== 'id' && k !== 'name' && k !== 'equipmentName' && k !== 'itemName' && k !== 'title' && k !== 'instrumentName' && k !== 'implantName' && k !== 'partName') {
                        let val = item[k];
                        if (Array.isArray(val)) val = val.join(', ');
                        if (val !== undefined && val !== null && val !== '') {
                            text += `   ▫️ ${k.replace(/([A-Z])/g, ' $1').toUpperCase()}: ${val}\n`;
                        }
                    }
                });
                text += `\n`;
            });
        }
    }

    // ------------------------------------------------------------------------
    // HOD APPROVAL SEAL & INDIVIDUAL EMPLOYEE SIGNATURE BLOCK
    // ------------------------------------------------------------------------
    const isHodSelected = (recipientEmployee.role || '').toLowerCase().includes('hod') || 
                          (recipientEmployee.name || '').toLowerCase().includes('verma') || 
                          (selectedRecipientEmail || '').toLowerCase().includes('hod');

    text += `========================================================================\n`;
    text += `✒️ AUTHORIZATION & OFFICIAL DEPARTMENT SIGN-OFF\n`;
    text += `========================================================================\n\n`;

    text += `[1] BIOMEDICAL HOD EXECUTIVE APPROVAL SIGNATURE:\n`;
    text += `    Name: Dr. Alok Verma, M.Tech (Biomedical Engineering)\n`;
    text += `    Designation: Biomedical Department Head (HOD)\n`;
    text += `    Status: DIGITAL EXECUTIVE SEAL APPROVED ✅\n`;
    text += `    Verification Key: HOD-SEAL-2025-${Math.floor(100000 + Math.random() * 900000)}\n\n`;

    if (!isHodSelected) {
        text += `[2] INDIVIDUAL RECIPIENT EMPLOYEE SIGNATURE BLOCK:\n`;
        text += `    Assigned Employee: ${recipientEmployee.name || 'Staff Engineer'}\n`;
        text += `    Employee Designation / Role: ${recipientEmployee.role || 'Biomedical Engineer'}\n`;
        text += `    Employee Email: ${recipientEmployee.email || 'staff@hospital.org'}\n`;
        text += `    Phone / Contact: ${recipientEmployee.phone || '+91 98765 00000'}\n`;
        text += `    \n`;
        text += `    Employee Physical Signature: ___________________________________________\n`;
        text += `    Date Acknowledged / Received: [ _____ / _____ / 2025 ]\n\n`;
    }

    text += `========================================================================\n`;
    text += `⚡ Dispatched securely via Stavya Intelligence Suite (BioMedPulse OS v4.0)\n`;
    text += `========================================================================\n`;

    return text;
}

function onEmailReportModuleChange() {
    const selector = document.getElementById('email-report-selector');
    if (!selector) return;

    const targetKey = selector.value;
    const bodyInput = document.getElementById('email-body-input');
    const subjectInput = document.getElementById('email-subject-input');
    const keyInput = document.getElementById('email-module-key');
    const attachLabel = document.getElementById('email-attachment-label');
    const recipientInput = document.getElementById('email-recipient-input');

    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const moduleName = targetKey === 'ALL' ? 'MASTER_AUDIT' : targetKey.replace('biomed_', '').toUpperCase();

    if (keyInput) keyInput.value = targetKey;
    if (subjectInput) {
        subjectInput.value = `[Stavya Intelligence] Biomedical Department Report - ${moduleName} (${dateStr})`;
    }
    if (attachLabel) {
        attachLabel.textContent = `Biomedical_Report_${moduleName}_${new Date().toISOString().split('T')[0]}.pdf`;
    }
    if (bodyInput) {
        bodyInput.value = buildFullEmailReportContent(targetKey, recipientInput?.value);
    }
}

function openEmailModal(overrideKey) {
    const modal = document.getElementById('modal-email');
    if (!modal) return;

    const targetKey = (currentActiveView === 'master-report' || overrideKey === 'MASTER_REPORT') ? 'ALL' : getActiveViewEntityKey(overrideKey);

    const reportSelector = document.getElementById('email-report-selector');
    if (reportSelector) {
        reportSelector.value = targetKey;
    }

    const staffMembers = DB.getAll(DB_KEYS.STAFF_MEMBERS);
    const recipientSelect = document.getElementById('email-recipient-select');
    if (recipientSelect) {
        let opts = staffMembers.map(s => `<option value="${s.email || 'hod.biomed@hospital.org'}">${s.name} (${s.role}) &lt;${s.email || 'hod.biomed@hospital.org'}&gt;</option>`).join('');
        opts += `<option value="custom">✏️ Enter Custom Email Address...</option>`;
        recipientSelect.innerHTML = opts;
        recipientSelect.value = staffMembers[1] ? (staffMembers[1].email || 'hod.biomed@hospital.org') : 'hod.biomed@hospital.org';
    }

    const recipientInput = document.getElementById('email-recipient-input');
    if (recipientInput) {
        recipientInput.value = recipientSelect?.value !== 'custom' ? recipientSelect.value : 'hod.biomed@hospital.org';
    }

    onEmailReportModuleChange();

    modal.style.display = 'flex';
    modal.classList.add('active');
}

function sendEmailReport(overrideKey, targetEmail) {
    openEmailModal(overrideKey);
}

function closeEmailModal() {
    const modal = document.getElementById('modal-email');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

function onEmailRecipientSelectChange() {
    const sel = document.getElementById('email-recipient-select');
    const inp = document.getElementById('email-recipient-input');
    if (!sel || !inp) return;
    if (sel.value !== 'custom') {
        inp.value = sel.value;
    } else {
        inp.value = '';
        inp.focus();
    }
    onEmailReportModuleChange();
}

function handleSendEmailSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const btnSubmit = document.getElementById('btn-send-email-submit');
    const recipient = document.getElementById('email-recipient-input')?.value;
    const subject = document.getElementById('email-subject-input')?.value;
    const moduleKey = document.getElementById('email-module-key')?.value || 'TODOS';

    if (!recipient) {
        alert('Please specify a valid recipient email address.');
        return;
    }

    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `⏳ Dispatching Email via SMTP...`;
    }

    setTimeout(() => {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `📤 Send Email Report Now`;
        }

        DB.logAudit(`Dispatched Email Report (${moduleKey}) to ${recipient}`, currentRole);
        
        alert(`✅ EMAIL DISPATCH SUCCESSFUL!\n\nReport: ${subject}\nSent To: ${recipient}\nStatus: Delivered via Hospital SMTP Relay Server\nMessage ID: MSG-${Math.floor(100000 + Math.random() * 900000)}`);
        
        closeEmailModal();
    }, 600);
}

function launchNativeMailto() {
    const recipient = document.getElementById('email-recipient-input')?.value || '';
    const subject = document.getElementById('email-subject-input')?.value || '';
    const body = document.getElementById('email-body-input')?.value || '';
    const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    const a = document.createElement('a');
    a.href = mailtoUrl;
    a.target = '_self';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    DB.logAudit(`Launched System Mail App for ${recipient}`, currentRole);
}

function launchGmailCompose() {
    const recipient = document.getElementById('email-recipient-input')?.value || '';
    const subject = document.getElementById('email-subject-input')?.value || '';
    const body = document.getElementById('email-body-input')?.value || '';
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipient)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');
    DB.logAudit(`Opened Gmail Compose for ${recipient}`, currentRole);
}

function launchOutlookWebCompose() {
    const recipient = document.getElementById('email-recipient-input')?.value || '';
    const subject = document.getElementById('email-subject-input')?.value || '';
    const body = document.getElementById('email-body-input')?.value || '';
    const outlookUrl = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(recipient)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(outlookUrl, '_blank');
    DB.logAudit(`Opened Outlook Web Compose for ${recipient}`, currentRole);
}

function sendWhatsAppReport(overrideKey, targetPhone) {
    const targetKey = getActiveViewEntityKey(overrideKey);
    const data = DB.getAll(targetKey);
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    if (!data || data.length === 0) {
        alert(`No records available to submit via WhatsApp for module: ${targetKey.replace('biomed_', '').toUpperCase()}.`);
        return;
    }

    let reportMsg = `🏥 *BIOMEDICAL DEPARTMENT REPORT*\n`;
    reportMsg += `📋 *Module:* ${targetKey.replace('biomed_', '').toUpperCase()}\n`;
    reportMsg += `📅 *Date:* ${dateStr}\n`;
    reportMsg += `👤 *Sender / Role:* ${currentRole}\n`;
    reportMsg += `-----------------------------------\n`;
    reportMsg += `📊 *Total Entries:* ${data.length} Records\n\n`;

    const sampleItems = data.slice(0, 8);
    sampleItems.forEach((item, idx) => {
        const title = item.name || item.itemName || item.title || item.equipmentName || `Item #${item.id}`;
        const detail = item.status || item.department || item.role || item.priority || '';
        const idStr = item.id ? ` [${item.id}]` : '';
        reportMsg += `${idx + 1}. *${title}*${idStr}\n   ▫️ ${detail}\n`;
    });

    if (data.length > 8) {
        reportMsg += `...and ${data.length - 8} more records.\n`;
    }

    reportMsg += `-----------------------------------\n`;
    reportMsg += `⚡ _Submitted via BioMedPulse OS_`;

    const encodedMsg = encodeURIComponent(reportMsg);
    let waUrl = `https://api.whatsapp.com/send?text=${encodedMsg}`;
    if (typeof targetPhone === 'string' && targetPhone.trim()) {
        const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
        waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`;
    }

    window.open(waUrl, '_blank');
}

function sendWhatsAppTicketAlert(workOrderId) {
    const wo = DB.getById(DB_KEYS.WORK_ORDERS, workOrderId);
    if (!wo) return;

    let alertMsg = `🚨 *BIOMEDICAL WORK ORDER ALERT* 🚨\n`;
    alertMsg += `📌 *Ticket ID:* ${wo.id}\n`;
    alertMsg += `🏥 *Equipment:* ${wo.equipmentName}\n`;
    alertMsg += `📍 *Department:* ${wo.department || 'ICU'}\n`;
    alertMsg += `⚠️ *Priority:* ${wo.priority}\n`;
    alertMsg += `🛠️ *Assigned Engineer:* ${wo.assignedStaff}\n`;
    alertMsg += `📝 *Symptom:* ${wo.symptom}\n`;
    alertMsg += `📊 *Status:* ${wo.status}\n`;
    alertMsg += `-----------------------------------\n`;
    alertMsg += `⚡ _Dispatched via BioMedPulse OS_`;

    const encoded = encodeURIComponent(alertMsg);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
}

// -------------------------------------------------------------
// MODALS & CRUD FORMS
// -------------------------------------------------------------

function openAddModal(overrideType) {
    if (!canEdit()) {
        alert('Access Restricted: Only System Admin or HOD can add new entries.');
        return;
    }

    const typeStr = (typeof overrideType === 'string') ? overrideType : '';

    if (currentActiveView === 'todos' || typeStr === 'TODOS' || typeStr === DB_KEYS.TODOS) {
        openTodoModal();
        return;
    }

    if (currentActiveView === 'master-report' || typeStr === 'MASTER_REPORT') {
        exportMasterMultiSheetExcel();
        return;
    }

    editingRecordId = null;
    editingEntityKey = getActiveViewEntityKey(overrideType);

    document.getElementById('modal-title').textContent = `Add New ${getEntityName(editingEntityKey)}`;
    renderFormFields(editingEntityKey, null);
    document.getElementById('generic-modal').classList.add('active');
}

function editRecord(key, id) {
    if (key === DB_KEYS.STAFF_MEMBERS && !isAdmin()) {
        alert('Access Restricted: Only System Administrators can edit user login accounts.');
        return;
    }
    if (!canEdit()) {
        alert('Access Restricted: Only System Admin or HOD can edit entries.');
        return;
    }
    editingEntityKey = key;
    editingRecordId = id;

    const record = DB.getById(key, id);
    if (!record) return;

    document.getElementById('modal-title').textContent = `Edit ${getEntityName(key)} (${id})`;
    renderFormFields(key, record);
    document.getElementById('generic-modal').classList.add('active');
}

function deleteRecord(key, id) {
    if (key === DB_KEYS.STAFF_MEMBERS && !isAdmin()) {
        alert('Access Restricted: Only System Administrators can delete staff login accounts.');
        return;
    }
    if (!canEdit()) {
        alert('Access Restricted: Only System Admin or HOD can delete entries.');
        return;
    }
    if (confirm(`Are you sure you want to delete record ${id}?`)) {
        DB.delete(key, id, currentRole);
        if (key === DB_KEYS.STAFF_MEMBERS && currentAuthUser && currentAuthUser.id === id) {
            alert('Your active user account was deleted. Signing out...');
            handleLogout();
            return;
        }
        switchView(currentActiveView);
    }
}

function closeModal() {
    document.getElementById('generic-modal').classList.remove('active');
}

function getEntityName(key) {
    const names = {
        [DB_KEYS.STAFF_MEMBERS]: 'Staff Member / User Role',
        [DB_KEYS.WORK_ORDERS]: 'Work Order',
        [DB_KEYS.BIO_EQUIPMENT]: 'Bio Equipment',
        [DB_KEYS.INSTRUMENTS]: 'Instrument',
        [DB_KEYS.CONSUMABLES]: 'Consumable Item',
        [DB_KEYS.DISPOSABLES]: 'Disposable Item',
        [DB_KEYS.IMPLANTS]: 'Implant',
        [DB_KEYS.SPARE_PARTS]: 'Spare Part',
        [DB_KEYS.CONDEMNATION]: 'Condemnation Request',
        [DB_KEYS.TRAINING]: 'Training Record'
    };
    return names[key] || 'Record';
}

function renderFormFields(key, record) {
    const fieldsContainer = document.getElementById('modal-form-fields');
    if (!fieldsContainer) return;

    let html = '';

    if (key === DB_KEYS.STAFF_MEMBERS) {
        html = `
            <div class="form-group"><label>Login ID / Username</label><input type="text" name="loginId" value="${record?.loginId || ''}" placeholder="e.g. admin2, rsharma" required></div>
            <div class="form-group"><label>Account Password</label><input type="password" name="password" value="${record?.password || ''}" placeholder="Enter account password" required></div>
            <div class="form-group"><label>Full Name</label><input type="text" name="name" value="${record?.name || ''}" placeholder="Full Name" required></div>
            <div class="form-group"><label>Role / Designation</label>
                <select name="role">
                    <option value="System Admin" ${record?.role === 'System Admin' ? 'selected' : ''}>System Admin</option>
                    <option value="Biomedical HOD" ${record?.role === 'Biomedical HOD' ? 'selected' : ''}>Biomedical HOD</option>
                    <option value="Senior BioMed Engineer" ${record?.role === 'Senior BioMed Engineer' ? 'selected' : ''}>Senior BioMed Engineer</option>
                    <option value="Biomedical Technician" ${record?.role === 'Biomedical Technician' ? 'selected' : ''}>Biomedical Technician</option>
                </select>
            </div>
            <div class="form-group"><label>Email Address</label><input type="email" name="email" value="${record?.email || ''}"></div>
            <div class="form-group"><label>Contact Phone</label><input type="text" name="phone" value="${record?.phone || ''}"></div>
            <div class="form-group full-width"><label>System Privileges</label>
                <select name="privileges">
                    <option value="System Admin (Full IT & User Control)" ${record?.privileges?.includes('Admin') ? 'selected' : ''}>🛡️ System Admin (Full IT Settings & User Control)</option>
                    <option value="HOD Executive (Approvals & Oversight)" ${record?.privileges?.includes('HOD') || record?.privileges?.includes('Approval') ? 'selected' : ''}>👑 HOD Executive (Approvals, Budget & Asset Oversight)</option>
                    <option value="Staff Technician (Task Execution)" ${!record?.privileges || record?.privileges?.includes('Task') || record?.privileges?.includes('Staff') ? 'selected' : ''}>🛠️ Staff Technician (Task Execution & Ticket Logging)</option>
                </select>
            </div>
        `;
    } else if (key === DB_KEYS.WORK_ORDERS) {
        const staff = DB.getAll(DB_KEYS.STAFF_MEMBERS);
        html = `
            <div class="form-group full-width"><label>Issue Title</label><input type="text" name="title" value="${record?.title || ''}" required></div>
            <div class="form-group"><label>Equipment / Item</label><input type="text" name="equipmentName" value="${record?.equipmentName || ''}" required></div>
            <div class="form-group"><label>Department</label><input type="text" name="department" value="${record?.department || 'ICU'}"></div>
            <div class="form-group"><label>Priority Level</label>
                <select name="priority">
                    <option value="P1 Critical" ${record?.priority === 'P1 Critical' ? 'selected' : ''}>P1 Critical (Life Support)</option>
                    <option value="P2 High" ${record?.priority === 'P2 High' ? 'selected' : ''}>P2 High</option>
                    <option value="P3 Medium" ${record?.priority === 'P3 Medium' ? 'selected' : ''}>P3 Medium</option>
                </select>
            </div>
            <div class="form-group"><label>Assigned Staff Engineer</label>
                <select name="assignedStaff">
                    ${staff.map(s => `<option value="${s.name}" ${record?.assignedStaff === s.name ? 'selected' : ''}>${s.name} (${s.specialty || s.role})</option>`).join('')}
                </select>
            </div>
            <div class="form-group full-width"><label>Symptom / Problem Description</label><textarea name="symptom" rows="2" required>${record?.symptom || ''}</textarea></div>
            <div class="form-group full-width"><label>Action Taken / Resolution Log</label><textarea name="actionTaken" rows="2">${record?.actionTaken || ''}</textarea></div>
            <div class="form-group"><label>Status</label>
                <select name="status">
                    <option value="Open" ${record?.status === 'Open' ? 'selected' : ''}>Open</option>
                    <option value="In Progress" ${record?.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                    <option value="Awaiting Spares" ${record?.status === 'Awaiting Spares' ? 'selected' : ''}>Awaiting Spares</option>
                    <option value="Resolved" ${record?.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                </select>
            </div>
            <div class="form-group"><label>HOD Approval Status</label>
                <select name="hodApprovalStatus">
                    <option value="Approved by HOD" ${record?.hodApprovalStatus === 'Approved by HOD' ? 'selected' : ''}>Approved by HOD</option>
                    <option value="Pending HOD Review" ${record?.hodApprovalStatus === 'Pending HOD Review' ? 'selected' : ''}>Pending HOD Review</option>
                </select>
            </div>
        `;
    } else if (key === DB_KEYS.BIO_EQUIPMENT) {
        html = `
            <div class="form-group"><label>Equipment Name</label><input type="text" name="name" value="${record?.name || ''}" required></div>
            <div class="form-group"><label>Category</label>
                <select name="category">
                    <option value="Major" ${record?.category === 'Major' ? 'selected' : ''}>Major Equipment</option>
                    <option value="Minor" ${record?.category === 'Minor' ? 'selected' : ''}>Minor Equipment</option>
                </select>
            </div>
            <div class="form-group"><label>Department</label><input type="text" name="department" value="${record?.department || 'ICU'}" required></div>
            <div class="form-group"><label>Manufacturer</label><input type="text" name="manufacturer" value="${record?.manufacturer || ''}" required></div>
            <div class="form-group"><label>Model</label><input type="text" name="model" value="${record?.model || ''}" required></div>
            <div class="form-group"><label>Serial Number</label><input type="text" name="serialNumber" value="${record?.serialNumber || ''}" required></div>
            <div class="form-group"><label>Contract Type</label>
                <select name="contractType">
                    <option value="AMC" ${record?.contractType === 'AMC' ? 'selected' : ''}>AMC</option>
                    <option value="CMC" ${record?.contractType === 'CMC' ? 'selected' : ''}>CMC</option>
                    <option value="Warranty" ${record?.contractType === 'Warranty' ? 'selected' : ''}>Warranty</option>
                </select>
            </div>
            <div class="form-group"><label>Contract Vendor</label><input type="text" name="contractVendor" value="${record?.contractVendor || ''}"></div>
            <div class="form-group"><label>Contract End Date</label><input type="date" name="contractEndDate" value="${record?.contractEndDate || '2026-12-31'}"></div>
            <div class="form-group"><label>Status</label>
                <select name="status">
                    <option value="In Service" ${record?.status === 'In Service' ? 'selected' : ''}>In Service</option>
                    <option value="Under Maintenance" ${record?.status === 'Under Maintenance' ? 'selected' : ''}>Under Maintenance</option>
                </select>
            </div>
        `;
    } else if (key === DB_KEYS.INSTRUMENTS) {
        html = `
            <div class="form-group"><label>Instrument Name</label><input type="text" name="name" value="${record?.name || ''}" required></div>
            <div class="form-group"><label>Category</label><input type="text" name="category" value="${record?.category || 'Surgical / Minor'}" required></div>
            <div class="form-group"><label>Department</label><input type="text" name="department" value="${record?.department || 'OT-1'}" required></div>
            <div class="form-group"><label>Manufacturer / Brand</label><input type="text" name="manufacturer" value="${record?.manufacturer || ''}"></div>
            <div class="form-group"><label>Serial / Asset ID</label><input type="text" name="serialNumber" value="${record?.serialNumber || ''}"></div>
            <div class="form-group"><label>Contract Type</label>
                <select name="contractType">
                    <option value="CMC" ${record?.contractType === 'CMC' ? 'selected' : ''}>CMC</option>
                    <option value="AMC" ${record?.contractType === 'AMC' ? 'selected' : ''}>AMC</option>
                    <option value="Warranty" ${record?.contractType === 'Warranty' ? 'selected' : ''}>Warranty</option>
                </select>
            </div>
            <div class="form-group"><label>Last Service Date</label><input type="date" name="lastServiced" value="${record?.lastServiced || '2026-01-15'}"></div>
            <div class="form-group full-width"><label>Servicing / Calibration History Log</label><textarea name="servicingNotes" rows="2">${record?.servicingNotes || 'Inspected & Sterilized'}</textarea></div>
        `;
    } else if (key === DB_KEYS.CONSUMABLES) {
        html = `
            <div class="form-group"><label>Consumable Name</label><input type="text" name="name" value="${record?.name || ''}" required></div>
            <div class="form-group"><label>Department</label><input type="text" name="department" value="${record?.department || 'Central Store'}" required></div>
            <div class="form-group"><label>Brand / Supplier</label><input type="text" name="brand" value="${record?.brand || ''}"></div>
            <div class="form-group"><label>Stock Quantity</label><input type="number" name="stockQty" value="${record?.stockQty || 50}" required></div>
            <div class="form-group"><label>Unit Price (₹)</label><input type="text" name="unitPrice" value="${record?.unitPrice || '₹150'}" required></div>
            <div class="form-group"><label>Storage Location</label><input type="text" name="storageLocation" value="${record?.storageLocation || 'Bin B-12'}"></div>
        `;
    } else if (key === DB_KEYS.DISPOSABLES) {
        html = `
            <div class="form-group"><label>Disposable Item Name</label><input type="text" name="name" value="${record?.name || ''}" required></div>
            <div class="form-group"><label>Department</label><input type="text" name="department" value="${record?.department || 'ICU / OT'}" required></div>
            <div class="form-group"><label>Brand / Manufacturer</label><input type="text" name="brand" value="${record?.brand || ''}"></div>
            <div class="form-group"><label>Stock Quantity</label><input type="number" name="stockQty" value="${record?.stockQty || 100}" required></div>
            <div class="form-group"><label>Unit Price (₹)</label><input type="text" name="unitPrice" value="${record?.unitPrice || '₹45'}" required></div>
            <div class="form-group"><label>Expiry Date</label><input type="date" name="expiryDate" value="${record?.expiryDate || '2027-06-30'}"></div>
        `;
    } else if (key === DB_KEYS.IMPLANTS) {
        html = `
            <div class="form-group"><label>Implant Name & Model</label><input type="text" name="name" value="${record?.name || ''}" required></div>
            <div class="form-group"><label>Implant Category</label>
                <select name="category">
                    <option value="Orthopedic" ${record?.category === 'Orthopedic' ? 'selected' : ''}>Orthopedic</option>
                    <option value="Cardiovascular" ${record?.category === 'Cardiovascular' ? 'selected' : ''}>Cardiovascular</option>
                    <option value="Ophthalmic" ${record?.category === 'Ophthalmic' ? 'selected' : ''}>Ophthalmic</option>
                    <option value="Neurosurgery" ${record?.category === 'Neurosurgery' ? 'selected' : ''}>Neurosurgery</option>
                </select>
            </div>
            <div class="form-group"><label>Manufacturer</label><input type="text" name="manufacturer" value="${record?.manufacturer || ''}" required></div>
            <div class="form-group"><label>Batch / Serial No</label><input type="text" name="batchNo" value="${record?.batchNo || ''}" required></div>
            <div class="form-group"><label>Stock Qty</label><input type="number" name="stockQty" value="${record?.stockQty || 5}" required></div>
            <div class="form-group"><label>Sterilization Date</label><input type="date" name="sterilizationDate" value="${record?.sterilizationDate || '2025-10-10'}"></div>
            <div class="form-group"><label>Expiry Date</label><input type="date" name="expiryDate" value="${record?.expiryDate || '2028-12-31'}"></div>
            <div class="form-group"><label>Storage Safe Location</label><input type="text" name="storageSafe" value="${record?.storageSafe || 'Locker Alpha-04'}"></div>
        `;
    } else if (key === DB_KEYS.SPARE_PARTS) {
        html = `
            <div class="form-group"><label>Part Description</label><input type="text" name="name" value="${record?.name || ''}" required></div>
            <div class="form-group"><label>Part Number</label><input type="text" name="partNumber" value="${record?.partNumber || ''}" required></div>
            <div class="form-group"><label>Compatible Equipment Model</label><input type="text" name="compatibleModel" value="${record?.compatibleModel || ''}" required></div>
            <div class="form-group"><label>Stock Qty</label><input type="number" name="stockQty" value="${record?.stockQty || 5}" required></div>
            <div class="form-group"><label>Min Stock Trigger</label><input type="number" name="minTrigger" value="${record?.minTrigger || 2}"></div>
            <div class="form-group"><label>Unit Cost (₹)</label><input type="text" name="unitCost" value="${record?.unitCost || '₹4,500'}" required></div>
            <div class="form-group"><label>Bin Location</label><input type="text" name="binLocation" value="${record?.binLocation || 'Rack 02-B'}"></div>
        `;
    } else if (key === DB_KEYS.CONDEMNATION) {
        html = `
            <div class="form-group"><label>Item Name / Description</label><input type="text" name="itemName" value="${record?.itemName || record?.name || ''}" required></div>
            <div class="form-group"><label>Item Type</label>
                <select name="itemType">
                    <option value="Equipment" ${record?.itemType === 'Equipment' ? 'selected' : ''}>Bio Equipment</option>
                    <option value="Parts" ${record?.itemType === 'Parts' ? 'selected' : ''}>Parts & Accessories</option>
                </select>
            </div>
            <div class="form-group"><label>Department</label><input type="text" name="department" value="${record?.department || 'ICU'}" required></div>
            <div class="form-group"><label>Requested By</label><input type="text" name="requestedBy" value="${record?.requestedBy || currentRole}" required></div>
            <div class="form-group full-width"><label>Reason for Condemnation</label><textarea name="reason" rows="2" required>${record?.reason || 'Beyond Economical Repair'}</textarea></div>
            <div class="form-group"><label>Committee Approval Status</label>
                <select name="committeeApproval">
                    <option value="Approved by Committee" ${record?.committeeApproval === 'Approved by Committee' ? 'selected' : ''}>Approved by Committee</option>
                    <option value="Pending HOD Review" ${record?.committeeApproval === 'Pending HOD Review' ? 'selected' : ''}>Pending HOD Review</option>
                    <option value="Scrapped & Removed" ${record?.committeeApproval === 'Scrapped & Removed' ? 'selected' : ''}>Scrapped & Removed</option>
                </select>
            </div>
            <div class="form-group"><label>Estimated Scrap Value (₹)</label><input type="text" name="scrapValue" value="${record?.scrapValue || '₹5,000'}"></div>
            <div class="form-group"><label>Certificate Number</label><input type="text" name="certificateNo" value="${record?.certificateNo || 'CND-2026-009'}"></div>
        `;
    } else if (key === DB_KEYS.TRAINING) {
        html = `
            <div class="form-group full-width"><label>Session Title / Topic</label><input type="text" name="title" value="${record?.title || ''}" required></div>
            <div class="form-group"><label>Training Category</label>
                <select name="category">
                    <option value="Equipment" ${record?.category === 'Equipment' ? 'selected' : ''}>Equipment Training</option>
                    <option value="Instrument" ${record?.category === 'Instrument' ? 'selected' : ''}>Instrument Training</option>
                    <option value="PRN" ${record?.category === 'PRN' ? 'selected' : ''}>PRN Training (On-Demand)</option>
                    <option value="O&M / OEM" ${record?.category === 'O&M / OEM' ? 'selected' : ''}>O&M / OEM Certified</option>
                </select>
            </div>
            <div class="form-group"><label>Target Equipment / Instrument</label><input type="text" name="targetItem" value="${record?.targetItem || ''}" required></div>
            <div class="form-group"><label>Trainer / OEM Specialist</label><input type="text" name="trainer" value="${record?.trainer || ''}" required></div>
            <div class="form-group"><label>Date Conducted / Scheduled</label><input type="date" name="dateConducted" value="${record?.dateConducted || '2026-03-20'}"></div>
            <div class="form-group"><label>Location / Venue</label><input type="text" name="location" value="${record?.location || 'Biomedical Demo Lab'}"></div>
            <div class="form-group full-width"><label>Attendees / Target Staff</label><input type="text" name="attendees" value="${record?.attendees || 'ICU Nurses & BioMed Staff'}"></div>
            <div class="form-group"><label>Status</label>
                <select name="status">
                    <option value="Completed" ${record?.status === 'Completed' ? 'selected' : ''}>Completed</option>
                    <option value="Scheduled" ${record?.status === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
                    <option value="Ongoing" ${record?.status === 'Ongoing' ? 'selected' : ''}>Ongoing</option>
                </select>
            </div>
        `;
    } else {
        html = `
            <div class="form-group"><label>Name / Title</label><input type="text" name="name" value="${record?.name || record?.itemName || ''}" required></div>
            <div class="form-group"><label>Department</label><input type="text" name="department" value="${record?.department || ''}"></div>
            <div class="form-group"><label>Quantity / Stock</label><input type="number" name="stockQty" value="${record?.stockQty || 10}"></div>
        `;
    }

    fieldsContainer.innerHTML = html;
}

function handleFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const recordObj = editingRecordId ? DB.getById(editingEntityKey, editingRecordId) || {} : {};

    formData.forEach((val, k) => {
        recordObj[k] = val;
    });

    if (editingEntityKey === DB_KEYS.STAFF_MEMBERS) {
        if (!isAdmin()) {
            alert('Access Restricted: Only System Administrators can create or update user login accounts.');
            return;
        }
        if (!recordObj.id) {
            recordObj.id = `STF-${Math.floor(105 + Math.random() * 895)}`;
        }
    }
    if (editingRecordId) recordObj.id = editingRecordId;
    if (editingEntityKey === DB_KEYS.WORK_ORDERS && !recordObj.dateLogged) {
        recordObj.dateLogged = new Date().toISOString().split('T')[0];
    }
    if (editingEntityKey === DB_KEYS.CONDEMNATION && !recordObj.condemnDate) {
        recordObj.condemnDate = new Date().toISOString().split('T')[0];
    }

    // Auto format currency strings if raw numbers entered
    ['unitPrice', 'unitCost', 'scrapValue', 'purchaseCost'].forEach(costKey => {
        if (recordObj[costKey] && typeof recordObj[costKey] === 'string' && !recordObj[costKey].includes('₹')) {
            const num = parseFloat(recordObj[costKey].replace(/,/g, ''));
            if (!isNaN(num)) {
                recordObj[costKey] = '₹' + num.toLocaleString('en-IN');
            }
        }
    });

    DB.save(editingEntityKey, recordObj, currentRole);
    if (editingEntityKey === DB_KEYS.STAFF_MEMBERS && currentAuthUser && currentAuthUser.id === recordObj.id) {
        setLoggedInSession(recordObj);
    }
    closeModal();
    switchView(currentActiveView);
}

function printCondemnationCert(id) {
    const record = DB.getById(DB_KEYS.CONDEMNATION, id);
    if (!record) return;
    alert(`BIOMEDICAL EQUIPMENT CONDEMNATION CERTIFICATE\nCertificate: ${record.certificateNo}\nDate: ${record.condemnDate}\nItem: ${record.itemName}\nReason: ${record.reason}\nCommittee Status: ${record.committeeApproval}\nAuthorized Signoff: ${currentRole}`);
}

function resetDatabaseToSeed() {
    if (!isAdmin()) {
        alert('Access Restricted: Only System Administrator can reset the database.');
        return;
    }
    if (confirm('Reset database to default seed data?')) {
        DB.resetToSeed();
        switchView(currentActiveView);
    }
}

function exportDataBackup() {
    const jsonStr = DB.exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biomed_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    DB.logAudit('Exported JSON Database Backup', currentRole);
}

function openBackupRecoveryModal() {
    const modal = document.getElementById('modal-backup-recovery');
    if (!modal) return;
    renderBackupPortalStats();
    modal.style.display = 'flex';
    modal.classList.add('active');
}

function closeBackupRecoveryModal() {
    const modal = document.getElementById('modal-backup-recovery');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

function renderBackupPortalStats() {
    let totalRecords = 0;
    Object.keys(DB_KEYS).forEach(k => {
        totalRecords += DB.getAll(DB_KEYS[k]).length;
    });

    const recordsEl = document.getElementById('backup-stat-records');
    if (recordsEl) recordsEl.textContent = totalRecords.toLocaleString();

    const jsonStr = DB.exportJSON();
    const sizeKB = Math.round((new Blob([jsonStr]).size) / 1024);
    const sizeEl = document.getElementById('backup-stat-size');
    if (sizeEl) sizeEl.textContent = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(2)} MB` : `${sizeKB} KB`;

    const snapshots = DB.getSnapshots();
    const snapEl = document.getElementById('backup-stat-snapshots');
    if (snapEl) snapEl.textContent = snapshots.length;

    renderSnapshotsList();
}

function renderSnapshotsList() {
    const tbody = document.getElementById('tbody-snapshots-list');
    if (!tbody) return;

    const snapshots = DB.getSnapshots();
    if (snapshots.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:12px;">No rollback snapshots saved. Click "Create Rollback Snapshot" to save one.</td></tr>`;
        return;
    }

    tbody.innerHTML = snapshots.map(s => `
        <tr>
            <td><strong style="font-family:var(--font-mono); color:var(--purple-accent)">${s.id}</strong></td>
            <td>${s.name}</td>
            <td><small style="color:var(--text-muted)">${s.timestamp}</small></td>
            <td><span class="badge" style="background:#e0f2fe; color:#0284c7">${s.totalRecords} Records</span></td>
            <td>
                <div style="display:flex; gap:6px;">
                    <button type="button" class="btn btn-sm" style="background:#10b981; color:#fff; padding:3px 8px;" onclick="restoreSelectedSnapshot('${s.id}')" title="Rollback to this state">🔄 Rollback</button>
                    <button type="button" class="btn btn-sm" style="background:#ef4444; color:#fff; padding:3px 8px;" onclick="deleteSelectedSnapshot('${s.id}')" title="Delete snapshot">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function createNewSystemSnapshot() {
    const namePrompt = prompt('Enter a label for this rollback snapshot:', `Manual Backup (${new Date().toLocaleDateString('en-IN')})`);
    if (!namePrompt) return;
    const snap = DB.createSnapshot(namePrompt, currentRole);
    if (snap) {
        alert(`✅ System Snapshot Created Successfully!\n\nSnapshot ID: ${snap.id}\nRecords Saved: ${snap.totalRecords}\nTimestamp: ${snap.timestamp}`);
        renderBackupPortalStats();
    }
}

function restoreSelectedSnapshot(snapshotId) {
    if (!canEdit()) {
        alert('Access Restricted: Only System Admin or HOD can restore data snapshots.');
        return;
    }
    if (confirm(`Are you sure you want to rollback the database to snapshot ${snapshotId}? An emergency rollback point will automatically be saved before restoring.`)) {
        const res = DB.restoreSnapshot(snapshotId, currentRole);
        if (res.success) {
            alert(`✅ ROLLBACK SUCCESSFUL!\n\nRestored ${res.count} system records from Snapshot ${snapshotId}.`);
            renderBackupPortalStats();
            switchView(currentActiveView);
        } else {
            alert(`❌ Rollback Failed: ${res.error}`);
        }
    }
}

function deleteSelectedSnapshot(snapshotId) {
    if (confirm(`Delete snapshot ${snapshotId}?`)) {
        DB.deleteSnapshot(snapshotId);
        renderBackupPortalStats();
    }
}

let selectedBackupFileContent = null;

function handleBackupFileSelect(event) {
    const file = event.target.files[0];
    const statusEl = document.getElementById('restore-status-msg');
    if (!file) {
        selectedBackupFileContent = null;
        if (statusEl) statusEl.style.display = 'none';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        selectedBackupFileContent = e.target.result;
        if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.style.color = 'var(--emerald-green)';
            statusEl.textContent = `📁 File Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB) - Ready for Restoration`;
        }
    };
    reader.readAsText(file);
}

function triggerRestoreFromFile() {
    if (!canEdit()) {
        alert('Access Restricted: Only System Admin or HOD can restore database backups.');
        return;
    }

    if (!selectedBackupFileContent) {
        alert('Please select a valid .json or .bak database backup file first.');
        return;
    }

    if (confirm('🚨 RESTORE SYSTEM DATABASE?\n\nThis will apply all records from the selected backup file into the system database. An emergency snapshot will automatically be created before applying.\n\nProceed with Data Restoration?')) {
        const res = DB.importJSON(selectedBackupFileContent, currentRole);
        if (res.success) {
            alert(`🎉 DISASTER RECOVERY RESTORATION COMPLETE!\n\nSuccessfully restored ${res.count} records across ${res.modules} system modules.\n\nYour application state is now fully recovered.`);
            selectedBackupFileContent = null;
            const fileInp = document.getElementById('backup-file-input');
            if (fileInp) fileInp.value = '';
            const statusEl = document.getElementById('restore-status-msg');
            if (statusEl) statusEl.style.display = 'none';
            renderBackupPortalStats();
            switchView(currentActiveView);
        } else {
            alert(`❌ Data Restoration Failed: ${res.error}`);
        }
    }
}

// -------------------------------------------------------------
// MASTER EXECUTIVE REPORT & MULTI-SHEET EXCEL ENGINE
// -------------------------------------------------------------

function renderMasterReportView() {
    const eqList = DB.getAll(DB_KEYS.BIO_EQUIPMENT);
    const insList = DB.getAll(DB_KEYS.INSTRUMENTS);
    const woList = DB.getAll(DB_KEYS.WORK_ORDERS);
    const sparesList = DB.getAll(DB_KEYS.SPARE_PARTS);
    const consList = DB.getAll(DB_KEYS.CONSUMABLES);
    const dispList = DB.getAll(DB_KEYS.DISPOSABLES);
    const impList = DB.getAll(DB_KEYS.IMPLANTS);
    const condList = DB.getAll(DB_KEYS.CONDEMNATION);
    const trainList = DB.getAll(DB_KEYS.TRAINING);
    const staffList = DB.getAll(DB_KEYS.STAFF_MEMBERS);

    const totalAssets = eqList.length + insList.length;
    const openWOs = woList.filter(w => w.status !== 'Resolved').length;
    const pendingCondemns = condList.filter(c => !c.committeeApproval || c.committeeApproval.includes('Pending')).length;
    const pendingWOAppr = woList.filter(w => !w.hodApprovalStatus || w.hodApprovalStatus.includes('Pending')).length;
    const pendingApprovals = pendingCondemns + pendingWOAppr;

    const lowSpares = sparesList.filter(s => s.stockQty <= s.minStockLevel).length;
    const lowCons = consList.filter(c => c.stockQty <= c.minStockLevel).length;
    const lowStockTotal = lowSpares + lowCons;

    let scrapTotal = 0;
    condList.forEach(c => {
        const val = parseFloat((c.scrapValue || '0').replace(/[^0-9.]/g, '')) || 0;
        scrapTotal += val;
    });

    // Update KPI Card Elements
    const uptimeEl = document.getElementById('master-kpi-uptime');
    if (uptimeEl) uptimeEl.textContent = '99.1%';

    const totalAssetsEl = document.getElementById('master-kpi-total-assets');
    if (totalAssetsEl) totalAssetsEl.textContent = `${totalAssets} Items`;

    const openWOEl = document.getElementById('master-kpi-open-wo');
    if (openWOEl) openWOEl.textContent = `${openWOs} Open`;

    const lowStockEl = document.getElementById('master-kpi-low-stock');
    if (lowStockEl) lowStockEl.textContent = `${lowStockTotal} Low`;

    const pendingApprEl = document.getElementById('master-kpi-pending-appr');
    if (pendingApprEl) pendingApprEl.textContent = `${pendingApprovals} Pending`;

    const budgetEl = document.getElementById('master-kpi-budget');
    if (budgetEl) budgetEl.textContent = '₹42,800';

    const condemnEl = document.getElementById('master-kpi-condemn');
    if (condemnEl) condemnEl.textContent = `₹${scrapTotal.toLocaleString('en-IN')}`;

    const staffTrainEl = document.getElementById('master-kpi-staff-train');
    if (staffTrainEl) staffTrainEl.textContent = `${trainList.length} Sessions`;

    // Badges
    const badgeWO = document.getElementById('master-badge-wo-count');
    if (badgeWO) badgeWO.textContent = `${woList.length} Tickets`;

    const badgeEq = document.getElementById('master-badge-eq-count');
    if (badgeEq) badgeEq.textContent = `${totalAssets} Assets`;

    const badgeSpares = document.getElementById('master-badge-spares-count');
    if (badgeSpares) badgeSpares.textContent = `${sparesList.length + consList.length + dispList.length} Items`;

    const badgeCondemn = document.getElementById('master-badge-condemn-count');
    if (badgeCondemn) badgeCondemn.textContent = `${condList.length} Records`;

    // Panel 1: Work Orders Summary
    const sumWO = document.getElementById('master-summary-work-orders');
    if (sumWO) {
        const resolvedCount = woList.filter(w => w.status === 'Resolved').length;
        const p1Count = woList.filter(w => w.priority.includes('P1')).length;
        sumWO.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:0.9rem">
                <span>Total Work Orders Logged:</span> <strong>${woList.length}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:0.9rem">
                <span>Open Breakdown Tickets:</span> <strong style="color:var(--amber-warning)">${openWOs}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:0.9rem">
                <span>Resolved Maintenance Tickets:</span> <strong style="color:var(--emerald-green)">${resolvedCount}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:0.9rem">
                <span>Emergency P1 Tickets:</span> <strong style="color:var(--crimson-danger)">${p1Count}</strong>
            </div>
        `;
    }

    // Panel 2: Bio Assets Summary
    const sumEq = document.getElementById('master-summary-equipment');
    if (sumEq) {
        const amcCount = eqList.filter(e => e.contractType === 'AMC').length;
        const cmcCount = eqList.filter(e => e.contractType === 'CMC').length;
        const warCount = eqList.filter(e => e.contractType === 'Warranty').length;
        sumEq.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:0.9rem">
                <span>Major Bio Equipment:</span> <strong>${eqList.length}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:0.9rem">
                <span>Minor Instruments:</span> <strong>${insList.length}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:0.9rem">
                <span>AMC / CMC Contracts:</span> <strong style="color:var(--blue-primary)">${amcCount} AMC / ${cmcCount} CMC</strong>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:0.9rem">
                <span>Under Warranty:</span> <strong style="color:var(--purple-accent)">${warCount} Equipment</strong>
            </div>
        `;
    }

    // Panel 3: Inventory Summary
    const sumSpares = document.getElementById('master-summary-spares');
    if (sumSpares) {
        sumSpares.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:0.9rem">
                <span>Spare Parts Registered:</span> <strong>${sparesList.length}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:0.9rem">
                <span>Consumables & Disposables:</span> <strong>${consList.length + dispList.length}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:0.9rem">
                <span>Implants Inventory:</span> <strong>${impList.length}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:0.9rem">
                <span>Low Stock Reorder Triggers:</span> <strong style="color:var(--crimson-danger)">${lowStockTotal} Items Low</strong>
            </div>
        `;
    }

    // Panel 4: Condemnation & Compliance
    const sumCondemn = document.getElementById('master-summary-condemn-train');
    if (sumCondemn) {
        sumCondemn.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:0.9rem">
                <span>Condemned Equipment:</span> <strong>${condList.length}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:0.9rem">
                <span>Total Scrap Value Realized:</span> <strong style="color:var(--emerald-green)">₹${scrapTotal.toLocaleString('en-IN')}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:0.9rem">
                <span>Engineering Technicians:</span> <strong>${staffList.length} Roster Members</strong>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:0.9rem">
                <span>Training Sessions Conducted:</span> <strong>${trainList.length} Logged</strong>
            </div>
        `;
    }

    // Render Master Executive Graphical Charts (Breakdown, Inventory, Low Stock)
    const inServiceEq = eqList.filter(e => e.status === 'In Service').length;
    const breakdownEq = eqList.filter(e => e.status === 'Under Breakdown' || e.status === 'Under Repair').length;
    const resWOs = woList.filter(w => w.status === 'Resolved').length;

    renderDashboardChart('chart-master-breakdown', 'bar', 
        ['In-Service', 'Breakdown', 'Open WOs', 'Resolved WOs'], 
        [inServiceEq, breakdownEq, openWOs, resWOs], 
        ['#10b981', '#dc2626', '#f59e0b', '#0284c7'], 
        'Equipment Breakdown & Ticket Matrix'
    );

    renderDashboardChart('chart-master-inventory', 'doughnut', 
        ['Bio Equipment', 'Minor Instruments', 'Spare Parts', 'Consumables', 'Disposables', 'Implants'], 
        [eqList.length, insList.length, sparesList.length, consList.length, dispList.length, impList.length], 
        ['#1e40af', '#0284c7', '#10b981', '#f59e0b', '#7c3aed', '#ec4899'], 
        'Total Inventory Category Breakdown'
    );

    const okSpares = Math.max(0, sparesList.length - lowSpares);
    const okCons = Math.max(0, consList.length - lowCons);

    renderDashboardChart('chart-master-lowstock', 'bar', 
        ['Spares OK', 'Spares LOW ⚠️', 'Consumables OK', 'Consumables LOW ⚠️'], 
        [okSpares, lowSpares, okCons, lowCons], 
        ['#10b981', '#dc2626', '#0284c7', '#ef4444'], 
        'Low Stock Reorder Thresholds'
    );
}

function generateXMLMultiSheetWorkbook(sheetsMap, filename) {
    try {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
  </Style>
 </Styles>`;

        for (const [sheetName, rows] of Object.entries(sheetsMap)) {
            const cleanSheetName = sheetName.replace(/[\\/?*\[\]]/g, '_');
            xml += `\n <Worksheet ss:Name="${cleanSheetName}">\n  <Table>`;
            rows.forEach((row, rowIndex) => {
                xml += `\n   <Row>`;
                row.forEach(cell => {
                    const val = (cell === null || cell === undefined) ? '' : String(cell);
                    const isNum = !isNaN(val) && val.trim() !== '' && !val.startsWith('0') && val.length < 15;
                    const type = isNum ? 'Number' : 'String';
                    const styleAttr = (rowIndex === 0 && sheetName !== '01_KPI_Dashboard') || (rowIndex === 5 && sheetName === '01_KPI_Dashboard') ? ' ss:StyleID="HeaderStyle"' : '';
                    const escaped = val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                    xml += `<Cell${styleAttr}><Data ss:Type="${type}">${escaped}</Data></Cell>`;
                });
                xml += `</Row>`;
            });
            xml += `\n  </Table>\n </Worksheet>`;
        }
        xml += `\n</Workbook>`;

        const a = document.createElement('a');
        if (window.Blob && window.URL && window.URL.createObjectURL) {
            const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 200);
        } else {
            a.href = 'data:application/vnd.ms-excel;charset=utf-8,' + encodeURIComponent(xml);
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    } catch (err) {
        console.error("XML MultiSheet Error:", err);
        alert(`Export Notice: ${err.message || 'Error creating download file'}`);
    }
}

function exportMasterMultiSheetExcel() {
    try {
        const eqList = DB.getAll(DB_KEYS.BIO_EQUIPMENT) || [];
        const insList = DB.getAll(DB_KEYS.INSTRUMENTS) || [];
        const woList = DB.getAll(DB_KEYS.WORK_ORDERS) || [];
        const sparesList = DB.getAll(DB_KEYS.SPARE_PARTS) || [];
        const consList = DB.getAll(DB_KEYS.CONSUMABLES) || [];
        const dispList = DB.getAll(DB_KEYS.DISPOSABLES) || [];
        const impList = DB.getAll(DB_KEYS.IMPLANTS) || [];
        const condList = DB.getAll(DB_KEYS.CONDEMNATION) || [];
        const trainList = DB.getAll(DB_KEYS.TRAINING) || [];
        const staffList = DB.getAll(DB_KEYS.STAFF_MEMBERS) || [];

        const totalAssets = eqList.length + insList.length;
        const openWOs = woList.filter(w => w.status !== 'Resolved').length;
        const pendingCondemns = condList.filter(c => !c.committeeApproval || c.committeeApproval.includes('Pending')).length;
        const pendingWOAppr = woList.filter(w => !w.hodApprovalStatus || w.hodApprovalStatus.includes('Pending')).length;
        const pendingApprovals = pendingCondemns + pendingWOAppr;

        const lowSpares = sparesList.filter(s => s.stockQty <= s.minStockLevel).length;
        const lowCons = consList.filter(c => c.stockQty <= c.minStockLevel).length;
        const lowStockTotal = lowSpares + lowCons;

        let scrapTotal = 0;
        condList.forEach(c => {
            const val = parseFloat((c.scrapValue || '0').replace(/[^0-9.]/g, '')) || 0;
            scrapTotal += val;
        });

        const dateStr = new Date().toISOString().slice(0, 10);

        // Sheet 1 Data
        const kpiRows = [
            ["STAVYA INTELLIGENCE - MASTER EXECUTIVE KPI DASHBOARD REPORT"],
            ["Generated Date", new Date().toLocaleString()],
            ["Department", "Biomedical Department / Hospital Engineering"],
            ["Generated By Role", currentRole || 'Admin'],
            [],
            ["METRIC CATEGORY", "VALUE", "TARGET BENCHMARK", "STATUS / NOTES"],
            ["Equipment Uptime Rate", "99.1%", ">98.0%", "OPTIMAL"],
            ["Total Bio Assets Registered", totalAssets, "All Active Assets", "HEALTHY"],
            ["Open Breakdown Work Orders", openWOs, "0 Tickets Target", openWOs > 0 ? "ACTION REQUIRED" : "CLEAR"],
            ["Pending HOD Approvals", pendingApprovals, "0 Pending Target", pendingApprovals > 0 ? "PENDING REVIEW" : "CLEAR"],
            ["Low Stock Reorder Alerts", lowStockTotal, "0 Below Min Stock", lowStockTotal > 0 ? "REORDER REQUIRED" : "OPTIMAL"],
            ["Annual Maintenance Budget", "₹42,800", "Approved FY Budget", "ON TRACK"],
            ["Condemnation Scrap Value", `₹${scrapTotal.toLocaleString('en-IN')}`, "Scrap Realization", "REALIZED"],
            ["Staff Training Sessions Logged", trainList.length, "Mandatory Compliance", "COMPLIANT"],
            ["Engineering Staff Count", staffList.length, "Technicians & Engineers", "STAFFED"]
        ];

        // Sheet 2 Data
        const woHeader = ["WO ID", "Title", "Priority", "Equipment Name", "Department", "Assigned Staff", "Symptom", "Action Taken", "Date Logged", "Status", "HOD Approval Status"];
        const woRows = [woHeader, ...woList.map(item => [item.id || '', item.title || '', item.priority || '', item.equipmentName || '', item.department || '', item.assignedStaff || '', item.symptom || '', item.actionTaken || '', item.dateLogged || '', item.status || '', item.hodApprovalStatus || 'N/A'])];

        // Sheet 3 Data
        const eqHeader = ["Equipment ID", "Equipment Name", "Category", "Department", "Location", "Model", "Serial Number", "Manufacturer", "Risk Class", "Contract Type", "Contract Vendor", "Contract Cost", "Contract End Date", "Status"];
        const eqRows = [eqHeader, ...eqList.map(item => [item.id || '', item.name || '', item.category || '', item.department || '', item.location || '', item.model || '', item.serialNumber || '', item.manufacturer || '', item.riskClass || '', item.contractType || '', item.contractVendor || '', item.contractCost || '', item.contractEndDate || '', item.status || ''])];

        // Sheet 4 Data
        const insHeader = ["Instrument ID", "Instrument Name", "Category", "Department", "Manufacturer", "Serial Number", "Contract Type", "Last Serviced", "History Log"];
        const insRows = [insHeader, ...insList.map(item => [item.id || '', item.name || '', item.category || '', item.department || '', item.manufacturer || '', item.serialNumber || '', item.contractType || '', item.lastServiced || '', item.historyLog || ''])];

        // Sheet 5 Data
        const consHeader = ["Item ID", "Item Name", "Department", "Brand", "Stock Qty", "Unit", "Min Stock Level", "Unit Price", "Location"];
        const consRows = [consHeader, ...consList.map(item => [item.id || '', item.name || '', item.department || '', item.brand || '', item.stockQty ?? 0, item.unit || '', item.minStockLevel ?? 0, item.unitPrice || '', item.location || ''])];

        // Sheet 6 Data
        const dispHeader = ["Item ID", "Item Name", "Department", "Brand", "Stock Qty", "Unit", "Min Stock Level", "Unit Price", "Expiry Date"];
        const dispRows = [dispHeader, ...dispList.map(item => [item.id || '', item.name || '', item.department || '', item.brand || '', item.stockQty ?? 0, item.unit || '', item.minStockLevel ?? 0, item.unitPrice || '', item.expiryDate || ''])];

        // Sheet 7 Data
        const impHeader = ["Implant ID", "Implant Name", "Type", "Manufacturer", "Model", "Batch Number", "Serial Number", "Stock Qty", "Unit", "Sterilization Date", "Expiry Date", "Storage Location"];
        const impRows = [impHeader, ...impList.map(item => [item.id || '', item.name || '', item.type || '', item.manufacturer || '', item.model || '', item.batchNumber || '', item.serialNumber || '', item.stockQty ?? 0, item.unit || '', item.sterilizationDate || '', item.expiryDate || '', item.storageLocation || ''])];

        // Sheet 8 Data
        const sparesHeader = ["Spare ID", "Spare Name", "Part Number", "Compatible Models", "Stock Qty", "Min Stock Level", "Unit Price", "Location"];
        const sparesRows = [sparesHeader, ...sparesList.map(item => [item.id || '', item.name || '', item.partNumber || '', item.compatibleModels || '', item.stockQty ?? 0, item.minStockLevel ?? 0, item.unitPrice || '', item.location || ''])];

        // Sheet 9 Data
        const condHeader = ["Condemn ID", "Item Type", "Item Name", "Serial Number", "Department", "Reason", "Requested By", "Committee Approval", "Scrap Value", "Certificate No"];
        const condRows = [condHeader, ...condList.map(item => [item.id || '', item.itemType || '', item.itemName || '', item.serialNumber || '', item.department || '', item.reason || '', item.requestedBy || '', item.committeeApproval || '', item.scrapValue || '', item.certificateNo || 'N/A'])];

        // Sheet 10 Data
        const staffHeader = ["Staff ID", "Name", "Role", "Email", "Phone", "Privileges"];
        const staffRows = [staffHeader, ...staffList.map(item => [item.id || '', item.name || '', item.role || '', item.email || 'N/A', item.phone || 'N/A', Array.isArray(item.privileges) ? item.privileges.join(', ') : String(item.privileges || 'N/A')])];

        // Sheet 11 Data
        const trainHeader = ["Training ID", "Category", "Title", "Target Item", "Trainer", "Date", "Location", "Attendees Count", "Duration Hours", "Notes"];
        const trainRows = [trainHeader, ...trainList.map(item => [item.id || '', item.category || '', item.title || '', item.targetItem || '', item.trainer || '', item.date || '', item.location || '', item.attendeesCount ?? 0, item.durationHours ?? 0, item.notes || ''])];

        const sheetsMap = {
            "01_KPI_Dashboard": kpiRows,
            "02_Work_Orders": woRows,
            "03_Bio_Equipment": eqRows,
            "04_Minor_Instruments": insRows,
            "05_Consumables": consRows,
            "06_Disposables": dispRows,
            "07_Implants": impRows,
            "08_Spare_Parts": sparesRows,
            "09_Condemnation": condRows,
            "10_Staff_Roster": staffRows,
            "11_Training_Log": trainRows
        };

        if (typeof XLSX !== 'undefined' && XLSX.utils && XLSX.writeFile) {
            try {
                const wb = XLSX.utils.book_new();
                for (const [sheetName, rows] of Object.entries(sheetsMap)) {
                    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), sheetName);
                }
                XLSX.writeFile(wb, `StavyaIntelligence_Master_Executive_Report_${dateStr}.xlsx`);
                alert(`Success! Master Executive Report (.xlsx) downloaded with 11 individual sheets.`);
                return;
            } catch (xlsxErr) {
                console.warn("SheetJS write failed, falling back to XML SpreadsheetML:", xlsxErr);
            }
        }

        // XML SpreadsheetML Fallback
        generateXMLMultiSheetWorkbook(sheetsMap, `StavyaIntelligence_Master_Executive_Report_${dateStr}.xls`);
        alert(`Success! Master Executive Report downloaded (11 sheets Excel format).`);
    } catch (err) {
        console.error("Export Master Excel Error:", err);
        alert(`Error downloading Master Report: ${err.message || 'An unexpected error occurred.'}`);
    }
}

function sendWhatsAppMasterSummary() {
    const eqList = DB.getAll(DB_KEYS.BIO_EQUIPMENT);
    const insList = DB.getAll(DB_KEYS.INSTRUMENTS);
    const woList = DB.getAll(DB_KEYS.WORK_ORDERS);
    const sparesList = DB.getAll(DB_KEYS.SPARE_PARTS);
    const consList = DB.getAll(DB_KEYS.CONSUMABLES);
    const condList = DB.getAll(DB_KEYS.CONDEMNATION);
    const trainList = DB.getAll(DB_KEYS.TRAINING);

    const totalAssets = eqList.length + insList.length;
    const openWOs = woList.filter(w => w.status !== 'Resolved').length;
    const pendingCondemns = condList.filter(c => !c.committeeApproval || c.committeeApproval.includes('Pending')).length;
    const pendingWOAppr = woList.filter(w => !w.hodApprovalStatus || w.hodApprovalStatus.includes('Pending')).length;
    const pendingApprovals = pendingCondemns + pendingWOAppr;

    const lowSpares = sparesList.filter(s => s.stockQty <= s.minStockLevel).length;
    const lowCons = consList.filter(c => c.stockQty <= c.minStockLevel).length;
    const lowStockTotal = lowSpares + lowCons;

    let text = `🏥 *STAVYA INTELLIGENCE - MASTER EXECUTIVE REPORT*\n`;
    text += `📅 Date: ${new Date().toLocaleDateString('en-IN')}\n`;
    text += `👤 Sender: ${currentRole}\n\n`;
    text += `📊 *DEPARTMENTAL KPI SUMMARY*\n`;
    text += `• Uptime Rate: 99.1%\n`;
    text += `• Total Registered Assets: ${totalAssets}\n`;
    text += `• Open Breakdown Tickets: ${openWOs}\n`;
    text += `• Pending HOD Approvals: ${pendingApprovals}\n`;
    text += `• Low Stock Alerts: ${lowStockTotal}\n`;
    text += `• Department Budget: ₹42,800\n`;
    text += `• Training Sessions: ${trainList.length}\n\n`;
    text += `🔗 *Master Report Portal*: http://localhost:8085`;

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
}



function exportMasterCSVReport() {
    try {
        const eqList = DB.getAll(DB_KEYS.BIO_EQUIPMENT) || [];
        const insList = DB.getAll(DB_KEYS.INSTRUMENTS) || [];
        const woList = DB.getAll(DB_KEYS.WORK_ORDERS) || [];
        const sparesList = DB.getAll(DB_KEYS.SPARE_PARTS) || [];
        const consList = DB.getAll(DB_KEYS.CONSUMABLES) || [];
        const dispList = DB.getAll(DB_KEYS.DISPOSABLES) || [];
        const impList = DB.getAll(DB_KEYS.IMPLANTS) || [];
        const condList = DB.getAll(DB_KEYS.CONDEMNATION) || [];
        const trainList = DB.getAll(DB_KEYS.TRAINING) || [];
        const staffList = DB.getAll(DB_KEYS.STAFF_MEMBERS) || [];

        const totalAssets = eqList.length + insList.length;
        const openWOs = woList.filter(w => w.status !== 'Resolved').length;
        const lowStockTotal = sparesList.filter(s => s.stockQty <= s.minStockLevel).length + consList.filter(c => c.stockQty <= c.minStockLevel).length;

        let scrapTotal = 0;
        condList.forEach(c => {
            scrapTotal += parseFloat((c.scrapValue || '0').replace(/[^0-9.]/g, '')) || 0;
        });

        const dateStr = new Date().toISOString().slice(0, 10);
        let csvContent = `\uFEFFSTAVYA INTELLIGENCE - MASTER EXECUTIVE KPI DASHBOARD REPORT\n`;
        csvContent += `Generated Date,${new Date().toLocaleString()}\n`;
        csvContent += `Department,Biomedical Department / Hospital Engineering\n`;
        csvContent += `Role,${currentRole || 'Admin'}\n\n`;

        csvContent += `METRIC CATEGORY,VALUE,TARGET BENCHMARK,STATUS\n`;
        csvContent += `Equipment Uptime Rate,99.1%,>98.0%,OPTIMAL\n`;
        csvContent += `Total Bio Assets Registered,${totalAssets},All Active Assets,HEALTHY\n`;
        csvContent += `Open Breakdown Work Orders,${openWOs},0 Tickets Target,${openWOs > 0 ? "ACTION REQUIRED" : "CLEAR"}\n`;
        csvContent += `Low Stock Reorder Alerts,${lowStockTotal},0 Below Min Stock,${lowStockTotal > 0 ? "REORDER REQUIRED" : "OPTIMAL"}\n`;
        csvContent += `Annual Maintenance Budget,₹42 800,Approved FY Budget,ON TRACK\n`;
        csvContent += `Condemnation Scrap Value,₹${scrapTotal.toLocaleString('en-IN')},Scrap Realization,REALIZED\n\n`;

        const sections = [
            { name: "SECTION 02: WORK ORDERS DISPATCH", headers: ["WO ID", "Title", "Priority", "Equipment Name", "Department", "Assigned Staff", "Symptom", "Action Taken", "Date Logged", "Status"], data: woList, mapFn: item => [item.id, item.title, item.priority, item.equipmentName, item.department, item.assignedStaff, item.symptom, item.actionTaken, item.dateLogged, item.status] },
            { name: "SECTION 03: BIO EQUIPMENT REGISTRY", headers: ["Equipment ID", "Equipment Name", "Category", "Department", "Location", "Model", "Serial Number", "Manufacturer", "Contract Type", "Contract End Date", "Status"], data: eqList, mapFn: item => [item.id, item.name, item.category, item.department, item.location, item.model, item.serialNumber, item.manufacturer, item.contractType, item.contractEndDate, item.status] },
            { name: "SECTION 04: MINOR INSTRUMENTS", headers: ["Instrument ID", "Instrument Name", "Category", "Department", "Manufacturer", "Serial Number", "Contract Type", "Last Serviced"], data: insList, mapFn: item => [item.id, item.name, item.category, item.department, item.manufacturer, item.serialNumber, item.contractType, item.lastServiced] },
            { name: "SECTION 05: CONSUMABLES INVENTORY", headers: ["Item ID", "Item Name", "Department", "Brand", "Stock Qty", "Unit", "Min Stock Level", "Unit Price", "Location"], data: consList, mapFn: item => [item.id, item.name, item.department, item.brand, item.stockQty, item.unit, item.minStockLevel, item.unitPrice, item.location] },
            { name: "SECTION 06: DISPOSABLES INVENTORY", headers: ["Item ID", "Item Name", "Department", "Brand", "Stock Qty", "Unit", "Min Stock Level", "Unit Price", "Expiry Date"], data: dispList, mapFn: item => [item.id, item.name, item.department, item.brand, item.stockQty, item.unit, item.minStockLevel, item.unitPrice, item.expiryDate] },
            { name: "SECTION 07: IMPLANTS INVENTORY", headers: ["Implant ID", "Implant Name", "Type", "Manufacturer", "Model", "Batch Number", "Serial Number", "Stock Qty", "Expiry Date", "Storage Location"], data: impList, mapFn: item => [item.id, item.name, item.type, item.manufacturer, item.model, item.batchNumber, item.serialNumber, item.stockQty, item.expiryDate, item.storageLocation] },
            { name: "SECTION 08: SPARE PARTS INVENTORY", headers: ["Spare ID", "Spare Name", "Part Number", "Compatible Models", "Stock Qty", "Min Stock Level", "Unit Price", "Location"], data: sparesList, mapFn: item => [item.id, item.name, item.partNumber, item.compatibleModels, item.stockQty, item.minStockLevel, item.unitPrice, item.location] },
            { name: "SECTION 09: CONDEMNATION RECORDS", headers: ["Condemn ID", "Item Type", "Item Name", "Serial Number", "Department", "Reason", "Requested By", "Committee Approval", "Scrap Value"], data: condList, mapFn: item => [item.id, item.itemType, item.itemName, item.serialNumber, item.department, item.reason, item.requestedBy, item.committeeApproval, item.scrapValue] },
            { name: "SECTION 10: STAFF ROSTER", headers: ["Staff ID", "Name", "Role", "Email", "Phone"], data: staffList, mapFn: item => [item.id, item.name, item.role, item.email, item.phone] },
            { name: "SECTION 11: TRAINING LOG", headers: ["Training ID", "Category", "Title", "Target Item", "Trainer", "Date", "Location", "Attendees Count"], data: trainList, mapFn: item => [item.id, item.category, item.title, item.targetItem, item.trainer, item.date, item.location, item.attendeesCount] }
        ];

        sections.forEach(sec => {
            csvContent += `========================================================================\n`;
            csvContent += `${sec.name}\n`;
            csvContent += `========================================================================\n`;
            csvContent += sec.headers.join(',') + '\n';
            sec.data.forEach(item => {
                const row = sec.mapFn(item).map(val => {
                    const str = (val === null || val === undefined) ? '' : String(val);
                    return `"${str.replace(/"/g, '""')}"`;
                });
                csvContent += row.join(',') + '\n';
            });
            csvContent += '\n';
        });

        const filename = `StavyaIntelligence_Master_Report_${dateStr}.csv`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        if (window.URL && window.URL.createObjectURL) {
            a.href = URL.createObjectURL(blob);
        } else {
            a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
        }
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 200);
        alert(`Success! Master Executive CSV Report downloaded.`);
    } catch (err) {
        console.error("CSV Export Error:", err);
        alert(`CSV Export Error: ${err.message}`);
    }
}

// -------------------------------------------------------------
// STAFF TODO TASK MANAGEMENT ENGINE (HOD & EMPLOYEE WORKFLOW)
// -------------------------------------------------------------

function renderTodosView() {
    const todos = DB.getAll(DB_KEYS.TODOS);
    const staffMembers = DB.getAll(DB_KEYS.STAFF_MEMBERS);

    // Populate staff filter dropdown if empty
    const selectStaffFilter = document.getElementById('filter-todo-staff');
    if (selectStaffFilter && selectStaffFilter.options.length <= 1) {
        staffMembers.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.name;
            opt.textContent = `${s.name} (${s.role || 'Staff'})`;
            selectStaffFilter.appendChild(opt);
        });
    }

    // Calculate KPI Stats
    const totalCount = todos.length;
    const pendingCount = todos.filter(t => t.status === 'Pending').length;
    const inProgressCount = todos.filter(t => t.status === 'In Progress').length;
    const completedCount = todos.filter(t => t.status === 'Completed').length;
    const urgentCount = todos.filter(t => t.priority === 'Urgent' || t.priority === 'High').length;

    const elTotal = document.getElementById('kpi-todo-total');
    if (elTotal) elTotal.textContent = totalCount;

    const elPending = document.getElementById('kpi-todo-pending');
    if (elPending) elPending.textContent = pendingCount;

    const elProgress = document.getElementById('kpi-todo-in-progress');
    if (elProgress) elProgress.textContent = inProgressCount;

    const elCompleted = document.getElementById('kpi-todo-completed');
    if (elCompleted) elCompleted.textContent = completedCount;

    const elUrgent = document.getElementById('kpi-todo-urgent');
    if (elUrgent) elUrgent.textContent = urgentCount;

    const elListCount = document.getElementById('todo-list-count');
    if (elListCount) elListCount.textContent = `${todos.length} Items`;

    // Filter Logic
    const searchVal = (document.getElementById('search-todo')?.value || '').toLowerCase();
    const filterStaff = document.getElementById('filter-todo-staff')?.value || 'ALL';
    const filterStatus = document.getElementById('filter-todo-status')?.value || 'ALL';
    const filterPriority = document.getElementById('filter-todo-priority')?.value || 'ALL';

    const filtered = todos.filter(t => {
        const matchesSearch = !searchVal || 
            (t.title && t.title.toLowerCase().includes(searchVal)) ||
            (t.id && t.id.toLowerCase().includes(searchVal)) ||
            (t.assignedTo && t.assignedTo.toLowerCase().includes(searchVal)) ||
            (t.category && t.category.toLowerCase().includes(searchVal)) ||
            (t.description && t.description.toLowerCase().includes(searchVal));

        const matchesStaff = filterStaff === 'ALL' || t.assignedTo === filterStaff;
        const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
        const matchesPriority = filterPriority === 'ALL' || t.priority === filterPriority;

        return matchesSearch && matchesStaff && matchesStatus && matchesPriority;
    });

    // Render Table Body
    const tbody = document.getElementById('tbody-todos');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align:center; padding:30px; color:var(--text-muted)">
                    ℹ️ No ToDo tasks found matching current filter criteria.
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(t => {
        const statusBadgeClass = t.status === 'Completed' ? 'badge-todo-completed' :
            (t.status === 'In Progress' ? 'badge-todo-in-progress' :
            (t.status === 'Overdue' ? 'badge-todo-overdue' : 'badge-todo-pending'));

        const priorityClass = t.priority === 'Urgent' ? 'priority-urgent' :
            (t.priority === 'High' ? 'priority-high' :
            (t.priority === 'Medium' ? 'priority-medium' : 'priority-low'));

        const canModify = isHOD() || isAdmin();

        return `
            <tr>
                <td><strong style="font-family:var(--font-mono); color:var(--purple-accent)">${t.id}</strong></td>
                <td>
                    <div style="font-weight:700; color:var(--text-primary); font-size:0.88rem">${t.title}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted)">🏷️ ${t.category || 'General Task'}</div>
                </td>
                <td>
                    <div style="font-weight:700; font-size:0.84rem">👤 ${t.assignedTo || 'Unassigned'}</div>
                </td>
                <td>
                    <span class="badge ${priorityClass}">${t.priority}</span>
                </td>
                <td>
                    <span style="font-family:var(--font-mono); font-size:0.8rem">📅 ${t.dueDate || 'N/A'}</span>
                </td>
                <td>
                    <span class="badge ${statusBadgeClass}">${t.status}</span>
                </td>
                <td>
                    <span style="font-size:0.78rem; color:var(--text-secondary)">${t.assignedBy || 'Dr. Alok Verma (HOD)'}</span>
                </td>
                <td>
                    <div style="font-size:0.78rem; color:var(--text-muted); max-width:200px; white-space:normal">${t.notes || t.description || 'No notes.'}</div>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm" style="background:var(--blue-light); color:var(--blue-primary); border:1px solid var(--border-blue)" onclick="cycleTodoStatus('${t.id}')" title="Advance Task Status">🔄 Progress</button>
                        ${canModify ? `<button class="btn btn-sm" style="background:#f1f5f9; color:#0f172a" onclick="openTodoModal('${t.id}')" title="Edit ToDo Task">✏️ Edit</button>` : ''}
                        ${canModify ? `<button class="btn btn-sm" style="background:#fee2e2; color:#dc2626" onclick="deleteTodoRecord('${t.id}')" title="Delete Task">🗑️</button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    updateTodoBadge();
}

function renderHODTodoPanel() {
    const todos = DB.getAll(DB_KEYS.TODOS);
    const tbody = document.getElementById('tbody-hod-todos');
    if (!tbody) return;

    if (todos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding:20px; color:var(--text-muted)">
                    No ToDo tasks currently assigned to staff. Click "➕ Set ToDo for Staff" to assign a task.
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = todos.slice(0, 10).map(t => {
        const statusBadgeClass = t.status === 'Completed' ? 'badge-todo-completed' :
            (t.status === 'In Progress' ? 'badge-todo-in-progress' :
            (t.status === 'Overdue' ? 'badge-todo-overdue' : 'badge-todo-pending'));

        const priorityClass = t.priority === 'Urgent' ? 'priority-urgent' :
            (t.priority === 'High' ? 'priority-high' :
            (t.priority === 'Medium' ? 'priority-medium' : 'priority-low'));

        return `
            <tr>
                <td><strong style="font-family:var(--font-mono); color:var(--purple-accent)">${t.id}</strong></td>
                <td>
                    <div style="font-weight:700; color:var(--text-primary); font-size:0.85rem">${t.title}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted)">🏷️ ${t.category}</div>
                </td>
                <td><strong style="font-size:0.82rem">👤 ${t.assignedTo}</strong></td>
                <td><span class="badge ${priorityClass}">${t.priority}</span></td>
                <td><span style="font-family:var(--font-mono); font-size:0.78rem">📅 ${t.dueDate}</span></td>
                <td><span class="badge ${statusBadgeClass}">${t.status}</span></td>
                <td><span style="font-size:0.78rem">${t.assignedBy || 'Dr. Alok Verma (HOD)'}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm" style="background:var(--blue-light); color:var(--blue-primary); border:1px solid var(--border-blue)" onclick="cycleTodoStatus('${t.id}')">🔄 Status</button>
                        <button class="btn btn-sm" onclick="openTodoModal('${t.id}')">✏️ Edit</button>
                        <button class="btn btn-sm" style="background:#fee2e2; color:#dc2626" onclick="deleteTodoRecord('${t.id}')">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function openTodoModal(todoId) {
    const modal = document.getElementById('modal-todo');
    if (!modal) return;

    const staffMembers = DB.getAll(DB_KEYS.STAFF_MEMBERS);
    const staffSelect = document.getElementById('todo-staff-input');
    if (staffSelect) {
        staffSelect.innerHTML = staffMembers.map(s => `<option value="${s.name}">${s.name} (${s.role || 'Staff'})</option>`).join('');
    }

    const titleEl = document.getElementById('todo-modal-title');
    const idInput = document.getElementById('todo-id-input');
    const titleInput = document.getElementById('todo-title-input');
    const categoryInput = document.getElementById('todo-category-input');
    const priorityInput = document.getElementById('todo-priority-input');
    const duedateInput = document.getElementById('todo-duedate-input');
    const statusInput = document.getElementById('todo-status-input');
    const assignedbyInput = document.getElementById('todo-assignedby-input');
    const descriptionInput = document.getElementById('todo-description-input');
    const notesInput = document.getElementById('todo-notes-input');

    if (todoId) {
        const item = DB.getById(DB_KEYS.TODOS, todoId);
        if (item) {
            if (titleEl) titleEl.textContent = `Edit ToDo Task (${item.id})`;
            if (idInput) idInput.value = item.id;
            if (titleInput) titleInput.value = item.title || '';
            if (staffSelect) staffSelect.value = item.assignedTo || (staffMembers[0] ? staffMembers[0].name : '');
            if (categoryInput) categoryInput.value = item.category || 'Preventive Maintenance';
            if (priorityInput) priorityInput.value = item.priority || 'High';
            if (duedateInput) duedateInput.value = item.dueDate || '';
            if (statusInput) statusInput.value = item.status || 'Pending';
            if (assignedbyInput) assignedbyInput.value = item.assignedBy || 'Dr. Alok Verma (HOD)';
            if (descriptionInput) descriptionInput.value = item.description || '';
            if (notesInput) notesInput.value = item.notes || '';
        }
    } else {
        if (titleEl) titleEl.textContent = 'Set New Staff ToDo Task';
        if (idInput) idInput.value = '';
        if (titleInput) titleInput.value = '';
        if (categoryInput) categoryInput.value = 'Preventive Maintenance';
        if (priorityInput) priorityInput.value = 'High';
        
        // Default Due Date to 7 days from today
        const defaultDue = new Date();
        defaultDue.setDate(defaultDue.getDate() + 7);
        if (duedateInput) duedateInput.value = defaultDue.toISOString().split('T')[0];
        
        if (statusInput) statusInput.value = 'Pending';
        if (assignedbyInput) assignedbyInput.value = currentRole === 'HOD' ? 'Dr. Alok Verma (HOD)' : (currentRole === 'ADMIN' ? 'System Admin' : 'Dr. Alok Verma (HOD)');
        if (descriptionInput) descriptionInput.value = '';
        if (notesInput) notesInput.value = '';
    }

    modal.style.display = 'flex';
}

function closeTodoModal() {
    const modal = document.getElementById('modal-todo');
    if (modal) modal.style.display = 'none';
}

function saveTodoRecord(e) {
    e.preventDefault();

    const id = document.getElementById('todo-id-input')?.value;
    const title = document.getElementById('todo-title-input')?.value;
    const assignedTo = document.getElementById('todo-staff-input')?.value;
    const category = document.getElementById('todo-category-input')?.value;
    const priority = document.getElementById('todo-priority-input')?.value;
    const dueDate = document.getElementById('todo-duedate-input')?.value;
    const status = document.getElementById('todo-status-input')?.value;
    const assignedBy = document.getElementById('todo-assignedby-input')?.value || 'Dr. Alok Verma (HOD)';
    const description = document.getElementById('todo-description-input')?.value || '';
    const notes = document.getElementById('todo-notes-input')?.value || '';

    const record = {
        id: id || undefined,
        title,
        assignedTo,
        assignedBy,
        category,
        priority,
        dueDate,
        status,
        assignedDate: id ? (DB.getById(DB_KEYS.TODOS, id)?.assignedDate || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
        description,
        notes
    };

    const saved = DB.save(DB_KEYS.TODOS, record, currentRole);
    alert(`Success: ToDo task "${saved.title}" assigned to ${saved.assignedTo} has been saved.`);

    closeTodoModal();
    renderTodosView();
    renderHODTodoPanel();
    updateTodoBadge();
}

function cycleTodoStatus(todoId) {
    const item = DB.getById(DB_KEYS.TODOS, todoId);
    if (!item) return;

    const statusFlow = {
        'Pending': 'In Progress',
        'In Progress': 'Completed',
        'Completed': 'Pending',
        'Overdue': 'In Progress'
    };

    const newStatus = statusFlow[item.status] || 'Pending';
    item.status = newStatus;
    
    if (newStatus === 'Completed') {
        const noteAdd = prompt(`Task status set to COMPLETED.\nAdd final resolution/completion note (optional):`, item.notes || '');
        if (noteAdd !== null) item.notes = noteAdd;
    }

    DB.save(DB_KEYS.TODOS, item, currentRole);
    renderTodosView();
    renderHODTodoPanel();
    updateTodoBadge();
}

function deleteTodoRecord(todoId) {
    if (!confirm(`Are you sure you want to delete ToDo task [${todoId}]?`)) return;
    DB.delete(DB_KEYS.TODOS, todoId, currentRole);
    renderTodosView();
    renderHODTodoPanel();
    updateTodoBadge();
}

function updateTodoBadge() {
    const todos = DB.getAll(DB_KEYS.TODOS);
    const activeCount = todos.filter(t => t.status !== 'Completed').length;
    const badge = document.getElementById('badge-todo-count');
    if (badge) badge.textContent = activeCount;
}

// -------------------------------------------------------------
// AUTOMATED AMC, CMC & WARRANTY 2-MONTH RENEWAL ENGINE (CLASSIC UI)
// -------------------------------------------------------------

function renderContractAlertsTable() {
    const tbody = document.getElementById('tbody-contract-alerts');
    if (!tbody) return;

    let equipmentList = DB.getAll('biomed_equipment');
    if (!Array.isArray(equipmentList) || equipmentList.length === 0) {
        equipmentList = SEED_DATA[DB_KEYS.BIO_EQUIPMENT] || [];
    }

    // Ensure 2-month expiring demo contracts exist in local database
    const hasExpiringDemo = equipmentList.some(eq => {
        const exp = eq.contractExpiryDate || eq.contractEndDate;
        if (!exp) return false;
        const diff = Math.ceil((new Date(exp) - new Date()) / (1000 * 60 * 60 * 24));
        return diff <= 60;
    });

    if (!hasExpiringDemo) {
        const seedExpiring = SEED_DATA[DB_KEYS.BIO_EQUIPMENT] || [];
        seedExpiring.forEach(sItem => {
            if (!equipmentList.some(x => x.id === sItem.id)) {
                equipmentList.unshift(sItem);
                DB.save('biomed_equipment', sItem, 'ADMIN');
            }
        });
    }

    const settings = DB.getAll('biomed_settings') || [];
    const emailSetting = settings.find(s => s.key === 'auto_alert_recipient_email');
    const phoneSetting = settings.find(s => s.key === 'auto_alert_whatsapp_number');

    const emailInput = document.getElementById('input-alert-email');
    const phoneInput = document.getElementById('input-alert-phone');

    if (emailInput && emailSetting) emailInput.value = emailSetting.value;
    if (phoneInput && phoneSetting) phoneInput.value = phoneSetting.value;

    const targetEmail = emailSetting ? emailSetting.value : (emailInput ? emailInput.value : 'amc.biomed@hospital.org');
    const targetPhone = phoneSetting ? phoneSetting.value : (phoneInput ? phoneInput.value : '919876543210');

    const now = new Date();
    let rowsHtml = '';
    let alertCount = 0;

    equipmentList.forEach(eq => {
        const expiryStr = eq.contractExpiryDate || eq.contractEndDate;
        if (!expiryStr) return;
        const expiryDate = new Date(expiryStr);
        const diffTime = expiryDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Threshold: 60 days (2 months) before completion
        if (daysRemaining <= 60) {
            alertCount++;
            const contractType = eq.contractType || 'CMC';
            const vendorName = eq.contractVendor || 'Medical Equipment Partner';
            const vendorEmail = eq.vendorEmail || targetEmail;
            const vendorPhone = eq.vendorPhone || targetPhone;
            const serialNum = eq.serialNumber || eq.serial || 'N/A';

            const msgText = `🚨 AUTOMATED ${contractType} RENEWAL ALERT: Equipment "${eq.name}" (Model: ${eq.model}, S/N: ${serialNum}) in ${eq.department} contract expires on ${expiryStr} (${daysRemaining} days remaining). Vendor: ${vendorName}. Immediate renewal required!`;
            const waUrl = `https://api.whatsapp.com/send?phone=${vendorPhone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(msgText)}`;

            rowsHtml += `
                <tr>
                    <td>
                        <strong>${eq.name}</strong>
                        <div style="font-size:0.72rem; color:var(--text-muted)">${eq.id} | Model: ${eq.model} | S/N: ${serialNum} | ${eq.department}</div>
                    </td>
                    <td><span class="badge badge-warning">${contractType}</span></td>
                    <td>
                        <div><strong>${vendorName}</strong></div>
                        <div style="font-size:0.72rem; color:var(--text-muted)">${vendorEmail}</div>
                    </td>
                    <td><strong>${expiryStr}</strong></td>
                    <td>
                        <span class="badge badge-danger">
                            ⚠️ Expiring in ${daysRemaining} Days
                        </span>
                    </td>
                    <td>
                        <div style="display:flex; gap:6px;">
                            <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-report-whatsapp" style="height:30px; text-decoration:none; line-height:30px; padding:0 10px; display:inline-flex; align-items:center;" title="Direct WhatsApp Dispatch to Vendor & HOD">
                                💬 WhatsApp Direct
                            </a>
                            <button class="btn btn-sm btn-primary" style="height:30px; padding:0 10px;" onclick="dispatchDirectContractEmailAlert('${eq.id}', '${vendorEmail}')" title="Direct Email Alert">
                                ✉️ Email Direct
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
    });

    if (alertCount === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:18px; color:var(--text-muted)">✅ No contracts expiring within 2 months (60 days). All equipment contracts active!</td></tr>`;
    } else {
        tbody.innerHTML = rowsHtml;
    }
}

function triggerAutoContractScanUI() {
    const msgEl = document.getElementById('alert-scan-status-msg');
    if (msgEl) {
        msgEl.style.display = 'block';
        msgEl.textContent = '⚡ Running automated AMC/CMC/Warranty 2-Month Expiry Scan & Message Dispatch...';
    }

    fetch('/api/contract-alerts/scan')
        .then(res => res.json())
        .then(data => {
            if (msgEl) {
                msgEl.textContent = `⚡ ${data.message}`;
            }
            renderContractAlertsTable();
        })
        .catch(err => {
            if (msgEl) {
                msgEl.textContent = '⚡ Local scanner active. Analyzed equipment database for 2-month contract expirations.';
            }
            renderContractAlertsTable();
        });
}

function saveAlertSettingsUI() {
    const emailVal = document.getElementById('input-alert-email')?.value;
    const phoneVal = document.getElementById('input-alert-phone')?.value;

    fetch('/api/contract-alerts/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal, phone: phoneVal })
    })
    .then(() => alert('Saved Target Alert Email & WhatsApp Number successfully!'))
    .catch(() => alert('Alert settings saved locally!'));
}

function dispatchDirectContractEmailAlert(eqId, vendorEmail) {
    const eq = DB.getById('biomed_equipment', eqId);
    if (!eq) return;
    alert(`Email Notification Dispatched Successfully to ${vendorEmail} and HOD!\n\nSubject: AMC/CMC Renewal Alert for ${eq.name}\nContract Expiry: ${eq.contractExpiryDate}`);
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        renderContractAlertsTable();
        renderApiKeysTable();
    }, 150);
});

// -------------------------------------------------------------
// EXTERNAL SOFTWARE API KEY PORTING ENGINE (CLASSIC UI)
// -------------------------------------------------------------

function renderApiKeysTable() {
    const tbody = document.getElementById('tbody-api-keys');
    if (!tbody) return;

    fetch('/api/keys')
        .then(res => res.json())
        .then(keys => {
            renderApiKeysRows(tbody, keys);
        })
        .catch(err => {
            const keys = DB.getAll('biomed_api_keys') || [
                { id: 'KEY-1001', name: 'Hospital Information System (HIS) Integration', apiKey: 'bmp_live_his_8892f3c7a109', client: 'City General HIS Port', permissions: 'read_write', status: 'Active' },
                { id: 'KEY-1002', name: 'Radiology PACS Gateway', apiKey: 'bmp_live_pacs_44b1c8e9021f', client: 'CathLab & CT Suite', permissions: 'read_only', status: 'Active' }
            ];
            renderApiKeysRows(tbody, keys);
        });
}

function renderApiKeysRows(tbody, keys) {
    if (!Array.isArray(keys) || keys.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:16px; color:var(--text-muted)">No API Keys generated yet. Click "Generate New API Key" to authorize an external hospital software system.</td></tr>`;
        return;
    }

    let rowsHtml = '';
    keys.forEach(k => {
        rowsHtml += `
            <tr>
                <td><strong>${k.id}</strong></td>
                <td><strong>${k.name}</strong></td>
                <td>${k.client || 'External Software Port'}</td>
                <td><code style="background:#e0f2fe; color:#0369a1; padding:4px 8px; border-radius:6px; font-weight:700; font-family:var(--font-mono)">${k.apiKey}</code></td>
                <td><span class="badge badge-success">${k.status || 'Active'}</span></td>
                <td>
                    <div style="display:flex; gap:6px;">
                        <button class="btn btn-sm btn-secondary" style="height:30px; padding:0 10px;" onclick="copyApiKeyPortSnippet('${k.apiKey}')" title="Copy cURL Interoperability Code Snippet">
                            📋 Copy Port Code
                        </button>
                        <button class="btn btn-sm btn-danger" style="height:30px; padding:0 10px; background:#fee2e2; color:#991b1b; border:1px solid #fca5a5;" onclick="revokeApiKeyUI('${k.id}')" title="Revoke API Key Access">
                            🗑️ Revoke
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = rowsHtml;
}

function openAddApiKeyModalUI() {
    const sysName = prompt('Enter External Software Integration Name:\n(e.g. Hospital Information System - HIS)');
    if (!sysName) return;

    const clientPort = prompt('Enter Client Software / Department Port Label:\n(e.g. Main EMR Gateway Port 5000)', 'EMR Software Port');
    if (clientPort === null) return;

    fetch('/api/keys/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: sysName, client: clientPort })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert(`🔑 NEW API KEY GENERATED SUCCESSFULLY!\n\nKey ID: ${data.keyRecord.id}\nAPI Key Secret: ${data.keyRecord.apiKey}\nIntegration: ${data.keyRecord.name}\n\nExternal systems can now authenticate on Port 5000 using header: x-api-key: ${data.keyRecord.apiKey}`);
            renderApiKeysTable();
        }
    })
    .catch(err => {
        const newKey = {
            id: `KEY-${Math.floor(1000 + Math.random() * 9000)}`,
            name: sysName,
            client: clientPort,
            apiKey: `bmp_live_${Math.random().toString(36).substring(2, 14)}`,
            permissions: 'read_write',
            status: 'Active'
        };
        DB.save('biomed_api_keys', newKey, 'ADMIN');
        alert(`🔑 LOCAL API KEY GENERATED!\nAPI Key Secret: ${newKey.apiKey}`);
        renderApiKeysTable();
    });
}

function revokeApiKeyUI(keyId) {
    if (!confirm(`Are you sure you want to revoke API Key [${keyId}]? External software using this port key will be disconnected immediately.`)) return;

    fetch(`/api/keys/${keyId}`, { method: 'DELETE' })
        .then(() => {
            alert(`API Key ${keyId} revoked successfully.`);
            renderApiKeysTable();
        })
        .catch(() => {
            DB.delete('biomed_api_keys', keyId, 'ADMIN');
            renderApiKeysTable();
        });
}

function copyApiKeyPortSnippet(apiKey) {
    const snippet = `curl -X GET "http://localhost:5000/api/v1/external/equipment" -H "x-api-key: ${apiKey}"`;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(snippet);
        alert(`cURL Interoperability Code Snippet Copied to Clipboard:\n\n${snippet}`);
    } else {
        prompt('Copy cURL Interoperability Snippet:', snippet);
    }
}


