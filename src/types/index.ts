export type UserRole = 'student' | 'faculty' | 'admin' | 'hod' | 'assistant_faculty';

export interface User {
    id: string;
    uid_eid: string;
    role: UserRole;
    role_level: number;
    department_id?: string;
    is_active: boolean;
    created_at: string;
}

export interface Department {
    id: string;
    name: string;
    code: string;
}

export interface Course {
    id: string;
    dept_id: string;
    name: string;
    code: string;
    duration_years: number;
}

export interface Semester {
    id: string;
    course_id: string;
    semester_number: number;
    is_active: boolean;
    is_locked: boolean;
}

export interface Student {
    uid: string;
    name: string;
    department: string;
    department_id?: string;
    course_id?: string;
    year: number;
    email: string;
    dob?: string;
    blood_group?: string;
    admission_year?: number;
    program_code?: string;
    current_semester?: number;
    address?: string;
    contact_number?: string;
    mentor_eid?: string;
}

export interface Employee {
    eid: string;
    name: string;
    designation: string;
    department: string;
    department_id?: string;
    email: string;
    dob?: string;
    contact_number?: string;
    address?: string;
}

export interface Subject {
    subject_code: string;
    name: string;
    credits: number;
    department: string;
    subject_type: string;
    max_internal: number;
}

export type ApprovalStatus = 'draft' | 'pending_hod' | 'pending_admin' | 'approved';

export interface AcademicRecord {
    record_id: string;
    uid: string;
    subject: string;
    semester: number;
    marks: number;
    external_marks: number;
    internal_total: number;
    grade: string;
    status: ApprovalStatus;
    updated_by: string;
    updated_at: string;
}

export interface InternalAssessment {
    id: string;
    uid: string;
    subject_code: string;
    assessment_type: 'Assignment' | 'Quiz' | 'MST1' | 'MST2' | 'Lab' | 'Project' | 'Surprise Test';
    marks_obtained: number;
    max_marks: number;
    status: ApprovalStatus;
    evaluated_by: string;
    created_at: string;
}

export interface Attendance {
    id: string;
    uid: string;
    subject_code: string;
    date: string;
    status: 'Present' | 'Absent' | 'Leave';
    marked_by: string;
}

export interface Timetable {
    id: string;
    subject_code: string;
    eid: string;
    day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
    start_time: string;
    end_time: string;
    room: string;
    semester: number;
}

export interface Qualification {
    id: string;
    uid: string;
    institution: string;
    degree: string;
    percentage_cgpa: number;
    year_of_passing: number;
}

export interface AuditLog {
    id: string;
    performed_by: string;
    action: string;
    entity_type: string;
    entity_id: string;
    old_values: any;
    new_values: any;
    ip_address?: string;
    created_at: string;
}
