/* ==========================================================================
   Vignan's Lara Institute of Technology & Science (VLITS) Portal Data Core
   Provides: LocalStorage-based Database Simulator and Initial Mock Data
   Upgraded: Handles both LocalStorage Fallback and Async Fetch SQLite backend.
   ========================================================================== */

const DB_KEY_STUDENTS = 'vlits_portal_students';
const DB_KEY_FACULTY = 'vlits_portal_faculty';
const DB_KEY_LOGGED_IN = 'vlits_portal_logged_in';
const DB_KEY_ATTENDANCE_LOGS = 'vlits_portal_attendance_logs';
const DB_KEY_ANNOUNCEMENTS = 'vlits_portal_announcements';
const DB_KEY_LEAVES = 'vlits_portal_leaves';
const DB_KEY_APPOINTMENTS = 'vlits_portal_appointments';
const DB_KEY_CHAT_MESSAGES = 'vlits_portal_chat_messages';

// Initial Mock Data (For local fallback)
const INITIAL_LEAVES = [
    { id: 1, faculty_id: '24fe1a0487', type: 'Casual', date_from: '2026-05-10', date_to: '2026-05-12', reason: 'Family function in Guntur', status: 'approved', applied_on: '2026-05-08' },
    { id: 2, faculty_id: '24fe1a0487', type: 'Sick', date_from: '2026-06-15', date_to: '2026-06-16', reason: 'Medical checkup', status: 'pending', applied_on: '2026-06-03' },
    { id: 3, faculty_id: 'faculty2', type: 'Casual', date_from: '2026-04-18', date_to: '2026-04-19', reason: 'Personal work', status: 'approved', applied_on: '2026-04-15' }
];

const INITIAL_APPOINTMENTS = [
    {
        id: 1,
        student_id: '24fe1a0487',
        student_name: 'P. Sai Prashanth',
        faculty_id: 'hod',
        faculty_name: 'Dr. K. Srinivas Rao',
        request_date: '2026-06-10',
        request_time: '10:30 AM',
        assigned_time: null,
        reason: 'Review of WT project guidelines',
        status: 'pending',
        remarks: null
    },
    {
        id: 2,
        student_id: '24fe1a0487',
        student_name: 'P. Sai Prashanth',
        faculty_id: 'faculty2',
        faculty_name: 'Mrs. M. V. Sailaja',
        request_date: '2026-06-05',
        request_time: '02:00 PM',
        assigned_time: 'CSE Block Room 204 - 02:15 PM',
        reason: 'Discussion about WT assignment scores',
        status: 'approved',
        remarks: 'Bring your assignment records.'
    }
];

const INITIAL_CHAT_MESSAGES = [
    {
        id: 1,
        student_id: '24fe1a0487',
        student_name: 'P. Sai Prashanth',
        faculty_id: 'hod',
        message: 'Respected Sir, I was absent last week due to severe typhoid fever. Please consider my leave justification.',
        sender: 'student',
        timestamp: '2026-06-03 10:00 AM'
    },
    {
        id: 2,
        student_id: '24fe1a0487',
        student_name: 'P. Sai Prashanth',
        faculty_id: 'hod',
        message: 'Please submit the medical certificate and doctor reports when you attend the next WT lecture. We will review your attendance percentage then.',
        sender: 'faculty',
        timestamp: '2026-06-03 04:30 PM'
    },
    {
        id: 3,
        student_id: '24fe1a0487',
        student_name: 'P. Sai Prashanth',
        faculty_id: 'hod',
        message: 'Sure Sir. I will bring the reports on Monday. Thank you.',
        sender: 'student',
        timestamp: '2026-06-04 09:15 AM'
    }
];

const INITIAL_ANNOUNCEMENTS = [
    { id: 1, type: 'notice', date: '02 Jun 2026', title: 'Autonomous End-Semester Exams Registration', desc: 'Registration for B.Tech III Year II Semester End Exams is now open. Verify fee dues before registering.' },
    { id: 2, type: 'notice', date: '28 May 2026', title: 'Condonation Medical Submissions Timeline', desc: 'Students with 65% - 74.9% aggregate attendance must submit medical forms to administrative office by June 10.' },
    { id: 3, type: 'notice', date: '15 May 2026', title: 'Mid-II Examinations Schedule Announcement', desc: 'Mid-II internal assessments will commence from June 15, 2026. Detailed schedule uploaded inside portals.' },
    { id: 4, type: 'calendar', date: '10 Jun 2026', title: 'Last Date for Exam Fee Payment', desc: 'B.Tech III-II regular and supplementary exam registrations close without fine.' },
    { id: 5, type: 'calendar', date: '15-20 Jun', title: 'Mid-II Internal Practical & Theory Examinations', desc: 'Regular schedule for core branches. Standard attendance regulations apply.' },
    { id: 6, type: 'calendar', date: '25 Jun 2026', title: 'Last Working Day of Semester', desc: 'Attendance logs will be frozen at 5:00 PM for semester exam eligibility verification.' }
];

