-- ==========================================
-- ARMS V5.5 - FINAL TEST SEED (MATCHES GUIDE)
-- ==========================================

-- CLEANUP
TRUNCATE public.audit_logs, public.timetables, public.semester_results,
         public.marks_submissions, public.academic_records, public.internal_assessments,
         public.attendance, public.subject_allocations, public.qualifications,
         public.employees, public.students, public.user_roles,
         public.roles, public.subjects, public.semesters,
         public.courses, public.departments, public.users
CASCADE;

-- 1. ROLES
INSERT INTO public.roles (id, name, level) VALUES
(10,'Student',10), (50,'Assistant Faculty',50), (60,'Faculty',60), 
(70,'HOD',70), (80,'Academic Admin',80), (100,'Super Admin',100)
ON CONFLICT (id) DO NOTHING;

-- 2. INSTITUTIONAL CORE (Hex UUIDs)
INSERT INTO public.departments (id, name, code) VALUES
('00000000-0000-0000-0000-0000000000d1', 'Computer Science Engineering', 'CSE');

INSERT INTO public.courses (id, dept_id, name, code, duration_years) VALUES
('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', 'B.Tech CSE', 'BTECH-CSE', 4);

INSERT INTO public.semesters (id, course_id, semester_number) VALUES
('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 1);

INSERT INTO public.subjects (id, course_id, semester_id, subject_code, name, credits, subject_type) VALUES
('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'CS101', 'Data Structures', 4, 'Theory');

-- 3. USERS (Password: 'password123' - length 11 for Zod)
INSERT INTO public.users (id, uid_eid, password_hash, role_level, department_id) VALUES
('00000000-0000-0000-0000-000000000001', 'STU001', 'password123', 10, '00000000-0000-0000-0000-0000000000d1'),
('00000000-0000-0000-0000-000000000006', 'FAC001', 'password123', 60, '00000000-0000-0000-0000-0000000000d1'),
('00000000-0000-0000-0000-000000000007', 'HOD001', 'password123', 70, '00000000-0000-0000-0000-0000000000d1'),
('00000000-0000-0000-0000-000000000008', 'ADMIN01', 'password123', 80, '00000000-0000-0000-0000-0000000000d1'),
('00000000-0000-0000-0000-000000000009', 'SUPER', 'password123', 100, NULL);

-- 4. PROFILES
INSERT INTO public.employees (eid, name, email, designation, department_id) VALUES
('SUPER', 'System Controller', 'super@rkade.in', 'System Admin', NULL),
('ADMIN01', 'Sarah Connor', 'sarah@rkade.in', 'Registrar', '00000000-0000-0000-0000-0000000000d1'),
('HOD001', 'Dr. James Smith', 'james@rkade.in', 'HOD', '00000000-0000-0000-0000-0000000000d1'),
('FAC001', 'Prof. Robert Martin', 'bob@rkade.in', 'Professor', '00000000-0000-0000-0000-0000000000d1');

INSERT INTO public.students (uid, name, email, department_id, course_id, current_semester_id, roll_number, admission_year) VALUES
('STU001', 'Aman Verma', 'aman@rkade.in', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '24CSE01', 2024);

-- 5. ACADEMIC DATA
INSERT INTO public.attendance (student_uid, subject_id, date, status, marked_by) VALUES
('STU001', '00000000-0000-0000-0000-0000000000b1', CURRENT_DATE, 'Present', 'FAC001');

INSERT INTO public.marks_submissions (student_uid, subject_id, semester_id, internal_marks, external_marks, total_marks, grade, status, submitted_by) VALUES
('STU001', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 28, 62, 90, 'O', 'approved', 'FAC001');

INSERT INTO public.semester_results (student_uid, semester_id, sgpa, result_status, is_published) VALUES
('STU001', '00000000-0000-0000-0000-0000000000a1', 9.0, 'Pass', true);
