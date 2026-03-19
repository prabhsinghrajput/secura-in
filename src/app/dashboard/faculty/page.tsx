'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    getFacultyDashboardStatsAction,
    getFacultyAssignmentsDetailedAction,
    getFacultyAnalyticsAction,
    getFacultyStudentsAction,
    getFacultyAttendanceHistoryAction,
    editFacultyAttendanceAction,
    getFacultyAttendanceAnalyticsAction,
    getFacultyMarksForSubjectAction,
    getFacultyPerformanceStatsAction,
    saveFacultyMarksAction,
    markAttendanceAction,
    getTimetableAction,
} from '@/lib/actions';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
    Search, CheckCircle2, UserCheck, BarChart2,
    Calendar, BookOpen, Clock, MapPin, Save,
    Activity, ClipboardList, ChevronRight,
    Users, ArrowRight, AlertTriangle, Download,
    Eye, Filter, RefreshCw, FileText, TrendingUp,
    PieChart, ChevronDown
} from 'lucide-react';

type FacultyTab = 'overview' | 'subjects' | 'attendance' | 'marks' | 'analytics' | 'schedule';

export default function FacultyDashboard() {
    return (
        <Suspense fallback={
            <DashboardLayout>
                <div className="flex h-[50vh] items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                </div>
            </DashboardLayout>
        }>
            <FacultyDashboardContent />
        </Suspense>
    );
}