const INITIAL_STUDENTS = [
    {
        id: "24fe1a0487",
        password: "24fe1a0487",
        name: "P. Sai Prashanth",
        regdNo: "24FE1A0487",
        branch: "Computer Science & Engineering",
        year: "3rd Year",
        semester: "1st Semester",
        section: "B",
        profileImg: "👨‍🎓",
        remarks: "No feedback entered yet.",
        status: "active",
        attendance: [
            { code: "MFCS", name: "Math Foundations of CS", attended: 38, conducted: 50 },
            { code: "SE", name: "Software Engineering", attended: 32, conducted: 48 },
            { code: "DBMS", name: "Database Management Systems", attended: 42, conducted: 50 },
            { code: "COA", name: "Computer Org & Architecture", attended: 26, conducted: 48 },
            { code: "OOPJ", name: "Object Oriented Programming (Java)", attended: 38, conducted: 48 }
        ],
        marks: {
            "MFCS": { mid1: 18, mid2: null, assignment: 5, external: null },
            "SE": { mid1: 14, mid2: null, assignment: 4, external: null },
            "DBMS": { mid1: 19, mid2: null, assignment: 5, external: null },
            "COA": { mid1: 12, mid2: null, assignment: 4, external: null },
            "OOPJ": { mid1: 17, mid2: null, assignment: 5, external: null }
        },
        fees: {
            tuition: { total: 85000, paid: 65000, history: [{ date: "2025-08-12", amount: 65000, ref: "TXN9837482" }] },
            exam: { total: 1500, paid: 0, history: [] },
            library: { total: 500, paid: 500, history: [{ date: "2025-09-01", amount: 500, ref: "TXN9849281" }] },
            hostel: { total: 75000, paid: 75000, history: [{ date: "2025-08-10", amount: 75000, ref: "TXN9821948" }] }
        }
    },
    {
        id: "24fe1a0401",
        password: "24fe1a0401",
        name: "A. Vinay Kumar",
        regdNo: "24FE1A0401",
        branch: "Computer Science & Engineering",
        year: "3rd Year",
        semester: "1st Semester",
        section: "B",
        profileImg: "👨‍🎓",
        remarks: "No feedback entered yet.",
        status: "active",
        attendance: [
            { code: "MFCS", name: "Math Foundations of CS", attended: 45, conducted: 50 },
            { code: "SE", name: "Software Engineering", attended: 43, conducted: 48 },
            { code: "DBMS", name: "Database Management Systems", attended: 46, conducted: 50 },
            { code: "COA", name: "Computer Org & Architecture", attended: 42, conducted: 48 },
            { code: "OOPJ", name: "Object Oriented Programming (Java)", attended: 44, conducted: 48 }
        ],
        marks: {
            "MFCS": { mid1: 19, mid2: null, assignment: 5, external: null },
            "SE": { mid1: 18, mid2: null, assignment: 5, external: null },
            "DBMS": { mid1: 20, mid2: null, assignment: 5, external: null },
            "COA": { mid1: 17, mid2: null, assignment: 4, external: null },
            "OOPJ": { mid1: 19, mid2: null, assignment: 5, external: null }
        },
        fees: {
            tuition: { total: 85000, paid: 85000, history: [{ date: "2025-08-11", amount: 85000, ref: "TXN9831920" }] },
            exam: { total: 1500, paid: 1500, history: [{ date: "2025-10-15", amount: 1500, ref: "TXN9899201" }] },
            library: { total: 500, paid: 500, history: [{ date: "2025-09-01", amount: 500, ref: "TXN9849285" }] },
            hostel: { total: 75000, paid: 75000, history: [{ date: "2025-08-10", amount: 75000, ref: "TXN9821949" }] }
        }
    },
    {
        id: "24fe1a0402",
        password: "24fe1a0402",
        name: "B. Sushma",
        regdNo: "24FE1A0402",
        branch: "Computer Science & Engineering",
        year: "3rd Year",
        semester: "1st Semester",
        section: "B",
        profileImg: "👩‍🎓",
        remarks: "No feedback entered yet.",
        status: "active",
        attendance: [
            { code: "MFCS", name: "Math Foundations of CS", attended: 39, conducted: 50 },
            { code: "SE", name: "Software Engineering", attended: 38, conducted: 48 },
            { code: "DBMS", name: "Database Management Systems", attended: 40, conducted: 50 },
            { code: "COA", name: "Computer Org & Architecture", attended: 35, conducted: 48 },
            { code: "OOPJ", name: "Object Oriented Programming (Java)", attended: 39, conducted: 48 }
        ],
        marks: {
            "MFCS": { mid1: 16, mid2: null, assignment: 4, external: null },
            "SE": { mid1: 15, mid2: null, assignment: 4, external: null },
            "DBMS": { mid1: 18, mid2: null, assignment: 5, external: null },
            "COA": { mid1: 14, mid2: null, assignment: 4, external: null },
            "OOPJ": { mid1: 16, mid2: null, assignment: 4, external: null }
        },
        fees: {
            tuition: { total: 85000, paid: 85000, history: [{ date: "2025-08-11", amount: 85000, ref: "TXN9831921" }] },
            exam: { total: 1500, paid: 0, history: [] },
            library: { total: 500, paid: 500, history: [{ date: "2025-09-01", amount: 500, ref: "TXN9849286" }] },
            hostel: { total: 75000, paid: 0, history: [] }
        }
    },
    {
        id: "24fe1a0403",
        password: "24fe1a0403",
        name: "C. Harshavardhan",
        regdNo: "24FE1A0403",
        branch: "Computer Science & Engineering",
        year: "3rd Year",
        semester: "1st Semester",
        section: "B",
        profileImg: "👨‍🎓",
        remarks: "No feedback entered yet.",
        status: "active",
        attendance: [
            { code: "MFCS", name: "Math Foundations of CS", attended: 31, conducted: 50 },
            { code: "SE", name: "Software Engineering", attended: 29, conducted: 48 },
            { code: "DBMS", name: "Database Management Systems", attended: 33, conducted: 50 },
            { code: "COA", name: "Computer Org & Architecture", attended: 28, conducted: 48 },
            { code: "OOPJ", name: "Object Oriented Programming (Java)", attended: 30, conducted: 48 }
        ],
        marks: {
            "MFCS": { mid1: 12, mid2: null, assignment: 4, external: null },
            "SE": { mid1: 11, mid2: null, assignment: 3, external: null },
            "DBMS": { mid1: 13, mid2: null, assignment: 4, external: null },
            "COA": { mid1: 10, mid2: null, assignment: 3, external: null },
            "OOPJ": { mid1: 12, mid2: null, assignment: 4, external: null }
        },
        fees: {
            tuition: { total: 85000, paid: 45000, history: [{ date: "2025-08-15", amount: 45000, ref: "TXN9839401" }] },
            exam: { total: 1500, paid: 0, history: [] },
            library: { total: 500, paid: 500, history: [{ date: "2025-09-01", amount: 500, ref: "TXN9849287" }] },
            hostel: { total: 75000, paid: 35000, history: [{ date: "2025-08-15", amount: 35000, ref: "TXN9829481" }] }
        }
    },
    {
        id: "24fe1a0404",
        password: "24fe1a0404",
        name: "D. Lakshmi Prasanna",
        regdNo: "24FE1A0404",
        branch: "Computer Science & Engineering",
        year: "3rd Year",
        semester: "1st Semester",
        section: "B",
        profileImg: "👩‍🎓",
        remarks: "No feedback entered yet.",
        status: "active",
        attendance: [
            { code: "MFCS", name: "Math Foundations of CS", attended: 48, conducted: 50 },
            { code: "SE", name: "Software Engineering", attended: 47, conducted: 48 },
            { code: "DBMS", name: "Database Management Systems", attended: 49, conducted: 50 },
            { code: "COA", name: "Computer Org & Architecture", attended: 46, conducted: 48 },
            { code: "OOPJ", name: "Object Oriented Programming (Java)", attended: 47, conducted: 48 }
        ],
        marks: {
            "MFCS": { mid1: 20, mid2: null, assignment: 5, external: null },
            "SE": { mid1: 19, mid2: null, assignment: 5, external: null },
            "DBMS": { mid1: 20, mid2: null, assignment: 5, external: null },
            "COA": { mid1: 19, mid2: null, assignment: 5, external: null },
            "OOPJ": { mid1: 20, mid2: null, assignment: 5, external: null }
        },
        fees: {
            tuition: { total: 85000, paid: 85000, history: [{ date: "2025-08-09", amount: 85000, ref: "TXN9810294" }] },
            exam: { total: 1500, paid: 1500, history: [{ date: "2025-10-14", amount: 1500, ref: "TXN9883719" }] },
            library: { total: 500, paid: 500, history: [{ date: "2025-09-01", amount: 500, ref: "TXN9849288" }] },
            hostel: { total: 75000, paid: 75000, history: [{ date: "2025-08-10", amount: 75000, ref: "TXN9821950" }] }
        }
    }
];

