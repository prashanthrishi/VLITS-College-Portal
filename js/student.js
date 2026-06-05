/* ==========================================================================
   Vignan's Lara Institute of Technology & Science (VLITS) Student Dashboard Logic
   Upgraded: Handles asynchronous backend database integrations.
   ========================================================================== */

let currentStudent = null;
let charts = {};

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verify Authentication
    const session = await DB.getLoggedInUser();
    if (!session || session.type !== 'student') {
        window.location.href = 'student-login.html';
        return;
    }
    
    currentStudent = session.user;
    if (currentStudent.status === 'suspended') {
        DB.logout();
        window.location.href = 'student-login.html?suspended=true';
        return;
    }
    
    // 2. Initialize UI Panels
    setupSidebarNavigation();
    renderStudentProfile();
    renderAttendanceLedger();
    renderGradesheet();
    renderFeesLedger();
    renderDashboardOverview();
    initCharts();
    setupCalculatorDropdown();
    runCalculator();
    
    // Toast login notification
    showToast("Logged in as " + currentStudent.name, "🎓");
});

// Switch Tab Navigation
function setupSidebarNavigation() {
    const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = item.getAttribute('data-tab');
            
            // Remove active classes
            menuItems.forEach(mi => mi.classList.remove('active'));
            document.querySelectorAll('.dashboard-tab').forEach(tab => tab.classList.remove('active-tab'));
            
            // Set active
            item.classList.add('active');
            const targetEl = document.getElementById(targetTab);
            if (targetEl) {
                targetEl.classList.add('active-tab');
            }
            
            // Special triggers for specific tabs
            if (targetTab === 'tab-stats') {
                setTimeout(updateCharts, 100);
            } else if (targetTab === 'tab-student-appointments') {
                loadStudentAppointmentsTab();
            } else if (targetTab === 'tab-student-advisor-chat') {
                loadStudentChatTab();
            }
        });
    });
}

function switchToTab(tabId) {
    const item = document.querySelector(`.sidebar-menu .menu-item[data-tab="${tabId}"]`);
    if (item) {
        item.click();
    }
}

// Render Student Details
function renderStudentProfile() {
    document.getElementById('student-header-name').innerText = `${currentStudent.name} (${currentStudent.regdNo.toUpperCase()})`;
    document.getElementById('student-header-sem').innerText = `B.Tech ${currentStudent.branch} - ${currentStudent.year} ${currentStudent.semester}`;
    
    document.getElementById('sidebar-name').innerText = currentStudent.name;
    document.getElementById('sidebar-regd').innerText = currentStudent.regdNo.toUpperCase();
    document.getElementById('sidebar-avatar').innerText = currentStudent.profileImg || "👨‍🎓";
    
    // Safely populate fallback elements if they exist
    const pName = document.getElementById('profile-name-val');
    if (pName) pName.innerText = currentStudent.name;
    const pRegd = document.getElementById('profile-regd-val');
    if (pRegd) pRegd.innerText = currentStudent.regdNo.toUpperCase();
    const pDept = document.getElementById('profile-dept-val');
    if (pDept) pDept.innerText = currentStudent.branch;
    const pSem = document.getElementById('profile-sem-val');
    if (pSem) pSem.innerText = `${currentStudent.year}, ${currentStudent.semester}`;
    const pSec = document.getElementById('profile-sec-val');
    if (pSec) pSec.innerText = `Section ${currentStudent.section}`;
    
    // Populate Digital ID Card values
    const idName = document.getElementById('id-card-name');
    if (idName) idName.innerText = currentStudent.name;
    const idRegd = document.getElementById('id-card-regd');
    if (idRegd) idRegd.innerText = currentStudent.regdNo.toUpperCase();
    const idBranch = document.getElementById('id-card-branch');
    if (idBranch) idBranch.innerText = currentStudent.branch;
    const idSecSem = document.getElementById('id-card-sec-sem');
    if (idSecSem) idSecSem.innerText = `Sec ${currentStudent.section} / ${currentStudent.semester}`;
    const idLibReg = document.getElementById('id-card-lib-reg');
    if (idLibReg) idLibReg.innerText = `LIB-${currentStudent.regdNo.toUpperCase()}`;
    
    // Bind faculty advisor feedback remarks
    const remarksEl = document.getElementById('overview-advisor-remarks');
    if (remarksEl) {
        remarksEl.innerText = currentStudent.remarks || "No feedback entered yet.";
    }
}

