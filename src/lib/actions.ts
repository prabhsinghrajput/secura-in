'use server';

import { supabaseAdmin } from './supabase';
import { hashPassword } from './password';
import { AcademicRecord, Student, Employee, UserRole, Subject, Attendance, InternalAssessment, Timetable, Qualification } from '@/types';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

/**
 * Server Action to fetch academic records for a student
 */
export async function getAcademicRecordsAction(uid: string) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error('Unauthorized');

    // Security: Only allow students to view their own or faculty/admin to view any
    if (session.user.role === 'student' && session.user.uid_eid !== uid) {
        throw new Error('Forbidden');
    }

    const { data, error } = await supabaseAdmin
        .from('academic_records')
        .select('*')
        .eq('uid', uid)
        .order('semester', { ascending: false });

    if (error) throw new Error(error.message);
    return data as AcademicRecord[];
}

/**
 * Server Action to fetch all students
 */
export async function getStudentsAction() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role === 'student') throw new Error('Unauthorized');

    const { data, error } = await supabaseAdmin
        .from('students')
        .select('*')
        .order('name', { ascending: true });

    if (error) throw new Error(error.message);
    return data as Student[];
}

/**
 * Server Action to fetch all employees
 */
export async function getEmployeesAction() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') throw new Error('Unauthorized');

    const { data, error } = await supabaseAdmin
        .from('employees')
        .select('*')
        .order('name', { ascending: true });

    if (error) throw new Error(error.message);
    return data as Employee[];
}

/**
 * Server Action to create an academic record
 */
export async function createAcademicRecordAction(data: {
    uid: string;
    subject: string;
    semester: number;
    marks: number;
    grade: string;
}) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'faculty') throw new Error('Unauthorized');

    const { error } = await supabaseAdmin
        .from('academic_records')
        .insert([{
            ...data,
            updated_by: session.user.uid_eid
        }]);

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/student');
    revalidatePath('/dashboard/faculty');
    return { success: true };
}

/**
 * Server Action to create a new user
 */
export async function createUserAction(formData: any, role: UserRole) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') throw new Error('Unauthorized');

    const passwordHash = await hashPassword(formData.password);

    // 1. Create entry in 'users' table
    const { error: userError } = await supabaseAdmin
        .from('users')
        .insert([{
            uid_eid: formData.uid_eid,
            role: role,
            password_hash: passwordHash
        }]);

    if (userError) throw new Error(userError.message);

    // 2. Create entry in corresponding profile table
    if (role === 'student') {
        const { error: studentError } = await supabaseAdmin
            .from('students')
            .insert([{
                uid: formData.uid_eid,
                name: formData.name,
                department: formData.department,
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
    const session = await getServerSession(authOptions);
    if (!session) throw new Error('Unauthorized');

    // Security: Students can only see their own profile
    if (session.user.role === 'student' && session.user.uid_eid !== uid) {
        throw new Error('Forbidden');
    }

    const { data, error } = await supabaseAdmin
        .from('students')
        .select('*')
        .eq('uid', uid)
        .single();

    if (error) throw new Error(error.message);
    return data as Student;
}

/**
 * Server Action to update an academic record
 */
export async function updateAcademicRecordAction(id: string, data: Partial<AcademicRecord>) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'faculty' && session.user.role !== 'admin')) {
        throw new Error('Unauthorized');
    }

    const { error } = await supabaseAdmin
        .from('academic_records')
        .update({
            ...data,
            updated_by: session.user.uid_eid,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) throw new Error(error.message);

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

    const passwordHash = await hashPassword(newPassword);

    const { error } = await supabaseAdmin
        .from('users')
        .update({ password_hash: passwordHash })
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
    const session = await getServerSession(authOptions);
    if (!session) throw new Error('Unauthorized');

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
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'faculty') throw new Error('Unauthorized');

    const { error } = await supabaseAdmin
        .from('attendance')
        .insert(records.map(r => ({ ...r, marked_by: session.user.uid_eid })));

    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/student');
    return { success: true };
}

/**
 * Fetch internal assessments for a student
 */
export async function getInternalAssessmentsAction(uid: string) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error('Unauthorized');

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
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'faculty') throw new Error('Unauthorized');

    const { error } = await supabaseAdmin
        .from('internal_assessments')
        .upsert(records.map(r => ({ ...r, evaluated_by: session.user.uid_eid })));

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
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') throw new Error('Unauthorized');

    const { data, error } = await supabaseAdmin
        .from('timetables')
        .select('*, subjects(name, subject_code), employees(name)')
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
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') throw new Error('Unauthorized');

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
