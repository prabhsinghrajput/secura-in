-- ==========================================
-- ARMS SCHEMA V5 – SUPER ADMIN EXTENSIONS
-- ==========================================

-- Extend roles table with governance columns
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS is_system_role BOOLEAN DEFAULT false;
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS department_restricted BOOLEAN DEFAULT false;
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now());

-- Permissions catalogue
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- Role ↔ Permission mapping
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id INT REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Grading scheme (institution-wide)
CREATE TABLE IF NOT EXISTS public.grading_scheme (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grade TEXT NOT NULL,
  min_marks NUMERIC NOT NULL,
  max_marks NUMERIC NOT NULL,
  grade_points NUMERIC NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- System configuration (key-value)
CREATE TABLE IF NOT EXISTS public.system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_by TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_scheme ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- SEED DATA
-- ==========================================

-- Default roles (upsert)
INSERT INTO public.roles (id, name, level, code, description, is_system_role, department_restricted, is_active) VALUES
  (1, 'Super Admin',      100, 'SUPER_ADMIN',  'Full system access across all departments',             true, false, true),
  (2, 'Academic Admin',    80, 'ACAD_ADMIN',   'Manages academic operations institution-wide',           true, false, true),
  (3, 'HOD',               70, 'HOD',          'Head of Department – department-level control',          true, true,  true),
  (4, 'Faculty',           60, 'FACULTY',      'Professor – subject-level teaching and evaluation',      true, true,  true),
  (5, 'Assistant Faculty',  50, 'ASST_FACULTY', 'Limited academic responsibilities',                     true, true,  true),
  (6, 'Student',           10, 'STUDENT',      'View-only access to personal academic data',             true, true,  true)
ON CONFLICT (name) DO UPDATE SET
  level               = EXCLUDED.level,
  code                = EXCLUDED.code,
  description         = EXCLUDED.description,
  is_system_role      = EXCLUDED.is_system_role,
  department_restricted = EXCLUDED.department_restricted,
  is_active           = EXCLUDED.is_active;

-- Permission catalogue
INSERT INTO public.permissions (code, name, category) VALUES
  -- Student Management
  ('create_student',        'Create Student',              'Student Management'),
  ('edit_student',          'Edit Student',                'Student Management'),
  ('delete_student',        'Delete Student',              'Student Management'),
  ('view_student',          'View Student',                'Student Management'),
  ('bulk_upload_students',  'Bulk Upload Students',        'Student Management'),
  -- Faculty Management
  ('create_faculty',        'Create Faculty',              'Faculty Management'),
  ('edit_faculty',          'Edit Faculty',                'Faculty Management'),
  ('delete_faculty',        'Delete Faculty',              'Faculty Management'),
  ('view_faculty',          'View Faculty',                'Faculty Management'),
  ('assign_subject',        'Assign Subject to Faculty',   'Faculty Management'),
  -- Academic Control
  ('create_course',         'Create Course',               'Academic Control'),
  ('edit_course',           'Edit Course',                 'Academic Control'),
  ('delete_course',         'Delete Course',               'Academic Control'),
  ('create_subject',        'Create Subject',              'Academic Control'),
  ('edit_subject',          'Edit Subject',                'Academic Control'),
  ('delete_subject',        'Delete Subject',              'Academic Control'),
  ('create_semester',       'Create Semester',             'Academic Control'),
  ('edit_semester',         'Edit Semester',               'Academic Control'),
  ('approve_marks',         'Approve Marks',               'Academic Control'),
  ('lock_results',          'Lock Results',                'Academic Control'),
  ('publish_results',       'Publish Results',             'Academic Control'),
  ('manage_timetable',      'Manage Timetable',            'Academic Control'),
  ('manage_attendance',     'Manage Attendance',           'Academic Control'),
  -- Reports
  ('view_department_reports','View Department Reports',    'Reports'),
  ('view_global_reports',   'View Global Reports',         'Reports'),
  ('export_data',           'Export Data',                 'Reports'),
  -- System
  ('manage_roles',          'Manage Roles',                'System'),
  ('manage_permissions',    'Manage Permissions',          'System'),
  ('manage_departments',    'Manage Departments',          'System'),
  ('manage_config',         'Manage System Config',        'System'),
  ('view_audit_logs',       'View Audit Logs',             'System'),
  ('manage_locks',          'Manage Locks',                'System')
ON CONFLICT (code) DO NOTHING;

-- Default grading scheme
INSERT INTO public.grading_scheme (grade, min_marks, max_marks, grade_points, description) VALUES
  ('O',  90, 100, 10, 'Outstanding'),
  ('A+', 80,  89,  9, 'Excellent'),
  ('A',  70,  79,  8, 'Very Good'),
  ('B+', 60,  69,  7, 'Good'),
  ('B',  50,  59,  6, 'Above Average'),
  ('C',  45,  49,  5, 'Average'),
  ('P',  40,  44,  4, 'Pass'),
  ('F',   0,  39,  0, 'Fail')
ON CONFLICT DO NOTHING;

-- Default system configuration
INSERT INTO public.system_config (key, value, description) VALUES
  ('attendance_threshold',          '75',    'Minimum attendance percentage required'),
  ('default_grading_scheme',        'standard', 'Default grading scheme identifier'),
  ('result_publication_enabled',    'true',  'Whether result publication is enabled'),
  ('max_internal_marks',            '30',    'Default maximum internal marks'),
  ('max_external_marks',            '70',    'Default maximum external marks'),
  ('passing_marks_percentage',      '40',    'Minimum passing percentage'),
  ('allow_marks_edit_after_submit', 'false', 'Allow faculty to edit marks after submission'),
  ('attendance_edit_window_hours',  '24',    'Hours within which attendance can be edited')
ON CONFLICT (key) DO NOTHING;
