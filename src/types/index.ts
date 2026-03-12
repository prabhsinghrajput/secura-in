export type UserLevel = 10 | 50 | 60 | 70 | 80 | 100;
export type UserRoleName = 'Student' | 'Assistant Faculty' | 'Faculty' | 'HOD' | 'Academic Admin' | 'Super Admin';

export interface Role {
    id: number;
    name: UserRoleName;
    level: UserLevel;
}

export interface User {
    id: string;
    uid_eid: string;
    role_level: UserLevel;
    department_id?: string;
    is_active: boolean;
    created_at: string;
    roles?: Role[];
}

export interface Department {
    id: string;
    name: string;
    code: string;
    created_at: string;
}

export interface Course {
    id: string;
    dept_id: string;
    name: string;
    code: string;
    duration_years: number;
    created_at: string;
}

export interface Semester {
    id: string;
    course_id: string;
    semester_number: number;
    is_active: boolean;
    is_locked: boolean;
    created_at: string;
}

export interface Subject {
    id: string;
    course_id?: string;
    semester_id?: string;
    subject_code: string;
    name: string;
    credits: number;
    subject_type: 'Theory' | 'Practical' | 'Project' | 'Elective';
    max_internal: number;
    max_external: number;
    created_at: string;
}

export interface Student {
    uid: string;
    name: string;
    email: string;
    department_id?: string;
    course_id?: string;
    current_semester_id?: string;
    roll_number?: string;
    enrollment_number?: string;
    dob?: string;
    blood_group?: string;
    admission_year?: number;
    address?: string;
    contact_number?: string;
    guardian_name?: string;
    guardian_contact?: string;
    mentor_eid?: string;
    section?: string;
    gender?: string;
    category?: string;
    photo_url?: string;
    is_active: boolean;
    departments?: { name: string };
    courses?: { name: string; code: string };
    semesters?: { semester_number: number };
}

export interface Employee {
    eid: string;
    name: string;
    email: string;
    designation: string;
    department_id?: string;
    qualification?: string;
    dob?: string;
    contact_number?: string;
    address?: string;
    is_active: boolean;
    departments?: { name: string };
}

export interface SubjectAllocation {
    id: string;
    subject_id: string;
    faculty_eid: string;
    semester_id: string;
    section?: string;
    created_at: string;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Leave' | 'Late';

export interface Attendance {
    id: string;
    student_uid: string;
    subject_id: string;
    date: string;
    status: AttendanceStatus;
    marked_by: string;
    remarks?: string;
    created_at: string;
    subjects?: { name: string; subject_code: string };
}

export type SubmissionStatus = 'draft' | 'pending_hod' | 'pending_admin' | 'approved' | 'locked';

export interface MarksSubmission {
    id: string;
    student_uid: string;
    subject_id: string;
    semester_id: string;
    internal_marks: number;
    mid_term_marks: number;
    practical_marks: number;
    external_marks: number;
    total_marks: number;
    grade?: string;
    points?: number;
    status: SubmissionStatus;
    submitted_by?: string;
    approved_by_hod?: string;
    approved_by_admin?: string;
    created_at: string;
    updated_at: string;
}

export type ResultStatus = 'Pass' | 'Fail' | 'Backlog' | 'Withheld';

export interface SemesterResult {
    id: string;
    student_uid: string;
    semester_id: string;
    sgpa?: number;
    cgpa?: number;
    total_credits?: number;
    earned_credits?: number;
    result_status?: ResultStatus;
    is_published: boolean;
    published_at?: string;
    created_at: string;
}

export interface Timetable {
    id: string;
    course_id: string;
    semester_id: string;
    subject_id: string;
    faculty_eid: string;
    day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
    start_time: string;
    end_time: string;
    room: string;
    section?: string;
    created_at: string;
    subjects?: { name: string; subject_code: string };
    employees?: { name: string };
    semesters?: { semester_number: number };
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

export interface AcademicRecord {
    record_id: string;
    uid: string;
    subject: string;
    subject_code?: string;
    grade: string;
    marks: number;
    external_marks?: number;
    internal_total?: number;
    semester: number;
    status: string;
    created_at: string;
}

export interface InternalAssessment {
    id: string;
    uid: string;
    subject_code: string;
    assessment_type: string;
    marks_obtained: number;
    max_marks: number;
    status: string;
    evaluated_by: string;
    created_at: string;
    subjects?: { name: string };
}

export interface Qualification {
    id: string;
    uid: string;
    institution: string;
    degree: string;
    percentage_cgpa: number;
    year_of_passing: number;
    created_at: string;
}

// ===== SUPER ADMIN MODULE TYPES (V5) =====

export interface Permission {
    id: string;
    code: string;
    name: string;
    category: string;
    description?: string;
    created_at: string;
}

export interface RoleExtended {
    id: number;
    name: string;
    level: number;
    code?: string;
    description?: string;
    is_system_role?: boolean;
    department_restricted?: boolean;
    is_active?: boolean;
    created_at?: string;
    user_count?: number;
}

export interface GradingScheme {
    id: string;
    grade: string;
    min_marks: number;
    max_marks: number;
    grade_points: number;
    description?: string;
    is_active: boolean;
    created_at: string;
}

export interface SystemConfig {
    id: string;
    key: string;
    value: string;
    description?: string;
    updated_by?: string;
    updated_at: string;
}

// ===== ACADEMIC ADMIN MODULE TYPES (V6) =====

export interface Section {
    id: string;
    semester_id: string;
    name: string;
    capacity?: number;
    created_at: string;
}

export interface FacultyWorkload {
    eid: string;
    name: string;
    designation: string;
    department?: string;
    subjects: number;
    sections: number;
    total_credits: number;
}

export interface PassFailStats {
    total: number;
    pass: number;
    fail: number;
    backlog: number;
    withheld: number;
    passPercentage: number;
}

// ===== ASSISTANT FACULTY MODULE TYPES (V7) =====

export interface Assignment {
    id: string;
    subject_id: string;
    semester_id: string;
    section?: string;
    title: string;
    description?: string;
    due_date: string;
    max_marks: number;
    created_by: string;
    is_active: boolean;
    created_at: string;
    subjects?: { name: string; subject_code: string };
    semesters?: { semester_number: number };
}

export interface AssignmentSubmission {
    id: string;
    assignment_id: string;
    student_uid: string;
    marks_obtained?: number;
    remarks?: string;
    graded_by?: string;
    submitted_at: string;
    graded_at?: string;
    students?: { name: string; roll_number?: string };
    assignments?: { title: string; max_marks: number };
}

export interface LabMarks {
    id: string;
    student_uid: string;
    subject_id: string;
    semester_id: string;
    experiment_marks: number;
    practical_marks: number;
    viva_marks: number;
    total_marks: number;
    remarks?: string;
    status: 'draft' | 'approved';
    recorded_by: string;
    approved_by?: string;
    created_at: string;
    updated_at: string;
    students?: { name: string; roll_number?: string };
}

export interface StudentIssue {
    id: string;
    student_uid: string;
    subject_id?: string;
    reported_by: string;
    description: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    resolution?: string;
    created_at: string;
    updated_at: string;
    students?: { name: string; roll_number?: string };
    subjects?: { name: string; subject_code: string };
}

// ===== STUDENT MODULE TYPES (V8) =====

export type NotificationType = 'attendance' | 'marks' | 'result' | 'assignment' | 'general';

export interface Notification {
    id: string;
    recipient_uid: string;
    title: string;
    message: string;
    type: NotificationType;
    is_read: boolean;
    link?: string;
    created_at: string;
}