function FacultyDashboardContent() {
    const { data: session } = useSession();
    const user = session?.user as any;
    const router = useRouter();
    const searchParams = useSearchParams();

    const activeTab = (searchParams.get('tab') as FacultyTab) || 'overview';
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

    // Data
    const [dashStats, setDashStats] = useState<any>(null);
    const [analytics, setAnalytics] = useState<any>(null);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
    const [activeStudents, setActiveStudents] = useState<any[]>([]);
    const [timetable, setTimetable] = useState<any[]>([]);

    // Attendance state
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceList, setAttendanceList] = useState<Record<string, string>>({});
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
    const [attendanceAnalytics, setAttendanceAnalytics] = useState<any[]>([]);
    const [attHistoryDate, setAttHistoryDate] = useState('');
    const [attSubView, setAttSubView] = useState<'mark' | 'history' | 'analytics'>('mark');

    // Marks state
    const [marksList, setMarksList] = useState<any[]>([]);
    const [marksSubject, setMarksSubject] = useState<any>(null);
    const [marksSearch, setMarksSearch] = useState('');

    // Analytics state
    const [perfStats, setPerfStats] = useState<any>(null);

    // Filters
    const [subjectFilter, setSubjectFilter] = useState('');
    const [semesterFilter, setSemesterFilter] = useState('');

    useEffect(() => {
        if (user?.uid_eid) loadDashboard();
    }, [user?.uid_eid]);

    const flash = (type: 'ok' | 'err', text: string) => {
        setMsg({ type, text });
        setTimeout(() => setMsg(null), 4000);
    };

    const loadDashboard = async () => {
        setLoading(true);
        try {
            const [stats, analyt, assign, time] = await Promise.all([
                getFacultyDashboardStatsAction(),
                getFacultyAnalyticsAction(),
                getFacultyAssignmentsDetailedAction(),
                getTimetableAction('faculty', user.uid_eid),
            ]);
            setDashStats(stats);
            setAnalytics(analyt);
            setAssignments(assign || []);
            setTimetable(time || []);
        } catch (err: any) {
            flash('err', err.message);
        }
        setLoading(false);
    };

    const selectAssignment = async (a: any) => {
        setSelectedAssignment(a);
        setLoading(true);
        try {
            const students = await getFacultyStudentsAction(a.semesters.id, a.section);
            setActiveStudents(students || []);
            setAttendanceList({});
        } catch (err: any) {
            flash('err', err.message);
        }
        setLoading(false);
    };

    const loadMarksForSubject = async (a: any) => {
        setSelectedAssignment(a);
        setLoading(true);
        try {
            const res = await getFacultyMarksForSubjectAction(a.subjects.id, a.semesters.id);
            setMarksList(res.marks);
            setMarksSubject(res.subject);
        } catch (err: any) {
            flash('err', err.message);
        }
        setLoading(false);
    };

    const loadAttendanceAnalytics = async (a: any) => {
        setLoading(true);
        try {
            const data = await getFacultyAttendanceAnalyticsAction(a.subjects.id, a.semesters.id);
            setAttendanceAnalytics(data || []);
        } catch (err: any) {
            flash('err', err.message);
        }
        setLoading(false);
    };

    const loadAttendanceHistory = async (subjectId: string, date?: string) => {
        setLoading(true);
        try {
            const data = await getFacultyAttendanceHistoryAction(subjectId, date || undefined);
            setAttendanceHistory(data || []);
        } catch (err: any) {
            flash('err', err.message);
        }
        setLoading(false);
    };

    const loadPerformanceStats = async (a: any) => {
        setSelectedAssignment(a);
        setLoading(true);
        try {
            const data = await getFacultyPerformanceStatsAction(a.subjects.id, a.semesters.id);
            setPerfStats(data);
        } catch (err: any) {
            flash('err', err.message);
        }
        setLoading(false);
    };

    // ---- Attendance Handlers ----
    const handleMarkAttendance = async () => {
        if (!selectedAssignment || Object.keys(attendanceList).length === 0) return flash('err', 'Mark at least one student.');
        const today = new Date().toISOString().split('T')[0];
        if (attendanceDate > today) return flash('err', 'Cannot mark attendance for future dates.');
        setLoading(true);
        try {
            const payload = Object.entries(attendanceList).map(([uid, status]) => ({
                student_uid: uid,
                subject_id: selectedAssignment.subjects.id,
                date: attendanceDate,
                status,
                marked_by: user.uid_eid,
            }));
            await markAttendanceAction(payload as any);
            flash('ok', 'Attendance saved successfully.');
            setAttendanceList({});
        } catch (err: any) {
            flash('err', err.message);
        }
        setLoading(false);
    };

    const markAllStudents = (status: string) => {
        const newList: Record<string, string> = {};
        activeStudents.forEach(s => { newList[s.uid] = status; });
        setAttendanceList(newList);
    };

    const handleEditAttendance = async (id: string, newStatus: string) => {
        setLoading(true);
        try {
            await editFacultyAttendanceAction(id, newStatus);
            flash('ok', 'Attendance updated.');
            if (selectedAssignment) loadAttendanceHistory(selectedAssignment.subjects.id, attHistoryDate || undefined);
        } catch (err: any) {
            flash('err', err.message);
        }
        setLoading(false);
    };

    // ---- Marks Handlers ----
    const handleSaveMarks = async () => {
        if (!confirm('Save marks as drafts?')) return;
        setLoading(true);
        try {
            await saveFacultyMarksAction(marksList.map(m => ({
                student_uid: m.student_uid,
                subject_id: m.subject_id,
                semester_id: m.semester_id,
                internal_marks: m.internal_marks,
                mid_term_marks: m.mid_term_marks,
                practical_marks: m.practical_marks,
                status: 'draft',
            })));
            flash('ok', 'Marks saved as drafts.');
        } catch (err: any) {
            flash('err', err.message);
        }
        setLoading(false);
    };

    const handleSubmitMarks = async () => {
        if (!confirm('Submit marks for HOD approval? Records will be locked for editing.')) return;
        setLoading(true);
        try {
            const payload = marksList.map(m => ({
                student_uid: m.student_uid,
                subject_id: m.subject_id,
                semester_id: m.semester_id,
                internal_marks: m.internal_marks,
                mid_term_marks: m.mid_term_marks,
                practical_marks: m.practical_marks,
                status: 'pending_hod',
            }));
            await saveFacultyMarksAction(payload);
            setMarksList(prev => prev.map(m => ({ ...m, status: 'pending_hod' })));
            flash('ok', 'Marks submitted for HOD review.');
        } catch (err: any) {
            flash('err', err.message);
        }
        setLoading(false);
    };

    const exportCSV = (rows: any[], filename: string) => {
        if (rows.length === 0) return;
        const keys = Object.keys(rows[0]);
        const csv = [keys.join(','), ...rows.map(r => keys.map(k => `"${r[k] ?? ''}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    };

    // ---- Filtered Assignments ----
    const filteredAssignments = useMemo(() => {
        return assignments.filter(a => {
            if (subjectFilter && !a.subjects.name.toLowerCase().includes(subjectFilter.toLowerCase()) && !a.subjects.subject_code.toLowerCase().includes(subjectFilter.toLowerCase())) return false;
            if (semesterFilter && String(a.semesters.semester_number) !== semesterFilter) return false;
            return true;
        });
    }, [assignments, subjectFilter, semesterFilter]);

    const activeAssignments = useMemo(() => assignments.filter((a: any) => a.semesters?.is_active), [assignments]);
    const semesters = useMemo(() => [...new Set(assignments.map(a => String(a.semesters.semester_number)))].sort(), [assignments]);

    const filteredMarks = useMemo(() => {
        if (!marksSearch) return marksList;
        const q = marksSearch.toLowerCase();
        return marksList.filter(m => m.student_name?.toLowerCase().includes(q) || m.roll_number?.toLowerCase().includes(q) || m.student_uid?.toLowerCase().includes(q));
    }, [marksList, marksSearch]);

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            draft: 'bg-stone-100 text-stone-500',
            pending_hod: 'bg-amber-50 text-amber-600',
            pending_admin: 'bg-blue-50 text-blue-600',
            approved: 'bg-emerald-50 text-emerald-600',
            locked: 'bg-red-50 text-red-600',
        };
        return map[status] || 'bg-stone-100 text-stone-400';
    };


    return (
        <DashboardLayout>
            <div className="space-y-10 pb-20">
                {/* Toast */}
                {msg && (
                    <div className={`fixed top-8 right-8 z-50 px-8 py-4 rounded-2xl shadow-2xl font-black text-sm animate-in slide-in-from-top-4 ${msg.type === 'ok' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                        {msg.text}
                    </div>
                )}

                {/* Header */}
                <div className="bg-white p-12 rounded-[4rem] border border-stone-100 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 text-emerald-500/5 pointer-events-none">
                        <UserCheck size={320} />
                    </div>
                    <div className="relative z-10 space-y-2">
                        <h1 className="text-5xl font-black text-stone-900 tracking-tight leading-none">Faculty Hub</h1>
                        <p className="text-emerald-600 font-extrabold uppercase tracking-[0.2em] text-xs">
                            {user?.name || 'Faculty Member'} • {user?.uid_eid || 'Subject Authority'}
                        </p>
                    </div>
                </div>

                {loading && (
                    <div className="flex justify-center py-20">
                        <RefreshCw className="animate-spin text-emerald-400" size={32} />
                    </div>
                )}

                {/* ======== OVERVIEW TAB ======== */}
                {!loading && activeTab === 'overview' && (
                    <div className="space-y-10 animate-in fade-in duration-500">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                            {[
                                { label: 'Assigned Subjects', value: dashStats?.totalSubjects ?? 0, icon: BookOpen, color: 'emerald' },
                                { label: 'Total Students', value: dashStats?.totalStudents ?? 0, icon: Users, color: 'blue' },
                                { label: 'Attendance Marked', value: dashStats?.attendanceRecorded ?? 0, icon: CheckCircle2, color: 'violet' },
                                { label: 'Pending Marks', value: dashStats?.pendingMarks ?? 0, icon: ClipboardList, color: 'amber' },
                            ].map((stat, i) => (
                                <Card key={i} className="border-stone-100 p-10 rounded-[3rem] shadow-sm group hover:shadow-xl transition-all">
                                    <div className="flex justify-between items-start">
                                        <div className={`w-12 h-12 bg-${stat.color}-50 rounded-2xl flex items-center justify-center text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
                                            <stat.icon size={24} />
                                        </div>
                                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest">Live</span>
                                    </div>
                                    <div className="mt-8">
                                        <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-2">{stat.label}</p>
                                        <h4 className="text-4xl font-black text-stone-800">{stat.value}</h4>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                            {/* Submission Pipeline */}
                            <Card className="p-12 rounded-[4rem] border-stone-100 shadow-sm bg-stone-900 text-white space-y-10 relative overflow-hidden">
                                <div className="absolute -right-20 -bottom-20 text-white/5 pointer-events-none"><PieChart size={400} /></div>
                                <h3 className="text-2xl font-black tracking-tight">Submission Pipeline</h3>
                                <div className="grid grid-cols-3 gap-8 relative z-10">
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Drafts</p>
                                        <p className="text-4xl font-black">{analytics?.submissionStatus.draft ?? 0}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Pending</p>
                                        <p className="text-4xl font-black text-orange-400">{analytics?.submissionStatus.pending ?? 0}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Approved</p>
                                        <p className="text-4xl font-black text-emerald-400">{analytics?.submissionStatus.approved ?? 0}</p>
                                    </div>
                                </div>
                            </Card>

                            {/* Quick Actions */}
                            <Card className="p-12 rounded-[4rem] border-stone-100 shadow-sm space-y-8">
                                <h3 className="text-2xl font-black text-stone-800 tracking-tight">Quick Access</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { label: 'Mark Attendance', tab: 'attendance' as FacultyTab, icon: CheckCircle2, color: 'bg-emerald-600' },
                                        { label: 'Upload Marks', tab: 'marks' as FacultyTab, icon: ClipboardList, color: 'bg-indigo-600' },
                                        { label: 'Student List', tab: 'subjects' as FacultyTab, icon: Users, color: 'bg-blue-600' },
                                        { label: 'View Reports', tab: 'analytics' as FacultyTab, icon: BarChart2, color: 'bg-violet-600' },
                                    ].map((btn, i) => (
                                        <button
                                            key={i}
                                            onClick={() => router.push(`/dashboard/faculty?tab=${btn.tab}`)}
                                            className={`${btn.color} text-white p-6 rounded-3xl flex items-center gap-4 font-black text-sm hover:opacity-90 transition-all shadow-lg`}
                                        >
                                            <btn.icon size={20} />
                                            {btn.label}
                                        </button>
                                    ))}
                                </div>
                            </Card>
                        </div>

                        {/* Active Classes */}
                        {activeAssignments.length > 0 && (
                            <Card className="p-12 rounded-[4rem] border-stone-100 shadow-sm space-y-8">
                                <h3 className="text-2xl font-black text-stone-800 tracking-tight">Active Classes</h3>
                                <div className="space-y-4">
                                    {activeAssignments.slice(0, 5).map((a: any, i: number) => (
                                        <div key={i} onClick={() => { selectAssignment(a); router.push('/dashboard/faculty?tab=attendance'); }}
                                            className="flex items-center justify-between p-6 bg-stone-50 rounded-3xl border border-stone-100 group hover:bg-white hover:shadow-xl transition-all cursor-pointer">
                                            <div className="flex items-center gap-6">
                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 font-black shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-all text-xs">
                                                    {a.subjects.subject_code}
                                                </div>
                                                <div>
                                                    <p className="font-black text-stone-800 text-sm tracking-tight">{a.subjects.name}</p>
                                                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                                                        {a.semesters.courses?.name} • Sem {a.semesters.semester_number} {a.section ? `• Sec ${a.section}` : ''} • {a.studentCount} students
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight className="text-stone-300 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>
                )}

                {/* ======== SUBJECTS TAB ======== */}
                {!loading && activeTab === 'subjects' && (
                    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Filters */}
                        <div className="flex flex-wrap items-center gap-4 px-4">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                                <input
                                    className="w-full h-14 pl-14 pr-6 rounded-2xl bg-white border border-stone-100 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-50"
                                    placeholder="Search by subject name or code..."
                                    value={subjectFilter}
                                    onChange={e => setSubjectFilter(e.target.value)}
                                />
                            </div>
                            <select
                                className="h-14 px-6 rounded-2xl bg-white border border-stone-100 text-sm font-bold outline-none"
                                value={semesterFilter}
                                onChange={e => setSemesterFilter(e.target.value)}
                            >
                                <option value="">All Semesters</option>
                                {semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                            {filteredAssignments.map((a: any, i: number) => (
                                <Card key={i} className="border-stone-100 p-10 rounded-[3rem] shadow-sm space-y-6 group hover:shadow-2xl transition-all">
                                    <div className="flex justify-between items-start">
                                        <div className="w-14 h-14 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-600 font-black text-xs shadow-inner group-hover:scale-110 transition-transform">
                                            {a.subjects.subject_code}
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${a.semesters.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-400'}`}>
                                                {a.semesters.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                            <span className="px-3 py-1 bg-stone-50 rounded-lg text-[10px] font-black uppercase text-stone-500">
                                                {a.subjects.subject_type}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-stone-800 tracking-tight leading-tight">{a.subjects.name}</h3>
                                        <p className="text-stone-400 text-xs font-bold mt-2 uppercase tracking-widest">
                                            {a.semesters.courses?.name} • Sem {a.semesters.semester_number} {a.section ? `• Sec ${a.section}` : ''}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 py-4 border-t border-stone-100">
                                        <div>
                                            <p className="text-[10px] font-black text-stone-300 uppercase">Students</p>
                                            <p className="text-lg font-black text-stone-800">{a.studentCount}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-stone-300 uppercase">Credits</p>
                                            <p className="text-lg font-black text-stone-800">{a.subjects.credits}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-stone-300 uppercase">Max Marks</p>
                                            <p className="text-lg font-black text-stone-800">{a.subjects.max_internal + a.subjects.max_external}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <button onClick={() => { selectAssignment(a); router.push('/dashboard/faculty?tab=attendance'); }}
                                            className="flex-1 text-center py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all">
                                            Attendance
                                        </button>
                                        <button onClick={() => { loadMarksForSubject(a); router.push('/dashboard/faculty?tab=marks'); }}
                                            className="flex-1 text-center py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all">
                                            Marks
                                        </button>
                                        <button onClick={() => { loadPerformanceStats(a); router.push('/dashboard/faculty?tab=analytics'); }}
                                            className="flex-1 text-center py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-violet-50 text-violet-600 hover:bg-violet-100 transition-all">
                                            Stats
                                        </button>
                                    </div>
                                </Card>
                            ))}
                            {filteredAssignments.length === 0 && (
                                <div className="col-span-full text-center py-20 text-stone-300 font-black">No subjects match your filters.</div>
                            )}
                        </div>
                    </div>
                )}

                {/* ======== ATTENDANCE TAB ======== */}
                {!loading && activeTab === 'attendance' && (
                    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Subject Selector */}
                        {!selectedAssignment && (
                            <Card className="p-12 rounded-[4rem] border-stone-100 shadow-sm space-y-8">
                                <h3 className="text-2xl font-black text-stone-800 tracking-tight">Select Subject</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {activeAssignments.map((a: any, i: number) => (
                                        <button key={i} onClick={() => selectAssignment(a)}
                                            className="p-6 bg-stone-50 rounded-3xl border border-stone-100 text-left hover:bg-white hover:shadow-lg transition-all group">
                                            <p className="font-black text-stone-800 text-sm">{a.subjects.name}</p>
                                            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">
                                                Sem {a.semesters.semester_number} {a.section ? `• Sec ${a.section}` : ''}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {selectedAssignment && (
                            <>
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-4">
                                    <div>
                                        <button onClick={() => setSelectedAssignment(null)} className="text-emerald-600 font-bold text-xs uppercase tracking-widest mb-2 hover:underline">
                                            ← Change Subject
                                        </button>
                                        <h2 className="text-3xl font-black text-stone-900 tracking-tight">
                                            {selectedAssignment.subjects.name}
                                        </h2>
                                        <p className="text-stone-400 text-xs font-bold mt-1 uppercase tracking-widest">
                                            Sem {selectedAssignment.semesters.semester_number} {selectedAssignment.section ? `• Section ${selectedAssignment.section}` : ''}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 p-1 bg-stone-50 rounded-2xl">
                                        {(['mark', 'history', 'analytics'] as const).map(v => (
                                            <button key={v} onClick={() => {
                                                setAttSubView(v);
                                                if (v === 'history') loadAttendanceHistory(selectedAssignment.subjects.id);
                                                if (v === 'analytics') loadAttendanceAnalytics(selectedAssignment);
                                            }}
                                                className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${attSubView === v ? 'bg-emerald-600 text-white shadow-lg' : 'text-stone-400 hover:text-stone-600'}`}>
                                                {v === 'mark' ? 'Mark' : v === 'history' ? 'History' : 'Analytics'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Mark Attendance */}
                                {attSubView === 'mark' && (
                                    <div className="space-y-6">
                                        <div className="flex flex-wrap items-center gap-4 px-4">
                                            <input type="date" className="h-14 px-6 rounded-2xl bg-white border border-stone-100 text-sm font-black shadow-sm outline-none focus:ring-4 focus:ring-emerald-50"
                                                value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} />
                                            <div className="flex gap-2">
                                                <button onClick={() => markAllStudents('Present')} className="px-5 py-3 rounded-xl text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 hover:bg-emerald-100">All Present</button>
                                                <button onClick={() => markAllStudents('Absent')} className="px-5 py-3 rounded-xl text-[10px] font-black uppercase bg-red-50 text-red-600 hover:bg-red-100">All Absent</button>
                                            </div>
                                            <div className="ml-auto">
                                                <Button className="h-14 px-10 rounded-2xl bg-emerald-600 text-white font-black shadow-xl shadow-emerald-100" onClick={handleMarkAttendance}>
                                                    <Save size={18} className="mr-3" /> Submit Attendance
                                                </Button>
                                            </div>
                                        </div>
                                        <Card className="border-stone-100 overflow-hidden rounded-[3rem] shadow-sm">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead className="bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                                        <tr>
                                                            <th className="px-10 py-8">Roll No</th>
                                                            <th className="px-10 py-8">Student Name</th>
                                                            <th className="px-10 py-8 text-center">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-stone-50">
                                                        {activeStudents.map(s => (
                                                            <tr key={s.uid} className="hover:bg-emerald-50/10 transition-colors">
                                                                <td className="px-10 py-6"><span className="font-black text-emerald-600 text-sm">{s.roll_number || s.uid}</span></td>
                                                                <td className="px-10 py-6 font-black text-stone-800 text-sm">{s.name}</td>
                                                                <td className="px-10 py-6">
                                                                    <div className="flex gap-2 justify-center">
                                                                        {['Present', 'Absent', 'Late', 'Leave'].map(st => (
                                                                            <button key={st} onClick={() => setAttendanceList({ ...attendanceList, [s.uid]: st })}
                                                                                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${attendanceList[s.uid] === st
                                                                                    ? st === 'Present' ? 'bg-emerald-600 text-white' : st === 'Absent' ? 'bg-red-600 text-white' : st === 'Late' ? 'bg-yellow-500 text-white' : 'bg-orange-500 text-white'
                                                                                    : 'bg-stone-50 text-stone-300 hover:bg-stone-100'
                                                                                }`}>
                                                                                {st}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {activeStudents.length === 0 && (
                                                            <tr><td colSpan={3} className="text-center py-16 text-stone-300 font-black">No students found for this class.</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </Card>
                                    </div>
                                )}

                                {/* Attendance History */}
                                {attSubView === 'history' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4 px-4">
                                            <input type="date" className="h-14 px-6 rounded-2xl bg-white border border-stone-100 text-sm font-black shadow-sm outline-none focus:ring-4 focus:ring-emerald-50"
                                                value={attHistoryDate} onChange={e => { setAttHistoryDate(e.target.value); loadAttendanceHistory(selectedAssignment.subjects.id, e.target.value); }} />
                                            {attHistoryDate && (
                                                <button onClick={() => { setAttHistoryDate(''); loadAttendanceHistory(selectedAssignment.subjects.id); }}
                                                    className="text-emerald-600 font-bold text-xs uppercase hover:underline">Clear</button>
                                            )}
                                            <button onClick={() => exportCSV(attendanceHistory.map(a => ({
                                                Date: a.date, Student: a.students?.name || a.student_uid, Roll: a.students?.roll_number || '', Status: a.status
                                            })), 'attendance-history.csv')} className="ml-auto px-6 py-3 rounded-xl text-[10px] font-black uppercase bg-stone-100 text-stone-600 hover:bg-stone-200 flex items-center gap-2">
                                                <Download size={14} /> Export CSV
                                            </button>
                                        </div>
                                        <Card className="border-stone-100 overflow-hidden rounded-[3rem] shadow-sm">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead className="bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                                        <tr>
                                                            <th className="px-10 py-8">Date</th>
                                                            <th className="px-10 py-8">Student</th>
                                                            <th className="px-10 py-8">Roll No</th>
                                                            <th className="px-10 py-8">Status</th>
                                                            {user?.role_level >= 60 && <th className="px-10 py-8 text-center">Edit</th>}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-stone-50">
                                                        {attendanceHistory.map((a: any) => {
                                                            const hrs = (Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60);
                                                            const canEdit = hrs <= 24 && user?.role_level >= 60;
                                                            return (
                                                                <tr key={a.id} className="hover:bg-stone-50/50">
                                                                    <td className="px-10 py-6 text-sm font-bold text-stone-600">{a.date}</td>
                                                                    <td className="px-10 py-6 font-black text-stone-800 text-sm">{a.students?.name || a.student_uid}</td>
                                                                    <td className="px-10 py-6 text-sm text-stone-500">{a.students?.roll_number || '-'}</td>
                                                                    <td className="px-10 py-6">
                                                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${a.status === 'Present' ? 'bg-emerald-50 text-emerald-600' : a.status === 'Absent' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                                                                            {a.status}
                                                                        </span>
                                                                    </td>
                                                                    {user?.role_level >= 60 && (
                                                                        <td className="px-10 py-6 text-center">
                                                                            {canEdit ? (
                                                                                <select className="text-xs font-bold bg-stone-50 rounded-lg px-3 py-2 outline-none"
                                                                                    defaultValue="" onChange={e => { if (e.target.value) handleEditAttendance(a.id, e.target.value); }}>
                                                                                    <option value="" disabled>Change</option>
                                                                                    {['Present', 'Absent', 'Late', 'Leave'].filter(s => s !== a.status).map(s => <option key={s} value={s}>{s}</option>)}
                                                                                </select>
                                                                            ) : (
                                                                                <span className="text-[10px] text-stone-300 font-bold">Locked</span>
                                                                            )}
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            );
                                                        })}
                                                        {attendanceHistory.length === 0 && (
                                                            <tr><td colSpan={5} className="text-center py-16 text-stone-300 font-black">No attendance records found.</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </Card>
                                    </div>
                                )}

                                {/* Attendance Analytics */}
                                {attSubView === 'analytics' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4 px-4">
                                            <p className="text-sm font-black text-stone-500">
                                                {attendanceAnalytics.length > 0 ? `${attendanceAnalytics[0].totalSessions} sessions recorded` : 'No data'}
                                            </p>
                                            <button onClick={() => exportCSV(attendanceAnalytics.map(a => ({
                                                Student: a.name, Roll: a.roll_number, Attendance: `${a.percentage}%`, Present: a.present, Absent: a.absent, Leave: a.leave
                                            })), 'attendance-analytics.csv')} className="ml-auto px-6 py-3 rounded-xl text-[10px] font-black uppercase bg-stone-100 text-stone-600 hover:bg-stone-200 flex items-center gap-2">
                                                <Download size={14} /> Export CSV
                                            </button>
                                        </div>

                                        {/* Shortage Alert */}
                                        {attendanceAnalytics.filter(a => a.shortage).length > 0 && (
                                            <Card className="p-8 rounded-3xl border-red-100 bg-red-50/50 space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <AlertTriangle className="text-red-500" size={20} />
                                                    <h4 className="font-black text-red-700 text-sm">Attendance Shortage Alert (&lt;75%)</h4>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {attendanceAnalytics.filter(a => a.shortage).map(a => (
                                                        <span key={a.uid} className="px-4 py-2 bg-red-100 text-red-700 rounded-xl text-xs font-black">
                                                            {a.name} — {a.percentage}%
                                                        </span>
                                                    ))}
                                                </div>
                                            </Card>
                                        )}

                                        <Card className="border-stone-100 overflow-hidden rounded-[3rem] shadow-sm">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead className="bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                                        <tr>
                                                            <th className="px-10 py-8">Student</th>
                                                            <th className="px-10 py-8">Roll No</th>
                                                            <th className="px-10 py-8 text-center">Present</th>
                                                            <th className="px-10 py-8 text-center">Absent</th>
                                                            <th className="px-10 py-8 text-center">Leave</th>
                                                            <th className="px-10 py-8 text-center">Attendance %</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-stone-50">
                                                        {attendanceAnalytics.map(a => (
                                                            <tr key={a.uid} className={`hover:bg-stone-50/50 ${a.shortage ? 'bg-red-50/30' : ''}`}>
                                                                <td className="px-10 py-6 font-black text-stone-800 text-sm">{a.name}</td>
                                                                <td className="px-10 py-6 text-sm text-stone-500">{a.roll_number || '-'}</td>
                                                                <td className="px-10 py-6 text-center font-black text-emerald-600">{a.present}</td>
                                                                <td className="px-10 py-6 text-center font-black text-red-500">{a.absent}</td>
                                                                <td className="px-10 py-6 text-center font-black text-orange-500">{a.leave}</td>
                                                                <td className="px-10 py-6 text-center">
                                                                    <div className="flex items-center justify-center gap-3">
                                                                        <div className="w-24 h-2 bg-stone-100 rounded-full overflow-hidden">
                                                                            <div className={`h-full rounded-full ${a.shortage ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${a.percentage}%` }} />
                                                                        </div>
                                                                        <span className={`font-black text-sm ${a.shortage ? 'text-red-600' : 'text-stone-800'}`}>{a.percentage}%</span>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {attendanceAnalytics.length === 0 && (
                                                            <tr><td colSpan={6} className="text-center py-16 text-stone-300 font-black">No attendance data yet.</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </Card>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* ======== MARKS TAB ======== */}
                {!loading && activeTab === 'marks' && (
                    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Subject Selector for marks */}
                        {!selectedAssignment && (
                            <Card className="p-12 rounded-[4rem] border-stone-100 shadow-sm space-y-8">
                                <h3 className="text-2xl font-black text-stone-800 tracking-tight">Select Subject for Marks</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {activeAssignments.map((a: any, i: number) => (
                                        <button key={i} onClick={() => loadMarksForSubject(a)}
                                            className="p-6 bg-stone-50 rounded-3xl border border-stone-100 text-left hover:bg-white hover:shadow-lg transition-all group">
                                            <p className="font-black text-stone-800 text-sm">{a.subjects.name}</p>
                                            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">
                                                {a.subjects.subject_type} • {a.subjects.credits} credits • Sem {a.semesters.semester_number} {a.section ? `• Sec ${a.section}` : ''}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {selectedAssignment && marksList.length >= 0 && (
                            <>
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-4">
                                    <div>
                                        <button onClick={() => { setSelectedAssignment(null); setMarksList([]); }} className="text-indigo-600 font-bold text-xs uppercase tracking-widest mb-2 hover:underline">
                                            ← Change Subject
                                        </button>
                                        <h2 className="text-3xl font-black text-stone-900 tracking-tight">{selectedAssignment.subjects.name}</h2>
                                        <p className="text-stone-400 text-xs font-bold mt-1 uppercase tracking-widest">
                                            {selectedAssignment.subjects.subject_type} • Max Internal: {marksSubject?.max_internal ?? 30} • Max External: {marksSubject?.max_external ?? 70}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={16} />
                                            <input className="h-12 pl-12 pr-6 rounded-2xl bg-white border border-stone-100 text-sm font-bold outline-none w-48" placeholder="Search..."
                                                value={marksSearch} onChange={e => setMarksSearch(e.target.value)} />
                                        </div>
                                        <Button variant="outline" className="h-14 px-8 rounded-2xl border-stone-200 font-black text-stone-600" onClick={handleSaveMarks}>
                                            <Save size={18} className="mr-2" /> Save Draft
                                        </Button>
                                        {user?.role_level >= 60 && (
                                            <Button className="h-14 px-10 rounded-2xl bg-indigo-600 text-white font-black shadow-xl shadow-indigo-100" onClick={handleSubmitMarks}>
                                                <CheckCircle2 size={18} className="mr-2" /> Submit to HOD
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Rejection notices */}
                                {marksList.some(m => m.rejection_reason) && (
                                    <Card className="p-8 rounded-3xl border-amber-100 bg-amber-50/50 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <AlertTriangle className="text-amber-500" size={20} />
                                            <h4 className="font-black text-amber-700 text-sm">Marks Rejected — Please Review & Resubmit</h4>
                                        </div>
                                        {marksList.filter(m => m.rejection_reason).slice(0, 1).map((m, i) => (
                                            <p key={i} className="text-xs text-amber-600 font-bold">Reason: {m.rejection_reason}</p>
                                        ))}
                                    </Card>
                                )}

                                <Card className="border-stone-100 overflow-hidden rounded-[4rem] shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                                <tr>
                                                    <th className="px-8 py-8">Student</th>
                                                    <th className="px-8 py-8">Roll No</th>
                                                    <th className="px-8 py-8 text-center">Internal ({marksSubject?.max_internal ?? 30})</th>
                                                    <th className="px-8 py-8 text-center">Mid-Term (20)</th>
                                                    {marksSubject?.subject_type === 'Practical' && <th className="px-8 py-8 text-center">Practical (50)</th>}
                                                    <th className="px-8 py-8 text-center">Total</th>
                                                    <th className="px-8 py-8 text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-50">
                                                {filteredMarks.map((m, i) => {
                                                    const editable = m.status === 'draft';
                                                    const total = (m.internal_marks || 0) + (m.mid_term_marks || 0) + (m.practical_marks || 0);
                                                    const origIdx = marksList.findIndex(o => o.student_uid === m.student_uid);
                                                    return (
                                                        <tr key={m.student_uid} className="hover:bg-indigo-50/5 transition-colors">
                                                            <td className="px-8 py-6">
                                                                <p className="font-black text-stone-800 text-sm">{m.student_name}</p>
                                                                <p className="text-[10px] text-stone-400 font-bold uppercase">{m.student_uid}</p>
                                                            </td>
                                                            <td className="px-8 py-6 text-sm font-bold text-stone-500">{m.roll_number || '-'}</td>
                                                            <td className="px-8 py-6 text-center">
                                                                <input type="number" min={0} max={marksSubject?.max_internal ?? 30}
                                                                    className="w-20 h-12 bg-stone-50 border-0 rounded-xl text-center font-black outline-none focus:ring-4 focus:ring-indigo-50"
                                                                    value={m.internal_marks} disabled={!editable}
                                                                    onChange={e => { const v = Math.min(Number(e.target.value), marksSubject?.max_internal ?? 30); const nl = [...marksList]; nl[origIdx].internal_marks = Math.max(0, v); setMarksList(nl); }} />
                                                            </td>
                                                            <td className="px-8 py-6 text-center">
                                                                <input type="number" min={0} max={20}
                                                                    className="w-20 h-12 bg-stone-50 border-0 rounded-xl text-center font-black outline-none focus:ring-4 focus:ring-indigo-50"
                                                                    value={m.mid_term_marks} disabled={!editable}
                                                                    onChange={e => { const v = Math.min(Number(e.target.value), 20); const nl = [...marksList]; nl[origIdx].mid_term_marks = Math.max(0, v); setMarksList(nl); }} />
                                                            </td>
                                                            {marksSubject?.subject_type === 'Practical' && (
                                                                <td className="px-8 py-6 text-center">
                                                                    <input type="number" min={0} max={50}
                                                                        className="w-20 h-12 bg-stone-50 border-0 rounded-xl text-center font-black outline-none focus:ring-4 focus:ring-indigo-50"
                                                                        value={m.practical_marks} disabled={!editable}
                                                                        onChange={e => { const v = Math.min(Number(e.target.value), 50); const nl = [...marksList]; nl[origIdx].practical_marks = Math.max(0, v); setMarksList(nl); }} />
                                                                </td>
                                                            )}
                                                            <td className="px-8 py-6 text-center font-black text-stone-800">{total}</td>
                                                            <td className="px-8 py-6 text-center">
                                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${statusBadge(m.status)}`}>
                                                                    {m.status === 'pending_hod' ? 'Pending HOD' : m.status === 'pending_admin' ? 'Pending Admin' : m.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {filteredMarks.length === 0 && (
                                                    <tr><td colSpan={7} className="text-center py-16 text-stone-300 font-black">No students found.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </>
                        )}
                    </div>
                )}

                {/* ======== ANALYTICS TAB ======== */}
                {!loading && activeTab === 'analytics' && (
                    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Subject selector for analytics */}
                        {!perfStats && (
                            <Card className="p-12 rounded-[4rem] border-stone-100 shadow-sm space-y-8">
                                <h3 className="text-2xl font-black text-stone-800 tracking-tight">Select Subject for Performance Analytics</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {activeAssignments.map((a: any, i: number) => (
                                        <button key={i} onClick={() => loadPerformanceStats(a)}
                                            className="p-6 bg-stone-50 rounded-3xl border border-stone-100 text-left hover:bg-white hover:shadow-lg transition-all">
                                            <p className="font-black text-stone-800 text-sm">{a.subjects.name}</p>
                                            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">
                                                Sem {a.semesters.semester_number} {a.section ? `• Sec ${a.section}` : ''}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {perfStats && selectedAssignment && (
                            <>
                                <div className="flex justify-between items-center px-4">
                                    <div>
                                        <button onClick={() => { setPerfStats(null); setSelectedAssignment(null); }} className="text-violet-600 font-bold text-xs uppercase tracking-widest mb-2 hover:underline">
                                            ← Change Subject
                                        </button>
                                        <h2 className="text-3xl font-black text-stone-900 tracking-tight">{selectedAssignment.subjects.name} — Performance</h2>
                                    </div>
                                    <button onClick={() => exportCSV(perfStats.students.map((s: any) => ({
                                        Student: s.name, Roll: s.roll_number, Internal: s.internal, MidTerm: s.midterm, Practical: s.practical, Total: s.total, Status: s.status
                                    })), 'marks-report.csv')} className="px-6 py-3 rounded-xl text-[10px] font-black uppercase bg-stone-100 text-stone-600 hover:bg-stone-200 flex items-center gap-2">
                                        <Download size={14} /> Export CSV
                                    </button>
                                </div>

                                {/* Summary Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    {[
                                        { label: 'Class Average', value: perfStats.classAvg, color: 'blue' },
                                        { label: 'Highest Marks', value: perfStats.highest, color: 'emerald' },
                                        { label: 'Lowest Marks', value: perfStats.lowest, color: 'red' },
                                        { label: 'Total Students', value: perfStats.totalStudents, color: 'violet' },
                                    ].map((s, i) => (
                                        <Card key={i} className={`p-8 rounded-3xl border-stone-100 shadow-sm`}>
                                            <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-2">{s.label}</p>
                                            <p className={`text-4xl font-black text-${s.color}-600`}>{s.value}</p>
                                        </Card>
                                    ))}
                                </div>

                                {/* Distribution */}
                                {perfStats.distribution && perfStats.distribution.length > 0 && (
                                    <Card className="p-10 rounded-[3rem] border-stone-100 shadow-sm space-y-6">
                                        <h3 className="text-xl font-black text-stone-800 tracking-tight">Marks Distribution</h3>
                                        <div className="space-y-4">
                                            {perfStats.distribution.map((d: any) => (
                                                <div key={d.range} className="flex items-center gap-4">
                                                    <span className="w-24 text-xs font-black text-stone-500">{d.range}</span>
                                                    <div className="flex-1 h-8 bg-stone-50 rounded-xl overflow-hidden">
                                                        <div className="h-full bg-violet-500 rounded-xl transition-all" style={{ width: `${perfStats.totalStudents > 0 ? (d.count / perfStats.totalStudents) * 100 : 0}%` }} />
                                                    </div>
                                                    <span className="w-10 text-right text-sm font-black text-stone-700">{d.count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                )}

                                {/* Student-wise table */}
                                <Card className="border-stone-100 overflow-hidden rounded-[3rem] shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                                <tr>
                                                    <th className="px-8 py-8">Student</th>
                                                    <th className="px-8 py-8">Roll No</th>
                                                    <th className="px-8 py-8 text-center">Internal</th>
                                                    <th className="px-8 py-8 text-center">Mid-Term</th>
                                                    <th className="px-8 py-8 text-center">Practical</th>
                                                    <th className="px-8 py-8 text-center">Total</th>
                                                    <th className="px-8 py-8 text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-50">
                                                {perfStats.students.map((s: any) => (
                                                    <tr key={s.uid} className="hover:bg-stone-50/50">
                                                        <td className="px-8 py-6 font-black text-stone-800 text-sm">{s.name}</td>
                                                        <td className="px-8 py-6 text-sm text-stone-500">{s.roll_number || '-'}</td>
                                                        <td className="px-8 py-6 text-center font-bold text-stone-600">{s.internal}</td>
                                                        <td className="px-8 py-6 text-center font-bold text-stone-600">{s.midterm}</td>
                                                        <td className="px-8 py-6 text-center font-bold text-stone-600">{s.practical}</td>
                                                        <td className="px-8 py-6 text-center font-black text-stone-800">{s.total}</td>
                                                        <td className="px-8 py-6 text-center">
                                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${statusBadge(s.status)}`}>{s.status}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {perfStats.students.length === 0 && (
                                                    <tr><td colSpan={7} className="text-center py-16 text-stone-300 font-black">No marks data available.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </>
                        )}
                    </div>
                )}

                {/* ======== SCHEDULE TAB ======== */}
                {!loading && activeTab === 'schedule' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-6 animate-in fade-in duration-500">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                            <div key={day} className="space-y-6">
                                <h4 className="text-sm font-black text-stone-300 uppercase tracking-widest text-center py-4 border-b border-stone-50">{day.slice(0, 3)}</h4>
                                <div className="space-y-4">
                                    {timetable.filter((t: any) => t.day === day).map((item: any, idx: number) => (
                                        <Card key={idx} className="p-6 border-stone-100 shadow-sm space-y-4 group hover:bg-stone-900 hover:text-white transition-all">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-6 bg-emerald-600 rounded-full" />
                                                <p className="text-[10px] font-black uppercase tracking-tight truncate">{item.subjects?.name}</p>
                                            </div>
                                            <div className="space-y-1.5 opacity-60">
                                                <p className="text-[10px] font-bold flex items-center gap-2"><Clock size={12} /> {item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}</p>
                                                <p className="text-[10px] font-bold flex items-center gap-2"><MapPin size={12} /> {item.room}</p>
                                            </div>
                                        </Card>
                                    ))}
                                    {timetable.filter((t: any) => t.day === day).length === 0 && (
                                        <div className="py-20 text-center border border-dashed border-stone-100 rounded-3xl">
                                            <span className="text-[10px] font-black text-stone-200 uppercase">Free</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
