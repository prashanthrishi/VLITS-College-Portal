# ==========================================================================
# Vignan's Lara Institute of Technology & Science (VLITS) SQLite Web Server
# Uses: Built-in http.server and sqlite3. ZERO packages to install.
# ==========================================================================

import os
import sys
import json
import sqlite3
import urllib.parse
import datetime
import random
from http.server import SimpleHTTPRequestHandler, HTTPServer

DB_FILE = 'vlits.db'
PORT = int(os.environ.get('PORT', 8000))

# SQL Queries to initialize database schema
SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    regdNo TEXT NOT NULL,
    branch TEXT NOT NULL,
    year TEXT NOT NULL,
    semester TEXT NOT NULL,
    section TEXT NOT NULL,
    profileImg TEXT,
    remarks TEXT DEFAULT 'No feedback entered yet.',
    status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS faculty (
    id TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    designation TEXT NOT NULL,
    profileImg TEXT,
    role TEXT DEFAULT 'faculty'
);

CREATE TABLE IF NOT EXISTS attendance (
    student_id TEXT,
    subject_code TEXT,
    subject_name TEXT,
    attended INTEGER DEFAULT 0,
    conducted INTEGER DEFAULT 0,
    PRIMARY KEY (student_id, subject_code),
    FOREIGN KEY(student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS marks (
    student_id TEXT,
    subject_code TEXT,
    mid1 REAL,
    mid2 REAL,
    assignment REAL,
    external REAL,
    PRIMARY KEY (student_id, subject_code),
    FOREIGN KEY(student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS fees (
    student_id TEXT,
    fee_type TEXT,
    total REAL,
    paid REAL,
    PRIMARY KEY (student_id, fee_type),
    FOREIGN KEY(student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS fee_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT,
    fee_type TEXT,
    date TEXT,
    amount REAL,
    ref TEXT,
    FOREIGN KEY(student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS faculty_subjects (
    faculty_id TEXT,
    subject_code TEXT,
    subject_name TEXT,
    class_name TEXT,
    PRIMARY KEY (faculty_id, subject_code),
    FOREIGN KEY(faculty_id) REFERENCES faculty(id)
);

CREATE TABLE IF NOT EXISTS attendance_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    period TEXT,
    subject_code TEXT,
    present_count INTEGER,
    total_count INTEGER,
    timestamp TEXT
);

CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    desc TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leaves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    faculty_id TEXT NOT NULL,
    type TEXT NOT NULL,
    date_from TEXT NOT NULL,
    date_to TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    applied_on TEXT NOT NULL,
    FOREIGN KEY(faculty_id) REFERENCES faculty(id)
);

CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    faculty_id TEXT NOT NULL,
    faculty_name TEXT NOT NULL,
    request_date TEXT NOT NULL,
    request_time TEXT NOT NULL,
    assigned_time TEXT,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    remarks TEXT,
    FOREIGN KEY(student_id) REFERENCES students(id),
    FOREIGN KEY(faculty_id) REFERENCES faculty(id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    faculty_id TEXT NOT NULL,
    message TEXT NOT NULL,
    sender TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY(student_id) REFERENCES students(id),
    FOREIGN KEY(faculty_id) REFERENCES faculty(id)
);
"""

# Initial Mock Data (Same as js/data.js)
MOCK_STUDENTS = [
    {
        "id": "24fe1a0487",
        "password": "24fe1a0487",
        "name": "P. Sai Prashanth",
        "regdNo": "24FE1A0487",
        "branch": "Computer Science & Engineering",
        "year": "3rd Year",
        "semester": "1st Semester",
        "section": "B",
        "profileImg": "👨‍🎓",
        "remarks": "No feedback entered yet.",
        "attendance": [
            { "code": "MFCS", "name": "Math Foundations of CS", "attended": 38, "conducted": 50 },
            { "code": "SE", "name": "Software Engineering", "attended": 32, "conducted": 48 },
            { "code": "DBMS", "name": "Database Management Systems", "attended": 42, "conducted": 50 },
            { "code": "COA", "name": "Computer Org & Architecture", "attended": 26, "conducted": 48 },
            { "code": "OOPJ", "name": "Object Oriented Programming (Java)", "attended": 38, "conducted": 48 }
        ],
        "marks": {
            "MFCS": { "mid1": 18, "mid2": None, "assignment": 5, "external": None },
            "SE": { "mid1": 14, "mid2": None, "assignment": 4, "external": None },
            "DBMS": { "mid1": 19, "mid2": None, "assignment": 5, "external": None },
            "COA": { "mid1": 12, "mid2": None, "assignment": 4, "external": None },
            "OOPJ": { "mid1": 17, "mid2": None, "assignment": 5, "external": None }
        },
        "fees": {
            "tuition": { "total": 85000, "paid": 65000, "history": [{ "date": "2025-08-12", "amount": 65000, "ref": "TXN9837482" }] },
            "exam": { "total": 1500, "paid": 0, "history": [] },
            "library": { "total": 500, "paid": 500, "history": [{ "date": "2025-09-01", "amount": 500, "ref": "TXN9849281" }] },
            "hostel": { "total": 75000, "paid": 75000, "history": [{ "date": "2025-08-10", "amount": 75000, "ref": "TXN9821948" }] }
        }
    },
    {
        "id": "24fe1a0401",
        "password": "24fe1a0401",
        "name": "A. Vinay Kumar",
        "regdNo": "24FE1A0401",
        "branch": "Computer Science & Engineering",
        "year": "3rd Year",
        "semester": "1st Semester",
        "section": "B",
        "profileImg": "👨‍🎓",
        "remarks": "No feedback entered yet.",
        "attendance": [
            { "code": "MFCS", "name": "Math Foundations of CS", "attended": 45, "conducted": 50 },
            { "code": "SE", "name": "Software Engineering", "attended": 43, "conducted": 48 },
            { "code": "DBMS", "name": "Database Management Systems", "attended": 46, "conducted": 50 },
            { "code": "COA", "name": "Computer Org & Architecture", "attended": 42, "conducted": 48 },
            { "code": "OOPJ", "name": "Object Oriented Programming (Java)", "attended": 44, "conducted": 48 }
        ],
        "marks": {
            "MFCS": { "mid1": 19, "mid2": None, "assignment": 5, "external": None },
            "SE": { "mid1": 18, "mid2": None, "assignment": 5, "external": None },
            "DBMS": { "mid1": 20, "mid2": None, "assignment": 5, "external": None },
            "COA": { "mid1": 17, "mid2": None, "assignment": 4, "external": None },
            "OOPJ": { "mid1": 19, "mid2": None, "assignment": 5, "external": None }
        },
        "fees": {
            "tuition": { "total": 85000, "paid": 85000, "history": [{ "date": "2025-08-11", "amount": 85000, "ref": "TXN9831920" }] },
            "exam": { "total": 1500, "paid": 1500, "history": [{ "date": "2025-10-15", "amount": 1500, "ref": "TXN9899201" }] },
            "library": { "total": 500, "paid": 500, "history": [{ "date": "2025-09-01", "amount": 500, "ref": "TXN9849285" }] },
            "hostel": { "total": 75000, "paid": 75000, "history": [{ "date": "2025-08-10", "amount": 75000, "ref": "TXN9821949" }] }
        }
    },
    {
        "id": "24fe1a0402",
        "password": "24fe1a0402",
        "name": "B. Sushma",
        "regdNo": "24FE1A0402",
        "branch": "Computer Science & Engineering",
        "year": "3rd Year",
        "semester": "1st Semester",
        "section": "B",
        "profileImg": "👩‍🎓",
        "remarks": "No feedback entered yet.",
        "attendance": [
            { "code": "MFCS", "name": "Math Foundations of CS", "attended": 39, "conducted": 50 },
            { "code": "SE", "name": "Software Engineering", "attended": 38, "conducted": 48 },
            { "code": "DBMS", "name": "Database Management Systems", "attended": 40, "conducted": 50 },
            { "code": "COA", "name": "Computer Org & Architecture", "attended": 35, "conducted": 48 },
            { "code": "OOPJ", "name": "Object Oriented Programming (Java)", "attended": 39, "conducted": 48 }
        ],
        "marks": {
            "MFCS": { "mid1": 16, "mid2": None, "assignment": 4, "external": None },
            "SE": { "mid1": 15, "mid2": None, "assignment": 4, "external": None },
            "DBMS": { "mid1": 18, "mid2": None, "assignment": 5, "external": None },
            "COA": { "mid1": 14, "mid2": None, "assignment": 4, "external": None },
            "OOPJ": { "mid1": 16, "mid2": None, "assignment": 4, "external": None }
        },
        "fees": {
            "tuition": { "total": 85000, "paid": 85000, "history": [{ "date": "2025-08-11", "amount": 85000, "ref": "TXN9831921" }] },
            "exam": { "total": 1500, "paid": 0, "history": [] },
            "library": { "total": 500, "paid": 500, "history": [{ "date": "2025-09-01", "amount": 500, "ref": "TXN9849286" }] },
            "hostel": { "total": 75000, "paid": 0, "history": [] }
        }
    },
    {
        "id": "24fe1a0403",
        "password": "24fe1a0403",
        "name": "C. Harshavardhan",
        "regdNo": "24FE1A0403",
        "branch": "Computer Science & Engineering",
        "year": "3rd Year",
        "semester": "1st Semester",
        "section": "B",
        "profileImg": "👨‍🎓",
        "remarks": "No feedback entered yet.",
        "attendance": [
            { "code": "MFCS", "name": "Math Foundations of CS", "attended": 31, "conducted": 50 },
            { "code": "SE", "name": "Software Engineering", "attended": 29, "conducted": 48 },
            { "code": "DBMS", "name": "Database Management Systems", "attended": 33, "conducted": 50 },
            { "code": "COA", "name": "Computer Org & Architecture", "attended": 28, "conducted": 48 },
            { "code": "OOPJ", "name": "Object Oriented Programming (Java)", "attended": 30, "conducted": 48 }
        ],
        "marks": {
            "MFCS": { "mid1": 12, "mid2": None, "assignment": 4, "external": None },
            "SE": { "mid1": 11, "mid2": None, "assignment": 3, "external": None },
            "DBMS": { "mid1": 13, "mid2": None, "assignment": 4, "external": None },
            "COA": { "mid1": 10, "mid2": None, "assignment": 3, "external": None },
            "OOPJ": { "mid1": 12, "mid2": None, "assignment": 4, "external": None }
        },
        "fees": {
            "tuition": { "total": 85000, "paid": 45000, "history": [{ "date": "2025-08-15", "amount": 45000, "ref": "TXN9839401" }] },
            "exam": { "total": 1500, "paid": 0, "history": [] },
            "library": { "total": 500, "paid": 500, "history": [{ "date": "2025-09-01", "amount": 500, "ref": "TXN9849287" }] },
            "hostel": { "total": 75000, "paid": 35000, "history": [{ "date": "2025-08-15", "amount": 35000, "ref": "TXN9829481" }] }
        }
    },
    {
        "id": "24fe1a0404",
        "password": "24fe1a0404",
        "name": "D. Lakshmi Prasanna",
        "regdNo": "24FE1A0404",
        "branch": "Computer Science & Engineering",
        "year": "3rd Year",
        "semester": "1st Semester",
        "section": "B",
        "profileImg": "👩‍🎓",
        "remarks": "No feedback entered yet.",
        "attendance": [
            { "code": "MFCS", "name": "Math Foundations of CS", "attended": 48, "conducted": 50 },
            { "code": "SE", "name": "Software Engineering", "attended": 47, "conducted": 48 },
            { "code": "DBMS", "name": "Database Management Systems", "attended": 49, "conducted": 50 },
            { "code": "COA", "name": "Computer Org & Architecture", "attended": 46, "conducted": 48 },
            { "code": "OOPJ", "name": "Object Oriented Programming (Java)", "attended": 47, "conducted": 48 }
        ],
        "marks": {
            "MFCS": { "mid1": 20, "mid2": None, "assignment": 5, "external": None },
            "SE": { "mid1": 19, "mid2": None, "assignment": 5, "external": None },
            "DBMS": { "mid1": 20, "mid2": None, "assignment": 5, "external": None },
            "COA": { "mid1": 19, "mid2": None, "assignment": 5, "external": None },
            "OOPJ": { "mid1": 20, "mid2": None, "assignment": 5, "external": None }
        },
        "fees": {
            "tuition": { "total": 85000, "paid": 85000, "history": [{ "date": "2025-08-09", "amount": 85000, "ref": "TXN9810294" }] },
            "exam": { "total": 1500, "paid": 1500, "history": [{ "date": "2025-10-14", "amount": 1500, "ref": "TXN9883719" }] },
            "library": { "total": 500, "paid": 500, "history": [{ "date": "2025-09-01", "amount": 500, "ref": "TXN9849288" }] },
            "hostel": { "total": 75000, "paid": 75000, "history": [{ "date": "2025-08-10", "amount": 75000, "ref": "TXN9821950" }] }
        }
    }
]

MOCK_FACULTY = [
    {
        "id": "hod",
        "password": "hod",
        "name": "Dr. K. Srinivas Rao",
        "department": "Computer Science & Engineering",
        "designation": "Professor & HOD",
        "profileImg": "👨‍🏫",
        "role": "hod",
        "subjects": [
            { "code": "COA", "name": "Computer Org & Architecture", "class": "3rd Year B" },
            { "code": "SE", "name": "Software Engineering", "class": "3rd Year B" }
        ]
    },
    {
        "id": "24fe1a0487",
        "password": "24fe1a0487",
        "name": "Dr. K. Srinivas Rao",
        "department": "Computer Science & Engineering",
        "designation": "Professor",
        "profileImg": "👨‍🏫",
        "role": "faculty",
        "subjects": [
            { "code": "COA", "name": "Computer Org & Architecture", "class": "3rd Year B" },
            { "code": "SE", "name": "Software Engineering", "class": "3rd Year B" }
        ]
    },
    {
        "id": "faculty2",
        "password": "password123",
        "name": "Mrs. M. V. Sailaja",
        "department": "Computer Science & Engineering",
        "designation": "Assistant Professor",
        "profileImg": "👩‍🏫",
        "role": "faculty",
        "subjects": [
            { "code": "MFCS", "name": "Math Foundations of CS", "class": "3rd Year B" },
            { "code": "DBMS", "name": "Database Management Systems", "class": "3rd Year B" },
            { "code": "OOPJ", "name": "Object Oriented Programming (Java)", "class": "3rd Year B" }
        ]
    }
]

# Database seeding & upgrade logic
def seed_database():
    print("Checking database tables...")
    db_existed = os.path.exists(DB_FILE)
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # 1. Create tables
    cursor.executescript(SCHEMA_SQL)
    conn.commit()
    
    # 2. Check for missing columns (database upgrades)
    cursor.execute("PRAGMA table_info(students)")
    cols = [col[1] for col in cursor.fetchall()]
    if 'remarks' not in cols:
        print("Upgrading database schema: Adding 'remarks' column...")
        cursor.execute("ALTER TABLE students ADD COLUMN remarks TEXT DEFAULT 'No feedback entered yet.'")
    if 'status' not in cols:
        print("Upgrading database schema: Adding 'status' column...")
        cursor.execute("ALTER TABLE students ADD COLUMN status TEXT DEFAULT 'active'")
        conn.commit()
        
    cursor.execute("PRAGMA table_info(faculty)")
    f_cols = [col[1] for col in cursor.fetchall()]
    if 'role' not in f_cols:
        print("Upgrading database schema: Adding 'role' column...")
        cursor.execute("ALTER TABLE faculty ADD COLUMN role TEXT DEFAULT 'faculty'")
        conn.commit()
    
    # 3. Check if student data exists
    cursor.execute("SELECT COUNT(*) FROM students")
    if cursor.fetchone()[0] == 0 and not db_existed:
        print("Seeding database with mock student and faculty data...")
        
        # Seed students
        for s in MOCK_STUDENTS:
            cursor.execute(
                "INSERT INTO students VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (s['id'], s['password'], s['name'], s['regdNo'], s['branch'], s['year'], s['semester'], s['section'], s['profileImg'], s.get('remarks', 'No feedback entered yet.'), 'active')
            )
            
            # Seed attendance subjects
            for att in s['attendance']:
                cursor.execute(
                    "INSERT INTO attendance VALUES (?, ?, ?, ?, ?)",
                    (s['id'], att['code'], att['name'], att['attended'], att['conducted'])
                )
                
            # Seed marks
            for sub_code, m in s['marks'].items():
                cursor.execute(
                    "INSERT INTO marks VALUES (?, ?, ?, ?, ?, ?)",
                    (s['id'], sub_code, m['mid1'], m['mid2'], m['assignment'], m['external'])
                )
                
            # Seed fees
            for fee_type, fee in s['fees'].items():
                cursor.execute(
                    "INSERT INTO fees VALUES (?, ?, ?, ?)",
                    (s['id'], fee_type, fee['total'], fee['paid'])
                )
                
                # Seed fee history
                for h in fee['history']:
                    cursor.execute(
                        "INSERT INTO fee_history (student_id, fee_type, date, amount, ref) VALUES (?, ?, ?, ?, ?)",
                        (s['id'], fee_type, h['date'], h['amount'], h['ref'])
                    )
                    
        # Seed faculty
        for f in MOCK_FACULTY:
            cursor.execute(
                "INSERT INTO faculty VALUES (?, ?, ?, ?, ?, ?, ?)",
                (f['id'], f['password'], f['name'], f['department'], f['designation'], f['profileImg'], f.get('role', 'faculty'))
            )
            
            # Seed faculty subjects
            for sub in f['subjects']:
                cursor.execute(
                    "INSERT INTO faculty_subjects VALUES (?, ?, ?, ?)",
                    (f['id'], sub['code'], sub['name'], sub['class'])
                )
                
        conn.commit()
        print("Database seeded successfully.")
    else:
        # Enforce that Dr. K. Srinivas Rao is configured as regular faculty in SQLite
        cursor.execute("UPDATE faculty SET role = 'faculty', designation = 'Professor' WHERE id = '24fe1a0487'")
        
        # Ensure separate 'hod' / 'hod' test credential exists in existing SQLite db
        cursor.execute("SELECT COUNT(*) FROM faculty WHERE id = 'hod'")
        if cursor.fetchone()[0] == 0:
            cursor.execute(
                "INSERT INTO faculty VALUES ('hod', 'hod', 'Dr. K. Srinivas Rao', 'Computer Science & Engineering', 'Professor & HOD', '👨‍🏫', 'hod')"
            )
            cursor.execute("INSERT INTO faculty_subjects VALUES ('hod', 'COA', 'Computer Org & Architecture', '3rd Year B')")
            cursor.execute("INSERT INTO faculty_subjects VALUES ('hod', 'SE', 'Software Engineering', '3rd Year B')")
            print("Injected 'hod'/'hod' test credentials into existing database.")
            
        # Ensure separate 'principal' / 'principal' test credential exists in existing SQLite db
        cursor.execute("SELECT COUNT(*) FROM faculty WHERE id = 'principal'")
        if cursor.fetchone()[0] == 0:
            cursor.execute(
                "INSERT INTO faculty VALUES ('principal', 'principal', 'Dr. P. R. Prasad', 'Administration', 'Principal', '👑', 'principal')"
            )
            print("Injected 'principal'/'principal' test credentials into existing database.")
            
        conn.commit()
        print("Database tables already contain records. Seeding skipped.")
        
    # Seed Announcements table if empty
    cursor.execute("SELECT COUNT(*) FROM announcements")
    if cursor.fetchone()[0] == 0 and not db_existed:
        print("Seeding announcements...")
        default_announcements = [
            ('notice', '02 Jun 2026', 'Autonomous End-Semester Exams Registration', 'Registration for B.Tech III Year II Semester End Exams is now open. Verify fee dues before registering.'),
            ('notice', '28 May 2026', 'Condonation Medical Submissions Timeline', 'Students with 65% - 74.9% aggregate attendance must submit medical forms to administrative office by June 10.'),
            ('notice', '15 May 2026', 'Mid-II Examinations Schedule Announcement', 'Mid-II internal assessments will commence from June 15, 2026. Detailed schedule uploaded inside portals.'),
            ('calendar', '10 Jun 2026', 'Last Date for Exam Fee Payment', 'B.Tech III-II regular and supplementary exam registrations close without fine.'),
            ('calendar', '15-20 Jun', 'Mid-II Internal Practical & Theory Examinations', 'Regular schedule for core branches. Standard attendance regulations apply.'),
            ('calendar', '25 Jun 2026', 'Last Working Day of Semester', 'Attendance logs will be frozen at 5:00 PM for semester exam eligibility verification.')
        ]
        cursor.executemany("INSERT INTO announcements (type, date, title, desc) VALUES (?, ?, ?, ?)", default_announcements)
        conn.commit()
        print("Announcements seeded.")
        
    # Seed leaves table if empty
    cursor.execute("SELECT COUNT(*) FROM leaves")
    if cursor.fetchone()[0] == 0 and not db_existed:
        print("Seeding mock leaves...")
        mock_leaves = [
            ('24fe1a0487', 'Casual', '2026-05-10', '2026-05-12', 'Family function in Guntur', 'approved', '2026-05-08'),
            ('24fe1a0487', 'Sick', '2026-06-15', '2026-06-16', 'Medical checkup', 'pending', '2026-06-03'),
            ('faculty2', 'Casual', '2026-04-18', '2026-04-19', 'Personal work', 'approved', '2026-04-15')
        ]
        cursor.executemany("INSERT INTO leaves (faculty_id, type, date_from, date_to, reason, status, applied_on) VALUES (?, ?, ?, ?, ?, ?, ?)", mock_leaves)
        conn.commit()
        print("Mock leaves seeded.")
        
    # Seed appointments table if empty
    cursor.execute("SELECT COUNT(*) FROM appointments")
    if cursor.fetchone()[0] == 0 and not db_existed:
        print("Seeding mock appointments...")
        mock_appointments = [
            ('24fe1a0487', 'P. Sai Prashanth', 'hod', 'Dr. K. Srinivas Rao', '2026-06-10', '10:30 AM', None, 'Review of WT project guidelines', 'pending', None),
            ('24fe1a0487', 'P. Sai Prashanth', 'faculty2', 'Mrs. M. V. Sailaja', '2026-06-05', '02:00 PM', 'CSE Block Room 204 - 02:15 PM', 'Discussion about WT assignment scores', 'approved', 'Bring your assignment records.')
        ]
        cursor.executemany("INSERT INTO appointments (student_id, student_name, faculty_id, faculty_name, request_date, request_time, assigned_time, reason, status, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", mock_appointments)
        conn.commit()
        print("Mock appointments seeded.")
        
    # Seed chat_messages table if empty
    cursor.execute("SELECT COUNT(*) FROM chat_messages")
    if cursor.fetchone()[0] == 0 and not db_existed:
        print("Seeding mock chat messages...")
        mock_chats = [
            ('24fe1a0487', 'P. Sai Prashanth', 'hod', 'Respected Sir, I was absent last week due to severe typhoid fever. Please consider my leave justification.', 'student', '2026-06-03 10:00 AM'),
            ('24fe1a0487', 'P. Sai Prashanth', 'hod', 'Please submit the medical certificate and doctor reports when you attend the next WT lecture. We will review your attendance percentage then.', 'faculty', '2026-06-03 04:30 PM'),
            ('24fe1a0487', 'P. Sai Prashanth', 'hod', 'Sure Sir. I will bring the reports on Monday. Thank you.', 'student', '2026-06-04 09:15 AM')
        ]
        cursor.executemany("INSERT INTO chat_messages (student_id, student_name, faculty_id, message, sender, timestamp) VALUES (?, ?, ?, ?, ?, ?)", mock_chats)
        conn.commit()
        print("Mock chat messages seeded.")
        
    conn.close()

# Handler for requests
class PortalRequestHandler(SimpleHTTPRequestHandler):
    
    # Enable CORS
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
        
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    # Route GET Requests
    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query = urllib.parse.parse_qs(parsed_url.query)
        
        # Status Endpoint
        if path == '/api/status':
            self.send_json_response({"status": "running"})
            return
            
        # Get Announcements List
        elif path == '/api/announcements/list':
            announcements = self.db_get_announcements()
            self.send_json_response(announcements)
            return
            
        # Get Leaves List
        elif path == '/api/leaves/list':
            faculty_id = query.get('facultyId', [None])[0]
            leaves = self.db_get_leaves(faculty_id)
            self.send_json_response(leaves)
            return

        # Get Appointments List
        elif path == '/api/appointments/list':
            student_id = query.get('studentId', [None])[0]
            faculty_id = query.get('facultyId', [None])[0]
            appointments = self.db_get_appointments(student_id, faculty_id)
            self.send_json_response(appointments)
            return
            
        # Get Chat Messages List
        elif path == '/api/chat/list':
            student_id = query.get('studentId', [None])[0]
            faculty_id = query.get('facultyId', [None])[0]
            messages = self.db_get_chat_messages(student_id, faculty_id)
            self.send_json_response(messages)
            return
            
        # Student GET Details
        elif path == '/api/student/get':
            student_id = query.get('id', [None])[0]
            if not student_id:
                self.send_error_response(400, "Missing student id query parameter.")
                return
            
            student_data = self.db_get_student_details(student_id.lower())
            if student_data:
                self.send_json_response(student_data)
            else:
                self.send_error_response(404, f"Student {student_id} not found.")
            return
            
        # Faculty GET Details
        elif path == '/api/faculty/get':
            faculty_id = query.get('id', [None])[0]
            if not faculty_id:
                self.send_error_response(400, "Missing faculty id query parameter.")
                return
                
            faculty_data = self.db_get_faculty_details(faculty_id.lower())
            if faculty_data:
                self.send_json_response(faculty_data)
            else:
                self.send_error_response(404, f"Faculty {faculty_id} not found.")
            return
            
        # Students List (for Faculty marking grid)
        elif path == '/api/students/list':
            students_list = self.db_get_all_students_for_faculty()
            self.send_json_response(students_list)
            return

        # Faculty List (for Principal dashboard)
        elif path == '/api/faculty/list':
            faculty_list = self.db_get_all_faculty()
            self.send_json_response(faculty_list)
            return

        # Serve static HTML/CSS/JS files
        super().do_GET()

    # Route POST Requests
    def do_POST(self):
        path = self.path
        
        # Get POST content data
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        try:
            body = json.loads(post_data.decode('utf-8')) if post_data else {}
        except Exception:
            self.send_error_response(400, "Invalid JSON body.")
            return
            
        # Student Login Endpoint
        if path == '/api/login/student':
            student_id = body.get('id', '').lower()
            password = body.get('password', '')
            
            student = self.db_verify_student_login(student_id, password)
            if student:
                self.send_json_response({"success": True, "user": student})
            else:
                self.send_error_response(401, "Invalid registration number or password.")
            return
            
        # Faculty Login Endpoint
        elif path == '/api/login/faculty':
            faculty_id = body.get('id', '').lower()
            password = body.get('password', '')
            
            faculty = self.db_verify_faculty_login(faculty_id, password)
            if faculty:
                self.send_json_response({"success": True, "user": faculty})
            else:
                self.send_error_response(401, "Invalid employee ID or password.")
            return
            
        # Attendance Marking Endpoint
        elif path == '/api/attendance/mark':
            subject_code = body.get('subjectCode')
            student_present_map = body.get('studentPresentMap', {})
            date = body.get('date')
            period = body.get('period')
            
            if not subject_code or not date or not period:
                self.send_error_response(400, "Missing required attendance parameters.")
                return
                
            success = self.db_mark_attendance(subject_code, student_present_map, date, period)
            if success:
                self.send_json_response({"success": True, "message": "Attendance marked successfully."})
            else:
                self.send_error_response(500, "Failed to write attendance log.")
            return
            
        # Marks Saving Endpoint
        elif path == '/api/marks/save':
            subject_code = body.get('subjectCode')
            student_marks_map = body.get('studentMarksMap', {})
            exam_type = body.get('examType')
            
            if not subject_code or not exam_type:
                self.send_error_response(400, "Missing required marks parameters.")
                return
                
            success = self.db_save_marks(subject_code, student_marks_map, exam_type)
            if success:
                self.send_json_response({"success": True, "message": "Marks committed successfully."})
            else:
                self.send_error_response(500, "Failed to commit grades sheet.")
            return
            
        # Fee Payment Endpoint
        elif path == '/api/fees/pay':
            student_id = body.get('studentId')
            fee_type = body.get('feeType')
            amount = body.get('amount')
            
            if not student_id or not fee_type or amount is None:
                self.send_error_response(400, "Missing required payment fields.")
                return
                
            txn_result = self.db_pay_fee(student_id, fee_type, amount)
            if txn_result and txn_result.get('success'):
                self.send_json_response(txn_result)
            else:
                self.send_error_response(400, txn_result.get('error', "Transaction processing error."))
            return
            
        # Excel File Import Endpoint
        elif path == '/api/excel/import':
            rows_data = body.get('rows', [])
            if not rows_data:
                self.send_error_response(400, "No records found inside rows sheet.")
                return
                
            success = self.db_import_excel_rows(rows_data)
            if success:
                self.send_json_response({"success": True, "message": "Excel data imported successfully."})
            else:
                self.send_error_response(500, "Failed to process spreadsheet records.")
            return
            
        # Faculty Remarks Save Endpoint
        elif path == '/api/student/remarks/save':
            student_id = body.get('studentId')
            remarks = body.get('remarks')
            
            if not student_id or remarks is None:
                self.send_error_response(400, "Missing studentId or remarks parameters.")
                return
                
            success = self.db_save_remarks(student_id, remarks)
            if success:
                self.send_json_response({"success": True, "message": "Remarks updated successfully."})
            else:
                self.send_error_response(500, "Failed to update remarks.")
            return
            
        # Add Announcement Endpoint
        elif path == '/api/announcements/add':
            atype = body.get('type')
            date = body.get('date')
            title = body.get('title')
            desc = body.get('desc')
            
            if not atype or not date or not title or not desc:
                self.send_error_response(400, "Missing required announcement parameters.")
                return
                
            success = self.db_add_announcement(atype, date, title, desc)
            if success:
                self.send_json_response({"success": True, "message": "Announcement added successfully."})
            else:
                self.send_error_response(500, "Failed to add announcement.")
            return
            
        # Delete Announcement Endpoint
        elif path == '/api/announcements/delete':
            ann_id = body.get('id')
            if ann_id is None:
                self.send_error_response(400, "Missing announcement ID parameter.")
                return
                
            success = self.db_delete_announcement(ann_id)
            if success:
                self.send_json_response({"success": True, "message": "Announcement deleted successfully."})
            else:
                self.send_error_response(500, "Failed to delete announcement.")
            return
            
        # Save Student Status Endpoint
        elif path == '/api/student/status/save':
            student_id = body.get('studentId')
            status = body.get('status')
            
            if not student_id or not status:
                self.send_error_response(400, "Missing studentId or status parameters.")
                return
                
            success = self.db_save_student_status(student_id, status)
            if success:
                self.send_json_response({"success": True, "message": "Student status updated successfully."})
            else:
                self.send_error_response(500, "Failed to save student status.")
            return
            
        # Add Student Endpoint
        elif path == '/api/student/add':
            sid = body.get('id')
            name = body.get('name')
            branch = body.get('branch')
            section = body.get('section')
            
            if not sid or not name or not branch or not section:
                self.send_error_response(400, "Missing parameters to create student profile.")
                return
                
            success = self.db_add_student(sid, name, branch, section)
            if success:
                self.send_json_response({"success": True, "message": "Student registered successfully."})
            else:
                self.send_error_response(500, "Failed to add student to database.")
            return
            
        # Delete Student Endpoint
        elif path == '/api/student/delete':
            student_id = body.get('studentId')
            if not student_id:
                self.send_error_response(400, "Missing studentId parameter.")
                return
                
            success = self.db_delete_student(student_id)
            if success:
                self.send_json_response({"success": True, "message": "Student removed successfully."})
            else:
                self.send_error_response(500, "Failed to delete student from database.")
            return

        # Add Faculty Endpoint
        elif path == '/api/faculty/add':
            fid = body.get('id')
            name = body.get('name')
            department = body.get('department')
            designation = body.get('designation')
            role = body.get('role', 'faculty')
            
            if not fid or not name or not department or not designation:
                self.send_error_response(400, "Missing parameters to create faculty profile.")
                return
                
            success = self.db_add_faculty(fid, name, department, designation, role)
            if success:
                self.send_json_response({"success": True, "message": "Faculty registered successfully."})
            else:
                self.send_error_response(500, "Failed to add faculty to database.")
            return

        # Delete Faculty Endpoint
        elif path == '/api/faculty/delete':
            faculty_id = body.get('facultyId')
            if not faculty_id:
                self.send_error_response(400, "Missing facultyId parameter.")
                return
                
            success = self.db_delete_faculty(faculty_id)
            if success:
                self.send_json_response({"success": True, "message": "Faculty removed successfully."})
            else:
                self.send_error_response(500, "Failed to delete faculty from database.")
            return
            
        # Apply Leave Endpoint
        elif path == '/api/leaves/apply':
            faculty_id = body.get('facultyId')
            ltype = body.get('type')
            date_from = body.get('dateFrom')
            date_to = body.get('dateTo')
            reason = body.get('reason')
            
            if not faculty_id or not ltype or not date_from or not date_to or not reason:
                self.send_error_response(400, "Missing required leave parameters.")
                return
                
            success = self.db_apply_leave(faculty_id, ltype, date_from, date_to, reason)
            if success:
                self.send_json_response({"success": True, "message": "Leave application submitted."})
            else:
                self.send_error_response(500, "Failed to submit leave application.")
            return
            
        # Approve/Reject Leave Endpoint
        elif path == '/api/leaves/approve':
            leave_id = body.get('leaveId')
            status = body.get('status')
            
            if leave_id is None or not status:
                self.send_error_response(400, "Missing leaveId or status parameter.")
                return
                
            success = self.db_update_leave_status(leave_id, status)
            if success:
                self.send_json_response({"success": True, "message": f"Leave application status updated to {status}."})
            else:
                self.send_error_response(500, "Failed to update leave status.")
            return

        # Request Appointment Endpoint
        elif path == '/api/appointments/request':
            student_id = body.get('studentId')
            student_name = body.get('studentName')
            faculty_id = body.get('facultyId')
            faculty_name = body.get('facultyName')
            request_date = body.get('requestDate')
            request_time = body.get('requestTime')
            reason = body.get('reason')
            
            if not student_id or not student_name or not faculty_id or not faculty_name or not request_date or not request_time or not reason:
                self.send_error_response(400, "Missing required appointment parameters.")
                return
                
            success = self.db_request_appointment(student_id, student_name, faculty_id, faculty_name, request_date, request_time, reason)
            if success:
                self.send_json_response({"success": True, "message": "Appointment requested successfully."})
            else:
                self.send_error_response(500, "Failed to submit appointment request.")
            return

        # Respond to Appointment Endpoint
        elif path == '/api/appointments/respond':
            appointment_id = body.get('appointmentId')
            status = body.get('status')
            assigned_time = body.get('assignedTime')
            remarks = body.get('remarks')
            
            if appointment_id is None or not status:
                self.send_error_response(400, "Missing appointmentId or status parameter.")
                return
                
            success = self.db_respond_appointment(appointment_id, status, assigned_time, remarks)
            if success:
                self.send_json_response({"success": True, "message": f"Appointment status updated to {status}."})
            else:
                self.send_error_response(500, "Failed to update appointment status.")
            return

        # Send Chat Message Endpoint
        elif path == '/api/chat/send':
            student_id = body.get('studentId')
            student_name = body.get('studentName')
            faculty_id = body.get('facultyId')
            message = body.get('message')
            sender = body.get('sender')
            
            if not student_id or not student_name or not faculty_id or not message or not sender:
                self.send_error_response(400, "Missing required chat message parameters.")
                return
                
            success = self.db_send_chat_message(student_id, student_name, faculty_id, message, sender)
            if success:
                self.send_json_response({"success": True, "message": "Message sent successfully."})
            else:
                self.send_error_response(500, "Failed to send chat message.")
            return

        self.send_error_response(404, "Endpoint path not found.")

    # JSON helper functions
    def send_json_response(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def send_error_response(self, status, message):
        self.send_json_response({"success": False, "error": message}, status)

    # ==========================================================================
    # Database Helper Methods
    # ==========================================================================
    def db_connect(self):
        return sqlite3.connect(DB_FILE)

    def db_verify_student_login(self, student_id, password):
        conn = self.db_connect()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, regdNo, branch, year, semester, section, profileImg, remarks, status FROM students WHERE id = ? AND password = ?", (student_id, password))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                "id": row[0], "name": row[1], "regdNo": row[2],
                "branch": row[3], "year": row[4], "semester": row[5],
                "section": row[6], "profileImg": row[7], "remarks": row[8], "status": row[9]
            }
        return None

    def db_verify_faculty_login(self, faculty_id, password):
        conn = self.db_connect()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, department, designation, profileImg, role FROM faculty WHERE id = ? AND password = ?", (faculty_id, password))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                "id": row[0], "name": row[1], "department": row[2],
                "designation": row[3], "profileImg": row[4], "role": row[5]
            }
        return None

    def db_get_student_details(self, student_id):
        conn = self.db_connect()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM students WHERE id = ?", (student_id,))
        p_row = cursor.fetchone()
        if not p_row:
            conn.close()
            return None
            
        student = dict(p_row)
        
        cursor.execute("SELECT subject_code as code, subject_name as name, attended, conducted FROM attendance WHERE student_id = ?", (student_id,))
        student['attendance'] = [dict(r) for r in cursor.fetchall()]
        
        cursor.execute("SELECT subject_code, mid1, mid2, assignment, external FROM marks WHERE student_id = ?", (student_id,))
        marks_rows = cursor.fetchall()
        student['marks'] = {}
        for r in marks_rows:
            student['marks'][r['subject_code']] = {
                "mid1": r['mid1'], "mid2": r['mid2'],
                "assignment": r['assignment'], "external": r['external']
            }
            
        student['fees'] = {}
        cursor.execute("SELECT fee_type, total, paid FROM fees WHERE student_id = ?", (student_id,))
        fees_rows = cursor.fetchall()
        for r in fees_rows:
            f_type = r['fee_type']
            cursor.execute("SELECT date, amount, ref FROM fee_history WHERE student_id = ? AND fee_type = ? ORDER BY id DESC", (student_id, f_type))
            history_rows = cursor.fetchall()
            student['fees'][f_type] = {
                "total": r['total'],
                "paid": r['paid'],
                "history": [dict(h) for h in history_rows]
            }
            
        conn.close()
        return student

    def db_get_faculty_details(self, faculty_id):
        conn = self.db_connect()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM faculty WHERE id = ?", (faculty_id,))
        f_row = cursor.fetchone()
        if not f_row:
            conn.close()
            return None
            
        faculty = dict(f_row)
        
        cursor.execute("SELECT subject_code as code, subject_name as name, class_name as class FROM faculty_subjects WHERE faculty_id = ?", (faculty_id,))
        faculty['subjects'] = [dict(r) for r in cursor.fetchall()]
        
        conn.close()
        return faculty

    def db_get_all_students_for_faculty(self):
        conn = self.db_connect()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT id, name, regdNo, branch, year, semester, section, profileImg, remarks, status FROM students")
        students = [dict(r) for r in cursor.fetchall()]
        
        for s in students:
            cursor.execute("SELECT subject_code as code, subject_name as name, attended, conducted FROM attendance WHERE student_id = ?", (s['id'],))
            s['attendance'] = [dict(r) for r in cursor.fetchall()]
            
            cursor.execute("SELECT subject_code, mid1, mid2, assignment, external FROM marks WHERE student_id = ?", (s['id'],))
            marks_rows = cursor.fetchall()
            s['marks'] = {}
            for r in marks_rows:
                s['marks'][r['subject_code']] = {
                    "mid1": r['mid1'], "mid2": r['mid2'],
                    "assignment": r['assignment'], "external": r['external']
                }
        conn.close()
        return students

    def db_mark_attendance(self, subject_code, student_present_map, date, period):
        conn = self.db_connect()
        cursor = conn.cursor()
        
        try:
            present_count = 0
            for student_id, is_present in student_present_map.items():
                cursor.execute("SELECT conducted, attended FROM attendance WHERE student_id = ? AND subject_code = ?", (student_id, subject_code))
                row = cursor.fetchone()
                
                if row:
                    new_conducted = row[0] + 1
                    new_attended = row[1] + 1 if is_present else row[1]
                    cursor.execute("UPDATE attendance SET conducted = ?, attended = ? WHERE student_id = ? AND subject_code = ?", (new_conducted, new_attended, student_id, subject_code))
                else:
                    new_attended = 1 if is_present else 0
                    cursor.execute("INSERT INTO attendance VALUES (?, ?, ?, ?, 1)", (student_id, subject_code, subject_code, new_attended))
                
                if is_present:
                    present_count += 1
            
            timestamp = datetime.datetime.now().isoformat()
            cursor.execute(
                "INSERT INTO attendance_logs (date, period, subject_code, present_count, total_count, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
                (date, period, subject_code, present_count, len(student_present_map), timestamp)
            )
            
            conn.commit()
            return True
        except Exception as e:
            print("DB Marking Attendance Error:", e)
            conn.rollback()
            return False
        finally:
            conn.close()

    def db_save_marks(self, subject_code, student_marks_map, exam_type):
        conn = self.db_connect()
        cursor = conn.cursor()
        
        try:
            for student_id, score in student_marks_map.items():
                if score == "":
                    score_val = None
                else:
                    score_val = float(score)
                    
                cursor.execute("SELECT COUNT(*) FROM marks WHERE student_id = ? AND subject_code = ?", (student_id, subject_code))
                exists = cursor.fetchone()[0] > 0
                
                if exists:
                    cursor.execute(f"UPDATE marks SET {exam_type} = ? WHERE student_id = ? AND subject_code = ?", (score_val, student_id, subject_code))
                else:
                    cols = { "mid1": None, "mid2": None, "assignment": None, "external": None }
                    cols[exam_type] = score_val
                    cursor.execute("INSERT INTO marks VALUES (?, ?, ?, ?, ?, ?)", (student_id, subject_code, cols["mid1"], cols["mid2"], cols["assignment"], cols["external"]))
            
            conn.commit()
            return True
        except Exception as e:
            print("DB Saving Marks Error:", e)
            conn.rollback()
            return False
        finally:
            conn.close()

    def db_pay_fee(self, student_id, fee_type, amount):
        conn = self.db_connect()
        cursor = conn.cursor()
        
        try:
            cursor.execute("SELECT total, paid FROM fees WHERE student_id = ? AND fee_type = ?", (student_id, fee_type))
            row = cursor.fetchone()
            
            if not row:
                return {"success": False, "error": "Fee Category not found for student."}
                
            total, paid = row[0], row[1]
            remaining = total - paid
            pay_amount = min(amount, remaining)
            
            if pay_amount <= 0:
                return {"success": False, "error": "No outstanding balance or invalid payment amount."}
                
            new_paid = paid + pay_amount
            cursor.execute("UPDATE fees SET paid = ? WHERE student_id = ? AND fee_type = ?", (new_paid, student_id, fee_type))
            
            ref_no = f"TXN{random.randint(10000000, 99999999)}"
            date_today = datetime.datetime.now().strftime("%Y-%m-%d")
            
            cursor.execute(
                "INSERT INTO fee_history (student_id, fee_type, date, amount, ref) VALUES (?, ?, ?, ?, ?)",
                (student_id, fee_type, date_today, pay_amount, ref_no)
            )
            
            conn.commit()
            return {
                "success": True, "ref": ref_no, "amount": pay_amount, "date": date_today
            }
        except Exception as e:
            print("DB Fee Payment Error:", e)
            conn.rollback()
            return {"success": False, "error": f"Database transaction failed: {str(e)}"}
        finally:
            conn.close()

    def db_import_excel_rows(self, rows):
        conn = self.db_connect()
        cursor = conn.cursor()
        
        try:
            for row in rows:
                regdNo = row.get('regdNo', '').strip().upper()
                if not regdNo:
                    continue
                student_id = regdNo.lower()
                
                cursor.execute("SELECT COUNT(*) FROM students WHERE id = ?", (student_id,))
                exists = cursor.fetchone()[0] > 0
                
                if not exists:
                    cursor.execute(
                        "INSERT INTO students VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        (student_id, student_id, row.get('name', 'Student Name'), regdNo, 
                         row.get('branch', 'Computer Science & Engineering'), row.get('year', '3rd Year'), 
                         row.get('semester', '1st Semester'), row.get('section', 'B'), '👨‍🎓', 'No feedback entered yet.', 'active')
                    )
                    
                    default_fees = [('tuition', 85000, 0), ('exam', 1500, 0), ('library', 500, 0), ('hostel', 75000, 0)]
                    for f in default_fees:
                        cursor.execute("INSERT INTO fees VALUES (?, ?, ?, ?)", (student_id, f[0], f[1], f[2]))
                
                subject_code = row.get('subjectCode')
                if subject_code:
                    cursor.execute("SELECT COUNT(*) FROM attendance WHERE student_id = ? AND subject_code = ?", (student_id, subject_code))
                    att_exists = cursor.fetchone()[0] > 0
                    
                    attended = int(row.get('attended', 0))
                    conducted = int(row.get('conducted', 0))
                    
                    if att_exists:
                        cursor.execute("UPDATE attendance SET attended = ?, conducted = ? WHERE student_id = ? AND subject_code = ?", (attended, conducted, student_id, subject_code))
                    else:
                        sub_name = row.get('subjectName', subject_code)
                        cursor.execute("INSERT INTO attendance VALUES (?, ?, ?, ?, ?)", (student_id, subject_code, sub_name, attended, conducted))
                
                exam_type = row.get('examType')
                if subject_code and exam_type and row.get('marks') is not None:
                    score = float(row.get('marks'))
                    
                    cursor.execute("SELECT COUNT(*) FROM marks WHERE student_id = ? AND subject_code = ?", (student_id, subject_code))
                    marks_exists = cursor.fetchone()[0] > 0
                    
                    if marks_exists:
                        cursor.execute(f"UPDATE marks SET {exam_type} = ? WHERE student_id = ? AND subject_code = ?", (score, student_id, subject_code))
                    else:
                        cols = { "mid1": None, "mid2": None, "assignment": None, "external": None }
                        cols[exam_type] = score
                        cursor.execute("INSERT INTO marks VALUES (?, ?, ?, ?, ?, ?)", (student_id, subject_code, cols["mid1"], cols["mid2"], cols["assignment"], cols["external"]))
            
            conn.commit()
            return True
        except Exception as e:
            print("DB Excel Import Error:", e)
            conn.rollback()
            return False
        finally:
            conn.close()

    def db_save_remarks(self, student_id, remarks):
        conn = self.db_connect()
        cursor = conn.cursor()
        try:
            cursor.execute("UPDATE students SET remarks = ? WHERE id = ?", (remarks, student_id))
            conn.commit()
            return True
        except Exception as e:
            print("DB Save Remarks Error:", e)
            conn.rollback()
            return False
        finally:
            conn.close()

    def db_get_announcements(self):
        conn = self.db_connect()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT id, type, date, title, desc FROM announcements ORDER BY id DESC")
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    def db_add_announcement(self, type, date, title, desc):
        conn = self.db_connect()
        cursor = conn.cursor()
        try:
            cursor.execute("INSERT INTO announcements (type, date, title, desc) VALUES (?, ?, ?, ?)", (type, date, title, desc))
            conn.commit()
            return True
        except Exception as e:
            print("DB Add Announcement Error:", e)
            conn.rollback()
            return False
        finally:
            conn.close()

    def db_delete_announcement(self, id):
        conn = self.db_connect()
        cursor = conn.cursor()
        try:
            cursor.execute("DELETE FROM announcements WHERE id = ?", (id,))
            conn.commit()
            return True
        except Exception as e:
            print("DB Delete Announcement Error:", e)
            conn.rollback()
            return False
        finally:
            conn.close()

    def db_save_student_status(self, student_id, status):
        conn = self.db_connect()
        cursor = conn.cursor()
        try:
            cursor.execute("UPDATE students SET status = ? WHERE id = ?", (status, student_id))
            conn.commit()
            return True
        except Exception as e:
            print("DB Save Student Status Error:", e)
            conn.rollback()
            return False
        finally:
            conn.close()

    def db_add_student(self, sid, name, branch, section):
        conn = self.db_connect()
        cursor = conn.cursor()
        try:
            regd = sid.upper()
            cursor.execute(
                "INSERT INTO students VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (sid, sid, name, regd, branch, "3rd Year", "1st Semester", section, "👨‍🎓", "No feedback entered yet.", "active")
            )
            # Default subjects attendance & marks
            subjects = [
                ("MFCS", "Math Foundations of CS"),
                ("SE", "Software Engineering"),
                ("DBMS", "Database Management Systems"),
                ("COA", "Computer Org & Architecture"),
                ("OOPJ", "Object Oriented Programming (Java)")
            ]
            for sub in subjects:
                cursor.execute("INSERT INTO attendance VALUES (?, ?, ?, 0, 0)", (sid, sub[0], sub[1]))
                cursor.execute("INSERT INTO marks VALUES (?, ?, NULL, NULL, NULL, NULL)", (sid, sub[0]))
                
            # Default fees
            default_fees = [('tuition', 85000, 0), ('exam', 1500, 0), ('library', 500, 0), ('hostel', 75000, 0)]
            for f in default_fees:
                cursor.execute("INSERT INTO fees VALUES (?, ?, ?, ?)", (sid, f[0], f[1], f[2]))
                
            conn.commit()
            return True
        except Exception as e:
            print("DB Add Student Error:", e)
            conn.rollback()
            return False
        finally:
            conn.close()

    def db_delete_student(self, student_id):
        conn = self.db_connect()
        cursor = conn.cursor()
        try:
            cursor.execute("DELETE FROM students WHERE id = ?", (student_id,))
            cursor.execute("DELETE FROM attendance WHERE student_id = ?", (student_id,))
            cursor.execute("DELETE FROM marks WHERE student_id = ?", (student_id,))
            cursor.execute("DELETE FROM fees WHERE student_id = ?", (student_id,))
            cursor.execute("DELETE FROM fee_history WHERE student_id = ?", (student_id,))
            conn.commit()
            return True
        except Exception as e:
            print("DB Delete Student Error:", e)
            conn.rollback()
            return False
        finally:
            conn.close()

    def db_get_leaves(self, faculty_id):
        conn = self.db_connect()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        try:
            if not faculty_id or faculty_id.lower() == 'all':
                cursor.execute("""
                    SELECT l.id, l.faculty_id, l.type, l.date_from, l.date_to, l.reason, l.status, l.applied_on, f.name as faculty_name, f.department as faculty_dept 
                    FROM leaves l 
                    JOIN faculty f ON l.faculty_id = f.id 
                    ORDER BY l.id DESC
                """)
            else:
                cursor.execute("SELECT * FROM leaves WHERE faculty_id = ? ORDER BY id DESC", (faculty_id.lower(),))
            rows = [dict(r) for r in cursor.fetchall()]
            return rows
        except Exception as e:
            print("DB Get Leaves Error:", e)
            return []
        finally:
            conn.close()

    def db_apply_leave(self, faculty_id, ltype, date_from, date_to, reason):
        conn = self.db_connect()
        cursor = conn.cursor()
        try:
            applied_on = datetime.datetime.now().strftime("%Y-%m-%d")
            cursor.execute(
                "INSERT INTO leaves (faculty_id, type, date_from, date_to, reason, status, applied_on) VALUES (?, ?, ?, ?, ?, 'pending', ?)",
                (faculty_id.lower(), ltype, date_from, date_to, reason, applied_on)
            )
            conn.commit()
            return True
        except Exception as e:
            print("DB Apply Leave Error:", e)
            conn.rollback()
            return False
        finally:
            conn.close()

    def db_update_leave_status(self, leave_id, status):
        conn = self.db_connect()
        cursor = conn.cursor()
        try:
            cursor.execute("UPDATE leaves SET status = ? WHERE id = ?", (status, leave_id))
            conn.commit()
            return True
        except Exception as e:
            print("DB Update Leave Status Error:", e)
            conn.rollback()
            return False
        finally:
            conn.close()

    def db_get_all_faculty(self):
        conn = self.db_connect()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT id, name, department, designation, profileImg, role FROM faculty ORDER BY id ASC")
            rows = [dict(r) for r in cursor.fetchall()]
            return rows
        except Exception as e:
            print("DB Get All Faculty Error:", e)
            return []
        finally:
            conn.close()

    def db_add_faculty(self, fid, name, department, designation, role):
        conn = self.db_connect()
        cursor = conn.cursor()
        try:
            fid_lower = fid.lower()
            cursor.execute(
                "INSERT INTO faculty VALUES (?, ?, ?, ?, ?, ?, ?)",
                (fid_lower, fid_lower, name, department, designation, "👨‍🏫", role)
            )
            conn.commit()
            return True
        except Exception as e:
            print("DB Add Faculty Error:", e)
            conn.rollback()
            return False
        finally:
            conn.close()

    def db_delete_faculty(self, faculty_id):
        conn = self.db_connect()
        cursor = conn.cursor()
        try:
            cursor.execute("DELETE FROM faculty WHERE id = ?", (faculty_id.lower(),))
            cursor.execute("DELETE FROM faculty_subjects WHERE faculty_id = ?", (faculty_id.lower(),))
            cursor.execute("DELETE FROM leaves WHERE faculty_id = ?", (faculty_id.lower(),))
            conn.commit()
            return True
        except Exception as e:
            print("DB Delete Faculty Error:", e)
            conn.rollback()
            return False
        finally:
            conn.close()

    def db_get_appointments(self, student_id=None, faculty_id=None):
        conn = self.db_connect()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        try:
            if student_id:
                cursor.execute("SELECT * FROM appointments WHERE student_id = ? ORDER BY id DESC", (student_id.lower(),))
            elif faculty_id:
                cursor.execute("SELECT * FROM appointments WHERE faculty_id = ? ORDER BY id DESC", (faculty_id.lower(),))
            else:
                cursor.execute("SELECT * FROM appointments ORDER BY id DESC")
            rows = [dict(r) for r in cursor.fetchall()]
            return rows
        except Exception as e:
            print("DB Get Appointments Error:", e)
            return []
        finally:
            conn.close()

    def db_request_appointment(self, student_id, student_name, faculty_id, faculty_name, request_date, request_time, reason):
        conn = self.db_connect()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO appointments (student_id, student_name, faculty_id, faculty_name, request_date, request_time, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')",
                (student_id.lower(), student_name, faculty_id.lower(), faculty_name, request_date, request_time, reason)
            )
            conn.commit()
            return True
        except Exception as e:
            print("DB Request Appointment Error:", e)
            conn.rollback()
            return False
        finally:
            conn.close()

    def db_respond_appointment(self, appointment_id, status, assigned_time=None, remarks=None):
        conn = self.db_connect()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE appointments SET status = ?, assigned_time = ?, remarks = ? WHERE id = ?",
                (status, assigned_time, remarks, appointment_id)
            )
            conn.commit()
            return True
        except Exception as e:
            print("DB Respond Appointment Error:", e)
            conn.rollback()
            return False
        finally:
            conn.close()

    def db_get_chat_messages(self, student_id=None, faculty_id=None):
        conn = self.db_connect()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        try:
            if student_id and faculty_id:
                cursor.execute(
                    "SELECT * FROM chat_messages WHERE student_id = ? AND faculty_id = ? ORDER BY id ASC",
                    (student_id.lower(), faculty_id.lower())
                )
            elif student_id:
                cursor.execute("SELECT * FROM chat_messages WHERE student_id = ? ORDER BY id ASC", (student_id.lower(),))
            elif faculty_id:
                cursor.execute("SELECT * FROM chat_messages WHERE faculty_id = ? ORDER BY id ASC", (faculty_id.lower(),))
            else:
                cursor.execute("SELECT * FROM chat_messages ORDER BY id ASC")
            
            rows = [dict(r) for r in cursor.fetchall()]
            return rows
        except Exception as e:
            print("DB Get Chat Messages Error:", e)
            return []
        finally:
            conn.close()

    def db_send_chat_message(self, student_id, student_name, faculty_id, message, sender):
        conn = self.db_connect()
        cursor = conn.cursor()
        import datetime
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %I:%M %p")
        try:
            cursor.execute(
                "INSERT INTO chat_messages (student_id, student_name, faculty_id, message, sender, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
                (student_id.lower(), student_name, faculty_id.lower(), message, sender, timestamp)
            )
            conn.commit()
            return True
        except Exception as e:
            print("DB Send Chat Message Error:", e)
            conn.rollback()
            return False
        finally:
            conn.close()

# Start HTTP Server
if __name__ == '__main__':
    seed_database()
    
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, PortalRequestHandler)
    print(f"==========================================================================")
    print(f"VLITS Portal Web Server is running locally on http://localhost:{PORT}")
    print(f"Press CTRL+C in this terminal window to terminate the database connection.")
    print(f"==========================================================================")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down VLITS database portal web server...")
        httpd.server_close()
        sys.exit(0)
