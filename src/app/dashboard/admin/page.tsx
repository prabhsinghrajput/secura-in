'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
    Shield, Users, Building2, GraduationCap, BookOpen, Settings,
    Plus, Trash2, Edit3, Save, X, Search, Lock, Unlock, Key,
    RefreshCw, Activity, Database, FileText, Printer, Eye,
    Check, AlertCircle, Layers, Globe, Award, Calendar,
    CheckCircle2, Briefcase, UserPlus, LayoutDashboard, Hash,
    Zap, TrendingUp, ArrowRight, ChevronDown
} from 'lucide-react';
import {
    createUserAction, getAllUsersAction, getSubjectsAction, getStudentsAction,
    getEmployeesAction, getDepartmentsAction, getCoursesAction, getSemestersAction,
    bulkUploadStudentsAction, createSubjectAction, deleteSubjectAction,
    resetPasswordAction, updateUserAction, createDepartmentAction, createCourseAction,
    recalculateGpaAction, getPendingMarksAction, approveMarksAction,
    getGlobalStatsAction, getRolesAction, createRoleAction, updateRoleAction,
    deleteRoleAction, getPermissionsAction, getRolePermissionsAction,
    assignRolePermissionsAction, updateDepartmentAction, deleteDepartmentAction,
    updateCourseAction, deleteCourseAction, createSemesterAction, updateSemesterAction,
    updateSubjectAction, getGradingSchemeAction, createGradeAction, updateGradeAction,
    deleteGradeAction, getSystemConfigAction, updateSystemConfigAction,
    lockSemesterAction, lockMarksAction, lockResultAction,
    getUserRolesAction, assignUserRoleAction, removeUserRoleAction,
    getFilteredAuditLogsAction
} from '@/lib/actions';
import type {
    RoleExtended, Permission, GradingScheme, SystemConfig,
    Subject, Student, Employee, UserRoleName
} from '@/types';

type AdminTab = 'dashboard' | 'roles' | 'departments' | 'academic' | 'users' | 'grading' | 'config' | 'audit';
type AcademicSub = 'courses' | 'semesters' | 'subjects';

/* ──────────────────────────────────────────
   COMPONENT
   ────────────────────────────────────────── */

