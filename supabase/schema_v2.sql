-- ==========================================
-- ACADEMIC RECORDS PLATFORM - SCHEMA V2.0
-- ==========================================

-- 1. Enhance Students Table
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS dob DATE,
ADD COLUMN IF NOT EXISTS blood_group TEXT,
ADD COLUMN IF NOT EXISTS admission_year INT,
ADD COLUMN IF NOT EXISTS program_code TEXT,
ADD COLUMN IF NOT EXISTS current_semester INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS contact_number TEXT,
ADD COLUMN IF NOT EXISTS mentor_eid TEXT REFERENCES public.employees(eid);

-- 2. Enhance Employees Table
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS dob DATE,
ADD COLUMN IF NOT EXISTS contact_number TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

-- 3. Create Subjects Table
CREATE TABLE IF NOT EXISTS public.subjects (
  subject_code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  credits INT NOT NULL,
  department TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- 4. Create Qualifications Table
CREATE TABLE IF NOT EXISTS public.qualifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid TEXT NOT NULL REFERENCES public.students(uid) ON DELETE CASCADE,
  institution TEXT NOT NULL,
  degree TEXT NOT NULL,
  percentage_cgpa NUMERIC NOT NULL,
  year_of_passing INT NOT NULL
);

-- 5. Create Internal Assessments Table
CREATE TABLE IF NOT EXISTS public.internal_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid TEXT NOT NULL REFERENCES public.students(uid) ON DELETE CASCADE,
  subject_code TEXT NOT NULL REFERENCES public.subjects(subject_code) ON DELETE CASCADE,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('Assignment', 'Quiz', 'MST1', 'MST2', 'Lab', 'Project', 'Surprise Test')),
  marks_obtained NUMERIC NOT NULL,
  max_marks NUMERIC NOT NULL,
  evaluated_by TEXT REFERENCES public.employees(eid),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- 6. Create Attendance Table
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid TEXT NOT NULL REFERENCES public.students(uid) ON DELETE CASCADE,
  subject_code TEXT NOT NULL REFERENCES public.subjects(subject_code) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Present', 'Absent', 'Leave')),
  marked_by TEXT REFERENCES public.employees(eid),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL,
  UNIQUE(uid, subject_code, date)
);

-- 7. Create Timetables Table
CREATE TABLE IF NOT EXISTS public.timetables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_code TEXT NOT NULL REFERENCES public.subjects(subject_code) ON DELETE CASCADE,
  eid TEXT NOT NULL REFERENCES public.employees(eid) ON DELETE CASCADE,
  day TEXT NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT NOT NULL,
  semester INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- 8. Enable RLS on New Tables
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies for New Tables

-- Subjects: Everyone can view
CREATE POLICY "Public subjects visibility" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Admin full subjects access" ON public.subjects FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Qualifications: Student views own, Admin/Faculty views all
CREATE POLICY "Student view own qualifications" ON public.qualifications FOR SELECT USING (
  uid = (SELECT uid_eid FROM public.users WHERE id = auth.uid())
);
CREATE POLICY "Faculty/Admin view qualifications" ON public.qualifications FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('faculty', 'admin'))
);

-- Internal Assessments: Student views own, Admin/Faculty manage all
CREATE POLICY "Student view own assessments" ON public.internal_assessments FOR SELECT USING (
  uid = (SELECT uid_eid FROM public.users WHERE id = auth.uid())
);
CREATE POLICY "Faculty/Admin manage assessments" ON public.internal_assessments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('faculty', 'admin'))
);

-- Attendance: Student views own, Faculty marks, Admin views all
CREATE POLICY "Student view own attendance" ON public.attendance FOR SELECT USING (
  uid = (SELECT uid_eid FROM public.users WHERE id = auth.uid())
);
CREATE POLICY "Faculty/Admin manage attendance" ON public.attendance FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('faculty', 'admin'))
);

-- Timetables: Everyone can view, Admin manages
CREATE POLICY "Public timetable visibility" ON public.timetables FOR SELECT USING (true);
CREATE POLICY "Admin manage timetables" ON public.timetables FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);