// Render Dashboard Overview Tab
function renderDashboardOverview() {
    // 1. Calculate overall aggregate attendance
    let totalAttended = 0;
    let totalConducted = 0;
    
    currentStudent.attendance.forEach(sub => {
        totalAttended += sub.attended;
        totalConducted += sub.conducted;
    });
    
    const percentage = totalConducted > 0 ? ((totalAttended / totalConducted) * 100) : 0;
    const formattedPercent = percentage.toFixed(2) + "%";
    
    document.getElementById('stat-agg-attendance').innerText = formattedPercent;
    document.getElementById('overview-progress-percent').innerText = formattedPercent;
    
    // Set SVG progress ring values
    const progressCircle = document.getElementById('overview-progress-ring');
    const radius = progressCircle.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    
    progressCircle.style.strokeDasharray = circumference;
    const offset = circumference - (percentage / 100) * circumference;
    progressCircle.style.strokeDashoffset = offset;
    
    // Adjust colors and warnings based on JNTUK autonomous parameters
    const labelEl = document.getElementById('overview-progress-status-label');
    const descEl = document.getElementById('overview-progress-desc');
    const badgeContainer = document.getElementById('overview-badge-container');
    const statIcon = document.getElementById('stat-attendance-icon');
    
    let badgeHtml = '';
    const isDetainedByHod = currentStudent.status === 'detained';
    
    if (percentage >= 75 && !isDetainedByHod) {
        progressCircle.style.stroke = "var(--color-safe)";
        labelEl.innerText = "SAFE & ELIGIBLE";
        labelEl.style.color = "var(--color-safe)";
        descEl.innerText = "Your aggregate attendance is above the 75% autonomous threshold. Eligible to take semester-end examinations.";
        badgeHtml = '<span class="badge badge-safe">Eligible</span>';
        statIcon.style.color = "var(--color-safe)";
    } else if (percentage >= 65 && !isDetainedByHod) {
        progressCircle.style.stroke = "var(--color-condonation)";
        labelEl.innerText = "CONDONATION REQUIRED";
        labelEl.style.color = "var(--color-condonation)";
        descEl.innerText = "Aggregate between 65% and 75%. You must pay the condonation fee and submit medical records to secure eligibility.";
        badgeHtml = '<span class="badge badge-condonation">Condonation Required</span>';
        statIcon.style.color = "var(--color-condonation)";
    } else {
        progressCircle.style.stroke = "var(--color-danger)";
        labelEl.innerText = "DETAINED ZONE";
        labelEl.style.color = "var(--color-danger)";
        if (isDetainedByHod) {
            descEl.innerHTML = `<strong style="color: var(--color-danger);">OFFICIAL DETENTION ORDER:</strong> You have been officially detained by HOD Dr. K. Srinivas Rao due to academic non-compliance. Contact the department administration.`;
        } else {
            descEl.innerText = "Below 65% threshold. You are ineligible to write exams and will be detained for the semester under regulation rules.";
        }
        badgeHtml = '<span class="badge badge-danger">Detained</span>';
        statIcon.style.color = "var(--color-danger)";
    }
    
    badgeContainer.innerHTML = badgeHtml;
    
    // 2. Mid-I Performance calculation
    let totalMid1Obtained = 0;
    let totalMid1Max = 0;
    
    Object.keys(currentStudent.marks).forEach(subCode => {
        const subMarks = currentStudent.marks[subCode];
        if (subMarks && subMarks.mid1 !== null) {
            totalMid1Obtained += subMarks.mid1;
            totalMid1Max += 20;
        }
    });
    
    const mid1Percent = totalMid1Max > 0 ? ((totalMid1Obtained / totalMid1Max) * 100) : 0;
    document.getElementById('stat-mid-performance').innerText = mid1Percent.toFixed(1) + "%";
    
    // 3. Fee Dues calculation
    let totalDues = 0;
    Object.keys(currentStudent.fees).forEach(feeKey => {
        const fee = currentStudent.fees[feeKey];
        totalDues += (fee.total - fee.paid);
    });
    
    const duesValue = document.getElementById('stat-fee-dues');
    duesValue.innerText = "₹" + totalDues.toLocaleString('en-IN');
    
    const feeCard = document.getElementById('fee-due-card');
    if (totalDues > 0) {
        feeCard.classList.add('stat-card-accent');
        duesValue.style.color = "var(--color-secondary)";
    } else {
        feeCard.classList.remove('stat-card-accent');
        duesValue.style.color = "var(--color-safe)";
    }

    // 4. Render alerts/notifications
    renderDashboardAlerts(percentage, totalDues);
}

