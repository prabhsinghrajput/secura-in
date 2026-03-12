-- ==========================================
-- ASSISTANT FACULTY MODULE EXTENSIONS (V7)
-- New tables: assignments, assignment_submissions, lab_marks, student_issues
-- ==========================================

-- 1. Assignments (created by faculty / assistant faculty)
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  section TEXT,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  max_marks NUMERIC NOT NULL DEFAULT 10,
  created_by TEXT NOT NULL REFERENCES public.employees(eid),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- 2. Assignment Submissions (student submissions, graded by assistant faculty)
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_uid TEXT NOT NULL REFERENCES public.students(uid) ON DELETE CASCADE,
  marks_obtained NUMERIC,
  remarks TEXT,
  graded_by TEXT REFERENCES public.employees(eid),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL,
  graded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(assignment_id, student_uid)
);

-- 3. Lab Marks (draft marks recorded by assistant faculty, reviewed by main faculty)
CREATE TABLE IF NOT EXISTS public.lab_marks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_uid TEXT NOT NULL REFERENCES public.students(uid) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  experiment_marks NUMERIC DEFAULT 0,
  practical_marks NUMERIC DEFAULT 0,
  viva_marks NUMERIC DEFAULT 0,
  total_marks NUMERIC DEFAULT 0,
  remarks TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
  recorded_by TEXT NOT NULL REFERENCES public.employees(eid),
  approved_by TEXT REFERENCES public.employees(eid),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL,
  UNIQUE(student_uid, subject_id)
);

-- 4. Student Issues (support tickets logged by assistant faculty)
CREATE TABLE IF NOT EXISTS public.student_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_uid TEXT NOT NULL REFERENCES public.students(uid) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  reported_by TEXT NOT NULL REFERENCES public.employees(eid),
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  resolution TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_issues ENABLE ROW LEVEL SECURITY;
