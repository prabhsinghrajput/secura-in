'use server';

import { supabaseAdmin } from './supabase';
import { hashPassword } from './password';
import {
    Student,
    Employee,
    Subject,
    Attendance,
    Timetable,
    AuditLog,
    MarksSubmission,
    SubmissionStatus,
    UserLevel,
    Role,
    AcademicRecord,
    InternalAssessment,
    Qualification
} from '@/types';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

/**
 * Shared utility to log system events (Admin/Audit focus)
 */
/**
 * Shared utility to log system events (Admin/Audit focus)
 */
export async function logAuditEventAction(data: Omit<AuditLog, 'id' | 'created_at'>) {
    const { error } = await supabaseAdmin
        .from('audit_logs')
        .insert([{ ...data }]);
    if (error) console.error('Audit Log Error:', error);
}

/**
 * Access Check: Numeric Hierarchy & Department Isolation
 */
async function validateAccess(requiredLevel: number, targetDeptId?: string) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error('Unauthorized');

    const user = session.user as any;

    // Level Check
    if (user.role_level < requiredLevel) {
        throw new Error(`Insufficient Permissions: Level ${requiredLevel} required.`);
    }

    // Dept Isolation: Non-Admins (below level 80) can only access their department
    if (user.role_level < 80 && targetDeptId && user.department_id !== targetDeptId) {
        throw new Error('Department Isolation: Access Forbidden.');
    }

    return user;
}

/**
 * Fetch Subjects
 */
export async function getSubjectsAction(courseId?: string) {
    let query = supabaseAdmin.from('subjects').select('*, courses(name)');
    if (courseId) query = query.eq('course_id', courseId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data as any[];
}

/**
 * Fetch Students
 */
export async function getStudentsAction(deptId?: string) {
    const user = await validateAccess(10, deptId);
    let query = supabaseAdmin.from('students').select('*, courses(name), departments(name)');

    if (user.role_level < 80) {
        query = query.eq('department_id', user.department_id);
    } else if (deptId) {
        query = query.eq('department_id', deptId);
    }

    const { data, error } = await query.order('name');
    if (error) throw new Error(error.message);
    return data as Student[];
}

/**
 * Fetch Employees
 */
export async function getEmployeesAction(deptId?: string) {
    const user = await validateAccess(70, deptId);
    let query = supabaseAdmin.from('employees').select('*, departments(name)');

    if (user.role_level < 80) {
        query = query.eq('department_id', user.department_id);
    } else if (deptId) {
        query = query.eq('department_id', deptId);
    }

    const { data, error } = await query.order('name');
    if (error) throw new Error(error.message);
    return data as Employee[];
}

/**
 * Bulk Student Upload (CSV Processing Logic)
 */
export async function bulkUploadStudentsAction(students: any[]) {
    const admin = await validateAccess(80);

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const s of students) {
        try {
            await createUserAction(s, 'Student', 10);
            results.success++;
        } catch (err: any) {
            results.failed++;
            results.errors.push(`${s.uid_eid}: ${err.message}`);
        }
    }

    revalidatePath('/dashboard/admin');
    return results;
}

/**
 * Create Academic User & Profile
 */
export async function createUserAction(formData: any, roleName: string, level: number) {
    const admin = await validateAccess(80);

    // 1. Create User
    const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .insert([{
            uid_eid: formData.uid_eid,
            password_hash: formData.password || 'Welcome@123',
            role_level: level,
            department_id: formData.department_id,
            is_active: true
        }])
        .select()
        .single();

    if (userError) throw new Error(userError.message);

    // 2. Profile Table
    if (level === 10) {
        const { error: sError } = await supabaseAdmin.from('students').insert([{
            uid: formData.uid_eid,
            name: formData.name,
            email: formData.email,
            department_id: formData.department_id,
            course_id: formData.course_id,
            current_semester_id: formData.current_semester_id,
            roll_number: formData.roll_number,
            enrollment_number: formData.enrollment_number,
            admission_year: formData.admission_year || new Date().getFullYear()
        }]);
        if (sError) throw new Error(sError.message);
    } else {
        const { error: eError } = await supabaseAdmin.from('employees').insert([{
            eid: formData.uid_eid,
            name: formData.name,
            email: formData.email,
            designation: formData.designation,
            department_id: formData.department_id,
            qualification: formData.qualification
        }]);
        if (eError) throw new Error(eError.message);
    }

    await logAuditEventAction({
        performed_by: admin.uid_eid,
        action: 'CREATE_USER',
        entity_type: 'users',
        entity_id: formData.uid_eid,
        old_values: null,
        new_values: { level, dept: formData.department_id }
    });

    revalidatePath('/dashboard/admin');
    return { success: true };
}

