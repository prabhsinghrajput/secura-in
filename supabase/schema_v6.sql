-- ==========================================
-- ARMS SCHEMA V6 – ACADEMIC ADMIN EXTENSIONS
-- ==========================================

-- Extend students table with section & demographic fields
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS section TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('Male', 'Female', 'Other'));
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('General', 'SC', 'ST', 'OBC', 'EWS'));
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Sections catalogue (defines available sections per semester)
CREATE TABLE IF NOT EXISTS public.sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INT DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL,
  UNIQUE(semester_id, name)
);

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

-- Add rejection_reason to marks_submissions for reject-with-comment flow
ALTER TABLE public.marks_submissions ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add external_marks to academic_records for unified result view
ALTER TABLE public.academic_records ADD COLUMN IF NOT EXISTS external_marks NUMERIC DEFAULT 0;
ALTER TABLE public.academic_records ADD COLUMN IF NOT EXISTS internal_total NUMERIC DEFAULT 0;
