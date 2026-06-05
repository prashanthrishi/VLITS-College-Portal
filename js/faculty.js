/* ==========================================================================
   Vignan's Lara Institute of Technology & Science (VLITS) Faculty Logic
   Upgraded: Handles asynchronous backend database integrations.
   ========================================================================== */

let currentFaculty = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verify Authentication
    const session = await DB.getLoggedInUser();
    if (!session || session.type !== 'faculty') {
        window.location.href = 'faculty-login.html';
        return;
    }
    
    currentFaculty = session.user;
    if (currentFaculty) {
        currentFaculty.subjects = currentFaculty.subjects || [];
    }
    
    // 2. Initialize UI Panels
    setupSidebarNavigation();
    
    try {
        await renderFacultyProfile();
    } catch (profileErr) {
        console.error("Error rendering faculty profile details:", profileErr);
    }
    
    applyRoleBasedViews();
    
    // Set default dates
    const dateInput = document.getElementById('att-date');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    // Toast login notification
    showToast("Logged in as " + currentFaculty.name, "👨‍🏫");
});

// Sidebar Navigation
function setupSidebarNavigation() {
    const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', async (e) => {
            e.preventDefault();
            const targetTab = item.getAttribute('data-tab');
            
            // Route guard: Block unauthorized access
            if (targetTab === 'tab-faculty-hod' && currentFaculty.role !== 'hod') {
                showToast("Access Denied: HOD Console only.", "❌");
                return;
            }
            const principalTabs = ['tab-faculty-principal', 'tab-principal-notices', 'tab-principal-students', 'tab-principal-leaves', 'tab-principal-faculty'];
            if (principalTabs.includes(targetTab) && currentFaculty.role !== 'principal') {
                showToast("Access Denied: Principal Console only.", "❌");
                return;
            }
            
            // Remove active classes
            menuItems.forEach(mi => mi.classList.remove('active'));
            document.querySelectorAll('.dashboard-tab').forEach(tab => tab.classList.remove('active-tab'));
            
            // Set active
            item.classList.add('active');
            const targetEl = document.getElementById(targetTab);
            if (targetEl) {
                targetEl.classList.add('active-tab');
            }
            
            // Reset roster views
            const rosterAtt = document.getElementById('roster-panel-attendance');
            const rosterMarks = document.getElementById('roster-panel-marks');
            if (rosterAtt) rosterAtt.style.display = 'none';
            if (rosterMarks) rosterMarks.style.display = 'none';

            // Refresh dashboards
            if (targetTab === 'tab-faculty-overview') {
                renderCourseLoad();
            } else if (targetTab === 'tab-faculty-analytics') {
                await renderRosterAudit();
            } else if (targetTab === 'tab-faculty-hod') {
                await loadHodConsole();
            } else if (targetTab === 'tab-faculty-leaves') {
                await loadFacultyLeaves();
            } else if (targetTab === 'tab-faculty-appointments') {
                await loadFacultyAppointmentsTab();
            } else if (targetTab === 'tab-faculty-chat') {
                await loadFacultyChatTab();
            } else if (targetTab === 'tab-faculty-principal') {
                await loadPrincipalOverview();
            } else if (targetTab === 'tab-principal-notices') {
                await loadPrincipalAnnouncements();
            } else if (targetTab === 'tab-principal-students') {
                await loadPrincipalStudentRoster();
            } else if (targetTab === 'tab-principal-leaves') {
                await loadPrincipalLeaveApprovals();
            } else if (targetTab === 'tab-principal-faculty') {
                await loadPrincipalFacultyRoster();
            }
        });
    });
}

function switchToTab(tabId) {
    if (tabId === 'tab-faculty-hod' && currentFaculty.role !== 'hod') {
        showToast("Access Denied: HOD Console only.", "❌");
        return;
    }
    const principalTabs = ['tab-faculty-principal', 'tab-principal-notices', 'tab-principal-students', 'tab-principal-leaves', 'tab-principal-faculty'];
    if (principalTabs.includes(tabId) && currentFaculty.role !== 'principal') {
        showToast("Access Denied: Principal Console only.", "❌");
        return;
    }
    const item = document.querySelector(`.sidebar-menu .menu-item[data-tab="${tabId}"]`);
    if (item) {
        item.click();
    }
}

function applyRoleBasedViews() {
    if (currentFaculty.role === 'principal') {
        // Hide standard faculty sidebar menu items
        const tabsToHide = [
            'tab-faculty-overview',
            'tab-faculty-attendance',
            'tab-faculty-marks',
            'tab-faculty-import',
            'tab-faculty-analytics',
            'tab-faculty-leaves'
        ];
        tabsToHide.forEach(tabId => {
            const item = document.querySelector(`.sidebar-menu .menu-item[data-tab="${tabId}"]`);
            if (item) item.style.display = 'none';
        });

        // Show Principal sidebar menu items
        const prItems = [
            'sidebar-pr-dashboard',
            'sidebar-pr-notices',
            'sidebar-pr-students',
            'sidebar-pr-leaves',
            'sidebar-pr-faculty'
        ];
        prItems.forEach(id => {
            const item = document.getElementById(id);
            if (item) item.style.display = 'block';
        });

        // Toggle active class on sidebar items
        const overviewItem = document.querySelector(`.sidebar-menu .menu-item[data-tab="tab-faculty-overview"]`);
        if (overviewItem) overviewItem.classList.remove('active');
        
        const prDashboardItem = document.getElementById('sidebar-pr-dashboard');
        if (prDashboardItem) prDashboardItem.classList.add('active');

        // Toggle active-tab class on tab panels
        const overviewTab = document.getElementById('tab-faculty-overview');
        if (overviewTab) overviewTab.classList.remove('active-tab');
        
        const prDashboardTab = document.getElementById('tab-faculty-principal');
        if (prDashboardTab) prDashboardTab.classList.add('active-tab');

        // Initial load for overview
        loadPrincipalOverview();
    } else {
        // HOD or default Faculty
        if (currentFaculty.role === 'hod') {
            const hodItem = document.getElementById('sidebar-hod-item');
            if (hodItem) hodItem.style.display = 'block';
        }
        
        renderCourseLoad();
        populateSubjectSelectors();
        renderRosterAudit();
    }
}

async function loadPrincipalOverview() {
    try {
        const students = await DB.getStudents();
        const facultyList = await DB.getFaculty();
        const announcements = await DB.getAnnouncements();
        const leaves = await DB.getLeaves();
        
        const totalStudents = students.length;
        const totalFaculty = facultyList.length;
        const activeNotices = announcements.length;
        const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
        
        const prStatStudents = document.getElementById('pr-stat-students');
        const prStatFaculty = document.getElementById('pr-stat-faculty');
        const prStatNotices = document.getElementById('pr-stat-notices');
        const prStatLeaves = document.getElementById('pr-stat-leaves');
        
        if (prStatStudents) prStatStudents.innerText = totalStudents;
        if (prStatFaculty) prStatFaculty.innerText = totalFaculty;
        if (prStatNotices) prStatNotices.innerText = activeNotices;
        if (prStatLeaves) prStatLeaves.innerText = pendingLeaves;
        
        // Render dynamic overview reports
        setTimeout(() => {
            renderPrincipalAnalyticsCharts(students, leaves, facultyList);
        }, 100);
    } catch (err) {
        console.error("Error loading Principal overview stats:", err);
    }
}

// Render Faculty details
async function renderFacultyProfile() {
    document.getElementById('faculty-header-name').innerText = currentFaculty.name;
    document.getElementById('faculty-header-dept').innerText = `${currentFaculty.designation} - ${currentFaculty.department}`;
    
    document.getElementById('sidebar-name').innerText = currentFaculty.name;
    document.getElementById('sidebar-dept').innerText = currentFaculty.designation;
    document.getElementById('sidebar-avatar').innerText = currentFaculty.profileImg || "👨‍🏫";
    
    document.getElementById('stat-handling-subjects').innerText = currentFaculty.subjects.length;
    
    const students = await DB.getStudents();
    document.getElementById('stat-total-students').innerText = `${students.length} Students`;
}

