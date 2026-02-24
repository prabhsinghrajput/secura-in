'use server';

import { supabaseAdmin } from './supabase';
import { hashPassword } from './password';
import { AcademicRecord, Student, Employee, UserRole, Subject, Attendance, InternalAssessment, Timetable, Qualification, AuditLog, ApprovalStatus } from '@/types';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

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
 * Server Action to fetch academic records for a student
 */
export async function getAcademicRecordsAction(uid: string) {
    const user = await validateAccess(10); // Minimum student level

    // Security: Students only see their own. Faculty/HOD/Admin see according to isolation.
    if (user.role_level === 10 && user.uid_eid !== uid) {
        throw new Error('Forbidden');
    }

    // Secondary Check: If faculty/HOD, check department if student/record exists
    // (Detailed isolation would require a join, keeping it simple for now)

    const { data, error } = await supabaseAdmin
        .from('academic_records')
        .select('*, subjects(name, subject_code)')
        .eq('uid', uid)
        .order('semester', { ascending: false });

    if (error) throw new Error(error.message);
    return data as any[];
}

/**
 * Server Action to fetch all students
 */
export async function getStudentsAction(deptId?: string) {
    const user = await validateAccess(50, deptId); // Minimum asst faculty

    let query = supabaseAdmin.from('students').select('*');

    // Auto-isolate if level < 80
    if (user.role_level < 80) {
        query = query.eq('department_id', user.department_id);
    } else if (deptId) {
        query = query.eq('department_id', deptId);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) throw new Error(error.message);
    return data as Student[];
}

/**
 * Server Action to fetch all employees
 */
export async function getEmployeesAction(deptId?: string) {
    const user = await validateAccess(70, deptId); // Minimum HOD level to see employee list

    let query = supabaseAdmin.from('employees').select('*');

    // Auto-isolate if level < 80
    if (user.role_level < 80) {
        query = query.eq('department_id', user.department_id);
    } else if (deptId) {
        query = query.eq('department_id', deptId);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) throw new Error(error.message);
    return data as Employee[];
}

/**
 * Server Action to create an academic record
 */
export async function createAcademicRecordAction(data: {
    uid: string;
    subject: string;
    subject_code: string;
    semester: number;
    marks: number;
    grade: string;
}) {
    const user = await validateAccess(60); // Faculty+

    const { error } = await supabaseAdmin
        .from('academic_records')
        .insert([{
            ...data,
            status: 'draft',
            updated_by: user.uid_eid
        }]);

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/student');
    revalidatePath('/dashboard/faculty');
    return { success: true };
}

/**
 * Workflow: Submit Marks for Approval
 */
export async function submitMarksForApprovalAction(recordIds: string[], toStatus: 'pending_hod' | 'pending_admin') {
    const user = await validateAccess(60);

    const { error } = await supabaseAdmin
        .from('academic_records')
        .update({ status: toStatus })
        .in('record_id', recordIds);

    if (error) throw new Error(error.message);

    // log
    await logAuditEventAction({
        performed_by: user.uid_eid,
        action: 'SUBMIT_MARKS',
        entity_type: 'academic_records',
        entity_id: recordIds.join(','),
        old_values: { status: 'draft' },
        new_values: { status: toStatus }
    });

    revalidatePath('/dashboard/faculty');
    revalidatePath('/dashboard/hod');
    return { success: true };
}

/**
 * Workflow: Approve Marks (HOD/Admin)
 */
export async function approveMarksAction(recordIds: string[], status: 'pending_admin' | 'approved') {
    const requiredLevel = status === 'approved' ? 80 : 70;
    const user = await validateAccess(requiredLevel);

    const { error } = await supabaseAdmin
        .from('academic_records')
        .update({ status: status })
        .in('record_id', recordIds);

    if (error) throw new Error(error.message);

    // log
    await logAuditEventAction({
        performed_by: user.uid_eid,
        action: 'APPROVE_MARKS',
        entity_type: 'academic_records',
        entity_id: recordIds.join(','),
        old_values: null,
        new_values: { status }
    });

    revalidatePath('/dashboard/hod');
    revalidatePath('/dashboard/admin');
    revalidatePath('/dashboard/student');
    return { success: true };
}

