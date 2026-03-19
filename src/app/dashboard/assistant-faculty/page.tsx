'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    getAsstFacultyDashboardAction,
    getAsstFacultyAssignmentsAction,
    getFacultyStudentsAction,
    getFacultyAttendanceAnalyticsAction,
    markAttendanceAction,
    editFacultyAttendanceAction,
    getFacultyAttendanceHistoryAction,
    createAssignmentAction,
    getAssignmentsListAction,
    getAssignmentStudentsAction,
    gradeAssignmentAction,
    getLabMarksAction,
    saveLabMarksAction,
    createStudentIssueAction,
    getStudentIssuesAction,
    updateStudentIssueAction,
    getAsstAttendanceSummaryAction,
} from '@/lib/actions';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
    Search, CheckCircle2, BookOpen, Save,
    Activity, ClipboardList, Users, AlertTriangle,
    Download, RefreshCw, Calendar, Clock,
    Plus, FileText, MessageSquare, BarChart2,
    ChevronRight, X, Beaker
} from 'lucide-react';

type AsstTab = 'overview' | 'subjects' | 'attendance' | 'assignments' | 'lab-marks' | 'issues' | 'analytics';

export default function AssistantFacultyDashboard() {
    return (
        <Suspense fallback={
            <DashboardLayout>
                <div className="flex h-[50vh] items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                </div>
            </DashboardLayout>
        }>
            <AssistantFacultyDashboardContent />
        </Suspense>
    );
}