// Render Assigned Courses list
function renderCourseLoad() {
    const tbody = document.getElementById('assigned-courses-body');
    tbody.innerHTML = '';
    
    currentFaculty.subjects.forEach(sub => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="font-bold" style="color: var(--color-primary);">${sub.code}</td>
            <td>${sub.name}</td>
            <td>${sub.class}</td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="quickMarkAttendance('${sub.code}')">Mark Attendance</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Populate selectors dropdowns
function populateSubjectSelectors() {
    const attSelect = document.getElementById('att-select-subject');
    const marksSelect = document.getElementById('marks-select-subject');
    
    attSelect.innerHTML = '';
    marksSelect.innerHTML = '';
    
    currentFaculty.subjects.forEach(sub => {
        const opt1 = document.createElement('option');
        opt1.value = sub.code;
        opt1.innerText = `${sub.name} (${sub.code})`;
        attSelect.appendChild(opt1);
        
        const opt2 = document.createElement('option');
        opt2.value = sub.code;
        opt2.innerText = `${sub.name} (${sub.code})`;
        marksSelect.appendChild(opt2);
    });
}

// Load Roster Checklist for Attendance Marking
async function loadRosterForAttendance() {
    const subjectCode = document.getElementById('att-select-subject').value;
    const students = await DB.getStudents();
    const tbody = document.getElementById('attendance-roster-body');
    tbody.innerHTML = '';
    
    students.forEach(student => {
        const subAtt = student.attendance.find(a => a.code === subjectCode);
        const attended = subAtt ? subAtt.attended : 0;
        const conducted = subAtt ? subAtt.conducted : 0;
        const pct = conducted > 0 ? (attended / conducted * 100).toFixed(1) : "0.0";
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="checkbox-cell">
                <input type="checkbox" class="checkbox-custom student-checkbox" data-student-id="${student.id}" checked>
            </td>
            <td class="font-bold">${student.regdNo.toUpperCase()}</td>
            <td>${student.name}</td>
            <td class="text-center font-bold">${attended}</td>
            <td class="text-center">${conducted}</td>
            <td class="text-center font-bold" style="color: ${pct >= 75 ? 'var(--color-safe)' : (pct >= 65 ? 'var(--color-condonation)' : 'var(--color-danger)')};">
                ${pct}%
            </td>
        `;
        tbody.appendChild(row);
    });
    
    document.getElementById('roster-panel-attendance').style.display = 'block';
}

function quickMarkAttendance(subjectCode) {
    switchToTab('tab-faculty-attendance');
    document.getElementById('att-select-subject').value = subjectCode;
    loadRosterForAttendance();
}

function toggleAllAttendance(status) {
    const checkboxes = document.querySelectorAll('.student-checkbox');
    checkboxes.forEach(cb => cb.checked = status);
}

function cancelAttendanceMarking() {
    document.getElementById('roster-panel-attendance').style.display = 'none';
}

// Submit marked attendance to database
async function submitAttendance() {
    const subjectCode = document.getElementById('att-select-subject').value;
    const date = document.getElementById('att-date').value;
    const period = document.getElementById('att-period').value;
    
    if (!date) {
        alert("Please select a date for the attendance log.");
        return;
    }
    
    const checkboxes = document.querySelectorAll('.student-checkbox');
    const studentPresentMap = {};
    
    checkboxes.forEach(cb => {
        const studentId = cb.getAttribute('data-student-id');
        studentPresentMap[studentId] = cb.checked;
    });
    
    await DB.markAttendance(subjectCode, studentPresentMap, date, period);
    
    cancelAttendanceMarking();
    showToast("Attendance logged for " + subjectCode + " successfully!", "📅");
}

// Load Grade Sheet inputs
async function loadRosterForMarks() {
    const subjectCode = document.getElementById('marks-select-subject').value;
    const examType = document.getElementById('marks-select-exam').value;
    const students = await DB.getStudents();
    const tbody = document.getElementById('marks-roster-body');
    tbody.innerHTML = '';
    
    const examScoreHeader = document.getElementById('exam-score-header-val');
    let maxVal = 20;
    if (examType === 'assignment') {
        maxVal = 5;
        examScoreHeader.innerText = "Assignment Score (Max 5)";
    } else if (examType === 'external') {
        maxVal = 70;
        examScoreHeader.innerText = "Sem-End Theory (Max 70)";
    } else {
        maxVal = 20;
        examScoreHeader.innerText = "Mid Exam Score (Max 20)";
    }
    
    document.getElementById('marks-roster-title').innerText = `Grade Registry: CSE 3rd Year B - ${subjectCode} (${examType.toUpperCase()})`;

    students.forEach(student => {
        const marks = student.marks[subjectCode] || { mid1: null, mid2: null, assignment: null, external: null };
        const scoreVal = marks[examType] !== null ? marks[examType] : "";
        
        let curInternals = "-";
        if (marks.mid1 !== null) {
            if (marks.mid2 !== null) {
                const bestMid = Math.max(marks.mid1, marks.mid2);
                const leastMid = Math.min(marks.mid1, marks.mid2);
                curInternals = ((0.8 * bestMid) + (0.2 * leastMid) + (marks.assignment || 0)).toFixed(1);
            } else {
                curInternals = (marks.mid1 + (marks.assignment || 0)).toFixed(1);
            }
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="font-bold">${student.regdNo.toUpperCase()}</td>
            <td>${student.name}</td>
            <td class="text-center">
                <input type="number" class="marks-input student-marks-box" 
                    data-student-id="${student.id}" 
                    min="0" max="${maxVal}" step="0.5" 
                    value="${scoreVal}" placeholder="Enter">
            </td>
            <td class="text-center font-bold" style="color: var(--color-primary-light);">${curInternals}</td>
        `;
        tbody.appendChild(row);
    });
    
    document.getElementById('roster-panel-marks').style.display = 'block';
}

function cancelMarksEntry() {
    document.getElementById('roster-panel-marks').style.display = 'none';
}

// Submit grades to database
async function submitMarks() {
    const subjectCode = document.getElementById('marks-select-subject').value;
    const examType = document.getElementById('marks-select-exam').value;
    
    const marksInputs = document.querySelectorAll('.student-marks-box');
    const studentMarksMap = {};
    let hasValidationError = false;
    
    marksInputs.forEach(input => {
        const studentId = input.getAttribute('data-student-id');
        const val = input.value.trim();
        
        if (val !== "") {
            const num = parseFloat(val);
            const max = parseFloat(input.getAttribute('max'));
            
            if (isNaN(num) || num < 0 || num > max) {
                alert(`Error: Score value "${val}" is out of bounds [0 - ${max}].`);
                input.focus();
                hasValidationError = true;
                return;
            }
            studentMarksMap[studentId] = num;
        } else {
            studentMarksMap[studentId] = "";
        }
    });
    
    if (hasValidationError) return;
    
    await DB.saveMarks(subjectCode, studentMarksMap, examType);
    
    cancelMarksEntry();
    showToast("Exam Marks logged for " + subjectCode + " successfully!", "📝");
}

// Excel Sheet Simulation upload
function triggerSimulatedFileSelect() {
    document.getElementById('simulated-file-input').click();
}

let activeParsedCSVRows = [];
let activeAIProposedChange = null;

// Dynamic CSV line & cell splitter that handles quotes correctly
function parseCSVContent(text) {
    const lines = [];
    let row = [""];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i+1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                row[row.length - 1] += '"';
                i++; // skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            row.push('');
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') {
                i++; // skip \n
            }
            lines.push(row);
            row = [''];
        } else {
            row[row.length - 1] += char;
        }
    }
    if (row.length > 1 || row[0] !== '') {
        lines.push(row);
    }
    
    // Clean lines, skip entirely empty rows
    const cleanedLines = lines.map(line => line.map(cell => cell.trim())).filter(line => line.some(cell => cell !== ''));
    if (cleanedLines.length < 2) return null;

    // Parse headers
    const rawHeaders = cleanedLines[0];
    const rawHeadersLower = rawHeaders.map(h => h.toLowerCase());
    
    // Find key columns
    let regdIdx = rawHeadersLower.findIndex(h => h.includes('regd') || h.includes('roll') || h.includes('pin') || h.includes('id') || h.includes('number'));
    let nameIdx = rawHeadersLower.findIndex(h => h.includes('name') || h.includes('student'));
    
    // Fallbacks if not found by keywords
    if (regdIdx === -1) regdIdx = 0;
    if (nameIdx === -1 && rawHeadersLower.length > 1) nameIdx = 1;
    
    // Detect layout mode: Standard Row-based VS Matrix Grid based (like 2nd pic)
    const secondRow = cleanedLines[1];
    let isMatrixMode = false;
    let defaultConducted = {};
    
    if (secondRow) {
        const hasConductedHoursLabel = secondRow.some(cell => cell.toLowerCase().includes('conducted') || cell.toLowerCase().includes('hours'));
        if (hasConductedHoursLabel) {
            isMatrixMode = true;
        }
    }
    
    const dataRows = [];

    if (isMatrixMode) {
        // Parse default conducted hours from the second row for each column index
        for (let colIdx = 0; colIdx < rawHeaders.length; colIdx++) {
            if (colIdx === regdIdx || colIdx === nameIdx || colIdx === 0) continue;
            const header = rawHeadersLower[colIdx];
            if (header.includes('total') || header.includes('sl') || header.includes('percentage')) continue;
            
            const cellVal = secondRow[colIdx];
            if (cellVal) {
                const num = parseInt(cellVal);
                if (!isNaN(num)) {
                    defaultConducted[colIdx] = num;
                }
            }
        }
        
        // Loop student rows starting from row 3 (index 2)
        for (let i = 2; i < cleanedLines.length; i++) {
            const line = cleanedLines[i];
            if (line.length < Math.max(regdIdx, nameIdx) + 1) continue;
            
            const regdNo = line[regdIdx] ? line[regdIdx].toUpperCase() : '';
            // Skip invalid registration IDs to avoid footnotes
            if (!regdNo || !/^\d{2}[A-Z]/i.test(regdNo)) continue;
            
            const name = line[nameIdx] || 'Student';
            
            // Loop subject columns
            for (let colIdx = 0; colIdx < line.length; colIdx++) {
                if (colIdx === regdIdx || colIdx === nameIdx || colIdx === 0) continue;
                
                const subjectCode = rawHeaders[colIdx].toUpperCase();
                if (subjectCode.includes('TOTAL') || subjectCode.includes('SL') || subjectCode.includes('PERCENTAGE')) continue;
                
                const cellVal = line[colIdx];
                if (!cellVal) continue;
                
                let attended = 0;
                let conducted = defaultConducted[colIdx] || 0;
                
                // Parse "attended(conducted)" format (e.g. 12(18))
                const match = cellVal.match(/(\d+)\s*\(\s*(\d+)\s*\)/);
                if (match) {
                    attended = parseInt(match[1]) || 0;
                    conducted = parseInt(match[2]) || conducted || 0;
                } else {
                    // Try parsing single number
                    const singleNum = parseInt(cellVal);
                    if (!isNaN(singleNum)) {
                        attended = singleNum;
                        conducted = conducted || singleNum;
                    } else {
                        continue;
                    }
                }
                
                dataRows.push({
                    regdNo: regdNo,
                    name: name,
                    subjectCode: subjectCode,
                    attended: attended,
                    conducted: conducted
                });
            }
        }
        
    } else {
        // Standard Simple CSV format: Row-based
        let subjectIdx = rawHeadersLower.findIndex(h => h.includes('subject') || h.includes('course') || h.includes('sub') || h.includes('code'));
        let attendedIdx = rawHeadersLower.findIndex(h => h.includes('attended') || h.includes('present') || h.includes('hours') || h.includes('att'));
        let conductedIdx = rawHeadersLower.findIndex(h => h.includes('conducted') || h.includes('total') || h.includes('classes') || h.includes('cond'));
        let examIdx = rawHeadersLower.findIndex(h => h.includes('exam') || h.includes('type') || h.includes('test'));
        let marksIdx = rawHeadersLower.findIndex(h => h.includes('marks') || h.includes('score') || h.includes('grade'));

        if (subjectIdx === -1 && rawHeadersLower.length > 2) subjectIdx = 2;

        for (let i = 1; i < cleanedLines.length; i++) {
            const line = cleanedLines[i];
            if (line.length < Math.max(regdIdx, nameIdx) + 1) continue;
            
            const regdNo = line[regdIdx] ? line[regdIdx].toUpperCase() : '';
            if (!regdNo) continue;

            const record = {
                regdNo: regdNo,
                name: nameIdx !== -1 && line[nameIdx] ? line[nameIdx] : 'Student',
                subjectCode: subjectIdx !== -1 && line[subjectIdx] ? line[subjectIdx].toUpperCase() : 'DBMS'
            };

            if (attendedIdx !== -1 && line[attendedIdx] !== undefined) {
                record.attended = parseInt(line[attendedIdx]) || 0;
            }
            if (conductedIdx !== -1 && line[conductedIdx] !== undefined) {
                record.conducted = parseInt(line[conductedIdx]) || 0;
            }
            if (examIdx !== -1 && line[examIdx] !== undefined) {
                record.examType = line[examIdx].toLowerCase();
            }
            if (marksIdx !== -1 && line[marksIdx] !== undefined) {
                record.marks = parseFloat(line[marksIdx]) || 0;
            }

            dataRows.push(record);
        }
    }
    
    return {
        headers: rawHeaders,
        rows: dataRows
    };
}