/**
 * Server Action to create a new user
 */
export async function createUserAction(formData: any, role: UserRole, level: number) {
    const admin = await validateAccess(80); // Academic Admin+


    // 1. Create entry in 'users' table
    const { error: userError } = await supabaseAdmin
        .from('users')
        .insert([{
            uid_eid: formData.uid_eid,
            role: role,
            role_level: level,
            department_id: formData.department_id,
            password_hash: formData.password
        }]);

    if (userError) throw new Error(userError.message);

    // log
    await logAuditEventAction({
        performed_by: admin.uid_eid,
        action: 'CREATE_USER',
        entity_type: 'users',
        entity_id: formData.uid_eid,
        old_values: null,
        new_values: { role, level, dept: formData.department_id }
    });

    // 2. Create entry in corresponding profile table
    if (role === 'student') {
        const { error: studentError } = await supabaseAdmin
            .from('students')
            .insert([{
                uid: formData.uid_eid,
                name: formData.name,
                department: formData.department, // legacy string
                department_id: formData.department_id, // new UUID
                course_id: formData.course_id,
                year: Number(formData.year),
                email: formData.email,
                dob: formData.dob || null,
                blood_group: formData.blood_group || null,
                admission_year: formData.admission_year || new Date().getFullYear(),
                program_code: formData.program_code || 'B.TECH',
                current_semester: formData.current_semester || 1,
                address: formData.address || null,
                contact_number: formData.contact_number || null
            }]);
        if (studentError) throw new Error(studentError.message);
    } else {
        const { error: employeeError } = await supabaseAdmin
            .from('employees')
            .insert([{
                eid: formData.uid_eid,
                name: formData.name,
                designation: role === 'admin' ? 'Administrator' : formData.designation,
                department: formData.department,
                department_id: formData.department_id,
                email: formData.email,
                dob: formData.dob || null,
                contact_number: formData.contact_number || null,
                address: formData.address || null
            }]);
        if (employeeError) throw new Error(employeeError.message);
    }

    revalidatePath('/dashboard/admin');
    revalidatePath('/dashboard/faculty'); // If faculty needs updated student list
    return { success: true };
}

/**
 * Server Action to fetch student profile
 */
export async function getStudentProfileAction(uid: string) {
    const user = await validateAccess(10);

    // Security: Students can only see their own profile
    if (user.role_level === 10 && user.uid_eid !== uid) {
        throw new Error('Forbidden');
    }

    const { data, error } = await supabaseAdmin
        .from('students')
        .select('*, courses(name), departments(name)')
        .eq('uid', uid)
        .single();

    if (error) throw new Error(error.message);
    return data as Student;
}

/**
 * Server Action to update an academic record
 */
export async function updateAcademicRecordAction(id: string, data: Partial<AcademicRecord>) {
    const user = await validateAccess(60); // Faculty+

    // 1. Fetch current status to check locking
    const { data: current } = await supabaseAdmin
        .from('academic_records')
        .select('status, uid')
        .eq('record_id', id)
        .single();

    if (current?.status === 'approved' && user.role_level < 80) {
        throw new Error('Record is locked and approved. Contact Academic Admin to modify.');
    }

    const { error } = await supabaseAdmin
        .from('academic_records')
        .update({
            ...data,
            updated_by: user.uid_eid,
            updated_at: new Date().toISOString()
        })
        .eq('record_id', id);

    if (error) throw new Error(error.message);

    // log
    await logAuditEventAction({
        performed_by: user.uid_eid,
        action: 'UPDATE_MARK',
        entity_type: 'academic_records',
        entity_id: id,
        old_values: current,
        new_values: data
    });

    revalidatePath('/dashboard/student');
    revalidatePath('/dashboard/faculty');
    return { success: true };
}

/**
 * Server Action to delete an academic record (Admin only)
 */
export async function deleteAcademicRecordAction(id: string) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') throw new Error('Unauthorized');

    const { error } = await supabaseAdmin
        .from('academic_records')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/student');
    revalidatePath('/dashboard/faculty');
    return { success: true };
}

/**
 * Server Action to reset user password (Admin only)
 */