/**
 * Submit Marks (Faculty)
 */
export async function submitMarksAction(marks: Partial<MarksSubmission>[]) {
    const user = await validateAccess(50);

    const { error } = await supabaseAdmin
        .from('marks_submissions')
        .upsert(marks.map(m => ({
            ...m,
            submitted_by: user.uid_eid,
            status: 'pending_hod',
            updated_at: new Date().toISOString()
        })));

    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/faculty');
    return { success: true };
}

/**
 * Approve Marks (HOD/Admin)
 */
export async function approveMarksAction(submissionIds: string[], nextStatus: SubmissionStatus) {
    const requiredLevel = nextStatus === 'approved' ? 80 : 70;
    const user = await validateAccess(requiredLevel);

    const updateData: any = { status: nextStatus, updated_at: new Date().toISOString() };
    if (requiredLevel === 70) updateData.approved_by_hod = user.uid_eid;
    if (requiredLevel === 80) updateData.approved_by_admin = user.uid_eid;

    const { error } = await supabaseAdmin
        .from('marks_submissions')
        .update(updateData)
        .in('id', submissionIds);

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/hod');
    revalidatePath('/dashboard/admin');
    return { success: true };
}

/**
 * Attendance Management
 */
export async function markAttendanceAction(records: any[]) {
    const user = await validateAccess(50);
    const { error } = await supabaseAdmin
        .from('attendance')
        .insert(records.map(r => ({
            student_uid: r.uid || r.student_uid,
            subject_id: r.subject_id,
            subject_code: r.subject_code,
            date: r.date,
            status: r.status,
            marked_by: user.uid_eid
        })));

    if (error) throw new Error(error.message);
    return { success: true };
}

/**
 * Calculate & Publish Semester Result
 */
export async function generateResultAction(studentUid: string, semesterId: string) {
    const admin = await validateAccess(80);

    // 1. Get all approved marks for this student and semester
    const { data: marks, error: mError } = await supabaseAdmin
        .from('marks_submissions')
        .select('*, subjects(credits)')
        .eq('student_uid', studentUid)
        .eq('semester_id', semesterId)
        .eq('status', 'approved');

    if (mError) throw new Error(mError.message);
    if (!marks || marks.length === 0) throw new Error('No approved marks found for this semester.');

    // 2. GPA Logic
    let totalPoints = 0;
    let totalCredits = 0;

    marks.forEach(m => {
        const credits = (m.subjects as any).credits;
        totalPoints += (m.points || 0) * credits;
        totalCredits += credits;
    });

    const sgpa = totalCredits > 0 ? totalPoints / totalCredits : 0;

    // 3. Upsert Result
    const { error: rError } = await supabaseAdmin
        .from('semester_results')
        .upsert([{
            student_uid: studentUid,
            semester_id: semesterId,
            sgpa: sgpa,
            total_credits: totalCredits,
            earned_credits: totalCredits, // Simplified
            result_status: sgpa >= 4.0 ? 'Pass' : 'Fail',
            is_published: false
        }]);

    if (rError) throw new Error(rError.message);
    return { success: true, sgpa };
}

/**
 * Institutional Data
 */
export async function getDepartmentsAction() {
    const { data, error } = await supabaseAdmin.from('departments').select('*').order('name');
    if (error) throw new Error(error.message);
    return data;
}

export async function getCoursesAction(deptId?: string) {
    let query = supabaseAdmin.from('courses').select('*');
    if (deptId) query = query.eq('dept_id', deptId);
    const { data, error } = await query.order('name');
    if (error) throw new Error(error.message);
    return data;
}

export async function getSemestersAction(courseId?: string) {
    let query = supabaseAdmin.from('semesters').select('*');
    if (courseId) query = query.eq('course_id', courseId);
    const { data, error } = await query.order('semester_number');
    if (error) throw new Error(error.message);
    return data;
}

/**
 * User Meta
 */
export async function getAllUsersAction() {
    const user = await validateAccess(80);
    const { data, error } = await supabaseAdmin.from('users').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
}

export async function getAuditLogsAction() {
    const user = await validateAccess(80);
    const { data, error } = await supabaseAdmin.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return data;
}

