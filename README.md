# ARMS — Academic Records Management System

## Complete Project Documentation

> **Version:** 1.0.0  
> **Platform:** Secura Institute of Technology  
> **Copyright:** © 2026 RKADE Academic Records Platform  
> **Last Updated:** March 12, 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Project Structure](#4-project-structure)
5. [Database Schema](#5-database-schema)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Role Hierarchy & Access Control](#7-role-hierarchy--access-control)
8. [Dashboard Modules](#8-dashboard-modules)
   - 8.1 [Super Admin (L100)](#81-super-admin-dashboard-level-100)
   - 8.2 [Academic Admin (L80)](#82-academic-admin-dashboard-level-80)
   - 8.3 [HOD (L70)](#83-hod-dashboard-level-70)
   - 8.4 [Faculty (L60)](#84-faculty-dashboard-level-60)
   - 8.5 [Assistant Faculty (L50)](#85-assistant-faculty-dashboard-level-50)
   - 8.6 [Student (L10)](#86-student-dashboard-level-10)
9. [Server Actions Reference](#9-server-actions-reference)
10. [Marks Approval Workflow](#10-marks-approval-workflow)
11. [Schema Evolution](#11-schema-evolution)
12. [UI Components](#12-ui-components)
13. [Environment Setup](#13-environment-setup)
14. [Seed Data & Testing](#14-seed-data--testing)
15. [Key Architectural Patterns](#15-key-architectural-patterns)
16. [API Reference](#16-api-reference)

---

## 1. Project Overview

ARMS (Academic Records Management System) is a **secure, cloud-based, role-hierarchical** academic records platform built for educational institutions. It provides a unified system for managing students, faculty, attendance, marks, results, timetables, assignments, lab evaluations, and administrative operations.

### Key Features

| Feature | Description |
|---------|-------------|
| **6-Level Role Hierarchy** | Student → Assistant Faculty → Faculty → HOD → Academic Admin → Super Admin |
| **Marks Approval Pipeline** | Draft → HOD Review → Admin Approval → Locked (4-stage workflow) |
| **Department Isolation** | HOD/Faculty see only their department's data |
| **Real-time Dashboards** | Role-specific dashboards with analytics and charts |
| **Audit Trail** | Every administrative action is logged with before/after values |
| **Attendance Management** | Mark, edit (24hr window), analytics, shortage alerts |
| **Result Generation** | SGPA/CGPA calculation, grading scheme, bulk generation |
| **Lab & Assignment Modules** | Full lifecycle from creation to grading |
| **Notification System** | Type-based notifications for students |
| **Multi-Department Support** | Cross-department administration for admins |

### Project Metrics

| Metric | Value |
|--------|-------|
| Total Source Files | ~30 |
| Total Lines of Code | ~9,500+ |
| Database Tables | 28 |
| Server Actions | 95+ |
| TypeScript Interfaces | 28 |
| Schema Versions | 8 (V1 → V8) |
| Dashboard Pages | 6 |

---

## 2. Tech Stack

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.1.6 | Full-stack React framework (App Router) |
| **React** | 19.2.3 | UI library |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 4.x | Utility-first CSS framework |

### Backend & Data

| Technology | Version | Purpose |
|------------|---------|---------|
| **Supabase** | 2.97.0 | PostgreSQL database + auth (via JS client) |
| **NextAuth.js** | 4.24.13 | Authentication (Credentials Provider, JWT) |
| **bcryptjs** | 3.0.3 | Password hashing utility (available, not active in auth flow) |

### UI & Forms

| Technology | Version | Purpose |
|------------|---------|---------|
| **Lucide React** | 0.575.0 | Icon library |
| **React Hook Form** | 7.71.2 | Form state management |
| **Zod** | 4.3.6 | Schema validation |
| **@hookform/resolvers** | 5.2.2 | Zod ↔ React Hook Form bridge |
| **Recharts** | 3.7.0 | Charts and data visualization |
| **clsx + tailwind-merge** | 2.1.1 / 3.5.0 | Conditional class merging |

### Dev Tools

| Technology | Version | Purpose |
|------------|---------|---------|
| **ESLint** | 9.x | Code linting |
| **@tailwindcss/postcss** | 4.x | PostCSS integration |
| **Turbopack** | Built-in | Fast development bundler |

---

## 3. Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│  ┌─────────────┐ ┌──────────────┐ ┌───────────────────────────┐ │
│  │  Login Page  │ │ Landing Page │ │   6 Role-Based Dashboards │ │
│  │  (Zod + RHF) │ │   (Public)   │ │  (Client Components)     │ │
│  └──────┬───────┘ └──────────────┘ └──────────┬────────────────┘ │
│         │                                      │                  │
│         │  signIn('credentials')               │  Server Actions  │
│         ▼                                      ▼                  │
├──────────────────────────────────────────────────────────────────┤
│                    NEXT.JS APP ROUTER                             │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐  │
│  │  NextAuth API     │  │  actions.ts (95+ server actions)     │  │
│  │  /api/auth/[...]  │  │  'use server' — validateAccess()     │  │
│  │  JWT Strategy     │  │  Department scoping for L<80         │  │
│  └────────┬─────────┘  └─────────────┬────────────────────────┘  │
│           │                           │                           │
│  ┌────────┴───────────────────────────┴────────────────────────┐ │
│  │              middleware.ts (Route Guards)                     │ │
│  │  Checks JWT token → role_level → redirects unauthorized      │ │
│  └──────────────────────────┬──────────────────────────────────┘ │
├─────────────────────────────┼────────────────────────────────────┤
│                             ▼                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    SUPABASE (PostgreSQL)                      │ │
│  │  28 Tables │ RLS Policies │ Service Role Key (bypasses RLS)  │ │
│  │  supabaseAdmin client for all server actions                 │ │
│  └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow Pattern

```
User Action → React State → Server Action Call → validateAccess(level)
  → Supabase Query (via supabaseAdmin) → Response → Update State → Re-render
```

### Request Lifecycle

1. **User navigates** to `/dashboard/*`
2. **Middleware** checks JWT token and `role_level`
3. **Dashboard page** loads (client component), calls `useSession()`
4. **`useEffect`** triggers data fetch via server actions
5. **Server action** validates access level, queries Supabase
6. **Data returned** to client, React state updated, UI re-renders

---

## 4. Project Structure

```
secura-in/
├── eslint.config.mjs           # ESLint flat config
├── next.config.ts              # Next.js configuration
├── next-env.d.ts               # Next.js TypeScript declarations
├── package.json                # Dependencies & scripts
├── postcss.config.mjs          # PostCSS + Tailwind
├── README.md                   # Project readme
├── tsconfig.json               # TypeScript config (paths: @/* → ./src/*)
├── fix-admin.js                # Admin fix utility script
├── test-db.js                  # Database connection test script
│
├── public/                     # Static assets
│
├── src/
│   ├── middleware.ts            # Route protection (role-level based)
│   │
│   ├── app/
│   │   ├── globals.css          # Tailwind imports + CSS custom properties
│   │   ├── layout.tsx           # Root layout (Geist fonts + Providers)
│   │   ├── page.tsx             # Landing page (public)
│   │   │
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts # NextAuth API route handler
│   │   │
│   │   ├── auth/
│   │   │   └── login/
│   │   │       └── page.tsx     # Login page (Zod + React Hook Form)
│   │   │
│   │   └── dashboard/
│   │       ├── admin/
│   │       │   └── page.tsx     # Super Admin dashboard (1,160 lines)
│   │       ├── academic-admin/  # [Note: renders at /dashboard/academic-admin]
│   │       │   └── page.tsx     # Academic Admin dashboard
│   │       ├── hod/
│   │       │   └── page.tsx     # HOD dashboard (662 lines)
│   │       ├── faculty/
│   │       │   └── page.tsx     # Faculty dashboard (979 lines)
│   │       ├── assistant-faculty/
│   │       │   └── page.tsx     # Assistant Faculty dashboard (1,012 lines)
│   │       └── student/
│   │           └── page.tsx     # Student dashboard (1,033 lines)
│   │
│   ├── components/
│   │   ├── DashboardLayout.tsx  # Sidebar navigation (role-aware, 101 lines)
│   │   ├── Providers.tsx        # NextAuth SessionProvider wrapper
│   │   └── ui/
│   │       ├── Button.tsx       # Reusable button (variants + loading)
│   │       ├── Card.tsx         # Card, CardHeader, CardContent, CardFooter
│   │       └── Input.tsx        # Form input with label + error display
│   │
│   ├── lib/
│   │   ├── actions.ts           # ALL server actions (2,695 lines, 95+ functions)
│   │   ├── auth.ts              # NextAuth configuration (76 lines)
│   │   ├── password.ts          # bcrypt hash/compare utilities (10 lines)
│   │   ├── supabase.ts          # Supabase client initialization (12 lines)
│   │   └── utils.ts             # cn() class merge utility (6 lines)
│   │
│   └── types/
│       ├── index.ts             # All TypeScript interfaces (338 lines, 28 types)
│       └── next-auth.d.ts       # NextAuth type augmentation (23 lines)
│
└── supabase/
    ├── schema.sql               # V1: Initial tables
    ├── schema_v2.sql            # V2: Students, subjects, attendance
    ├── schema_v3.sql            # V3: Departments, courses, semesters
    ├── schema_v4.sql            # V4: Complete enterprise schema (28 tables)
    ├── schema_v5.sql            # V5: RBAC + grading + system config
    ├── schema_v6.sql            # V6: Sections + student extensions
    ├── schema_v7.sql            # V7: Assignments, lab marks, issues
    ├── schema_v8.sql            # V8: Notifications
    ├── seed_data_v3.sql         # Legacy seed data
    ├── seed_data_v4.sql         # Minimal seed data
    └── seed_complete.sql        # Complete seed data (all tables, all roles)
```

---

## 5. Database Schema

### Complete Table Reference (28 Tables)

#### Core Institutional Tables

| Table | Primary Key | Description | Key Columns |
|-------|-------------|-------------|-------------|
| `departments` | `id` (UUID) | Academic departments | name, code |
| `courses` | `id` (UUID) | Degree programs | dept_id → departments, name, code, duration_years |
| `semesters` | `id` (UUID) | Academic semesters | course_id → courses, semester_number, is_active, is_locked |
| `subjects` | `id` (UUID) | Course subjects | course_id, semester_id, subject_code, name, credits, subject_type (Theory/Practical/Project/Elective), max_internal, max_external |
| `sections` | `id` (UUID) | Class sections | semester_id → semesters, name, capacity |

#### User & Identity Tables

| Table | Primary Key | Description | Key Columns |
|-------|-------------|-------------|-------------|
| `users` | `id` (UUID) | Authentication accounts | uid_eid (unique), password_hash, role_level, department_id, is_active |
| `roles` | `id` (INT) | Role definitions | name, level, code, description, is_system_role, department_restricted, is_active |
| `user_roles` | (user_id, role_id) | Many-to-many user ↔ role | user_id → users, role_id → roles |
| `students` | `uid` (TEXT) | Student profiles | name, email, department_id, course_id, current_semester_id, roll_number, enrollment_number, dob, blood_group, admission_year, section, gender, category, mentor_eid |
| `employees` | `eid` (TEXT) | Faculty/Staff profiles | name, email, designation, department_id, qualification, dob, contact_number |

#### Academic Operations Tables

| Table | Primary Key | Description | Key Columns |
|-------|-------------|-------------|-------------|
| `subject_allocations` | `id` (UUID) | Faculty ↔ Subject assignments | subject_id, faculty_eid, semester_id, section |
| `attendance` | `id` (UUID) | Daily attendance | student_uid, subject_id, date, status (Present/Absent/Leave/Late), marked_by, remarks |
| `marks_submissions` | `id` (UUID) | Marks with approval workflow | student_uid, subject_id, semester_id, internal/mid_term/practical/external/total_marks, grade, points, status, submitted_by, approved_by_hod, approved_by_admin, rejection_reason |
| `internal_assessments` | `id` (UUID) | Quiz/test scores | uid, subject_code, assessment_type, marks_obtained, max_marks, status, evaluated_by |
| `semester_results` | `id` (UUID) | Semester GPA results | student_uid, semester_id, sgpa, cgpa, total_credits, earned_credits, result_status (Pass/Fail/Backlog/Withheld), is_published |
| `academic_records` | `record_id` (UUID) | Legacy academic records | uid, subject, subject_code, grade, marks, external_marks, internal_total, semester, status |
| `qualifications` | `id` (UUID) | Prior education | uid, institution, degree, percentage_cgpa, year_of_passing |
| `timetables` | `id` (UUID) | Class schedules | course_id, semester_id, subject_id, faculty_eid, day, start_time, end_time, room, section |

#### Assignment & Lab Tables

| Table | Primary Key | Description | Key Columns |
|-------|-------------|-------------|-------------|
| `assignments` | `id` (UUID) | Assignment definitions | subject_id, semester_id, section, title, description, due_date, max_marks, created_by |
| `assignment_submissions` | `id` (UUID) | Student submissions | assignment_id, student_uid, marks_obtained, remarks, graded_by, submitted_at, graded_at |
| `lab_marks` | `id` (UUID) | Lab evaluation scores | student_uid, subject_id, semester_id, experiment/practical/viva/total_marks, status (draft/approved), recorded_by, approved_by |
| `student_issues` | `id` (UUID) | Issue tracker | student_uid, subject_id, reported_by, description, status (open/in_progress/resolved/closed), resolution |

#### System & Admin Tables

| Table | Primary Key | Description | Key Columns |
|-------|-------------|-------------|-------------|
| `permissions` | `id` (UUID) | RBAC permissions | code, name, category, description |
| `role_permissions` | (role_id, permission_id) | Role ↔ Permission mapping | role_id → roles, permission_id → permissions |
| `grading_scheme` | `id` (UUID) | Grade definitions | grade, min_marks, max_marks, grade_points, description, is_active |
| `system_config` | `id` (UUID) | Key-value settings | key (unique), value, description, updated_by |
| `notifications` | `id` (UUID) | Student notifications | recipient_uid, title, message, type (attendance/marks/result/assignment/general), is_read, link |
| `audit_logs` | `id` (UUID) | Action audit trail | performed_by, action, entity_type, entity_id, old_values (JSONB), new_values (JSONB), ip_address |

### Entity Relationship Diagram

```
departments ─┬─→ courses ─┬─→ semesters ─┬─→ subjects
             │             │               ├─→ sections
             │             │               └─→ semester_results
             ├─→ users ────┤
             │             ├─→ students ──┬─→ attendance
             │             │              ├─→ marks_submissions
             │             │              ├─→ qualifications
             │             │              ├─→ internal_assessments
             │             │              ├─→ assignment_submissions
             │             │              ├─→ lab_marks
             │             │              ├─→ student_issues
             │             │              └─→ notifications
             │             │
             │             └─→ employees ─┬─→ subject_allocations
             │                            ├─→ timetables
             │                            └─→ assignments
             │
             └─→ roles ───→ user_roles
                       └──→ role_permissions ←── permissions

grading_scheme (standalone)
system_config (standalone)
audit_logs (standalone)
```

### Key Constraints & Indexes

| Constraint | Table | Rule |
|------------|-------|------|
| Unique | `users` | `uid_eid` |
| Unique | `semesters` | `(course_id, semester_number)` |
| Unique | `attendance` | `(student_uid, subject_id, date)` |
| Unique | `marks_submissions` | `(student_uid, subject_id)` |
| Unique | `semester_results` | `(student_uid, semester_id)` |
| Unique | `subject_allocations` | `(subject_id, faculty_eid, section)` |
| Unique | `assignment_submissions` | `(assignment_id, student_uid)` |
| Unique | `lab_marks` | `(student_uid, subject_id)` |
| Unique | `sections` | `(semester_id, name)` |
| Unique | `system_config` | `key` |
| Index | `notifications` | `idx_notifications_recipient`, `idx_notifications_read` |

---

## 6. Authentication & Authorization

### Authentication Flow

```
Login Page ──→ signIn('credentials', { uid_eid, password })
    │
    ▼
NextAuth Credentials Provider (auth.ts)
    │
    ├── Query: users WHERE uid_eid (case-insensitive) with user_roles + roles
    ├── Password Validation: plaintext comparison (password === password_hash)
    ├── Effective Level: max(user.role_level, ...user_roles.roles.level)
    │
    ▼
JWT Token Created
    ├── id, uid_eid, role_level, department_id
    └── role: admin (≥80) | hod (≥70) | faculty (≥50) | student (<50)
    │
    ▼
Session Available via useSession()
    └── user: { id, uid_eid, role_level, department_id, role }
```

### Middleware Route Protection

| Route Pattern | Required Level | Redirect |
|---------------|----------------|----------|
| `/dashboard/admin/*` | ≥ 100 | `/auth/login` |
| `/dashboard/academic-admin/*` | ≥ 80 | `/auth/login` |
| `/dashboard/hod/*` | ≥ 70 | `/auth/login` |
| `/dashboard/faculty/*` | ≥ 60 | `/auth/login` |
| `/dashboard/assistant-faculty/*` | ≥ 50 | `/auth/login` |
| `/dashboard/student/*` | ≥ 10 | `/auth/login` |

**Matcher:** `/dashboard/:path*` — only dashboard routes are protected.

### Server-Side Access Control

Every server action calls `validateAccess(requiredLevel)` which:

1. Gets the current session via `getServerSession(authOptions)`
2. Checks `session.user.role_level >= requiredLevel`
3. For levels < 80: returns `department_id` for data scoping
4. Returns `{ uid_eid, department_id }` on success
5. Throws error on failure

```typescript
// Example: Only L70+ can access
const { uid_eid, department_id } = await validateAccess(70);
// department_id is set for L70, null for L80+
```

### Post-Login Redirect Logic

| Condition | Destination |
|-----------|-------------|
| `role_level >= 100` | `/dashboard/admin` |
| `role_level >= 80` | `/dashboard/academic-admin` |
| `role_level >= 70` OR `role === 'hod'` | `/dashboard/hod` |
| `role_level >= 50` OR `role === 'faculty'` | `/dashboard/faculty` |
| `role_level === 10` OR `role === 'student'` | `/dashboard/student` |

---

## 7. Role Hierarchy & Access Control

### Role Levels & Capabilities Matrix

```
Level 100 ── Super Admin ────── Full system control
  │
Level 80 ─── Academic Admin ─── Cross-department academic management
  │
Level 70 ─── HOD ──────────────── Department-scoped oversight
  │
Level 60 ─── Faculty ──────────── Teaching & marks management
  │
Level 50 ─── Assistant Faculty ── Lab/attendance assistance (draft-only marks)
  │
Level 10 ─── Student ──────────── Read-only academic data
```

### Detailed Permission Matrix

| Capability | L100 | L80 | L70 | L60 | L50 | L10 |
|------------|:----:|:---:|:---:|:---:|:---:|:---:|
| **System Config** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Manage Roles/Permissions** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Grading Scheme** | ✅ | 👁️ | ❌ | ❌ | ❌ | ❌ |
| **Create Departments** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Create Courses** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Lock/Unlock Semesters** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Create Users** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Bulk Upload Students** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Promote Students** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Manage Sections** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Approve Marks (Admin)** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Publish Results** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Generate Results** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Approve Marks (HOD)** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Reject Marks** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Allocate Subjects** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **View Dept Analytics** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Submit Marks** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Save Marks (Draft + Submit)** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Edit Attendance (24hr)** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Performance Analytics** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Mark Attendance** | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Create Assignments** | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Grade Assignments** | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Record Lab Marks (Draft)** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Report Student Issues** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **View Own Data** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Submit Assignments** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **View Notifications** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Audit Logs** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

### Department Scoping Rules

- **L100 (Super Admin):** No department restriction — sees all data
- **L80 (Academic Admin):** No department restriction — manages all departments
- **L70 (HOD):** Restricted to own `department_id` — sees only department's students, faculty, subjects
- **L60 (Faculty):** Restricted to assigned subjects via `subject_allocations`
- **L50 (Assistant Faculty):** Restricted to assigned subjects via `subject_allocations`
- **L10 (Student):** Restricted to own data — `uid_eid` matched to student profile

---

## 8. Dashboard Modules

### 8.1 Super Admin Dashboard (Level 100)

**Route:** `/dashboard/admin`  
**Accent Color:** Red (`red-600`)  
**File:** `src/app/dashboard/admin/page.tsx` (1,160 lines)

#### Tabs

| # | Tab | Icon | Description |
|---|-----|------|-------------|
| 1 | **Dashboard** | `LayoutDashboard` | Global statistics overview |
| 2 | **Roles** | `Shield` | Role & permission management |
| 3 | **Departments** | `Building2` | Department CRUD |
| 4 | **Academic** | `BookOpen` | Courses, semesters, subjects |
| 5 | **Users** | `Users` | User management & bulk upload |
| 6 | **Grading** | `Award` | Grading scheme configuration |
| 7 | **Config** | `Settings` | System settings (key-value) |
| 8 | **Audit** | `Activity` | Audit log viewer & semester controls |

#### Tab Details

**Dashboard Tab:**
- 6 stat cards: Total Departments, Courses, Faculty, Students, Active Semesters, Pending Marks
- Quick action buttons: Create Department, Add User, View Audit Logs
- Recent audit log table (10 latest entries)

**Roles Tab:**
- Roles list table with name, code, level, description, system badge
- Create/Edit role form: name, code, level, description, is_system_role, department_restricted
- Permissions matrix: grouped by category, toggle checkboxes per permission per role
- Cannot modify system role levels or create roles at level ≥ 100

**Departments Tab:**
- Department cards with code, name, created date
- Create/Edit form: name, code
- Delete with safety check (blocks if active students/faculty exist)

**Academic Tab:**
- Sub-tabs: Courses | Semesters | Subjects
- **Courses:** CRUD with dept selection, name, code, duration
- **Semesters:** CRUD with course selection, number, active/locked toggles
- **Subjects:** CRUD with course, semester, code, name, credits, type, max marks

**Users Tab:**
- Searchable, filterable user table (by role level)
- Create user form — role-aware:
  - Student: UID, name, email, department, course, semester, roll number, enrollment, DOB, blood group, admission year, guardian info
  - Employee: EID, name, email, designation, department, qualification, DOB, contact
- Bulk JSON upload for students
- Password reset (default: Welcome@123)
- Toggle active/inactive
- User role assignment panel

**Grading Tab:**
- Grading scheme table: grade letter, min marks, max marks, grade points, description
- CRUD operations with validation

**Config Tab:**
- Key-value editor for system settings
- Settings include: institution_name, academic_year, min_attendance_percent, max_semesters, etc.

**Audit Tab:**
- Filterable audit log table: filter by user, module, date range
- CSV export for audit data
- Semester controls: Lock/Unlock semester, Lock/Unlock marks, Publish/Unpublish results

---

### 8.2 Academic Admin Dashboard (Level 80)

**Route:** `/dashboard/academic-admin`  
**Accent Color:** Orange (`orange-600`)  
**File:** `src/app/dashboard/academic-admin/page.tsx`

#### Tabs

| # | Tab | Icon | Description |
|---|-----|------|-------------|
| 1 | **Overview** | `BarChart3` | Academic statistics |
| 2 | **Students** | `GraduationCap` | Student management |
| 3 | **Marks** | `ClipboardCheck` | Marks approval (final stage) |
| 4 | **Results** | `Award` | Result generation & publishing |
| 5 | **Subjects** | `BookOpen` | Subject management |
| 6 | **Reports** | `FileText` | Faculty workload & analytics |

#### Tab Details

**Overview Tab:**
- 5 stat cards: Active Students, Active Faculty, Active Semesters, Pending Approvals, Unpublished Results
- Quick action buttons

**Students Tab:**
- Searchable student table with semester/course/section filters
- Student detail view with edit capability
- Bulk section assignment
- Student promotion (move to next semester)
- Export capabilities

**Marks Tab:**
- Pending marks queue (status: `pending_admin`)
- Select individual or bulk select-all
- Approve or reject with reason
- View marks details per student per subject

**Results Tab:**
- Semester/course selector
- Generate results (single student or bulk by course/semester)
- SGPA calculation using grading scheme
- Publish/unpublish results
- Pass/fail statistics with top performers and fail lists

**Subjects Tab:**
- Subject list with CRUD
- Associated course and semester info

**Reports Tab:**
- Faculty workload report: subjects, sections, credits per faculty
- Audit log viewer

---

### 8.3 HOD Dashboard (Level 70)

**Route:** `/dashboard/hod`  
**Accent Color:** Indigo (`indigo-600`)  
**File:** `src/app/dashboard/hod/page.tsx` (662 lines)

#### Tabs

| # | Tab | Icon | Description |
|---|-----|------|-------------|
| 1 | **Overview** | `BarChart3` | Department statistics |
| 2 | **Students** | `GraduationCap` | Department students |
| 3 | **Faculty** | `Briefcase` | Faculty & subject allocations |
| 4 | **Marks** | `ClipboardCheck` | Marks approval (HOD stage) |
| 5 | **Attendance** | `Calendar` | Department attendance |
| 6 | **Analytics** | `TrendingUp` | Department result analytics |

#### Tab Details

**Overview Tab:**
- 5 stat cards: Dept Students, Dept Faculty, Dept Subjects, Pending Marks (with badge count), Active Semesters
- Quick action buttons: Approve Marks, View Faculty, Attendance Report
- Recent audit activity

**Students Tab:**
- Department-scoped student table
- Search by name/UID/roll number
- CSV export

**Faculty Tab:**
- Faculty cards showing assigned subjects
- Subject allocation form: select faculty → subject → semester → section
- View current allocations

**Marks Tab:**
- Queue of `pending_hod` marks submissions
- Select individual or bulk
- **Recommend to Admin** (→ `pending_admin`)
- **Reject** with reason (→ `draft`)
- Badge shows pending count

**Attendance Tab:**
- Department attendance summary by semester
- Per-student attendance percentage
- Shortage alerts (< 75%)

**Analytics Tab:**
- Department results: total students, pass count, fail count
- Average SGPA, top SGPA
- Semester filter

---

### 8.4 Faculty Dashboard (Level 60)

**Route:** `/dashboard/faculty`  
**Accent Color:** Emerald (`emerald-600`)  
**File:** `src/app/dashboard/faculty/page.tsx` (979 lines)

#### Tabs

| # | Tab | Icon | Description |
|---|-----|------|-------------|
| 1 | **Overview** | `Activity` | Teaching overview |
| 2 | **Subjects** | `BookOpen` | Assigned subjects |
| 3 | **Attendance** | `CheckCircle2` | Mark & manage attendance |
| 4 | **Marks** | `ClipboardList` | Enter & submit marks |
| 5 | **Analytics** | `BarChart2` | Performance analytics |
| 6 | **Schedule** | `Calendar` | Timetable view |

#### Tab Details

**Overview Tab:**
- 4 stat cards: Assigned Subjects, Total Students, Attendance Marked, Pending Marks
- Submission pipeline: draft → pending_hod → approved counts
- Quick access buttons
- Active classes list with student counts

**Subjects Tab:**
- Subject cards grid showing: code, name, credits, semester, section, student count
- Per-subject action buttons: go to Attendance, Marks, or Analytics

**Attendance Tab:**
- **Mark Mode:** Date picker, subject/class selector, bulk "Mark All Present/Absent", per-student toggle (Present/Absent/Late/Leave) with remarks
- **History Mode:** Date-filtered attendance records, edit status within 24-hour window
- **Analytics Mode:** Per-student attendance percentage for selected subject

**Marks Tab:**
- Subject selector
- Per-student marks entry table: Internal (max configurable), Mid-term, Practical marks
- Auto-calculated total
- **Save as Draft** (status: `draft`)
- **Submit for Approval** (status: `pending_hod`)
- Status badges per student
- Student search within marks table

**Analytics Tab:**
- Per-subject performance stats:
  - Class average, highest, lowest marks
  - Marks distribution histogram
  - Student-level breakdown table

**Schedule Tab:**
- Weekly timetable grid
- Shows subject, room, time slots

---

### 8.5 Assistant Faculty Dashboard (Level 50)

**Route:** `/dashboard/assistant-faculty`  
**Accent Color:** Teal (`teal-600`)  
**File:** `src/app/dashboard/assistant-faculty/page.tsx` (1,012 lines)

#### Tabs

| # | Tab | Icon | Description |
|---|-----|------|-------------|
| 1 | **Overview** | `Activity` | Assistant overview |
| 2 | **Subjects** | `BookOpen` | Assigned subjects |
| 3 | **Attendance** | `CheckCircle2` | Mark attendance |
| 4 | **Assignments** | `FileText` | Create & grade assignments |
| 5 | **Lab Marks** | `Beaker` | Record lab evaluations |
| 6 | **Issues** | `MessageSquare` | Student issue tracker |
| 7 | **Analytics** | `BarChart2` | Attendance analytics |

#### Tab Details

**Overview Tab:**
- 5 stat cards: Assigned Subjects, Total Students, Assignments Created, Attendance Sessions, Open Issues
- Quick action buttons
- Subject list with main faculty name

**Subjects Tab:**
- Subject cards with: code, name, semester, section, student count, credits, active status
- Links to related operations

**Attendance Tab:**
- Same Mark/History interface as Faculty
- Can mark attendance for assigned subjects
- **Cannot edit past attendance** (L50 restriction — only L60+ can edit)

**Assignments Tab:**
- **Create:** Form with title, description, due date, max marks, subject selection
- **List:** Assignment cards with submission count/total, grade button
- **Grade:** Student list with marks input, remarks, validate against max marks

**Lab Marks Tab:**
- Subject selector
- Per-student lab marks entry:
  - Experiment marks
  - Practical marks
  - Viva marks
  - Auto-calculated total
- **Save as Draft only** — L50 cannot approve
- Shows approval status if faculty has approved

**Issues Tab:**
- **Create:** Student selector, subject selector, description
- **List:** Issue cards with status badges (open/in_progress/resolved/closed)
- **Update:** Change status, add resolution text
- Only shows issues reported by this assistant

**Analytics Tab:**
- Attendance summary per assigned subject
- Total records, present count, attendance percentage

#### L50 Restrictions

| Action | Faculty (L60) | Asst Faculty (L50) |
|--------|:---:|:---:|
| Mark attendance | ✅ | ✅ |
| Edit past attendance | ✅ (24hr) | ❌ |
| Save marks as draft | ✅ | ✅ |
| Submit marks for approval | ✅ | ❌ |
| Approve lab marks | ✅ | ❌ |
| Create assignments | ✅ | ✅ |
| Grade assignments | ✅ | ✅ |
| Report student issues | ❌ | ✅ |
| Record lab marks | ❌ | ✅ |

---

### 8.6 Student Dashboard (Level 10)

**Route:** `/dashboard/student`  
**Accent Color:** Indigo (`indigo-600`)  
**File:** `src/app/dashboard/student/page.tsx` (1,033 lines)

#### Tabs

| # | Tab | Icon | Description |
|---|-----|------|-------------|
| 1 | **Overview** | `Activity` | Academic snapshot |
| 2 | **Profile** | `User` | Personal information |
| 3 | **Attendance** | `CheckCircle2` | Attendance records |
| 4 | **Marks** | `BarChart2` | Internal & lab marks |
| 5 | **Results** | `Award` | Semester results |
| 6 | **Assignments** | `ClipboardList` | Assignments & submissions |
| 7 | **Timetable** | `Calendar` | Weekly schedule |
| 8 | **Notifications** | `BellRing` | Alerts & updates |

#### Tab Details

**Overview Tab:**
- 5 stat cards: Course, Semester, Attendance %, Pending Tasks, Latest SGPA
- Attendance warnings for subjects below 75%
- Quick action buttons
- Today's lecture schedule
- GPA overview card: CGPA + semester-wise SGPA grid

**Profile Tab:**
- Profile card: photo placeholder, UID, email, department, course, semester, roll number, enrollment number, DOB, blood group, admission year, section, gender, category
- Editable fields: phone number, address (self-update only)
- Qualifications list: institution, degree, percentage, year

**Attendance Tab:**
- Per-subject attendance stats with progress bars (color-coded: red < 75%, yellow < 85%, green ≥ 85%)
- Overall attendance percentage
- Date-filtered attendance log table
- CSV export

**Marks Tab:**
- Approved marks table: subject, internal, mid-term, practical, total marks
- Lab marks table: subject, experiment, practical, viva, total
- Internal assessment details: quiz/test scores

**Results Tab:**
- Published semester results only
- Per-subject breakdown: subject name, credits, marks, grade
- SGPA/CGPA display
- Print button for result card

**Assignments Tab:**
- Assignment list with status badges:
  - **Pending** — not yet submitted
  - **Submitted** — awaiting grading
  - **Evaluated** — graded with marks
  - **Overdue** — past due date, not submitted
- Submit with optional comments
- Shows due date, max marks, obtained marks

**Timetable Tab:**
- Weekly grid: Monday through Saturday
- Each slot: subject name, faculty name, room, time

**Notifications Tab:**
- Notification list with type-based icons:
  - 📊 Attendance | 📝 Marks | 🏆 Result | 📋 Assignment | 📢 General
- Mark individual as read
- Mark all as read
- Unread badge count on tab

---

## 9. Server Actions Reference

### Complete Function Catalog

All server actions are defined in `src/lib/actions.ts` (2,695 lines). Every function uses the `'use server'` directive.

#### Access Control & Utility Functions

| Function | Access | Description |
|----------|--------|-------------|
| `validateAccess(requiredLevel)` | Internal | Validates session and role level; returns `{ uid_eid, department_id }` |
| `logAuditEventAction(data)` | Any | Inserts audit log entry with action, entity, old/new values |

#### Super Admin Actions (L100)

| Function | Description |
|----------|-------------|
| `getGlobalStatsAction()` | Counts: departments, courses, faculty, students, active semesters, pending |
| `getRolesAction()` | All roles with user counts |
| `createRoleAction(data)` | Create role (blocks ≥100) |
| `updateRoleAction(id, data)` | Update role (blocks system role level changes) |
| `deleteRoleAction(id)` | Delete role (blocks if users assigned) |
| `getPermissionsAction()` | All permissions by category |
| `getRolePermissionsAction(roleId)` | Permission IDs for a role |
| `assignRolePermissionsAction(roleId, permissionIds[])` | Replace all role permissions |
| `createDepartmentAction(data)` | Create department |
| `updateDepartmentAction(id, data)` | Update department |
| `deleteDepartmentAction(id)` | Delete department (safety check) |
| `createCourseAction(data)` | Create course |
| `updateCourseAction(id, data)` | Update course |
| `deleteCourseAction(id)` | Delete course |
| `createSemesterAction(data)` | Create semester |
| `updateSemesterAction(id, data)` | Update semester (active/locked) |
| `updateSubjectAction(id, data)` | Update subject |
| `createGradeAction(data)` | Add grade to grading scheme |
| `updateGradeAction(id, data)` | Modify grade entry |
| `deleteGradeAction(id)` | Remove grade entry |
| `getSystemConfigAction()` | Get all configuration |
| `updateSystemConfigAction(key, value)` | Update config value |
| `lockSemesterAction(semId, lock, reason?)` | Lock/unlock semester |
| `lockMarksAction(semId, lock, reason?)` | Lock/unlock marks (approved ↔ locked) |
| `lockResultAction(semId, lock, reason?)` | Toggle result publication |
| `getUserRolesAction(userId)` | Get roles for user |
| `assignUserRoleAction(userId, roleId)` | Assign role to user |
| `removeUserRoleAction(userId, roleId)` | Remove role from user |
| `getFilteredAuditLogsAction(filters?)` | Filtered audit logs |

#### Academic Admin Actions (L80)

| Function | Description |
|----------|-------------|
| `getAcadAdminStatsAction()` | Dashboard stats |
| `createUserAction(formData, roleName, level)` | Create user + profile (student or employee) |
| `updateUserAction(uid, data)` | Update user record |
| `resetPasswordAction(uid, newPassword?)` | Reset password |
| `bulkUploadStudentsAction(students[])` | Bulk create students |
| `getAllUsersAction()` | List all users |
| `createSubjectAction(subject)` | Create subject |
| `deleteSubjectAction(code)` | Delete subject |
| `getGradingSchemeAction()` | Get grading scheme |
| `approveMarksAction(submissionIds[])` | Final approval |
| `rejectMarksAction(ids[], reason)` | Reject marks → draft |
| `getMarksBySubjectAction(subjectId, semesterId?)` | Review marks |
| `generateResultAction(studentUid, semesterId)` | Generate single result |
| `bulkGenerateResultsAction(semesterId, courseId)` | Bulk generate results |
| `publishResultsAction(semesterId)` | Publish results |
| `unpublishResultsAction(semesterId)` | Unpublish results |
| `getPassFailStatsAction(semesterId)` | Pass/fail statistics |
| `getSemesterResultsAction(semesterId)` | Results with names |
| `getTopPerformersAction(semesterId, limit)` | Top N by SGPA |
| `getFailListAction(semesterId)` | Failed students list |
| `promoteStudentsAction(uids[], newSemesterId)` | Promote students |
| `getSectionsAction(semesterId)` | Get sections |
| `createSectionAction(data)` | Create section |
| `deleteSectionAction(id)` | Delete section |
| `assignStudentSectionAction(uids[], section)` | Assign sections |
| `acadLockSemesterAction(semesterId)` | Lock semester (with pre-checks) |
| `getFacultyWorkloadAction(deptId?)` | Faculty workload report |
| `getStudentsBySemesterAction(semId?, courseId?, section?)` | Filtered students |
| `getAcadAuditLogsAction(limit)` | Audit logs |
| `updateStudentProfileActionFull(uid, data)` | Full student update |

#### HOD Actions (L70)

| Function | Description |
|----------|-------------|
| `getHodDashboardStatsAction()` | Department stats |
| `getPendingMarksAction(deptId?)` | Pending HOD approval |
| `recommendMarksAction(submissionIds[])` | Recommend → pending_admin |
| `hodRejectMarksAction(ids[], reason)` | Reject → draft |
| `getDeptSubjectsAction()` | Department subjects |
| `getDeptSemestersAction()` | Department semesters |
| `getDeptCoursesAction()` | Department courses |
| `getDeptSubjectAllocationsAction()` | Department allocations |
| `getDeptAttendanceSummaryAction(semId?)` | Attendance summary |
| `getDeptResultsStatsAction(semId?)` | Results stats |
| `getHodAuditLogsAction(limit)` | Audit logs |
| `getDepartmentAnalyticsAction(deptId)` | Department analytics |
| `getSubjectAllocationsAction()` | All allocations |
| `allocateSubjectAction(allocation)` | Assign faculty to subject |

#### Faculty Actions (L60/L50)

| Function | Level | Description |
|----------|-------|-------------|
| `getFacultyAssignmentsAction()` | 50 | Get subject allocations |
| `getFacultyAssignmentsDetailedAction()` | 50 | Enriched allocations |
| `getFacultyStudentsAction(semId, section?)` | 50 | Students in class |
| `getFacultyDashboardStatsAction()` | 50 | Dashboard stats |
| `getFacultyAnalyticsAction()` | 50 | Pipeline + attendance stats |
| `getFacultyMarksForSubjectAction(subjectId, semId)` | 50 | Students + marks for entry |
| `getFacultyPerformanceStatsAction(subjectId, semId)` | 50 | Class performance stats |
| `saveFacultyMarksAction(marks[])` | 50 | Save marks (L50: draft only) |
| `submitMarksAction(marks[])` | 50 | Submit → pending_hod |
| `markAttendanceAction(records[])` | 50 | Batch mark attendance |
| `getFacultyAttendanceHistoryAction(subjectId, date?)` | 50 | Attendance history |
| `editFacultyAttendanceAction(id, status)` | 60 | Edit within 24hrs |
| `getFacultyAttendanceAnalyticsAction(subjectId, semId)` | 50 | Analytics |
| `upsertInternalMarksAction(marks[])` | 50 | Internal assessment marks |
| `submitMarksForApprovalAction(code, type)` | 50 | Submit internals |
| `createAcademicRecordAction(record)` | 60 | Create legacy record |
| `updateAcademicRecordAction(id, data)` | 60 | Update legacy record |

#### Assistant Faculty Actions (L50)

| Function | Description |
|----------|-------------|
| `getAsstFacultyDashboardAction()` | Dashboard stats |
| `getAsstFacultyAssignmentsAction()` | Allocations with main faculty |
| `createAssignmentAction(data)` | Create assignment |
| `getAssignmentsListAction(subjectId?)` | Assignments + submission stats |
| `getAssignmentStudentsAction(assignmentId)` | Students for grading |
| `gradeAssignmentAction(assignmentId, grades[])` | Grade submissions |
| `getLabMarksAction(subjectId, semId)` | Lab marks for entry |
| `saveLabMarksAction(subjectId, semId, marks[])` | Save as draft |
| `createStudentIssueAction(data)` | Create issue |
| `getStudentIssuesAction(status?)` | List issues |
| `updateStudentIssueAction(id, data)` | Update issue |
| `getAsstAttendanceSummaryAction()` | Attendance summary |

#### Student Actions (L10)

| Function | Description |
|----------|-------------|
| `getStudentProfileAction(uid)` | Student profile (self-only) |
| `updateStudentProfileAction(uid, data)` | Update phone/address |
| `getStudentDashboardAction()` | Aggregated dashboard data |
| `getAttendanceAction(uid)` | Own attendance |
| `getStudentMarksAction(uid)` | Approved marks |
| `getAcademicRecordsAction(uid)` | Legacy records |
| `getInternalAssessmentsAction(uid)` | Internal assessments |
| `getQualificationsAction(uid)` | Prior education |
| `getStudentResultsPublishedAction()` | Published results |
| `getStudentAssignmentsAction()` | Assignments + status |
| `submitStudentAssignmentAction(id, comments?)` | Submit assignment |
| `getStudentLabMarksAction()` | Lab marks |
| `getStudentNotificationsAction()` | Notifications |
| `markNotificationReadAction(id)` | Mark read |
| `markAllNotificationsReadAction()` | Mark all read |

#### Timetable Actions

| Function | Level | Description |
|----------|-------|-------------|
| `getTimetableAction(type, id)` | 10 | Student/faculty timetable |
| `getAllTimetablesAction()` | 70 | All timetables |
| `createTimetableAction(slot)` | 80 | Create slot |
| `deleteTimetableAction(id)` | 80 | Delete slot |

#### Data Fetch Actions

| Function | Level | Description |
|----------|-------|-------------|
| `getDepartmentsAction()` | — | All departments |
| `getCoursesAction(deptId?)` | — | Courses by dept |
| `getSemestersAction(courseId?)` | — | Semesters by course |
| `getSubjectsAction(courseId?)` | — | Subjects by course |
| `getStudentsAction(deptId?)` | 10 | Students (dept-scoped for <L80) |
| `getEmployeesAction(deptId?)` | 70 | Employees (dept-scoped for <L80) |
| `getAuditLogsAction()` | 100 | Recent audit logs |

---

## 10. Marks Approval Workflow

### State Machine

```
                  Faculty saves
                  ┌─────────────┐
                  │             ▼
              ┌───────┐    ┌───────────┐
              │ draft │◄───│  REJECTED │ (by HOD or Admin)
              └───┬───┘    └───────────┘
                  │ Faculty submits
                  ▼
          ┌───────────────┐
          │  pending_hod  │
          └───────┬───────┘
                  │ HOD recommends          HOD rejects
                  ▼                         ──────────→ back to draft
         ┌────────────────┐
         │ pending_admin  │
         └───────┬────────┘
                 │ Admin approves           Admin rejects
                 ▼                          ──────────→ back to draft
          ┌──────────┐
          │ approved │
          └────┬─────┘
               │ Admin locks (via semester lock)
               ▼
          ┌──────────┐
          │  locked  │ (immutable)
          └──────────┘
```

### Workflow Steps

| Step | Actor | Action | Status Change | Server Action |
|------|-------|--------|---------------|---------------|
| 1 | Faculty | Enter marks, save draft | → `draft` | `saveFacultyMarksAction()` |
| 2 | Faculty | Submit for HOD review | `draft` → `pending_hod` | `submitMarksAction()` |
| 3a | HOD | Recommend to admin | `pending_hod` → `pending_admin` | `recommendMarksAction()` |
| 3b | HOD | Reject with reason | `pending_hod` → `draft` | `hodRejectMarksAction()` |
| 4a | Admin | Approve marks | `pending_admin` → `approved` | `approveMarksAction()` |
| 4b | Admin | Reject with reason | `pending_admin` → `draft` | `rejectMarksAction()` |
| 5 | Admin | Lock semester marks | `approved` → `locked` | `lockMarksAction()` |

### Rules & Constraints

- **L50 (Asst Faculty):** Can only save as `draft` — cannot submit for approval
- **L60 (Faculty):** Can save draft and submit to `pending_hod`
- **Rejection:** Always returns to `draft` with a `rejection_reason`
- **Semester Lock:** When semester is locked, no marks operations allowed
- **Subject Lock:** Marks are per `(student_uid, subject_id)` — unique constraint
- **Edit Window:** Draft marks can be edited freely; once submitted, only rejection returns to editable state

---

## 11. Schema Evolution

### Version History

```
V1 (schema.sql)      →  Basic: users, students, employees, academic_records
V2 (schema_v2.sql)   →  Extended: subjects, attendance, qualifications, assessments, timetable
V3 (schema_v3.sql)   →  Institutional: departments, courses, semesters, audit_logs
V4 (schema_v4.sql)   →  Enterprise: Complete rewrite — 18 core tables, UUIDs, FKs, roles
V5 (schema_v5.sql)   →  Super Admin: permissions RBAC, grading_scheme, system_config
V6 (schema_v6.sql)   →  Academic Admin: sections, student extensions (section/gender/category)
V7 (schema_v7.sql)   →  Assistant Faculty: assignments, lab_marks, student_issues
V8 (schema_v8.sql)   →  Student Module: notifications
```

### Migration Strategy

Each schema version is **additive** — new versions `ALTER TABLE` or `CREATE TABLE` without dropping existing structures. V4 is the foundational enterprise schema; V5–V8 extend it for specific role modules.

### Tables per Version

| Version | New Tables | Altered Tables |
|---------|-----------|----------------|
| V1 | users, students, employees, academic_records | — |
| V2 | subjects, qualifications, internal_assessments, attendance, timetables | students, employees |
| V3 | departments, courses, semesters, audit_logs | users, students, employees, internal_assessments, academic_records |
| V4 | roles, user_roles, subject_allocations, marks_submissions, semester_results | Complete restructure |
| V5 | permissions, role_permissions, grading_scheme, system_config | roles |
| V6 | sections | students, marks_submissions, academic_records |
| V7 | assignments, assignment_submissions, lab_marks, student_issues | — |
| V8 | notifications | — |

---

## 12. UI Components

### Design Language

| Element | Style |
|---------|-------|
| **Border Radius** | `rounded-3xl` (large), `rounded-[3rem]`/`[4rem]` (dashboard cards) |
| **Font Weight** | `font-black` for headings, `font-extrabold` for stats |
| **Color Palette** | Stone (backgrounds), role-specific accents |
| **Shadows** | `shadow-xl`, `shadow-2xl` for cards |
| **Dark Mode** | CSS custom properties support (not fully implemented in dashboards) |

### Role Accent Colors

| Role | Color | Usage |
|------|-------|-------|
| Super Admin | `red-600` | Headers, buttons, stat cards |
| Academic Admin | `orange-600` | Headers, buttons, stat cards |
| HOD | `indigo-600` | Headers, buttons, stat cards |
| Faculty | `emerald-600` | Headers, buttons, stat cards |
| Assistant Faculty | `teal-600` | Headers, buttons, stat cards |
| Student | `indigo-600` | Headers, buttons, stat cards |

### Shared Components

#### `Button` Component

```tsx
<Button variant="primary" size="md" isLoading={loading}>
  Save
</Button>
```

| Prop | Type | Options |
|------|------|---------|
| `variant` | string | `primary` (indigo), `secondary` (gray), `outline`, `ghost` |
| `size` | string | `sm`, `md`, `lg` |
| `isLoading` | boolean | Shows spinner, disables button |

#### `Card` Component

```tsx
<Card>
  <CardHeader>Title</CardHeader>
  <CardContent>Body</CardContent>
  <CardFooter>Actions</CardFooter>
</Card>
```

#### `Input` Component

```tsx
<Input label="Email" error={errors.email?.message} {...register('email')} />
```

| Prop | Type | Description |
|------|------|-------------|
| `label` | string | Field label |
| `error` | string | Error message (shows red border) |

### `DashboardLayout` Component

Wraps all dashboard pages with:
- **Sidebar** (hidden on mobile): role-based menu items, user avatar, logout
- **Mobile header**: brand name, logout button
- **Content area**: renders children

Menu items visible by role level:
- **Intelligence** (L10+): Main dashboard link
- **Registry** (L80+): Admin registry
- **Curriculum** (L80+): Course management
- **Staffing** (L70+): Faculty management
- **Personal Identity** (L10+): Profile

---

## 13. Environment Setup

### Required Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# NextAuth
NEXTAUTH_SECRET=your-random-secret
NEXTAUTH_URL=http://localhost:3000
```

### Setup Steps

1. **Clone repository**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure Supabase:**
   - Create a Supabase project
   - Run schema files in order: `schema_v4.sql` → `schema_v5.sql` → `schema_v6.sql` → `schema_v7.sql` → `schema_v8.sql`
   - Run `seed_complete.sql` for test data
4. **Set environment variables** (create `.env.local`)
5. **Start development server:**
   ```bash
   npm run dev
   ```
6. **Access:** `http://localhost:3000`

### NPM Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev` | Start dev server (Turbopack) |
| `build` | `next build` | Production build |
| `start` | `next start` | Start production server |
| `lint` | `eslint` | Run ESLint |

### TypeScript Configuration

- **Target:** ES2017
- **Module:** ESNext (Bundler resolution)
- **Strict mode:** Enabled
- **Path aliases:** `@/*` → `./src/*`
- **JSX:** `react-jsx`

---

## 14. Seed Data & Testing

### Seed File: `supabase/seed_complete.sql`

Comprehensive test data covering all 28 tables with realistic values.

### Test Accounts

| UID/EID | Name | Level | Role | Department | Password |
|---------|------|-------|------|------------|----------|
| `SUPER` | System Controller | 100 | Super Admin | — | `password123` |
| `ADMIN01` | Dr. Sarah Connor | 80 | Academic Admin | CSE | `password123` |
| `HOD001` | Dr. James Smith | 70 | HOD | CSE | `password123` |
| `HOD002` | Dr. Meera Reddy | 70 | HOD | ECE | `password123` |
| `FAC001` | Prof. Robert Martin | 60 | Faculty | CSE | `password123` |
| `FAC002` | Prof. Ananya Iyer | 60 | Faculty | CSE | `password123` |
| `FAC003` | Prof. Vikram Das | 60 | Faculty | ECE | `password123` |
| `ASST001` | Ravi Sharma | 50 | Asst Faculty | CSE | `password123` |
| `ASST002` | Priya Nair | 50 | Asst Faculty | ECE | `password123` |
| `STU001` | Aman Verma | 10 | Student | CSE Sem 1 | `password123` |
| `STU002` | Sneha Gupta | 10 | Student | CSE Sem 1 | `password123` |
| `STU003` | Rohan Patel | 10 | Student | CSE Sem 1 | `password123` |
| `STU004` | Priyanka Singh | 10 | Student | CSE Sem 1 | `password123` |
| `STU005` | Karan Mehta | 10 | Student | ECE Sem 1 | `password123` |
| `STU006` | Divya Joshi | 10 | Student | ECE Sem 1 | `password123` |

### Test Workflow Scenarios

#### 1. Marks Approval Pipeline

| Student | Subject | Current Status | Test Action |
|---------|---------|----------------|-------------|
| STU004 | CS101 | `draft` | FAC001 submits → HOD001 approves → ADMIN01 approves |
| STU003 | CS101 | `pending_hod` | HOD001 approves or rejects |
| STU002 | CS101 | `pending_admin` | ADMIN01 approves or rejects |
| STU001 | CS101 | `approved` | Complete — view as student |

#### 2. Attendance

- Login as FAC001 → Attendance tab → Select CS101 → Mark for today
- Login as STU001 → Attendance tab → See per-subject stats with warnings

#### 3. Results

- STU001: Published Sem 1 result (SGPA 8.53) — visible to student
- STU002: Unpublished result — ADMIN01 can publish
- STU003/STU004: No results yet — cannot generate until marks approved

#### 4. Assignments

- STU001: 1 overdue graded, 1 submitted ungraded, 1 pending
- STU002: 1 submitted ungraded
- STU003/STU004: All pending/overdue

#### 5. Lab Marks

- STU001/STU002 CS102: Approved
- STU003 CS102: Draft (ASST001 can edit, FAC002 can approve)

#### 6. Cross-Department

- CSE users: HOD001, FAC001, FAC002, ASST001, STU001-004
- ECE users: HOD002, FAC003, ASST002, STU005-006

### Seed Data Volumes

| Table | Records | Notes |
|-------|---------|-------|
| Departments | 2 | CSE + ECE |
| Courses | 2 | B.Tech CSE + B.Tech ECE |
| Semesters | 6 | CSE Sem 1-4, ECE Sem 1-2 |
| Subjects | 12 | Mix of Theory + Practical |
| Sections | 4 | A/B per active semester |
| Users | 15 | All roles represented |
| Students | 6 | 4 CSE + 2 ECE |
| Employees | 9 | All staff |
| Subject Allocations | 13 | Faculty + assistants mapped |
| Attendance | 44 | Multi-day, multi-subject |
| Marks Submissions | 10 | All 4 workflow stages |
| Internal Assessments | 17 | Quizzes + mid-terms |
| Semester Results | 3 | 1 published, 1 unpublished, 1 ECE |
| Timetable | 22 | Full week CSE + ECE |
| Assignments | 6 | Upcoming + overdue |
| Assignment Submissions | 5 | Various states |
| Lab Marks | 5 | Approved + draft |
| Student Issues | 4 | All statuses |
| Notifications | 10 | Mix of types |
| Grading Scheme | 8 | O through F |
| System Config | 6 | Institution settings |
| Permissions | 19 | RBAC definitions |
| Role Permissions | 44 | All roles mapped |
| Audit Logs | 10 | Sample entries |
| Qualifications | 7 | Prior education |

---

## 15. Key Architectural Patterns

### 1. Numeric Role Hierarchy

Levels (10/50/60/70/80/100) provide a simple, orderable access control model. Every server action validates via `validateAccess(requiredLevel)` ensuring the session user's effective level meets the minimum.

### 2. Department Isolation

For levels < 80, all data queries are automatically scoped to the user's `department_id`. This ensures HODs and faculty only access their own department's data without explicit filtering in the UI.

### 3. Single Actions File

All ~95 server actions live in one `actions.ts` file (~2,700 lines). This centralizes business logic and access control in one location.

### 4. Client-Side Dashboards

All dashboard pages are React client components (`'use client'`). They use `useSession()` for auth state and `useEffect` for data loading via server actions. No server components are used for dashboard rendering.

### 5. Audit Trail

Every administrative mutation (create/update/delete) logs to `audit_logs` with `old_values` and `new_values` as JSONB columns, providing a complete change history.

### 6. 24-Hour Edit Window

Faculty can only edit attendance records within 24 hours of creation. The `editFacultyAttendanceAction` checks `created_at` against current time.

### 7. Semester Locking

When a semester is locked (`is_locked = true`), all modification operations (attendance, marks, results) are blocked. This provides immutability for finalized academic periods.

### 8. Effective Role Level

A user's effective permission level is `Math.max(user.role_level, ...user_roles.roles.level)`. This allows a user to have multiple roles and operate at their highest privilege level.

### 9. Supabase Admin Client

All server actions use `supabaseAdmin` (service role key) which bypasses Row Level Security. Access control is handled entirely in application code via `validateAccess()`.

### 10. Incremental Schema Evolution

The database evolved through 8 schema versions (V1→V8), each additive. V4 serves as the enterprise foundation, with V5-V8 adding module-specific tables.

---

## 16. API Reference

### NextAuth Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/auth/[...nextauth]` | NextAuth catch-all handler |
| POST | `/api/auth/callback/credentials` | Credentials login |
| GET | `/api/auth/session` | Get current session |
| POST | `/api/auth/signout` | Sign out |

### Supabase Connection

```typescript
// Public client (RLS enforced — not used in actions)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client (RLS bypassed — used in all server actions)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
```

### Data Access Pattern

```typescript
// Every server action follows this pattern:
export async function someAction(params) {
    'use server';
    
    // 1. Validate access
    const { uid_eid, department_id } = await validateAccess(requiredLevel);
    
    // 2. Query Supabase
    const { data, error } = await supabaseAdmin
        .from('table_name')
        .select('columns, relations(*)')
        .eq('filter_column', value);
    
    // 3. Handle errors
    if (error) throw new Error(error.message);
    
    // 4. Optional: Log audit event
    await logAuditEventAction({ ... });
    
    // 5. Return data
    return data;
}
```

---

## Appendix A: Grading Scheme

| Grade | Min Marks | Max Marks | Grade Points | Description |
|-------|-----------|-----------|--------------|-------------|
| O | 90 | 100 | 10 | Outstanding |
| A+ | 80 | 89 | 9 | Excellent |
| A | 70 | 79 | 8 | Very Good |
| B+ | 60 | 69 | 7 | Good |
| B | 55 | 59 | 6 | Above Average |
| C | 50 | 54 | 5 | Average |
| P | 40 | 49 | 4 | Pass |
| F | 0 | 39 | 0 | Fail |

### SGPA Calculation

```
SGPA = Σ(credits × grade_points) / Σ(credits)
```

### CGPA Calculation

```
CGPA = Average of all semester SGPAs
```

---

## Appendix B: System Configuration Keys

| Key | Default Value | Description |
|-----|---------------|-------------|
| `institution_name` | Secura Institute of Technology | Institution name |
| `academic_year` | 2025-26 | Current academic year |
| `min_attendance_percent` | 75 | Minimum attendance % |
| `max_semesters` | 8 | Maximum semesters |
| `result_publish_mode` | manual | Auto/manual publishing |
| `grading_system` | absolute | Absolute/relative grading |

---

*Generated for ARMS v1.0.0 — Secura Institute of Technology*  
*Total codebase: ~9,500 lines across 30 source files*  
*Database: 28 tables across 8 schema versions*  
*Server actions: 95+ functions in single actions.ts*