// Generate warnings/action tasks inside Overview
function renderDashboardAlerts(aggPercent, feeDues) {
    const listEl = document.getElementById('dashboard-alerts-list');
    let alertsHtml = '';
    
    const isDetainedByHod = currentStudent.status === 'detained';
    
    if (isDetainedByHod) {
        alertsHtml += `
            <div style="background-color: var(--color-danger-bg); border-left: 4px solid var(--color-danger); padding: 0.75rem 1rem; border-radius: 4px; font-size: 0.85rem; margin-bottom: 0.75rem; color: #991B1B;">
                🚨 <strong>Administrative Detention Order:</strong> You have been officially detained for this semester by HOD Dr. K. Srinivas Rao. You are not eligible to register or sit for the upcoming semester-end examinations. Contact the department office immediately.
            </div>
        `;
    } else if (aggPercent < 75 && aggPercent >= 65) {
        alertsHtml += `
            <div style="background-color: var(--color-condonation-bg); border-left: 4px solid var(--color-condonation); padding: 0.75rem 1rem; border-radius: 4px; font-size: 0.85rem; margin-bottom: 0.75rem; color: #92400E;">
                ⚠️ <strong>Condonation Risk:</strong> Your aggregate attendance is <strong>${aggPercent.toFixed(2)}%</strong>. Access the Attendance Calculator to simulate the number of classes you need to attend consecutively to reach 75%. Submit your Medical Certificate before the last working day.
            </div>
        `;
    } else if (aggPercent < 65) {
        alertsHtml += `
            <div style="background-color: var(--color-danger-bg); border-left: 4px solid var(--color-danger); padding: 0.75rem 1rem; border-radius: 4px; font-size: 0.85rem; margin-bottom: 0.75rem; color: #991B1B;">
                🚨 <strong>Critical Detainment Alert:</strong> Your aggregate attendance has fallen to <strong>${aggPercent.toFixed(2)}%</strong>. You are currently in the detention zone. Seek counseling with HOD immediately.
            </div>
        `;
    } else {
        alertsHtml += `
            <div style="background-color: var(--color-safe-bg); border-left: 4px solid var(--color-safe); padding: 0.75rem 1rem; border-radius: 4px; font-size: 0.85rem; margin-bottom: 0.75rem; color: #065F46;">
                ✅ <strong>Regulation Compliant:</strong> Great job! Your aggregate attendance is <strong>${aggPercent.toFixed(2)}%</strong>. You meet the autonomous college examination criteria. Keep it up!
            </div>
        `;
    }
    
    if (feeDues > 0) {
        alertsHtml += `
            <div style="background-color: #FEF2F2; border-left: 4px solid var(--color-secondary); padding: 0.75rem 1rem; border-radius: 4px; font-size: 0.85rem; margin-bottom: 0.75rem; color: var(--color-secondary);">
                💸 <strong>Outstanding Dues:</strong> You have an outstanding academic fee balance of <strong>₹${feeDues.toLocaleString('en-IN')}</strong>. Clear your exam fees or tuition balances to avoid examination hall ticket blockades.
            </div>
        `;
    } else {
        alertsHtml += `
            <div style="background-color: #ECFDF5; border-left: 4px solid var(--color-safe); padding: 0.75rem 1rem; border-radius: 4px; font-size: 0.85rem; margin-bottom: 0.75rem; color: #065F46;">
                💰 <strong>Accounts Cleared:</strong> All your semester fees have been paid. No outstanding balances detected. Receipt copies are available in the Fee Payment tab.
            </div>
        `;
    }
    
    listEl.innerHTML = alertsHtml;
}