const INITIAL_FACULTY = [
    {
        id: "principal",
        password: "principal",
        name: "Dr. P. R. Prasad",
        department: "Administration",
        designation: "Principal",
        profileImg: "👑",
        role: "principal",
        subjects: []
    },
    {
        id: "hod",
        password: "hod",
        name: "Dr. K. Srinivas Rao",
        department: "Computer Science & Engineering",
        designation: "Professor & HOD",
        profileImg: "👨‍🏫",
        role: "hod",
        subjects: [
            { code: "COA", name: "Computer Org & Architecture", class: "3rd Year B" },
            { code: "SE", name: "Software Engineering", class: "3rd Year B" }
        ]
    },
    {
        id: "24fe1a0487",
        password: "24fe1a0487",
        name: "Dr. K. Srinivas Rao",
        department: "Computer Science & Engineering",
        designation: "Professor",
        profileImg: "👨‍🏫",
        role: "faculty",
        subjects: [
            { code: "COA", name: "Computer Org & Architecture", class: "3rd Year B" },
            { code: "SE", name: "Software Engineering", class: "3rd Year B" }
        ]
    },
    {
        id: "faculty2",
        password: "password123",
        name: "Mrs. M. V. Sailaja",
        department: "Computer Science & Engineering",
        designation: "Assistant Professor",
        profileImg: "👩‍🏫",
        role: "faculty",
        subjects: [
            { code: "MFCS", name: "Math Foundations of CS", class: "3rd Year B" },
            { code: "DBMS", name: "Database Management Systems", class: "3rd Year B" },
            { code: "OOPJ", name: "Object Oriented Programming (Java)", class: "3rd Year B" }
        ]
    }
];

// Backend API Connection Probe
let API_MODE = false;
let apiCheckPromise = null;

