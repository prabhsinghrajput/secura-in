-- ==========================================
-- ARMS v3.0 - INSTITUTIONAL SEED SCRIPT
-- ==========================================

-- 0. Cleanup (To avoid duplicate key errors)
-- Ensure V3 columns exist before seeding
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role_level INT DEFAULT 10, ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true, ADD COLUMN IF NOT EXISTS department_id UUID;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS department_id UUID, ADD COLUMN IF NOT EXISTS course_id UUID, ADD COLUMN IF NOT EXISTS current_semester INT DEFAULT 1;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS department_id UUID;
ALTER TABLE public.internal_assessments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_hod', 'pending_admin', 'approved'));
ALTER TABLE public.academic_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_hod', 'pending_admin', 'approved'));
ALTER TABLE public.academic_records ADD COLUMN IF NOT EXISTS subject_code TEXT REFERENCES public.subjects(subject_code);
ALTER TABLE public.academic_records ADD COLUMN IF NOT EXISTS external_marks NUMERIC DEFAULT 0;
ALTER TABLE public.academic_records ADD COLUMN IF NOT EXISTS internal_total NUMERIC DEFAULT 0;

TRUNCATE public.audit_logs, public.timetables, public.qualifications, 
         public.academic_records, public.internal_assessments, 
         public.attendance, public.semesters, public.courses, 
         public.subjects, public.departments, public.students, 
         public.employees, public.users 
CASCADE;

-- 1. Departments
INSERT INTO public.departments (name, code) VALUES
('Computer Science', 'CSE'),
('Electronics Engineering', 'ECE'),
('Mechanical Engineering', 'ME'),
('Mathematics', 'MATH'),
('Physics', 'PHYS');

-- 2. Courses (Linked to Departments)
INSERT INTO public.courses (dept_id, name, code, duration_years)
SELECT id, 'B.Tech Computer Science', 'BTECH-CSE', 4 FROM public.departments WHERE code = 'CSE'
UNION ALL
SELECT id, 'B.Tech Electronics', 'BTECH-ECE', 4 FROM public.departments WHERE code = 'ECE'
UNION ALL
SELECT id, 'B.Tech Mechanical', 'BTECH-ME', 4 FROM public.departments WHERE code = 'ME'
UNION ALL
SELECT id, 'B.Sc Mathematics', 'BSC-MATH', 3 FROM public.departments WHERE code = 'MATH'
UNION ALL
SELECT id, 'B.Sc Physics', 'BSC-PHYS', 3 FROM public.departments WHERE code = 'PHYS';

-- 3. Semesters
INSERT INTO public.semesters (course_id, semester_number)
SELECT id, 1 FROM public.courses
UNION ALL
SELECT id, 2 FROM public.courses;

-- 4. Users (Hierarchy Setup)
-- Passwords are hashed versions of 'password123' (Legacy/Test consistency)
INSERT INTO public.users (uid_eid, role, role_level, password_hash, department_id)
SELECT 'SUPER_ADMIN_01', 'admin', 100, 'password123', NULL
UNION ALL
SELECT 'ACAD_ADMIN_01', 'admin', 80, 'password123', (SELECT id FROM public.departments WHERE code='CSE')
UNION ALL
SELECT 'HOD_CSE_01', 'faculty', 70, 'password123', (SELECT id FROM public.departments WHERE code='CSE')
UNION ALL
SELECT 'FACULTY_CSE_01', 'faculty', 60, 'password123', (SELECT id FROM public.departments WHERE code='CSE')
UNION ALL
SELECT 'STUDENT_CSE_01', 'student', 10, 'password123', (SELECT id FROM public.departments WHERE code='CSE');

-- 5. Employees
INSERT INTO public.employees (eid, name, designation, department, department_id, email)
SELECT 'SUPER_ADMIN_01', 'Super Administrator', 'System Owner', 'Administration', NULL, 'super@arms.edu'
UNION ALL
SELECT 'ACAD_ADMIN_01', 'Dr. Alice Carter', 'Academic Registrar', 'Registrar Office', (SELECT id FROM public.departments WHERE code='CSE'), 'alice@arms.edu'
UNION ALL
SELECT 'HOD_CSE_01', 'Dr. Bob Smith', 'Head of Department', 'Computer Science', (SELECT id FROM public.departments WHERE code='CSE'), 'bob@arms.edu'
UNION ALL
SELECT 'FACULTY_CSE_01', 'Prof. Charlie Day', 'Assistant Professor', 'Computer Science', (SELECT id FROM public.departments WHERE code='CSE'), 'charlie@arms.edu';

-- 6. Students
INSERT INTO public.students (uid, name, department, department_id, course_id, year, email, current_semester)
SELECT 'STUDENT_CSE_01', 'John Doe', 'Computer Science', 
(SELECT id FROM public.departments WHERE code='CSE'), 
(SELECT id FROM public.courses WHERE code='BTECH-CSE'), 
1, 'john@student.edu', 1;

