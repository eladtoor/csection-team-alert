-- Emergency C-Section Alert System Database Schema
-- SQLite Version - No installation required!
-- Soroka Hospital Hackathon Project

-- Team Roles Table
CREATE TABLE IF NOT EXISTS TeamRoles (
    role_id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_name TEXT NOT NULL UNIQUE,
    role_name_hebrew TEXT NOT NULL,
    is_fixed_phone INTEGER DEFAULT 0,
    requires_selection INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Team Members Table
CREATE TABLE IF NOT EXISTS TeamMembers (
    member_id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    role_id INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (role_id) REFERENCES TeamRoles(role_id)
);

-- Current Shift/Rotation Table
CREATE TABLE IF NOT EXISTS CurrentShift (
    shift_id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_id INTEGER,
    member_id INTEGER,
    shift_start TEXT NOT NULL,
    shift_end TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (role_id) REFERENCES TeamRoles(role_id),
    FOREIGN KEY (member_id) REFERENCES TeamMembers(member_id)
);

-- Emergency Cases Table
CREATE TABLE IF NOT EXISTS EmergencyCases (
    case_id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_uuid TEXT DEFAULT (lower(hex(randomblob(16)))),
    patient_full_name TEXT NOT NULL,
    patient_id_number TEXT NOT NULL,
    location_type TEXT NOT NULL,
    room_number TEXT NOT NULL,
    urgency_level TEXT NOT NULL,
    case_details TEXT NULL,
    triggered_by_doctor_id INTEGER,
    triggered_at TEXT DEFAULT (datetime('now')),
    surgery_started_at TEXT NULL,
    surgery_completed_at TEXT NULL,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (triggered_by_doctor_id) REFERENCES TeamMembers(member_id)
);

-- Case Team Assignments Table
CREATE TABLE IF NOT EXISTS CaseTeamAssignments (
    assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER,
    member_id INTEGER,
    role_id INTEGER,
    alert_sent_at TEXT DEFAULT (datetime('now')),
    voice_call_status TEXT NULL,
    voice_call_sid TEXT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (case_id) REFERENCES EmergencyCases(case_id),
    FOREIGN KEY (member_id) REFERENCES TeamMembers(member_id),
    FOREIGN KEY (role_id) REFERENCES TeamRoles(role_id)
);

-- Team Member Responses Table
CREATE TABLE IF NOT EXISTS TeamResponses (
    response_id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER,
    member_id INTEGER,
    response_type TEXT NOT NULL,
    estimated_minutes INTEGER NULL,
    responded_at TEXT DEFAULT (datetime('now')),
    actual_arrival_at TEXT NULL,
    arrival_confirmed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (case_id) REFERENCES EmergencyCases(case_id),
    FOREIGN KEY (member_id) REFERENCES TeamMembers(member_id)
);

-- Performance Metrics Table (for analytics)
CREATE TABLE IF NOT EXISTS PerformanceMetrics (
    metric_id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER,
    member_id INTEGER,
    response_time_seconds INTEGER NULL,
    arrival_time_seconds INTEGER NULL,
    was_on_time INTEGER NULL,
    week_number INTEGER NULL,
    year_number INTEGER NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (case_id) REFERENCES EmergencyCases(case_id),
    FOREIGN KEY (member_id) REFERENCES TeamMembers(member_id)
);

-- Create Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cases_status ON EmergencyCases(status);
CREATE INDEX IF NOT EXISTS idx_cases_triggered ON EmergencyCases(triggered_at);
CREATE INDEX IF NOT EXISTS idx_responses_case ON TeamResponses(case_id);
CREATE INDEX IF NOT EXISTS idx_responses_member ON TeamResponses(member_id);
CREATE INDEX IF NOT EXISTS idx_metrics_week ON PerformanceMetrics(week_number, year_number);

-- Insert Default Roles
INSERT OR IGNORE INTO TeamRoles (role_id, role_name, role_name_hebrew, is_fixed_phone, requires_selection) VALUES
(1, 'Senior Doctor', 'רופא בכיר (סינדרלה)', 0, 0),
(2, 'Assistant Doctor', 'רופא עוזר', 0, 1),
(3, 'Pediatrician', 'רופא ילדים', 1, 0),
(4, 'Anesthesiologist', 'רופא מרדים', 1, 0),
(5, 'OR Nurse', 'אחיות חדר ניתוח', 1, 0),
(6, 'Orderly', 'סניטר', 1, 0),
(7, 'Head Midwife', 'מיילדת אחראית', 1, 0);

-- Insert Sample Team Members (Synthetic Data for Demo)
INSERT OR IGNORE INTO TeamMembers (member_id, full_name, phone_number, role_id) VALUES
-- Senior Doctors
(1, 'ד"ר שרה כהן', '+972501234567', 1),
(2, 'ד"ר דוד לוי', '+972502345678', 1),
(3, 'ד"ר מרים אבני', '+972503456789', 1),

-- Assistant Doctors
(4, 'ד"ר יוסי משה', '+972504567890', 2),
(5, 'ד"ר רחל ברק', '+972505678901', 2),
(6, 'ד"ר אורי גולן', '+972506789012', 2),

-- Pediatricians
(7, 'ד"ר אליה דוד', '+972507890123', 3),
(8, 'ד"ר נועה שטרן', '+972508901234', 3),

-- Anesthesiologists
(9, 'ד"ר מיכאל רוזן', '+972509012345', 4),
(10, 'ד"ר תמר פרידמן', '+972501112233', 4),

-- OR Nurses
(11, 'אחות ליאת כץ', '+972502223344', 5),
(12, 'אחות יעל שמיר', '+972503334455', 5),

-- Orderlies
(13, 'משה אוחיון', '+972504445566', 6),
(14, 'יוסף עזרא', '+972505556677', 6),

-- Head Midwives
(15, 'מיילדת רותי אלון', '+972506667788', 7),
(16, 'מיילדת דנה שפירא', '+972507778899', 7);

-- Setup current shift for demo
INSERT OR IGNORE INTO CurrentShift (role_id, member_id, shift_start, shift_end, is_active)
VALUES
    (3, 7, datetime('now', '-2 hours'), datetime('now', '+6 hours'), 1),
    (4, 9, datetime('now', '-2 hours'), datetime('now', '+6 hours'), 1),
    (5, 11, datetime('now', '-2 hours'), datetime('now', '+6 hours'), 1),
    (6, 13, datetime('now', '-2 hours'), datetime('now', '+6 hours'), 1),
    (7, 15, datetime('now', '-2 hours'), datetime('now', '+6 hours'), 1);