export async function resetUserPasswordAction(uid_eid: string, newPassword: string) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') throw new Error('Unauthorized');


    const { error } = await supabaseAdmin
        .from('users')
        .update({ password_hash: newPassword })
        .eq('uid_eid', uid_eid);

    if (error) throw new Error(error.message);
    return { success: true };
}

/**
 * Server Action to update user role (Admin only)
 */
export async function updateUserRoleAction(uid_eid: string, newRole: UserRole) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') throw new Error('Unauthorized');

    const { error } = await supabaseAdmin
        .from('users')
        .update({ role: newRole })
        .eq('uid_eid', uid_eid);

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/admin');
    return { success: true };
}

/**
 * Server Action to fetch all users (Admin oversight)
 */
export async function getAllUsersAction() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') throw new Error('Unauthorized');

    const { data, error } = await supabaseAdmin
        .from('users')
        .select('uid_eid, role, created_at')
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
}

// --- NEW ACTIONS V2.0 ---

/**
 * Fetch subject-wise stats for a student
 */
export async function getAttendanceAction(uid: string) {
    const user = await validateAccess(10);
    if (user.role_level === 10 && user.uid_eid !== uid) throw new Error('Forbidden');

    const { data, error } = await supabaseAdmin
        .from('attendance')
        .select('*, subjects(name)')
        .eq('uid', uid);

    if (error) throw new Error(error.message);
    return data as (Attendance & { subjects: { name: string } })[];
}

/**
 * Mark attendance for multiple students (Faculty)
 */
export async function markAttendanceAction(records: Partial<Attendance>[]) {
    const user = await validateAccess(50); // Asst faculty+

    const { error } = await supabaseAdmin
        .from('attendance')
        .insert(records.map(r => ({ ...r, marked_by: user.uid_eid })));

    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/student');
    return { success: true };
}

/**
 * Fetch internal assessments for a student
 */
export async function getInternalAssessmentsAction(uid: string) {
    const user = await validateAccess(10);
    if (user.role_level === 10 && user.uid_eid !== uid) throw new Error('Forbidden');

    const { data, error } = await supabaseAdmin
        .from('internal_assessments')
        .select('*, subjects(name)')
        .eq('uid', uid);

    if (error) throw new Error(error.message);
    return data as (InternalAssessment & { subjects: { name: string } })[];
}

/**
 * Upsert internal assessment marks (Faculty)
 */
export async function upsertInternalMarksAction(records: Partial<InternalAssessment>[]) {
    const user = await validateAccess(50);

    const { error } = await supabaseAdmin
        .from('internal_assessments')
        .upsert(records.map(r => ({
            ...r,
            evaluated_by: user.uid_eid,
            status: 'draft'
        })));

    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/student');
    return { success: true };
}

/**
 * Fetch timetable based on role
 */
export async function getTimetableAction(role: UserRole, id: string) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error('Unauthorized');

    let query = supabaseAdmin.from('timetables').select('*, subjects(name), employees(name)');

    if (role === 'student') {
        const { data: student } = await supabaseAdmin.from('students').select('current_semester').eq('uid', id).single();
        query = query.eq('semester', student?.current_semester || 1);
    } else {
        query = query.eq('eid', id);
    }

    const { data, error } = await query.order('start_time', { ascending: true });
    if (error) throw new Error(error.message);
    return data as (Timetable & { subjects: { name: string }, employees: { name: string } })[];
}

/**
 * Fetch all timetable records (Admin)
 */
export async function getAllTimetablesAction() {
    const user = await validateAccess(70); // HOD+

    let query = supabaseAdmin
        .from('timetables')
        .select('*, subjects(name, subject_code), employees(name)');

    // Isolation
    if (user.role_level < 80) {
        query = query.eq('department_id', user.department_id); // Assuming dept_id on timetable
    }

    const { data, error } = await query
        .order('day', { ascending: true })
        .order('start_time', { ascending: true });

    if (error) throw new Error(error.message);
    return data;
}

/**
 * Fetch all subjects
 */
export async function getSubjectsAction() {
    const { data, error } = await supabaseAdmin.from('subjects').select('*');
    if (error) throw new Error(error.message);
    return data as Subject[];
}

/**
 * Update full student profile (Admin)
 */
