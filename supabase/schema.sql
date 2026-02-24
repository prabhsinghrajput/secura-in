-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create Users table (Core Auth)
create table public.users (
  id uuid primary key default uuid_generate_v4(),
  uid_eid text unique not null,
  role text not null check (role in ('student', 'faculty', 'admin')),
  password_hash text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Students table
create table public.students (
  uid text primary key references public.users(uid_eid) on delete cascade,
  name text not null,
  department text not null,
  year int not null,
  email text unique not null
);

-- 3. Create Employees table (Faculty & Admin)
create table public.employees (
  eid text primary key references public.users(uid_eid) on delete cascade,
  name text not null,
  designation text not null,
  department text not null,
  email text unique not null
);

-- 4. Create Academic_Records table
create table public.academic_records (
  record_id uuid primary key default uuid_generate_v4(),
  uid text not null references public.students(uid) on delete cascade,
  subject text not null,
  semester int not null,
  marks int not null,
  grade text not null,
  updated_by text references public.employees(eid),
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies (Simplified for modularity, can be tightened later)
alter table public.users enable row level security;
alter table public.students enable row level security;
alter table public.employees enable row level security;
alter table public.academic_records enable row level security;

-- Admin can do everything
create policy "Admins have full access on users" on public.users for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- Students can view their own details
create policy "Students can view their own record" on public.students for select using (
  uid = (select uid_eid from public.users where id = auth.uid())
);

-- Academic Records visibility
create policy "Students can view their own academic records" on public.academic_records for select using (
  uid = (select uid_eid from public.users where id = auth.uid())
);

create policy "Faculty can view/update all academic records" on public.academic_records for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'faculty')
);

-- ==========================================
-- SEED DATA (Run this to create first Admin)
-- ID: admin01
-- Password: admin123
-- ==========================================

INSERT INTO public.users (uid_eid, role, password_hash)
VALUES ('admin01', 'admin', '$2b$10$RISkyHLWGG2GaHckoMvbs.uayewTtcKV6qLbfgFF7GYF9OoBJN5fY');

INSERT INTO public.employees (eid, name, designation, department, email)
VALUES ('admin01', 'System Administrator', 'Admin', 'IT Department', 'admin@rkade.in');