function ensureApiModeChecked() {
    if (!apiCheckPromise) {
        apiCheckPromise = fetch('/api/status')
            .then(res => res.json())
            .then(json => {
                if (json && json.status === 'running') {
                    API_MODE = true;
                    console.log("VLITS Portal running in SQLITE SERVER MODE.");
                } else {
                    API_MODE = false;
                }
                return API_MODE;
            })
            .catch(() => {
                API_MODE = false;
                console.log("VLITS Portal running in LOCALSTORAGE FALLBACK MODE.");
                return false;
            });
    }
    return apiCheckPromise;
}

// LocalStorage Fallback database seeding
function initLocalDatabase() {
    if (!localStorage.getItem(DB_KEY_STUDENTS)) {
        localStorage.setItem(DB_KEY_STUDENTS, JSON.stringify(INITIAL_STUDENTS));
    }
    if (!localStorage.getItem(DB_KEY_FACULTY)) {
        localStorage.setItem(DB_KEY_FACULTY, JSON.stringify(INITIAL_FACULTY));
    } else {
        try {
            const list = JSON.parse(localStorage.getItem(DB_KEY_FACULTY)) || [];
            if (!list.some(f => f.id === 'principal')) {
                const pr = INITIAL_FACULTY.find(f => f.id === 'principal');
                if (pr) {
                    list.push(pr);
                    localStorage.setItem(DB_KEY_FACULTY, JSON.stringify(list));
                }
            }
        } catch (e) {
            console.error("Error injecting principal profile:", e);
        }
    }
    if (!localStorage.getItem(DB_KEY_ATTENDANCE_LOGS)) {
        localStorage.setItem(DB_KEY_ATTENDANCE_LOGS, JSON.stringify([]));
    }
    if (!localStorage.getItem(DB_KEY_ANNOUNCEMENTS)) {
        localStorage.setItem(DB_KEY_ANNOUNCEMENTS, JSON.stringify(INITIAL_ANNOUNCEMENTS));
    }
    if (!localStorage.getItem(DB_KEY_LEAVES)) {
        localStorage.setItem(DB_KEY_LEAVES, JSON.stringify(INITIAL_LEAVES));
    }
    if (!localStorage.getItem(DB_KEY_APPOINTMENTS)) {
        localStorage.setItem(DB_KEY_APPOINTMENTS, JSON.stringify(INITIAL_APPOINTMENTS));
    }
    if (!localStorage.getItem(DB_KEY_CHAT_MESSAGES)) {
        localStorage.setItem(DB_KEY_CHAT_MESSAGES, JSON.stringify(INITIAL_CHAT_MESSAGES));
    }
}

// API POST call helper
async function apiPost(url, data) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Server communication error.");
    }
    return await res.json();
}

