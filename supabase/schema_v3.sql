-- ==========================================
-- ACADEMIC RECORD MANAGEMENT SYSTEM (ARMS)
-- SCHEMA V3.0 - INSTITUTIONAL HIERARCHY
-- ==========================================

-- 1. Institutional Entities
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
  is_locked BOOLEAN DEFAULT false, -- For result locking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL,
  UNIQUE(course_id, semester_number)
);

-- 2. User & Profile Enhancements
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role_level INT DEFAULT 10, -- 10: Student, 60: Faculty, 70: HOD, 80: Acad Admin, 100: Super Admin
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id);

ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id),
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id);

ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id);

-- 3. Marks Workflow & Type Expansion
-- status: draft, pending_hod, pending_admin, approved
ALTER TABLE public.internal_assessments
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_hod', 'pending_admin', 'approved'));

ALTER TABLE public.academic_records
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_hod', 'pending_admin', 'approved')),
ADD COLUMN IF NOT EXISTS subject_code TEXT REFERENCES public.subjects(subject_code),
ADD COLUMN IF NOT EXISTS external_marks NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS internal_total NUMERIC DEFAULT 0;

-- 4. Audit Logging
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  performed_by TEXT NOT NULL, -- uid_eid
  action TEXT NOT NULL,       -- 'UPDATE_MARK', 'CREATE_USER', etc.
  entity_type TEXT NOT NULL,  -- 'internal_assessments', 'students', etc.
  entity_id TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- 5. RLS & Permissions v3
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Super Admin Policy (Level 100)
CREATE POLICY "Super Admin Full Access" ON public.departments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role_level = 100)
);

-- Institutional Visibility (Level 70+)
CREATE POLICY "Admin/HOD View Departments" ON public.departments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role_level >= 70)
);

-- HOD Isolation (Level 70)
-- Example: HOD can only manage their department's courses
CREATE POLICY "HOD Manage Own Courses" ON public.courses FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role_level = 70 AND department_id = public.courses.dept_id)
);

-- Audit Logs Policy
CREATE POLICY "Admin View Logs" ON public.audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role_level >= 80)
);
