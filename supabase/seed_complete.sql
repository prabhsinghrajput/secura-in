-- ==========================================
-- ARMS - COMPLETE SEED DATA FOR ALL TABLES
-- Covers all 6 roles, 2 departments, full workflow
-- All passwords: password123
-- ==========================================

-- CLEANUP (reverse dependency order)
TRUNCATE public.notifications CASCADE;
TRUNCATE public.student_issues CASCADE;
TRUNCATE public.lab_marks CASCADE;
TRUNCATE public.assignment_submissions CASCADE;
TRUNCATE public.assignments CASCADE;
TRUNCATE public.audit_logs CASCADE;
TRUNCATE public.timetables CASCADE;
TRUNCATE public.semester_results CASCADE;
TRUNCATE public.marks_submissions CASCADE;
TRUNCATE public.academic_records CASCADE;
TRUNCATE public.internal_assessments CASCADE;
TRUNCATE public.attendance CASCADE;
TRUNCATE public.subject_allocations CASCADE;
TRUNCATE public.qualifications CASCADE;
TRUNCATE public.sections CASCADE;
TRUNCATE public.system_config CASCADE;
TRUNCATE public.grading_scheme CASCADE;
TRUNCATE public.role_permissions CASCADE;
TRUNCATE public.permissions CASCADE;
TRUNCATE public.employees CASCADE;
TRUNCATE public.students CASCADE;
TRUNCATE public.user_roles CASCADE;
TRUNCATE public.roles CASCADE;
TRUNCATE public.subjects CASCADE;
TRUNCATE public.semesters CASCADE;
TRUNCATE public.courses CASCADE;
TRUNCATE public.departments CASCADE;
TRUNCATE public.users CASCADE;

-- ==========================================
-- 1. ROLES
-- ==========================================
INSERT INTO public.roles (id, name, level) VALUES
  (10, 'Student', 10),
  (50, 'Assistant Faculty', 50),
  (60, 'Faculty', 60),
  (70, 'HOD', 70),
  (80, 'Academic Admin', 80),
  (100, 'Super Admin', 100)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- 2. DEPARTMENTS
-- ==========================================
INSERT INTO public.departments (id, name, code) VALUES
  ('00000000-0000-0000-0000-0000000000d1', 'Computer Science Engineering', 'CSE'),
  ('00000000-0000-0000-0000-0000000000d2', 'Electronics & Communication', 'ECE');

-- ==========================================
-- 3. COURSES
-- ==========================================
INSERT INTO public.courses (id, dept_id, name, code, duration_years) VALUES
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', 'B.Tech CSE', 'BTECH-CSE', 4),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000d2', 'B.Tech ECE', 'BTECH-ECE', 4);

-- ==========================================
-- 4. SEMESTERS
-- ==========================================
INSERT INTO public.semesters (id, course_id, semester_number, is_active, is_locked) VALUES
  -- CSE Semesters
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 1, true, false),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1', 2, true, false),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000c1', 3, false, false),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000c1', 4, false, false),
  -- ECE Semesters
  ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000c2', 1, true, false),
  ('00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-0000000000c2', 2, true, false);