function handleExcelFileSelect(input) {
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    const reader = new FileReader();
    const spinner = document.getElementById('excel-spinner');
    
    spinner.style.display = 'block';
    
    reader.onload = function(e) {
        setTimeout(async () => {
            spinner.style.display = 'none';
            const text = e.target.result;
            
            try {
                const parsed = parseCSVContent(text);
                if (!parsed || parsed.rows.length === 0) {
                    alert("Unable to parse file. Please verify it is a valid comma-separated CSV with headers.");
                    input.value = '';
                    return;
                }
                
                activeParsedCSVRows = parsed.rows;
                
                // Render CSV Preview table
                const headersTr = document.getElementById('csv-preview-headers');
                const tbody = document.getElementById('csv-preview-body');
                headersTr.innerHTML = '';
                tbody.innerHTML = '';
                
                // Define headers to show in preview
                const showHeaders = ['Registration No', 'Name', 'Subject', 'Attended', 'Conducted', 'Exam Type', 'Marks'];
                showHeaders.forEach(h => {
                    const th = document.createElement('th');
                    th.innerText = h;
                    headersTr.appendChild(th);
                });
                
                parsed.rows.slice(0, 10).forEach(row => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td class="font-bold">${row.regdNo}</td>
                        <td>${row.name}</td>
                        <td>${row.subjectCode}</td>
                        <td class="text-center">${row.attended !== undefined ? row.attended : '-'}</td>
                        <td class="text-center">${row.conducted !== undefined ? row.conducted : '-'}</td>
                        <td>${row.examType || '-'}</td>
                        <td class="text-center">${row.marks !== undefined ? row.marks : '-'}</td>
                    `;
                    tbody.appendChild(tr);
                });
                
                if (parsed.rows.length > 10) {
                    const extraRow = document.createElement('tr');
                    extraRow.innerHTML = `<td colspan="7" class="text-center text-muted" style="font-style: italic;">... and ${parsed.rows.length - 10} more rows</td>`;
                    tbody.appendChild(extraRow);
                }
                
                document.getElementById('csv-preview-container').style.display = 'block';
                showToast(`Parsed ${parsed.rows.length} rows from ${file.name}. Review below.`, "📋");
                
            } catch (err) {
                console.error(err);
                alert("Error reading spreadsheet: " + err.message);
                input.value = '';
            }
        }, 1000);
    };
    
    reader.onerror = function() {
        spinner.style.display = 'none';
        alert("Error reading file.");
        input.value = '';
    };
    
    reader.readAsText(file);
}

async function commitCSVImport() {
    if (activeParsedCSVRows.length === 0) return;
    
    const btn = document.getElementById('btn-commit-csv');
    btn.disabled = true;
    btn.innerText = "Saving...";
    
    try {
        const success = await DB.importStudentDataExcel(activeParsedCSVRows);
        if (success) {
            showToast(`Roster database updated successfully!`, "📥");
            cancelCSVImport();
            switchToTab('tab-faculty-analytics');
        } else {
            alert("Database write error during bulk insert.");
        }
    } catch (err) {
        alert("Import failed: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Save Roster to Database";
    }
}

function cancelCSVImport() {
    activeParsedCSVRows = [];
    document.getElementById('csv-preview-container').style.display = 'none';
    document.getElementById('simulated-file-input').value = '';
}

// AI NLP Natural Language Processing Engine
function interpretNaturalLanguageChanges(text) {
    const cleanedText = text.trim();
    if (!cleanedText) return null;
    
    // 1. Scan for Registration Number
    const regdMatch = cleanedText.match(/\b(\d{2}[A-Z]{2}\d[A-Z0-9]\d{4})\b/i);
    if (!regdMatch) {
        return {
            success: false,
            error: "Could not find a student registration ID in your prompt (e.g. 24FE1A0487)."
        };
    }
    const regdNo = regdMatch[1].toUpperCase();
    const studentId = regdNo.toLowerCase();

    // 2. Scan for Subject code
    const subMatch = cleanedText.match(/\b(dbms|oopj|mfcs|coa|se)\b/i);
    let subjectCode = subMatch ? subMatch[1].toUpperCase() : null;

    // 3. Scan for Status override (detain, suspend, activate)
    const statusMatch = cleanedText.match(/\b(detain|detained|suspend|suspended|activate|active)\b/i);
    if (statusMatch) {
        let action = statusMatch[1].toLowerCase();
        let targetStatus = 'active';
        if (action.startsWith('detain')) targetStatus = 'detained';
        else if (action.startsWith('suspend')) targetStatus = 'suspended';
        else if (action.startsWith('activ')) targetStatus = 'active';
        
        return {
            success: true,
            type: 'status',
            regdNo: regdNo,
            studentId: studentId,
            status: targetStatus,
            description: `Change standing status of student <strong>${regdNo}</strong> to <strong style="color:var(--color-danger);">${targetStatus.toUpperCase()}</strong>`
        };
    }

    // 4. Scan for Exam Type and Marks
    const examMatch = cleanedText.match(/\b(mid\s*1|mid\s*2|mid1|mid2|assignment|external|sem|semester)\b/i);
    const scoreMatch = cleanedText.match(/\b(?:marks?|score)?\s*(?:to|is|for)?\s*([0-9.]+)\b/i) || cleanedText.match(/\b([0-9.]+)\s*(?:marks?|score)\b/i);
    
    if (examMatch || scoreMatch) {
        if (!subjectCode) {
            return {
                success: false,
                error: `Detected marks update for <strong>${regdNo}</strong>, but could not determine the course subject (e.g. DBMS, OOPJ).`
            };
        }
        let score = scoreMatch ? parseFloat(scoreMatch[1]) : null;
        if (score === null || isNaN(score)) {
            return {
                success: false,
                error: `Detected course <strong>${subjectCode}</strong> and student <strong>${regdNo}</strong>, but could not find the marks score value (e.g. '18.5 marks').`
            };
        }
        let examType = 'mid1';
        if (examMatch) {
            const matchedExam = examMatch[1].toLowerCase().replace(/\s+/g, '');
            if (matchedExam.includes('mid2')) examType = 'mid2';
            else if (matchedExam.includes('assignment')) examType = 'assignment';
            else if (matchedExam.includes('external') || matchedExam.includes('sem')) examType = 'external';
        }
        
        return {
            success: true,
            type: 'marks',
            regdNo: regdNo,
            studentId: studentId,
            subjectCode: subjectCode,
            examType: examType,
            marks: score,
            description: `Set exam score for student <strong>${regdNo}</strong> in <strong>${subjectCode}</strong> (Type: <strong>${examType.toUpperCase()}</strong>) to <strong>${score}</strong>`
        };
    }

    // 5. Scan for Attendance counts
    const attCountMatch = cleanedText.match(/(\d+)\s*\/\s*(\d+)/) || cleanedText.match(/(\d+)\s+(?:attended|classes)?\s*(?:out of|conducted)?\s*(\d+)/i);
    if (attCountMatch) {
        if (!subjectCode) {
            return {
                success: false,
                error: `Detected attendance counts, but could not identify the subject (DBMS, OOPJ, MFCS, COA, SE).`
            };
        }
        const attended = parseInt(attCountMatch[1]);
        const conducted = parseInt(attCountMatch[2]);
        if (attended > conducted) {
            return {
                success: false,
                error: `Attended classes (${attended}) cannot be greater than Conducted classes (${conducted}).`
            };
        }
        
        return {
            success: true,
            type: 'attendance',
            regdNo: regdNo,
            studentId: studentId,
            subjectCode: subjectCode,
            attended: attended,
            conducted: conducted,
            description: `Update class attendance record for student <strong>${regdNo}</strong> in course <strong>${subjectCode}</strong> to <strong>${attended}</strong> attended / <strong>${conducted}</strong> conducted`
        };
    }

    return {
        success: false,
        error: `Could not understand the target update request. Please specify action details, e.g. "Update 24FE1A0487 DBMS to 45/50" or "detain 24FE1A0487".`
    };
}

function runAIDataInterpreter() {
    const prompt = document.getElementById('ai-prompt-input').value;
    const previewCard = document.getElementById('ai-preview-card');
    const previewContent = document.getElementById('ai-preview-content');
    
    if (!prompt.trim()) {
        alert("Please enter a command prompt first.");
        return;
    }
    
    const interpretation = interpretNaturalLanguageChanges(prompt);
    if (!interpretation) return;
    
    if (interpretation.success) {
        activeAIProposedChange = interpretation;
        previewCard.style.borderColor = "var(--color-safe)";
        previewContent.innerHTML = `
            <p style="margin-bottom: 0.5rem; font-weight: 600; color: var(--color-safe);">AI Confidence: 98% (High)</p>
            <p>${interpretation.description}</p>
        `;
        document.getElementById('btn-apply-ai').style.display = 'block';
    } else {
        activeAIProposedChange = null;
        previewCard.style.borderColor = "var(--color-danger)";
        previewContent.innerHTML = `
            <p style="margin-bottom: 0.5rem; font-weight: 600; color: var(--color-danger);">AI Interpretation Failed</p>
            <p>${interpretation.error}</p>
        `;
        document.getElementById('btn-apply-ai').style.display = 'none';
    }
    
    previewCard.style.display = 'block';
}

function clearAIInterpreter() {
    activeAIProposedChange = null;
    document.getElementById('ai-preview-card').style.display = 'none';
    document.getElementById('ai-prompt-input').value = '';
}

async function applyAIInterpretation() {
    if (!activeAIProposedChange) return;
    
    const btn = document.getElementById('btn-apply-ai');
    btn.disabled = true;
    btn.innerText = "Applying...";
    
    try {
        let success = false;
        const change = activeAIProposedChange;
        
        if (change.type === 'attendance') {
            const row = {
                regdNo: change.regdNo,
                subjectCode: change.subjectCode,
                attended: change.attended,
                conducted: change.conducted
            };
            success = await DB.importStudentDataExcel([row]);
        } else if (change.type === 'marks') {
            const row = {
                regdNo: change.regdNo,
                subjectCode: change.subjectCode,
                examType: change.examType,
                marks: change.marks
            };
            success = await DB.importStudentDataExcel([row]);
        } else if (change.type === 'status') {
            success = await DB.saveStudentStatus(change.studentId, change.status);
        }
        
        if (success) {
            showToast("AI Agent executed change successfully!", "🤖");
            clearAIInterpreter();
            switchToTab('tab-faculty-analytics');
        } else {
            alert("Execution failed during database operation.");
        }
        
    } catch (err) {
        alert("Operation failed: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Commit Changes ✅";
    }
}

// Render Student Compliance Roster audit
async function renderRosterAudit() {
    const tbody = document.getElementById('analytics-table-body');
    tbody.innerHTML = '';
    
    const students = await DB.getStudents();
    
    students.forEach(student => {
        let totalAttended = 0;
        let totalConducted = 0;
        
        student.attendance.forEach(sub => {
            totalAttended += sub.attended;
            totalConducted += sub.conducted;
        });
        
        const percent = totalConducted > 0 ? (totalAttended / totalConducted * 100) : 0;
        let badgeClass = 'badge-safe';
        let statusText = 'ELIGIBLE';
        
        if (percent >= 75) {
            badgeClass = 'badge-safe';
            statusText = 'ELIGIBLE';
        } else if (percent >= 65) {
            badgeClass = 'badge-condonation';
            statusText = 'CONDONATION';
        } else {
            badgeClass = 'badge-danger';
            statusText = 'DETAINED';
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="font-bold">${student.regdNo.toUpperCase()}</td>
            <td>${student.name}</td>
            <td>B.Tech CSE - ${student.section}</td>
            <td class="text-center">${totalConducted}</td>
            <td class="text-center font-bold">${totalAttended}</td>
            <td class="text-center font-bold" style="color: ${percent >= 75 ? 'var(--color-safe)' : (percent >= 65 ? 'var(--color-condonation)' : 'var(--color-danger)')};">
                ${percent.toFixed(2)}%
            </td>
            <td><span class="badge ${badgeClass}">${statusText}</span></td>
        `;
        tbody.appendChild(row);
    });
}

// Toast alerts helper
function showToast(message, icon = "ℹ️") {
    const toast = document.getElementById('faculty-toast');
    document.getElementById('toast-icon').innerText = icon;
    document.getElementById('toast-message').innerText = message;
    
    toast.classList.add('active-toast');
    setTimeout(() => {
        toast.classList.remove('active-toast');
    }, 3000);
}

// Logout faculty
function logoutFaculty() {
    DB.logout();
    window.location.href = 'faculty-login.html';
}

// Global variable for active lookup student ID
let currentLookupStudentId = null;

// Search Student Profile by registration number
async function lookupStudentProfile() {
    const regdInput = document.getElementById('lookup-regd-input').value.trim().toLowerCase();
    if (!regdInput) {
        alert("Please enter a valid Registration Number.");
        return;
    }

    const student = await DB.getStudentById(regdInput);
    if (!student) {
        alert(`Student with Registration Number "${regdInput.toUpperCase()}" not found.`);
        document.getElementById('lookup-results-panel').style.display = 'none';
        return;
    }

    currentLookupStudentId = student.id;

    // Set Profile
    document.getElementById('lookup-profile-name').innerText = student.name;
    document.getElementById('lookup-profile-regd').innerText = student.regdNo.toUpperCase();
    document.getElementById('lookup-profile-branch').innerText = student.branch;
    document.getElementById('lookup-profile-class').innerText = `${student.year} - Section ${student.section}`;

    // Populate Attendance
    const attBody = document.getElementById('lookup-attendance-body');
    attBody.innerHTML = '';
    student.attendance.forEach(sub => {
        const percent = sub.conducted > 0 ? (sub.attended / sub.conducted * 100) : 0;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="font-bold">${sub.code}</td>
            <td class="text-center font-bold">${sub.attended}</td>
            <td class="text-center">${sub.conducted}</td>
            <td class="text-center font-bold" style="color: ${percent >= 75 ? 'var(--color-safe)' : (percent >= 65 ? 'var(--color-condonation)' : 'var(--color-danger)')};">
                ${percent.toFixed(2)}%
            </td>
        `;
        attBody.appendChild(row);
    });

    // Populate Marks
    const marksBody = document.getElementById('lookup-marks-body');
    marksBody.innerHTML = '';
    student.attendance.forEach(sub => {
        const mark = student.marks[sub.code] || { mid1: null, mid2: null, assignment: null };
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="font-bold">${sub.code}</td>
            <td class="text-center">${mark.mid1 !== null ? mark.mid1 : '-'}</td>
            <td class="text-center">${mark.mid2 !== null ? mark.mid2 : '-'}</td>
            <td class="text-center">${mark.assignment !== null ? mark.assignment : '-'}</td>
        `;
        marksBody.appendChild(row);
    });

    // Set Remarks
    document.getElementById('lookup-remarks-input').value = student.remarks || 'No feedback entered yet.';

    // Show Results Panel
    document.getElementById('lookup-results-panel').style.display = 'block';
    showToast(`Profile loaded for ${student.name}`, "🔍");
}

// Save student advisor feedback remarks
async function saveStudentLookupRemarks() {
    if (!currentLookupStudentId) return;
    const remarks = document.getElementById('lookup-remarks-input').value.trim();

    const btn = document.querySelector('#lookup-results-panel .btn-secondary');
    const originalText = btn.innerText;
    btn.innerText = "Saving Feedback...";
    btn.disabled = true;

    try {
        const success = await DB.saveStudentRemarks(currentLookupStudentId, remarks);
        btn.innerText = originalText;
        btn.disabled = false;

        if (success) {
            showToast("Faculty advisory remarks saved successfully!", "✅");
        } else {
            alert("Failed to save remarks to database.");
        }
    } catch (err) {
        btn.innerText = originalText;
        btn.disabled = false;
        alert("Error saving remarks: " + err.message);
    }
}

// Export student compliance roster list to Excel CSV file
function exportAuditRosterToExcel() {
    const table = document.getElementById('analytics-table');
    if (!table) return;

    let csv = [];
    const rows = table.querySelectorAll('tr');
    
    for (let i = 0; i < rows.length; i++) {
        const row = [];
        const cols = rows[i].querySelectorAll('td, th');
        for (let j = 0; j < cols.length; j++) {
            let data = cols[j].innerText.trim().replace(/"/g, '""');
            row.push('"' + data + '"');
        }
        csv.push(row.join(','));
    }

    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'VLITS_CSE_3B_Roster_Audit.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Audit list exported to Excel (CSV)!", "📥");
}

// ==========================================================================
// HOD Console Administrative Logic
// ==========================================================================
let hodStudentsData = []; // Local cache of students for filtering

async function loadHodConsole() {
    await loadHodAnnouncements();
    await loadHodStudentRoster();
    await loadHodLeaveApprovals();
}

async function loadHodAnnouncements() {
    try {
        const list = await DB.getAnnouncements();
        const tbody = document.getElementById('hod-announcements-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="color: var(--color-text-muted); padding: 1.5rem;">No active announcements.</td></tr>';
            return;
        }
        
        list.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="padding: 0.75rem 1rem;"><span class="badge ${item.type === 'notice' ? 'badge-safe' : 'badge-condonation'}">${item.type.toUpperCase()}</span></td>
                <td style="padding: 0.75rem 1rem; font-weight: 600;">${item.date}</td>
                <td style="padding: 0.75rem 1rem; font-weight: 700; color: var(--color-primary);">${item.title}</td>
                <td style="padding: 0.75rem 1rem; font-size: 0.8rem; text-align: justify; line-height: 1.3;">${item.desc}</td>
                <td class="text-center" style="padding: 0.75rem 1rem;">
                    <button class="btn btn-outline btn-sm" style="color: var(--color-danger); border-color: var(--color-danger); padding: 0.2rem 0.5rem;" onclick="deleteAnnouncementByHod('${item.id}')">🗑️</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        console.error("Error loading HOD announcements:", err);
    }
}

async function addAnnouncementByHod() {
    const type = document.getElementById('hod-ann-type').value;
    const date = document.getElementById('hod-ann-date').value.trim();
    const title = document.getElementById('hod-ann-title').value.trim();
    const desc = document.getElementById('hod-ann-desc').value.trim();
    
    if (!date || !title || !desc) {
        alert("Please fill in all announcement fields (Date, Title, and Description).");
        return;
    }
    
    try {
        const success = await DB.addAnnouncement(type, date, title, desc);
        if (success) {
            showToast("Announcement published successfully!", "📢");
            document.getElementById('hod-ann-date').value = '';
            document.getElementById('hod-ann-title').value = '';
            document.getElementById('hod-ann-desc').value = '';
            await loadHodAnnouncements();
        } else {
            alert("Failed to publish announcement.");
        }
    } catch (err) {
        alert("Error publishing announcement: " + err.message);
    }
}

async function deleteAnnouncementByHod(id) {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    
    try {
        const success = await DB.deleteAnnouncement(id);
        if (success) {
            showToast("Announcement deleted successfully.", "🗑️");
            await loadHodAnnouncements();
        } else {
            alert("Failed to delete announcement.");
        }
    } catch (err) {
        alert("Error deleting announcement: " + err.message);
    }
}

async function loadHodStudentRoster() {
    try {
        hodStudentsData = await DB.getStudents();
        renderHodStudentTable(hodStudentsData);
    } catch (err) {
        console.error("Error loading student roster:", err);
    }
}

function renderHodStudentTable(students) {
    const tbody = document.getElementById('hod-students-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="color: var(--color-text-muted); padding: 1.5rem;">No student records found.</td></tr>';
        return;
    }
    
    students.forEach(student => {
        const row = document.createElement('tr');
        const statusVal = student.status || 'active';
        
        row.innerHTML = `
            <td style="padding: 0.75rem 1rem;" class="font-bold">${student.regdNo.toUpperCase()}</td>
            <td style="padding: 0.75rem 1rem;">${student.name}</td>
            <td style="padding: 0.75rem 1rem; font-size: 0.8rem;">${student.branch}<br><span style="color: var(--color-text-muted); font-weight: 600;">Sec ${student.section}</span></td>
            <td style="padding: 0.75rem 1rem;">
                <select class="form-control" style="padding: 0.3rem 0.5rem; font-size: 0.8rem; font-weight: 700; width: 130px; border-color: ${statusVal === 'suspended' ? 'var(--color-danger)' : (statusVal === 'detained' ? 'var(--color-condonation)' : 'var(--color-safe)')}; color: ${statusVal === 'suspended' ? 'var(--color-danger)' : (statusVal === 'detained' ? 'var(--color-condonation)' : 'var(--color-safe)')};" onchange="changeStudentStatusByHod('${student.id}', this.value)">
                    <option value="active" ${statusVal === 'active' ? 'selected' : ''} style="color: var(--color-safe); font-weight:700;">🟢 Active</option>
                    <option value="detained" ${statusVal === 'detained' ? 'selected' : ''} style="color: var(--color-condonation); font-weight:700;">🟡 Detained</option>
                    <option value="suspended" ${statusVal === 'suspended' ? 'selected' : ''} style="color: var(--color-danger); font-weight:700;">🔴 Suspended</option>
                </select>
            </td>
            <td class="text-center" style="padding: 0.75rem 1rem;">
                <button class="btn btn-outline btn-sm" style="color: var(--color-danger); border-color: var(--color-danger); padding: 0.2rem 0.5rem;" onclick="deleteStudentByHod('${student.id}')">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function filterHodStudents() {
    const searchVal = document.getElementById('hod-search-student').value.trim().toLowerCase();
    if (!searchVal) {
        renderHodStudentTable(hodStudentsData);
        return;
    }
    
    const filtered = hodStudentsData.filter(s => 
        s.name.toLowerCase().includes(searchVal) || 
        s.regdNo.toLowerCase().includes(searchVal)
    );
    renderHodStudentTable(filtered);
}

async function addStudentByHod() {
    const id = document.getElementById('hod-student-regd').value.trim().toLowerCase();
    const name = document.getElementById('hod-student-name').value.trim();
    const branch = document.getElementById('hod-student-branch').value;
    const section = document.getElementById('hod-student-section').value;
    
    if (!id || !name) {
        alert("Please enter both registration number and full name of the student.");
        return;
    }
    
    if (id.length < 5) {
        alert("Please enter a valid registration number.");
        return;
    }
    
    try {
        const success = await DB.addStudent(id, name, branch, section);
        if (success) {
            showToast("Student registered successfully!", "👥");
            document.getElementById('hod-student-regd').value = '';
            document.getElementById('hod-student-name').value = '';
            await loadHodStudentRoster();
        } else {
            alert("Failed to register student. Account may already exist.");
        }
    } catch (err) {
        alert("Error registering student: " + err.message);
    }
}

async function deleteStudentByHod(studentId) {
    if (!confirm(`Warning: Are you sure you want to delete student "${studentId.toUpperCase()}"? This will permanently remove all their attendance logs, exam scores, and fee records.`)) {
        return;
    }
    
    try {
        const success = await DB.deleteStudent(studentId);
        if (success) {
            showToast("Student removed from system.", "🗑️");
            await loadHodStudentRoster();
        } else {
            alert("Failed to delete student from database.");
        }
    } catch (err) {
        alert("Error deleting student: " + err.message);
    }
}

async function changeStudentStatusByHod(studentId, status) {
    try {
        const success = await DB.saveStudentStatus(studentId, status);
        if (success) {
            showToast("Student standing updated to " + status.toUpperCase(), "⚠️");
            await loadHodStudentRoster();
        } else {
            alert("Failed to update student status.");
        }
    } catch (err) {
        alert("Error updating student status: " + err.message);
    }
}

// ==========================================================================
// Faculty Leave Management Logic
// ==========================================================================

async function loadFacultyLeaves() {
    try {
        const leaves = await DB.getLeaves(currentFaculty.id);
        const tbody = document.getElementById('leave-history-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        let clRemaining = 15;
        let slRemaining = 10;
        let odRemaining = 10;
        let pendingCount = 0;
        
        leaves.forEach(l => {
            const diffDays = Math.round((new Date(l.date_to) - new Date(l.date_from)) / (1000 * 60 * 60 * 24)) + 1;
            
            if (l.status === 'approved') {
                if (l.type === 'Casual') {
                    clRemaining -= diffDays;
                } else if (l.type === 'Sick') {
                    slRemaining -= diffDays;
                } else if (l.type === 'On Duty') {
                    odRemaining -= diffDays;
                }
            } else if (l.status === 'pending') {
                pendingCount++;
            }
            
            // Render in history table
            let badgeClass = 'badge-condonation';
            if (l.status === 'approved') badgeClass = 'badge-safe';
            else if (l.status === 'rejected') badgeClass = 'badge-danger';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="font-bold">${l.type}</td>
                <td>${l.date_from} to ${l.date_to}</td>
                <td class="text-center font-bold">${diffDays}</td>
                <td>${l.reason}</td>
                <td><span class="badge ${badgeClass}">${l.status.toUpperCase()}</span></td>
            `;
            tbody.appendChild(row);
        });
        
        // Update stats grid
        document.getElementById('leave-stat-cl').innerText = `${clRemaining} / 15`;
        document.getElementById('leave-stat-sl').innerText = `${slRemaining} / 10`;
        document.getElementById('leave-stat-od').innerText = `${odRemaining} / 10`;
        document.getElementById('leave-stat-pending').innerText = pendingCount;
        
        if (leaves.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="color: var(--color-text-muted); padding: 1.5rem;">No leave requests logged.</td></tr>';
        }
    } catch (err) {
        console.error("Error loading faculty leaves:", err);
    }
}

async function submitLeaveApplication() {
    const type = document.getElementById('leave-type').value;
    const dateFrom = document.getElementById('leave-date-from').value;
    const dateTo = document.getElementById('leave-date-to').value;
    const reason = document.getElementById('leave-reason').value.trim();
    
    if (!dateFrom || !dateTo || !reason) {
        alert("Please fill in all leave application fields.");
        return;
    }
    
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    
    if (to < from) {
        alert("Error: 'To Date' cannot be before 'From Date'.");
        return;
    }
    
    try {
        const success = await DB.applyLeave(currentFaculty.id, type, dateFrom, dateTo, reason);
        if (success) {
            showToast("Leave request submitted successfully!", "📋");
            document.getElementById('leave-apply-form').reset();
            await loadFacultyLeaves();
        } else {
            alert("Failed to submit leave request.");
        }
    } catch (err) {
        alert("Error submitting leave request: " + err.message);
    }
}

async function loadHodLeaveApprovals() {
    try {
        const leaves = await DB.getLeaves('all');
        const tbody = document.getElementById('hod-leaves-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        // Filter for pending leaves only
        const pendingLeaves = leaves.filter(l => l.status === 'pending');
        
        if (pendingLeaves.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="color: var(--color-text-muted); padding: 1.5rem;">No pending leave requests.</td></tr>';
            return;
        }
        
        pendingLeaves.forEach(l => {
            const diffDays = Math.round((new Date(l.date_to) - new Date(l.date_from)) / (1000 * 60 * 60 * 24)) + 1;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="padding: 0.75rem 1rem;" class="font-bold">${l.faculty_name || l.faculty_id}</td>
                <td style="padding: 0.75rem 1rem;">${l.faculty_dept || 'CSE Dept'}</td>
                <td style="padding: 0.75rem 1rem;"><span class="badge badge-condonation">${l.type}</span></td>
                <td style="padding: 0.75rem 1rem;">${l.date_from} to ${l.date_to}</td>
                <td style="padding: 0.75rem 1rem;" class="text-center font-bold">${diffDays}</td>
                <td style="padding: 0.75rem 1rem; font-size: 0.8rem; line-height: 1.3;">${l.reason}</td>
                <td class="text-center" style="padding: 0.75rem 1rem;">
                    <div style="display: flex; gap: 0.5rem; justify-content: center;">
                        <button class="btn btn-primary btn-sm" onclick="respondToLeaveByHod(${l.id}, 'approved')">Approve</button>
                        <button class="btn btn-outline btn-sm" style="color: var(--color-danger); border-color: var(--color-danger); padding: 0.4rem 0.8rem;" onclick="respondToLeaveByHod(${l.id}, 'rejected')">Reject</button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        console.error("Error loading HOD leave approvals:", err);
    }
}

async function respondToLeaveByHod(leaveId, status) {
    try {
        const success = await DB.updateLeaveStatus(leaveId, status);
        if (success) {
            showToast(`Leave request ${status === 'approved' ? 'approved' : 'rejected'}!`, "📋");
            await loadHodConsole();
        } else {
            alert(`Failed to update leave request status to ${status}.`);
        }
    } catch (err) {
        alert("Error updating leave request: " + err.message);
    }
}

// ==========================================================================
// Principal Console Administrative Logic
// ==========================================================================
let prStudentsData = []; // Cache of students
let prFacultyData = [];   // Cache of faculty

async function loadPrincipalConsole() {
    await loadPrincipalAnnouncements();
    await loadPrincipalStudentRoster();
    await loadPrincipalLeaveApprovals();
    await loadPrincipalFacultyRoster();
}

async function loadPrincipalAnnouncements() {
    try {
        const list = await DB.getAnnouncements();
        const tbody = document.getElementById('pr-announcements-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="color: var(--color-text-muted); padding: 1.5rem;">No active announcements.</td></tr>';
            return;
        }
        
        list.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="padding: 0.75rem 1rem;"><span class="badge ${item.type === 'notice' ? 'badge-safe' : 'badge-condonation'}">${item.type.toUpperCase()}</span></td>
                <td style="padding: 0.75rem 1rem; font-weight: 600;">${item.date}</td>
                <td style="padding: 0.75rem 1rem; font-weight: 700; color: var(--color-primary);">${item.title}</td>
                <td style="padding: 0.75rem 1rem; font-size: 0.8rem; text-align: justify; line-height: 1.3;">${item.desc}</td>
                <td class="text-center" style="padding: 0.75rem 1rem;">
                    <button class="btn btn-outline btn-sm" style="color: var(--color-danger); border-color: var(--color-danger); padding: 0.2rem 0.5rem;" onclick="deleteAnnouncementByPrincipal('${item.id}')">🗑️</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        console.error("Error loading Principal announcements:", err);
    }
}

async function addAnnouncementByPrincipal() {
    const type = document.getElementById('pr-ann-type').value;
    const date = document.getElementById('pr-ann-date').value.trim();
    const title = document.getElementById('pr-ann-title').value.trim();
    const desc = document.getElementById('pr-ann-desc').value.trim();
    
    if (!date || !title || !desc) {
        alert("Please fill in all announcement fields.");
        return;
    }
    
    try {
        const success = await DB.addAnnouncement(type, date, title, desc);
        if (success) {
            showToast("Announcement published successfully!", "📢");
            document.getElementById('pr-ann-date').value = '';
            document.getElementById('pr-ann-title').value = '';
            document.getElementById('pr-ann-desc').value = '';
            await loadPrincipalAnnouncements();
        } else {
            alert("Failed to publish announcement.");
        }
    } catch (err) {
        alert("Error publishing announcement: " + err.message);
    }
}

async function deleteAnnouncementByPrincipal(id) {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    
    try {
        const success = await DB.deleteAnnouncement(id);
        if (success) {
            showToast("Announcement deleted successfully.", "🗑️");
            await loadPrincipalAnnouncements();
        } else {
            alert("Failed to delete announcement.");
        }
    } catch (err) {
        alert("Error deleting announcement: " + err.message);
    }
}

async function loadPrincipalStudentRoster() {
    try {
        prStudentsData = await DB.getStudents();
        renderPrincipalStudentTable(prStudentsData);
    } catch (err) {
        console.error("Error loading student roster:", err);
    }
}

function renderPrincipalStudentTable(students) {
    const tbody = document.getElementById('pr-students-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="color: var(--color-text-muted); padding: 1.5rem;">No student records found.</td></tr>';
        return;
    }
    
    students.forEach(student => {
        const row = document.createElement('tr');
        const statusVal = student.status || 'active';
        
        row.innerHTML = `
            <td style="padding: 0.75rem 1rem;" class="font-bold">${student.regdNo.toUpperCase()}</td>
            <td style="padding: 0.75rem 1rem;">${student.name}</td>
            <td style="padding: 0.75rem 1rem; font-size: 0.8rem;">${student.branch}<br><span style="color: var(--color-text-muted); font-weight: 600;">Sec ${student.section}</span></td>
            <td style="padding: 0.75rem 1rem;">
                <select class="form-control" style="padding: 0.3rem 0.5rem; font-size: 0.8rem; font-weight: 700; width: 130px; border-color: ${statusVal === 'suspended' ? 'var(--color-danger)' : (statusVal === 'detained' ? 'var(--color-condonation)' : 'var(--color-safe)')}; color: ${statusVal === 'suspended' ? 'var(--color-danger)' : (statusVal === 'detained' ? 'var(--color-condonation)' : 'var(--color-safe)')};" onchange="changeStudentStatusByPrincipal('${student.id}', this.value)">
                    <option value="active" ${statusVal === 'active' ? 'selected' : ''} style="color: var(--color-safe); font-weight:700;">🟢 Active</option>
                    <option value="detained" ${statusVal === 'detained' ? 'selected' : ''} style="color: var(--color-condonation); font-weight:700;">🟡 Detained</option>
                    <option value="suspended" ${statusVal === 'suspended' ? 'selected' : ''} style="color: var(--color-danger); font-weight:700;">🔴 Suspended</option>
                </select>
            </td>
            <td class="text-center" style="padding: 0.75rem 1rem;">
                <button class="btn btn-outline btn-sm" style="color: var(--color-danger); border-color: var(--color-danger); padding: 0.2rem 0.5rem;" onclick="deleteStudentByPrincipal('${student.id}')">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function filterPrincipalStudents() {
    const searchVal = document.getElementById('pr-search-student').value.trim().toLowerCase();
    if (!searchVal) {
        renderPrincipalStudentTable(prStudentsData);
        return;
    }
    
    const filtered = prStudentsData.filter(s => 
        s.name.toLowerCase().includes(searchVal) || 
        s.regdNo.toLowerCase().includes(searchVal)
    );
    renderPrincipalStudentTable(filtered);
}

async function addStudentByPrincipal() {
    const id = document.getElementById('pr-student-regd').value.trim().toLowerCase();
    const name = document.getElementById('pr-student-name').value.trim();
    const branch = document.getElementById('pr-student-branch').value;
    const section = document.getElementById('pr-student-section').value;
    
    if (!id || !name) {
        alert("Please enter both registration number and full name of the student.");
        return;
    }
    
    try {
        const success = await DB.addStudent(id, name, branch, section);
        if (success) {
            showToast("Student registered successfully!", "👥");
            document.getElementById('pr-student-regd').value = '';
            document.getElementById('pr-student-name').value = '';
            await loadPrincipalStudentRoster();
        } else {
            alert("Failed to register student.");
        }
    } catch (err) {
        alert("Error registering student: " + err.message);
    }
}

async function deleteStudentByPrincipal(studentId) {
    if (!confirm("Are you sure you want to delete this student profile?")) return;
    
    try {
        const success = await DB.deleteStudent(studentId);
        if (success) {
            showToast("Student removed from system.", "🗑️");
            await loadPrincipalStudentRoster();
        } else {
            alert("Failed to delete student from database.");
        }
    } catch (err) {
        alert("Error deleting student: " + err.message);
    }
}

async function changeStudentStatusByPrincipal(studentId, status) {
    try {
        const success = await DB.saveStudentStatus(studentId, status);
        if (success) {
            showToast("Student standing updated to " + status.toUpperCase(), "⚠️");
            await loadPrincipalStudentRoster();
        } else {
            alert("Failed to update student status.");
        }
    } catch (err) {
        alert("Error updating student status: " + err.message);
    }
}

async function loadPrincipalLeaveApprovals() {
    try {
        const leaves = await DB.getLeaves('all');
        const tbody = document.getElementById('pr-leaves-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        // Filter for pending leaves only
        const pendingLeaves = leaves.filter(l => l.status === 'pending');
        
        if (pendingLeaves.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="color: var(--color-text-muted); padding: 1.5rem;">No pending leave requests.</td></tr>';
            return;
        }
        
        pendingLeaves.forEach(l => {
            const diffDays = Math.round((new Date(l.date_to) - new Date(l.date_from)) / (1000 * 60 * 60 * 24)) + 1;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="padding: 0.75rem 1rem;" class="font-bold">${l.faculty_name || l.faculty_id}</td>
                <td style="padding: 0.75rem 1rem;">${l.faculty_dept || 'CSE Dept'}</td>
                <td style="padding: 0.75rem 1rem;"><span class="badge badge-condonation">${l.type}</span></td>
                <td style="padding: 0.75rem 1rem;">${l.date_from} to ${l.date_to}</td>
                <td style="padding: 0.75rem 1rem;" class="text-center font-bold">${diffDays}</td>
                <td style="padding: 0.75rem 1rem; font-size: 0.8rem; line-height: 1.3;">${l.reason}</td>
                <td class="text-center" style="padding: 0.75rem 1rem;">
                    <div style="display: flex; gap: 0.5rem; justify-content: center;">
                        <button class="btn btn-primary btn-sm" onclick="respondToLeaveByPrincipal(${l.id}, 'approved')">Approve</button>
                        <button class="btn btn-outline btn-sm" style="color: var(--color-danger); border-color: var(--color-danger); padding: 0.4rem 0.8rem;" onclick="respondToLeaveByPrincipal(${l.id}, 'rejected')">Reject</button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        console.error("Error loading Principal leave approvals:", err);
    }
}

async function respondToLeaveByPrincipal(leaveId, status) {
    try {
        const success = await DB.updateLeaveStatus(leaveId, status);
        if (success) {
            showToast(`Leave request ${status === 'approved' ? 'approved' : 'rejected'}!`, "📋");
            await loadPrincipalConsole();
        } else {
            alert(`Failed to update leave request status to ${status}.`);
        }
    } catch (err) {
        alert("Error updating leave request: " + err.message);
    }
}

async function loadPrincipalFacultyRoster() {
    try {
        prFacultyData = await DB.getFaculty();
        renderPrincipalFacultyTable(prFacultyData);
    } catch (err) {
        console.error("Error loading faculty roster:", err);
    }
}

function renderPrincipalFacultyTable(faculty) {
    const tbody = document.getElementById('pr-faculty-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    // Do not show the Principal in their own directory lists to avoid accidental delete
    const displayFaculty = faculty.filter(f => f.id.toLowerCase() !== 'principal');
    
    if (displayFaculty.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="color: var(--color-text-muted); padding: 1.5rem;">No faculty records found.</td></tr>';
        return;
    }
    
    displayFaculty.forEach(f => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="padding: 0.75rem 1rem;" class="font-bold">${f.id}</td>
            <td style="padding: 0.75rem 1rem;">${f.name}</td>
            <td style="padding: 0.75rem 1rem; font-size: 0.8rem;">${f.department}<br><span style="color: var(--color-text-muted); font-weight: 600;">${f.designation}</span></td>
            <td style="padding: 0.75rem 1rem;"><span class="badge ${f.role === 'hod' ? 'badge-safe' : 'badge-info'}">${f.role.toUpperCase()}</span></td>
            <td class="text-center" style="padding: 0.75rem 1rem;">
                <button class="btn btn-outline btn-sm" style="color: var(--color-danger); border-color: var(--color-danger); padding: 0.2rem 0.5rem;" onclick="deleteFacultyByPrincipal('${f.id}')">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function filterPrincipalFaculty() {
    const searchVal = document.getElementById('pr-search-faculty').value.trim().toLowerCase();
    if (!searchVal) {
        renderPrincipalFacultyTable(prFacultyData);
        return;
    }
    
    const filtered = prFacultyData.filter(f => 
        f.name.toLowerCase().includes(searchVal) || 
        f.id.toLowerCase().includes(searchVal)
    );
    renderPrincipalFacultyTable(filtered);
}

async function addFacultyByPrincipal() {
    const id = document.getElementById('pr-faculty-id').value.trim().toLowerCase();
    const name = document.getElementById('pr-faculty-name').value.trim();
    const department = document.getElementById('pr-faculty-dept').value;
    const designation = document.getElementById('pr-faculty-desig').value.trim();
    const role = document.getElementById('pr-faculty-role').value;
    
    if (!id || !name || !designation) {
        alert("Please enter employee ID, full name, and designation.");
        return;
    }
    
    try {
        const success = await DB.addFaculty(id, name, department, designation, role);
        if (success) {
            showToast("Faculty registered successfully!", "👥");
            document.getElementById('pr-faculty-id').value = '';
            document.getElementById('pr-faculty-name').value = '';
            document.getElementById('pr-faculty-desig').value = '';
            await loadPrincipalFacultyRoster();
        } else {
            alert("Failed to register faculty. Account ID may already exist.");
        }
    } catch (err) {
        alert("Error registering faculty: " + err.message);
    }
}

async function deleteFacultyByPrincipal(facultyId) {
    if (!confirm(`Warning: Are you sure you want to delete faculty member "${facultyId.toUpperCase()}"? This will permanently delete their assigned classes and leave request history.`)) {
        return;
    }
    
    try {
        const success = await DB.deleteFaculty(facultyId);
        if (success) {
            showToast("Faculty profile deleted successfully.", "🗑️");
            await loadPrincipalFacultyRoster();
        } else {
            alert("Failed to delete faculty from database.");
        }
    } catch (err) {
        alert("Error deleting faculty: " + err.message);
    }
}

// ==========================================================================
// Appointments Scheduler Console Logic (Faculty Side)
// ==========================================================================
async function loadFacultyAppointmentsTab() {
    try {
        const list = await DB.getAppointments({ facultyId: currentFaculty.id });
        
        // Count metrics
        const pending = list.filter(a => a.status === 'pending');
        const responded = list.filter(a => a.status === 'approved' || a.status === 'rejected');
        
        const pendingMetric = document.getElementById('faculty-appt-stat-pending');
        const respondedMetric = document.getElementById('faculty-appt-stat-responded');
        
        if (pendingMetric) pendingMetric.innerText = pending.length;
        if (respondedMetric) respondedMetric.innerText = responded.length;
        
        // Render tables
        renderFacultyPendingAppointments(pending);
        renderFacultyRespondedAppointments(responded);
    } catch (err) {
        console.error("Error loading faculty appointments tab:", err);
    }
}

function renderFacultyPendingAppointments(pendingList) {
    const tbody = document.getElementById('faculty-pending-appointments-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    if (pendingList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="color: var(--color-text-muted); padding: 1.5rem;">No pending appointment requests.</td></tr>';
        return;
    }
    
    pendingList.forEach(appt => {
        const defaultRoom = currentFaculty.id === 'hod' ? 'HOD Cabin' : (currentFaculty.id === 'principal' ? 'Principal Office' : 'Staff Room');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="padding: 0.75rem 1rem; font-weight: 700; color: var(--color-primary);">${appt.student_name}</td>
            <td style="padding: 0.75rem 1rem; font-weight: 600;">${appt.student_id.toUpperCase()}</td>
            <td style="padding: 0.75rem 1rem; font-weight: 600;">${appt.request_date} at ${appt.request_time}</td>
            <td style="padding: 0.75rem 1rem; font-size: 0.85rem;">${appt.reason}</td>
            <td style="padding: 0.75rem 1rem;">
                <div style="display: flex; flex-direction: column; gap: 0.5rem; background-color: var(--color-bg-main); padding: 0.5rem; border-radius: var(--border-radius-sm); border: 1px solid var(--color-border);">
                    <div style="display: flex; gap: 0.5rem;">
                        <input type="text" id="slot-time-${appt.id}" class="form-control" style="font-size: 0.8rem; padding: 0.3rem 0.5rem; flex: 1.2;" placeholder="Scheduled Time" value="${appt.request_date} at ${appt.request_time}">
                        <input type="text" id="slot-room-${appt.id}" class="form-control" style="font-size: 0.8rem; padding: 0.3rem 0.5rem; flex: 0.8;" placeholder="Room/Location" value="${defaultRoom}">
                    </div>
                    <input type="text" id="slot-remarks-${appt.id}" class="form-control" style="font-size: 0.8rem; padding: 0.3rem 0.5rem;" placeholder="Remarks (optional)">
                    <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                        <button class="btn btn-primary" style="padding: 0.25rem 0.75rem; font-size: 0.75rem; background-color: var(--color-safe) !important; border-color: var(--color-safe) !important;" onclick="respondToAppointmentRequest(${appt.id}, 'approved')">Approve</button>
                        <button class="btn btn-secondary" style="padding: 0.25rem 0.75rem; font-size: 0.75rem; background-color: var(--color-danger) !important; border-color: var(--color-danger) !important; color: white;" onclick="respondToAppointmentRequest(${appt.id}, 'rejected')">Reject</button>
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderFacultyRespondedAppointments(respondedList) {
    const tbody = document.getElementById('faculty-approved-appointments-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    if (respondedList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="color: var(--color-text-muted); padding: 1.5rem;">No scheduled meetings history.</td></tr>';
        return;
    }
    
    respondedList.forEach(appt => {
        const statusClass = appt.status === 'approved' ? 'badge-safe' : 'badge-danger';
        const roomDisplay = appt.assigned_time ? appt.assigned_time : '--';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="padding: 0.75rem 1rem; font-weight: 700; color: var(--color-primary);">${appt.student_name}</td>
            <td style="padding: 0.75rem 1rem; font-weight: 600;">${appt.student_id.toUpperCase()}</td>
            <td style="padding: 0.75rem 1rem;">${appt.request_date} at ${appt.request_time}</td>
            <td style="padding: 0.75rem 1rem; font-weight: 700; color: var(--color-secondary);">${roomDisplay}</td>
            <td style="padding: 0.75rem 1rem; font-size: 0.85rem;">${appt.reason}</td>
            <td style="padding: 0.75rem 1rem; font-size: 0.8rem;">${appt.remarks || '<span style="color: var(--color-text-muted);">--</span>'}</td>
            <td style="padding: 0.75rem 1rem;"><span class="badge ${statusClass}">${appt.status.toUpperCase()}</span></td>
        `;
        tbody.appendChild(row);
    });
}

async function respondToAppointmentRequest(apptId, status) {
    try {
        let assignedTime = '';
        if (status === 'approved') {
            const timeVal = document.getElementById(`slot-time-${apptId}`).value.trim();
            const roomVal = document.getElementById(`slot-room-${apptId}`).value.trim();
            if (!timeVal || !roomVal) {
                alert("Please provide both Scheduled Time and Room/Location.");
                return;
            }
            assignedTime = `${timeVal} (Room: ${roomVal})`;
        }
        
        const remarksVal = document.getElementById(`slot-remarks-${apptId}`).value.trim();
        
        const success = await DB.respondToAppointment(apptId, status, assignedTime, remarksVal);
        if (success) {
            showToast(`Appointment ${status} successfully!`, "📅");
            await loadFacultyAppointmentsTab();
        } else {
            alert("Failed to update appointment request status.");
        }
    } catch (err) {
        console.error("Error responding to appointment request:", err);
        alert("Error responding to appointment: " + err.message);
    }
}

// ==========================================================================
// Principal Dashboard Analytics Reports (Chart.js)
// ==========================================================================
let complianceChartInstance = null;
let leavesChartInstance = null;

function renderPrincipalAnalyticsCharts(students, leaves, facultyList) {
    try {
        const ctxCompliance = document.getElementById('chart-pr-compliance');
        const ctxLeaves = document.getElementById('chart-pr-leaves');
        
        if (!ctxCompliance || !ctxLeaves) return;
        
        // 1. Calculate student standing states
        const activeCount = students.filter(s => s.status === 'active' || !s.status).length;
        const suspendedCount = students.filter(s => s.status === 'suspended').length;
        const detainedCount = students.filter(s => s.status === 'detained').length;
        
        if (complianceChartInstance) {
            complianceChartInstance.destroy();
        }
        
        complianceChartInstance = new Chart(ctxCompliance, {
            type: 'doughnut',
            data: {
                labels: ['Active', 'Suspended', 'Detained'],
                datasets: [{
                    data: [activeCount, suspendedCount, detainedCount],
                    backgroundColor: [
                        '#10B981', // Safe green
                        '#EF4444', // Danger red
                        '#F59E0B'  // Warning orange
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { size: 10 }
                        }
                    }
                }
            }
        });
        
        // 2. Calculate department leaves
        const deptLeaves = { 
            'CSE': 0, 
            'ECE': 0, 
            'IT': 0, 
            'MECH': 0, 
            'CIVIL': 0 
        };
        
        leaves.filter(l => l.status === 'approved').forEach(l => {
            const fac = facultyList.find(f => f.id === l.faculty_id);
            if (fac) {
                const dept = fac.department.toLowerCase();
                if (dept.includes('computer') || dept.includes('cse')) deptLeaves['CSE']++;
                else if (dept.includes('electronics') || dept.includes('ece')) deptLeaves['ECE']++;
                else if (dept.includes('information') || dept.includes('it')) deptLeaves['IT']++;
                else if (dept.includes('mechanical')) deptLeaves['MECH']++;
                else if (dept.includes('civil')) deptLeaves['CIVIL']++;
            }
        });
        
        if (leavesChartInstance) {
            leavesChartInstance.destroy();
        }
        
        leavesChartInstance = new Chart(ctxLeaves, {
            type: 'bar',
            data: {
                labels: ['CSE', 'ECE', 'IT', 'MECH', 'CIVIL'],
                datasets: [{
                    label: 'Approved Leaves Count',
                    data: [
                        deptLeaves['CSE'],
                        deptLeaves['ECE'],
                        deptLeaves['IT'],
                        deptLeaves['MECH'],
                        deptLeaves['CIVIL']
                    ],
                    backgroundColor: '#1E3A8A', // Deep navy
                    borderColor: '#1E3A8A',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });
    } catch (e) {
        console.error("Error drawing principal charts:", e);
    }
}

// ==========================================================================
// Faculty Advising Chat Panel Logic
// ==========================================================================
let activeChatStudentId = null;
let activeChatStudentName = null;

async function loadFacultyChatTab() {
    try {
        const threadsContainer = document.getElementById('faculty-chat-threads');
        if (!threadsContainer) return;
        
        threadsContainer.innerHTML = '';
        
        const chatsList = await DB.getChatMessages(null, currentFaculty.id);
        
        const uniqueStudents = {};
        chatsList.forEach(c => {
            if (!uniqueStudents[c.student_id]) {
                uniqueStudents[c.student_id] = {
                    id: c.student_id,
                    name: c.student_name,
                    lastMessage: c.message,
                    timestamp: c.timestamp
                };
            } else {
                uniqueStudents[c.student_id].lastMessage = c.message;
                uniqueStudents[c.student_id].timestamp = c.timestamp;
            }
        });
        
        const threads = Object.values(uniqueStudents);
        if (threads.length === 0) {
            threadsContainer.innerHTML = '<div style="font-size:0.85rem; color:var(--color-text-muted); text-align:center; padding:1.5rem;">No active student conversations.</div>';
            resetFacultyChatWindow();
            return;
        }
        
        threads.forEach(t => {
            const isActive = t.id === activeChatStudentId;
            const item = document.createElement('div');
            item.className = `chat-thread-item ${isActive ? 'active' : ''}`;
            item.onclick = () => selectChatThread(t.id, t.name);
            
            item.innerHTML = `
                <div class="profile-avatar" style="width:36px; height:36px; font-size:1.1rem; display:flex; align-items:center; justify-content:center; border-radius:50%; background-color: var(--color-primary-light); color:white;">🎓</div>
                <div style="flex-grow:1; min-width:0; text-align:left;">
                    <h4 class="chat-thread-name">${t.name}</h4>
                    <p class="chat-thread-meta" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px;">${t.lastMessage}</p>
                </div>
            `;
            threadsContainer.appendChild(item);
        });
        
        if (!activeChatStudentId && threads.length > 0) {
            selectChatThread(threads[0].id, threads[0].name);
        } else if (activeChatStudentId) {
            await renderFacultyChatMessages();
        }
    } catch (err) {
        console.error("Error loading faculty chat tab:", err);
    }
}

function resetFacultyChatWindow() {
    activeChatStudentId = null;
    activeChatStudentName = null;
    document.getElementById('faculty-chat-title').innerText = 'Select a student thread to begin';
    document.getElementById('faculty-chat-messages').innerHTML = `
        <div style="display: flex; height: 100%; align-items: center; justify-content: center; color: var(--color-text-muted); flex-direction: column; gap: 0.5rem;">
            <span style="font-size: 2.5rem;">💬</span>
            <span>Select a student thread from the left panel to load conversation history.</span>
        </div>`;
    document.getElementById('faculty-chat-controls').style.display = 'none';
}

async function selectChatThread(studentId, studentName) {
    activeChatStudentId = studentId;
    activeChatStudentName = studentName;
    
    const items = document.querySelectorAll('.chat-thread-item');
    items.forEach(el => el.classList.remove('active'));
    
    document.getElementById('faculty-chat-controls').style.display = 'flex';
    document.getElementById('faculty-chat-title').innerText = `Conversation with ${studentName} (${studentId.toUpperCase()})`;
    
    await renderFacultyChatMessages();
}

async function renderFacultyChatMessages() {
    try {
        if (!activeChatStudentId) return;
        
        const messages = await DB.getChatMessages(activeChatStudentId, currentFaculty.id);
        const chatBox = document.getElementById('faculty-chat-messages');
        if (!chatBox) return;
        
        chatBox.innerHTML = '';
        messages.forEach(msg => {
            const isStudent = msg.sender === 'student';
            const bubble = document.createElement('div');
            bubble.className = `chat-bubble ${isStudent ? 'chat-bubble-student' : 'chat-bubble-faculty'}`;
            bubble.style.alignSelf = isStudent ? 'flex-start' : 'flex-end';
            if (!isStudent) {
                bubble.style.backgroundColor = 'var(--color-primary)';
                bubble.style.color = '#FFFFFF';
            }
            
            bubble.innerHTML = `
                <div>${msg.message}</div>
                <span class="chat-bubble-timestamp">${msg.timestamp}</span>
            `;
            chatBox.appendChild(bubble);
        });
        
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (err) {
        console.error("Error rendering faculty chat messages:", err);
    }
}

async function sendFacultyChatMessage() {
    try {
        const input = document.getElementById('chat-faculty-input');
        if (!input) return;
        
        const text = input.value.trim();
        if (!text) return;
        
        const success = await DB.sendChatMessage(
            activeChatStudentId,
            activeChatStudentName,
            currentFaculty.id,
            text,
            'faculty'
        );
        
        if (success) {
            input.value = '';
            await renderFacultyChatMessages();
            await loadFacultyChatTab();
        } else {
            alert("Failed to send reply.");
        }
    } catch (err) {
        console.error("Error sending faculty chat reply:", err);
    }
}