// Async Database Interface Wrapper
const DB = {
    // Get all students (fallback uses localStorage)
    getStudents: async function() {
        await ensureApiModeChecked();
        if (API_MODE) {
            const res = await fetch('/api/students/list');
            return await res.json();
        } else {
            initLocalDatabase();
            return JSON.parse(localStorage.getItem(DB_KEY_STUDENTS));
        }
    },

    saveStudents: function(students) {
        localStorage.setItem(DB_KEY_STUDENTS, JSON.stringify(students));
    },

    // Get specific student by ID
    getStudentById: async function(id) {
        await ensureApiModeChecked();
        if (API_MODE) {
            const res = await fetch(`/api/student/get?id=${encodeURIComponent(id)}`);
            if (!res.ok) return null;
            return await res.json();
        } else {
            initLocalDatabase();
            const students = JSON.parse(localStorage.getItem(DB_KEY_STUDENTS));
            return students.find(s => s.id.toLowerCase() === id.toLowerCase());
        }
    },

    // Get all faculty
    getFaculty: async function() {
        await ensureApiModeChecked();
        if (API_MODE) {
            const res = await fetch('/api/faculty/list');
            return await res.json();
        } else {
            initLocalDatabase();
            return JSON.parse(localStorage.getItem(DB_KEY_FACULTY));
        }
    },

    // Get specific faculty by ID
    getFacultyById: async function(id) {
        await ensureApiModeChecked();
        if (API_MODE) {
            const res = await fetch(`/api/faculty/get?id=${encodeURIComponent(id)}`);
            if (!res.ok) return null;
            return await res.json();
        } else {
            initLocalDatabase();
            const faculty = JSON.parse(localStorage.getItem(DB_KEY_FACULTY));
            return faculty.find(f => f.id.toLowerCase() === id.toLowerCase());
        }
    },

    // Authenticate student
    loginStudent: async function(id, password) {
        await ensureApiModeChecked();
        if (API_MODE) {
            try {
                const data = await apiPost('/api/login/student', { id, password });
                if (data.success) {
                    localStorage.setItem(DB_KEY_LOGGED_IN, JSON.stringify({ type: 'student', userId: data.user.id }));
                    return data.user;
                }
            } catch (err) {
                console.error(err);
            }
            return null;
        } else {
            initLocalDatabase();
            const students = JSON.parse(localStorage.getItem(DB_KEY_STUDENTS));
            const student = students.find(s => s.id.toLowerCase() === id.toLowerCase());
            if (student && student.password === password) {
                localStorage.setItem(DB_KEY_LOGGED_IN, JSON.stringify({ type: 'student', userId: student.id }));
                return student;
            }
            return null;
        }
    },

    // Authenticate faculty
    loginFaculty: async function(id, password) {
        await ensureApiModeChecked();
        if (API_MODE) {
            try {
                const data = await apiPost('/api/login/faculty', { id, password });
                if (data.success) {
                    localStorage.setItem(DB_KEY_LOGGED_IN, JSON.stringify({ type: 'faculty', userId: data.user.id }));
                    return data.user;
                }
            } catch (err) {
                console.error(err);
            }
            return null;
        } else {
            initLocalDatabase();
            const faculty = JSON.parse(localStorage.getItem(DB_KEY_FACULTY));
            const fac = faculty.find(f => f.id.toLowerCase() === id.toLowerCase());
            if (fac && fac.password === password) {
                localStorage.setItem(DB_KEY_LOGGED_IN, JSON.stringify({ type: 'faculty', userId: fac.id }));
                return fac;
            }
            return null;
        }
    },

    // Get current logged in user session
    getLoggedInUser: async function() {
        await ensureApiModeChecked();
        const session = localStorage.getItem(DB_KEY_LOGGED_IN);
        if (session) {
            const parsed = JSON.parse(session);
            if (API_MODE) {
                if (parsed.type === 'student') {
                    const user = await this.getStudentById(parsed.userId);
                    return user ? { type: 'student', user } : null;
                } else {
                    const user = await this.getFacultyById(parsed.userId);
                    return user ? { type: 'faculty', user } : null;
                }
            } else {
                initLocalDatabase();
                if (parsed.type === 'student') {
                    const students = JSON.parse(localStorage.getItem(DB_KEY_STUDENTS));
                    const user = students.find(s => s.id === parsed.userId);
                    return user ? { type: 'student', user } : null;
                } else {
                    const faculty = JSON.parse(localStorage.getItem(DB_KEY_FACULTY));
                    const user = faculty.find(f => f.id === parsed.userId);
                    return user ? { type: 'faculty', user } : null;
                }
            }
        }
        return null;
    },

    // Logout
    logout: function() {
        localStorage.removeItem(DB_KEY_LOGGED_IN);
    },

    // Update Attendance (from Faculty panel)
    markAttendance: async function(subjectCode, studentPresentMap, date, period) {
        await ensureApiModeChecked();
        if (API_MODE) {
            const res = await apiPost('/api/attendance/mark', { subjectCode, studentPresentMap, date, period });
            return res.success;
        } else {
            initLocalDatabase();
            const students = JSON.parse(localStorage.getItem(DB_KEY_STUDENTS));
            students.forEach(student => {
                const sub = student.attendance.find(a => a.code === subjectCode);
                if (sub) {
                    sub.conducted += 1;
                    if (studentPresentMap[student.id]) {
                        sub.attended += 1;
                    }
                }
            });
            this.saveStudents(students);
            
            const logs = JSON.parse(localStorage.getItem(DB_KEY_ATTENDANCE_LOGS)) || [];
            logs.unshift({
                date, period, subjectCode,
                presentCount: Object.values(studentPresentMap).filter(Boolean).length,
                totalCount: Object.keys(studentPresentMap).length,
                timestamp: new Date().toISOString()
            });
            localStorage.setItem(DB_KEY_ATTENDANCE_LOGS, JSON.stringify(logs));
            return true;
        }
    },

    // Update Marks (from Faculty panel)
    saveMarks: async function(subjectCode, studentMarksMap, examType) {
        await ensureApiModeChecked();
        if (API_MODE) {
            const res = await apiPost('/api/marks/save', { subjectCode, studentMarksMap, examType });
            return res.success;
        } else {
            initLocalDatabase();
            const students = JSON.parse(localStorage.getItem(DB_KEY_STUDENTS));
            students.forEach(student => {
                if (studentMarksMap[student.id] !== undefined && studentMarksMap[student.id] !== "") {
                    const score = parseFloat(studentMarksMap[student.id]);
                    if (!student.marks[subjectCode]) {
                        student.marks[subjectCode] = { mid1: null, mid2: null, assignment: null, external: null };
                    }
                    student.marks[subjectCode][examType] = score;
                }
            });
            this.saveStudents(students);
            return true;
        }
    },

    // Record Fee Payment (from Student panel)
    payFee: async function(studentId, feeType, amount) {
        await ensureApiModeChecked();
        if (API_MODE) {
            return await apiPost('/api/fees/pay', { studentId, feeType, amount });
        } else {
            initLocalDatabase();
            const students = JSON.parse(localStorage.getItem(DB_KEY_STUDENTS));
            const student = students.find(s => s.id === studentId);
            
            if (student && student.fees[feeType]) {
                const fee = student.fees[feeType];
                const remaining = fee.total - fee.paid;
                const payAmount = Math.min(amount, remaining);
                
                if (payAmount > 0) {
                    fee.paid += payAmount;
                    const refNo = "TXN" + Math.floor(10000000 + Math.random() * 90000000);
                    const paymentDate = new Date().toISOString().split('T')[0];
                    
                    fee.history.unshift({
                        date: paymentDate,
                        amount: payAmount,
                        ref: refNo
                    });
                    
                    this.saveStudents(students);
                    return { success: true, ref: refNo, amount: payAmount, date: paymentDate };
                }
            }
            return { success: false, error: "Invalid payment amount or fee type." };
        }
    },

    // Excel Sheet Import Simulation
    importStudentDataExcel: async function(jsonData) {
        await ensureApiModeChecked();
        if (API_MODE) {
            const res = await apiPost('/api/excel/import', { rows: jsonData });
            return res.success;
        } else {
            initLocalDatabase();
            const students = JSON.parse(localStorage.getItem(DB_KEY_STUDENTS));
            
            jsonData.forEach(row => {
                const regdNo = row.regdNo.trim().toUpperCase();
                let student = students.find(s => s.regdNo === regdNo);
                
                if (!student) {
                    student = {
                        id: regdNo.toLowerCase(),
                        password: regdNo.toLowerCase(),
                        name: row.name || "Student Name",
                        regdNo: regdNo,
                        branch: row.branch || "Computer Science & Engineering",
                        year: row.year || "3rd Year",
                        semester: row.semester || "1st Semester",
                        section: row.section || "B",
                        profileImg: "👨‍🎓",
                        remarks: "No feedback entered yet.",
                        status: "active",
                        attendance: [],
                        marks: {},
                        fees: {
                            tuition: { total: 85000, paid: 0, history: [] },
                            exam: { total: 1500, paid: 0, history: [] },
                            library: { total: 500, paid: 0, history: [] },
                            hostel: { total: 75000, paid: 0, history: [] }
                        }
                    };
                    students.push(student);
                }
                
                if (row.subjectCode) {
                    let sub = student.attendance.find(a => a.code === row.subjectCode);
                    if (!sub) {
                        sub = { code: row.subjectCode, name: row.subjectName || row.subjectCode, attended: 0, conducted: 0 };
                        student.attendance.push(sub);
                    }
                    sub.attended = parseInt(row.attended || 0);
                    sub.conducted = parseInt(row.conducted || 0);
                }

                if (row.subjectCode && row.examType && row.marks !== undefined) {
                    if (!student.marks[row.subjectCode]) {
                        student.marks[row.subjectCode] = { mid1: null, mid2: null, assignment: null, external: null };
                    }
                    student.marks[row.subjectCode][row.examType] = parseFloat(row.marks);
                }
            });
            
            this.saveStudents(students);
            return true;
        }
    },

    saveStudentRemarks: async function(studentId, remarks) {
        await ensureApiModeChecked();
        if (API_MODE) {
            const res = await apiPost('/api/student/remarks/save', { studentId, remarks });
            return res.success;
        } else {
            initLocalDatabase();
            const students = JSON.parse(localStorage.getItem(DB_KEY_STUDENTS));
            const student = students.find(s => s.id === studentId);
            if (student) {
                student.remarks = remarks;
                this.saveStudents(students);
                return true;
            }
            return false;
        }
    },

    getAnnouncements: async function() {
        await ensureApiModeChecked();
        if (API_MODE) {
            const res = await fetch('/api/announcements/list');
            return await res.json();
        } else {
            initLocalDatabase();
            return JSON.parse(localStorage.getItem(DB_KEY_ANNOUNCEMENTS)) || [];
        }
    },

    addAnnouncement: async function(type, date, title, desc) {
        await ensureApiModeChecked();
        if (API_MODE) {
            const res = await apiPost('/api/announcements/add', { type, date, title, desc });
            return res.success;
        } else {
            initLocalDatabase();
            const list = JSON.parse(localStorage.getItem(DB_KEY_ANNOUNCEMENTS)) || [];
            const newId = list.length ? Math.max(...list.map(a => a.id)) + 1 : 1;
            list.unshift({ id: newId, type, date, title, desc });
            localStorage.setItem(DB_KEY_ANNOUNCEMENTS, JSON.stringify(list));
            return true;
        }
    },

    deleteAnnouncement: async function(id) {
        await ensureApiModeChecked();
        if (API_MODE) {
            const res = await apiPost('/api/announcements/delete', { id: parseInt(id) });
            return res.success;
        } else {
            initLocalDatabase();
            let list = JSON.parse(localStorage.getItem(DB_KEY_ANNOUNCEMENTS)) || [];
            list = list.filter(a => a.id !== parseInt(id));
            localStorage.setItem(DB_KEY_ANNOUNCEMENTS, JSON.stringify(list));
            return true;
        }
    },

    saveStudentStatus: async function(studentId, status) {
        await ensureApiModeChecked();
        if (API_MODE) {
            const res = await apiPost('/api/student/status/save', { studentId, status });
            return res.success;
        } else {
            initLocalDatabase();
            const students = JSON.parse(localStorage.getItem(DB_KEY_STUDENTS));
            const student = students.find(s => s.id.toLowerCase() === studentId.toLowerCase());
            if (student) {
                student.status = status;
                this.saveStudents(students);
                return true;
            }
            return false;
        }
    },

    addStudent: async function(id, name, branch, section) {
        await ensureApiModeChecked();
        if (API_MODE) {
            const res = await apiPost('/api/student/add', { id, name, branch, section });
            return res.success;
        } else {
            initLocalDatabase();
            const students = JSON.parse(localStorage.getItem(DB_KEY_STUDENTS));
            const exists = students.some(s => s.id.toLowerCase() === id.toLowerCase());
            if (exists) return false;
            
            const newStudent = {
                id: id.toLowerCase(),
                password: id.toLowerCase(),
                name: name,
                regdNo: id.toUpperCase(),
                branch: branch,
                year: "3rd Year",
                semester: "1st Semester",
                section: section,
                profileImg: "👨‍🎓",
                remarks: "No feedback entered yet.",
                status: "active",
                attendance: [
                    { code: "MFCS", name: "Math Foundations of CS", attended: 0, conducted: 0 },
                    { code: "SE", name: "Software Engineering", attended: 0, conducted: 0 },
                    { code: "DBMS", name: "Database Management Systems", attended: 0, conducted: 0 },
                    { code: "COA", name: "Computer Org & Architecture", attended: 0, conducted: 0 },
                    { code: "OOPJ", name: "Object Oriented Programming (Java)", attended: 0, conducted: 0 }
                ],
                marks: {
                    "MFCS": { mid1: null, mid2: null, assignment: null, external: null },
                    "SE": { mid1: null, mid2: null, assignment: null, external: null },
                    "DBMS": { mid1: null, mid2: null, assignment: null, external: null },
                    "COA": { mid1: null, mid2: null, assignment: null, external: null },
                    "OOPJ": { mid1: null, mid2: null, assignment: null, external: null }
                },
                fees: {
                    tuition: { total: 85000, paid: 0, history: [] },
                    exam: { total: 1500, paid: 0, history: [] },
                    library: { total: 500, paid: 0, history: [] },
                    hostel: { total: 75000, paid: 0, history: [] }
                }
            };
            students.push(newStudent);
            this.saveStudents(students);
            return true;
        }
    },

    deleteStudent: async function(studentId) {
        await ensureApiModeChecked();
        if (API_MODE) {
            const res = await apiPost('/api/student/delete', { studentId });
            return res.success;
        } else {
            initLocalDatabase();
            let students = JSON.parse(localStorage.getItem(DB_KEY_STUDENTS));
            students = students.filter(s => s.id.toLowerCase() !== studentId.toLowerCase());
            this.saveStudents(students);
            return true;
        }
    },

    getLeaves: async function(facultyId) {
        await ensureApiModeChecked();
        if (API_MODE) {
            const url = facultyId ? `/api/leaves/list?facultyId=${encodeURIComponent(facultyId)}` : '/api/leaves/list';
            const res = await fetch(url);
            return await res.json();
        } else {
            initLocalDatabase();
            const list = JSON.parse(localStorage.getItem(DB_KEY_LEAVES)) || [];
            if (!facultyId || facultyId.toLowerCase() === 'all') {
                const facultyList = JSON.parse(localStorage.getItem(DB_KEY_FACULTY)) || [];
                return list.map(l => {
                    const fac = facultyList.find(f => f.id.toLowerCase() === l.faculty_id.toLowerCase()) || {};
                    return {
                        ...l,
                        faculty_name: fac.name || 'Faculty Member',
                        faculty_dept: fac.department || 'CSE Dept'
                    };
                });
            } else {
                return list.filter(l => l.faculty_id.toLowerCase() === facultyId.toLowerCase());
            }
        }
    },

    applyLeave: async function(facultyId, type, dateFrom, dateTo, reason) {
        await ensureApiModeChecked();
        if (API_MODE) {
            const res = await apiPost('/api/leaves/apply', { facultyId, type, dateFrom, dateTo, reason });
            return res.success;
        } else {
            initLocalDatabase();
            const list = JSON.parse(localStorage.getItem(DB_KEY_LEAVES)) || [];
            const newId = list.length ? Math.max(...list.map(l => l.id)) + 1 : 1;
            const appliedOn = new Date().toISOString().split('T')[0];
            list.unshift({
                id: newId,
                faculty_id: facultyId.toLowerCase(),
                type,
                date_from: dateFrom,
                date_to: dateTo,
                reason,
                status: 'pending',
                applied_on: appliedOn
            });
            localStorage.setItem(DB_KEY_LEAVES, JSON.stringify(list));
            return true;
        }
    },

    updateLeaveStatus: async function(leaveId, status) {
        await ensureApiModeChecked();
        if (API_MODE) {
            const res = await apiPost('/api/leaves/approve', { leaveId: parseInt(leaveId), status });
            return res.success;
        } else {
            initLocalDatabase();
            const list = JSON.parse(localStorage.getItem(DB_KEY_LEAVES)) || [];
            const leave = list.find(l => l.id === parseInt(leaveId));
            if (leave) {
                leave.status = status;
                localStorage.setItem(DB_KEY_LEAVES, JSON.stringify(list));
                return true;
            }
            return false;
        }
    },

    addFaculty: async function(id, name, department, designation, role) {
        await ensureApiModeChecked();
        if (API_MODE) {
            const res = await apiPost('/api/faculty/add', { id, name, department, designation, role });
            return res.success;
        } else {
            initLocalDatabase();
            const faculty = JSON.parse(localStorage.getItem(DB_KEY_FACULTY)) || [];
            const exists = faculty.some(f => f.id.toLowerCase() === id.toLowerCase());
            if (exists) return false;
            
            faculty.push({
                id: id.toLowerCase(),
                password: id.toLowerCase(),
                name: name,
                department: department,
                designation: designation,
                profileImg: "👨‍🏫",
                role: role,
                subjects: []
            });
            localStorage.setItem(DB_KEY_FACULTY, JSON.stringify(faculty));
            return true;
        }
    },

    deleteFaculty: async function(facultyId) {
        await ensureApiModeChecked();
        if (API_MODE) {
            const res = await apiPost('/api/faculty/delete', { facultyId });
            return res.success;
        } else {
            initLocalDatabase();
            let faculty = JSON.parse(localStorage.getItem(DB_KEY_FACULTY)) || [];
            faculty = faculty.filter(f => f.id.toLowerCase() !== facultyId.toLowerCase());
            localStorage.setItem(DB_KEY_FACULTY, JSON.stringify(faculty));
            return true;
        }
    },

    getAppointments: async function(filters) {
        await ensureApiModeChecked();
        const studentId = filters ? filters.studentId : null;
        const facultyId = filters ? filters.facultyId : null;
        
        if (API_MODE) {
            let url = '/api/appointments/list';
            const params = [];
            if (studentId) params.push(`studentId=${encodeURIComponent(studentId)}`);
            if (facultyId) params.push(`facultyId=${encodeURIComponent(facultyId)}`);
            if (params.length) url += '?' + params.join('&');
            
            const res = await fetch(url);
            return await res.json();
        } else {
            initLocalDatabase();
            const list = JSON.parse(localStorage.getItem(DB_KEY_APPOINTMENTS)) || [];
            if (studentId) {
                return list.filter(a => a.student_id.toLowerCase() === studentId.toLowerCase());
            } else if (facultyId) {
                return list.filter(a => a.faculty_id.toLowerCase() === facultyId.toLowerCase());
            }
            return list;
        }
    },

    requestAppointment: async function(studentId, studentName, facultyId, facultyName, requestDate, requestTime, reason) {
        await ensureApiModeChecked();
        if (API_MODE) {
            const res = await apiPost('/api/appointments/request', {
                studentId, studentName, facultyId, facultyName, requestDate, requestTime, reason
            });
            return res.success;
        } else {
            initLocalDatabase();
            const list = JSON.parse(localStorage.getItem(DB_KEY_APPOINTMENTS)) || [];
            const newId = list.length ? Math.max(...list.map(a => a.id)) + 1 : 1;
            list.unshift({
                id: newId,
                student_id: studentId.toLowerCase(),
                student_name: studentName,
                faculty_id: facultyId.toLowerCase(),
                faculty_name: facultyName,
                request_date: requestDate,
                request_time: requestTime,
                assigned_time: null,
                reason,
                status: 'pending',
                remarks: null
            });
            localStorage.setItem(DB_KEY_APPOINTMENTS, JSON.stringify(list));
            return true;
        }
    },

    respondToAppointment: async function(appointmentId, status, assignedTime, remarks) {
        await ensureApiModeChecked();
        if (API_MODE) {
            const res = await apiPost('/api/appointments/respond', {
                appointmentId: parseInt(appointmentId), status, assignedTime, remarks
            });
            return res.success;
        } else {
            initLocalDatabase();
            const list = JSON.parse(localStorage.getItem(DB_KEY_APPOINTMENTS)) || [];
            const appt = list.find(a => a.id === parseInt(appointmentId));
            if (appt) {
                appt.status = status;
                appt.assigned_time = assignedTime || null;
                appt.remarks = remarks || null;
                localStorage.setItem(DB_KEY_APPOINTMENTS, JSON.stringify(list));
                return true;
            }
            return false;
        }
    },

    getChatMessages: async function(studentId, facultyId) {
        await ensureApiModeChecked();
        if (API_MODE) {
            let url = '/api/chat/list';
            const params = [];
            if (studentId) params.push(`studentId=${encodeURIComponent(studentId)}`);
            if (facultyId) params.push(`facultyId=${encodeURIComponent(facultyId)}`);
            if (params.length) url += '?' + params.join('&');
            
            const res = await fetch(url);
            return await res.json();
        } else {
            initLocalDatabase();
            const list = JSON.parse(localStorage.getItem(DB_KEY_CHAT_MESSAGES)) || [];
            if (studentId && facultyId) {
                return list.filter(m => m.student_id.toLowerCase() === studentId.toLowerCase() && m.faculty_id.toLowerCase() === facultyId.toLowerCase());
            } else if (studentId) {
                return list.filter(m => m.student_id.toLowerCase() === studentId.toLowerCase());
            } else if (facultyId) {
                return list.filter(m => m.faculty_id.toLowerCase() === facultyId.toLowerCase());
            }
            return list;
        }
    },

    sendChatMessage: async function(studentId, studentName, facultyId, message, sender) {
        await ensureApiModeChecked();
        if (API_MODE) {
            const res = await apiPost('/api/chat/send', {
                studentId, studentName, facultyId, message, sender
            });
            return res.success;
        } else {
            initLocalDatabase();
            const list = JSON.parse(localStorage.getItem(DB_KEY_CHAT_MESSAGES)) || [];
            const newId = list.length ? Math.max(...list.map(m => m.id)) + 1 : 1;
            
            const now = new Date();
            let hours = now.getHours();
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const timestamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(hours).padStart(2,'0')}:${minutes} ${ampm}`;
            
            list.push({
                id: newId,
                student_id: studentId.toLowerCase(),
                student_name: studentName,
                faculty_id: facultyId.toLowerCase(),
                message,
                sender,
                timestamp
            });
            localStorage.setItem(DB_KEY_CHAT_MESSAGES, JSON.stringify(list));
            return true;
        }
    }
};

// Start initial API status check probe
ensureApiModeChecked();
initLocalDatabase();