// Render Attendance Ledger
function renderAttendanceLedger() {
    const tbody = document.getElementById('attendance-table-body');
    tbody.innerHTML = '';
    
    currentStudent.attendance.forEach(sub => {
        const percent = sub.conducted > 0 ? (sub.attended / sub.conducted * 100) : 0;
        let badgeClass = 'badge-safe';
        let statusText = 'SAFE';
        
        if (percent >= 75) {
            badgeClass = 'badge-safe';
            statusText = 'SAFE';
        } else if (percent >= 65) {
            badgeClass = 'badge-condonation';
            statusText = 'CONDONATION';
        } else {
            badgeClass = 'badge-danger';
            statusText = 'DETAINED';
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="font-bold" style="color: var(--color-primary);">${sub.code}</td>
            <td>${sub.name}</td>
            <td class="text-center font-bold">${sub.attended}</td>
            <td class="text-center">${sub.conducted}</td>
            <td class="text-center font-bold" style="color: ${percent >= 75 ? 'var(--color-safe)' : (percent >= 65 ? 'var(--color-condonation)' : 'var(--color-danger)')};">
                ${percent.toFixed(2)}%
            </td>
            <td><span class="badge ${badgeClass}">${statusText}</span></td>
        `;
        tbody.appendChild(row);
    });
}

// Render Gradesheet
function renderGradesheet() {
    const tbody = document.getElementById('marks-table-body');
    tbody.innerHTML = '';
    
    currentStudent.attendance.forEach(sub => {
        const mark = currentStudent.marks[sub.code] || { mid1: null, mid2: null, assignment: null, external: null };
        
        const m1 = mark.mid1 !== null ? mark.mid1 : "-";
        const m2 = mark.mid2 !== null ? mark.mid2 : "-";
        const assign = mark.assignment !== null ? mark.assignment : "-";
        
        let avgInternals = "-";
        if (mark.mid1 !== null) {
            if (mark.mid2 !== null) {
                const bestMid = Math.max(mark.mid1, mark.mid2);
                const leastMid = Math.min(mark.mid1, mark.mid2);
                avgInternals = ((0.8 * bestMid) + (0.2 * leastMid) + (mark.assignment || 0)).toFixed(1);
            } else {
                avgInternals = (mark.mid1 + (mark.assignment || 0)).toFixed(1);
            }
        }
        
        const external = mark.external !== null ? mark.external : "-";
        
        let total = "-";
        if (avgInternals !== "-" && mark.external !== null) {
            total = Math.round(parseFloat(avgInternals) + mark.external);
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="font-bold" style="color: var(--color-primary);">${sub.code}</td>
            <td>${sub.name}</td>
            <td class="text-center">${m1}</td>
            <td class="text-center">${m2}</td>
            <td class="text-center">${assign}</td>
            <td class="text-center font-bold" style="color: var(--color-primary-light);">${avgInternals}</td>
            <td class="text-center">${external}</td>
            <td class="text-center font-bold" style="${total !== "-" && total >= 40 ? 'color: var(--color-safe);' : (total !== "-" ? 'color: var(--color-danger);' : '')}">${total}</td>
        `;
        tbody.appendChild(row);
    });
}

// Render Fees Ledger Cards and Receipt Table
function renderFeesLedger() {
    const gridContainer = document.getElementById('fees-grid-container');
    gridContainer.innerHTML = '';
    
    let totalDues = 0;
    
    Object.keys(currentStudent.fees).forEach(feeKey => {
        const fee = currentStudent.fees[feeKey];
        const dueAmount = fee.total - fee.paid;
        totalDues += dueAmount;
        
        const categoryLabel = feeKey.charAt(0).toUpperCase() + feeKey.slice(1) + " Fee";
        const percentPaid = fee.total > 0 ? ((fee.paid / fee.total) * 100) : 0;
        
        const feeCard = document.createElement('div');
        feeCard.className = 'fee-card';
        feeCard.innerHTML = `
            <div>
                <div class="fee-card-header">
                    <span class="fee-title">${categoryLabel}</span>
                    <span class="badge ${dueAmount === 0 ? 'badge-safe' : 'badge-danger'}">
                        ${dueAmount === 0 ? 'Paid' : 'Pending'}
                    </span>
                </div>
                <div class="fee-amount">₹${dueAmount.toLocaleString('en-IN')}</div>
                <div style="background-color: #E2E8F0; height: 6px; border-radius:3px; overflow:hidden; margin-bottom:1rem;">
                    <div style="background-color: ${dueAmount === 0 ? 'var(--color-safe)' : 'var(--color-primary)'}; width: ${percentPaid}%; height: 100%;"></div>
                </div>
                <ul class="fee-details-list">
                    <li><span>Total Assessment:</span> <strong>₹${fee.total.toLocaleString('en-IN')}</strong></li>
                    <li><span>Amount Disbursed:</span> <strong>₹${fee.paid.toLocaleString('en-IN')}</strong></li>
                </ul>
            </div>
            ${dueAmount > 0 ? `<button class="btn btn-primary" style="width:100%; margin-top: 1rem;" onclick="openPaymentModal('${feeKey}', ${dueAmount})">Pay Outstanding Balance</button>` : `<button class="btn btn-outline btn-sm" style="width:100%; margin-top: 1rem;" disabled>Fully Settled</button>`}
        `;
        gridContainer.appendChild(feeCard);
    });

    const tbody = document.getElementById('payments-history-body');
    tbody.innerHTML = '';
    
    let hasTransactions = false;
    
    Object.keys(currentStudent.fees).forEach(feeKey => {
        const fee = currentStudent.fees[feeKey];
        const categoryLabel = feeKey.charAt(0).toUpperCase() + feeKey.slice(1) + " Fee";
        
        fee.history.forEach(txn => {
            hasTransactions = true;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${txn.date}</td>
                <td class="font-bold">${categoryLabel}</td>
                <td style="font-family: monospace; font-size:0.85rem; color:var(--color-text-muted);">${txn.ref}</td>
                <td class="text-right font-bold">₹${txn.amount.toLocaleString('en-IN')}</td>
                <td class="text-center"><span class="badge badge-safe">SUCCESS</span></td>
                <td class="text-center">
                    <button class="btn btn-outline btn-sm" style="padding: 0.25rem 0.5rem;" onclick="openReceiptPrintDirect('${feeKey}', '${txn.ref}', ${txn.amount}, '${txn.date}')">🖨️ View Receipt</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    });
    
    if (!hasTransactions) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted);">No fee transactions found on this account.</td></tr>`;
    }
}

// Payment Modal Actions
function openPaymentModal(feeKey, dueAmount) {
    const modal = document.getElementById('payment-modal');
    document.getElementById('pay-modal-fee-key').value = feeKey;
    
    const categoryLabel = feeKey.charAt(0).toUpperCase() + feeKey.slice(1) + " Fee";
    document.getElementById('pay-modal-category').innerText = categoryLabel;
    document.getElementById('pay-modal-balance').innerText = "₹" + dueAmount.toLocaleString('en-IN');
    
    const amountInput = document.getElementById('pay-amount-input');
    amountInput.value = dueAmount;
    amountInput.max = dueAmount;
    
    document.getElementById('payment-form-pane').style.display = 'block';
    document.getElementById('payment-success-pane').style.display = 'none';
    document.getElementById('payment-modal-footer').style.display = 'flex';
    
    modal.classList.add('active-modal');
}

function closePaymentModal() {
    document.getElementById('payment-modal').classList.remove('active-modal');
}

let activeReceipt = null;

async function submitPayment() {
    const form = document.getElementById('payment-process-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const feeKey = document.getElementById('pay-modal-fee-key').value;
    const amount = parseFloat(document.getElementById('pay-amount-input').value);
    
    // Simulate API loading
    const payBtn = document.querySelector('#payment-modal-footer .btn-primary');
    const originalText = payBtn.innerText;
    payBtn.innerText = "Authorizing Bank Card...";
    payBtn.disabled = true;
    
    try {
        const result = await DB.payFee(currentStudent.id, feeKey, amount);
        
        payBtn.innerText = originalText;
        payBtn.disabled = false;
        
        if (result.success) {
            // Update current student details from DB
            const session = await DB.getLoggedInUser();
            currentStudent = session.user;
            
            // Save receipt details for printing
            activeReceipt = {
                feeKey: feeKey,
                ref: result.ref,
                amount: result.amount,
                date: result.date
            };
            
            // Reveal success page in modal
            document.getElementById('payment-form-pane').style.display = 'none';
            document.getElementById('payment-modal-footer').style.display = 'none';
            
            const msgEl = document.getElementById('payment-success-message');
            const categoryLabel = feeKey.charAt(0).toUpperCase() + feeKey.slice(1) + " Fee";
            msgEl.innerHTML = `Transaction Completed Successfully.<br>Reference Ref: <strong>${result.ref}</strong>.<br>Amount Paid: <strong>₹${result.amount.toLocaleString('en-IN')}</strong> toward <strong>${categoryLabel}</strong>.`;
            
            document.getElementById('payment-success-pane').style.display = 'block';
            
            // Refresh tables and stats
            renderDashboardOverview();
            renderFeesLedger();
            showToast("Payment Successful: " + result.ref, "💸");
        } else {
            alert("Error conducting payment transaction: " + result.error);
        }
    } catch(err) {
        payBtn.innerText = originalText;
        payBtn.disabled = false;
        alert("Payment Error: " + err.message);
    }
}

// Print Receipt Operations
function printSimulatedReceipt() {
    if (!activeReceipt) return;
    
    preparePrintArea(activeReceipt.feeKey, activeReceipt.ref, activeReceipt.amount, activeReceipt.date);
    
    closePaymentModal();
    
    document.querySelector('.dashboard-wrapper').style.display = 'none';
    document.querySelector('.college-header').style.display = 'none';
    document.querySelector('.college-footer').style.display = 'none';
    document.getElementById('receipt-print-area').style.display = 'block';
    
    setTimeout(() => { window.print(); }, 200);
}

function openReceiptPrintDirect(feeKey, ref, amount, date) {
    activeReceipt = { feeKey, ref, amount, date };
    preparePrintArea(feeKey, ref, amount, date);
    
    document.querySelector('.dashboard-wrapper').style.display = 'none';
    document.querySelector('.college-header').style.display = 'none';
    document.querySelector('.college-footer').style.display = 'none';
    document.getElementById('receipt-print-area').style.display = 'block';
}

function preparePrintArea(feeKey, ref, amount, date) {
    const categoryLabel = feeKey.charAt(0).toUpperCase() + feeKey.slice(1) + " Fee";
    
    document.getElementById('receipt-val-regd').innerText = currentStudent.regdNo.toUpperCase();
    document.getElementById('receipt-val-name').innerText = currentStudent.name;
    document.getElementById('receipt-val-branch').innerText = `${currentStudent.branch} (${currentStudent.year})`;
    document.getElementById('receipt-val-date').innerText = date;
    document.getElementById('receipt-val-ref').innerText = ref;
    document.getElementById('receipt-val-desc').innerText = `${categoryLabel} Installment Dues Settle`;
    document.getElementById('receipt-val-amount').innerText = "₹" + amount.toLocaleString('en-IN') + ".00";
}

function closePrintView() {
    document.getElementById('receipt-print-area').style.display = 'none';
    document.querySelector('.dashboard-wrapper').style.display = 'flex';
    document.querySelector('.college-header').style.display = 'flex';
    document.querySelector('.college-footer').style.display = 'block';
}

// Chart.js Graphs Setup
function initCharts() {
    const subjects = currentStudent.attendance.map(s => s.code);
    const attendanceData = currentStudent.attendance.map(s => (s.attended / s.conducted * 100).toFixed(1));
    const marksData = currentStudent.attendance.map(s => currentStudent.marks[s.code]?.mid1 || 0);
    
    const borderColors = attendanceData.map(pct => pct >= 75 ? '#10B981' : (pct >= 65 ? '#F59E0B' : '#EF4444'));
    const fillColors = attendanceData.map(pct => pct >= 75 ? 'rgba(16, 185, 129, 0.2)' : (pct >= 65 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'));

    const ctxAttendance = document.getElementById('chart-attendance').getContext('2d');
    charts.attendance = new Chart(ctxAttendance, {
        type: 'bar',
        data: {
            labels: subjects,
            datasets: [{
                label: 'Current Subject Attendance (%)',
                data: attendanceData,
                backgroundColor: fillColors,
                borderColor: borderColors,
                borderWidth: 2,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    grid: { color: '#E2E8F0' },
                    ticks: { color: 'var(--color-text-muted)' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: 'var(--color-text-muted)', font: { weight: '600' } }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });

    const ctxMarks = document.getElementById('chart-marks').getContext('2d');
    charts.marks = new Chart(ctxMarks, {
        type: 'line',
        data: {
            labels: subjects,
            datasets: [{
                label: 'Mid-I Marks',
                data: marksData,
                backgroundColor: 'rgba(11, 37, 69, 0.1)',
                borderColor: 'var(--color-primary)',
                borderWidth: 3,
                tension: 0.3,
                fill: true,
                pointBackgroundColor: 'var(--color-secondary)',
                pointBorderColor: '#FFFFFF',
                pointBorderWidth: 2,
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 0,
                    max: 20,
                    grid: { color: '#E2E8F0' },
                    ticks: { color: 'var(--color-text-muted)', stepSize: 4 }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: 'var(--color-text-muted)', font: { weight: '600' } }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function updateCharts() {
    if (charts.attendance && charts.marks) {
        const attendanceData = currentStudent.attendance.map(s => (s.attended / s.conducted * 100).toFixed(1));
        const marksData = currentStudent.attendance.map(s => currentStudent.marks[s.code]?.mid1 || 0);
        
        const borderColors = attendanceData.map(pct => pct >= 75 ? '#10B981' : (pct >= 65 ? '#F59E0B' : '#EF4444'));
        const fillColors = attendanceData.map(pct => pct >= 75 ? 'rgba(16, 185, 129, 0.2)' : (pct >= 65 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'));
        
        charts.attendance.data.datasets[0].data = attendanceData;
        charts.attendance.data.datasets[0].backgroundColor = fillColors;
        charts.attendance.data.datasets[0].borderColor = borderColors;
        charts.attendance.update();
        
        charts.marks.data.datasets[0].data = marksData;
        charts.marks.update();
    }
}

// Attendance Calculator Logic
function setupCalculatorDropdown() {
    const select = document.getElementById('calc-subject-selector');
    
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    currentStudent.attendance.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub.code;
        opt.innerText = `${sub.name} (${sub.code})`;
        select.appendChild(opt);
    });
}

function loadSelectedCalcTarget() {
    const param = document.getElementById('calc-subject-selector').value;
    const attendedInput = document.getElementById('calc-input-attended');
    const conductedInput = document.getElementById('calc-input-conducted');
    
    if (param === 'aggregate') {
        let totalAttended = 0;
        let totalConducted = 0;
        
        currentStudent.attendance.forEach(sub => {
            totalAttended += sub.attended;
            totalConducted += sub.conducted;
        });
        
        attendedInput.value = totalAttended;
        conductedInput.value = totalConducted;
    } else {
        const sub = currentStudent.attendance.find(a => a.code === param);
        if (sub) {
            attendedInput.value = sub.attended;
            conductedInput.value = sub.conducted;
        }
    }
    
    runCalculator();
}

function updateSliderTargetVal() {
    const val = document.getElementById('calc-target-slider').value;
    document.getElementById('calc-slider-target-val').innerText = val + "%";
    
    const labelSpans = document.querySelectorAll('.target-pct-lbl');
    labelSpans.forEach(span => {
        span.innerText = val + "%";
    });
    
    runCalculator();
}

function runCalculator() {
    const attended = parseInt(document.getElementById('calc-input-attended').value) || 0;
    const conducted = parseInt(document.getElementById('calc-input-conducted').value) || 0;
    const targetPercentage = parseFloat(document.getElementById('calc-target-slider').value) || 75;
    
    const targetFrac = targetPercentage / 100;
    
    const resultStatus = document.getElementById('calc-result-status');
    const resultPercent = document.getElementById('calc-result-percent');
    const resultSummary = document.getElementById('calc-result-summary');
    const resultAttendClasses = document.getElementById('calc-result-classes-to-attend');
    const resultCanSkipClasses = document.getElementById('calc-result-classes-can-skip');
    const resultSafeguard = document.getElementById('calc-result-safeguard');
    
    const rowAttend = document.getElementById('calc-row-classes-to-attend');
    const rowSkip = document.getElementById('calc-row-classes-can-skip');
    const rowSafeguard = document.getElementById('calc-row-consecutive-safeguard');
    
    if (conducted <= 0) {
        resultPercent.innerText = "0.00%";
        return;
    }
    
    const currentPercent = (attended / conducted) * 100;
    resultPercent.innerText = currentPercent.toFixed(2) + "%";
    
    resultStatus.classList.remove('calc-status-safe', 'calc-status-condonation', 'calc-status-danger');
    
    if (currentPercent >= 75) {
        resultStatus.classList.add('calc-status-safe');
        resultStatus.innerText = `SAFE & ELIGIBLE (${currentPercent.toFixed(2)}%)`;
        resultSummary.innerText = "Meeting B.Tech Autonomous Standards";
    } else if (currentPercent >= 65) {
        resultStatus.classList.add('calc-status-condonation');
        resultStatus.innerText = `CONDONATION STAGE (${currentPercent.toFixed(2)}%)`;
        resultSummary.innerText = "Requires Medical Certificate & Condonation Fee";
    } else {
        resultStatus.classList.add('calc-status-danger');
        resultStatus.innerText = `DETAINED ZONE (${currentPercent.toFixed(2)}%)`;
        resultSummary.innerText = "Ineligible for Semester End Exams (Detained)";
    }
    
    if (currentPercent < targetPercentage) {
        const Y = Math.ceil((targetFrac * conducted - attended) / (1 - targetFrac));
        rowAttend.style.display = 'flex';
        rowSkip.style.display = 'none';
        resultAttendClasses.innerText = `${Y} class${Y !== 1 ? 'es' : ''} consecutively`;
        resultAttendClasses.style.color = "var(--color-danger)";
    } else {
        const X = Math.floor((attended - targetFrac * conducted) / targetFrac);
        rowAttend.style.display = 'none';
        rowSkip.style.display = 'flex';
        resultCanSkipClasses.innerText = `${X} class${X !== 1 ? 'es' : ''} safely`;
        resultCanSkipClasses.style.color = "var(--color-safe)";
    }
    
    if (currentPercent < 65) {
        const safeguardY = Math.ceil((0.65 * conducted - attended) / 0.35);
        rowSafeguard.style.display = 'flex';
        resultSafeguard.innerText = `${safeguardY} class${safeguardY !== 1 ? 'es' : ''} consecutively`;
        resultSafeguard.style.color = "var(--color-secondary)";
    } else {
        rowSafeguard.style.display = 'none';
    }
}

// Toast alerts
function showToast(message, icon = "ℹ️") {
    const toast = document.getElementById('dashboard-toast');
    document.getElementById('toast-icon').innerText = icon;
    document.getElementById('toast-message').innerText = message;
    
    toast.classList.add('active-toast');
    setTimeout(() => {
        toast.classList.remove('active-toast');
    }, 3000);
}

// Logout student
function logoutStudent() {
    DB.logout();
    window.location.href = 'student-login.html';
}

// Appointments Scheduler Logic
async function loadStudentAppointmentsTab() {
    try {
        // 1. Populate Faculty Dropdown if empty
        const select = document.getElementById('appt-faculty-select');
        if (select && select.children.length === 0) {
            const facultyList = await DB.getFaculty();
            select.innerHTML = '<option value="">-- Choose a Advisor / Faculty --</option>';
            facultyList.forEach(fac => {
                const opt = document.createElement('option');
                opt.value = fac.id;
                opt.innerText = `${fac.name} (${fac.designation} - ${fac.department})`;
                select.appendChild(opt);
            });
        }

        // 2. Set default date to tomorrow
        const dateInput = document.getElementById('appt-date-input');
        if (dateInput && !dateInput.value) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            dateInput.value = tomorrow.toISOString().split('T')[0];
        }

        // 3. Render Appointments History Table
        await renderStudentAppointmentsHistory();
    } catch (err) {
        console.error("Error loading appointments tab:", err);
    }
}

async function renderStudentAppointmentsHistory() {
    try {
        const list = await DB.getAppointments({ studentId: currentStudent.id });
        const tbody = document.getElementById('student-appointments-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color: var(--color-text-muted); padding: 1.5rem;">No appointments requested yet.</td></tr>';
            return;
        }

        list.forEach(appt => {
            const statusClass = appt.status === 'approved' ? 'badge-safe' : (appt.status === 'rejected' ? 'badge-danger' : 'badge-condonation');
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="padding: 0.75rem 1rem; font-weight: 700; color: var(--color-primary);">${appt.faculty_name}</td>
                <td style="padding: 0.75rem 1rem; font-weight: 600;">${appt.request_date}</td>
                <td style="padding: 0.75rem 1rem;">${appt.request_time}</td>
                <td style="padding: 0.75rem 1rem;"><span class="badge ${statusClass}">${appt.status.toUpperCase()}</span></td>
                <td style="padding: 0.75rem 1rem; font-weight: 700; color: var(--color-secondary);">${appt.assigned_time || '<span style="color:var(--color-text-muted);font-weight:normal;">--</span>'}</td>
                <td style="padding: 0.75rem 1rem; font-size: 0.8rem; line-height: 1.3;">${appt.remarks || '<span style="color:var(--color-text-muted);">--</span>'}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        console.error("Error rendering appointments history:", err);
    }
}

async function submitAppointmentRequest() {
    try {
        const facultyId = document.getElementById('appt-faculty-select').value;
        const requestDate = document.getElementById('appt-date-input').value;
        const requestTime = document.getElementById('appt-time-input').value.trim();
        const reason = document.getElementById('appt-reason-input').value.trim();

        if (!facultyId || !requestDate || !requestTime || !reason) {
            alert("Please fill in all the required appointment fields.");
            return;
        }

        // Get faculty name from dropdown text
        const select = document.getElementById('appt-faculty-select');
        const facultyName = select.options[select.selectedIndex].text.split(' (')[0];

        const success = await DB.requestAppointment(
            currentStudent.id,
            currentStudent.name,
            facultyId,
            facultyName,
            requestDate,
            requestTime,
            reason
        );

        if (success) {
            showToast("Appointment request submitted!", "📅");
            // Clear inputs
            document.getElementById('appt-time-input').value = '';
            document.getElementById('appt-reason-input').value = '';
            // Re-render
            await renderStudentAppointmentsHistory();
        } else {
            alert("Failed to submit appointment request.");
        }
    } catch (err) {
        console.error("Error submitting appointment request:", err);
    }
}

// ==========================================================================
// Digital ID Card Flip
// ==========================================================================
function toggleIdCardFlip() {
    const card = document.getElementById('digital-id-card');
    if (card) {
        card.classList.toggle('flipped');
    }
}

// ==========================================================================
// Advisor Chat Terminal Logic
// ==========================================================================
let chatAdvisorId = 'hod';
let chatAdvisorName = 'Dr. K. Srinivas Rao';
let chatAdvisorDesig = 'HOD - Computer Science & Engineering';

async function loadStudentChatTab() {
    try {
        const facultyList = await DB.getFaculty();
        const hod = facultyList.find(f => f.role === 'hod');
        if (hod) {
            chatAdvisorId = hod.id;
            chatAdvisorName = hod.name;
            chatAdvisorDesig = `${hod.designation} - ${hod.department}`;
        }
        
        document.getElementById('chat-advisor-name').innerText = chatAdvisorName;
        document.getElementById('chat-advisor-desig').innerText = chatAdvisorDesig;
        
        await renderStudentChatMessages();
    } catch (err) {
        console.error("Error loading student chat tab:", err);
    }
}

async function renderStudentChatMessages() {
    try {
        const messages = await DB.getChatMessages(currentStudent.id, chatAdvisorId);
        const chatBox = document.getElementById('chat-messages-box');
        if (!chatBox) return;
        
        chatBox.innerHTML = '';
        if (messages.length === 0) {
            chatBox.innerHTML = `
                <div style="display: flex; height: 100%; align-items: center; justify-content: center; color: var(--color-text-muted); flex-direction: column; gap: 0.5rem;">
                    <span style="font-size: 2rem;">💬</span>
                    <span>No messages exchanged yet. Send a query below to start the thread.</span>
                </div>`;
            return;
        }
        
        messages.forEach(msg => {
            const isStudent = msg.sender === 'student';
            const bubble = document.createElement('div');
            bubble.className = `chat-bubble ${isStudent ? 'chat-bubble-student' : 'chat-bubble-faculty'}`;
            
            bubble.innerHTML = `
                <div>${msg.message}</div>
                <span class="chat-bubble-timestamp">${msg.timestamp}</span>
            `;
            chatBox.appendChild(bubble);
        });
        
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (err) {
        console.error("Error rendering student chat messages:", err);
    }
}

async function sendStudentChatMessage() {
    try {
        const input = document.getElementById('chat-student-input');
        if (!input) return;
        
        const text = input.value.trim();
        if (!text) return;
        
        const success = await DB.sendChatMessage(
            currentStudent.id,
            currentStudent.name,
            chatAdvisorId,
            text,
            'student'
        );
        
        if (success) {
            input.value = '';
            await renderStudentChatMessages();
        } else {
            alert("Failed to send message.");
        }
    } catch (err) {
        console.error("Error sending student chat message:", err);
    }
}