-- 7. Subjects
INSERT INTO public.subjects (subject_code, name, credits, department) VALUES
('CS101', 'Introduction to Programming', 4, 'Computer Science'),
('EC101', 'Basic Electronics', 4, 'Electronics Engineering'),
('MA101', 'Calculus I', 4, 'Mathematics'),
('PH101', 'Engineering Physics', 4, 'Physics'),
('CS102', 'Data Structures', 4, 'Computer Science');

-- 8. Attendance
INSERT INTO public.attendance (uid, subject_code, date, status, marked_by) VALUES
('STUDENT_CSE_01', 'CS101', CURRENT_DATE, 'Present', 'FACULTY_CSE_01'),
('STUDENT_CSE_01', 'MA101', CURRENT_DATE, 'Present', 'FACULTY_CSE_01'),
('STUDENT_CSE_01', 'CS101', CURRENT_DATE - INTERVAL '1 day', 'Absent', 'FACULTY_CSE_01'),
('STUDENT_CSE_01', 'PH101', CURRENT_DATE - INTERVAL '1 day', 'Present', 'FACULTY_CSE_01'),
('STUDENT_CSE_01', 'CS102', CURRENT_DATE, 'Present', 'FACULTY_CSE_01');

-- 9. Internal Assessments (Workflow: Draft/Pending)
INSERT INTO public.internal_assessments (uid, subject_code, assessment_type, marks_obtained, max_marks, status, evaluated_by) VALUES
('STUDENT_CSE_01', 'CS101', 'MST1', 85, 100, 'approved', 'FACULTY_CSE_01'),
('STUDENT_CSE_01', 'MA101', 'Quiz', 18, 20, 'pending_hod', 'FACULTY_CSE_01'),
('STUDENT_CSE_01', 'CS102', 'Assignment', 45, 50, 'draft', 'FACULTY_CSE_01'),
('STUDENT_CSE_01', 'PH101', 'MST1', 72, 100, 'pending_admin', 'FACULTY_CSE_01'),
('STUDENT_CSE_01', 'EC101', 'Quiz', 15, 20, 'approved', 'FACULTY_CSE_01');

-- 10. Academic Records (Final Workflow)
INSERT INTO public.academic_records (uid, subject, grade, marks, semester, status, subject_code) VALUES
('STUDENT_CSE_01', 'Introduction to Programming', 'O', 92, 1, 'approved', 'CS101'),
('STUDENT_CSE_01', 'Calculus I', 'A+', 88, 1, 'pending_admin', 'MA101'),
('STUDENT_CSE_01', 'Basic Electronics', 'A', 82, 1, 'pending_hod', 'EC101'),
('STUDENT_CSE_01', 'Engineering Physics', 'B+', 76, 1, 'draft', 'PH101'),
('STUDENT_CSE_01', 'Value Education', 'P', 50, 1, 'approved', 'CS102');

-- 11. Qualifications
INSERT INTO public.qualifications (uid, institution, degree, percentage_cgpa, year_of_passing) VALUES
('STUDENT_CSE_01', 'Global High School', 'Class XII', 94.5, 2024),
('STUDENT_CSE_01', 'Central School', 'Class X', 96.2, 2022);

-- 12. Timetables
INSERT INTO public.timetables (subject_code, eid, day, start_time, end_time, room, semester) VALUES
('CS101', 'FACULTY_CSE_01', 'Monday', '09:00:00', '10:00:00', 'Room 303', 1),
('MA101', 'FACULTY_CSE_01', 'Monday', '10:00:00', '11:00:00', 'Room 101', 1),
('PH101', 'FACULTY_CSE_01', 'Tuesday', '11:00:00', '12:00:00', 'Lab 1', 1),
('CS102', 'HOD_CSE_01', 'Wednesday', '09:00:00', '11:00:00', 'Room 303', 2),
('EC101', 'FACULTY_CSE_01', 'Thursday', '14:00:00', '15:00:00', 'Lab 2', 1);

-- 13. Audit Logs
INSERT INTO public.audit_logs (performed_by, action, entity_type, entity_id, new_values) VALUES
('SUPER_ADMIN_01', 'CREATE_DEPARTMENTS', 'departments', 'ALL', '{"count": 5}'),
('ACAD_ADMIN_01', 'BULK_UPLOAD_STUDENTS', 'students', 'BATCH_01', '{"count": 1}'),
('FACULTY_CSE_01', 'SUBMIT_MARKS', 'academic_records', 'STUDENT_CSE_01', '{"status": "pending_hod"}'),
('HOD_CSE_01', 'RECOMMEND_MARKS', 'academic_records', 'STUDENT_CSE_01', '{"status": "pending_admin"}'),
('SUPER_ADMIN_01', 'SYSTEM_INIT', 'system', 'GLOBAL', '{"version": "3.0"}');
