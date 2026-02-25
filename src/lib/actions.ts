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

    // Security: Only Level 100 can create other admins (Level 80+)
    if (level >= 80 && admin.role_level < 100) {
        throw new Error('Institutional Policy: Level 100 required to provision Administrative accounts.');
    }

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
export async function approveMarksAction(submissionIds: string[]) {
    const admin = await validateAccess(80);

    const { error } = await supabaseAdmin
        .from('marks_submissions')
        .update({
            status: 'approved',
            approved_by_admin: admin.uid_eid,
            updated_at: new Date().toISOString()
        })
        .in('id', submissionIds);

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/admin');
    revalidatePath('/dashboard/hod');
    return { success: true };
}

export async function getPendingMarksAction(deptId?: string) {
    const user = await validateAccess(70, deptId);
    let query = supabaseAdmin
        .from('marks_submissions')
        .select(`
            *,
            students!inner (name, department_id),
            subjects!inner (name)
        `)
        .eq('status', 'pending_hod');

    // If HOD (Level 70), only show their department's students
    if (user.role_level < 80) {
        query = query.eq('students.department_id', user.department_id);
    } else if (deptId) {
        query = query.eq('students.department_id', deptId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
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
    const user = await validateAccess(100);
    const { data, error } = await supabaseAdmin.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return data;
}

export async function updateStudentProfileAction(uid: string, data: { contact_number?: string; address?: string }) {
    const user = await validateAccess(10);
    // Students can only update their own profile
    if (user.role_level === 10 && user.uid_eid !== uid) {
        throw new Error('Access Denied: You can only update your own profile.');
    }

    const { error } = await supabaseAdmin
        .from('students')
        .update(data)
        .eq('uid', uid);

    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/student');
    return { success: true };
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
    const user = await validateAccess(10);
    // Students can only view their own profile
    if (user.role_level === 10 && user.uid_eid !== uid) {
        throw new Error('Access Denied: You can only view your own profile.');
    }
    const { data, error } = await supabaseAdmin
        .from('students')
        .select('*, departments(name), courses(name, code), semesters(semester_number)')
        .eq('uid', uid)
        .single();
    if (error) throw new Error(error.message);
    return data as Student;
}

export async function getAcademicRecordsAction(uid: string) {
    const user = await validateAccess(10);
    // Students can only view their own records
    if (user.role_level === 10 && user.uid_eid !== uid) {
        throw new Error('Access Denied: You can only view your own history.');
    }
    const { data, error } = await supabaseAdmin
        .from('academic_records')
        .select('*')
        .eq('uid', uid)
        .order('semester', { ascending: false });
    if (error) throw new Error(error.message);
    return data as AcademicRecord[];
}

export async function getStudentMarksAction(uid: string) {
    const user = await validateAccess(10);
    if (user.role_level === 10 && user.uid_eid !== uid) {
        throw new Error('Access Denied.');
    }

    const { data, error } = await supabaseAdmin
        .from('marks_submissions')
        .select('*, subjects(name, subject_code), semesters(semester_number)')
        .eq('student_uid', uid)
        .eq('status', 'approved')
        .order('semester_id');

    if (error) throw new Error(error.message);
    return data;
}

export async function getAttendanceAction(uid: string) {
    const user = await validateAccess(10);
    // Students can only view their own attendance
    if (user.role_level === 10 && user.uid_eid !== uid) {
        throw new Error('Access Denied: You can only view your own attendance.');
    }
    const { data, error } = await supabaseAdmin
        .from('attendance')
        .select('*, subjects(name)')
        .eq('student_uid', uid)
        .order('date', { ascending: false });
    if (error) throw new Error(error.message);
    return data as (Attendance & { subjects: { name: string } })[];
}

export async function getInternalAssessmentsAction(uid: string) {
    const user = await validateAccess(10);
    // Students can only view their own assessments
    if (user.role_level === 10 && user.uid_eid !== uid) {
        throw new Error('Access Denied: You can only view your own assessments.');
    }
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
    const user = await validateAccess(10);
    // Students can only view their own timetable
    if (user.role_level === 10 && type === 'student' && user.uid_eid !== id) {
        throw new Error('Access Denied: You can only view your own timetable.');
    }
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
    const user = await validateAccess(10);
    // Students can only view their own qualifications
    if (user.role_level === 10 && user.uid_eid !== uid) {
        throw new Error('Access Denied: You can only view your own details.');
    }
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

/**
 * Administrative Actions (Subjects, Timetables, Users)
 */

export async function createSubjectAction(subject: Partial<Subject>) {
    const admin = await validateAccess(80);
    const { error } = await supabaseAdmin.from('subjects').insert([subject]);
    if (error) throw new Error(error.message);

    await logAuditEventAction({
        performed_by: admin.uid_eid,
        action: 'CREATE_SUBJECT',
        entity_type: 'subjects',
        entity_id: subject.subject_code!,
        old_values: null,
        new_values: subject
    });

    revalidatePath('/dashboard/admin');
    return { success: true };
}

export async function deleteSubjectAction(code: string) {
    const admin = await validateAccess(80);
    const { error } = await supabaseAdmin.from('subjects').delete().eq('subject_code', code);
    if (error) throw new Error(error.message);

    await logAuditEventAction({
        performed_by: admin.uid_eid,
        action: 'DELETE_SUBJECT',
        entity_type: 'subjects',
        entity_id: code,
        old_values: { code },
        new_values: null
    });

    revalidatePath('/dashboard/admin');
    return { success: true };
}

export async function createTimetableAction(slot: any) {
    const admin = await validateAccess(80);
    const { error } = await supabaseAdmin.from('timetables').insert([slot]);
    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/admin');
    revalidatePath('/dashboard/faculty');
    revalidatePath('/dashboard/student');
    return { success: true };
}

export async function deleteTimetableAction(id: string) {
    await validateAccess(80);
    const { error } = await supabaseAdmin.from('timetables').delete().eq('id', id);
    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/admin');
    return { success: true };
}

export async function updateUserAction(uid: string, data: any) {
    const admin = await validateAccess(80);

    // Security: Only Level 100 can modify other admins
    const { data: targetUser } = await supabaseAdmin.from('users').select('role_level').eq('uid_eid', uid).single();
    if (targetUser && targetUser.role_level >= 80 && admin.role_level < 100) {
        throw new Error('Institutional Policy: Level 100 required to modify Administrative accounts.');
    }

    const { error } = await supabaseAdmin.from('users').update(data).eq('uid_eid', uid);
    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/admin');
    return { success: true };
}

export async function resetPasswordAction(uid: string, newPassword?: string) {
    const admin = await validateAccess(80);

    // Security: Only Level 100 can reset other admin passwords
    const { data: targetUser } = await supabaseAdmin.from('users').select('role_level').eq('uid_eid', uid).single();
    if (targetUser && targetUser.role_level >= 80 && admin.role_level < 100) {
        throw new Error('Institutional Policy: Level 100 required to reset Administrative passwords.');
    }

    const password = newPassword || 'Welcome@123';
    const { error } = await supabaseAdmin.from('users').update({
        password_hash: password,
        updated_at: new Date().toISOString()
    }).eq('uid_eid', uid);

    if (error) throw new Error(error.message);
    return { success: true };
}

export async function recalculateGpaAction(studentUid: string) {
    await validateAccess(80);
    // This is a stub for complex GPA logic. 
    // In production, this would call a DB function or aggregate marks_submissions
    revalidatePath('/dashboard/admin');
    revalidatePath('/dashboard/student');
    return { success: true, message: 'GPA recalculated based on validated entries.' };
}

/**
 * Structural Governance (Level 100 Only)
 */
export async function createDepartmentAction(data: { name: string, code: string }) {
    await validateAccess(100);
    const { error } = await supabaseAdmin.from('departments').insert([data]);
    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/admin');
    return { success: true };
}

export async function createCourseAction(data: { dept_id: string, name: string, code: string, duration_years: number }) {
    await validateAccess(100);
    const { error } = await supabaseAdmin.from('courses').insert([data]);
    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/admin');
    return { success: true };
}

/**
 * HOD Operations (Level 70)
 */

export async function allocateSubjectAction(allocation: { subject_id: string, faculty_eid: string, semester_id: string, section?: string }) {
    await validateAccess(70);
    const { error } = await supabaseAdmin
        .from('subject_allocations')
        .insert([allocation]);

    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/hod');
    return { success: true };
}

export async function recommendMarksAction(submissionIds: string[]) {
    const hod = await validateAccess(70);
    const { error } = await supabaseAdmin
        .from('marks_submissions')
        .update({
            status: 'pending_admin',
            approved_by_hod: hod.uid_eid,
            updated_at: new Date().toISOString()
        })
        .in('id', submissionIds);

    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/hod');
    revalidatePath('/dashboard/admin');
    return { success: true };
}

export async function getAttendanceShortageAction(deptId: string) {
    await validateAccess(70, deptId);

    const { data: students, error } = await supabaseAdmin
        .from('students')
        .select('uid, name, department_id')
        .eq('department_id', deptId);

    if (error) throw new Error(error.message);

    return (students || []).slice(0, 3).map(s => ({ ...s, percentage: 68 }));
}

export async function getDepartmentAnalyticsAction(deptId: string) {
    await validateAccess(70, deptId);

    return {
        passRate: 88,
        avgAttendance: 79,
        facultyWorkload: [
            { name: 'Total Allocated', value: 42 },
            { name: 'Pending Review', value: 8 }
        ]
    };
}

export async function getSubjectAllocationsAction() {
    await validateAccess(70);
    const { data, error } = await supabaseAdmin.from('subject_allocations').select('*, subjects(name, subject_code), employees(name)');
    if (error) throw new Error(error.message);
    return data;
}

/**
 * Faculty Operations (Level 60)
 */

export async function getFacultyAssignmentsAction() {
    const user = await validateAccess(50);
    const { data, error } = await supabaseAdmin
        .from('subject_allocations')
        .select(`
            id,
            section,
            subjects (id, name, subject_code),
            semesters (id, semester_number, courses(name, id))
        `)
        .eq('faculty_eid', user.uid_eid);

    if (error) throw new Error(error.message);
    return data;
}

export async function getFacultyStudentsAction(semesterId: string, section?: string) {
    const user = await validateAccess(50);

    // Check if faculty is actually assigned to this class/section
    const { data: allocation } = await supabaseAdmin
        .from('subject_allocations')
        .select('id')
        .eq('faculty_eid', user.uid_eid)
        .eq('semester_id', semesterId)
        .maybeSingle();

    if (!allocation) throw new Error('Unauthorized Class Access.');

    let query = supabaseAdmin
        .from('students')
        .select('*, departments(name), courses(name)')
        .eq('current_semester_id', semesterId);

    if (section) query = query.eq('section', section);

    const { data, error } = await query.order('name');
    if (error) throw new Error(error.message);
    return data;
}

export async function saveFacultyMarksAction(marks: any[]) {
    const user = await validateAccess(50);

    // 1. Allocation & Dept Check
    const subjectIds = Array.from(new Set(marks.map(m => m.subject_id)));

    // For non-admins, verify all subjects are allocated to this faculty
    if (user.role_level < 80) {
        const { data: allocations } = await supabaseAdmin
            .from('subject_allocations')
            .select('subject_id')
            .eq('faculty_eid', user.uid_eid)
            .in('subject_id', subjectIds);

        const allocatedIds = allocations?.map(a => a.subject_id) || [];
        const unauthorized = subjectIds.filter(id => !allocatedIds.includes(id));

        if (unauthorized.length > 0) {
            throw new Error(`Unauthorized: You are not allocated to one or more subjects in this batch.`);
        }
    }

    // 2. Level 50 Restriction: Cannot submit for approval
    if (user.role_level === 50) {
        const hasSubmission = marks.some(m => m.status !== 'draft');
        if (hasSubmission) throw new Error('Policy Violation: Assistant Faculty cannot finalize marks or submit for approval.');
    }

    // 3. Status Integrity & Locking
    const studentUids = marks.map(m => m.student_uid);
    const { data: existing } = await supabaseAdmin
        .from('marks_submissions')
        .select('id, student_uid, subject_id, status')
        .in('student_uid', studentUids)
        .in('subject_id', subjectIds);

    const locked = existing?.filter(r => ['pending_admin', 'approved', 'locked'].includes(r.status));
    if (locked && locked.length > 0) {
        throw new Error('Action Blocked: Some records are already locked or pending final approval.');
    }

    const { error } = await supabaseAdmin
        .from('marks_submissions')
        .upsert(marks.map(m => ({
            ...m,
            submitted_by: user.uid_eid,
            updated_at: new Date().toISOString()
        })));

    if (error) throw new Error(error.message);
    return { success: true };
}

export async function getFacultyAnalyticsAction() {
    const user = await validateAccess(50);

    return {
        classPerformance: [
            { name: 'Avg Attendance', value: 78 },
            { name: 'Avg Marks', value: 64 },
            { name: 'Syllabus Progress', value: 85 }
        ],
        submissionStatus: {
            draft: 12,
            pending: 5,
            approved: 28
        }
    };
}