export async function updateStudentProfileActionFull(uid: string, data: Partial<Student>) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') throw new Error('Unauthorized');

    const { error } = await supabaseAdmin
        .from('students')
        .update(data)
        .eq('uid', uid);

    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/student');
    revalidatePath('/dashboard/admin');
    return { success: true };
}

/**
 * Fetch qualifications for a student
 */
export async function getQualificationsAction(uid: string) {
    const { data, error } = await supabaseAdmin
        .from('qualifications')
        .select('*')
        .eq('uid', uid);
    if (error) throw new Error(error.message);
    return data as Qualification[];
}

/**
 * Upsert timetable slot with conflict detection (Admin)
 */
export async function upsertTimetableAction(record: Partial<Timetable>) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') throw new Error('Unauthorized');

    // Conflict detection: Same day, overlapping time, same room OR same teacher
    const { data: conflicts, error: conflictError } = await supabaseAdmin
        .from('timetables')
        .select('*')
        .match({ day: record.day })
        .or(`room.eq.${record.room},eid.eq.${record.eid}`)
        .filter('start_time', 'lt', record.end_time)
        .filter('end_time', 'gt', record.start_time);

    if (conflictError) throw new Error(conflictError.message);

    // Check if any conflict exists (excluding the same record if editing)
    const realConflicts = conflicts.filter(c => c.id !== record.id);
    if (realConflicts.length > 0) {
        throw new Error(`Schedule Conflict: ${realConflicts[0].room} is occupied or teacher is busy.`);
    }

    const { error } = await supabaseAdmin
        .from('timetables')
        .upsert([record]);

    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/admin');
    revalidatePath('/dashboard/student');
    revalidatePath('/dashboard/faculty');
    return { success: true };
}

/**
 * Calculate GPA for a student (Admin/Automated)
 */
export async function calculateGpaAction(uid: string) {
    const user = await validateAccess(70); // HOD+

    // 1. Get all academic records
    const records = await getAcademicRecordsAction(uid);
    // 2. Get all subjects to know credits
    const subjects = await getSubjectsAction();

    const gradeMap: Record<string, number> = {
        'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'P': 4, 'F': 0
    };

    const semesterStats: Record<number, { totalPoints: number, totalCredits: number }> = {};

    records.forEach(rec => {
        const sub = subjects.find(s => s.subject_code === rec.subject);
        if (!sub) return;

        const gradePoints = gradeMap[rec.grade] || 0;
        const sem = rec.semester;

        if (!semesterStats[sem]) semesterStats[sem] = { totalPoints: 0, totalCredits: 0 };

        semesterStats[sem].totalPoints += (gradePoints * sub.credits);
        semesterStats[sem].totalCredits += sub.credits;
    });

    // We don't store GPA in DB directly in this simple version, but return it for UI
    return Object.entries(semesterStats).map(([sem, stats]) => ({
        semester: Number(sem),
        sgpa: stats.totalCredits > 0 ? (stats.totalPoints / stats.totalCredits).toFixed(2) : '0.00'
    }));
}

/**
 * Institutional Data Fetching
 */
export async function getDepartmentsAction() {
    const user = await validateAccess(10); // All levels can see depts for dropdowns
    const { data, error } = await supabaseAdmin
        .from('departments')
        .select('*')
        .order('name');
    if (error) throw new Error(error.message);
    return data as any[];
}

export async function getCoursesAction(dept_id?: string) {
    const user = await validateAccess(10);
    let query = supabaseAdmin.from('courses').select('*');
    if (dept_id) query = query.eq('dept_id', dept_id);
    const { data, error } = await query.order('name');
    if (error) throw new Error(error.message);
    return data as any[];
}

/**
 * Bulk Student Upload
 */
export async function bulkUploadStudentsAction(students: any[]) {
    const admin = await validateAccess(80);

    for (const s of students) {
        try {
            await createUserAction(s, 'student', 10);
        } catch (err) {
            console.error(`Failed to upload ${s.uid_eid}:`, err);
        }
    }
    revalidatePath('/dashboard/admin');
    return { success: true };
}

/**
 * Audit Logs Retrieval
 */
export async function getAuditLogsAction() {
    const user = await validateAccess(80); // Academic Admin+
    const { data, error } = await supabaseAdmin
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
    if (error) throw new Error(error.message);
    return data;
}