function AssistantFacultyDashboardContent() {
    const { data: session } = useSession();
    const user = session?.user as any;
    const router = useRouter();
    const searchParams = useSearchParams();

    const activeTab = (searchParams.get('tab') as AsstTab) || 'overview';
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

    // Data
    const [dashStats, setDashStats] = useState<any>(null);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
    const [activeStudents, setActiveStudents] = useState<any[]>([]);

    // Subjects
    const [subjectFilter, setSubjectFilter] = useState('');

    // Attendance
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceList, setAttendanceList] = useState<Record<string, string>>({});
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
    const [attSubView, setAttSubView] = useState<'mark' | 'history'>('mark');
    const [attHistoryDate, setAttHistoryDate] = useState('');

    // Assignments module
    const [assignmentsList, setAssignmentsList] = useState<any[]>([]);
    const [assignmentStudents, setAssignmentStudents] = useState<any[]>([]);
    const [selectedAssignmentForGrade, setSelectedAssignmentForGrade] = useState<any>(null);
    const [gradesList, setGradesList] = useState<any[]>([]);
    const [showCreateAssignment, setShowCreateAssignment] = useState(false);
    const [newAssignment, setNewAssignment] = useState({ title: '', description: '', due_date: '', max_marks: 10 });

    // Lab marks
    const [labMarksList, setLabMarksList] = useState<any[]>([]);

    // Issues
    const [issues, setIssues] = useState<any[]>([]);
    const [issueFilter, setIssueFilter] = useState('all');
    const [showCreateIssue, setShowCreateIssue] = useState(false);
    const [newIssue, setNewIssue] = useState({ student_uid: '', subject_id: '', description: '' });

    // Analytics
    const [attSummary, setAttSummary] = useState<any[]>([]);

    // Student search
    const [studentSearch, setStudentSearch] = useState('');

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
            const [stats, assign] = await Promise.all([
                getAsstFacultyDashboardAction(),
                getAsstFacultyAssignmentsAction(),
            ]);
            setDashStats(stats);
            setAssignments(assign || []);
        } catch (err: any) {
            flash('err', err.message);
        }
        setLoading(false);
    };

    const selectSubject = async (a: any) => {
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

    // ---- Attendance ----
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
            flash('ok', 'Attendance submitted successfully.');
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

    const loadAttHistory = async (subjectId: string, date?: string) => {
        setLoading(true);
        try {
            const data = await getFacultyAttendanceHistoryAction(subjectId, date || undefined);
            setAttendanceHistory(data || []);
        } catch (err: any) {
            flash('err', err.message);
        }
        setLoading(false);
    };

    const handleEditAttendance = async (id: string, newStatus: string) => {
        setLoading(true);
        try {
            await editFacultyAttendanceAction(id, newStatus);
            flash('ok', 'Attendance updated.');
            if (selectedAssignment) loadAttHistory(selectedAssignment.subjects.id, attHistoryDate || undefined);
        } catch (err: any) {
            flash('err', err.message);
        }
        setLoading(false);
    };

    // ---- Assignments ----
    const loadAssignments = async (subjectId?: string) => {
        setLoading(true);
        try {
            const data = await getAssignmentsListAction(subjectId);
            setAssignmentsList(data || []);
        } catch (err: any) {
            flash('err', err.message);
        }
        setLoading(false);
    };

    const handleCreateAssignment = async () => {
        if (!selectedAssignment || !newAssignment.title || !newAssignment.due_date) return flash('err', 'Fill all required fields.');
        setLoading(true);
        try {
            await createAssignmentAction({
                subject_id: selectedAssignment.subjects.id,
                semester_id: selectedAssignment.semesters.id,
                section: selectedAssignment.section,
                ...newAssignment,
            });
            flash('ok', 'Assignment created.');
            setShowCreateAssignment(false);
            setNewAssignment({ title: '', description: '', due_date: '', max_marks: 10 });
            loadAssignments(selectedAssignment.subjects.id);
        } catch (err: any) {
            flash('err', err.message);
        }
        setLoading(false);
    };

    const loadAssignmentForGrade = async (assignmentId: string) => {
        setLoading(true);
        try {
            const res = await getAssignmentStudentsAction(assignmentId);
            setSelectedAssignmentForGrade(res.assignment);
            setGradesList(res.students);
        } catch (err: any) {
            flash('err', err.message);
        }
        setLoading(false);
    };

    const handleGradeAssignment = async () => {
        if (!selectedAssignmentForGrade) return;
        const toGrade = gradesList.filter(g => g.marks_obtained !== null && g.marks_obtained !== undefined);
        if (toGrade.length === 0) return flash('err', 'Enter at least one mark.');
        setLoading(true);
        try {
            await gradeAssignmentAction(selectedAssignmentForGrade.id, toGrade.map(g => ({
                student_uid: g.student_uid,
                marks_obtained: g.marks_obtained,
                remarks: g.remarks,
            })));
            flash('ok', 'Grades saved.');
        } catch (err: any) {
            flash('err', err.message);
        }
        setLoading(false);
    };

    // ---- Lab Marks ----
    const loadLabMarks = async (a: any) => {
        setSelectedAssignment(a);
        setLoading(true);
        try {
            const data = await getLabMarksAction(a.subjects.id, a.semesters.id);
            setLabMarksList(data);
        } catch (err: any) {
            flash('err', err.message);
        }
        setLoading(false);
    };

    const handleSaveLabMarks = async () => {
        if (!selectedAssignment) return;
        setLoading(true);
        try {
            await saveLabMarksAction(selectedAssignment.subjects.id, selectedAssignment.semesters.id,
                labMarksList.map(m => ({
                    student_uid: m.student_uid,
                    experiment_marks: m.experiment_marks,
                    practical_marks: m.practical_marks,
                    viva_marks: m.viva_marks,
                    remarks: m.remarks,
                }))
            );
            flash('ok', 'Lab marks saved as drafts.');
        } catch (err: any) {
            flash('err', err.message);
        }
        setLoading(false);
    };

    // ---- Issues ----
    const loadIssues = async (status?: string) => {
        setLoading(true);
        try {
            const data = await getStudentIssuesAction(status);
            setIssues(data || []);
        } catch (err: any) {
            flash('err', err.message);
        }
        setLoading(false);
    };

    const handleCreateIssue = async () => {
        if (!newIssue.student_uid || !newIssue.description) return flash('err', 'Student and description are required.');
        setLoading(true);
        try {
            await createStudentIssueAction(newIssue);
            flash('ok', 'Issue logged.');
            setShowCreateIssue(false);
            setNewIssue({ student_uid: '', subject_id: '', description: '' });
            loadIssues(issueFilter);
        } catch (err: any) {
            flash('err', err.message);
        }
        setLoading(false);
    };

    const handleUpdateIssue = async (id: string, status: string) => {
        setLoading(true);
        try {
            await updateStudentIssueAction(id, { status });
            flash('ok', 'Issue updated.');
            loadIssues(issueFilter);
        } catch (err: any) {
            flash('err', err.message);
        }
        setLoading(false);
    };

    // ---- Analytics ----
    const loadAnalytics = async () => {
        setLoading(true);
        try {
            const data = await getAsstAttendanceSummaryAction();
            setAttSummary(data || []);
        } catch (err: any) {
            flash('err', err.message);
        }
        setLoading(false);
    };

    // Utilities
    const exportCSV = (rows: any[], filename: string) => {
        if (rows.length === 0) return;
        const keys = Object.keys(rows[0]);
        const csv = [keys.join(','), ...rows.map(r => keys.map(k => `"${r[k] ?? ''}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    };

    const activeAssignments = useMemo(() => assignments.filter((a: any) => a.semesters?.is_active), [assignments]);
    const filteredAssignments = useMemo(() => {
        if (!subjectFilter) return assignments;
        const q = subjectFilter.toLowerCase();
        return assignments.filter(a => a.subjects?.name.toLowerCase().includes(q) || a.subjects?.subject_code.toLowerCase().includes(q));
    }, [assignments, subjectFilter]);

    const filteredStudents = useMemo(() => {
        if (!studentSearch) return activeStudents;
        const q = studentSearch.toLowerCase();
        return activeStudents.filter(s => s.name?.toLowerCase().includes(q) || s.uid?.toLowerCase().includes(q) || s.roll_number?.toLowerCase().includes(q));
    }, [activeStudents, studentSearch]);

    const issueStatusColor: Record<string, string> = {
        open: 'bg-red-50 text-red-600',
        in_progress: 'bg-amber-50 text-amber-600',
        resolved: 'bg-emerald-50 text-emerald-600',
        closed: 'bg-stone-100 text-stone-500',
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
                    <div className="absolute top-0 right-0 p-12 text-teal-500/5 pointer-events-none">
                        <Beaker size={320} />
                    </div>
                    <div className="relative z-10 space-y-2">
                        <h1 className="text-5xl font-black text-stone-900 tracking-tight leading-none">Academic Support</h1>
                        <p className="text-teal-600 font-extrabold uppercase tracking-[0.2em] text-xs">
                            {user?.name || 'Assistant Faculty'} • {user?.uid_eid || 'Academic Support'}
                        </p>
                    </div>
                </div>

                {loading && (
                    <div className="flex justify-center py-20">
                        <RefreshCw className="animate-spin text-teal-400" size={32} />
                    </div>
                )}

                {/* ======== OVERVIEW ======== */}
                {!loading && activeTab === 'overview' && (
                    <div className="space-y-10 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
                            {[
                                { label: 'Assigned Subjects', value: dashStats?.subjects ?? 0, icon: BookOpen, color: 'teal' },
                                { label: 'Total Students', value: dashStats?.students ?? 0, icon: Users, color: 'blue' },
                                { label: 'Assignments', value: dashStats?.assignments ?? 0, icon: FileText, color: 'violet' },
                                { label: 'Attendance Sessions', value: dashStats?.attendanceSessions ?? 0, icon: CheckCircle2, color: 'emerald' },
                                { label: 'Open Issues', value: dashStats?.openIssues ?? 0, icon: AlertTriangle, color: 'amber' },
                            ].map((stat, i) => (
                                <Card key={i} className="border-stone-100 p-8 rounded-[3rem] shadow-sm group hover:shadow-xl transition-all">
                                    <div className="flex justify-between items-start">
                                        <div className={`w-11 h-11 bg-${stat.color}-50 rounded-2xl flex items-center justify-center text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
                                            <stat.icon size={20} />
                                        </div>
                                        <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-3 py-1 rounded-full uppercase tracking-widest">Live</span>
                                    </div>
                                    <div className="mt-6">
                                        <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-1">{stat.label}</p>
                                        <h4 className="text-3xl font-black text-stone-800">{stat.value}</h4>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                            <Card className="p-10 rounded-[4rem] border-stone-100 shadow-sm space-y-6">
                                <h3 className="text-2xl font-black text-stone-800 tracking-tight">Quick Actions</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: 'Mark Attendance', tab: 'attendance' as AsstTab, icon: CheckCircle2, color: 'bg-teal-600' },
                                        { label: 'Upload Assignment', tab: 'assignments' as AsstTab, icon: FileText, color: 'bg-violet-600' },
                                        { label: 'Record Lab Marks', tab: 'lab-marks' as AsstTab, icon: Beaker, color: 'bg-blue-600' },
                                        { label: 'Log Issue', tab: 'issues' as AsstTab, icon: MessageSquare, color: 'bg-amber-600' },
                                    ].map((btn, i) => (
                                        <button key={i} onClick={() => router.push(`/dashboard/assistant-faculty?tab=${btn.tab}`)}
                                            className={`${btn.color} text-white p-5 rounded-3xl flex items-center gap-3 font-black text-sm hover:opacity-90 transition-all shadow-lg`}>
                                            <btn.icon size={18} /> {btn.label}
                                        </button>
                                    ))}
                                </div>
                            </Card>

                            {/* Active Subjects */}
                            <Card className="p-10 rounded-[4rem] border-stone-100 shadow-sm space-y-6">
                                <h3 className="text-2xl font-black text-stone-800 tracking-tight">My Subjects</h3>
                                <div className="space-y-3">
                                    {activeAssignments.slice(0, 4).map((a: any, i: number) => (
                                        <div key={i} onClick={() => { selectSubject(a); router.push('/dashboard/assistant-faculty?tab=attendance'); }}
                                            className="flex items-center justify-between p-5 bg-stone-50 rounded-2xl border border-stone-100 group hover:bg-white hover:shadow-lg transition-all cursor-pointer">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-teal-600 font-black shadow-sm group-hover:bg-teal-600 group-hover:text-white transition-all text-[10px]">
                                                    {a.subjects?.subject_code}
                                                </div>
                                                <div>
                                                    <p className="font-black text-stone-800 text-sm">{a.subjects?.name}</p>
                                                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                                                        Sem {a.semesters?.semester_number} {a.section ? `• Sec ${a.section}` : ''} • {a.studentCount} students • Main: {a.mainFaculty}
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight className="text-stone-300 group-hover:translate-x-1 transition-transform" size={18} />
                                        </div>
                                    ))}
                                    {activeAssignments.length === 0 && <p className="text-stone-300 font-bold text-sm text-center py-8">No active subjects assigned.</p>}
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {/* ======== SUBJECTS TAB ======== */}
                {!loading && activeTab === 'subjects' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-4 px-4">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                                <input className="w-full h-14 pl-14 pr-6 rounded-2xl bg-white border border-stone-100 text-sm font-bold outline-none focus:ring-4 focus:ring-teal-50"
                                    placeholder="Filter subjects..." value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredAssignments.map((a: any, i: number) => (
                                <Card key={i} className="border-stone-100 p-8 rounded-[3rem] shadow-sm space-y-5 group hover:shadow-2xl transition-all">
                                    <div className="flex justify-between items-start">
                                        <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 font-black text-[10px] shadow-inner group-hover:scale-110 transition-transform">
                                            {a.subjects?.subject_code}
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${a.semesters?.is_active ? 'bg-teal-50 text-teal-600' : 'bg-stone-100 text-stone-400'}`}>
                                                {a.semesters?.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                            <span className="px-3 py-1 bg-stone-50 rounded-lg text-[10px] font-black uppercase text-stone-500">{a.subjects?.subject_type}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-stone-800 tracking-tight leading-tight">{a.subjects?.name}</h3>
                                        <p className="text-stone-400 text-xs font-bold mt-2 uppercase tracking-widest">
                                            {a.semesters?.courses?.name} • Sem {a.semesters?.semester_number} {a.section ? `• Sec ${a.section}` : ''}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 py-3 border-t border-stone-100">
                                        <div>
                                            <p className="text-[10px] font-black text-stone-300 uppercase">Students</p>
                                            <p className="text-lg font-black text-stone-800">{a.studentCount}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-stone-300 uppercase">Credits</p>
                                            <p className="text-lg font-black text-stone-800">{a.subjects?.credits}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-stone-300 uppercase">Lead</p>
                                            <p className="text-xs font-black text-teal-600 truncate">{a.mainFaculty}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { selectSubject(a); router.push('/dashboard/assistant-faculty?tab=attendance'); }}
                                            className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-teal-50 text-teal-600 hover:bg-teal-100 transition-all">Attend.</button>
                                        <button onClick={() => { setSelectedAssignment(a); loadAssignments(a.subjects?.id); router.push('/dashboard/assistant-faculty?tab=assignments'); }}
                                            className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-violet-50 text-violet-600 hover:bg-violet-100 transition-all">Assign.</button>
                                        <button onClick={() => { loadLabMarks(a); router.push('/dashboard/assistant-faculty?tab=lab-marks'); }}
                                            className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all">Lab</button>
                                    </div>
                                </Card>
                            ))}
                            {filteredAssignments.length === 0 && <div className="col-span-full text-center py-20 text-stone-300 font-black">No subjects found.</div>}
                        </div>
                    </div>
                )}

                {/* ======== ATTENDANCE TAB ======== */}
                {!loading && activeTab === 'attendance' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        {!selectedAssignment && (
                            <Card className="p-10 rounded-[4rem] border-stone-100 shadow-sm space-y-6">
                                <h3 className="text-2xl font-black text-stone-800 tracking-tight">Select Subject for Attendance</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {activeAssignments.map((a: any, i: number) => (
                                        <button key={i} onClick={() => selectSubject(a)}
                                            className="p-5 bg-stone-50 rounded-2xl border border-stone-100 text-left hover:bg-white hover:shadow-lg transition-all">
                                            <p className="font-black text-stone-800 text-sm">{a.subjects?.name}</p>
                                            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">
                                                Sem {a.semesters?.semester_number} {a.section ? `• Sec ${a.section}` : ''}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {selectedAssignment && (
                            <>
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-4">
                                    <div>
                                        <button onClick={() => setSelectedAssignment(null)} className="text-teal-600 font-bold text-xs uppercase tracking-widest mb-1 hover:underline">← Change Subject</button>
                                        <h2 className="text-2xl font-black text-stone-900 tracking-tight">{selectedAssignment.subjects?.name}</h2>
                                        <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">Sem {selectedAssignment.semesters?.semester_number} {selectedAssignment.section ? `• Sec ${selectedAssignment.section}` : ''}</p>
                                    </div>
                                    <div className="flex gap-2 p-1 bg-stone-50 rounded-xl">
                                        {(['mark', 'history'] as const).map(v => (
                                            <button key={v} onClick={() => {
                                                setAttSubView(v);
                                                if (v === 'history') loadAttHistory(selectedAssignment.subjects.id);
                                            }}
                                                className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${attSubView === v ? 'bg-teal-600 text-white shadow-lg' : 'text-stone-400 hover:text-stone-600'}`}>
                                                {v === 'mark' ? 'Mark' : 'History'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {attSubView === 'mark' && (
                                    <div className="space-y-6">
                                        <div className="flex flex-wrap items-center gap-4 px-4">
                                            <input type="date" className="h-12 px-5 rounded-xl bg-white border border-stone-100 text-sm font-black shadow-sm outline-none focus:ring-4 focus:ring-teal-50"
                                                value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} />
                                            <div className="flex gap-2">
                                                <button onClick={() => markAllStudents('Present')} className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 hover:bg-emerald-100">All Present</button>
                                                <button onClick={() => markAllStudents('Absent')} className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase bg-red-50 text-red-600 hover:bg-red-100">All Absent</button>
                                            </div>
                                            <Button className="ml-auto h-12 px-8 rounded-xl bg-teal-600 text-white font-black shadow-xl shadow-teal-100" onClick={handleMarkAttendance}>
                                                <Save size={16} className="mr-2" /> Submit
                                            </Button>
                                        </div>
                                        <Card className="border-stone-100 overflow-hidden rounded-[3rem] shadow-sm">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead className="bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                                        <tr>
                                                            <th className="px-8 py-6">Roll No</th>
                                                            <th className="px-8 py-6">Student</th>
                                                            <th className="px-8 py-6 text-center">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-stone-50">
                                                        {activeStudents.map(s => (
                                                            <tr key={s.uid} className="hover:bg-teal-50/10 transition-colors">
                                                                <td className="px-8 py-5"><span className="font-black text-teal-600 text-sm">{s.roll_number || s.uid}</span></td>
                                                                <td className="px-8 py-5 font-black text-stone-800 text-sm">{s.name}</td>
                                                                <td className="px-8 py-5">
                                                                    <div className="flex gap-1.5 justify-center">
                                                                        {['Present', 'Absent', 'Late', 'Leave'].map(st => (
                                                                            <button key={st} onClick={() => setAttendanceList({ ...attendanceList, [s.uid]: st })}
                                                                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${attendanceList[s.uid] === st
                                                                                    ? st === 'Present' ? 'bg-emerald-600 text-white' : st === 'Absent' ? 'bg-red-600 text-white' : st === 'Late' ? 'bg-yellow-500 text-white' : 'bg-orange-500 text-white'
                                                                                    : 'bg-stone-50 text-stone-300 hover:bg-stone-100'
                                                                                }`}>{st}</button>
                                                                        ))}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {activeStudents.length === 0 && <tr><td colSpan={3} className="text-center py-16 text-stone-300 font-black">No students found.</td></tr>}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </Card>
                                    </div>
                                )}

                                {attSubView === 'history' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4 px-4">
                                            <input type="date" className="h-12 px-5 rounded-xl bg-white border border-stone-100 text-sm font-black shadow-sm outline-none"
                                                value={attHistoryDate} onChange={e => { setAttHistoryDate(e.target.value); loadAttHistory(selectedAssignment.subjects.id, e.target.value); }} />
                                            {attHistoryDate && <button onClick={() => { setAttHistoryDate(''); loadAttHistory(selectedAssignment.subjects.id); }} className="text-teal-600 font-bold text-xs uppercase hover:underline">Clear</button>}
                                            <button onClick={() => exportCSV(attendanceHistory.map(a => ({
                                                Date: a.date, Student: a.students?.name || a.student_uid, Roll: a.students?.roll_number || '', Status: a.status
                                            })), 'attendance-history.csv')} className="ml-auto px-5 py-2.5 rounded-xl text-[10px] font-black uppercase bg-stone-100 text-stone-600 hover:bg-stone-200 flex items-center gap-2">
                                                <Download size={14} /> CSV
                                            </button>
                                        </div>
                                        <Card className="border-stone-100 overflow-hidden rounded-[3rem] shadow-sm">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead className="bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                                        <tr>
                                                            <th className="px-8 py-6">Date</th>
                                                            <th className="px-8 py-6">Student</th>
                                                            <th className="px-8 py-6">Status</th>
                                                            <th className="px-8 py-6 text-center">Edit</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-stone-50">
                                                        {attendanceHistory.map((a: any) => {
                                                            const hrs = (Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60);
                                                            const canEdit = hrs <= 24;
                                                            return (
                                                                <tr key={a.id} className="hover:bg-stone-50/50">
                                                                    <td className="px-8 py-5 text-sm font-bold text-stone-600">{a.date}</td>
                                                                    <td className="px-8 py-5 font-black text-stone-800 text-sm">{a.students?.name || a.student_uid}</td>
                                                                    <td className="px-8 py-5">
                                                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${a.status === 'Present' ? 'bg-emerald-50 text-emerald-600' : a.status === 'Absent' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>{a.status}</span>
                                                                    </td>
                                                                    <td className="px-8 py-5 text-center">
                                                                        {canEdit ? (
                                                                            <select className="text-xs font-bold bg-stone-50 rounded-lg px-3 py-2 outline-none" defaultValue=""
                                                                                onChange={e => { if (e.target.value) handleEditAttendance(a.id, e.target.value); }}>
                                                                                <option value="" disabled>Change</option>
                                                                                {['Present', 'Absent', 'Late', 'Leave'].filter(s => s !== a.status).map(s => <option key={s} value={s}>{s}</option>)}
                                                                            </select>
                                                                        ) : <span className="text-[10px] text-stone-300 font-bold">Locked</span>}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                        {attendanceHistory.length === 0 && <tr><td colSpan={4} className="text-center py-16 text-stone-300 font-black">No records found.</td></tr>}
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

                {/* ======== ASSIGNMENTS TAB ======== */}
                {!loading && activeTab === 'assignments' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Subject selector */}
                        {!selectedAssignment && (
                            <Card className="p-10 rounded-[4rem] border-stone-100 shadow-sm space-y-6">
                                <h3 className="text-2xl font-black text-stone-800 tracking-tight">Select Subject</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {activeAssignments.map((a: any, i: number) => (
                                        <button key={i} onClick={() => { setSelectedAssignment(a); loadAssignments(a.subjects?.id); }}
                                            className="p-5 bg-stone-50 rounded-2xl border border-stone-100 text-left hover:bg-white hover:shadow-lg transition-all">
                                            <p className="font-black text-stone-800 text-sm">{a.subjects?.name}</p>
                                            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">Sem {a.semesters?.semester_number}</p>
                                        </button>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {selectedAssignment && (
                            <>
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-4">
                                    <div>
                                        <button onClick={() => { setSelectedAssignment(null); setSelectedAssignmentForGrade(null); }} className="text-violet-600 font-bold text-xs uppercase tracking-widest mb-1 hover:underline">← Change Subject</button>
                                        <h2 className="text-2xl font-black text-stone-900 tracking-tight">{selectedAssignment.subjects?.name} — Assignments</h2>
                                    </div>
                                    <Button className="h-12 px-8 rounded-xl bg-violet-600 text-white font-black shadow-lg" onClick={() => setShowCreateAssignment(true)}>
                                        <Plus size={16} className="mr-2" /> New Assignment
                                    </Button>
                                </div>

                                {/* Create Assignment Modal */}
                                {showCreateAssignment && (
                                    <Card className="p-8 rounded-3xl border-violet-100 shadow-md space-y-5">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-black text-stone-800">Create Assignment</h4>
                                            <button onClick={() => setShowCreateAssignment(false)}><X size={18} className="text-stone-400" /></button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Title *</label>
                                                <input className="w-full h-12 px-4 rounded-xl bg-stone-50 border-0 font-bold outline-none" placeholder="Assignment title"
                                                    value={newAssignment.title} onChange={e => setNewAssignment({ ...newAssignment, title: e.target.value })} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Due Date *</label>
                                                <input type="date" className="w-full h-12 px-4 rounded-xl bg-stone-50 border-0 font-bold outline-none"
                                                    value={newAssignment.due_date} onChange={e => setNewAssignment({ ...newAssignment, due_date: e.target.value })} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Max Marks</label>
                                                <input type="number" min={1} className="w-full h-12 px-4 rounded-xl bg-stone-50 border-0 font-bold outline-none"
                                                    value={newAssignment.max_marks} onChange={e => setNewAssignment({ ...newAssignment, max_marks: Number(e.target.value) })} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Description</label>
                                                <input className="w-full h-12 px-4 rounded-xl bg-stone-50 border-0 font-bold outline-none" placeholder="Optional description"
                                                    value={newAssignment.description} onChange={e => setNewAssignment({ ...newAssignment, description: e.target.value })} />
                                            </div>
                                        </div>
                                        <Button className="h-12 px-8 rounded-xl bg-violet-600 text-white font-black" onClick={handleCreateAssignment}>
                                            Create Assignment
                                        </Button>
                                    </Card>
                                )}

                                {/* Grading view */}
                                {selectedAssignmentForGrade && (
                                    <Card className="border-stone-100 rounded-[3rem] shadow-sm overflow-hidden">
                                        <div className="p-8 border-b border-stone-100 flex justify-between items-center">
                                            <div>
                                                <h4 className="font-black text-stone-800">Grading: {selectedAssignmentForGrade.title}</h4>
                                                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Max Marks: {selectedAssignmentForGrade.max_marks}</p>
                                            </div>
                                            <div className="flex gap-3">
                                                <Button variant="outline" className="h-10 px-6 rounded-xl font-black text-stone-600 border-stone-200" onClick={() => setSelectedAssignmentForGrade(null)}>Close</Button>
                                                <Button className="h-10 px-6 rounded-xl bg-violet-600 text-white font-black" onClick={handleGradeAssignment}>
                                                    <Save size={14} className="mr-2" /> Save Grades
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead className="bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                                    <tr>
                                                        <th className="px-8 py-6">Student</th>
                                                        <th className="px-8 py-6">Roll No</th>
                                                        <th className="px-8 py-6 text-center">Marks</th>
                                                        <th className="px-8 py-6">Remarks</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-stone-50">
                                                    {gradesList.map((g, i) => (
                                                        <tr key={g.student_uid} className="hover:bg-violet-50/10">
                                                            <td className="px-8 py-5 font-black text-stone-800 text-sm">{g.student_name}</td>
                                                            <td className="px-8 py-5 text-sm text-stone-500">{g.roll_number || '-'}</td>
                                                            <td className="px-8 py-5 text-center">
                                                                <input type="number" min={0} max={selectedAssignmentForGrade.max_marks}
                                                                    className="w-20 h-10 bg-stone-50 border-0 rounded-lg text-center font-black outline-none focus:ring-4 focus:ring-violet-50"
                                                                    value={g.marks_obtained ?? ''} onChange={e => {
                                                                        const v = Math.min(Math.max(0, Number(e.target.value)), selectedAssignmentForGrade.max_marks);
                                                                        const nl = [...gradesList]; nl[i].marks_obtained = v; setGradesList(nl);
                                                                    }} />
                                                            </td>
                                                            <td className="px-8 py-5">
                                                                <input className="w-full h-10 bg-stone-50 border-0 rounded-lg px-3 font-bold text-sm outline-none" placeholder="Optional"
                                                                    value={g.remarks || ''} onChange={e => { const nl = [...gradesList]; nl[i].remarks = e.target.value; setGradesList(nl); }} />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Card>
                                )}

                                {/* Assignment List */}
                                {!selectedAssignmentForGrade && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {assignmentsList.map((a: any) => (
                                            <Card key={a.id} className="border-stone-100 p-8 rounded-[2.5rem] shadow-sm space-y-4 hover:shadow-xl transition-all">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-black text-stone-800 text-sm leading-tight">{a.title}</h4>
                                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${new Date(a.due_date) < new Date() ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
                                                        {new Date(a.due_date) < new Date() ? 'Past Due' : 'Active'}
                                                    </span>
                                                </div>
                                                {a.description && <p className="text-xs text-stone-400">{a.description}</p>}
                                                <div className="grid grid-cols-3 gap-3 py-3 border-t border-stone-100">
                                                    <div>
                                                        <p className="text-[10px] font-black text-stone-300 uppercase">Due</p>
                                                        <p className="text-xs font-black text-stone-700">{a.due_date}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-stone-300 uppercase">Max</p>
                                                        <p className="text-xs font-black text-stone-700">{a.max_marks}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-stone-300 uppercase">Graded</p>
                                                        <p className="text-xs font-black text-stone-700">{a.submissions}/{a.totalStudents}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => loadAssignmentForGrade(a.id)}
                                                    className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-violet-50 text-violet-600 hover:bg-violet-100 transition-all">
                                                    Grade Submissions
                                                </button>
                                            </Card>
                                        ))}
                                        {assignmentsList.length === 0 && <div className="col-span-full text-center py-16 text-stone-300 font-black">No assignments yet. Create one above.</div>}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* ======== LAB MARKS TAB ======== */}
                {!loading && activeTab === 'lab-marks' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        {!selectedAssignment && (
                            <Card className="p-10 rounded-[4rem] border-stone-100 shadow-sm space-y-6">
                                <h3 className="text-2xl font-black text-stone-800 tracking-tight">Select Lab Subject</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {activeAssignments.filter((a: any) => a.subjects?.subject_type === 'Practical').length > 0
                                        ? activeAssignments.filter((a: any) => a.subjects?.subject_type === 'Practical').map((a: any, i: number) => (
                                            <button key={i} onClick={() => loadLabMarks(a)}
                                                className="p-5 bg-stone-50 rounded-2xl border border-stone-100 text-left hover:bg-white hover:shadow-lg transition-all">
                                                <p className="font-black text-stone-800 text-sm">{a.subjects?.name}</p>
                                                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">Sem {a.semesters?.semester_number}</p>
                                            </button>
                                        ))
                                        : activeAssignments.map((a: any, i: number) => (
                                            <button key={i} onClick={() => loadLabMarks(a)}
                                                className="p-5 bg-stone-50 rounded-2xl border border-stone-100 text-left hover:bg-white hover:shadow-lg transition-all">
                                                <p className="font-black text-stone-800 text-sm">{a.subjects?.name}</p>
                                                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">{a.subjects?.subject_type} • Sem {a.semesters?.semester_number}</p>
                                            </button>
                                        ))
                                    }
                                </div>
                            </Card>
                        )}

                        {selectedAssignment && labMarksList.length >= 0 && (
                            <>
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-4">
                                    <div>
                                        <button onClick={() => { setSelectedAssignment(null); setLabMarksList([]); }} className="text-blue-600 font-bold text-xs uppercase tracking-widest mb-1 hover:underline">← Change Subject</button>
                                        <h2 className="text-2xl font-black text-stone-900 tracking-tight">{selectedAssignment.subjects?.name} — Lab Performance</h2>
                                        <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">All marks saved as DRAFT — Main Faculty must approve</p>
                                    </div>
                                    <Button className="h-12 px-8 rounded-xl bg-blue-600 text-white font-black shadow-lg" onClick={handleSaveLabMarks}>
                                        <Save size={16} className="mr-2" /> Save as Draft
                                    </Button>
                                </div>

                                <Card className="border-stone-100 overflow-hidden rounded-[3rem] shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                                <tr>
                                                    <th className="px-8 py-6">Student</th>
                                                    <th className="px-8 py-6">Roll No</th>
                                                    <th className="px-8 py-6 text-center">Experiment</th>
                                                    <th className="px-8 py-6 text-center">Practical</th>
                                                    <th className="px-8 py-6 text-center">Viva</th>
                                                    <th className="px-8 py-6 text-center">Total</th>
                                                    <th className="px-8 py-6">Remarks</th>
                                                    <th className="px-8 py-6 text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-50">
                                                {labMarksList.map((m, i) => {
                                                    const editable = m.status === 'draft';
                                                    const total = (m.experiment_marks || 0) + (m.practical_marks || 0) + (m.viva_marks || 0);
                                                    return (
                                                        <tr key={m.student_uid} className="hover:bg-blue-50/10">
                                                            <td className="px-8 py-5 font-black text-stone-800 text-sm">{m.student_name}</td>
                                                            <td className="px-8 py-5 text-sm text-stone-500">{m.roll_number || '-'}</td>
                                                            <td className="px-8 py-5 text-center">
                                                                <input type="number" min={0} className="w-16 h-10 bg-stone-50 border-0 rounded-lg text-center font-black outline-none focus:ring-4 focus:ring-blue-50"
                                                                    value={m.experiment_marks} disabled={!editable}
                                                                    onChange={e => { const nl = [...labMarksList]; nl[i].experiment_marks = Math.max(0, Number(e.target.value)); setLabMarksList(nl); }} />
                                                            </td>
                                                            <td className="px-8 py-5 text-center">
                                                                <input type="number" min={0} className="w-16 h-10 bg-stone-50 border-0 rounded-lg text-center font-black outline-none focus:ring-4 focus:ring-blue-50"
                                                                    value={m.practical_marks} disabled={!editable}
                                                                    onChange={e => { const nl = [...labMarksList]; nl[i].practical_marks = Math.max(0, Number(e.target.value)); setLabMarksList(nl); }} />
                                                            </td>
                                                            <td className="px-8 py-5 text-center">
                                                                <input type="number" min={0} className="w-16 h-10 bg-stone-50 border-0 rounded-lg text-center font-black outline-none focus:ring-4 focus:ring-blue-50"
                                                                    value={m.viva_marks} disabled={!editable}
                                                                    onChange={e => { const nl = [...labMarksList]; nl[i].viva_marks = Math.max(0, Number(e.target.value)); setLabMarksList(nl); }} />
                                                            </td>
                                                            <td className="px-8 py-5 text-center font-black text-stone-800">{total}</td>
                                                            <td className="px-8 py-5">
                                                                <input className="w-full h-10 bg-stone-50 border-0 rounded-lg px-3 font-bold text-xs outline-none" placeholder="..."
                                                                    value={m.remarks} disabled={!editable}
                                                                    onChange={e => { const nl = [...labMarksList]; nl[i].remarks = e.target.value; setLabMarksList(nl); }} />
                                                            </td>
                                                            <td className="px-8 py-5 text-center">
                                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${m.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-500'}`}>
                                                                    {m.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {labMarksList.length === 0 && <tr><td colSpan={8} className="text-center py-16 text-stone-300 font-black">No students found.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </>
                        )}
                    </div>
                )}

                {/* ======== ISSUES TAB ======== */}
                {!loading && activeTab === 'issues' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-4">
                            <h2 className="text-2xl font-black text-stone-900 tracking-tight">Student Support Issues</h2>
                            <div className="flex items-center gap-3">
                                <select className="h-12 px-4 rounded-xl bg-white border border-stone-100 text-sm font-bold outline-none"
                                    value={issueFilter} onChange={e => { setIssueFilter(e.target.value); loadIssues(e.target.value); }}>
                                    <option value="all">All Status</option>
                                    <option value="open">Open</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="closed">Closed</option>
                                </select>
                                <Button className="h-12 px-6 rounded-xl bg-amber-600 text-white font-black" onClick={() => setShowCreateIssue(true)}>
                                    <Plus size={16} className="mr-2" /> Log Issue
                                </Button>
                            </div>
                        </div>

                        {/* Create Issue */}
                        {showCreateIssue && (
                            <Card className="p-8 rounded-3xl border-amber-100 shadow-md space-y-5">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-black text-stone-800">Log Student Issue</h4>
                                    <button onClick={() => setShowCreateIssue(false)}><X size={18} className="text-stone-400" /></button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Student UID *</label>
                                        <input className="w-full h-12 px-4 rounded-xl bg-stone-50 border-0 font-bold outline-none" placeholder="e.g. STU001"
                                            value={newIssue.student_uid} onChange={e => setNewIssue({ ...newIssue, student_uid: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Subject (optional)</label>
                                        <select className="w-full h-12 px-4 rounded-xl bg-stone-50 border-0 font-bold outline-none"
                                            value={newIssue.subject_id} onChange={e => setNewIssue({ ...newIssue, subject_id: e.target.value })}>
                                            <option value="">None</option>
                                            {activeAssignments.map((a: any) => <option key={a.subjects?.id} value={a.subjects?.id}>{a.subjects?.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Description *</label>
                                        <input className="w-full h-12 px-4 rounded-xl bg-stone-50 border-0 font-bold outline-none" placeholder="Describe the issue"
                                            value={newIssue.description} onChange={e => setNewIssue({ ...newIssue, description: e.target.value })} />
                                    </div>
                                </div>
                                <Button className="h-12 px-8 rounded-xl bg-amber-600 text-white font-black" onClick={handleCreateIssue}>
                                    Submit Issue
                                </Button>
                            </Card>
                        )}

                        <div className="space-y-4">
                            {issues.map((issue: any) => (
                                <Card key={issue.id} className="p-6 rounded-2xl border-stone-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 flex-shrink-0 mt-0.5">
                                            <MessageSquare size={18} />
                                        </div>
                                        <div>
                                            <p className="font-black text-stone-800 text-sm">{issue.students?.name || issue.student_uid}</p>
                                            <p className="text-xs text-stone-500 mt-1">{issue.description}</p>
                                            <p className="text-[10px] text-stone-400 font-bold mt-1 uppercase tracking-widest">
                                                {issue.subjects?.name || 'General'} • {new Date(issue.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${issueStatusColor[issue.status] || 'bg-stone-100 text-stone-500'}`}>
                                            {issue.status.replace('_', ' ')}
                                        </span>
                                        {issue.status !== 'closed' && (
                                            <select className="text-xs font-bold bg-stone-50 rounded-lg px-3 py-2 outline-none border border-stone-100" defaultValue=""
                                                onChange={e => { if (e.target.value) handleUpdateIssue(issue.id, e.target.value); }}>
                                                <option value="" disabled>Update</option>
                                                {['open', 'in_progress', 'resolved', 'closed'].filter(s => s !== issue.status).map(s => (
                                                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </Card>
                            ))}
                            {issues.length === 0 && <div className="text-center py-16 text-stone-300 font-black">No issues logged yet.</div>}
                        </div>
                    </div>
                )}

                {/* ======== ANALYTICS TAB ======== */}
                {!loading && activeTab === 'analytics' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center px-4">
                            <h2 className="text-2xl font-black text-stone-900 tracking-tight">Attendance Summary</h2>
                            <button onClick={() => exportCSV(attSummary.map(a => ({
                                Subject: a.subjectName, Code: a.subjectCode, Course: a.course, Semester: a.semester, Section: a.section || '-', Attendance: `${a.percentage}%`
                            })), 'attendance-summary.csv')} className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase bg-stone-100 text-stone-600 hover:bg-stone-200 flex items-center gap-2">
                                <Download size={14} /> Export CSV
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {attSummary.map((s: any, i: number) => (
                                <Card key={i} className="border-stone-100 p-8 rounded-[2.5rem] shadow-sm space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-black text-stone-800 text-sm">{s.subjectName}</h4>
                                            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">
                                                {s.course} • Sem {s.semester} {s.section ? `• Sec ${s.section}` : ''}
                                            </p>
                                        </div>
                                        <span className={`text-2xl font-black ${s.percentage >= 75 ? 'text-emerald-600' : 'text-red-600'}`}>{s.percentage}%</span>
                                    </div>
                                    <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${s.percentage >= 75 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${s.percentage}%` }} />
                                    </div>
                                    <p className="text-[10px] font-bold text-stone-400">{s.presentCount} present of {s.totalRecords} records</p>
                                </Card>
                            ))}
                            {attSummary.length === 0 && <div className="col-span-full text-center py-16 text-stone-300 font-black">No attendance data available.</div>}
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