-- ==========================================
-- 5. SUBJECTS
-- ==========================================
INSERT INTO public.subjects (id, course_id, semester_id, subject_code, name, credits, subject_type, max_internal, max_external) VALUES
  -- CSE Semester 1
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'CS101', 'Data Structures', 4, 'Theory', 30, 70),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'CS102', 'Programming in C', 3, 'Practical', 40, 60),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'MA101', 'Mathematics-I', 4, 'Theory', 30, 70),
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'PH101', 'Physics-I', 3, 'Theory', 30, 70),
  -- CSE Semester 2
  ('00000000-0000-0000-0000-0000000000b5', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', 'CS201', 'OOP with Java', 4, 'Theory', 30, 70),
  ('00000000-0000-0000-0000-0000000000b6', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', 'CS202', 'Digital Logic Design', 3, 'Theory', 30, 70),
  ('00000000-0000-0000-0000-0000000000b7', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', 'CS203', 'Data Structures Lab', 2, 'Practical', 50, 50),
  -- CSE Semester 3
  ('00000000-0000-0000-0000-0000000000b8', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a3', 'CS301', 'Database Systems', 4, 'Theory', 30, 70),
  ('00000000-0000-0000-0000-0000000000b9', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a3', 'CS302', 'Operating Systems', 4, 'Theory', 30, 70),
  -- ECE Semester 1
  ('00000000-0000-0000-0000-0000000000ba', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a5', 'EC101', 'Circuit Theory', 4, 'Theory', 30, 70),
  ('00000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a5', 'EC102', 'Electronics Lab', 2, 'Practical', 50, 50),
  ('00000000-0000-0000-0000-0000000000bc', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a5', 'MA102', 'Engineering Math', 4, 'Theory', 30, 70);

-- ==========================================
-- 6. SECTIONS
-- ==========================================
INSERT INTO public.sections (id, semester_id, name, capacity) VALUES
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1', 'A', 60),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000a1', 'B', 60),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000a2', 'A', 60),
  ('00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000a5', 'A', 60);

-- ==========================================
-- 7. USERS (all passwords: password123)
-- ==========================================
INSERT INTO public.users (id, uid_eid, password_hash, role_level, department_id) VALUES
  -- Super Admin (no dept)
  ('00000000-0000-0000-0000-000000000009', 'SUPER',   'password123', 100, NULL),
  -- Academic Admin (CSE)
  ('00000000-0000-0000-0000-000000000008', 'ADMIN01', 'password123',  80, '00000000-0000-0000-0000-0000000000d1'),
  -- HODs
  ('00000000-0000-0000-0000-000000000007', 'HOD001',  'password123',  70, '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-00000000000b', 'HOD002',  'password123',  70, '00000000-0000-0000-0000-0000000000d2'),
  -- Faculty
  ('00000000-0000-0000-0000-000000000006', 'FAC001',  'password123',  60, '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-00000000000a', 'FAC002',  'password123',  60, '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-00000000000c', 'FAC003',  'password123',  60, '00000000-0000-0000-0000-0000000000d2'),
  -- Assistant Faculty
  ('00000000-0000-0000-0000-000000000005', 'ASST001', 'password123',  50, '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-00000000000d', 'ASST002', 'password123',  50, '00000000-0000-0000-0000-0000000000d2'),
  -- Students (CSE)
  ('00000000-0000-0000-0000-000000000001', 'STU001',  'password123',  10, '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-000000000002', 'STU002',  'password123',  10, '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-000000000003', 'STU003',  'password123',  10, '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-000000000004', 'STU004',  'password123',  10, '00000000-0000-0000-0000-0000000000d1'),
  -- Students (ECE)
  ('00000000-0000-0000-0000-00000000000e', 'STU005',  'password123',  10, '00000000-0000-0000-0000-0000000000d2'),
  ('00000000-0000-0000-0000-00000000000f', 'STU006',  'password123',  10, '00000000-0000-0000-0000-0000000000d2');

-- ==========================================
-- 8. USER ROLES
-- ==========================================
INSERT INTO public.user_roles (user_id, role_id) VALUES
  ('00000000-0000-0000-0000-000000000009', 100),
  ('00000000-0000-0000-0000-000000000008', 80),
  ('00000000-0000-0000-0000-000000000007', 70),
  ('00000000-0000-0000-0000-00000000000b', 70),
  ('00000000-0000-0000-0000-000000000006', 60),
  ('00000000-0000-0000-0000-00000000000a', 60),
  ('00000000-0000-0000-0000-00000000000c', 60),
  ('00000000-0000-0000-0000-000000000005', 50),
  ('00000000-0000-0000-0000-00000000000d', 50),
  ('00000000-0000-0000-0000-000000000001', 10),
  ('00000000-0000-0000-0000-000000000002', 10),
  ('00000000-0000-0000-0000-000000000003', 10),
  ('00000000-0000-0000-0000-000000000004', 10),
  ('00000000-0000-0000-0000-00000000000e', 10),
  ('00000000-0000-0000-0000-00000000000f', 10);

-- ==========================================
-- 9. EMPLOYEES
-- ==========================================
INSERT INTO public.employees (eid, name, email, designation, department_id, qualification, dob, contact_number, address) VALUES
  ('SUPER',   'System Controller',   'super@secura.in',   'System Admin',          NULL,                                          'M.Tech', '1980-01-01', '9000000000', 'Server Room'),
  ('ADMIN01', 'Dr. Sarah Connor',    'sarah@secura.in',   'Registrar',             '00000000-0000-0000-0000-0000000000d1', 'Ph.D', '1975-05-20', '9100000001', '12 Admin Block'),
  ('HOD001',  'Dr. James Smith',     'james@secura.in',   'Professor & HOD',       '00000000-0000-0000-0000-0000000000d1', 'Ph.D Computer Science', '1970-08-15', '9100000002', '45 Faculty Colony'),
  ('HOD002',  'Dr. Meera Reddy',     'meera@secura.in',   'Professor & HOD',       '00000000-0000-0000-0000-0000000000d2', 'Ph.D Electronics',      '1972-03-25', '9100000003', '18 Faculty Colony'),
  ('FAC001',  'Prof. Robert Martin', 'bob@secura.in',     'Associate Professor',   '00000000-0000-0000-0000-0000000000d1', 'M.Tech CS',   '1982-11-10', '9200000001', '67 Staff Quarters'),
  ('FAC002',  'Prof. Ananya Iyer',   'ananya@secura.in',  'Assistant Professor',   '00000000-0000-0000-0000-0000000000d1', 'M.Tech AI',   '1988-06-14', '9200000002', '23 Staff Quarters'),
  ('FAC003',  'Prof. Vikram Das',    'vikram@secura.in',  'Associate Professor',   '00000000-0000-0000-0000-0000000000d2', 'M.Tech VLSI', '1985-09-22', '9200000003', '11 Faculty Lane'),
  ('ASST001', 'Ravi Sharma',         'ravi@secura.in',    'Lab Instructor',        '00000000-0000-0000-0000-0000000000d1', 'M.Sc CS',     '1992-01-30', '9300000001', '5 Hostel Road'),
  ('ASST002', 'Priya Nair',          'priya@secura.in',   'Lab Instructor',        '00000000-0000-0000-0000-0000000000d2', 'M.Sc ECE',    '1994-07-18', '9300000002', '8 Hostel Road');

-- ==========================================
-- 10. STUDENTS
-- ==========================================
INSERT INTO public.students (uid, name, email, department_id, course_id, current_semester_id, roll_number, enrollment_number, dob, blood_group, admission_year, address, contact_number, guardian_name, guardian_contact, mentor_eid, section, gender, category) VALUES
  -- CSE Semester 1 students
  ('STU001', 'Aman Verma',     'aman@secura.in',     '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '24CSE01', 'EN2024CSE001', '2005-04-12', 'B+',  2024, '32 MG Road, Delhi',        '8100000001', 'Rakesh Verma',    '8500000001', 'FAC001', 'A', 'Male',   'General'),
  ('STU002', 'Sneha Gupta',    'sneha@secura.in',    '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '24CSE02', 'EN2024CSE002', '2005-08-23', 'A+',  2024, '15 Gandhi Nagar, Jaipur',  '8100000002', 'Sunil Gupta',     '8500000002', 'FAC001', 'A', 'Female', 'OBC'),
  ('STU003', 'Rohan Patel',    'rohan@secura.in',    '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '24CSE03', 'EN2024CSE003', '2005-01-07', 'O+',  2024, '88 Park Street, Kolkata',  '8100000003', 'Ajay Patel',      '8500000003', 'FAC002', 'B', 'Male',   'General'),
  ('STU004', 'Priyanka Singh', 'priyanka@secura.in', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '24CSE04', 'EN2024CSE004', '2005-11-30', 'AB+', 2024, '42 Lake View, Bangalore',  '8100000004', 'Rajesh Singh',    '8500000004', 'FAC002', 'B', 'Female', 'SC'),
  -- ECE Semester 1 students
  ('STU005', 'Karan Mehta',    'karan@secura.in',    '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a5', '24ECE01', 'EN2024ECE001', '2005-06-18', 'B+',  2024, '56 Lajpat Nagar, Delhi',   '8100000005', 'Suresh Mehta',    '8500000005', 'FAC003', 'A', 'Male',   'General'),
  ('STU006', 'Divya Joshi',    'divya@secura.in',    '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a5', '24ECE02', 'EN2024ECE002', '2005-09-05', 'A-',  2024, '73 Civil Lines, Lucknow',  '8100000006', 'Manoj Joshi',     '8500000006', 'FAC003', 'A', 'Female', 'EWS');

-- ==========================================
-- 11. SUBJECT ALLOCATIONS (who teaches what)
-- ==========================================
INSERT INTO public.subject_allocations (subject_id, faculty_eid, semester_id, section) VALUES
  -- FAC001 teaches CS101 (Data Structures) & MA101 (Math) for section A
  ('00000000-0000-0000-0000-0000000000b1', 'FAC001', '00000000-0000-0000-0000-0000000000a1', 'A'),
  ('00000000-0000-0000-0000-0000000000b3', 'FAC001', '00000000-0000-0000-0000-0000000000a1', 'A'),
  -- FAC001 also teaches CS101 for section B
  ('00000000-0000-0000-0000-0000000000b1', 'FAC001', '00000000-0000-0000-0000-0000000000a1', 'B'),
  -- FAC002 teaches CS102 (C Programming) & PH101 (Physics)
  ('00000000-0000-0000-0000-0000000000b2', 'FAC002', '00000000-0000-0000-0000-0000000000a1', NULL),
  ('00000000-0000-0000-0000-0000000000b4', 'FAC002', '00000000-0000-0000-0000-0000000000a1', NULL),
  -- CSE Sem 2 allocations
  ('00000000-0000-0000-0000-0000000000b5', 'FAC001', '00000000-0000-0000-0000-0000000000a2', 'A'),
  ('00000000-0000-0000-0000-0000000000b6', 'FAC002', '00000000-0000-0000-0000-0000000000a2', NULL),
  ('00000000-0000-0000-0000-0000000000b7', 'FAC002', '00000000-0000-0000-0000-0000000000a2', NULL),
  -- ECE allocations
  ('00000000-0000-0000-0000-0000000000ba', 'FAC003', '00000000-0000-0000-0000-0000000000a5', 'A'),
  ('00000000-0000-0000-0000-0000000000bb', 'FAC003', '00000000-0000-0000-0000-0000000000a5', NULL),
  ('00000000-0000-0000-0000-0000000000bc', 'FAC003', '00000000-0000-0000-0000-0000000000a5', NULL),
  -- ASST001 assists CS102 lab
  ('00000000-0000-0000-0000-0000000000b2', 'ASST001', '00000000-0000-0000-0000-0000000000a1', NULL),
  -- ASST002 assists EC102 lab
  ('00000000-0000-0000-0000-0000000000bb', 'ASST002', '00000000-0000-0000-0000-0000000000a5', NULL);

-- ==========================================
-- 12. QUALIFICATIONS (student prior education)
-- ==========================================
INSERT INTO public.qualifications (uid, institution, degree, percentage_cgpa, year_of_passing) VALUES
  ('STU001', 'DPS New Delhi',           '12th CBSE',  92.4, 2024),
  ('STU001', 'DPS New Delhi',           '10th CBSE',  95.0, 2022),
  ('STU002', 'Kendriya Vidyalaya',      '12th CBSE',  88.6, 2024),
  ('STU003', 'St. Xavier Kolkata',      '12th ISC',   85.2, 2024),
  ('STU004', 'Mount Carmel Bangalore',  '12th State', 90.1, 2024),
  ('STU005', 'DAV Public School',       '12th CBSE',  87.8, 2024),
  ('STU006', 'City Montessori Lucknow', '12th CBSE',  91.3, 2024);

-- ==========================================
-- 13. ATTENDANCE (multiple dates for CSE Sem 1)
-- ==========================================
INSERT INTO public.attendance (student_uid, subject_id, date, status, marked_by, remarks) VALUES
  -- CS101 Data Structures — March 3-7 week (Mon-Fri)
  ('STU001', '00000000-0000-0000-0000-0000000000b1', '2026-03-03', 'Present', 'FAC001', NULL),
  ('STU001', '00000000-0000-0000-0000-0000000000b1', '2026-03-04', 'Present', 'FAC001', NULL),
  ('STU001', '00000000-0000-0000-0000-0000000000b1', '2026-03-05', 'Late',    'FAC001', 'Arrived 10 min late'),
  ('STU001', '00000000-0000-0000-0000-0000000000b1', '2026-03-06', 'Present', 'FAC001', NULL),
  ('STU001', '00000000-0000-0000-0000-0000000000b1', '2026-03-07', 'Present', 'FAC001', NULL),
  -- STU002 attendance for CS101
  ('STU002', '00000000-0000-0000-0000-0000000000b1', '2026-03-03', 'Present', 'FAC001', NULL),
  ('STU002', '00000000-0000-0000-0000-0000000000b1', '2026-03-04', 'Absent',  'FAC001', NULL),
  ('STU002', '00000000-0000-0000-0000-0000000000b1', '2026-03-05', 'Present', 'FAC001', NULL),
  ('STU002', '00000000-0000-0000-0000-0000000000b1', '2026-03-06', 'Present', 'FAC001', NULL),
  ('STU002', '00000000-0000-0000-0000-0000000000b1', '2026-03-07', 'Absent',  'FAC001', NULL),
  -- STU003 attendance (section B)
  ('STU003', '00000000-0000-0000-0000-0000000000b1', '2026-03-03', 'Present', 'FAC001', NULL),
  ('STU003', '00000000-0000-0000-0000-0000000000b1', '2026-03-04', 'Present', 'FAC001', NULL),
  ('STU003', '00000000-0000-0000-0000-0000000000b1', '2026-03-05', 'Absent',  'FAC001', 'Medical leave'),
  ('STU003', '00000000-0000-0000-0000-0000000000b1', '2026-03-06', 'Absent',  'FAC001', 'Medical leave'),
  ('STU003', '00000000-0000-0000-0000-0000000000b1', '2026-03-07', 'Present', 'FAC001', NULL),
  -- STU004 attendance
  ('STU004', '00000000-0000-0000-0000-0000000000b1', '2026-03-03', 'Present', 'FAC001', NULL),
  ('STU004', '00000000-0000-0000-0000-0000000000b1', '2026-03-04', 'Present', 'FAC001', NULL),
  ('STU004', '00000000-0000-0000-0000-0000000000b1', '2026-03-05', 'Present', 'FAC001', NULL),
  ('STU004', '00000000-0000-0000-0000-0000000000b1', '2026-03-06', 'Leave',   'FAC001', 'Family function'),
  ('STU004', '00000000-0000-0000-0000-0000000000b1', '2026-03-07', 'Present', 'FAC001', NULL),

  -- CS102 Programming in C — attendance
  ('STU001', '00000000-0000-0000-0000-0000000000b2', '2026-03-03', 'Present', 'FAC002', NULL),
  ('STU001', '00000000-0000-0000-0000-0000000000b2', '2026-03-05', 'Present', 'FAC002', NULL),
  ('STU001', '00000000-0000-0000-0000-0000000000b2', '2026-03-07', 'Absent',  'FAC002', NULL),
  ('STU002', '00000000-0000-0000-0000-0000000000b2', '2026-03-03', 'Present', 'FAC002', NULL),
  ('STU002', '00000000-0000-0000-0000-0000000000b2', '2026-03-05', 'Present', 'FAC002', NULL),
  ('STU002', '00000000-0000-0000-0000-0000000000b2', '2026-03-07', 'Present', 'FAC002', NULL),

  -- MA101 Mathematics-I — attendance
  ('STU001', '00000000-0000-0000-0000-0000000000b3', '2026-03-04', 'Present', 'FAC001', NULL),
  ('STU001', '00000000-0000-0000-0000-0000000000b3', '2026-03-06', 'Present', 'FAC001', NULL),
  ('STU002', '00000000-0000-0000-0000-0000000000b3', '2026-03-04', 'Late',    'FAC001', NULL),
  ('STU002', '00000000-0000-0000-0000-0000000000b3', '2026-03-06', 'Present', 'FAC001', NULL),

  -- PH101 Physics — attendance
  ('STU001', '00000000-0000-0000-0000-0000000000b4', '2026-03-03', 'Present', 'FAC002', NULL),
  ('STU001', '00000000-0000-0000-0000-0000000000b4', '2026-03-05', 'Absent',  'FAC002', NULL),
  ('STU002', '00000000-0000-0000-0000-0000000000b4', '2026-03-03', 'Present', 'FAC002', NULL),
  ('STU002', '00000000-0000-0000-0000-0000000000b4', '2026-03-05', 'Present', 'FAC002', NULL),

  -- Second week Mar 8 (today's Monday equivalent — we'll use Mar 9 as current date)
  ('STU001', '00000000-0000-0000-0000-0000000000b1', '2026-03-09', 'Present', 'FAC001', NULL),
  ('STU002', '00000000-0000-0000-0000-0000000000b1', '2026-03-09', 'Present', 'FAC001', NULL),
  ('STU003', '00000000-0000-0000-0000-0000000000b1', '2026-03-09', 'Present', 'FAC001', NULL),
  ('STU004', '00000000-0000-0000-0000-0000000000b1', '2026-03-09', 'Present', 'FAC001', NULL),

  -- ECE attendance
  ('STU005', '00000000-0000-0000-0000-0000000000ba', '2026-03-03', 'Present', 'FAC003', NULL),
  ('STU005', '00000000-0000-0000-0000-0000000000ba', '2026-03-05', 'Absent',  'FAC003', NULL),
  ('STU005', '00000000-0000-0000-0000-0000000000ba', '2026-03-07', 'Present', 'FAC003', NULL),
  ('STU006', '00000000-0000-0000-0000-0000000000ba', '2026-03-03', 'Present', 'FAC003', NULL),
  ('STU006', '00000000-0000-0000-0000-0000000000ba', '2026-03-05', 'Present', 'FAC003', NULL),
  ('STU006', '00000000-0000-0000-0000-0000000000ba', '2026-03-07', 'Present', 'FAC003', NULL);

-- ==========================================
-- 14. MARKS SUBMISSIONS (various workflow stages)
-- ==========================================
INSERT INTO public.marks_submissions (student_uid, subject_id, semester_id, internal_marks, mid_term_marks, practical_marks, external_marks, total_marks, grade, points, status, submitted_by, approved_by_hod, approved_by_admin) VALUES
  -- CS101: STU001 fully approved, STU002 pending_admin, STU003 pending_hod, STU004 draft
  ('STU001', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 28, 8, 0, 52, 88, 'A+', 9, 'approved', 'FAC001', 'HOD001', 'ADMIN01'),
  ('STU002', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 22, 6, 0, 45, 73, 'B+', 7, 'pending_admin', 'FAC001', 'HOD001', NULL),
  ('STU003', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 18, 5, 0, 38, 61, 'B',  6, 'pending_hod', 'FAC001', NULL, NULL),
  ('STU004', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 15, 4, 0, 0,  19, NULL, NULL, 'draft', 'FAC001', NULL, NULL),

  -- CS102: All approved for STU001 & STU002
  ('STU001', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', 35, 0, 0, 48, 83, 'A',  8, 'approved', 'FAC002', 'HOD001', 'ADMIN01'),
  ('STU002', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', 30, 0, 0, 42, 72, 'B+', 7, 'approved', 'FAC002', 'HOD001', 'ADMIN01'),

  -- MA101: Approved for STU001
  ('STU001', '00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a1', 26, 7, 0, 55, 88, 'A+', 9, 'approved', 'FAC001', 'HOD001', 'ADMIN01'),

  -- PH101: Approved for STU001
  ('STU001', '00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000a1', 24, 6, 0, 48, 78, 'A',  8, 'approved', 'FAC002', 'HOD001', 'ADMIN01'),

  -- ECE: Approved for STU005
  ('STU005', '00000000-0000-0000-0000-0000000000ba', '00000000-0000-0000-0000-0000000000a5', 25, 7, 0, 50, 82, 'A', 8, 'approved', 'FAC003', 'HOD002', 'ADMIN01'),
  ('STU005', '00000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-0000000000a5', 40, 0, 0, 38, 78, 'A', 8, 'approved', 'FAC003', 'HOD002', 'ADMIN01');

-- ==========================================
-- 15. INTERNAL ASSESSMENTS
-- ==========================================
INSERT INTO public.internal_assessments (uid, subject_code, assessment_type, marks_obtained, max_marks, status, evaluated_by) VALUES
  -- STU001 assessments
  ('STU001', 'CS101', 'Quiz 1',    8,  10, 'approved', 'FAC001'),
  ('STU001', 'CS101', 'Mid Term',  22, 30, 'approved', 'FAC001'),
  ('STU001', 'CS101', 'Quiz 2',    9,  10, 'approved', 'FAC001'),
  ('STU001', 'CS102', 'Lab Test 1', 18, 20, 'approved', 'FAC002'),
  ('STU001', 'CS102', 'Lab Test 2', 16, 20, 'approved', 'FAC002'),
  ('STU001', 'MA101', 'Quiz 1',    7,  10, 'approved', 'FAC001'),
  ('STU001', 'MA101', 'Mid Term',  20, 30, 'approved', 'FAC001'),
  ('STU001', 'PH101', 'Quiz 1',    8,  10, 'approved', 'FAC002'),
  ('STU001', 'PH101', 'Mid Term',  18, 30, 'approved', 'FAC002'),
  -- STU002 assessments
  ('STU002', 'CS101', 'Quiz 1',    6,  10, 'approved', 'FAC001'),
  ('STU002', 'CS101', 'Mid Term',  18, 30, 'approved', 'FAC001'),
  ('STU002', 'CS102', 'Lab Test 1', 15, 20, 'approved', 'FAC002'),
  ('STU002', 'MA101', 'Quiz 1',    5,  10, 'approved', 'FAC001'),
  -- STU003 assessments (fewer — some pending)
  ('STU003', 'CS101', 'Quiz 1',    7,  10, 'draft', 'FAC001'),
  ('STU003', 'CS101', 'Mid Term',  15, 30, 'draft', 'FAC001'),
  -- STU005 (ECE)
  ('STU005', 'EC101', 'Quiz 1',    9,  10, 'approved', 'FAC003'),
  ('STU005', 'EC101', 'Mid Term',  24, 30, 'approved', 'FAC003');

-- ==========================================
-- 16. SEMESTER RESULTS
-- ==========================================
INSERT INTO public.semester_results (student_uid, semester_id, sgpa, cgpa, total_credits, earned_credits, result_status, is_published, published_at) VALUES
  -- STU001 Sem 1: Published (all subjects approved)
  ('STU001', '00000000-0000-0000-0000-0000000000a1', 8.53, 8.53, 14, 14, 'Pass', true, '2026-02-28'),
  -- STU005 ECE Sem 1: Published
  ('STU005', '00000000-0000-0000-0000-0000000000a5', 8.00, 8.00, 10, 10, 'Pass', true, '2026-02-28'),
  -- STU002 Sem 1: Generated but NOT published (testing publish workflow)
  ('STU002', '00000000-0000-0000-0000-0000000000a1', 7.00, 7.00, 14, 14, 'Pass', false, NULL);

-- ==========================================
-- 17. TIMETABLE (Full week for CSE Sem 1)
-- ==========================================
INSERT INTO public.timetables (course_id, semester_id, subject_id, faculty_eid, day, start_time, end_time, room, section) VALUES
  -- Monday
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', 'FAC001', 'Monday',    '09:00', '10:00', 'CSE-101', 'A'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b3', 'FAC001', 'Monday',    '10:00', '11:00', 'CSE-101', 'A'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 'FAC002', 'Monday',    '11:30', '13:00', 'Lab-1',   NULL),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b4', 'FAC002', 'Monday',    '14:00', '15:00', 'CSE-102', NULL),
  -- Tuesday
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b4', 'FAC002', 'Tuesday',   '09:00', '10:00', 'CSE-102', NULL),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', 'FAC001', 'Tuesday',   '10:00', '11:00', 'CSE-101', 'A'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b3', 'FAC001', 'Tuesday',   '11:30', '12:30', 'CSE-101', 'A'),
  -- Wednesday
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', 'FAC001', 'Wednesday', '09:00', '10:00', 'CSE-101', 'A'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 'FAC002', 'Wednesday', '10:00', '12:00', 'Lab-1',   NULL),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b4', 'FAC002', 'Wednesday', '14:00', '15:00', 'CSE-102', NULL),
  -- Thursday
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b3', 'FAC001', 'Thursday',  '09:00', '10:00', 'CSE-101', 'A'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', 'FAC001', 'Thursday',  '10:00', '11:00', 'CSE-101', 'A'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 'FAC002', 'Thursday',  '11:30', '13:00', 'Lab-1',   NULL),
  -- Friday
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b4', 'FAC002', 'Friday',    '09:00', '10:00', 'CSE-102', NULL),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', 'FAC001', 'Friday',    '10:00', '11:00', 'CSE-101', 'A'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b3', 'FAC001', 'Friday',    '11:30', '12:30', 'CSE-101', 'A'),
  -- Saturday (light day)
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', 'FAC002', 'Saturday',  '09:00', '11:00', 'Lab-1',   NULL),

  -- ECE Timetable (Mon/Wed/Fri)
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000ba', 'FAC003', 'Monday',    '09:00', '10:00', 'ECE-201', 'A'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000bc', 'FAC003', 'Monday',    '10:00', '11:00', 'ECE-201', NULL),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000bb', 'FAC003', 'Wednesday', '09:00', '11:00', 'ECE-Lab', NULL),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000ba', 'FAC003', 'Friday',    '09:00', '10:00', 'ECE-201', 'A'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000bc', 'FAC003', 'Friday',    '10:00', '11:00', 'ECE-201', NULL);

-- ==========================================
-- 18. ASSIGNMENTS
-- ==========================================
INSERT INTO public.assignments (id, subject_id, semester_id, section, title, description, due_date, max_marks, created_by) VALUES
  ('00000000-0000-0000-0000-000000000f01', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'A', 'Linked List Implementation', 'Implement singly and doubly linked lists with insert, delete, and traversal operations in C.', '2026-03-15', 20, 'FAC001'),
  ('00000000-0000-0000-0000-000000000f02', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', NULL, 'Stack & Queue Problems', 'Solve 10 problems on stack and queue using arrays and linked lists.', '2026-03-20', 15, 'FAC001'),
  ('00000000-0000-0000-0000-000000000f03', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', NULL, 'C Programming Mini Project', 'Build a student management system using structures, files, and dynamic memory allocation.', '2026-03-25', 30, 'FAC002'),
  ('00000000-0000-0000-0000-000000000f04', '00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a1', 'A', 'Calculus Problem Set', 'Complete problems 1-20 from Chapter 5 (Integration).', '2026-03-12', 10, 'FAC001'),
  -- Past due assignment
  ('00000000-0000-0000-0000-000000000f05', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'A', 'Array Sorting Algorithms', 'Implement Bubble, Selection, and Insertion sort. Analyze time complexity.', '2026-03-05', 15, 'FAC001'),
  -- ECE assignment
  ('00000000-0000-0000-0000-000000000f06', '00000000-0000-0000-0000-0000000000ba', '00000000-0000-0000-0000-0000000000a5', 'A', 'Circuit Analysis Report', 'Analyze RC & RL circuits with theoretical and simulation results.', '2026-03-18', 20, 'FAC003');

-- ==========================================
-- 19. ASSIGNMENT SUBMISSIONS
-- ==========================================
INSERT INTO public.assignment_submissions (assignment_id, student_uid, marks_obtained, remarks, graded_by, submitted_at, graded_at) VALUES
  -- Past assignment (Array Sorting): STU001 submitted & graded, STU002 submitted not graded
  ('00000000-0000-0000-0000-000000000f05', 'STU001', 13, 'Excellent implementation with good complexity analysis.', 'FAC001', '2026-03-04 18:30:00+05:30', '2026-03-06 10:00:00+05:30'),
  ('00000000-0000-0000-0000-000000000f05', 'STU002', NULL, NULL, NULL, '2026-03-05 09:45:00+05:30', NULL),
  -- Calculus Problem Set: STU001 submitted & graded
  ('00000000-0000-0000-0000-000000000f04', 'STU001', 8, 'Good work, minor errors in Q14.', 'FAC001', '2026-03-11 20:00:00+05:30', '2026-03-12 14:00:00+05:30'),
  -- Linked List: STU001 submitted (not yet graded)
  ('00000000-0000-0000-0000-000000000f01', 'STU001', NULL, NULL, NULL, '2026-03-09 10:00:00+05:30', NULL),
  -- ECE: STU005 submitted & graded
  ('00000000-0000-0000-0000-000000000f06', 'STU005', 17, 'Very thorough analysis. Add more simulation data next time.', 'FAC003', '2026-03-08 16:00:00+05:30', '2026-03-09 09:00:00+05:30');

-- ==========================================
-- 20. LAB MARKS
-- ==========================================
INSERT INTO public.lab_marks (student_uid, subject_id, semester_id, experiment_marks, practical_marks, viva_marks, total_marks, remarks, status, recorded_by, approved_by) VALUES
  -- CS102 (C Programming Lab) — approved
  ('STU001', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', 18, 22, 8, 48, 'Excellent lab performance', 'approved', 'ASST001', 'FAC002'),
  ('STU002', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', 15, 18, 6, 39, 'Good effort', 'approved', 'ASST001', 'FAC002'),
  ('STU003', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', 12, 15, 5, 32, 'Needs improvement in debugging', 'draft', 'ASST001', NULL),
  -- EC102 (Electronics Lab) — approved
  ('STU005', '00000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-0000000000a5', 20, 20, 9, 49, 'Outstanding lab work', 'approved', 'ASST002', 'FAC003'),
  ('STU006', '00000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-0000000000a5', 16, 17, 7, 40, 'Good practical skills', 'approved', 'ASST002', 'FAC003');

-- ==========================================
-- 21. STUDENT ISSUES
-- ==========================================
INSERT INTO public.student_issues (student_uid, subject_id, reported_by, description, status, resolution) VALUES
  ('STU002', '00000000-0000-0000-0000-0000000000b1', 'ASST001', 'Student frequently misses lab sessions. Attendance below 60%.', 'open', NULL),
  ('STU003', '00000000-0000-0000-0000-0000000000b2', 'ASST001', 'Student was caught using unauthorized resources during lab test.', 'in_progress', NULL),
  ('STU001', '00000000-0000-0000-0000-0000000000b1', 'FAC001',  'Requested extra credit opportunity due to medical leave in mid-term week.', 'resolved', 'Allowed to take a makeup quiz. Score: 8/10.'),
  ('STU005', '00000000-0000-0000-0000-0000000000ba', 'ASST002', 'Student reported difficulty understanding circuit simulations.', 'closed', 'Extra tutorial sessions arranged with lab instructor.');

-- ==========================================
-- 22. NOTIFICATIONS
-- ==========================================
INSERT INTO public.notifications (recipient_uid, title, message, type, is_read, link) VALUES
  -- STU001 notifications
  ('STU001', 'Result Published',           'Your Semester 1 results have been published. Check your grades now.',        'result',     false, '/dashboard/student?tab=results'),
  ('STU001', 'Assignment Due Soon',        'Linked List Implementation is due on March 15, 2026.',                       'assignment', false, '/dashboard/student?tab=assignments'),
  ('STU001', 'Attendance Alert',           'Your Physics-I attendance is at 50%. Minimum required: 75%.',                'attendance', true,  '/dashboard/student?tab=attendance'),
  ('STU001', 'Marks Updated',             'Your Data Structures internal marks have been finalized.',                    'marks',      true,  '/dashboard/student?tab=marks'),
  ('STU001', 'Welcome to ARMS',           'Welcome to the Academic Records Management System. Explore your dashboard.', 'general',    true,  NULL),
  -- STU002 notifications
  ('STU002', 'Attendance Warning',         'Your Data Structures attendance is at 60%. Attend regularly to avoid shortage.', 'attendance', false, '/dashboard/student?tab=attendance'),
  ('STU002', 'Assignment Overdue',         'Array Sorting Algorithms assignment was due March 5. Please contact faculty.',   'assignment', false, '/dashboard/student?tab=assignments'),
  ('STU002', 'Marks Pending Approval',     'Your marks for CS101 are pending admin approval.',                               'marks',      false, NULL),
  -- STU005 (ECE)
  ('STU005', 'Result Published',           'Your Semester 1 ECE results have been published.',                            'result',     false, '/dashboard/student?tab=results'),
  ('STU005', 'Lab Marks Updated',          'Electronics Lab marks have been approved.',                                   'marks',      true,  '/dashboard/student?tab=marks');

-- ==========================================
-- 23. GRADING SCHEME
-- ==========================================
INSERT INTO public.grading_scheme (grade, min_marks, max_marks, grade_points, description, is_active) VALUES
  ('O',  90, 100, 10, 'Outstanding',       true),
  ('A+', 80,  89,  9, 'Excellent',         true),
  ('A',  70,  79,  8, 'Very Good',         true),
  ('B+', 60,  69,  7, 'Good',              true),
  ('B',  55,  59,  6, 'Above Average',     true),
  ('C',  50,  54,  5, 'Average',           true),
  ('P',  40,  49,  4, 'Pass',              true),
  ('F',   0,  39,  0, 'Fail',              true);

-- ==========================================
-- 24. SYSTEM CONFIG
-- ==========================================
INSERT INTO public.system_config (key, value, description, updated_by) VALUES
  ('institution_name',       'Secura Institute of Technology',  'Name of the institution',              'SUPER'),
  ('min_attendance_percent', '75',                              'Minimum attendance percentage required', 'SUPER'),
  ('max_semesters',          '8',                               'Maximum number of semesters allowed',    'SUPER'),
  ('result_publish_mode',    'manual',                          'auto or manual result publishing',       'SUPER'),
  ('academic_year',          '2025-26',                         'Current academic year',                  'SUPER'),
  ('grading_system',         'absolute',                        'absolute or relative grading',           'SUPER');

-- ==========================================
-- 25. PERMISSIONS (RBAC)
-- ==========================================
INSERT INTO public.permissions (id, code, name, category, description) VALUES
  ('00000000-0000-0000-0000-000000000101', 'user.create',       'Create Users',           'User Management',   'Create new user accounts'),
  ('00000000-0000-0000-0000-000000000102', 'user.read',         'View Users',             'User Management',   'View user details'),
  ('00000000-0000-0000-0000-000000000103', 'user.update',       'Update Users',           'User Management',   'Modify user accounts'),
  ('00000000-0000-0000-0000-000000000104', 'user.delete',       'Delete Users',           'User Management',   'Remove user accounts'),
  ('00000000-0000-0000-0000-000000000201', 'marks.submit',      'Submit Marks',           'Academics',         'Submit student marks'),
  ('00000000-0000-0000-0000-000000000202', 'marks.approve',     'Approve Marks',          'Academics',         'Approve submitted marks'),
  ('00000000-0000-0000-0000-000000000203', 'marks.view',        'View Marks',             'Academics',         'View student marks'),
  ('00000000-0000-0000-0000-000000000301', 'attendance.mark',   'Mark Attendance',        'Attendance',        'Mark student attendance'),
  ('00000000-0000-0000-0000-000000000302', 'attendance.view',   'View Attendance',        'Attendance',        'View attendance records'),
  ('00000000-0000-0000-0000-000000000401', 'result.generate',   'Generate Results',       'Results',           'Generate semester results'),
  ('00000000-0000-0000-0000-000000000402', 'result.publish',    'Publish Results',        'Results',           'Publish semester results'),
  ('00000000-0000-0000-0000-000000000501', 'report.view',       'View Reports',           'Analytics',         'View analytical reports'),
  ('00000000-0000-0000-0000-000000000601', 'dept.manage',       'Manage Departments',     'Administration',    'Create/edit departments'),
  ('00000000-0000-0000-0000-000000000602', 'course.manage',     'Manage Courses',         'Administration',    'Create/edit courses'),
  ('00000000-0000-0000-0000-000000000603', 'subject.manage',    'Manage Subjects',        'Administration',    'Create/edit subjects'),
  ('00000000-0000-0000-0000-000000000701', 'assignment.create', 'Create Assignments',     'Assignments',       'Create new assignments'),
  ('00000000-0000-0000-0000-000000000702', 'assignment.grade',  'Grade Assignments',      'Assignments',       'Grade student submissions'),
  ('00000000-0000-0000-0000-000000000801', 'lab.record',        'Record Lab Marks',       'Lab',               'Record lab experiment marks'),
  ('00000000-0000-0000-0000-000000000802', 'lab.approve',       'Approve Lab Marks',      'Lab',               'Approve lab marks');

-- ==========================================
-- 26. ROLE PERMISSIONS
-- ==========================================
INSERT INTO public.role_permissions (role_id, permission_id) VALUES
  -- Super Admin: ALL permissions
  (100, '00000000-0000-0000-0000-000000000101'), (100, '00000000-0000-0000-0000-000000000102'),
  (100, '00000000-0000-0000-0000-000000000103'), (100, '00000000-0000-0000-0000-000000000104'),
  (100, '00000000-0000-0000-0000-000000000201'), (100, '00000000-0000-0000-0000-000000000202'),
  (100, '00000000-0000-0000-0000-000000000203'), (100, '00000000-0000-0000-0000-000000000301'),
  (100, '00000000-0000-0000-0000-000000000302'), (100, '00000000-0000-0000-0000-000000000401'),
  (100, '00000000-0000-0000-0000-000000000402'), (100, '00000000-0000-0000-0000-000000000501'),
  (100, '00000000-0000-0000-0000-000000000601'), (100, '00000000-0000-0000-0000-000000000602'),
  (100, '00000000-0000-0000-0000-000000000603'), (100, '00000000-0000-0000-0000-000000000701'),
  (100, '00000000-0000-0000-0000-000000000702'), (100, '00000000-0000-0000-0000-000000000801'),
  (100, '00000000-0000-0000-0000-000000000802'),
  -- Academic Admin: user mgmt, marks approve, results, reports, administration
  (80, '00000000-0000-0000-0000-000000000101'), (80, '00000000-0000-0000-0000-000000000102'),
  (80, '00000000-0000-0000-0000-000000000103'), (80, '00000000-0000-0000-0000-000000000202'),
  (80, '00000000-0000-0000-0000-000000000203'), (80, '00000000-0000-0000-0000-000000000302'),
  (80, '00000000-0000-0000-0000-000000000401'), (80, '00000000-0000-0000-0000-000000000402'),
  (80, '00000000-0000-0000-0000-000000000501'), (80, '00000000-0000-0000-0000-000000000602'),
  (80, '00000000-0000-0000-0000-000000000603'),
  -- HOD: marks approve, view, attendance, reports
  (70, '00000000-0000-0000-0000-000000000102'), (70, '00000000-0000-0000-0000-000000000202'),
  (70, '00000000-0000-0000-0000-000000000203'), (70, '00000000-0000-0000-0000-000000000302'),
  (70, '00000000-0000-0000-0000-000000000501'), (70, '00000000-0000-0000-0000-000000000603'),
  -- Faculty: marks submit, view, attendance mark/view, assignments, lab approve
  (60, '00000000-0000-0000-0000-000000000201'), (60, '00000000-0000-0000-0000-000000000203'),
  (60, '00000000-0000-0000-0000-000000000301'), (60, '00000000-0000-0000-0000-000000000302'),
  (60, '00000000-0000-0000-0000-000000000701'), (60, '00000000-0000-0000-0000-000000000702'),
  (60, '00000000-0000-0000-0000-000000000802'),
  -- Asst Faculty: attendance mark, view, assignments, lab record
  (50, '00000000-0000-0000-0000-000000000301'), (50, '00000000-0000-0000-0000-000000000302'),
  (50, '00000000-0000-0000-0000-000000000701'), (50, '00000000-0000-0000-0000-000000000702'),
  (50, '00000000-0000-0000-0000-000000000801'),
  -- Student: view marks, view attendance
  (10, '00000000-0000-0000-0000-000000000203'), (10, '00000000-0000-0000-0000-000000000302');

-- ==========================================
-- 27. AUDIT LOGS (sample actions)
-- ==========================================
INSERT INTO public.audit_logs (performed_by, action, entity_type, entity_id, old_values, new_values) VALUES
  ('SUPER',   'CREATE_DEPARTMENT', 'departments', 'CSE',    NULL, '{"name":"Computer Science Engineering","code":"CSE"}'::jsonb),
  ('SUPER',   'CREATE_DEPARTMENT', 'departments', 'ECE',    NULL, '{"name":"Electronics & Communication","code":"ECE"}'::jsonb),
  ('ADMIN01', 'CREATE_USER',       'users',       'STU001', NULL, '{"uid_eid":"STU001","role_level":10}'::jsonb),
  ('ADMIN01', 'CREATE_USER',       'users',       'STU002', NULL, '{"uid_eid":"STU002","role_level":10}'::jsonb),
  ('FAC001',  'SUBMIT_MARKS',      'marks_submissions', 'STU001-CS101', NULL, '{"student":"STU001","subject":"CS101","total":88,"grade":"A+"}'::jsonb),
  ('HOD001',  'APPROVE_MARKS',     'marks_submissions', 'STU001-CS101', '{"status":"pending_hod"}'::jsonb, '{"status":"pending_admin"}'::jsonb),
  ('ADMIN01', 'APPROVE_MARKS',     'marks_submissions', 'STU001-CS101', '{"status":"pending_admin"}'::jsonb, '{"status":"approved"}'::jsonb),
  ('ADMIN01', 'PUBLISH_RESULT',    'semester_results',  'STU001-SEM1',  '{"is_published":false}'::jsonb, '{"is_published":true}'::jsonb),
  ('FAC001',  'MARK_ATTENDANCE',   'attendance',        'CS101-2026-03-09', NULL, '{"date":"2026-03-09","count":4}'::jsonb),
  ('ASST001', 'RECORD_LAB_MARKS',  'lab_marks',         'STU001-CS102', NULL, '{"total":48,"status":"approved"}'::jsonb);

-- ==========================================
-- SEED COMPLETE
-- ==========================================
-- 
-- LOGIN CREDENTIALS (all password: password123):
-- ┌──────────┬───────────────────────┬───────┬──────────────────────┐
-- │ UID/EID  │ Name                  │ Level │ Role                 │
-- ├──────────┼───────────────────────┼───────┼──────────────────────┤
-- │ SUPER    │ System Controller     │  100  │ Super Admin          │
-- │ ADMIN01  │ Dr. Sarah Connor      │   80  │ Academic Admin       │
-- │ HOD001   │ Dr. James Smith       │   70  │ HOD (CSE)            │
-- │ HOD002   │ Dr. Meera Reddy       │   70  │ HOD (ECE)            │
-- │ FAC001   │ Prof. Robert Martin   │   60  │ Faculty (CSE)        │
-- │ FAC002   │ Prof. Ananya Iyer     │   60  │ Faculty (CSE)        │
-- │ FAC003   │ Prof. Vikram Das      │   60  │ Faculty (ECE)        │
-- │ ASST001  │ Ravi Sharma           │   50  │ Asst Faculty (CSE)   │
-- │ ASST002  │ Priya Nair            │   50  │ Asst Faculty (ECE)   │
-- │ STU001   │ Aman Verma            │   10  │ Student (CSE Sem 1)  │
-- │ STU002   │ Sneha Gupta           │   10  │ Student (CSE Sem 1)  │
-- │ STU003   │ Rohan Patel           │   10  │ Student (CSE Sem 1)  │
-- │ STU004   │ Priyanka Singh        │   10  │ Student (CSE Sem 1)  │
-- │ STU005   │ Karan Mehta           │   10  │ Student (ECE Sem 1)  │
-- │ STU006   │ Divya Joshi           │   10  │ Student (ECE Sem 1)  │
-- └──────────┴───────────────────────┴───────┴──────────────────────┘
--
-- WORKFLOW TEST SCENARIOS:
-- ─────────────────────────────────────────────────────────
-- 1. MARKS WORKFLOW: 
--    STU004 CS101 = draft → FAC001 submits → HOD001 approves → ADMIN01 approves
--    STU003 CS101 = pending_hod → HOD001 can approve/reject
--    STU002 CS101 = pending_admin → ADMIN01 can approve/reject
--    STU001 CS101 = approved (complete)
--
-- 2. ATTENDANCE:
--    FAC001 login → Subjects tab → CS101 → Mark attendance for today
--    STU001 login → Attendance tab → see subject-wise stats + warnings
--
-- 3. RESULTS:
--    STU001 has published Sem 1 result (SGPA 8.53)
--    STU002 has unpublished result → ADMIN01 can publish
--    STU003/STU004 don't have results yet
--
-- 4. ASSIGNMENTS:
--    STU001: 1 overdue submitted & graded, 1 submitted not graded, 1 pending
--    STU002: 1 overdue submitted not graded, rest pending
--    STU003/STU004: all pending or overdue
--
-- 5. LAB MARKS:
--    ASST001 recorded, FAC002 approved for STU001/STU002
--    STU003 lab marks in draft (ASST001 can edit, FAC002 can approve)
--
-- 6. NOTIFICATIONS:
--    STU001: 5 notifications (2 unread, 3 read)
--    STU002: 3 notifications (all unread)
--
-- 7. CROSS-DEPARTMENT:
--    CSE: HOD001, FAC001, FAC002, ASST001, STU001-STU004
--    ECE: HOD002, FAC003, ASST002, STU005-STU006
-- ─────────────────────────────────────────────────────────
