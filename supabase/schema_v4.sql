-- ==========================================
-- ACADEMIC RECORD MANAGEMENT SYSTEM (ARMS)
-- SCHEMA V4.5 - ENTERPRISE EDITION (FINAL)
-- ==========================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Institutional Hierarchy
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dept_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  duration_years INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.semesters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  semester_number INT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL,
  UNIQUE(course_id, semester_number)
);

CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  semester_id UUID REFERENCES public.semesters(id) ON DELETE CASCADE,
  subject_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  credits INT NOT NULL,
  subject_type TEXT CHECK (subject_type IN ('Theory', 'Practical', 'Project', 'Elective')),
  max_internal NUMERIC DEFAULT 30,
  max_external NUMERIC DEFAULT 70,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- 2. User & Authentication
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid_eid TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role_level INT DEFAULT 10,
  department_id UUID REFERENCES public.departments(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.roles (
  id INT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  level INT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role_id INT REFERENCES public.roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- Profile Tables
CREATE TABLE IF NOT EXISTS public.students (
  uid TEXT PRIMARY KEY REFERENCES public.users(uid_eid) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  department_id UUID REFERENCES public.departments(id),
  course_id UUID REFERENCES public.courses(id),
  current_semester_id UUID REFERENCES public.semesters(id),
  roll_number TEXT UNIQUE,
  enrollment_number TEXT UNIQUE,
  dob DATE,
  blood_group TEXT,
  admission_year INT,
  address TEXT,
  contact_number TEXT,
  guardian_name TEXT,
  guardian_contact TEXT,
  mentor_eid TEXT,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.employees (
  eid TEXT PRIMARY KEY REFERENCES public.users(uid_eid) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  designation TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id),
  qualification TEXT,
  dob DATE,
  contact_number TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true
);

-- 3. Academic Operations
CREATE TABLE IF NOT EXISTS public.subject_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  faculty_eid TEXT REFERENCES public.employees(eid) ON DELETE CASCADE,
  semester_id UUID REFERENCES public.semesters(id) ON DELETE CASCADE,
  section TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL,
  UNIQUE(subject_id, faculty_eid, section)
);

CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_uid TEXT REFERENCES public.students(uid) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Present', 'Absent', 'Leave', 'Late')),
  marked_by TEXT REFERENCES public.employees(eid),
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL,
  UNIQUE(student_uid, subject_id, date)
);

-- Modern Marks Workflow
CREATE TABLE IF NOT EXISTS public.marks_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_uid TEXT REFERENCES public.students(uid) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  semester_id UUID REFERENCES public.semesters(id) ON DELETE CASCADE,
  internal_marks NUMERIC DEFAULT 0,
  mid_term_marks NUMERIC DEFAULT 0,
  practical_marks NUMERIC DEFAULT 0,
  external_marks NUMERIC DEFAULT 0,
  total_marks NUMERIC DEFAULT 0,
  grade TEXT,
  points NUMERIC,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_hod', 'pending_admin', 'approved', 'locked')),
  submitted_by TEXT REFERENCES public.employees(eid),
  approved_by_hod TEXT REFERENCES public.employees(eid),
  approved_by_admin TEXT REFERENCES public.employees(eid),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL,
  UNIQUE(student_uid, subject_id)
);

-- Legacy Support Tables (Compatibility)
CREATE TABLE IF NOT EXISTS public.academic_records (
  record_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid TEXT REFERENCES public.students(uid) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  subject_code TEXT REFERENCES public.subjects(subject_code),
  grade TEXT,
  marks NUMERIC,
  semester INT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.internal_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid TEXT REFERENCES public.students(uid) ON DELETE CASCADE,
  subject_code TEXT REFERENCES public.subjects(subject_code),
  assessment_type TEXT NOT NULL,
  marks_obtained NUMERIC NOT NULL,
  max_marks NUMERIC NOT NULL,
  status TEXT DEFAULT 'draft',
  evaluated_by TEXT REFERENCES public.employees(eid),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.qualifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid TEXT REFERENCES public.students(uid) ON DELETE CASCADE,
  institution TEXT NOT NULL,
  degree TEXT NOT NULL,
  percentage_cgpa NUMERIC NOT NULL,
  year_of_passing INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Results & Schedules
CREATE TABLE IF NOT EXISTS public.semester_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_uid TEXT REFERENCES public.students(uid) ON DELETE CASCADE,
  semester_id UUID REFERENCES public.semesters(id) ON DELETE CASCADE,
  sgpa NUMERIC,
  cgpa NUMERIC,
  total_credits INT,
  earned_credits INT,
  result_status TEXT CHECK (result_status IN ('Pass', 'Fail', 'Backlog', 'Withheld')),
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL,
  UNIQUE(student_uid, semester_id)
);

CREATE TABLE IF NOT EXISTS public.timetables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  semester_id UUID REFERENCES public.semesters(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  faculty_eid TEXT REFERENCES public.employees(eid) ON DELETE CASCADE,
  day TEXT NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT NOT NULL,
  section TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- 5. Logging
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  performed_by TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- 6. RLS Setup
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marks_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semester_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Base Policies (Authenticated Read)
CREATE POLICY "Auth read depts" ON public.departments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth read courses" ON public.courses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth read semesters" ON public.semesters FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth read subjects" ON public.subjects FOR SELECT USING (auth.role() = 'authenticated');

-- Admin Policy (Level 80+)
CREATE POLICY "Admin All Access" ON public.users FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role_level >= 80));
-- ... similar policies for other tables would be defined here ...