export default function SuperAdminDashboard() {
    const { data: session } = useSession();
    const user = session?.user as any;

    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
    const [academicSub, setAcademicSub] = useState<AcademicSub>('courses');

    // ── Dashboard ──
    const [globalStats, setGlobalStats] = useState<any>(null);
    const [recentAudit, setRecentAudit] = useState<any[]>([]);

    // ── Roles & Permissions ──
    const [roles, setRoles] = useState<RoleExtended[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [selectedRole, setSelectedRole] = useState<RoleExtended | null>(null);
    const [rolePerms, setRolePerms] = useState<string[]>([]);
    const [showRoleForm, setShowRoleForm] = useState(false);
    const [editingRole, setEditingRole] = useState<RoleExtended | null>(null);
    const [roleForm, setRoleForm] = useState({ name: '', code: '', level: 0, description: '', is_system_role: false, department_restricted: false });

    // ── Departments ──
    const [departments, setDepartments] = useState<any[]>([]);
    const [showDeptForm, setShowDeptForm] = useState(false);
    const [editingDept, setEditingDept] = useState<any>(null);
    const [deptForm, setDeptForm] = useState({ name: '', code: '' });

    // ── Academic ──
    const [courses, setCourses] = useState<any[]>([]);
    const [semesters, setSemesters] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [showCourseForm, setShowCourseForm] = useState(false);
    const [showSemForm, setShowSemForm] = useState(false);
    const [showSubjectForm, setShowSubjectForm] = useState(false);
    const [editingCourse, setEditingCourse] = useState<any>(null);
    const [editingSubject, setEditingSubject] = useState<any>(null);
    const [courseForm, setCourseForm] = useState({ name: '', code: '', duration_years: 3, dept_id: '' });
    const [semForm, setSemForm] = useState({ course_id: '', semester_number: 1 });
    const [subjectForm, setSubjectForm] = useState({ name: '', subject_code: '', course_id: '', semester_id: '', credits: 4, subject_type: 'Theory', max_internal: 30, max_external: 70 });

    // ── Users ──
    const [users, setUsers] = useState<any[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [showUserForm, setShowUserForm] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [userRoles, setUserRoles] = useState<any[]>([]);
    const [regRoleName, setRegRoleName] = useState<string>('Student');
    const [regLevel, setRegLevel] = useState<number>(10);
    const [regData, setRegData] = useState({ uid_eid: '', name: '', email: '', department_id: '', course_id: '', current_semester_id: '', password: '', designation: '', qualification: '', roll_number: '', enrollment_number: '', admission_year: new Date().getFullYear() });

    // ── Grading ──
    const [gradingScheme, setGradingScheme] = useState<GradingScheme[]>([]);
    const [showGradeForm, setShowGradeForm] = useState(false);
    const [editingGrade, setEditingGrade] = useState<GradingScheme | null>(null);
    const [gradeForm, setGradeForm] = useState({ grade: '', min_marks: 0, max_marks: 100, grade_points: 0, description: '' });

    // ── Config ──
    const [systemConfig, setSystemConfig] = useState<SystemConfig[]>([]);
    const [editingConfig, setEditingConfig] = useState<string | null>(null);
    const [configValues, setConfigValues] = useState<Record<string, string>>({});

    // ── Audit ──
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [auditFilters, setAuditFilters] = useState({ user: '', module: '', dateFrom: '', dateTo: '' });

    /* ═══════════════════ FETCH ═══════════════════ */

    useEffect(() => { if (session) fetchDashboard(); }, [session]);

    useEffect(() => {
        if (!session) return;
        const loaders: Record<AdminTab, () => void> = {
            dashboard: fetchDashboard,
            roles: fetchRoles,
            departments: fetchDepartments,
            academic: fetchAcademic,
            users: fetchUsers,
            grading: fetchGrading,
            config: fetchConfig,
            audit: fetchAudit,
        };
        loaders[activeTab]();
    }, [activeTab]);

    const fetchDashboard = async () => {
        setLoading(true);
        try {
            const [stats, logs, depts, crs] = await Promise.all([
                getGlobalStatsAction(), getFilteredAuditLogsAction(),
                getDepartmentsAction(), getCoursesAction()
            ]);
            setGlobalStats(stats);
            setRecentAudit(logs.slice(0, 10));
            setDepartments(depts);
            setCourses(crs);
        } catch (e) { console.error(e); }
        setLoading(false);
    };
    const fetchRoles = async () => {
        setLoading(true);
        try {
            const [r, p] = await Promise.all([getRolesAction(), getPermissionsAction()]);
            setRoles(r); setPermissions(p);
        } catch (e) { console.error(e); }
        setLoading(false);
    };
    const fetchDepartments = async () => {
        setLoading(true);
        try { setDepartments(await getDepartmentsAction()); } catch (e) { console.error(e); }
        setLoading(false);
    };
    const fetchAcademic = async () => {
        setLoading(true);
        try {
            const [d, c, s, sub] = await Promise.all([getDepartmentsAction(), getCoursesAction(), getSemestersAction(), getSubjectsAction()]);
            setDepartments(d); setCourses(c); setSemesters(s); setSubjects(sub);
        } catch (e) { console.error(e); }
        setLoading(false);
    };
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const [u, s, e, d, c, sm, r] = await Promise.all([
                getAllUsersAction(), getStudentsAction(), getEmployeesAction(),
                getDepartmentsAction(), getCoursesAction(), getSemestersAction(), getRolesAction()
            ]);
            setUsers(u); setStudents(s); setEmployees(e);
            setDepartments(d); setCourses(c); setSemesters(sm); setRoles(r);
        } catch (e) { console.error(e); }
        setLoading(false);
    };
    const fetchGrading = async () => {
        setLoading(true);
        try { setGradingScheme(await getGradingSchemeAction()); } catch (e) { console.error(e); }
        setLoading(false);
    };
    const fetchConfig = async () => {
        setLoading(true);
        try {
            const c = await getSystemConfigAction();
            setSystemConfig(c);
            const v: Record<string, string> = {};
            c.forEach(cfg => { v[cfg.key] = cfg.value; });
            setConfigValues(v);
        } catch (e) { console.error(e); }
        setLoading(false);
    };
    const fetchAudit = async () => {
        setLoading(true);
        try {
            const f = auditFilters.user || auditFilters.module || auditFilters.dateFrom || auditFilters.dateTo ? auditFilters : undefined;
            const [logs, sems] = await Promise.all([getFilteredAuditLogsAction(f), getSemestersAction()]);
            setAuditLogs(logs); setSemesters(sems);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    /* ═══════════════════ HANDLERS ═══════════════════ */

    // ── Roles ──
    const handleSaveRole = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true);
        try {
            if (editingRole) { await updateRoleAction(editingRole.id, roleForm); alert('Role updated.'); }
            else { await createRoleAction(roleForm); alert('Role created.'); }
            setShowRoleForm(false); setEditingRole(null);
            setRoleForm({ name: '', code: '', level: 0, description: '', is_system_role: false, department_restricted: false });
            fetchRoles();
        } catch (err: any) { alert(err.message); }
        setLoading(false);
    };
    const handleDeleteRole = async (id: number) => {
        if (!confirm('Delete this role?')) return;
        try { await deleteRoleAction(id); fetchRoles(); } catch (err: any) { alert(err.message); }
    };
    const handleSelectRole = async (role: RoleExtended) => {
        setSelectedRole(role);
        try { setRolePerms(await getRolePermissionsAction(role.id)); } catch (e) { console.error(e); }
    };
    const handleSavePerms = async () => {
        if (!selectedRole) return; setLoading(true);
        try { await assignRolePermissionsAction(selectedRole.id, rolePerms); alert('Permissions saved.'); }
        catch (err: any) { alert(err.message); }
        setLoading(false);
    };
    const togglePerm = (id: string) => setRolePerms(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    const toggleCategory = (cat: string) => {
        const ids = permissions.filter(p => p.category === cat).map(p => p.id);
        const allOn = ids.every(id => rolePerms.includes(id));
        setRolePerms(prev => allOn ? prev.filter(p => !ids.includes(p)) : [...new Set([...prev, ...ids])]);
    };

    // ── Departments ──
    const handleSaveDept = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true);
        try {
            if (editingDept) { await updateDepartmentAction(editingDept.id, deptForm); alert('Department updated.'); }
            else { await createDepartmentAction(deptForm); alert('Department created.'); }
            setShowDeptForm(false); setEditingDept(null); setDeptForm({ name: '', code: '' });
            fetchDepartments();
        } catch (err: any) { alert(err.message); }
        setLoading(false);
    };
    const handleDeleteDept = async (id: string) => {
        if (!confirm('Delete department? Fails if active members exist.')) return;
        try { await deleteDepartmentAction(id); fetchDepartments(); } catch (err: any) { alert(err.message); }
    };

    // ── Courses ──
    const handleSaveCourse = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true);
        try {
            if (editingCourse) { await updateCourseAction(editingCourse.id, courseForm); alert('Course updated.'); }
            else { await createCourseAction(courseForm as any); alert('Course created.'); }
            setShowCourseForm(false); setEditingCourse(null); setCourseForm({ name: '', code: '', duration_years: 3, dept_id: '' });
            fetchAcademic();
        } catch (err: any) { alert(err.message); }
        setLoading(false);
    };
    const handleDeleteCourse = async (id: string) => {
        if (!confirm('Delete this course and all its semesters/subjects?')) return;
        try { await deleteCourseAction(id); fetchAcademic(); } catch (err: any) { alert(err.message); }
    };

    // ── Semesters ──
    const handleCreateSem = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true);
        try { await createSemesterAction(semForm); alert('Semester created.'); setShowSemForm(false); setSemForm({ course_id: '', semester_number: 1 }); fetchAcademic(); }
        catch (err: any) { alert(err.message); }
        setLoading(false);
    };
    const handleToggleSemLock = async (id: string, locked: boolean) => {
        const reason = locked ? '' : prompt('Reason for locking:');
        if (!locked && reason === null) return;
        try { await lockSemesterAction(id, !locked, reason || ''); fetchAcademic(); } catch (err: any) { alert(err.message); }
    };
    const handleToggleSemActive = async (id: string, active: boolean) => {
        try { await updateSemesterAction(id, { is_active: !active }); fetchAcademic(); } catch (err: any) { alert(err.message); }
    };

    // ── Subjects ──
    const handleSaveSubject = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true);
        try {
            if (editingSubject) { await updateSubjectAction(editingSubject.id, subjectForm as any); alert('Subject updated.'); }
            else { await createSubjectAction(subjectForm as any); alert('Subject created.'); }
            setShowSubjectForm(false); setEditingSubject(null);
            setSubjectForm({ name: '', subject_code: '', course_id: '', semester_id: '', credits: 4, subject_type: 'Theory', max_internal: 30, max_external: 70 });
            fetchAcademic();
        } catch (err: any) { alert(err.message); }
        setLoading(false);
    };
    const handleDeleteSubject = async (code: string) => {
        if (!confirm('Delete this subject?')) return;
        try { await deleteSubjectAction(code); fetchAcademic(); } catch (err: any) { alert(err.message); }
    };

    // ── Users ──
    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true);
        try {
            await createUserAction(regData, regRoleName, regLevel);
            alert('Account provisioned.');
            setShowUserForm(false);
            setRegData({ uid_eid: '', name: '', email: '', department_id: '', course_id: '', current_semester_id: '', password: '', designation: '', qualification: '', roll_number: '', enrollment_number: '', admission_year: new Date().getFullYear() });
            fetchUsers();
        } catch (err: any) { alert(err.message); }
        setLoading(false);
    };
    const handleResetPw = async (uid: string) => {
        if (!confirm(`Reset password for ${uid}?`)) return;
        try { await resetPasswordAction(uid); alert('Password reset to Welcome@123'); } catch (err: any) { alert(err.message); }
    };
    const toggleUserActive = async (uid: string, active: boolean) => {
        try { await updateUserAction(uid, { is_active: !active }); fetchUsers(); } catch (err: any) { alert(err.message); }
    };
    const handleSelectUser = async (u: any) => {
        setSelectedUser(u);
        try { setUserRoles(await getUserRolesAction(u.id)); } catch (e) { console.error(e); }
    };
    const handleAssignRole = async (userId: string, roleId: number) => {
        try { await assignUserRoleAction(userId, roleId); alert('Role assigned.'); if (selectedUser) setUserRoles(await getUserRolesAction(userId)); }
        catch (err: any) { alert(err.message); }
    };
    const handleRemoveRole = async (userId: string, roleId: number) => {
        if (!confirm('Remove this role?')) return;
        try { await removeUserRoleAction(userId, roleId); if (selectedUser) setUserRoles(await getUserRolesAction(userId)); }
        catch (err: any) { alert(err.message); }
    };
    const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const data = JSON.parse(ev.target?.result as string);
                if (!Array.isArray(data)) throw new Error('Must be an array');
                setLoading(true);
                const res = await bulkUploadStudentsAction(data);
                alert(`Bulk: ${res.success} ok, ${res.failed} failed`);
                fetchUsers();
            } catch (err: any) { alert(err.message); }
            setLoading(false);
        };
        reader.readAsText(file);
    };

    // ── Grading ──
    const handleSaveGrade = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true);
        try {
            if (editingGrade) { await updateGradeAction(editingGrade.id, gradeForm); }
            else { await createGradeAction(gradeForm); }
            setShowGradeForm(false); setEditingGrade(null);
            setGradeForm({ grade: '', min_marks: 0, max_marks: 100, grade_points: 0, description: '' });
            fetchGrading();
        } catch (err: any) { alert(err.message); }
        setLoading(false);
    };
    const handleDeleteGrade = async (id: string) => {
        if (!confirm('Delete this grade?')) return;
        try { await deleteGradeAction(id); fetchGrading(); } catch (err: any) { alert(err.message); }
    };

    // ── Config ──
    const handleSaveConfig = async (key: string) => {
        setLoading(true);
        try { await updateSystemConfigAction(key, configValues[key]); setEditingConfig(null); fetchConfig(); }
        catch (err: any) { alert(err.message); }
        setLoading(false);
    };

    // ── Audit ──
    const exportAudit = () => {
        const csv = [['Timestamp', 'User', 'Action', 'Entity', 'ID'], ...auditLogs.map(l => [l.created_at, l.performed_by, l.action, l.entity_type, l.entity_id])].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `audit_${Date.now()}.csv`; a.click();
    };
    const handleLockMarks = async (semId: string, lock: boolean) => {
        const reason = lock ? prompt('Reason:') : ''; if (lock && reason === null) return;
        try { await lockMarksAction(semId, lock, reason || ''); alert(`Marks ${lock ? 'locked' : 'unlocked'}.`); fetchAudit(); } catch (err: any) { alert(err.message); }
    };
    const handleLockResult = async (semId: string, lock: boolean) => {
        const reason = lock ? prompt('Reason:') : ''; if (lock && reason === null) return;
        try { await lockResultAction(semId, lock, reason || ''); alert(`Result ${lock ? 'locked' : 'unlocked'}.`); fetchAudit(); } catch (err: any) { alert(err.message); }
    };

    /* ═══════════════════ COMPUTED ═══════════════════ */

    const filteredUsers = useMemo(() => users.filter(u => {
        const s = u.uid_eid.toLowerCase().includes(userSearch.toLowerCase());
        const r = roleFilter === 'All'
            || (roleFilter === 'student' && u.role_level <= 10)
            || (roleFilter === 'faculty' && u.role_level >= 50 && u.role_level <= 60)
            || (roleFilter === 'hod' && u.role_level === 70)
            || (roleFilter === 'admin' && u.role_level >= 80);
        return s && r;
    }), [users, userSearch, roleFilter]);

    const permCategories = useMemo(() => {
        const m: Record<string, Permission[]> = {};
        permissions.forEach(p => { if (!m[p.category]) m[p.category] = []; m[p.category].push(p); });
        return m;
    }, [permissions]);

    const levelLabel = (l: number) => l >= 100 ? 'Super Admin' : l >= 80 ? 'Acad Admin' : l >= 70 ? 'HOD' : l >= 60 ? 'Faculty' : l >= 50 ? 'Asst Faculty' : 'Student';
    const levelColor = (l: number) => l >= 100 ? 'bg-red-600' : l >= 80 ? 'bg-orange-500' : l >= 70 ? 'bg-yellow-500' : l >= 60 ? 'bg-emerald-500' : l >= 50 ? 'bg-blue-500' : 'bg-indigo-500';

    /* ═══════════ SMALL UI HELPERS ═══════════ */

    const SectionHeader = ({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) => (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm">
            <div>
                <h2 className="text-2xl font-black text-stone-900 tracking-tight">{title}</h2>
                {sub && <p className="text-stone-400 font-bold text-[10px] uppercase tracking-widest mt-1">{sub}</p>}
            </div>
            <div className="flex items-center gap-3">{children}</div>
        </div>
    );

    const Label = ({ children }: { children: React.ReactNode }) => (
        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-1.5 ml-0.5">{children}</label>
    );

    const Sel = ({ value, onChange, children, ...rest }: any) => (
        <select className="w-full h-12 px-4 bg-stone-50 border-0 rounded-xl font-bold text-stone-800 outline-none focus:ring-4 focus:ring-red-50 appearance-none" value={value} onChange={onChange} {...rest}>
            {children}
        </select>
    );

    const TabBtn = ({ id, label, icon: Icon }: { id: AdminTab; label: string; icon: any }) => (
        <button onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-black rounded-xl transition-all ${activeTab === id ? 'bg-red-600 text-white shadow-lg shadow-red-100' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'}`}>
            <Icon size={15} /> {label}
        </button>
    );

    /* ═══════════════════ RENDER ═══════════════════ */

    return (
        <DashboardLayout>
            <div className="space-y-8 pb-20">
                {/* ─── HEADER ─── */}
                <div className="bg-white p-8 rounded-[3rem] border border-stone-100 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 text-red-500/5 pointer-events-none"><Shield size={260} /></div>
                    <div className="relative z-10 space-y-1">
                        <h1 className="text-4xl font-black text-stone-900 tracking-tight">Institutional Governance</h1>
                        <p className="text-red-600 font-extrabold uppercase tracking-[0.2em] text-[10px]">Super Admin Control Center&nbsp;•&nbsp;Level 100 Authority</p>
                    </div>
                    <div className="flex flex-wrap gap-1 p-1.5 bg-stone-50 rounded-2xl relative z-10">
                        <TabBtn id="dashboard" label="Dashboard" icon={LayoutDashboard} />
                        <TabBtn id="roles" label="Roles" icon={Shield} />
                        <TabBtn id="departments" label="Depts" icon={Building2} />
                        <TabBtn id="academic" label="Academic" icon={BookOpen} />
                        <TabBtn id="users" label="Users" icon={Users} />
                        <TabBtn id="grading" label="Grading" icon={Award} />
                        <TabBtn id="config" label="Config" icon={Settings} />
                        <TabBtn id="audit" label="Audit" icon={Activity} />
                    </div>
                </div>

                {loading && <div className="fixed top-0 left-0 w-full z-50"><div className="h-1 bg-red-600 animate-pulse" /></div>}

                {/* ╔══════════════════════════════════════╗
                   ║      TAB: DASHBOARD                  ║
                   ╚══════════════════════════════════════╝ */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Stat Row */}
                        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                            {[
                                { label: 'Departments', val: globalStats?.departments, icon: Building2, color: 'text-red-600 bg-red-50' },
                                { label: 'Courses', val: globalStats?.courses, icon: BookOpen, color: 'text-orange-600 bg-orange-50' },
                                { label: 'Faculty', val: globalStats?.faculty, icon: Briefcase, color: 'text-yellow-600 bg-yellow-50' },
                                { label: 'Students', val: globalStats?.students, icon: GraduationCap, color: 'text-emerald-600 bg-emerald-50' },
                                { label: 'Active Sems', val: globalStats?.activeSemesters, icon: Calendar, color: 'text-blue-600 bg-blue-50' },
                                { label: 'Pending', val: globalStats?.pendingResults, icon: AlertCircle, color: 'text-indigo-600 bg-indigo-50' },
                            ].map((s, i) => (
                                <Card key={i} className="border-stone-100 hover:shadow-lg transition-all">
                                    <CardContent className="p-6 flex flex-col gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}><s.icon size={20} /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest">{s.label}</p>
                                            <h3 className="text-3xl font-black text-stone-900">{s.val ?? '–'}</h3>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Quick Ops + Recent Activity */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                            {/* Quick Actions */}
                            <Card className="border-0 bg-stone-900 text-white p-10 rounded-[3rem] shadow-2xl xl:col-span-1 relative overflow-hidden">
                                <div className="absolute -right-8 -bottom-8 text-white/5"><Zap size={200} /></div>
                                <h3 className="text-xl font-black tracking-tight mb-8 relative z-10">Quick Actions</h3>
                                <div className="space-y-3 relative z-10">
                                    {[
                                        { label: 'Provision New User', onClick: () => { setActiveTab('users'); setTimeout(() => setShowUserForm(true), 100); } },
                                        { label: 'Add Department', onClick: () => { setActiveTab('departments'); setTimeout(() => setShowDeptForm(true), 100); } },
                                        { label: 'Create Course', onClick: () => { setActiveTab('academic'); setTimeout(() => setShowCourseForm(true), 100); } },
                                        { label: 'Recalculate Global GPA', onClick: async () => { setLoading(true); await recalculateGpaAction('all'); alert('GPA recalculated.'); setLoading(false); } },
                                    ].map((a, i) => (
                                        <button key={i} onClick={a.onClick} className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group">
                                            <span className="text-sm font-bold">{a.label}</span>
                                            <ArrowRight size={16} className="text-white/30 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    ))}
                                </div>
                            </Card>

                            {/* Recent Audit */}
                            <Card className="xl:col-span-2 border-stone-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                                <div className="p-6 border-b border-stone-50 flex items-center justify-between">
                                    <h3 className="font-black text-stone-800 tracking-tight">Recent System Activity</h3>
                                    <Button variant="outline" size="sm" className="rounded-xl text-[10px] font-black uppercase tracking-widest border-stone-200" onClick={() => setActiveTab('audit')}>View All</Button>
                                </div>
                                <div className="divide-y divide-stone-50">
                                    {recentAudit.map((log, i) => (
                                        <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-stone-50/50 transition-colors">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white ${log.action?.includes('CREATE') ? 'bg-emerald-500' : log.action?.includes('DELETE') ? 'bg-red-500' : 'bg-blue-500'}`}>
                                                {log.action?.[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-stone-800 truncate">{log.action} → {log.entity_type}</p>
                                                <p className="text-[10px] text-stone-400 font-medium">{log.performed_by} • {new Date(log.created_at).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {recentAudit.length === 0 && <p className="p-10 text-center text-stone-300 font-bold text-sm">No recent activity</p>}
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {/* ╔══════════════════════════════════════╗
                   ║      TAB: ROLES & PERMISSIONS        ║
                   ╚══════════════════════════════════════╝ */}
                {activeTab === 'roles' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SectionHeader title="Role & Permission Management" sub="RBAC governance layer">
                            <Button className="h-11 rounded-xl bg-red-600 hover:bg-red-700 font-black text-xs uppercase tracking-widest px-6 shadow-lg shadow-red-100" onClick={() => { setEditingRole(null); setRoleForm({ name: '', code: '', level: 0, description: '', is_system_role: false, department_restricted: false }); setShowRoleForm(true); }}>
                                <Plus size={16} className="mr-2" /> New Role
                            </Button>
                        </SectionHeader>

                        {/* Role Create / Edit Form */}
                        {showRoleForm && (
                            <Card className="border-red-100 bg-red-50/30 rounded-[2.5rem] p-8 shadow-sm">
                                <form onSubmit={handleSaveRole} className="space-y-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-lg font-black text-stone-900">{editingRole ? 'Edit Role' : 'Create New Role'}</h3>
                                        <button type="button" onClick={() => setShowRoleForm(false)}><X size={20} className="text-stone-400" /></button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div><Label>Role Name</Label><Input className="h-12 bg-white border-0 rounded-xl font-bold" placeholder="e.g. Lab Incharge" required value={roleForm.name} onChange={e => setRoleForm({ ...roleForm, name: e.target.value })} /></div>
                                        <div><Label>Role Code</Label><Input className="h-12 bg-white border-0 rounded-xl font-bold" placeholder="e.g. LAB_IN" required value={roleForm.code} onChange={e => setRoleForm({ ...roleForm, code: e.target.value.toUpperCase() })} /></div>
                                        <div><Label>Hierarchy Level</Label><Input type="number" className="h-12 bg-white border-0 rounded-xl font-bold" min={1} max={99} required value={roleForm.level} onChange={e => setRoleForm({ ...roleForm, level: Number(e.target.value) })} /></div>
                                        <div><Label>Description</Label><Input className="h-12 bg-white border-0 rounded-xl font-bold" placeholder="Brief description" value={roleForm.description} onChange={e => setRoleForm({ ...roleForm, description: e.target.value })} /></div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" className="w-4 h-4 rounded accent-red-600" checked={roleForm.is_system_role} onChange={e => setRoleForm({ ...roleForm, is_system_role: e.target.checked })} />
                                            <span className="text-xs font-bold text-stone-600">System Role</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" className="w-4 h-4 rounded accent-red-600" checked={roleForm.department_restricted} onChange={e => setRoleForm({ ...roleForm, department_restricted: e.target.checked })} />
                                            <span className="text-xs font-bold text-stone-600">Department Restricted</span>
                                        </label>
                                    </div>
                                    <Button type="submit" className="h-12 rounded-xl bg-red-600 hover:bg-red-700 font-black px-10 shadow-lg" isLoading={loading}>
                                        <Save size={16} className="mr-2" /> {editingRole ? 'Update Role' : 'Create Role'}
                                    </Button>
                                </form>
                            </Card>
                        )}

                        {/* Roles Table */}
                        <Card className="border-stone-100 overflow-hidden rounded-[2.5rem] shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                        <tr>
                                            <th className="px-8 py-5">Role</th>
                                            <th className="px-8 py-5">Code</th>
                                            <th className="px-8 py-5">Level</th>
                                            <th className="px-8 py-5">Users</th>
                                            <th className="px-8 py-5">Flags</th>
                                            <th className="px-8 py-5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-50">
                                        {roles.map(r => (
                                            <tr key={r.id} className={`hover:bg-red-50/20 transition-colors cursor-pointer ${selectedRole?.id === r.id ? 'bg-red-50/30' : ''}`} onClick={() => handleSelectRole(r)}>
                                                <td className="px-8 py-5"><span className="font-black text-stone-900 text-sm">{r.name}</span></td>
                                                <td className="px-8 py-5"><span className="text-[10px] font-black text-stone-400 bg-stone-100 px-2 py-1 rounded-lg">{r.code}</span></td>
                                                <td className="px-8 py-5"><span className={`text-white text-[10px] font-black px-2.5 py-1 rounded-lg ${levelColor(r.level)}`}>L{r.level}</span></td>
                                                <td className="px-8 py-5"><span className="text-sm font-black text-stone-800">{r.user_count ?? 0}</span></td>
                                                <td className="px-8 py-5">
                                                    <div className="flex gap-1.5">
                                                        {r.is_system_role && <span className="text-[8px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded uppercase">System</span>}
                                                        {r.department_restricted && <span className="text-[8px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded uppercase">Dept Lock</span>}
                                                        {r.is_active === false && <span className="text-[8px] font-black bg-stone-200 text-stone-500 px-2 py-0.5 rounded uppercase">Inactive</span>}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg border-stone-200" onClick={() => { setEditingRole(r); setRoleForm({ name: r.name, code: r.code || '', level: r.level, description: r.description || '', is_system_role: r.is_system_role || false, department_restricted: r.department_restricted || false }); setShowRoleForm(true); }}>
                                                            <Edit3 size={12} />
                                                        </Button>
                                                        {!r.is_system_role && (
                                                            <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg border-red-200 text-red-500 hover:bg-red-50" onClick={() => handleDeleteRole(r.id)}>
                                                                <Trash2 size={12} />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        {/* Permission Matrix */}
                        {selectedRole && (
                            <Card className="border-stone-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-black text-stone-900">Permissions for: {selectedRole.name}</h3>
                                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">{rolePerms.length} of {permissions.length} permissions assigned</p>
                                    </div>
                                    <Button className="h-11 rounded-xl bg-red-600 hover:bg-red-700 font-black text-xs px-8 shadow-lg" onClick={handleSavePerms} isLoading={loading}>
                                        <Save size={14} className="mr-2" /> Save Permissions
                                    </Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {Object.entries(permCategories).map(([cat, perms]) => {
                                        const allOn = perms.every(p => rolePerms.includes(p.id));
                                        return (
                                            <div key={cat} className="p-6 bg-stone-50 rounded-2xl border border-stone-100 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-xs font-black text-stone-800 uppercase tracking-widest">{cat}</h4>
                                                    <button onClick={() => toggleCategory(cat)} className={`text-[8px] font-black px-2 py-1 rounded uppercase ${allOn ? 'bg-red-100 text-red-600' : 'bg-stone-200 text-stone-500'}`}>
                                                        {allOn ? 'Deselect All' : 'Select All'}
                                                    </button>
                                                </div>
                                                <div className="space-y-2">
                                                    {perms.map(p => (
                                                        <label key={p.id} className="flex items-center gap-3 cursor-pointer group">
                                                            <input type="checkbox" className="w-4 h-4 rounded accent-red-600" checked={rolePerms.includes(p.id)} onChange={() => togglePerm(p.id)} />
                                                            <span className="text-xs font-bold text-stone-600 group-hover:text-stone-900 transition-colors">{p.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        )}
                    </div>
                )}

                {/* ╔══════════════════════════════════════╗
                   ║      TAB: DEPARTMENTS                ║
                   ╚══════════════════════════════════════╝ */}
                {activeTab === 'departments' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SectionHeader title="Department Management" sub="Organizational units & data isolation boundaries">
                            <Button className="h-11 rounded-xl bg-red-600 hover:bg-red-700 font-black text-xs uppercase tracking-widest px-6 shadow-lg shadow-red-100" onClick={() => { setEditingDept(null); setDeptForm({ name: '', code: '' }); setShowDeptForm(true); }}>
                                <Plus size={16} className="mr-2" /> New Department
                            </Button>
                        </SectionHeader>

                        {showDeptForm && (
                            <Card className="border-red-100 bg-red-50/30 rounded-[2.5rem] p-8 shadow-sm">
                                <form onSubmit={handleSaveDept} className="space-y-6">
                                    <div className="flex items-center justify-between"><h3 className="text-lg font-black text-stone-900">{editingDept ? 'Edit Department' : 'Add Department'}</h3><button type="button" onClick={() => setShowDeptForm(false)}><X size={20} className="text-stone-400" /></button></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div><Label>Department Name</Label><Input className="h-12 bg-white border-0 rounded-xl font-bold" placeholder="e.g. Computer Science" required value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} /></div>
                                        <div><Label>Department Code</Label><Input className="h-12 bg-white border-0 rounded-xl font-bold" placeholder="e.g. CS" required value={deptForm.code} onChange={e => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })} /></div>
                                    </div>
                                    <Button type="submit" className="h-12 rounded-xl bg-red-600 hover:bg-red-700 font-black px-10 shadow-lg" isLoading={loading}><Save size={16} className="mr-2" /> {editingDept ? 'Update' : 'Create'}</Button>
                                </form>
                            </Card>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {departments.map(d => (
                                <Card key={d.id} className="border-stone-100 hover:shadow-xl transition-all group rounded-[2rem]">
                                    <CardContent className="p-8 space-y-6">
                                        <div className="flex justify-between items-start">
                                            <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg">{d.code}</div>
                                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg border-stone-200" onClick={() => { setEditingDept(d); setDeptForm({ name: d.name, code: d.code }); setShowDeptForm(true); }}><Edit3 size={12} /></Button>
                                                <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg border-red-200 text-red-500 hover:bg-red-50" onClick={() => handleDeleteDept(d.id)}><Trash2 size={12} /></Button>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-stone-800 tracking-tight">{d.name}</h3>
                                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">ID: {d.id?.slice(0, 8)}...</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {departments.length === 0 && <p className="col-span-3 text-center py-20 text-stone-300 font-bold">No departments created yet.</p>}
                        </div>
                    </div>
                )}

                {/* ╔══════════════════════════════════════╗
                   ║      TAB: ACADEMIC STRUCTURE         ║
                   ╚══════════════════════════════════════╝ */}
                {activeTab === 'academic' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SectionHeader title="Academic Structure" sub="Courses, semesters, subjects & marking scheme">
                            <div className="flex gap-1 bg-stone-50 p-1 rounded-xl">
                                {(['courses', 'semesters', 'subjects'] as AcademicSub[]).map(s => (
                                    <button key={s} onClick={() => setAcademicSub(s)} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${academicSub === s ? 'bg-white text-red-600 shadow' : 'text-stone-400 hover:text-stone-600'}`}>{s}</button>
                                ))}
                            </div>
                        </SectionHeader>

                        {/* ── COURSES ── */}
                        {academicSub === 'courses' && (
                            <div className="space-y-6">
                                <div className="flex justify-end">
                                    <Button className="h-11 rounded-xl bg-red-600 hover:bg-red-700 font-black text-xs px-6 shadow-lg" onClick={() => { setEditingCourse(null); setCourseForm({ name: '', code: '', duration_years: 3, dept_id: '' }); setShowCourseForm(true); }}><Plus size={16} className="mr-2" /> New Course</Button>
                                </div>
                                {showCourseForm && (
                                    <Card className="border-red-100 bg-red-50/30 rounded-[2.5rem] p-8">
                                        <form onSubmit={handleSaveCourse} className="space-y-6">
                                            <div className="flex items-center justify-between"><h3 className="text-lg font-black text-stone-900">{editingCourse ? 'Edit Course' : 'Add Course'}</h3><button type="button" onClick={() => setShowCourseForm(false)}><X size={20} className="text-stone-400" /></button></div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                                <div><Label>Course Name</Label><Input className="h-12 bg-white border-0 rounded-xl font-bold" required value={courseForm.name} onChange={e => setCourseForm({ ...courseForm, name: e.target.value })} /></div>
                                                <div><Label>Course Code</Label><Input className="h-12 bg-white border-0 rounded-xl font-bold" required value={courseForm.code} onChange={e => setCourseForm({ ...courseForm, code: e.target.value.toUpperCase() })} /></div>
                                                <div><Label>Duration (Years)</Label><Input type="number" className="h-12 bg-white border-0 rounded-xl font-bold" min={1} max={6} required value={courseForm.duration_years} onChange={e => setCourseForm({ ...courseForm, duration_years: Number(e.target.value) })} /></div>
                                                <div><Label>Department</Label><Sel required value={courseForm.dept_id} onChange={(e: any) => setCourseForm({ ...courseForm, dept_id: e.target.value })}><option value="">Select</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</Sel></div>
                                            </div>
                                            <Button type="submit" className="h-12 rounded-xl bg-red-600 hover:bg-red-700 font-black px-10 shadow-lg" isLoading={loading}><Save size={16} className="mr-2" /> {editingCourse ? 'Update' : 'Create'}</Button>
                                        </form>
                                    </Card>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {courses.map(c => (
                                        <Card key={c.id} className="border-stone-100 hover:shadow-xl transition-all group rounded-[2rem]">
                                            <CardContent className="p-8 space-y-4">
                                                <div className="flex justify-between items-start">
                                                    <span className="text-[10px] font-black text-stone-400 bg-stone-100 px-3 py-1 rounded-lg uppercase">{c.code}</span>
                                                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg border-stone-200" onClick={() => { setEditingCourse(c); setCourseForm({ name: c.name, code: c.code, duration_years: c.duration_years, dept_id: c.dept_id }); setShowCourseForm(true); }}><Edit3 size={12} /></Button>
                                                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg border-red-200 text-red-500 hover:bg-red-50" onClick={() => handleDeleteCourse(c.id)}><Trash2 size={12} /></Button>
                                                    </div>
                                                </div>
                                                <h3 className="text-lg font-black text-stone-800 tracking-tight">{c.name}</h3>
                                                <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                                                    <span className="text-xs font-bold text-stone-400">{c.duration_years} Years</span>
                                                    <span className="text-xs font-bold text-red-500">{departments.find(d => d.id === c.dept_id)?.name || '—'}</span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── SEMESTERS ── */}
                        {academicSub === 'semesters' && (
                            <div className="space-y-6">
                                <div className="flex justify-end">
                                    <Button className="h-11 rounded-xl bg-red-600 hover:bg-red-700 font-black text-xs px-6 shadow-lg" onClick={() => { setSemForm({ course_id: '', semester_number: 1 }); setShowSemForm(true); }}><Plus size={16} className="mr-2" /> New Semester</Button>
                                </div>
                                {showSemForm && (
                                    <Card className="border-red-100 bg-red-50/30 rounded-[2.5rem] p-8">
                                        <form onSubmit={handleCreateSem} className="space-y-6">
                                            <div className="flex items-center justify-between"><h3 className="text-lg font-black text-stone-900">Add Semester</h3><button type="button" onClick={() => setShowSemForm(false)}><X size={20} className="text-stone-400" /></button></div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div><Label>Course</Label><Sel required value={semForm.course_id} onChange={(e: any) => setSemForm({ ...semForm, course_id: e.target.value })}><option value="">Select Course</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}</Sel></div>
                                                <div><Label>Semester Number</Label><Input type="number" className="h-12 bg-white border-0 rounded-xl font-bold" min={1} max={12} required value={semForm.semester_number} onChange={e => setSemForm({ ...semForm, semester_number: Number(e.target.value) })} /></div>
                                            </div>
                                            <Button type="submit" className="h-12 rounded-xl bg-red-600 hover:bg-red-700 font-black px-10 shadow-lg" isLoading={loading}><Save size={16} className="mr-2" /> Create Semester</Button>
                                        </form>
                                    </Card>
                                )}
                                <Card className="border-stone-100 overflow-hidden rounded-[2.5rem] shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                                <tr><th className="px-8 py-5">Course</th><th className="px-8 py-5">Semester</th><th className="px-8 py-5">Status</th><th className="px-8 py-5">Lock</th><th className="px-8 py-5 text-right">Controls</th></tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-50">
                                                {semesters.map(s => {
                                                    const course = courses.find(c => c.id === s.course_id);
                                                    return (
                                                        <tr key={s.id} className="hover:bg-stone-50/50 transition-colors">
                                                            <td className="px-8 py-5 text-sm font-bold text-stone-800">{course?.name || '—'} <span className="text-stone-400">({course?.code})</span></td>
                                                            <td className="px-8 py-5"><span className="font-black text-stone-900">Semester {s.semester_number}</span></td>
                                                            <td className="px-8 py-5"><span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase ${s.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-200 text-stone-500'}`}>{s.is_active ? 'Active' : 'Inactive'}</span></td>
                                                            <td className="px-8 py-5"><span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase ${s.is_locked ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{s.is_locked ? 'Locked' : 'Open'}</span></td>
                                                            <td className="px-8 py-5 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <Button variant="outline" size="sm" className="h-8 rounded-lg text-[10px] font-black border-stone-200" onClick={() => handleToggleSemActive(s.id, s.is_active)}>{s.is_active ? 'Deactivate' : 'Activate'}</Button>
                                                                    <Button variant="outline" size="sm" className={`h-8 rounded-lg text-[10px] font-black ${s.is_locked ? 'border-emerald-200 text-emerald-600' : 'border-red-200 text-red-600'}`} onClick={() => handleToggleSemLock(s.id, s.is_locked)}>
                                                                        {s.is_locked ? <><Unlock size={12} className="mr-1" /> Unlock</> : <><Lock size={12} className="mr-1" /> Lock</>}
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </div>
                        )}

                        {/* ── SUBJECTS ── */}
                        {academicSub === 'subjects' && (
                            <div className="space-y-6">
                                <div className="flex justify-end">
                                    <Button className="h-11 rounded-xl bg-red-600 hover:bg-red-700 font-black text-xs px-6 shadow-lg" onClick={() => { setEditingSubject(null); setSubjectForm({ name: '', subject_code: '', course_id: '', semester_id: '', credits: 4, subject_type: 'Theory', max_internal: 30, max_external: 70 }); setShowSubjectForm(true); }}><Plus size={16} className="mr-2" /> New Subject</Button>
                                </div>
                                {showSubjectForm && (
                                    <Card className="border-red-100 bg-red-50/30 rounded-[2.5rem] p-8">
                                        <form onSubmit={handleSaveSubject} className="space-y-6">
                                            <div className="flex items-center justify-between"><h3 className="text-lg font-black text-stone-900">{editingSubject ? 'Edit Subject' : 'Add Subject'}</h3><button type="button" onClick={() => setShowSubjectForm(false)}><X size={20} className="text-stone-400" /></button></div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                                <div><Label>Subject Name</Label><Input className="h-12 bg-white border-0 rounded-xl font-bold" required value={subjectForm.name} onChange={e => setSubjectForm({ ...subjectForm, name: e.target.value })} /></div>
                                                <div><Label>Subject Code</Label><Input className="h-12 bg-white border-0 rounded-xl font-bold" required value={subjectForm.subject_code} onChange={e => setSubjectForm({ ...subjectForm, subject_code: e.target.value.toUpperCase() })} /></div>
                                                <div><Label>Course</Label><Sel value={subjectForm.course_id} onChange={(e: any) => setSubjectForm({ ...subjectForm, course_id: e.target.value })}><option value="">Select</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Sel></div>
                                                <div><Label>Semester</Label><Sel value={subjectForm.semester_id} onChange={(e: any) => setSubjectForm({ ...subjectForm, semester_id: e.target.value })}><option value="">Select</option>{semesters.filter(s => !subjectForm.course_id || s.course_id === subjectForm.course_id).map(s => <option key={s.id} value={s.id}>Sem {s.semester_number}</option>)}</Sel></div>
                                                <div><Label>Credits</Label><Input type="number" className="h-12 bg-white border-0 rounded-xl font-bold" min={1} max={10} value={subjectForm.credits} onChange={e => setSubjectForm({ ...subjectForm, credits: Number(e.target.value) })} /></div>
                                                <div><Label>Type</Label><Sel value={subjectForm.subject_type} onChange={(e: any) => setSubjectForm({ ...subjectForm, subject_type: e.target.value })}><option>Theory</option><option>Practical</option><option>Project</option><option>Elective</option></Sel></div>
                                                <div><Label>Internal Max</Label><Input type="number" className="h-12 bg-white border-0 rounded-xl font-bold" value={subjectForm.max_internal} onChange={e => setSubjectForm({ ...subjectForm, max_internal: Number(e.target.value) })} /></div>
                                                <div><Label>External Max</Label><Input type="number" className="h-12 bg-white border-0 rounded-xl font-bold" value={subjectForm.max_external} onChange={e => setSubjectForm({ ...subjectForm, max_external: Number(e.target.value) })} /></div>
                                            </div>
                                            <Button type="submit" className="h-12 rounded-xl bg-red-600 hover:bg-red-700 font-black px-10 shadow-lg" isLoading={loading}><Save size={16} className="mr-2" /> {editingSubject ? 'Update' : 'Create'}</Button>
                                        </form>
                                    </Card>
                                )}
                                <Card className="border-stone-100 overflow-hidden rounded-[2.5rem] shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                                <tr><th className="px-6 py-5">Code</th><th className="px-6 py-5">Subject</th><th className="px-6 py-5">Type</th><th className="px-6 py-5">Credits</th><th className="px-6 py-5">Marks (I/E)</th><th className="px-6 py-5 text-right">Ops</th></tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-50">
                                                {subjects.map(s => (
                                                    <tr key={s.id} className="hover:bg-stone-50/50 transition-colors">
                                                        <td className="px-6 py-4"><span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-1 rounded-lg">{s.subject_code}</span></td>
                                                        <td className="px-6 py-4 font-black text-sm text-stone-900">{s.name}</td>
                                                        <td className="px-6 py-4 text-xs font-bold text-stone-500">{s.subject_type}</td>
                                                        <td className="px-6 py-4 font-black text-stone-800">{s.credits}</td>
                                                        <td className="px-6 py-4 text-xs font-bold text-stone-500">{s.max_internal} / {s.max_external}</td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex justify-end gap-1.5">
                                                                <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg border-stone-200" onClick={() => { setEditingSubject(s); setSubjectForm({ name: s.name, subject_code: s.subject_code, course_id: s.course_id || '', semester_id: s.semester_id || '', credits: s.credits, subject_type: s.subject_type, max_internal: s.max_internal, max_external: s.max_external }); setShowSubjectForm(true); }}><Edit3 size={12} /></Button>
                                                                <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg border-red-200 text-red-500 hover:bg-red-50" onClick={() => handleDeleteSubject(s.subject_code)}><Trash2 size={12} /></Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </div>
                        )}
                    </div>
                )}

                {/* ╔══════════════════════════════════════╗
                   ║      TAB: USERS & IDENTITY           ║
                   ╚══════════════════════════════════════╝ */}
                {activeTab === 'users' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SectionHeader title="User & Identity Management" sub="Account provisioning, role assignment & access control">
                            <Button className="h-11 rounded-xl bg-red-600 hover:bg-red-700 font-black text-xs uppercase tracking-widest px-6 shadow-lg shadow-red-100" onClick={() => setShowUserForm(!showUserForm)}>
                                <UserPlus size={16} className="mr-2" /> {showUserForm ? 'Close Form' : 'New Account'}
                            </Button>
                        </SectionHeader>

                        {/* Account Provisioning Form */}
                        {showUserForm && (
                            <Card className="border-0 shadow-2xl rounded-[3rem] overflow-hidden">
                                <div className="grid grid-cols-1 lg:grid-cols-12">
                                    <div className="lg:col-span-4 bg-red-600 p-10 text-white flex flex-col justify-between">
                                        <div>
                                            <Shield size={40} className="text-white/20 mb-6" />
                                            <h2 className="text-3xl font-black tracking-tight leading-tight">Account Provisioning</h2>
                                            <p className="text-white/60 font-bold mt-3 text-sm leading-relaxed">Create new credentials and profile within the institutional database.</p>
                                        </div>
                                        <div className="mt-8 pt-6 border-t border-white/10">
                                            <p className="text-white/40 font-black text-[10px] uppercase tracking-widest">Bulk Upload</p>
                                            <div className="mt-3 relative">
                                                <Button variant="outline" className="w-full h-12 rounded-xl border-white/20 text-white font-bold hover:bg-white/10">
                                                    Upload JSON File
                                                    <input type="file" accept=".json" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleBulkUpload} />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="lg:col-span-8 p-10 bg-white">
                                        {/* Role Selection */}
                                        <div className="mb-8">
                                            <Label>Role Assignment</Label>
                                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-1">
                                                {[
                                                    { name: 'Student', level: 10 }, { name: 'Assistant Faculty', level: 50 },
                                                    { name: 'Faculty', level: 60 }, { name: 'HOD', level: 70 },
                                                    { name: 'Academic Admin', level: 80 }, { name: 'Super Admin', level: 100 }
                                                ].map(r => (
                                                    <button key={r.level} type="button" onClick={() => { setRegRoleName(r.name); setRegLevel(r.level); }}
                                                        className={`py-2.5 text-[10px] font-black rounded-xl uppercase tracking-wide border-2 transition-all ${regLevel === r.level ? 'bg-red-600 text-white border-red-600 shadow-lg' : 'bg-stone-50 text-stone-300 border-transparent hover:text-stone-500'}`}>
                                                        L{r.level}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <form onSubmit={handleCreateAccount} className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div><Label>UID / EID</Label><Input className="h-12 bg-stone-50 border-0 rounded-xl font-bold" placeholder="STU-2025-001" required value={regData.uid_eid} onChange={e => setRegData({ ...regData, uid_eid: e.target.value })} /></div>
                                                <div><Label>Full Name</Label><Input className="h-12 bg-stone-50 border-0 rounded-xl font-bold" placeholder="As per documents" required value={regData.name} onChange={e => setRegData({ ...regData, name: e.target.value })} /></div>
                                                <div><Label>Email</Label><Input type="email" className="h-12 bg-stone-50 border-0 rounded-xl font-bold" required value={regData.email} onChange={e => setRegData({ ...regData, email: e.target.value })} /></div>
                                                <div><Label>Department</Label><Sel required value={regData.department_id} onChange={(e: any) => setRegData({ ...regData, department_id: e.target.value, course_id: '' })}><option value="">Select</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</Sel></div>
                                                {regLevel === 10 && (
                                                    <div><Label>Course</Label><Sel required value={regData.course_id} onChange={(e: any) => setRegData({ ...regData, course_id: e.target.value })}><option value="">Select</option>{courses.filter(c => c.dept_id === regData.department_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Sel></div>
                                                )}
                                                <div><Label>Password</Label><Input type="password" className="h-12 bg-stone-50 border-0 rounded-xl font-bold" placeholder="Min 6 chars" required value={regData.password} onChange={e => setRegData({ ...regData, password: e.target.value })} /></div>
                                                {regLevel >= 50 && regLevel < 100 && (
                                                    <>
                                                        <div><Label>Designation</Label><Input className="h-12 bg-stone-50 border-0 rounded-xl font-bold" placeholder="e.g. Professor" value={regData.designation} onChange={e => setRegData({ ...regData, designation: e.target.value })} /></div>
                                                        <div><Label>Qualification</Label><Input className="h-12 bg-stone-50 border-0 rounded-xl font-bold" placeholder="e.g. M.Tech, PhD" value={regData.qualification} onChange={e => setRegData({ ...regData, qualification: e.target.value })} /></div>
                                                    </>
                                                )}
                                            </div>
                                            <Button type="submit" className="w-full h-14 rounded-2xl bg-red-600 hover:bg-red-700 font-black shadow-2xl shadow-red-100" isLoading={loading}>
                                                Authorize & Generate Account
                                            </Button>
                                        </form>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* Search + Filter */}
                        <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-2xl border border-stone-100 shadow-sm">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                                <input className="w-full h-12 pl-12 pr-4 bg-stone-50 border-0 rounded-xl font-bold placeholder:text-stone-300 focus:ring-4 focus:ring-red-50 outline-none" placeholder="Search UID/EID..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                            </div>
                            <div className="flex gap-1 bg-stone-50 p-1 rounded-xl">
                                {['All', 'student', 'faculty', 'hod', 'admin'].map(r => (
                                    <button key={r} onClick={() => setRoleFilter(r)} className={`px-3 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${roleFilter === r ? 'bg-white text-red-600 shadow' : 'text-stone-400'}`}>{r}</button>
                                ))}
                            </div>
                        </div>

                        {/* User Table + Detail Panel */}
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                            <Card className="xl:col-span-8 border-stone-100 overflow-hidden rounded-[2.5rem] shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                            <tr><th className="px-6 py-5">Identity</th><th className="px-6 py-5">Level</th><th className="px-6 py-5">Status</th><th className="px-6 py-5 text-right">Actions</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-stone-50">
                                            {filteredUsers.map(u => (
                                                <tr key={u.uid_eid} className={`hover:bg-red-50/20 transition-all cursor-pointer ${selectedUser?.uid_eid === u.uid_eid ? 'bg-red-50/30' : ''}`} onClick={() => handleSelectUser(u)}>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black ${levelColor(u.role_level)}`}>{u.uid_eid[0]}</div>
                                                            <div><p className="font-black text-stone-800 text-sm">{u.uid_eid}</p><p className="text-[10px] text-stone-400 font-bold">{levelLabel(u.role_level)}</p></div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4"><span className={`text-white text-[10px] font-black px-2 py-0.5 rounded-md ${levelColor(u.role_level)}`}>L{u.role_level}</span></td>
                                                    <td className="px-6 py-4"><span className={`w-2 h-2 rounded-full inline-block mr-1.5 ${u.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} /><span className="text-[10px] font-black text-stone-500 uppercase">{u.is_active ? 'Active' : 'Inactive'}</span></td>
                                                    <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                                        <div className="flex justify-end gap-1.5">
                                                            <Button variant="outline" size="sm" className="h-8 rounded-lg text-[10px] font-black border-stone-200" onClick={() => handleResetPw(u.uid_eid)}><Key size={12} className="mr-1" /> Reset</Button>
                                                            <Button variant="outline" size="sm" className={`h-8 rounded-lg text-[10px] font-black ${u.is_active ? 'border-red-200 text-red-500' : 'border-emerald-200 text-emerald-600'}`} onClick={() => toggleUserActive(u.uid_eid, u.is_active)}>{u.is_active ? 'Deactivate' : 'Activate'}</Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>

                            {/* Role Assignment Panel */}
                            <div className="xl:col-span-4 space-y-6">
                                {selectedUser ? (
                                    <Card className="border-stone-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black ${levelColor(selectedUser.role_level)}`}>{selectedUser.uid_eid[0]}</div>
                                            <div>
                                                <h3 className="font-black text-stone-900">{selectedUser.uid_eid}</h3>
                                                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{levelLabel(selectedUser.role_level)} • Level {selectedUser.role_level}</p>
                                            </div>
                                        </div>
                                        <div className="h-px bg-stone-100" />
                                        <div>
                                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3">Assigned Roles</p>
                                            <div className="space-y-2">
                                                {userRoles.map((ur, i) => (
                                                    <div key={i} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
                                                        <span className="text-xs font-black text-stone-800">{ur.roles?.name}</span>
                                                        <button onClick={() => handleRemoveRole(selectedUser.id, ur.role_id)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
                                                    </div>
                                                ))}
                                                {userRoles.length === 0 && <p className="text-xs text-stone-400 italic">No extra roles assigned.</p>}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3">Assign Additional Role</p>
                                            <div className="flex flex-wrap gap-2">
                                                {roles.filter(r => !userRoles.some(ur => ur.role_id === r.id)).map(r => (
                                                    <button key={r.id} onClick={() => handleAssignRole(selectedUser.id, r.id)}
                                                        className="px-3 py-1.5 text-[10px] font-black rounded-lg border border-dashed border-stone-200 text-stone-400 hover:border-red-300 hover:text-red-600 transition-all">
                                                        + {r.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </Card>
                                ) : (
                                    <Card className="border-stone-100 rounded-[2.5rem] p-10 shadow-sm flex flex-col items-center justify-center text-center">
                                        <Users size={40} className="text-stone-200 mb-4" />
                                        <p className="text-sm font-bold text-stone-400">Select a user to manage roles</p>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ╔══════════════════════════════════════╗
                   ║      TAB: GRADING SCHEME             ║
                   ╚══════════════════════════════════════╝ */}
                {activeTab === 'grading' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SectionHeader title="Grading Scheme" sub="Institution-wide grade conversion rules & GPA mapping">
                            <Button className="h-11 rounded-xl bg-red-600 hover:bg-red-700 font-black text-xs uppercase tracking-widest px-6 shadow-lg shadow-red-100" onClick={() => { setEditingGrade(null); setGradeForm({ grade: '', min_marks: 0, max_marks: 100, grade_points: 0, description: '' }); setShowGradeForm(true); }}>
                                <Plus size={16} className="mr-2" /> Add Grade
                            </Button>
                        </SectionHeader>

                        {showGradeForm && (
                            <Card className="border-red-100 bg-red-50/30 rounded-[2.5rem] p-8">
                                <form onSubmit={handleSaveGrade} className="space-y-6">
                                    <div className="flex items-center justify-between"><h3 className="text-lg font-black text-stone-900">{editingGrade ? 'Edit Grade' : 'Add Grade Entry'}</h3><button type="button" onClick={() => setShowGradeForm(false)}><X size={20} className="text-stone-400" /></button></div>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                                        <div><Label>Grade</Label><Input className="h-12 bg-white border-0 rounded-xl font-bold" placeholder="A+" required value={gradeForm.grade} onChange={e => setGradeForm({ ...gradeForm, grade: e.target.value })} /></div>
                                        <div><Label>Min Marks</Label><Input type="number" className="h-12 bg-white border-0 rounded-xl font-bold" required value={gradeForm.min_marks} onChange={e => setGradeForm({ ...gradeForm, min_marks: Number(e.target.value) })} /></div>
                                        <div><Label>Max Marks</Label><Input type="number" className="h-12 bg-white border-0 rounded-xl font-bold" required value={gradeForm.max_marks} onChange={e => setGradeForm({ ...gradeForm, max_marks: Number(e.target.value) })} /></div>
                                        <div><Label>Grade Points</Label><Input type="number" className="h-12 bg-white border-0 rounded-xl font-bold" required value={gradeForm.grade_points} onChange={e => setGradeForm({ ...gradeForm, grade_points: Number(e.target.value) })} /></div>
                                        <div><Label>Description</Label><Input className="h-12 bg-white border-0 rounded-xl font-bold" value={gradeForm.description} onChange={e => setGradeForm({ ...gradeForm, description: e.target.value })} /></div>
                                    </div>
                                    <Button type="submit" className="h-12 rounded-xl bg-red-600 hover:bg-red-700 font-black px-10 shadow-lg" isLoading={loading}><Save size={16} className="mr-2" /> {editingGrade ? 'Update' : 'Create'}</Button>
                                </form>
                            </Card>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                            {gradingScheme.map(g => (
                                <Card key={g.id} className="border-stone-100 hover:shadow-xl transition-all group text-center rounded-2xl">
                                    <CardContent className="p-6 space-y-3">
                                        <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center font-black text-xl text-white ${g.grade_points >= 8 ? 'bg-emerald-500' : g.grade_points >= 5 ? 'bg-blue-500' : g.grade_points >= 4 ? 'bg-yellow-500' : 'bg-red-500'}`}>{g.grade}</div>
                                        <p className="text-xs font-bold text-stone-500">{g.min_marks}–{g.max_marks}%</p>
                                        <p className="text-lg font-black text-stone-900">{g.grade_points} <span className="text-[10px] text-stone-400">pts</span></p>
                                        <p className="text-[10px] font-bold text-stone-400">{g.description}</p>
                                        <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setEditingGrade(g); setGradeForm({ grade: g.grade, min_marks: g.min_marks, max_marks: g.max_marks, grade_points: g.grade_points, description: g.description || '' }); setShowGradeForm(true); }} className="p-1 text-stone-400 hover:text-blue-600"><Edit3 size={12} /></button>
                                            <button onClick={() => handleDeleteGrade(g.id)} className="p-1 text-stone-400 hover:text-red-600"><Trash2 size={12} /></button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* ╔══════════════════════════════════════╗
                   ║      TAB: SYSTEM CONFIGURATION       ║
                   ╚══════════════════════════════════════╝ */}
                {activeTab === 'config' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SectionHeader title="System Configuration" sub="Global settings and institutional policy parameters">
                            <Button variant="outline" className="h-11 rounded-xl font-black text-xs uppercase tracking-widest px-6 border-stone-200" onClick={fetchConfig}><RefreshCw size={14} className="mr-2" /> Refresh</Button>
                        </SectionHeader>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {systemConfig.map(cfg => (
                                <Card key={cfg.key} className="border-stone-100 rounded-2xl hover:shadow-lg transition-all">
                                    <CardContent className="p-6 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{cfg.key.replace(/_/g, ' ')}</p>
                                                {cfg.description && <p className="text-xs text-stone-400 mt-0.5">{cfg.description}</p>}
                                            </div>
                                            {editingConfig === cfg.key ? (
                                                <div className="flex gap-1.5">
                                                    <Button variant="outline" size="sm" className="h-8 rounded-lg border-emerald-200 text-emerald-600" onClick={() => handleSaveConfig(cfg.key)}><Check size={12} /></Button>
                                                    <Button variant="outline" size="sm" className="h-8 rounded-lg border-stone-200" onClick={() => setEditingConfig(null)}><X size={12} /></Button>
                                                </div>
                                            ) : (
                                                <Button variant="outline" size="sm" className="h-8 rounded-lg border-stone-200 text-stone-400" onClick={() => setEditingConfig(cfg.key)}><Edit3 size={12} /></Button>
                                            )}
                                        </div>
                                        {editingConfig === cfg.key ? (
                                            <Input className="h-12 bg-stone-50 border-0 rounded-xl font-bold" value={configValues[cfg.key] || ''} onChange={e => setConfigValues(v => ({ ...v, [cfg.key]: e.target.value }))} />
                                        ) : (
                                            <p className="text-lg font-black text-stone-900 bg-stone-50 px-4 py-3 rounded-xl">{cfg.value}</p>
                                        )}
                                        {cfg.updated_by && <p className="text-[10px] text-stone-300 font-medium">Last updated by {cfg.updated_by} on {new Date(cfg.updated_at).toLocaleDateString()}</p>}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* ╔══════════════════════════════════════╗
                   ║      TAB: AUDIT & SECURITY           ║
                   ╚══════════════════════════════════════╝ */}
                {activeTab === 'audit' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SectionHeader title="Audit Vault & Lock Management" sub="Immutable transaction history & security controls">
                            <Button variant="outline" className="h-11 rounded-xl font-black text-xs uppercase tracking-widest px-6 border-stone-200" onClick={exportAudit}><Printer size={14} className="mr-2" /> Export CSV</Button>
                        </SectionHeader>

                        {/* Lock Controls */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {semesters.slice(0, 6).map(s => {
                                const course = courses.find(c => c.id === s.course_id);
                                return (
                                    <Card key={s.id} className="border-stone-100 rounded-2xl">
                                        <CardContent className="p-6 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-black text-stone-800">{course?.code} – Sem {s.semester_number}</p>
                                                    <div className="flex gap-1.5 mt-1">
                                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${s.is_locked ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>Sem {s.is_locked ? 'Locked' : 'Open'}</span>
                                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${s.is_active ? 'bg-blue-100 text-blue-600' : 'bg-stone-200 text-stone-500'}`}>{s.is_active ? 'Active' : 'Inactive'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" className="flex-1 h-9 rounded-lg text-[10px] font-black border-stone-200" onClick={() => handleLockMarks(s.id, true)}><Lock size={10} className="mr-1" /> Lock Marks</Button>
                                                <Button variant="outline" size="sm" className="flex-1 h-9 rounded-lg text-[10px] font-black border-stone-200" onClick={() => handleLockMarks(s.id, false)}><Unlock size={10} className="mr-1" /> Unlock</Button>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" className="flex-1 h-9 rounded-lg text-[10px] font-black border-stone-200" onClick={() => handleLockResult(s.id, true)}><Lock size={10} className="mr-1" /> Lock Result</Button>
                                                <Button variant="outline" size="sm" className="flex-1 h-9 rounded-lg text-[10px] font-black border-stone-200" onClick={() => handleLockResult(s.id, false)}><Unlock size={10} className="mr-1" /> Unlock</Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>

                        {/* Audit Filters */}
                        <Card className="border-stone-100 rounded-2xl p-6 shadow-sm">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                                <div><Label>User</Label><Input className="h-10 bg-stone-50 border-0 rounded-xl font-bold" placeholder="UID/EID" value={auditFilters.user} onChange={e => setAuditFilters({ ...auditFilters, user: e.target.value })} /></div>
                                <div><Label>Module</Label><Sel value={auditFilters.module} onChange={(e: any) => setAuditFilters({ ...auditFilters, module: e.target.value })}>
                                    <option value="">All Modules</option>
                                    {['users', 'roles', 'departments', 'courses', 'semesters', 'subjects', 'marks_submissions', 'semester_results', 'system_config', 'grading_scheme', 'role_permissions', 'user_roles'].map(m => <option key={m} value={m}>{m}</option>)}
                                </Sel></div>
                                <div><Label>Date From</Label><Input type="date" className="h-10 bg-stone-50 border-0 rounded-xl font-bold" value={auditFilters.dateFrom} onChange={e => setAuditFilters({ ...auditFilters, dateFrom: e.target.value })} /></div>
                                <div><Label>Date To</Label><Input type="date" className="h-10 bg-stone-50 border-0 rounded-xl font-bold" value={auditFilters.dateTo} onChange={e => setAuditFilters({ ...auditFilters, dateTo: e.target.value })} /></div>
                                <Button className="h-10 rounded-xl bg-red-600 hover:bg-red-700 font-black text-xs" onClick={fetchAudit}><Search size={14} className="mr-2" /> Filter</Button>
                            </div>
                        </Card>

                        {/* Audit Table */}
                        <Card className="border-stone-100 overflow-hidden rounded-[2.5rem] shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                        <tr><th className="px-6 py-5">Timestamp</th><th className="px-6 py-5">Agent</th><th className="px-6 py-5">Action</th><th className="px-6 py-5">Entity</th><th className="px-6 py-5 text-right">Details</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-50">
                                        {auditLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-red-50/10 transition-colors">
                                                <td className="px-6 py-4 text-xs font-bold text-stone-400 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-[8px] font-black">{log.performed_by?.[0]}</div>
                                                        <span className="text-xs font-black text-red-600">{log.performed_by}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${log.action?.includes('CREATE') ? 'bg-emerald-100 text-emerald-600' : log.action?.includes('DELETE') ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{log.action}</span>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-bold text-stone-600">{log.entity_type} • {log.entity_id}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button variant="outline" size="sm" className="h-7 rounded-md text-[8px] font-black uppercase border-stone-200"
                                                        onClick={() => alert(JSON.stringify({ old: log.old_values, new: log.new_values }, null, 2))}>
                                                        <Eye size={10} className="mr-1" /> Inspect
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                        {auditLogs.length === 0 && (
                                            <tr><td colSpan={5} className="py-20 text-center text-stone-300 font-bold text-sm">No audit records match the current filters.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
