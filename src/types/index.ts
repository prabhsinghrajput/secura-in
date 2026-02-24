export type UserRole = 'student' | 'faculty' | 'admin';

export interface User {
    id: string;
    uid_eid: string;
    role: UserRole;
    password_hash: string;
    created_at: string;
}

export interface Student {
    uid: string;
    name: string;
    department: string;
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

export interface AcademicRecord {
    record_id: string;
    uid: string;
    subject: string;
    semester: number;
    marks: number;
    grade: string;
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