export async function updateStudentProfileActionFull(uid: string, data: Partial<Student>) {
    await validateAccess(80);
    const { error } = await supabaseAdmin.from('students').update(data).eq('uid', uid);
    if (error) throw new Error(error.message);
    return { success: true };
}

export async function getAllTimetablesAction() {
    const user = await validateAccess(70);
    let query = supabaseAdmin.from('timetables').select('*, subjects(name, subject_code), employees(name), semesters(semester_number)');
    if (user.role_level < 80) query = query.eq('department_id', user.department_id);
    const { data, error } = await query.order('day').order('start_time');
    if (error) throw new Error(error.message);
    return data;
}

/**
 * Student-Specific Data Actions
 */

export async function getStudentProfileAction(uid: string) {
    await validateAccess(10);
    const { data, error } = await supabaseAdmin
        .from('students')
        .select('*, departments(name), courses(name, code), semesters(semester_number)')
        .eq('uid', uid)
        .single();
    if (error) throw new Error(error.message);
    return data as Student;
}

export async function getAcademicRecordsAction(uid: string) {
    await validateAccess(10);
    const { data, error } = await supabaseAdmin
        .from('academic_records')
        .select('*')
        .eq('uid', uid)
        .order('semester', { ascending: false });
    if (error) throw new Error(error.message);
    return data as AcademicRecord[];
}

export async function getAttendanceAction(uid: string) {
    await validateAccess(10);
    const { data, error } = await supabaseAdmin
        .from('attendance')
        .select('*, subjects(name)')
        .eq('student_uid', uid)
        .order('date', { ascending: false });
    if (error) throw new Error(error.message);
    return data as (Attendance & { subjects: { name: string } })[];
}

export async function getInternalAssessmentsAction(uid: string) {
    await validateAccess(10);
    const { data, error } = await supabaseAdmin
        .from('internal_assessments')
        .select('*, subjects!inner(name)')
        .eq('uid', uid)
        .order('created_at', { ascending: false });
    // Note: subjects!inner is needed if we use subject_code as FK
    if (error) throw new Error(error.message);
    return data as any[];
}

export async function getTimetableAction(type: 'student' | 'faculty', id: string) {
    await validateAccess(10);
    let query = supabaseAdmin.from('timetables').select('*, subjects(name, subject_code), employees(name), semesters(semester_number)');

    if (type === 'student') {
        const { data: student } = await supabaseAdmin.from('students').select('course_id, current_semester_id').eq('uid', id).single();
        if (student) {
            query = query.eq('course_id', student.course_id).eq('semester_id', student.current_semester_id);
        }
    } else {
        query = query.eq('faculty_eid', id);
    }

    const { data, error } = await query.order('day').order('start_time');
    if (error) throw new Error(error.message);
    return data as any[];
}

export async function getQualificationsAction(uid: string) {
    await validateAccess(10);
    const { data, error } = await supabaseAdmin
        .from('qualifications')
        .select('*')
        .eq('uid', uid)
        .order('year_of_passing', { ascending: false });
    if (error) throw new Error(error.message);
    return data as Qualification[];
}

/**
 * Faculty Operations (Batch & Management)
 */

export async function upsertInternalMarksAction(marks: any[]) {
    const user = await validateAccess(50);
    const { error } = await supabaseAdmin
        .from('internal_assessments')
        .upsert(marks.map(m => ({
            ...m,
            uid: m.uid,
            evaluated_by: user.uid_eid,
            status: 'draft',
            updated_at: new Date().toISOString()
        })));

    if (error) throw new Error(error.message);
    return { success: true };
}

export async function submitMarksForApprovalAction(subjectCode: string, assessmentType: string) {
    const user = await validateAccess(50);
    const { error } = await supabaseAdmin
        .from('internal_assessments')
        .update({ status: 'pending_hod' })
        .eq('subject_code', subjectCode)
        .eq('assessment_type', assessmentType)
        .eq('evaluated_by', user.uid_eid)
        .eq('status', 'draft');

    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/faculty');
    return { success: true };
}

export async function createAcademicRecordAction(record: Partial<AcademicRecord>) {
    await validateAccess(60);
    const { error } = await supabaseAdmin.from('academic_records').insert([record]);
    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/faculty');
    return { success: true };
}

export async function updateAcademicRecordAction(id: string, data: Partial<AcademicRecord>) {
    await validateAccess(60);
    const { error } = await supabaseAdmin.from('academic_records').update(data).eq('record_id', id);
    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/faculty');
    return { success: true };
}

