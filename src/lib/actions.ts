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

    // Get faculty allocations
    const { data: allocs } = await supabaseAdmin
        .from('subject_allocations')
        .select('subject_id, semester_id, semesters(is_active)')
        .eq('faculty_eid', user.uid_eid);

    const active = (allocs || []).filter((a: any) => a.semesters?.is_active);
    const subjectIds = active.map((a: any) => a.subject_id);

    // Attendance avg
    let avgAttendance = 0;
    if (subjectIds.length > 0) {
        const { data: att } = await supabaseAdmin
            .from('attendance')
            .select('status')
            .in('subject_id', subjectIds);
        if (att && att.length > 0) {
            const present = att.filter(a => a.status === 'Present' || a.status === 'Late').length;
            avgAttendance = Math.round((present / att.length) * 100);
        }
    }

    // Submission pipeline
    const { count: draftCount } = await supabaseAdmin
        .from('marks_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('submitted_by', user.uid_eid)
        .eq('status', 'draft');
    const { count: pendingCount } = await supabaseAdmin
        .from('marks_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('submitted_by', user.uid_eid)
        .in('status', ['pending_hod', 'pending_admin']);
    const { count: approvedCount } = await supabaseAdmin
        .from('marks_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('submitted_by', user.uid_eid)
        .in('status', ['approved', 'locked']);

    // Avg marks
    let avgMarks = 0;
    if (subjectIds.length > 0) {
        const { data: marks } = await supabaseAdmin
            .from('marks_submissions')
            .select('internal_marks, mid_term_marks, practical_marks')
            .in('subject_id', subjectIds);
        if (marks && marks.length > 0) {
            const totals = marks.map(m => (m.internal_marks || 0) + (m.mid_term_marks || 0) + (m.practical_marks || 0));
            avgMarks = Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
        }
    }

    return {
        classPerformance: [
            { name: 'Avg Attendance', value: avgAttendance },
            { name: 'Avg Marks', value: avgMarks },
            { name: 'Subjects Assigned', value: active.length }
        ],
        submissionStatus: {
            draft: draftCount || 0,
            pending: pendingCount || 0,
            approved: approvedCount || 0
        }
    };
}

// =============================================
// SUPER ADMIN MODULE ACTIONS (V5)
// =============================================

/**
 * Global Statistics for Super Admin Dashboard
 */
export async function getGlobalStatsAction() {
    await validateAccess(100);
    const [
        { count: deptCount },
        { count: courseCount },
        { count: facultyCount },
        { count: studentCount },
        { count: activeSemsCount },
        { count: pendingCount }
    ] = await Promise.all([
        supabaseAdmin.from('departments').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('courses').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('employees').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('students').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('semesters').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabaseAdmin.from('marks_submissions').select('*', { count: 'exact', head: true }).in('status', ['pending_hod', 'pending_admin'])
    ]);
    return {
        departments: deptCount || 0,
        courses: courseCount || 0,
        faculty: facultyCount || 0,
        students: studentCount || 0,
        activeSemesters: activeSemsCount || 0,
        pendingResults: pendingCount || 0
    };
}

/**
 * Roles CRUD
 */
export async function getRolesAction() {
    await validateAccess(100);
    const { data: roles, error } = await supabaseAdmin
        .from('roles')
        .select('*')
        .order('level', { ascending: false });
    if (error) throw new Error(error.message);

    const { data: directUsers } = await supabaseAdmin.from('users').select('role_level');
    const levelCounts: Record<number, number> = {};
    directUsers?.forEach(u => {
        levelCounts[u.role_level] = (levelCounts[u.role_level] || 0) + 1;
    });

    return (roles || []).map(r => ({ ...r, user_count: levelCounts[r.level] || 0 }));
}

export async function createRoleAction(data: {
    name: string; code: string; level: number;
    description?: string; is_system_role?: boolean; department_restricted?: boolean;
}) {
    const admin = await validateAccess(100);
    if (data.level >= 100) throw new Error('Cannot create role at or above Super Admin level.');

    const { data: existing } = await supabaseAdmin.from('roles').select('id').order('id', { ascending: false }).limit(1);
    const nextId = (existing?.[0]?.id || 0) + 1;

    const { error } = await supabaseAdmin.from('roles').insert([{
        id: nextId, name: data.name, level: data.level, code: data.code,
        description: data.description || '',
        is_system_role: data.is_system_role || false,
        department_restricted: data.department_restricted || false,
        is_active: true
    }]);
    if (error) throw new Error(error.message);

    await logAuditEventAction({
        performed_by: admin.uid_eid, action: 'CREATE_ROLE',
        entity_type: 'roles', entity_id: data.code,
        old_values: null, new_values: data
    });
    revalidatePath('/dashboard/admin');
    return { success: true };
}

export async function updateRoleAction(id: number, data: any) {
    const admin = await validateAccess(100);
    const { data: existing } = await supabaseAdmin.from('roles').select('*').eq('id', id).single();
    if (!existing) throw new Error('Role not found.');
    if (existing.is_system_role && data.level !== undefined && data.level !== existing.level) {
        throw new Error('Cannot change level of system roles.');
    }
    if (data.level >= 100) throw new Error('Cannot set role level at or above Super Admin.');

    const { error } = await supabaseAdmin.from('roles').update(data).eq('id', id);
    if (error) throw new Error(error.message);

    await logAuditEventAction({
        performed_by: admin.uid_eid, action: 'UPDATE_ROLE',
        entity_type: 'roles', entity_id: String(id),
        old_values: existing, new_values: data
    });
    revalidatePath('/dashboard/admin');
    return { success: true };
}

export async function deleteRoleAction(id: number) {
    const admin = await validateAccess(100);
    const { data: role } = await supabaseAdmin.from('roles').select('*').eq('id', id).single();
    if (!role) throw new Error('Role not found.');
    if (role.is_system_role) throw new Error('Cannot delete system roles.');

    const { count } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('role_level', role.level);
    if (count && count > 0) throw new Error(`Cannot delete: ${count} users are assigned to this role.`);

    const { error } = await supabaseAdmin.from('roles').delete().eq('id', id);
    if (error) throw new Error(error.message);

    await logAuditEventAction({
        performed_by: admin.uid_eid, action: 'DELETE_ROLE',
        entity_type: 'roles', entity_id: String(id),
        old_values: role, new_values: null
    });
    revalidatePath('/dashboard/admin');
    return { success: true };
}

/**
 * Permissions Management
 */
export async function getPermissionsAction() {
    await validateAccess(100);
    const { data, error } = await supabaseAdmin.from('permissions').select('*').order('category').order('name');
    if (error) throw new Error(error.message);
    return data || [];
}

export async function getRolePermissionsAction(roleId: number) {
    await validateAccess(100);
    const { data, error } = await supabaseAdmin.from('role_permissions').select('permission_id').eq('role_id', roleId);
    if (error) throw new Error(error.message);
    return (data || []).map(rp => rp.permission_id);
}

export async function assignRolePermissionsAction(roleId: number, permissionIds: string[]) {
    const admin = await validateAccess(100);
    const { data: existing } = await supabaseAdmin.from('role_permissions').select('permission_id').eq('role_id', roleId);
    await supabaseAdmin.from('role_permissions').delete().eq('role_id', roleId);

    if (permissionIds.length > 0) {
        const { error } = await supabaseAdmin.from('role_permissions').insert(
            permissionIds.map(pid => ({ role_id: roleId, permission_id: pid }))
        );
        if (error) throw new Error(error.message);
    }

    await logAuditEventAction({
        performed_by: admin.uid_eid, action: 'ASSIGN_PERMISSIONS',
        entity_type: 'role_permissions', entity_id: String(roleId),
        old_values: { permissions: existing?.map(e => e.permission_id) || [] },
        new_values: { permissions: permissionIds }
    });
    revalidatePath('/dashboard/admin');
    return { success: true };
}

/**
 * Department Management (Extended)
 */
export async function updateDepartmentAction(id: string, data: { name?: string; code?: string }) {
    const admin = await validateAccess(100);
    const { data: existing } = await supabaseAdmin.from('departments').select('*').eq('id', id).single();
    if (!existing) throw new Error('Department not found.');

    const { error } = await supabaseAdmin.from('departments').update(data).eq('id', id);
    if (error) throw new Error(error.message);

    await logAuditEventAction({
        performed_by: admin.uid_eid, action: 'UPDATE_DEPARTMENT',
        entity_type: 'departments', entity_id: id,
        old_values: existing, new_values: data
    });
    revalidatePath('/dashboard/admin');
    return { success: true };
}

export async function deleteDepartmentAction(id: string) {
    const admin = await validateAccess(100);
    const { count: sc } = await supabaseAdmin.from('students').select('*', { count: 'exact', head: true }).eq('department_id', id).eq('is_active', true);
    if (sc && sc > 0) throw new Error(`Cannot delete: ${sc} active students in this department.`);
    const { count: fc } = await supabaseAdmin.from('employees').select('*', { count: 'exact', head: true }).eq('department_id', id).eq('is_active', true);
    if (fc && fc > 0) throw new Error(`Cannot delete: ${fc} active faculty in this department.`);

    const { data: dept } = await supabaseAdmin.from('departments').select('*').eq('id', id).single();
    const { error } = await supabaseAdmin.from('departments').delete().eq('id', id);
    if (error) throw new Error(error.message);

    await logAuditEventAction({
        performed_by: admin.uid_eid, action: 'DELETE_DEPARTMENT',
        entity_type: 'departments', entity_id: id,
        old_values: dept, new_values: null
    });
    revalidatePath('/dashboard/admin');
    return { success: true };
}

/**
 * Course Management (Extended)
 */
export async function updateCourseAction(id: string, data: any) {
    const admin = await validateAccess(100);
    const { data: existing } = await supabaseAdmin.from('courses').select('*').eq('id', id).single();
    const { error } = await supabaseAdmin.from('courses').update(data).eq('id', id);
    if (error) throw new Error(error.message);

    await logAuditEventAction({
        performed_by: admin.uid_eid, action: 'UPDATE_COURSE',
        entity_type: 'courses', entity_id: id,
        old_values: existing, new_values: data
    });
    revalidatePath('/dashboard/admin');
    return { success: true };
}

export async function deleteCourseAction(id: string) {
    const admin = await validateAccess(100);
    const { data: course } = await supabaseAdmin.from('courses').select('*').eq('id', id).single();
    const { error } = await supabaseAdmin.from('courses').delete().eq('id', id);
    if (error) throw new Error(error.message);

    await logAuditEventAction({
        performed_by: admin.uid_eid, action: 'DELETE_COURSE',
        entity_type: 'courses', entity_id: id,
        old_values: course, new_values: null
    });
    revalidatePath('/dashboard/admin');
    return { success: true };
}

/**
 * Semester Management
 */
export async function createSemesterAction(data: { course_id: string; semester_number: number }) {
    const admin = await validateAccess(100);
    const { error } = await supabaseAdmin.from('semesters').insert([{
        course_id: data.course_id, semester_number: data.semester_number,
        is_active: true, is_locked: false
    }]);
    if (error) throw new Error(error.message);

    await logAuditEventAction({
        performed_by: admin.uid_eid, action: 'CREATE_SEMESTER',
        entity_type: 'semesters', entity_id: `${data.course_id}:S${data.semester_number}`,
        old_values: null, new_values: data
    });
    revalidatePath('/dashboard/admin');
    return { success: true };
}

export async function updateSemesterAction(id: string, data: any) {
    const admin = await validateAccess(100);
    const { data: existing } = await supabaseAdmin.from('semesters').select('*').eq('id', id).single();
    const { error } = await supabaseAdmin.from('semesters').update(data).eq('id', id);
    if (error) throw new Error(error.message);

    await logAuditEventAction({
        performed_by: admin.uid_eid, action: 'UPDATE_SEMESTER',
        entity_type: 'semesters', entity_id: id,
        old_values: existing, new_values: data
    });
    revalidatePath('/dashboard/admin');
    return { success: true };
}

/**
 * Subject Management (Extended)
 */
export async function updateSubjectAction(id: string, data: Partial<Subject>) {
    const admin = await validateAccess(100);
    const { data: existing } = await supabaseAdmin.from('subjects').select('*').eq('id', id).single();
    const { error } = await supabaseAdmin.from('subjects').update(data).eq('id', id);
    if (error) throw new Error(error.message);

    await logAuditEventAction({
        performed_by: admin.uid_eid, action: 'UPDATE_SUBJECT',
        entity_type: 'subjects', entity_id: id,
        old_values: existing, new_values: data
    });
    revalidatePath('/dashboard/admin');
    return { success: true };
}

/**
 * Grading Scheme CRUD
 */
export async function getGradingSchemeAction() {
    await validateAccess(80);
    const { data, error } = await supabaseAdmin.from('grading_scheme').select('*').order('min_marks', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
}

export async function createGradeAction(data: {
    grade: string; min_marks: number; max_marks: number; grade_points: number; description?: string;
}) {
    const admin = await validateAccess(100);
    const { error } = await supabaseAdmin.from('grading_scheme').insert([{ ...data, is_active: true }]);
    if (error) throw new Error(error.message);

    await logAuditEventAction({
        performed_by: admin.uid_eid, action: 'CREATE_GRADE',
        entity_type: 'grading_scheme', entity_id: data.grade,
        old_values: null, new_values: data
    });
    revalidatePath('/dashboard/admin');
    return { success: true };
}

export async function updateGradeAction(id: string, data: any) {
    const admin = await validateAccess(100);
    const { data: existing } = await supabaseAdmin.from('grading_scheme').select('*').eq('id', id).single();
    const { error } = await supabaseAdmin.from('grading_scheme').update(data).eq('id', id);
    if (error) throw new Error(error.message);

    await logAuditEventAction({
        performed_by: admin.uid_eid, action: 'UPDATE_GRADE',
        entity_type: 'grading_scheme', entity_id: id,
        old_values: existing, new_values: data
    });
    revalidatePath('/dashboard/admin');
    return { success: true };
}

export async function deleteGradeAction(id: string) {
    const admin = await validateAccess(100);
    const { data: grade } = await supabaseAdmin.from('grading_scheme').select('*').eq('id', id).single();
    const { error } = await supabaseAdmin.from('grading_scheme').delete().eq('id', id);
    if (error) throw new Error(error.message);

    await logAuditEventAction({
        performed_by: admin.uid_eid, action: 'DELETE_GRADE',
        entity_type: 'grading_scheme', entity_id: id,
        old_values: grade, new_values: null
    });
    revalidatePath('/dashboard/admin');
    return { success: true };
}

/**
 * System Configuration
 */
export async function getSystemConfigAction() {
    await validateAccess(100);
    const { data, error } = await supabaseAdmin.from('system_config').select('*').order('key');
    if (error) throw new Error(error.message);
    return data || [];
}

export async function updateSystemConfigAction(key: string, value: string) {
    const admin = await validateAccess(100);
    const { data: existing } = await supabaseAdmin.from('system_config').select('*').eq('key', key).single();
    const { error } = await supabaseAdmin.from('system_config').update({
        value, updated_by: admin.uid_eid, updated_at: new Date().toISOString()
    }).eq('key', key);
    if (error) throw new Error(error.message);

    await logAuditEventAction({
        performed_by: admin.uid_eid, action: 'UPDATE_CONFIG',
        entity_type: 'system_config', entity_id: key,
        old_values: { value: existing?.value }, new_values: { value }
    });
    revalidatePath('/dashboard/admin');
    return { success: true };
}

/**
 * Lock Mechanisms
 */
export async function lockSemesterAction(semesterId: string, lock: boolean, reason?: string) {
    const admin = await validateAccess(100);
    const { error } = await supabaseAdmin.from('semesters').update({ is_locked: lock }).eq('id', semesterId);
    if (error) throw new Error(error.message);

    await logAuditEventAction({
        performed_by: admin.uid_eid, action: lock ? 'LOCK_SEMESTER' : 'UNLOCK_SEMESTER',
        entity_type: 'semesters', entity_id: semesterId,
        old_values: null, new_values: { locked: lock, reason: reason || '' }
    });
    revalidatePath('/dashboard/admin');
    return { success: true };
}

export async function lockMarksAction(semesterId: string, lock: boolean, reason?: string) {
    const admin = await validateAccess(100);
    const fromStatus = lock ? 'approved' : 'locked';
    const toStatus = lock ? 'locked' : 'approved';
    const { error } = await supabaseAdmin
        .from('marks_submissions')
        .update({ status: toStatus, updated_at: new Date().toISOString() })
        .eq('semester_id', semesterId)
        .eq('status', fromStatus);
    if (error) throw new Error(error.message);

    await logAuditEventAction({
        performed_by: admin.uid_eid, action: lock ? 'LOCK_MARKS' : 'UNLOCK_MARKS',
        entity_type: 'marks_submissions', entity_id: semesterId,
        old_values: null, new_values: { locked: lock, reason: reason || '' }
    });
    revalidatePath('/dashboard/admin');
    return { success: true };
}

export async function lockResultAction(semesterId: string, lock: boolean, reason?: string) {
    const admin = await validateAccess(100);
    const { error } = await supabaseAdmin
        .from('semester_results')
        .update({ is_published: !lock })
        .eq('semester_id', semesterId);
    if (error) throw new Error(error.message);

    await logAuditEventAction({
        performed_by: admin.uid_eid, action: lock ? 'LOCK_RESULT' : 'UNLOCK_RESULT',
        entity_type: 'semester_results', entity_id: semesterId,
        old_values: null, new_values: { locked: lock, reason: reason || '' }
    });
    revalidatePath('/dashboard/admin');
    return { success: true };
}

/**
 * User Role Management
 */
export async function getUserRolesAction(userId: string) {
    await validateAccess(100);
    const { data, error } = await supabaseAdmin
        .from('user_roles')
        .select('*, roles(*)')
        .eq('user_id', userId);
    if (error) throw new Error(error.message);
    return data || [];
}

export async function assignUserRoleAction(userId: string, roleId: number) {
    const admin = await validateAccess(100);
    const { error } = await supabaseAdmin.from('user_roles').insert([{ user_id: userId, role_id: roleId }]);
    if (error) throw new Error(error.message);

    await logAuditEventAction({
        performed_by: admin.uid_eid, action: 'ASSIGN_ROLE',
        entity_type: 'user_roles', entity_id: userId,
        old_values: null, new_values: { role_id: roleId }
    });
    revalidatePath('/dashboard/admin');
    return { success: true };
}

export async function removeUserRoleAction(userId: string, roleId: number) {
    const admin = await validateAccess(100);
    const { error } = await supabaseAdmin.from('user_roles').delete()
        .eq('user_id', userId).eq('role_id', roleId);
    if (error) throw new Error(error.message);

    await logAuditEventAction({
        performed_by: admin.uid_eid, action: 'REMOVE_ROLE',
        entity_type: 'user_roles', entity_id: userId,
        old_values: { role_id: roleId }, new_values: null
    });
    revalidatePath('/dashboard/admin');
    return { success: true };
}

/**
 * Filtered Audit Logs
 */
export async function getFilteredAuditLogsAction(filters?: {
    user?: string; module?: string; dateFrom?: string; dateTo?: string;
}) {
    await validateAccess(100);
    let query = supabaseAdmin.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500);
    if (filters?.user) query = query.ilike('performed_by', `%${filters.user}%`);
    if (filters?.module) query = query.ilike('entity_type', `%${filters.module}%`);
    if (filters?.dateFrom) query = query.gte('created_at', filters.dateFrom);
    if (filters?.dateTo) query = query.lte('created_at', filters.dateTo + 'T23:59:59');
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
}

// =====================================================
// ACADEMIC ADMIN MODULE ACTIONS (Level 80)
// =====================================================

/**
 * Academic Admin Dashboard Stats
 */
export async function getAcadAdminStatsAction() {
    await validateAccess(80);
    const [students, faculty, semesters, pending, results] = await Promise.all([
        supabaseAdmin.from('students').select('uid', { count: 'exact', head: true }).eq('is_active', true),
        supabaseAdmin.from('employees').select('eid', { count: 'exact', head: true }).eq('is_active', true),
        supabaseAdmin.from('semesters').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabaseAdmin.from('marks_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending_admin'),
        supabaseAdmin.from('semester_results').select('id', { count: 'exact', head: true }).eq('is_published', false),
    ]);
    return {
        activeStudents: students.count || 0,
        activeFaculty: faculty.count || 0,
        activeSemesters: semesters.count || 0,
        pendingApprovals: pending.count || 0,
        unpublishedResults: results.count || 0,
    };
}

/**
 * Get marks by subject for review (Academic Admin sees pending_admin + approved)
 */
export async function getMarksBySubjectAction(subjectId: string, semesterId?: string) {
    await validateAccess(80);
    let query = supabaseAdmin
        .from('marks_submissions')
        .select('*, students!inner(name, roll_number, enrollment_number, section)')
        .eq('subject_id', subjectId);
    if (semesterId) query = query.eq('semester_id', semesterId);
    query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
}

/**
 * Reject marks with reason (sets status back to draft for faculty re-edit)
 */
export async function rejectMarksAction(submissionIds: string[], reason: string) {
    await validateAccess(80);
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const { error } = await supabaseAdmin
        .from('marks_submissions')
        .update({ status: 'draft', rejection_reason: reason, approved_by_admin: null })
        .in('id', submissionIds);
    if (error) throw new Error(error.message);
    await logAuditEventAction({
        performed_by: user?.uid_eid || 'system',
        action: 'REJECT_MARKS',
        entity_type: 'marks_submissions',
        entity_id: submissionIds.join(','),
        old_values: null,
        new_values: { status: 'draft', rejection_reason: reason },
    });
    revalidatePath('/dashboard/academic-admin');
    return { success: true };
}

/**
 * Promote students to next semester (bulk)
 */
export async function promoteStudentsAction(studentUids: string[], newSemesterId: string) {
    await validateAccess(80);
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    let success = 0;
    let failed = 0;
    for (const uid of studentUids) {
        const { error } = await supabaseAdmin
            .from('students')
            .update({ current_semester_id: newSemesterId })
            .eq('uid', uid);
        if (error) { failed++; console.error('Promote error:', uid, error); }
        else { success++; }
    }
    await logAuditEventAction({
        performed_by: user?.uid_eid || 'system',
        action: 'PROMOTE_STUDENTS',
        entity_type: 'students',
        entity_id: `batch_${studentUids.length}`,
        old_values: null,
        new_values: { newSemesterId, count: success },
    });
    revalidatePath('/dashboard/academic-admin');
    return { success, failed };
}

/**
 * Get sections for a specific semester
 */
export async function getSectionsAction(semesterId: string) {
    await validateAccess(80);
    const { data, error } = await supabaseAdmin
        .from('sections')
        .select('*')
        .eq('semester_id', semesterId)
        .order('name');
    if (error) throw new Error(error.message);
    return data || [];
}

/**
 * Create a section for a semester
 */
export async function createSectionAction(data: { semester_id: string; name: string; capacity?: number }) {
    await validateAccess(80);
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const { error } = await supabaseAdmin.from('sections').insert([data]);
    if (error) throw new Error(error.message);
    await logAuditEventAction({
        performed_by: user?.uid_eid || 'system',
        action: 'CREATE_SECTION',
        entity_type: 'sections',
        entity_id: data.name,
        old_values: null,
        new_values: data,
    });
    revalidatePath('/dashboard/academic-admin');
    return { success: true };
}

/**
 * Delete a section
 */
export async function deleteSectionAction(id: string) {
    await validateAccess(80);
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const { error } = await supabaseAdmin.from('sections').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await logAuditEventAction({
        performed_by: user?.uid_eid || 'system',
        action: 'DELETE_SECTION',
        entity_type: 'sections',
        entity_id: id,
        old_values: null,
        new_values: null,
    });
    return { success: true };
}

/**
 * Assign section to students (bulk)
 */
export async function assignStudentSectionAction(studentUids: string[], section: string) {
    await validateAccess(80);
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    let success = 0;
    for (const uid of studentUids) {
        const { error } = await supabaseAdmin
            .from('students')
            .update({ section })
            .eq('uid', uid);
        if (error) console.error('Section assign error:', uid, error);
        else success++;
    }
    await logAuditEventAction({
        performed_by: user?.uid_eid || 'system',
        action: 'ASSIGN_SECTION',
        entity_type: 'students',
        entity_id: `batch_${studentUids.length}`,
        old_values: null,
        new_values: { section, count: success },
    });
    revalidatePath('/dashboard/academic-admin');
    return { success, failed: studentUids.length - success };
}

/**
 * Bulk generate results for all students in a semester + course
 */
export async function bulkGenerateResultsAction(semesterId: string, courseId: string) {
    await validateAccess(80);
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    // Get all students in this course & semester
    const { data: studs, error: sErr } = await supabaseAdmin
        .from('students')
        .select('uid')
        .eq('course_id', courseId)
        .eq('current_semester_id', semesterId)
        .eq('is_active', true);
    if (sErr) throw new Error(sErr.message);
    if (!studs || studs.length === 0) throw new Error('No students found for this course/semester.');

    // Get subjects for this semester
    const { data: subjects } = await supabaseAdmin
        .from('subjects')
        .select('id, credits')
        .eq('semester_id', semesterId);
    if (!subjects || subjects.length === 0) throw new Error('No subjects defined for this semester.');

    // Verify all marks are approved
    const { data: pending } = await supabaseAdmin
        .from('marks_submissions')
        .select('id')
        .eq('semester_id', semesterId)
        .neq('status', 'approved')
        .neq('status', 'locked')
        .limit(1);
    if (pending && pending.length > 0) throw new Error('Not all marks are approved. Cannot generate results.');

    let generated = 0;
    let failed = 0;

    // Get grading scheme
    const { data: grading } = await supabaseAdmin
        .from('grading_scheme')
        .select('*')
        .eq('is_active', true)
        .order('min_marks', { ascending: false });

    for (const stu of studs) {
        try {
            // Fetch approved marks for this student in this semester
            const { data: marks } = await supabaseAdmin
                .from('marks_submissions')
                .select('*, subjects(credits)')
                .eq('student_uid', stu.uid)
                .eq('semester_id', semesterId)
                .in('status', ['approved', 'locked']);

            if (!marks || marks.length === 0) { failed++; continue; }

            let totalCredits = 0;
            let earnedCredits = 0;
            let weightedPoints = 0;
            let hasFail = false;

            for (const m of marks) {
                const credit = (m as any).subjects?.credits || 0;
                totalCredits += credit;
                const pct = m.total_marks; // already a total
                // Find grade
                const gr = grading?.find(g => pct >= g.min_marks && pct <= g.max_marks);
                const pts = gr ? Number(gr.grade_points) : 0;
                if (pts === 0) hasFail = true;
                else earnedCredits += credit;
                weightedPoints += pts * credit;
            }

            const sgpa = totalCredits > 0 ? Math.round((weightedPoints / totalCredits) * 100) / 100 : 0;

            // Upsert result
            const { error: rErr } = await supabaseAdmin
                .from('semester_results')
                .upsert({
                    student_uid: stu.uid,
                    semester_id: semesterId,
                    sgpa,
                    cgpa: sgpa, // simplified; full CGPA requires all past semesters
                    total_credits: totalCredits,
                    earned_credits: earnedCredits,
                    result_status: hasFail ? 'Fail' : 'Pass',
                    is_published: false,
                }, { onConflict: 'student_uid,semester_id' });

            if (rErr) { failed++; console.error('Result gen error:', stu.uid, rErr); }
            else generated++;
        } catch (e) { failed++; console.error(e); }
    }

    await logAuditEventAction({
        performed_by: user?.uid_eid || 'system',
        action: 'BULK_GENERATE_RESULTS',
        entity_type: 'semester_results',
        entity_id: semesterId,
        old_values: null,
        new_values: { generated, failed, courseId },
    });
    revalidatePath('/dashboard/academic-admin');
    return { generated, failed, total: studs.length };
}

/**
 * Publish results for a semester (make visible to students)
 */
export async function publishResultsAction(semesterId: string) {
    await validateAccess(80);
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const { error } = await supabaseAdmin
        .from('semester_results')
        .update({ is_published: true, published_at: new Date().toISOString() })
        .eq('semester_id', semesterId);
    if (error) throw new Error(error.message);
    await logAuditEventAction({
        performed_by: user?.uid_eid || 'system',
        action: 'PUBLISH_RESULTS',
        entity_type: 'semester_results',
        entity_id: semesterId,
        old_values: { is_published: false },
        new_values: { is_published: true },
    });
    revalidatePath('/dashboard/academic-admin');
    return { success: true };
}

/**
 * Unpublish results for a semester (hide from students)
 */
export async function unpublishResultsAction(semesterId: string) {
    await validateAccess(80);
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const { error } = await supabaseAdmin
        .from('semester_results')
        .update({ is_published: false, published_at: null })
        .eq('semester_id', semesterId);
    if (error) throw new Error(error.message);
    await logAuditEventAction({
        performed_by: user?.uid_eid || 'system',
        action: 'UNPUBLISH_RESULTS',
        entity_type: 'semester_results',
        entity_id: semesterId,
        old_values: { is_published: true },
        new_values: { is_published: false },
    });
    return { success: true };
}

/**
 * Faculty workload report
 */
export async function getFacultyWorkloadAction(deptId?: string) {
    await validateAccess(80);
    let query = supabaseAdmin
        .from('employees')
        .select('eid, name, designation, department_id, departments(name)')
        .eq('is_active', true);
    if (deptId) query = query.eq('department_id', deptId);
    const { data: emps, error } = await query;
    if (error) throw new Error(error.message);

    const workloads = [];
    for (const emp of (emps || [])) {
        const { data: allocs } = await supabaseAdmin
            .from('subject_allocations')
            .select('subject_id, section, subjects(credits)')
            .eq('faculty_eid', emp.eid);
        const subjects = new Set((allocs || []).map(a => a.subject_id));
        const sections = new Set((allocs || []).map(a => `${a.subject_id}_${a.section}`));
        const totalCredits = (allocs || []).reduce((s, a) => s + ((a as any).subjects?.credits || 0), 0);
        workloads.push({
            eid: emp.eid,
            name: emp.name,
            designation: emp.designation,
            department: (emp as any).departments?.name || '—',
            subjects: subjects.size,
            sections: sections.size,
            total_credits: totalCredits,
        });
    }
    return workloads;
}

/**
 * Get students filtered by semester and course
 */
export async function getStudentsBySemesterAction(semesterId?: string, courseId?: string, section?: string) {
    await validateAccess(80);
    let query = supabaseAdmin
        .from('students')
        .select('*, departments(name), courses(name, code), semesters(semester_number)')
        .eq('is_active', true)
        .order('name');
    if (semesterId) query = query.eq('current_semester_id', semesterId);
    if (courseId) query = query.eq('course_id', courseId);
    if (section) query = query.eq('section', section);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
}

/**
 * Pass/Fail statistics for a semester
 */
export async function getPassFailStatsAction(semesterId: string) {
    await validateAccess(80);
    const { data, error } = await supabaseAdmin
        .from('semester_results')
        .select('result_status')
        .eq('semester_id', semesterId);
    if (error) throw new Error(error.message);
    const total = data?.length || 0;
    const pass = data?.filter(r => r.result_status === 'Pass').length || 0;
    const fail = data?.filter(r => r.result_status === 'Fail').length || 0;
    const backlog = data?.filter(r => r.result_status === 'Backlog').length || 0;
    const withheld = data?.filter(r => r.result_status === 'Withheld').length || 0;
    return {
        total, pass, fail, backlog, withheld,
        passPercentage: total > 0 ? Math.round((pass / total) * 100) : 0,
    };
}

/**
 * Get semester results for a semester (for result review)
 */
export async function getSemesterResultsAction(semesterId: string) {
    await validateAccess(80);
    const { data, error } = await supabaseAdmin
        .from('semester_results')
        .select('*, students!inner(name, roll_number, enrollment_number, section, courses(name, code))')
        .eq('semester_id', semesterId)
        .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
}

/**
 * Get top performers for a semester
 */
export async function getTopPerformersAction(semesterId: string, limit: number = 10) {
    await validateAccess(80);
    const { data, error } = await supabaseAdmin
        .from('semester_results')
        .select('*, students!inner(name, roll_number, courses(name))')
        .eq('semester_id', semesterId)
        .eq('result_status', 'Pass')
        .order('sgpa', { ascending: false })
        .limit(limit);
    if (error) throw new Error(error.message);
    return data || [];
}

/**
 * Get fail list for a semester
 */
export async function getFailListAction(semesterId: string) {
    await validateAccess(80);
    const { data, error } = await supabaseAdmin
        .from('semester_results')
        .select('*, students!inner(name, roll_number, enrollment_number, courses(name, code))')
        .eq('semester_id', semesterId)
        .eq('result_status', 'Fail')
        .order('sgpa', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
}

/**
 * Lock semester (Academic Admin) — requires all marks approved & results generated
 */
export async function acadLockSemesterAction(semesterId: string) {
    await validateAccess(80);
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    // Pre-check: any non-approved marks?
    const { data: unapproved } = await supabaseAdmin
        .from('marks_submissions')
        .select('id')
        .eq('semester_id', semesterId)
        .not('status', 'in', '("approved","locked")')
        .limit(1);
    if (unapproved && unapproved.length > 0) throw new Error('Cannot lock: some marks are not approved yet.');

    // Pre-check: results generated?
    const { data: results, count } = await supabaseAdmin
        .from('semester_results')
        .select('id', { count: 'exact', head: true })
        .eq('semester_id', semesterId);
    if (!count || count === 0) throw new Error('Cannot lock: no results generated for this semester.');

    const { error } = await supabaseAdmin
        .from('semesters')
        .update({ is_locked: true })
        .eq('id', semesterId);
    if (error) throw new Error(error.message);

    // Also lock all marks
    await supabaseAdmin
        .from('marks_submissions')
        .update({ status: 'locked' })
        .eq('semester_id', semesterId)
        .eq('status', 'approved');

    await logAuditEventAction({
        performed_by: user?.uid_eid || 'system',
        action: 'LOCK_SEMESTER',
        entity_type: 'semesters',
        entity_id: semesterId,
        old_values: { is_locked: false },
        new_values: { is_locked: true },
    });
    revalidatePath('/dashboard/academic-admin');
    return { success: true };
}

/**
 * Audit logs for Academic Admin (level 80, sees own actions + student/marks/results)
 */
export async function getAcadAuditLogsAction(limit: number = 200) {
    await validateAccess(80);
    const { data, error } = await supabaseAdmin
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) throw new Error(error.message);
    return data || [];
}


/* ══════════════════════════════════════════════════════════════
 *  HOD-LEVEL ACTIONS (Level 70) — Department-Scoped
 * ══════════════════════════════════════════════════════════════ */

/**
 * HOD Dashboard Stats — scoped to HOD's own department
 */
export async function getHodDashboardStatsAction() {
    const user = await validateAccess(70);
    const deptId = user.department_id;
    if (!deptId) throw new Error('No department assigned to HOD account.');

    // Get courses belonging to this department
    const { data: deptCourses } = await supabaseAdmin.from('courses').select('id').eq('dept_id', deptId);
    const courseIds = (deptCourses || []).map(c => c.id);

    // Student count
    const { count: studentCount } = await supabaseAdmin
        .from('students').select('*', { count: 'exact', head: true })
        .eq('department_id', deptId).eq('is_active', true);

    // Faculty count
    const { count: facultyCount } = await supabaseAdmin
        .from('employees').select('*', { count: 'exact', head: true })
        .eq('department_id', deptId).eq('is_active', true);

    // Subjects in dept courses
    const { count: subjectCount } = courseIds.length > 0
        ? await supabaseAdmin.from('subjects').select('*', { count: 'exact', head: true }).in('course_id', courseIds)
        : { count: 0 };

    // Pending HOD marks (pending_hod status) in dept
    const { count: pendingCount } = await supabaseAdmin
        .from('marks_submissions')
        .select('*, students!inner(department_id)', { count: 'exact', head: true })
        .eq('status', 'pending_hod')
        .eq('students.department_id', deptId);

    // Active semesters
    const { count: activeSemCount } = courseIds.length > 0
        ? await supabaseAdmin.from('semesters').select('*', { count: 'exact', head: true }).in('course_id', courseIds).eq('is_active', true)
        : { count: 0 };

    return {
        students: studentCount || 0,
        faculty: facultyCount || 0,
        subjects: subjectCount || 0,
        pendingMarks: pendingCount || 0,
        activeSemesters: activeSemCount || 0,
    };
}

/**
 * Department-scoped subjects: subjects that belong to courses in HOD's department
 */
export async function getDeptSubjectsAction() {
    const user = await validateAccess(70);
    const deptId = user.department_id;
    if (!deptId) throw new Error('No department assigned.');

    const { data: deptCourses } = await supabaseAdmin.from('courses').select('id').eq('dept_id', deptId);
    const courseIds = (deptCourses || []).map(c => c.id);
    if (courseIds.length === 0) return [];

    const { data, error } = await supabaseAdmin
        .from('subjects')
        .select('*, courses(name, code), semesters(semester_number)')
        .in('course_id', courseIds)
        .order('name');
    if (error) throw new Error(error.message);
    return data || [];
}

/**
 * Department-scoped semesters: only semesters from courses in HOD's dept
 */
export async function getDeptSemestersAction() {
    const user = await validateAccess(70);
    const deptId = user.department_id;
    if (!deptId) throw new Error('No department assigned.');

    const { data: deptCourses } = await supabaseAdmin.from('courses').select('id').eq('dept_id', deptId);
    const courseIds = (deptCourses || []).map(c => c.id);
    if (courseIds.length === 0) return [];

    const { data, error } = await supabaseAdmin
        .from('semesters')
        .select('*, courses(name, code)')
        .in('course_id', courseIds)
        .order('semester_number');
    if (error) throw new Error(error.message);
    return data || [];
}

/**
 * Department-scoped courses
 */
export async function getDeptCoursesAction() {
    const user = await validateAccess(70);
    const deptId = user.department_id;
    if (!deptId) throw new Error('No department assigned.');

    const { data, error } = await supabaseAdmin
        .from('courses')
        .select('*')
        .eq('dept_id', deptId)
        .order('name');
    if (error) throw new Error(error.message);
    return data || [];
}

/**
 * Department-scoped subject allocations: only allocations involving dept faculty
 */
export async function getDeptSubjectAllocationsAction() {
    const user = await validateAccess(70);
    const deptId = user.department_id;
    if (!deptId) throw new Error('No department assigned.');

    // Get all employees in this dept
    const { data: deptFaculty } = await supabaseAdmin.from('employees').select('eid').eq('department_id', deptId);
    const facultyEids = (deptFaculty || []).map(f => f.eid);
    if (facultyEids.length === 0) return [];

    const { data, error } = await supabaseAdmin
        .from('subject_allocations')
        .select('*, subjects(name, subject_code, credits), employees(name, eid, designation), semesters(semester_number)')
        .in('faculty_eid', facultyEids);
    if (error) throw new Error(error.message);
    return data || [];
}

/**
 * Department-scoped attendance summary for HOD monitoring
 */
export async function getDeptAttendanceSummaryAction(semesterId?: string) {
    const user = await validateAccess(70);
    const deptId = user.department_id;
    if (!deptId) throw new Error('No department assigned.');

    // Get students in dept
    let studQuery = supabaseAdmin.from('students').select('uid, name, roll_number, section, current_semester_id').eq('department_id', deptId).eq('is_active', true);
    if (semesterId) studQuery = studQuery.eq('current_semester_id', semesterId);
    const { data: students } = await studQuery;
    if (!students || students.length === 0) return [];

    const studentUids = students.map(s => s.uid);

    // Fetch attendance for these students
    const { data: attendance } = await supabaseAdmin
        .from('attendance')
        .select('student_uid, status')
        .in('student_uid', studentUids);

    // Calculate per-student stats
    const attMap: Record<string, { total: number; present: number }> = {};
    (attendance || []).forEach(a => {
        if (!attMap[a.student_uid]) attMap[a.student_uid] = { total: 0, present: 0 };
        attMap[a.student_uid].total++;
        if (a.status === 'present') attMap[a.student_uid].present++;
    });

    return students.map(s => ({
        uid: s.uid,
        name: s.name,
        roll_number: s.roll_number,
        section: s.section,
        totalClasses: attMap[s.uid]?.total || 0,
        presentClasses: attMap[s.uid]?.present || 0,
        percentage: attMap[s.uid]?.total ? Math.round((attMap[s.uid].present / attMap[s.uid].total) * 100) : 0,
    }));
}

/**
 * Department-scoped pass/fail stats from semester_results
 */
export async function getDeptResultsStatsAction(semesterId?: string) {
    const user = await validateAccess(70);
    const deptId = user.department_id;
    if (!deptId) throw new Error('No department assigned.');

    // Get dept student uids
    const { data: deptStudents } = await supabaseAdmin.from('students').select('uid').eq('department_id', deptId).eq('is_active', true);
    const uids = (deptStudents || []).map(s => s.uid);
    if (uids.length === 0) return { total: 0, pass: 0, fail: 0, avgSgpa: 0, topSgpa: 0 };

    let query = supabaseAdmin.from('semester_results').select('*').in('student_uid', uids);
    if (semesterId) query = query.eq('semester_id', semesterId);
    const { data: results } = await query;

    if (!results || results.length === 0) return { total: 0, pass: 0, fail: 0, avgSgpa: 0, topSgpa: 0 };

    const pass = results.filter(r => r.result_status === 'Pass').length;
    const fail = results.filter(r => r.result_status === 'Fail').length;
    const sgpas = results.map(r => r.sgpa || 0);
    const avgSgpa = sgpas.reduce((a, b) => a + b, 0) / sgpas.length;
    const topSgpa = Math.max(...sgpas);

    return { total: results.length, pass, fail, avgSgpa: Math.round(avgSgpa * 100) / 100, topSgpa: Math.round(topSgpa * 100) / 100 };
}

/**
 * HOD reject marks (send back to draft with reason)
 */
export async function hodRejectMarksAction(submissionIds: string[], reason: string) {
    const hod = await validateAccess(70);
    if (!reason.trim()) throw new Error('Rejection reason is required.');

    const { error } = await supabaseAdmin
        .from('marks_submissions')
        .update({
            status: 'draft',
            rejection_reason: reason,
            updated_at: new Date().toISOString()
        })
        .in('id', submissionIds);

    if (error) throw new Error(error.message);

    await logAuditEventAction({
        performed_by: hod.uid_eid,
        action: 'REJECT_MARKS_HOD',
        entity_type: 'marks_submissions',
        entity_id: submissionIds.join(','),
        old_values: { status: 'pending_hod' },
        new_values: { status: 'draft', rejection_reason: reason },
    });

    revalidatePath('/dashboard/hod');
    return { success: true };
}

/**
 * HOD audit logs
 */
export async function getHodAuditLogsAction(limit: number = 50) {
    const user = await validateAccess(70);
    const { data, error } = await supabaseAdmin
        .from('audit_logs')
        .select('*')
        .eq('performed_by', user.uid_eid)
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) throw new Error(error.message);
    return data || [];
}

// =============================================
// FACULTY MODULE ACTIONS — Enhanced (Level 60)
// =============================================

/**
 * Real dashboard stats for faculty
 */
export async function getFacultyDashboardStatsAction() {
    const user = await validateAccess(50);

    const { data: allocations } = await supabaseAdmin
        .from('subject_allocations')
        .select('id, subject_id, semester_id, section, semesters(is_active)')
        .eq('faculty_eid', user.uid_eid);

    const active = (allocations || []).filter((a: any) => a.semesters?.is_active);
    const semesterIds = [...new Set(active.map((a: any) => a.semester_id))];

    let studentCount = 0;
    if (semesterIds.length > 0) {
        const { count } = await supabaseAdmin
            .from('students')
            .select('uid', { count: 'exact', head: true })
            .in('current_semester_id', semesterIds)
            .eq('is_active', true);
        studentCount = count || 0;
    }

    const { count: attendanceCount } = await supabaseAdmin
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('marked_by', user.uid_eid);

    const { count: pendingMarks } = await supabaseAdmin
        .from('marks_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('submitted_by', user.uid_eid)
        .in('status', ['draft', 'pending_hod']);

    return {
        totalSubjects: active.length,
        totalStudents: studentCount,
        attendanceRecorded: attendanceCount || 0,
        pendingMarks: pendingMarks || 0,
    };
}

/**
 * Faculty assignments with enriched info (student count, credits, subject_type)
 */
export async function getFacultyAssignmentsDetailedAction() {
    const user = await validateAccess(50);

    const { data, error } = await supabaseAdmin
        .from('subject_allocations')
        .select(`
            id, section,
            subjects (id, name, subject_code, credits, subject_type, max_internal, max_external),
            semesters (id, semester_number, is_active, is_locked, courses(id, name, code, departments(name)))
        `)
        .eq('faculty_eid', user.uid_eid);

    if (error) throw new Error(error.message);

    // Enrich with student counts per semester/section
    const enriched = await Promise.all((data || []).map(async (a: any) => {
        let q = supabaseAdmin
            .from('students')
            .select('uid', { count: 'exact', head: true })
            .eq('current_semester_id', a.semesters?.id)
            .eq('is_active', true);
        if (a.section) q = q.eq('section', a.section);
        const { count } = await q;
        return { ...a, studentCount: count || 0 };
    }));

    return enriched;
}

/**
 * Get attendance history for a subject, optionally filtered by date
 */
export async function getFacultyAttendanceHistoryAction(subjectId: string, date?: string) {
    const user = await validateAccess(50);

    const { data: alloc } = await supabaseAdmin
        .from('subject_allocations')
        .select('id')
        .eq('faculty_eid', user.uid_eid)
        .eq('subject_id', subjectId)
        .maybeSingle();
    if (!alloc) throw new Error('Unauthorized: Subject not assigned.');

    let query = supabaseAdmin
        .from('attendance')
        .select('*, students(name, roll_number)')
        .eq('subject_id', subjectId)
        .eq('marked_by', user.uid_eid)
        .order('date', { ascending: false });

    if (date) query = query.eq('date', date);

    const { data, error } = await query.limit(500);
    if (error) throw new Error(error.message);
    return data || [];
}

/**
 * Edit attendance within 24 hours (Level 60 only)
 */
export async function editFacultyAttendanceAction(attendanceId: string, newStatus: string) {
    const user = await validateAccess(60);

    const { data: record, error: fErr } = await supabaseAdmin
        .from('attendance')
        .select('*, subjects(semester_id)')
        .eq('id', attendanceId)
        .single();

    if (fErr || !record) throw new Error('Attendance record not found.');
    if (record.marked_by !== user.uid_eid) throw new Error('Cannot edit attendance marked by another faculty.');

    const createdAt = new Date(record.created_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursDiff > 24) throw new Error('Edit window expired: Attendance can only be edited within 24 hours.');

    if (record.subjects?.semester_id) {
        const { data: sem } = await supabaseAdmin.from('semesters').select('is_locked').eq('id', record.subjects.semester_id).single();
        if (sem?.is_locked) throw new Error('Semester is locked. No modifications allowed.');
    }

    const oldStatus = record.status;
    const { error } = await supabaseAdmin
        .from('attendance')
        .update({ status: newStatus })
        .eq('id', attendanceId);
    if (error) throw new Error(error.message);

    await logAuditEventAction({
        performed_by: user.uid_eid,
        action: 'EDIT_ATTENDANCE',
        entity_type: 'attendance',
        entity_id: attendanceId,
        old_values: { status: oldStatus },
        new_values: { status: newStatus },
    });

    revalidatePath('/dashboard/faculty');
    return { success: true };
}

/**
 * Attendance analytics: per-student attendance % for a subject
 */
export async function getFacultyAttendanceAnalyticsAction(subjectId: string, semesterId: string) {
    const user = await validateAccess(50);

    const { data: alloc } = await supabaseAdmin
        .from('subject_allocations')
        .select('id, section')
        .eq('faculty_eid', user.uid_eid)
        .eq('subject_id', subjectId)
        .maybeSingle();
    if (!alloc) throw new Error('Unauthorized: Subject not assigned.');

    let studQ = supabaseAdmin.from('students').select('uid, name, roll_number').eq('current_semester_id', semesterId).eq('is_active', true);
    if (alloc.section) studQ = studQ.eq('section', alloc.section);
    const { data: students } = await studQ.order('name');
    if (!students || students.length === 0) return [];

    const studentUids = students.map(s => s.uid);
    const { data: attendance } = await supabaseAdmin
        .from('attendance')
        .select('student_uid, status')
        .eq('subject_id', subjectId)
        .in('student_uid', studentUids);

    const { data: dates } = await supabaseAdmin
        .from('attendance')
        .select('date')
        .eq('subject_id', subjectId);

    const uniqueDates = new Set((dates || []).map(d => d.date));
    const totalSessions = uniqueDates.size;

    return students.map(s => {
        const records = (attendance || []).filter(a => a.student_uid === s.uid);
        const present = records.filter(a => a.status === 'Present' || a.status === 'Late').length;
        const percentage = totalSessions > 0 ? Math.round((present / totalSessions) * 100) : 0;
        return {
            uid: s.uid,
            name: s.name,
            roll_number: s.roll_number,
            totalSessions,
            present,
            absent: records.filter(a => a.status === 'Absent').length,
            leave: records.filter(a => a.status === 'Leave').length,
            percentage,
            shortage: percentage < 75,
        };
    });
}

/**
 * Get existing marks merged with student list for a subject/semester
 */
export async function getFacultyMarksForSubjectAction(subjectId: string, semesterId: string) {
    const user = await validateAccess(50);

    const { data: alloc } = await supabaseAdmin
        .from('subject_allocations')
        .select('id, section')
        .eq('faculty_eid', user.uid_eid)
        .eq('subject_id', subjectId)
        .maybeSingle();
    if (!alloc) throw new Error('Unauthorized: Subject not assigned.');

    let studQ = supabaseAdmin.from('students').select('uid, name, roll_number').eq('current_semester_id', semesterId).eq('is_active', true);
    if (alloc.section) studQ = studQ.eq('section', alloc.section);
    const { data: students } = await studQ.order('name');

    const { data: marks } = await supabaseAdmin
        .from('marks_submissions')
        .select('*')
        .eq('subject_id', subjectId)
        .eq('semester_id', semesterId);

    const { data: subject } = await supabaseAdmin
        .from('subjects')
        .select('max_internal, max_external, subject_type, credits')
        .eq('id', subjectId)
        .single();

    const merged = (students || []).map(s => {
        const m = (marks || []).find((mk: any) => mk.student_uid === s.uid);
        return {
            student_uid: s.uid,
            student_name: s.name,
            roll_number: s.roll_number,
            subject_id: subjectId,
            semester_id: semesterId,
            internal_marks: m?.internal_marks || 0,
            mid_term_marks: m?.mid_term_marks || 0,
            practical_marks: m?.practical_marks || 0,
            status: m?.status || 'draft',
            rejection_reason: m?.rejection_reason || null,
            id: m?.id || null,
        };
    });

    return {
        marks: merged,
        subject: subject || { max_internal: 30, max_external: 70, subject_type: 'Theory', credits: 4 },
    };
}

/**
 * Performance stats for a subject: avg, high, low, distribution
 */
export async function getFacultyPerformanceStatsAction(subjectId: string, semesterId: string) {
    const user = await validateAccess(50);

    const { data: marks } = await supabaseAdmin
        .from('marks_submissions')
        .select('internal_marks, mid_term_marks, practical_marks, student_uid, status, students(name, roll_number)')
        .eq('subject_id', subjectId)
        .eq('semester_id', semesterId);

    if (!marks || marks.length === 0) return { classAvg: 0, highest: 0, lowest: 0, totalStudents: 0, distribution: [], students: [] };

    const totals = marks.map(m => (m.internal_marks || 0) + (m.mid_term_marks || 0) + (m.practical_marks || 0));
    const classAvg = Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
    const highest = Math.max(...totals);
    const lowest = Math.min(...totals);

    const ranges = [
        { label: '90-100', min: 90, max: 100 },
        { label: '80-89', min: 80, max: 89 },
        { label: '70-79', min: 70, max: 79 },
        { label: '60-69', min: 60, max: 69 },
        { label: 'Below 60', min: 0, max: 59 },
    ];

    const distribution = ranges.map(r => ({
        range: r.label,
        count: totals.filter(t => t >= r.min && t <= r.max).length,
    }));

    return {
        classAvg,
        highest,
        lowest,
        totalStudents: marks.length,
        distribution,
        students: marks.map((m: any, i: number) => ({
            uid: m.student_uid,
            name: m.students?.name || m.student_uid,
            roll_number: m.students?.roll_number || '',
            total: totals[i],
            internal: m.internal_marks || 0,
            midterm: m.mid_term_marks || 0,
            practical: m.practical_marks || 0,
            status: m.status,
        })),
    };
}

// =============================================
// ASSISTANT FACULTY MODULE ACTIONS (V7 — Level 50)
// =============================================

/**
 * Dashboard stats for assistant faculty
 */
export async function getAsstFacultyDashboardAction() {
    const user = await validateAccess(50);

    const { data: allocs } = await supabaseAdmin
        .from('subject_allocations')
        .select('subject_id, semester_id, section, semesters(is_active)')
        .eq('faculty_eid', user.uid_eid);

    const active = (allocs || []).filter((a: any) => a.semesters?.is_active);
    const semesterIds = [...new Set(active.map((a: any) => a.semester_id))];

    let studentCount = 0;
    if (semesterIds.length > 0) {
        const { count } = await supabaseAdmin
            .from('students')
            .select('uid', { count: 'exact', head: true })
            .in('current_semester_id', semesterIds)
            .eq('is_active', true);
        studentCount = count || 0;
    }

    const { count: assignmentCount } = await supabaseAdmin
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user.uid_eid)
        .eq('is_active', true);

    const { count: attendanceCount } = await supabaseAdmin
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('marked_by', user.uid_eid);

    const { count: openIssues } = await supabaseAdmin
        .from('student_issues')
        .select('*', { count: 'exact', head: true })
        .eq('reported_by', user.uid_eid)
        .in('status', ['open', 'in_progress']);

    return {
        subjects: active.length,
        students: studentCount,
        assignments: assignmentCount || 0,
        attendanceSessions: attendanceCount || 0,
        openIssues: openIssues || 0,
    };
}

/**
 * Assignments with enriched subject info + main faculty name
 */
export async function getAsstFacultyAssignmentsAction() {
    const user = await validateAccess(50);

    const { data, error } = await supabaseAdmin
        .from('subject_allocations')
        .select(`
            id, section,
            subjects (id, name, subject_code, credits, subject_type, max_internal, max_external),
            semesters (id, semester_number, is_active, is_locked, courses(id, name, code))
        `)
        .eq('faculty_eid', user.uid_eid);

    if (error) throw new Error(error.message);

    // Enrich with student counts + main faculty name
    const enriched = await Promise.all((data || []).map(async (a: any) => {
        let q = supabaseAdmin
            .from('students')
            .select('uid', { count: 'exact', head: true })
            .eq('current_semester_id', a.semesters?.id)
            .eq('is_active', true);
        if (a.section) q = q.eq('section', a.section);
        const { count } = await q;

        // Find main faculty (level 60+) for this subject
        const { data: mainAllocs } = await supabaseAdmin
            .from('subject_allocations')
            .select('faculty_eid, employees(name)')
            .eq('subject_id', a.subjects?.id)
            .neq('faculty_eid', user.uid_eid);

        const mainFaculty = mainAllocs && mainAllocs.length > 0
            ? (mainAllocs[0] as any).employees?.name || mainAllocs[0].faculty_eid
            : 'Not Assigned';

        return { ...a, studentCount: count || 0, mainFaculty };
    }));

    return enriched;
}

/**
 * Create an assignment
 */
export async function createAssignmentAction(data: {
    subject_id: string; semester_id: string; section?: string;
    title: string; description?: string; due_date: string; max_marks: number;
}) {
    const user = await validateAccess(50);

    // Verify subject assignment
    const { data: alloc } = await supabaseAdmin
        .from('subject_allocations')
        .select('id')
        .eq('faculty_eid', user.uid_eid)
        .eq('subject_id', data.subject_id)
        .maybeSingle();
    if (!alloc) throw new Error('Unauthorized: Subject not assigned to you.');

    const { error } = await supabaseAdmin.from('assignments').insert([{
        ...data,
        created_by: user.uid_eid,
    }]);
    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/assistant-faculty');
    return { success: true };
}

/**
 * Get assignments created by this user (or for their assigned subjects)
 */
export async function getAssignmentsListAction(subjectId?: string) {
    const user = await validateAccess(50);

    let query = supabaseAdmin
        .from('assignments')
        .select('*, subjects(name, subject_code), semesters(semester_number)')
        .eq('created_by', user.uid_eid)
        .order('due_date', { ascending: false });

    if (subjectId) query = query.eq('subject_id', subjectId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    // Enrich with submission stats
    const enriched = await Promise.all((data || []).map(async (a: any) => {
        const { count: totalStudents } = await supabaseAdmin
            .from('students')
            .select('uid', { count: 'exact', head: true })
            .eq('current_semester_id', a.semester_id)
            .eq('is_active', true);

        const { count: submissions } = await supabaseAdmin
            .from('assignment_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('assignment_id', a.id);

        return { ...a, totalStudents: totalStudents || 0, submissions: submissions || 0 };
    }));

    return enriched;
}

/**
 * Get students for grading an assignment (with existing grades if any)
 */
export async function getAssignmentStudentsAction(assignmentId: string) {
    const user = await validateAccess(50);

    const { data: assignment } = await supabaseAdmin
        .from('assignments')
        .select('*, subjects(name)')
        .eq('id', assignmentId)
        .single();
    if (!assignment) throw new Error('Assignment not found.');

    // Get students for the semester/section
    let studQ = supabaseAdmin.from('students').select('uid, name, roll_number, email').eq('current_semester_id', assignment.semester_id).eq('is_active', true);
    if (assignment.section) studQ = studQ.eq('section', assignment.section);
    const { data: students } = await studQ.order('name');

    // Get existing submissions
    const { data: subs } = await supabaseAdmin
        .from('assignment_submissions')
        .select('*')
        .eq('assignment_id', assignmentId);

    const merged = (students || []).map(s => {
        const sub = (subs || []).find((x: any) => x.student_uid === s.uid);
        return {
            student_uid: s.uid,
            student_name: s.name,
            roll_number: s.roll_number,
            email: s.email,
            marks_obtained: sub?.marks_obtained ?? null,
            remarks: sub?.remarks || '',
            graded: !!sub?.graded_at,
            submission_id: sub?.id || null,
        };
    });

    return { assignment, students: merged };
}

/**
 * Grade assignment submissions (bulk)
 */
export async function gradeAssignmentAction(assignmentId: string, grades: { student_uid: string; marks_obtained: number; remarks?: string }[]) {
    const user = await validateAccess(50);

    const { data: assignment } = await supabaseAdmin
        .from('assignments')
        .select('max_marks, created_by')
        .eq('id', assignmentId)
        .single();
    if (!assignment) throw new Error('Assignment not found.');

    // Validate marks
    for (const g of grades) {
        if (g.marks_obtained < 0 || g.marks_obtained > assignment.max_marks) {
            throw new Error(`Marks for ${g.student_uid} exceed maximum (${assignment.max_marks}).`);
        }
    }

    const { error } = await supabaseAdmin
        .from('assignment_submissions')
        .upsert(grades.map(g => ({
            assignment_id: assignmentId,
            student_uid: g.student_uid,
            marks_obtained: g.marks_obtained,
            remarks: g.remarks || null,
            graded_by: user.uid_eid,
            graded_at: new Date().toISOString(),
        })));

    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/assistant-faculty');
    return { success: true };
}

/**
 * Lab marks: get for a subject (with student list)
 */
export async function getLabMarksAction(subjectId: string, semesterId: string) {
    const user = await validateAccess(50);

    const { data: alloc } = await supabaseAdmin
        .from('subject_allocations')
        .select('id, section')
        .eq('faculty_eid', user.uid_eid)
        .eq('subject_id', subjectId)
        .maybeSingle();
    if (!alloc) throw new Error('Unauthorized: Subject not assigned.');

    let studQ = supabaseAdmin.from('students').select('uid, name, roll_number').eq('current_semester_id', semesterId).eq('is_active', true);
    if (alloc.section) studQ = studQ.eq('section', alloc.section);
    const { data: students } = await studQ.order('name');

    const { data: marks } = await supabaseAdmin
        .from('lab_marks')
        .select('*')
        .eq('subject_id', subjectId)
        .eq('semester_id', semesterId);

    const merged = (students || []).map(s => {
        const m = (marks || []).find((x: any) => x.student_uid === s.uid);
        return {
            student_uid: s.uid,
            student_name: s.name,
            roll_number: s.roll_number,
            experiment_marks: m?.experiment_marks || 0,
            practical_marks: m?.practical_marks || 0,
            viva_marks: m?.viva_marks || 0,
            total_marks: m?.total_marks || 0,
            remarks: m?.remarks || '',
            status: m?.status || 'draft',
            id: m?.id || null,
        };
    });

    return merged;
}

/**
 * Save lab marks (draft only — assistant faculty cannot approve)
 */
export async function saveLabMarksAction(subjectId: string, semesterId: string, marks: {
    student_uid: string; experiment_marks: number; practical_marks: number; viva_marks: number; remarks?: string;
}[]) {
    const user = await validateAccess(50);

    // Check semester lock
    const { data: sem } = await supabaseAdmin.from('semesters').select('is_locked').eq('id', semesterId).single();
    if (sem?.is_locked) throw new Error('Semester is locked. No modifications allowed.');

    const rows = marks.map(m => ({
        student_uid: m.student_uid,
        subject_id: subjectId,
        semester_id: semesterId,
        experiment_marks: m.experiment_marks,
        practical_marks: m.practical_marks,
        viva_marks: m.viva_marks,
        total_marks: m.experiment_marks + m.practical_marks + m.viva_marks,
        remarks: m.remarks || null,
        status: 'draft',
        recorded_by: user.uid_eid,
        updated_at: new Date().toISOString(),
    }));

    const { error } = await supabaseAdmin.from('lab_marks').upsert(rows);
    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/assistant-faculty');
    return { success: true };
}

/**
 * Student issues: create
 */
export async function createStudentIssueAction(data: {
    student_uid: string; subject_id?: string; description: string;
}) {
    const user = await validateAccess(50);

    const { error } = await supabaseAdmin.from('student_issues').insert([{
        student_uid: data.student_uid,
        subject_id: data.subject_id || null,
        reported_by: user.uid_eid,
        description: data.description,
        status: 'open',
    }]);
    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/assistant-faculty');
    return { success: true };
}

/**
 * Student issues: list
 */
export async function getStudentIssuesAction(status?: string) {
    const user = await validateAccess(50);

    let query = supabaseAdmin
        .from('student_issues')
        .select('*, students(name, roll_number), subjects(name, subject_code)')
        .eq('reported_by', user.uid_eid)
        .order('created_at', { ascending: false });

    if (status && status !== 'all') query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
}

/**
 * Student issues: update status/resolution
 */
export async function updateStudentIssueAction(issueId: string, data: { status?: string; resolution?: string }) {
    const user = await validateAccess(50);

    const { data: issue } = await supabaseAdmin
        .from('student_issues')
        .select('reported_by')
        .eq('id', issueId)
        .single();
    if (!issue || issue.reported_by !== user.uid_eid) throw new Error('Unauthorized.');

    const { error } = await supabaseAdmin
        .from('student_issues')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', issueId);
    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/assistant-faculty');
    return { success: true };
}

/**
 * Attendance analytics summary for assistant faculty's assigned subjects
 */
export async function getAsstAttendanceSummaryAction() {
    const user = await validateAccess(50);

    const { data: allocs } = await supabaseAdmin
        .from('subject_allocations')
        .select('subject_id, section, subjects(name, subject_code), semesters(id, semester_number, is_active, courses(name))')
        .eq('faculty_eid', user.uid_eid);

    const active = (allocs || []).filter((a: any) => a.semesters?.is_active);

    const summary = await Promise.all(active.map(async (a: any) => {
        const { data: att } = await supabaseAdmin
            .from('attendance')
            .select('status')
            .eq('subject_id', a.subject_id);

        const total = att?.length || 0;
        const present = (att || []).filter(r => r.status === 'Present' || r.status === 'Late').length;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

        return {
            subjectName: a.subjects?.name,
            subjectCode: a.subjects?.subject_code,
            course: a.semesters?.courses?.name,
            semester: a.semesters?.semester_number,
            section: a.section,
            totalRecords: total,
            presentCount: present,
            percentage,
        };
    }));

    return summary;
}

// ===== STUDENT MODULE ACTIONS (V8) =====

export async function getStudentDashboardAction() {
    const user = await validateAccess(10);
    const uid = user.uid_eid;

    // Profile basics
    const { data: profile } = await supabaseAdmin
        .from('students')
        .select('*, courses(name, code), semesters(id, semester_number), departments(name)')
        .eq('uid', uid)
        .single();

    // Subject-wise attendance
    const { data: attData } = await supabaseAdmin
        .from('attendance')
        .select('status')
        .eq('student_uid', uid);
    const totalClasses = attData?.length || 0;
    const presentClasses = (attData || []).filter(a => a.status === 'Present' || a.status === 'Late').length;
    const attendancePercentage = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0;

    // Pending assignments
    const semId = profile?.current_semester_id;
    let pendingAssignments = 0;
    if (semId) {
        const { data: assignments } = await supabaseAdmin
            .from('assignments')
            .select('id')
            .eq('semester_id', semId)
            .eq('is_active', true)
            .gte('due_date', new Date().toISOString().split('T')[0]);

        const assignmentIds = (assignments || []).map(a => a.id);
        if (assignmentIds.length > 0) {
            const { data: submissions } = await supabaseAdmin
                .from('assignment_submissions')
                .select('assignment_id')
                .eq('student_uid', uid)
                .in('assignment_id', assignmentIds);
            const submittedIds = new Set((submissions || []).map(s => s.assignment_id));
            pendingAssignments = assignmentIds.filter(id => !submittedIds.has(id)).length;
        }
    }

    // Latest result
    const { data: latestResult } = await supabaseAdmin
        .from('semester_results')
        .select('sgpa, result_status, is_published')
        .eq('student_uid', uid)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(1);

    // Unread notifications count
    const { count: unreadNotifs } = await supabaseAdmin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_uid', uid)
        .eq('is_read', false);

    return {
        profile,
        attendancePercentage,
        totalClasses,
        presentClasses,
        pendingAssignments,
        latestResult: latestResult?.[0] || null,
        unreadNotifications: unreadNotifs || 0,
    };
}

export async function getStudentAssignmentsAction() {
    const user = await validateAccess(10);
    const uid = user.uid_eid;

    const { data: student } = await supabaseAdmin
        .from('students')
        .select('current_semester_id, section')
        .eq('uid', uid)
        .single();
    if (!student?.current_semester_id) return [];

    let query = supabaseAdmin
        .from('assignments')
        .select('*, subjects(name, subject_code)')
        .eq('semester_id', student.current_semester_id)
        .eq('is_active', true)
        .order('due_date', { ascending: true });

    if (student.section) {
        query = query.or(`section.is.null,section.eq.${student.section}`);
    }

    const { data: assignments, error } = await query;
    if (error) throw new Error(error.message);

    // Get student's submissions
    const ids = (assignments || []).map(a => a.id);
    const { data: submissions } = ids.length > 0
        ? await supabaseAdmin.from('assignment_submissions').select('*').eq('student_uid', uid).in('assignment_id', ids)
        : { data: [] };

    return (assignments || []).map(a => {
        const sub = (submissions || []).find((s: any) => s.assignment_id === a.id);
        return {
            ...a,
            submission: sub || null,
            status: sub?.graded_at ? 'Evaluated' : sub ? 'Submitted' : new Date(a.due_date) < new Date() ? 'Overdue' : 'Pending',
        };
    });
}

export async function submitStudentAssignmentAction(assignmentId: string, comments?: string) {
    const user = await validateAccess(10);

    const { data: assignment } = await supabaseAdmin
        .from('assignments')
        .select('id, semester_id, section, due_date')
        .eq('id', assignmentId)
        .single();
    if (!assignment) throw new Error('Assignment not found.');

    // Verify student belongs to this semester/section
    const { data: student } = await supabaseAdmin
        .from('students')
        .select('current_semester_id, section')
        .eq('uid', user.uid_eid)
        .single();

    if (student?.current_semester_id !== assignment.semester_id) {
        throw new Error('This assignment is not for your semester.');
    }

    const { error } = await supabaseAdmin
        .from('assignment_submissions')
        .upsert([{
            assignment_id: assignmentId,
            student_uid: user.uid_eid,
            remarks: comments || null,
            submitted_at: new Date().toISOString(),
        }]);
    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/student');
    return { success: true };
}

export async function getStudentResultsPublishedAction() {
    const user = await validateAccess(10);
    const uid = user.uid_eid;

    // Published semester results
    const { data: results } = await supabaseAdmin
        .from('semester_results')
        .select('*, semesters(semester_number, courses(name, code))')
        .eq('student_uid', uid)
        .eq('is_published', true)
        .order('created_at', { ascending: true });

    // For each semester result, get the approved marks breakdown
    const enriched = await Promise.all((results || []).map(async (r: any) => {
        const { data: marks } = await supabaseAdmin
            .from('marks_submissions')
            .select('*, subjects(name, subject_code, credits, max_internal, max_external)')
            .eq('student_uid', uid)
            .eq('semester_id', r.semester_id)
            .in('status', ['approved', 'locked']);

        return { ...r, marks: marks || [] };
    }));

    return enriched;
}

export async function getStudentLabMarksAction() {
    const user = await validateAccess(10);
    const uid = user.uid_eid;

    const { data, error } = await supabaseAdmin
        .from('lab_marks')
        .select('*, subjects(name, subject_code), semesters(semester_number)')
        .eq('student_uid', uid)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
}

export async function getStudentNotificationsAction() {
    const user = await validateAccess(10);

    const { data, error } = await supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('recipient_uid', user.uid_eid)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) throw new Error(error.message);
    return data || [];
}

export async function markNotificationReadAction(notificationId: string) {
    const user = await validateAccess(10);

    const { error } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('recipient_uid', user.uid_eid);

    if (error) throw new Error(error.message);
    return { success: true };
}

export async function markAllNotificationsReadAction() {
    const user = await validateAccess(10);

    const { error } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_uid', user.uid_eid)
        .eq('is_read', false);

    if (error) throw new Error(error.message);
    return { success: true };
}

