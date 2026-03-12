'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
    GraduationCap, Users, BookOpen, ClipboardCheck, BarChart3,
    Plus, Trash2, Edit3, Save, X, Search, Lock, Unlock, Key,
    RefreshCw, Activity, FileText, Eye, Check, AlertCircle,
    UserPlus, Upload, ArrowRight, ChevronDown, CheckCircle2,
    XCircle, Award, Calendar, Briefcase, Layers, TrendingUp,
    ArrowUpRight, Download, Filter, UserCheck, Shield
} from 'lucide-react';
import {
    getStudentsAction, getEmployeesAction, getDepartmentsAction,
    getCoursesAction, getSemestersAction, getSubjectsAction,
    createUserAction, bulkUploadStudentsAction,
    getPendingMarksAction, approveMarksAction,
    allocateSubjectAction, getSubjectAllocationsAction,
    updateStudentProfileActionFull,
    getAcadAdminStatsAction, getMarksBySubjectAction,
    rejectMarksAction, promoteStudentsAction,
    getSectionsAction, createSectionAction, deleteSectionAction,
    assignStudentSectionAction, bulkGenerateResultsAction,
    publishResultsAction, unpublishResultsAction,
    getFacultyWorkloadAction, getStudentsBySemesterAction,
    getPassFailStatsAction, getSemesterResultsAction,
    getTopPerformersAction, getFailListAction,
    acadLockSemesterAction, getAcadAuditLogsAction
} from '@/lib/actions';
import type { Student, Employee, Subject, Section, FacultyWorkload, PassFailStats } from '@/types';

type AcadTab = 'dashboard' | 'students' | 'faculty' | 'marks' | 'results' | 'reports';

export default function AcademicAdminDashboard() {
    const { data: session } = useSession();
    const user = session?.user as any;

    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<AcadTab>('dashboard');

    // ── Dashboard ──
    const [stats, setStats] = useState<any>(null);
    const [recentLogs, setRecentLogs] = useState<any[]>([]);

    // ── Shared Data ──
    const [departments, setDepartments] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [semesters, setSemesters] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);

    // ── Students ──
    const [students, setStudents] = useState<Student[]>([]);
    const [studentSearch, setStudentSearch] = useState('');
    const [filterCourse, setFilterCourse] = useState('');
    const [filterSemester, setFilterSemester] = useState('');
    const [filterSection, setFilterSection] = useState('');
    const [showStudentForm, setShowStudentForm] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [showSectionForm, setShowSectionForm] = useState(false);
    const [sectionForm, setSectionForm] = useState({ semester_id: '', name: '', capacity: 60 });
    const [promoteSemId, setPromoteSemId] = useState('');
    const [assignSection, setAssignSection] = useState('');
    const [regData, setRegData] = useState({
        uid_eid: '', name: '', email: '', password: '', department_id: '', course_id: '',
        current_semester_id: '', roll_number: '', enrollment_number: '',
        admission_year: new Date().getFullYear(), gender: '', category: '',
        contact_number: '', address: '', guardian_name: '', guardian_contact: '', dob: ''
    });

    // ── Faculty ──
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [workloads, setWorkloads] = useState<FacultyWorkload[]>([]);
    const [allocations, setAllocations] = useState<any[]>([]);
    const [showAllocForm, setShowAllocForm] = useState(false);
    const [allocForm, setAllocForm] = useState({ subject_id: '', faculty_eid: '', semester_id: '', section: '' });

    // ── Marks ──
    const [pendingMarks, setPendingMarks] = useState<any[]>([]);
    const [selectedSubjectForReview, setSelectedSubjectForReview] = useState('');
    const [marksForReview, setMarksForReview] = useState<any[]>([]);
    const [selectedMarkIds, setSelectedMarkIds] = useState<string[]>([]);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);

    // ── Results ──
    const [resultSemId, setResultSemId] = useState('');
    const [resultCourseId, setResultCourseId] = useState('');
    const [semesterResults, setSemesterResults] = useState<any[]>([]);
    const [passFailStats, setPassFailStats] = useState<PassFailStats | null>(null);
    const [topPerformers, setTopPerformers] = useState<any[]>([]);
    const [failList, setFailList] = useState<any[]>([]);

    // ── Reports ──
    const [reportSemId, setReportSemId] = useState('');

    /* ═══════════════════ FETCH ═══════════════════ */

    useEffect(() => { if (session) fetchDashboard(); }, [session]);

    useEffect(() => {
        if (!session) return;
        const loaders: Record<AcadTab, () => void> = {
            dashboard: fetchDashboard,
            students: fetchStudents,
            faculty: fetchFaculty,
            marks: fetchMarks,
            results: fetchResults,
            reports: fetchReports,
        };
        loaders[activeTab]();
    }, [activeTab]);

    const fetchDashboard = async () => {
        setLoading(true);
        try {
            const [s, logs, d, c, sm] = await Promise.all([
                getAcadAdminStatsAction(), getAcadAuditLogsAction(15),
                getDepartmentsAction(), getCoursesAction(), getSemestersAction()
            ]);
            setStats(s); setRecentLogs(logs);
            setDepartments(d); setCourses(c); setSemesters(sm);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const [studs, d, c, sm, sub] = await Promise.all([
                getStudentsBySemesterAction(filterSemester || undefined, filterCourse || undefined, filterSection || undefined),
                getDepartmentsAction(), getCoursesAction(), getSemestersAction(), getSubjectsAction()
            ]);
            setStudents(studs); setDepartments(d); setCourses(c); setSemesters(sm); setSubjects(sub);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const fetchFaculty = async () => {
        setLoading(true);
        try {
            const [emps, wk, allocs, d, c, sm, sub] = await Promise.all([
                getEmployeesAction(), getFacultyWorkloadAction(),
                getSubjectAllocationsAction(), getDepartmentsAction(),
                getCoursesAction(), getSemestersAction(), getSubjectsAction()
            ]);
            setEmployees(emps); setWorkloads(wk); setAllocations(allocs);
            setDepartments(d); setCourses(c); setSemesters(sm); setSubjects(sub);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const fetchMarks = async () => {
        setLoading(true);
        try {
            const [pm, sub, sm] = await Promise.all([
                getPendingMarksAction(), getSubjectsAction(), getSemestersAction()
            ]);
            setPendingMarks(pm); setSubjects(sub); setSemesters(sm);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const fetchResults = async () => {
        setLoading(true);
        try {
            const [c, sm] = await Promise.all([getCoursesAction(), getSemestersAction()]);
            setCourses(c); setSemesters(sm);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const fetchReports = async () => {
        setLoading(true);
        try {
            const [c, sm, wk] = await Promise.all([getCoursesAction(), getSemestersAction(), getFacultyWorkloadAction()]);
            setCourses(c); setSemesters(sm); setWorkloads(wk);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    /* ═══════════════════ HANDLERS ═══════════════════ */

    // ── Students ──
    const handleCreateStudent = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true);
        try {
            await createUserAction(regData, 'Student', 10);
            alert('Student account provisioned.');
            setShowStudentForm(false);
            setRegData({ uid_eid: '', name: '', email: '', password: '', department_id: '', course_id: '', current_semester_id: '', roll_number: '', enrollment_number: '', admission_year: new Date().getFullYear(), gender: '', category: '', contact_number: '', address: '', guardian_name: '', guardian_contact: '', dob: '' });
            fetchStudents();
        } catch (err: any) { alert(err.message); }
        setLoading(false);
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
                alert(`Bulk upload: ${res.success} ok, ${res.failed} failed`);
                fetchStudents();
            } catch (err: any) { alert(err.message); }
            setLoading(false);
        };
        reader.readAsText(file);
    };

    const handlePromote = async () => {
        if (selectedStudents.length === 0 || !promoteSemId) { alert('Select students and target semester.'); return; }
        if (!confirm(`Promote ${selectedStudents.length} students?`)) return;
        setLoading(true);
        try {
            const res = await promoteStudentsAction(selectedStudents, promoteSemId);
            alert(`Promoted: ${res.success}, Failed: ${res.failed}`);
            setSelectedStudents([]); setPromoteSemId(''); fetchStudents();
        } catch (err: any) { alert(err.message); }
        setLoading(false);
    };

    const handleAssignSection = async () => {
        if (selectedStudents.length === 0 || !assignSection) { alert('Select students and section.'); return; }
        setLoading(true);
        try {
            const res = await assignStudentSectionAction(selectedStudents, assignSection);
            alert(`Assigned: ${res.success}, Failed: ${res.failed}`);
            setSelectedStudents([]); setAssignSection(''); fetchStudents();
        } catch (err: any) { alert(err.message); }
        setLoading(false);
    };

    const handleCreateSection = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createSectionAction(sectionForm);
            alert('Section created.'); setShowSectionForm(false);
            setSectionForm({ semester_id: '', name: '', capacity: 60 });
        } catch (err: any) { alert(err.message); }
    };

    const toggleStudent = (uid: string) => setSelectedStudents(prev => prev.includes(uid) ? prev.filter(u => u !== uid) : [...prev, uid]);
    const toggleAllStudents = () => {
        if (selectedStudents.length === filteredStudents.length) setSelectedStudents([]);
        else setSelectedStudents(filteredStudents.map(s => s.uid));
    };

    // ── Faculty ──
    const handleAllocate = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true);
        try {
            await allocateSubjectAction(allocForm);
            alert('Faculty assigned to subject.'); setShowAllocForm(false);
            setAllocForm({ subject_id: '', faculty_eid: '', semester_id: '', section: '' });
            fetchFaculty();
        } catch (err: any) { alert(err.message); }
        setLoading(false);
    };

    // ── Marks ──
    const handleReviewSubject = async (subjectId: string) => {
        setSelectedSubjectForReview(subjectId);
        try {
            const marks = await getMarksBySubjectAction(subjectId);
            setMarksForReview(marks); setSelectedMarkIds([]);
        } catch (err: any) { alert(err.message); }
    };

    const handleApproveSelected = async () => {
        if (selectedMarkIds.length === 0) { alert('Select marks to approve.'); return; }
        setLoading(true);
        try {
            await approveMarksAction(selectedMarkIds);
            alert(`${selectedMarkIds.length} submissions approved.`);
            setSelectedMarkIds([]); fetchMarks();
            if (selectedSubjectForReview) handleReviewSubject(selectedSubjectForReview);
        } catch (err: any) { alert(err.message); }
        setLoading(false);
    };

    const handleRejectSelected = async () => {
        if (selectedMarkIds.length === 0 || !rejectReason.trim()) { alert('Select marks and provide rejection reason.'); return; }
        setLoading(true);
        try {
            await rejectMarksAction(selectedMarkIds, rejectReason);
            alert(`${selectedMarkIds.length} submissions rejected.`);
            setSelectedMarkIds([]); setRejectReason(''); setShowRejectForm(false);
            fetchMarks();
            if (selectedSubjectForReview) handleReviewSubject(selectedSubjectForReview);
        } catch (err: any) { alert(err.message); }
        setLoading(false);
    };

    const toggleMark = (id: string) => setSelectedMarkIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    // ── Results ──
    const handleGenerateResults = async () => {
        if (!resultSemId || !resultCourseId) { alert('Select course and semester.'); return; }
        if (!confirm('Generate results for all students? This calculates SGPA for every student.')) return;
        setLoading(true);
        try {
            const res = await bulkGenerateResultsAction(resultSemId, resultCourseId);
            alert(`Results generated: ${res.generated}/${res.total}. Failed: ${res.failed}`);
            handleViewResults();
        } catch (err: any) { alert(err.message); }
        setLoading(false);
    };

    const handleViewResults = async () => {
        if (!resultSemId) return;
        setLoading(true);
        try {
            const [res, pf, top, fail] = await Promise.all([
                getSemesterResultsAction(resultSemId),
                getPassFailStatsAction(resultSemId),
                getTopPerformersAction(resultSemId, 10),
                getFailListAction(resultSemId),
            ]);
            setSemesterResults(res); setPassFailStats(pf);
            setTopPerformers(top); setFailList(fail);
        } catch (err: any) { alert(err.message); }
        setLoading(false);
    };

    const handlePublish = async () => {
        if (!resultSemId) return;
        if (!confirm('Publish results? Students will be able to see them.')) return;
        setLoading(true);
        try { await publishResultsAction(resultSemId); alert('Results published.'); handleViewResults(); }
        catch (err: any) { alert(err.message); }
        setLoading(false);
    };

    const handleUnpublish = async () => {
        if (!resultSemId) return;
        setLoading(true);
        try { await unpublishResultsAction(resultSemId); alert('Results unpublished.'); handleViewResults(); }
        catch (err: any) { alert(err.message); }
        setLoading(false);
    };

    const handleLockSemester = async (semId: string) => {
        if (!confirm('Lock this semester? Faculty will no longer be able to edit marks. This action requires Super Admin to undo.')) return;
        setLoading(true);
        try { await acadLockSemesterAction(semId); alert('Semester locked.'); fetchResults(); }
        catch (err: any) { alert(err.message); }
        setLoading(false);
    };

    // ── Reports export ──
    const exportCSV = (data: any[], filename: string) => {
        if (data.length === 0) return;
        const keys = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object');
        const csv = [keys.join(','), ...data.map(r => keys.map(k => `"${r[k] ?? ''}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${filename}_${Date.now()}.csv`; a.click();
    };

    /* ═══════════════════ COMPUTED ═══════════════════ */

    const filteredStudents = useMemo(() => students.filter(s => {
        const search = !studentSearch || s.uid.toLowerCase().includes(studentSearch.toLowerCase()) || s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.roll_number?.toLowerCase().includes(studentSearch.toLowerCase());
        return search;
    }), [students, studentSearch]);

    const semestersForCourse = useMemo(() => {
        if (!filterCourse && !resultCourseId) return semesters;
        const cid = filterCourse || resultCourseId;
        return semesters.filter(s => s.course_id === cid);
    }, [semesters, filterCourse, resultCourseId]);

    // Group pending marks by subject
    const pendingBySubject = useMemo(() => {
        const map: Record<string, { subject: any; count: number; ids: string[] }> = {};
        pendingMarks.forEach(m => {
            const key = m.subject_id;
            if (!map[key]) {
                const sub = subjects.find(s => s.id === key);
                map[key] = { subject: sub || { name: key, subject_code: '?' }, count: 0, ids: [] };
            }
            map[key].count++;
            map[key].ids.push(m.id);
        });
        return Object.values(map);
    }, [pendingMarks, subjects]);

    /* ═══════════ SMALL UI HELPERS ═══════════ */

    const SectionHeader = ({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) => (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm">
            <div>
                <h2 className="text-2xl font-black text-stone-900 tracking-tight">{title}</h2>
                {sub && <p className="text-stone-400 font-bold text-[10px] uppercase tracking-widest mt-1">{sub}</p>}
            </div>
            <div className="flex items-center gap-3 flex-wrap">{children}</div>
        </div>
    );

    const Label = ({ children }: { children: React.ReactNode }) => (
        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-1.5 ml-0.5">{children}</label>
    );

    const Sel = ({ value, onChange, children, ...rest }: any) => (
        <select className="w-full h-12 px-4 bg-stone-50 border-0 rounded-xl font-bold text-stone-800 outline-none focus:ring-4 focus:ring-orange-50 appearance-none" value={value} onChange={onChange} {...rest}>
            {children}
        </select>
    );

    const TabBtn = ({ id, label, icon: Icon, count }: { id: AcadTab; label: string; icon: any; count?: number }) => (
        <button onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-black rounded-xl transition-all relative ${activeTab === id ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'}`}>
            <Icon size={15} /> {label}
            {count !== undefined && count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[8px] font-black ${activeTab === id ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-600'}`}>{count}</span>
            )}
        </button>
    );

    const StatusBadge = ({ status }: { status: string }) => {
        const colors: Record<string, string> = {
            draft: 'bg-stone-200 text-stone-500',
            pending_hod: 'bg-yellow-100 text-yellow-600',
            pending_admin: 'bg-orange-100 text-orange-600',
            approved: 'bg-emerald-100 text-emerald-600',
            locked: 'bg-red-100 text-red-600',
        };
        return <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${colors[status] || 'bg-stone-200 text-stone-500'}`}>{status.replace(/_/g, ' ')}</span>;
    };

    /* ═══════════════════ RENDER ═══════════════════ */

    return (
        <DashboardLayout>
            <div className="space-y-8 pb-20">
                {/* ─── HEADER ─── */}
                <div className="bg-white p-8 rounded-[3rem] border border-stone-100 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 text-orange-500/5 pointer-events-none"><ClipboardCheck size={260} /></div>
                    <div className="relative z-10 space-y-1">
                        <h1 className="text-4xl font-black text-stone-900 tracking-tight">Academic Operations</h1>
                        <p className="text-orange-500 font-extrabold uppercase tracking-[0.2em] text-[10px]">Academic Admin Console&nbsp;•&nbsp;Level 80 Authority</p>
                    </div>
                    <div className="flex flex-wrap gap-1 p-1.5 bg-stone-50 rounded-2xl relative z-10">
                        <TabBtn id="dashboard" label="Overview" icon={BarChart3} />
                        <TabBtn id="students" label="Students" icon={GraduationCap} />
                        <TabBtn id="faculty" label="Faculty" icon={Briefcase} />
                        <TabBtn id="marks" label="Marks" icon={ClipboardCheck} count={stats?.pendingApprovals} />
                        <TabBtn id="results" label="Results" icon={Award} />
                        <TabBtn id="reports" label="Reports" icon={FileText} />
                    </div>
                </div>

                {loading && <div className="fixed top-0 left-0 w-full z-50"><div className="h-1 bg-orange-500 animate-pulse" /></div>}

                {/* ╔══════════════════════════════════════╗
                   ║      TAB: DASHBOARD                  ║
                   ╚══════════════════════════════════════╝ */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Stat Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                            {[
                                { label: 'Active Students', val: stats?.activeStudents, icon: GraduationCap, color: 'text-orange-600 bg-orange-50' },
                                { label: 'Faculty', val: stats?.activeFaculty, icon: Briefcase, color: 'text-blue-600 bg-blue-50' },
                                { label: 'Active Semesters', val: stats?.activeSemesters, icon: Calendar, color: 'text-emerald-600 bg-emerald-50' },
                                { label: 'Pending Approvals', val: stats?.pendingApprovals, icon: AlertCircle, color: 'text-yellow-600 bg-yellow-50' },
                                { label: 'Unpublished', val: stats?.unpublishedResults, icon: Eye, color: 'text-indigo-600 bg-indigo-50' },
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

                        {/* Quick Actions + Logs */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                            <Card className="border-0 bg-stone-900 text-white p-10 rounded-[3rem] shadow-2xl xl:col-span-1 relative overflow-hidden">
                                <div className="absolute -right-8 -bottom-8 text-white/5"><TrendingUp size={200} /></div>
                                <h3 className="text-xl font-black tracking-tight mb-8 relative z-10">Quick Actions</h3>
                                <div className="space-y-3 relative z-10">
                                    {[
                                        { label: 'Add New Student', onClick: () => { setActiveTab('students'); setTimeout(() => setShowStudentForm(true), 100); } },
                                        { label: 'Review Pending Marks', onClick: () => setActiveTab('marks') },
                                        { label: 'Generate Results', onClick: () => setActiveTab('results') },
                                        { label: 'Assign Faculty', onClick: () => { setActiveTab('faculty'); setTimeout(() => setShowAllocForm(true), 100); } },
                                    ].map((a, i) => (
                                        <button key={i} onClick={a.onClick} className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group">
                                            <span className="text-sm font-bold">{a.label}</span>
                                            <ArrowRight size={16} className="text-white/30 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    ))}
                                </div>
                            </Card>

                            <Card className="xl:col-span-2 border-stone-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                                <div className="p-6 border-b border-stone-50"><h3 className="font-black text-stone-800 tracking-tight">Recent Activity</h3></div>
                                <div className="divide-y divide-stone-50">
                                    {recentLogs.slice(0, 10).map((log, i) => (
                                        <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-stone-50/50 transition-colors">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white ${log.action?.includes('CREATE') ? 'bg-emerald-500' : log.action?.includes('DELETE') ? 'bg-red-500' : log.action?.includes('APPROVE') ? 'bg-orange-500' : 'bg-blue-500'}`}>
                                                {log.action?.[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-stone-800 truncate">{log.action} → {log.entity_type}</p>
                                                <p className="text-[10px] text-stone-400 font-medium">{log.performed_by} • {new Date(log.created_at).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {recentLogs.length === 0 && <p className="p-10 text-center text-stone-300 font-bold text-sm">No recent activity</p>}
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {/* ╔══════════════════════════════════════╗
                   ║      TAB: STUDENTS                   ║
                   ╚══════════════════════════════════════╝ */}
                {activeTab === 'students' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SectionHeader title="Student Management" sub="Registration, enrollment, promotion & section assignment">
                            <div className="relative">
                                <Button variant="outline" className="h-11 rounded-xl font-black text-xs uppercase tracking-widest px-6 border-stone-200">
                                    <Upload size={14} className="mr-2" /> Bulk JSON
                                    <input type="file" accept=".json" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleBulkUpload} />
                                </Button>
                            </div>
                            <Button className="h-11 rounded-xl bg-orange-500 hover:bg-orange-600 font-black text-xs uppercase tracking-widest px-6 shadow-lg shadow-orange-100" onClick={() => setShowStudentForm(!showStudentForm)}>
                                <UserPlus size={16} className="mr-2" /> {showStudentForm ? 'Close' : 'Add Student'}
                            </Button>
                        </SectionHeader>

                        {/* Registration Form */}
                        {showStudentForm && (
                            <Card className="border-0 shadow-2xl rounded-[3rem] overflow-hidden">
                                <div className="grid grid-cols-1 lg:grid-cols-12">
                                    <div className="lg:col-span-3 bg-orange-500 p-8 text-white flex flex-col justify-between">
                                        <div>
                                            <GraduationCap size={36} className="text-white/20 mb-4" />
                                            <h2 className="text-2xl font-black tracking-tight leading-tight">Student Registration</h2>
                                            <p className="text-white/60 font-bold mt-2 text-sm">Create login credentials and academic profile.</p>
                                        </div>
                                    </div>
                                    <div className="lg:col-span-9 p-8 bg-white">
                                        <form onSubmit={handleCreateStudent} className="space-y-6">
                                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Personal Information</p>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div><Label>Student ID (UID)</Label><Input className="h-11 bg-stone-50 border-0 rounded-xl font-bold" required value={regData.uid_eid} onChange={e => setRegData({ ...regData, uid_eid: e.target.value })} placeholder="STU-2025-001" /></div>
                                                <div><Label>Full Name</Label><Input className="h-11 bg-stone-50 border-0 rounded-xl font-bold" required value={regData.name} onChange={e => setRegData({ ...regData, name: e.target.value })} /></div>
                                                <div><Label>Email</Label><Input type="email" className="h-11 bg-stone-50 border-0 rounded-xl font-bold" required value={regData.email} onChange={e => setRegData({ ...regData, email: e.target.value })} /></div>
                                                <div><Label>Password</Label><Input type="password" className="h-11 bg-stone-50 border-0 rounded-xl font-bold" required value={regData.password} onChange={e => setRegData({ ...regData, password: e.target.value })} placeholder="Min 6 chars" /></div>
                                                <div><Label>Gender</Label><Sel value={regData.gender} onChange={(e: any) => setRegData({ ...regData, gender: e.target.value })}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></Sel></div>
                                                <div><Label>Category</Label><Sel value={regData.category} onChange={(e: any) => setRegData({ ...regData, category: e.target.value })}><option value="">Select</option><option>General</option><option>SC</option><option>ST</option><option>OBC</option><option>EWS</option></Sel></div>
                                                <div><Label>Date of Birth</Label><Input type="date" className="h-11 bg-stone-50 border-0 rounded-xl font-bold" value={regData.dob} onChange={e => setRegData({ ...regData, dob: e.target.value })} /></div>
                                                <div><Label>Phone</Label><Input className="h-11 bg-stone-50 border-0 rounded-xl font-bold" value={regData.contact_number} onChange={e => setRegData({ ...regData, contact_number: e.target.value })} /></div>
                                                <div><Label>Guardian Name</Label><Input className="h-11 bg-stone-50 border-0 rounded-xl font-bold" value={regData.guardian_name} onChange={e => setRegData({ ...regData, guardian_name: e.target.value })} /></div>
                                                <div><Label>Guardian Phone</Label><Input className="h-11 bg-stone-50 border-0 rounded-xl font-bold" value={regData.guardian_contact} onChange={e => setRegData({ ...regData, guardian_contact: e.target.value })} /></div>
                                            </div>
                                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest pt-4">Academic Information</p>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div><Label>Department</Label><Sel required value={regData.department_id} onChange={(e: any) => setRegData({ ...regData, department_id: e.target.value, course_id: '' })}><option value="">Select</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</Sel></div>
                                                <div><Label>Course</Label><Sel required value={regData.course_id} onChange={(e: any) => setRegData({ ...regData, course_id: e.target.value })}><option value="">Select</option>{courses.filter(c => c.dept_id === regData.department_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Sel></div>
                                                <div><Label>Semester</Label><Sel value={regData.current_semester_id} onChange={(e: any) => setRegData({ ...regData, current_semester_id: e.target.value })}><option value="">Select</option>{semesters.filter(s => s.course_id === regData.course_id && s.is_active).map(s => <option key={s.id} value={s.id}>Sem {s.semester_number}</option>)}</Sel></div>
                                                <div><Label>Roll Number</Label><Input className="h-11 bg-stone-50 border-0 rounded-xl font-bold" value={regData.roll_number} onChange={e => setRegData({ ...regData, roll_number: e.target.value })} /></div>
                                                <div><Label>Enrollment No.</Label><Input className="h-11 bg-stone-50 border-0 rounded-xl font-bold" value={regData.enrollment_number} onChange={e => setRegData({ ...regData, enrollment_number: e.target.value })} /></div>
                                                <div><Label>Admission Year</Label><Input type="number" className="h-11 bg-stone-50 border-0 rounded-xl font-bold" value={regData.admission_year} onChange={e => setRegData({ ...regData, admission_year: Number(e.target.value) })} /></div>
                                            </div>
                                            <div><Label>Address</Label><Input className="h-11 bg-stone-50 border-0 rounded-xl font-bold" value={regData.address} onChange={e => setRegData({ ...regData, address: e.target.value })} /></div>
                                            <Button type="submit" className="w-full h-14 rounded-2xl bg-orange-500 hover:bg-orange-600 font-black shadow-2xl shadow-orange-100" isLoading={loading}>
                                                Create Student Account
                                            </Button>
                                        </form>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* Filters + Bulk Actions */}
                        <div className="flex flex-col lg:flex-row gap-4">
                            <div className="flex-1 flex flex-wrap gap-3 items-center bg-white p-4 rounded-2xl border border-stone-100 shadow-sm">
                                <div className="relative flex-1 min-w-[200px]">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={16} />
                                    <input className="w-full h-10 pl-10 pr-4 bg-stone-50 border-0 rounded-xl font-bold text-sm placeholder:text-stone-300 focus:ring-4 focus:ring-orange-50 outline-none" placeholder="Search name/UID/roll..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
                                </div>
                                <Sel value={filterCourse} onChange={(e: any) => { setFilterCourse(e.target.value); setFilterSemester(''); }} className="!w-auto !h-10 !px-3 !rounded-lg !text-xs min-w-[120px]"><option value="">All Courses</option>{courses.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}</Sel>
                                <Sel value={filterSemester} onChange={(e: any) => setFilterSemester(e.target.value)} className="!w-auto !h-10 !px-3 !rounded-lg !text-xs min-w-[100px]"><option value="">All Sems</option>{semestersForCourse.map(s => <option key={s.id} value={s.id}>Sem {s.semester_number}</option>)}</Sel>
                                <Button variant="outline" size="sm" className="h-10 rounded-lg border-stone-200 font-black text-xs" onClick={fetchStudents}><RefreshCw size={12} className="mr-1" /> Apply</Button>
                            </div>

                            {selectedStudents.length > 0 && (
                                <div className="flex gap-3 items-center bg-orange-50 p-4 rounded-2xl border border-orange-100">
                                    <span className="text-xs font-black text-orange-600">{selectedStudents.length} selected</span>
                                    <Sel value={promoteSemId} onChange={(e: any) => setPromoteSemId(e.target.value)} className="!w-auto !h-9 !px-2 !rounded-lg !text-[10px] !bg-white min-w-[100px]"><option value="">Promote To…</option>{semesters.filter(s => s.is_active).map(s => <option key={s.id} value={s.id}>Sem {s.semester_number}</option>)}</Sel>
                                    <Button size="sm" className="h-9 rounded-lg bg-orange-500 hover:bg-orange-600 font-black text-[10px] px-3" onClick={handlePromote} disabled={!promoteSemId}>Promote</Button>
                                    <Input placeholder="Section" className="h-9 w-16 bg-white border-0 rounded-lg font-bold text-xs" value={assignSection} onChange={e => setAssignSection(e.target.value)} />
                                    <Button size="sm" className="h-9 rounded-lg bg-blue-500 hover:bg-blue-600 font-black text-[10px] px-3" onClick={handleAssignSection} disabled={!assignSection}>Assign</Button>
                                </div>
                            )}
                        </div>

                        {/* Student Table */}
                        <Card className="border-stone-100 overflow-hidden rounded-[2.5rem] shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                        <tr>
                                            <th className="px-4 py-5"><input type="checkbox" className="w-4 h-4 rounded accent-orange-500" checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0} onChange={toggleAllStudents} /></th>
                                            <th className="px-4 py-5">Student</th>
                                            <th className="px-4 py-5">Roll No</th>
                                            <th className="px-4 py-5">Course</th>
                                            <th className="px-4 py-5">Semester</th>
                                            <th className="px-4 py-5">Section</th>
                                            <th className="px-4 py-5">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-50">
                                        {filteredStudents.map(s => (
                                            <tr key={s.uid} className="hover:bg-orange-50/20 transition-colors">
                                                <td className="px-4 py-4"><input type="checkbox" className="w-4 h-4 rounded accent-orange-500" checked={selectedStudents.includes(s.uid)} onChange={() => toggleStudent(s.uid)} /></td>
                                                <td className="px-4 py-4">
                                                    <div><p className="font-black text-stone-800 text-sm">{s.name}</p><p className="text-[10px] text-stone-400 font-bold">{s.uid}</p></div>
                                                </td>
                                                <td className="px-4 py-4 text-xs font-bold text-stone-600">{s.roll_number || '—'}</td>
                                                <td className="px-4 py-4 text-xs font-bold text-stone-600">{s.courses?.code || '—'}</td>
                                                <td className="px-4 py-4"><span className="text-xs font-black text-orange-600">Sem {s.semesters?.semester_number || '—'}</span></td>
                                                <td className="px-4 py-4"><span className="text-[10px] font-black bg-stone-100 text-stone-500 px-2 py-0.5 rounded uppercase">{s.section || '—'}</span></td>
                                                <td className="px-4 py-4"><span className={`w-2 h-2 rounded-full inline-block mr-1 ${s.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} /><span className="text-[10px] font-black uppercase text-stone-500">{s.is_active ? 'Active' : 'Inactive'}</span></td>
                                            </tr>
                                        ))}
                                        {filteredStudents.length === 0 && <tr><td colSpan={7} className="py-20 text-center text-stone-300 font-bold">No students match filters.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}

                {/* ╔══════════════════════════════════════╗
                   ║      TAB: FACULTY ASSIGNMENT          ║
                   ╚══════════════════════════════════════╝ */}
                {activeTab === 'faculty' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SectionHeader title="Faculty Assignment & Workload" sub="Teaching responsibility allocation and workload monitoring">
                            <Button className="h-11 rounded-xl bg-orange-500 hover:bg-orange-600 font-black text-xs uppercase tracking-widest px-6 shadow-lg" onClick={() => setShowAllocForm(!showAllocForm)}>
                                <Plus size={16} className="mr-2" /> Assign Subject
                            </Button>
                        </SectionHeader>

                        {/* Allocation Form */}
                        {showAllocForm && (
                            <Card className="border-orange-100 bg-orange-50/30 rounded-[2.5rem] p-8 shadow-sm">
                                <form onSubmit={handleAllocate} className="space-y-6">
                                    <div className="flex items-center justify-between"><h3 className="text-lg font-black text-stone-900">Assign Faculty to Subject</h3><button type="button" onClick={() => setShowAllocForm(false)}><X size={20} className="text-stone-400" /></button></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div><Label>Faculty</Label><Sel required value={allocForm.faculty_eid} onChange={(e: any) => setAllocForm({ ...allocForm, faculty_eid: e.target.value })}><option value="">Select Faculty</option>{employees.map(e => <option key={e.eid} value={e.eid}>{e.name} ({e.eid})</option>)}</Sel></div>
                                        <div><Label>Subject</Label><Sel required value={allocForm.subject_id} onChange={(e: any) => setAllocForm({ ...allocForm, subject_id: e.target.value })}><option value="">Select Subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.subject_code})</option>)}</Sel></div>
                                        <div><Label>Semester</Label><Sel required value={allocForm.semester_id} onChange={(e: any) => setAllocForm({ ...allocForm, semester_id: e.target.value })}><option value="">Select Semester</option>{semesters.filter(s => s.is_active).map(s => <option key={s.id} value={s.id}>Sem {s.semester_number}</option>)}</Sel></div>
                                        <div><Label>Section</Label><Input className="h-12 bg-white border-0 rounded-xl font-bold" placeholder="e.g. A" value={allocForm.section} onChange={e => setAllocForm({ ...allocForm, section: e.target.value })} /></div>
                                    </div>
                                    <Button type="submit" className="h-12 rounded-xl bg-orange-500 hover:bg-orange-600 font-black px-10 shadow-lg" isLoading={loading}><Save size={16} className="mr-2" /> Assign</Button>
                                </form>
                            </Card>
                        )}

                        {/* Workload Table */}
                        <Card className="border-stone-100 overflow-hidden rounded-[2.5rem] shadow-sm">
                            <div className="p-6 border-b border-stone-50"><h3 className="font-black text-stone-800 tracking-tight">Faculty Workload Overview</h3></div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                        <tr><th className="px-6 py-5">Faculty</th><th className="px-6 py-5">Designation</th><th className="px-6 py-5">Department</th><th className="px-6 py-5">Subjects</th><th className="px-6 py-5">Sections</th><th className="px-6 py-5">Credits</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-50">
                                        {workloads.map(w => (
                                            <tr key={w.eid} className="hover:bg-stone-50/50 transition-colors">
                                                <td className="px-6 py-4"><div><p className="font-black text-stone-800 text-sm">{w.name}</p><p className="text-[10px] text-stone-400 font-bold">{w.eid}</p></div></td>
                                                <td className="px-6 py-4 text-xs font-bold text-stone-500">{w.designation}</td>
                                                <td className="px-6 py-4 text-xs font-bold text-stone-500">{w.department}</td>
                                                <td className="px-6 py-4"><span className="text-lg font-black text-stone-900">{w.subjects}</span></td>
                                                <td className="px-6 py-4"><span className="text-lg font-black text-stone-900">{w.sections}</span></td>
                                                <td className="px-6 py-4"><span className="text-lg font-black text-orange-600">{w.total_credits}</span></td>
                                            </tr>
                                        ))}
                                        {workloads.length === 0 && <tr><td colSpan={6} className="py-16 text-center text-stone-300 font-bold">No faculty workload data.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        {/* Current Allocations */}
                        <Card className="border-stone-100 overflow-hidden rounded-[2.5rem] shadow-sm">
                            <div className="p-6 border-b border-stone-50 flex items-center justify-between">
                                <h3 className="font-black text-stone-800 tracking-tight">Active Subject Allocations</h3>
                                <Button variant="outline" size="sm" className="rounded-xl text-[10px] font-black uppercase border-stone-200" onClick={() => exportCSV(allocations, 'allocations')}><Download size={12} className="mr-1" /> Export</Button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                        <tr><th className="px-6 py-5">Faculty</th><th className="px-6 py-5">Subject</th><th className="px-6 py-5">Section</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-50">
                                        {allocations.map((a, i) => (
                                            <tr key={i} className="hover:bg-stone-50/50">
                                                <td className="px-6 py-4 text-sm font-bold text-stone-700">{a.faculty_eid}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-stone-700">{subjects.find(s => s.id === a.subject_id)?.name || a.subject_id}</td>
                                                <td className="px-6 py-4"><span className="text-[10px] font-black bg-stone-100 text-stone-500 px-2 py-0.5 rounded uppercase">{a.section || '—'}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}

                {/* ╔══════════════════════════════════════╗
                   ║      TAB: MARK APPROVAL              ║
                   ╚══════════════════════════════════════╝ */}
                {activeTab === 'marks' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SectionHeader title="Mark Approval System" sub="Review faculty-submitted marks • approve or reject with reason" />

                        {/* Pending by Subject */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pendingBySubject.map((ps, i) => (
                                <div key={i} className={`cursor-pointer rounded-2xl border bg-white shadow-sm hover:shadow-xl transition-all ${selectedSubjectForReview === ps.subject.id ? 'ring-2 ring-orange-500 border-orange-200' : 'border-stone-100'}`}
                                    onClick={() => handleReviewSubject(ps.subject.id)}>
                                    <div className="p-6 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg uppercase">{ps.subject.subject_code}</span>
                                            <span className="text-2xl font-black text-stone-900">{ps.count}</span>
                                        </div>
                                        <p className="text-sm font-black text-stone-800">{ps.subject.name}</p>
                                        <p className="text-[10px] font-bold text-stone-400">Pending submissions</p>
                                    </div>
                                </div>
                            ))}
                            {pendingBySubject.length === 0 && (
                                <Card className="col-span-3 border-stone-100 rounded-2xl">
                                    <CardContent className="p-16 text-center">
                                        <CheckCircle2 size={40} className="text-emerald-300 mx-auto mb-4" />
                                        <p className="text-lg font-black text-stone-400">All marks reviewed</p>
                                        <p className="text-xs text-stone-300 mt-1">No pending approvals</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Marks Review Table */}
                        {marksForReview.length > 0 && (
                            <Card className="border-stone-100 overflow-hidden rounded-[2.5rem] shadow-sm">
                                <div className="p-6 border-b border-stone-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                    <h3 className="font-black text-stone-800">Reviewing: {subjects.find(s => s.id === selectedSubjectForReview)?.name}</h3>
                                    <div className="flex gap-2">
                                        <Button size="sm" className="h-9 rounded-lg bg-emerald-500 hover:bg-emerald-600 font-black text-[10px] px-4"
                                            onClick={handleApproveSelected} disabled={selectedMarkIds.length === 0}>
                                            <Check size={12} className="mr-1" /> Approve ({selectedMarkIds.length})
                                        </Button>
                                        <Button size="sm" variant="outline" className="h-9 rounded-lg border-red-200 text-red-500 font-black text-[10px] px-4"
                                            onClick={() => setShowRejectForm(true)} disabled={selectedMarkIds.length === 0}>
                                            <XCircle size={12} className="mr-1" /> Reject
                                        </Button>
                                    </div>
                                </div>

                                {showRejectForm && (
                                    <div className="p-6 bg-red-50 border-b border-red-100 flex items-center gap-4">
                                        <Input className="flex-1 h-10 bg-white border-0 rounded-xl font-bold" placeholder="Rejection reason (required)..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                                        <Button size="sm" className="h-10 rounded-lg bg-red-500 hover:bg-red-600 font-black text-xs px-6" onClick={handleRejectSelected}>Confirm Reject</Button>
                                        <button onClick={() => { setShowRejectForm(false); setRejectReason(''); }}><X size={16} className="text-stone-400" /></button>
                                    </div>
                                )}

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                            <tr>
                                                <th className="px-4 py-4"><input type="checkbox" className="w-4 h-4 rounded accent-orange-500" checked={selectedMarkIds.length === marksForReview.filter(m => m.status === 'pending_admin').length && marksForReview.filter(m => m.status === 'pending_admin').length > 0} onChange={() => { const pending = marksForReview.filter(m => m.status === 'pending_admin').map(m => m.id); setSelectedMarkIds(selectedMarkIds.length === pending.length ? [] : pending); }} /></th>
                                                <th className="px-4 py-4">Student</th>
                                                <th className="px-4 py-4">Roll No</th>
                                                <th className="px-4 py-4">Internal</th>
                                                <th className="px-4 py-4">External</th>
                                                <th className="px-4 py-4">Total</th>
                                                <th className="px-4 py-4">Grade</th>
                                                <th className="px-4 py-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-stone-50">
                                            {marksForReview.map(m => (
                                                <tr key={m.id} className="hover:bg-orange-50/20 transition-colors">
                                                    <td className="px-4 py-3"><input type="checkbox" className="w-4 h-4 rounded accent-orange-500" disabled={m.status !== 'pending_admin'} checked={selectedMarkIds.includes(m.id)} onChange={() => toggleMark(m.id)} /></td>
                                                    <td className="px-4 py-3 text-sm font-bold text-stone-800">{m.students?.name || m.student_uid}</td>
                                                    <td className="px-4 py-3 text-xs font-bold text-stone-500">{m.students?.roll_number || '—'}</td>
                                                    <td className="px-4 py-3 text-sm font-black text-stone-900">{m.internal_marks}</td>
                                                    <td className="px-4 py-3 text-sm font-black text-stone-900">{m.external_marks}</td>
                                                    <td className="px-4 py-3 text-sm font-black text-orange-600">{m.total_marks}</td>
                                                    <td className="px-4 py-3 text-sm font-black text-stone-700">{m.grade || '—'}</td>
                                                    <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}
                    </div>
                )}

                {/* ╔══════════════════════════════════════╗
                   ║      TAB: RESULT GENERATION          ║
                   ╚══════════════════════════════════════╝ */}
                {activeTab === 'results' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SectionHeader title="Result Generation & Publication" sub="Calculate SGPA/CGPA, publish results, lock semesters">
                            <Button variant="outline" className="h-11 rounded-xl font-black text-xs uppercase tracking-widest px-6 border-stone-200" onClick={fetchResults}><RefreshCw size={14} className="mr-2" /> Refresh</Button>
                        </SectionHeader>

                        {/* Control Panel */}
                        <Card className="border-stone-100 rounded-2xl p-6 shadow-sm">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                                <div><Label>Course</Label><Sel value={resultCourseId} onChange={(e: any) => { setResultCourseId(e.target.value); setResultSemId(''); }}><option value="">Select Course</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}</Sel></div>
                                <div><Label>Semester</Label><Sel value={resultSemId} onChange={(e: any) => setResultSemId(e.target.value)}><option value="">Select Semester</option>{semesters.filter(s => s.course_id === resultCourseId).map(s => <option key={s.id} value={s.id}>Sem {s.semester_number} {s.is_locked ? '🔒' : ''}</option>)}</Sel></div>
                                <Button className="h-12 rounded-xl bg-orange-500 hover:bg-orange-600 font-black text-xs shadow-lg" onClick={handleGenerateResults} disabled={!resultSemId || !resultCourseId} isLoading={loading}>
                                    <Award size={14} className="mr-2" /> Generate
                                </Button>
                                <Button className="h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-black text-xs shadow-lg" onClick={handleViewResults} disabled={!resultSemId}>
                                    <Eye size={14} className="mr-2" /> View Results
                                </Button>
                                <Button className="h-12 rounded-xl bg-stone-800 hover:bg-stone-900 font-black text-xs shadow-lg text-white" onClick={() => resultSemId && handleLockSemester(resultSemId)} disabled={!resultSemId}>
                                    <Lock size={14} className="mr-2" /> Lock Semester
                                </Button>
                            </div>
                        </Card>

                        {/* Pass/Fail Stats */}
                        {passFailStats && passFailStats.total > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                {[
                                    { label: 'Total Results', val: passFailStats.total, color: 'text-stone-600 bg-stone-50' },
                                    { label: 'Passed', val: passFailStats.pass, color: 'text-emerald-600 bg-emerald-50' },
                                    { label: 'Failed', val: passFailStats.fail, color: 'text-red-600 bg-red-50' },
                                    { label: 'Backlog', val: passFailStats.backlog, color: 'text-yellow-600 bg-yellow-50' },
                                    { label: 'Pass %', val: `${passFailStats.passPercentage}%`, color: 'text-orange-600 bg-orange-50' },
                                ].map((s, i) => (
                                    <Card key={i} className="border-stone-100">
                                        <CardContent className="p-5 text-center">
                                            <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest">{s.label}</p>
                                            <h3 className="text-3xl font-black text-stone-900 mt-1">{s.val}</h3>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {/* Publish / Unpublish Controls */}
                        {semesterResults.length > 0 && (
                            <div className="flex gap-4">
                                <Button className="h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-black text-xs px-8 shadow-lg" onClick={handlePublish}>
                                    <CheckCircle2 size={14} className="mr-2" /> Publish Results
                                </Button>
                                <Button variant="outline" className="h-11 rounded-xl border-stone-200 font-black text-xs px-8" onClick={handleUnpublish}>
                                    <XCircle size={14} className="mr-2" /> Unpublish
                                </Button>
                                <Button variant="outline" className="h-11 rounded-xl border-stone-200 font-black text-xs px-8" onClick={() => exportCSV(semesterResults, 'results')}>
                                    <Download size={14} className="mr-2" /> Export CSV
                                </Button>
                            </div>
                        )}

                        {/* Results Table */}
                        {semesterResults.length > 0 && (
                            <Card className="border-stone-100 overflow-hidden rounded-[2.5rem] shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                            <tr><th className="px-6 py-5">Student</th><th className="px-6 py-5">Roll No</th><th className="px-6 py-5">SGPA</th><th className="px-6 py-5">CGPA</th><th className="px-6 py-5">Credits</th><th className="px-6 py-5">Result</th><th className="px-6 py-5">Published</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-stone-50">
                                            {semesterResults.map(r => (
                                                <tr key={r.id} className="hover:bg-stone-50/50 transition-colors">
                                                    <td className="px-6 py-4"><div><p className="font-black text-stone-800 text-sm">{r.students?.name}</p><p className="text-[10px] text-stone-400 font-bold">{r.student_uid}</p></div></td>
                                                    <td className="px-6 py-4 text-xs font-bold text-stone-500">{r.students?.roll_number || '—'}</td>
                                                    <td className="px-6 py-4 text-lg font-black text-orange-600">{r.sgpa?.toFixed(2)}</td>
                                                    <td className="px-6 py-4 text-lg font-black text-stone-900">{r.cgpa?.toFixed(2)}</td>
                                                    <td className="px-6 py-4 text-xs font-bold text-stone-500">{r.earned_credits}/{r.total_credits}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase ${r.result_status === 'Pass' ? 'bg-emerald-100 text-emerald-600' : r.result_status === 'Fail' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>{r.result_status}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {r.is_published
                                                            ? <span className="text-[10px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded uppercase">Yes</span>
                                                            : <span className="text-[10px] font-black bg-stone-100 text-stone-400 px-2 py-0.5 rounded uppercase">No</span>
                                                        }
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}

                        {/* Top Performers & Fail List side by side */}
                        {(topPerformers.length > 0 || failList.length > 0) && (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                {topPerformers.length > 0 && (
                                    <Card className="border-stone-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                                        <div className="p-6 border-b border-stone-50 bg-emerald-50"><h3 className="font-black text-emerald-800 tracking-tight flex items-center gap-2"><Award size={18} /> Top Performers</h3></div>
                                        <div className="divide-y divide-stone-50">
                                            {topPerformers.map((t, i) => (
                                                <div key={i} className="flex items-center justify-between px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black ${i < 3 ? 'bg-amber-500' : 'bg-stone-300'}`}>{i + 1}</span>
                                                        <div><p className="text-sm font-black text-stone-800">{t.students?.name}</p><p className="text-[10px] text-stone-400">{t.students?.roll_number}</p></div>
                                                    </div>
                                                    <span className="text-lg font-black text-emerald-600">{t.sgpa?.toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                )}

                                {failList.length > 0 && (
                                    <Card className="border-stone-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                                        <div className="p-6 border-b border-stone-50 bg-red-50"><h3 className="font-black text-red-800 tracking-tight flex items-center gap-2"><AlertCircle size={18} /> Fail List ({failList.length})</h3></div>
                                        <div className="divide-y divide-stone-50">
                                            {failList.map((f, i) => (
                                                <div key={i} className="flex items-center justify-between px-6 py-4">
                                                    <div><p className="text-sm font-black text-stone-800">{f.students?.name}</p><p className="text-[10px] text-stone-400">{f.student_uid} • {f.students?.roll_number}</p></div>
                                                    <span className="text-lg font-black text-red-500">{f.sgpa?.toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ╔══════════════════════════════════════╗
                   ║      TAB: REPORTS                    ║
                   ╚══════════════════════════════════════╝ */}
                {activeTab === 'reports' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SectionHeader title="Reports & Analytics" sub="Student lists, faculty workload, performance metrics & exports" />

                        {/* Report Tiles */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Student List by Semester */}
                            <Card className="border-stone-100 hover:shadow-xl transition-all rounded-2xl">
                                <CardContent className="p-8 space-y-4">
                                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600"><Users size={24} /></div>
                                    <h3 className="text-lg font-black text-stone-800">Student List</h3>
                                    <p className="text-xs text-stone-400">Export student roster by semester</p>
                                    <div className="space-y-3 pt-2">
                                        <Sel value={reportSemId} onChange={(e: any) => setReportSemId(e.target.value)}><option value="">Select Semester</option>{semesters.filter(s => s.is_active).map(s => <option key={s.id} value={s.id}>Sem {s.semester_number}</option>)}</Sel>
                                        <Button className="w-full h-10 rounded-xl bg-orange-500 hover:bg-orange-600 font-black text-xs" disabled={!reportSemId} onClick={async () => {
                                            try {
                                                const data = await getStudentsBySemesterAction(reportSemId);
                                                exportCSV(data.map(s => ({ uid: s.uid, name: s.name, email: s.email, roll: s.roll_number, section: s.section, course: s.courses?.code })), 'students_list');
                                            } catch (err: any) { alert(err.message); }
                                        }}><Download size={12} className="mr-1" /> Export</Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Faculty Workload */}
                            <Card className="border-stone-100 hover:shadow-xl transition-all rounded-2xl">
                                <CardContent className="p-8 space-y-4">
                                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600"><Briefcase size={24} /></div>
                                    <h3 className="text-lg font-black text-stone-800">Faculty Workload</h3>
                                    <p className="text-xs text-stone-400">Credit load and section distribution</p>
                                    <Button className="w-full h-10 rounded-xl bg-blue-500 hover:bg-blue-600 font-black text-xs mt-4" onClick={() => exportCSV(workloads, 'faculty_workload')}>
                                        <Download size={12} className="mr-1" /> Export Workload
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Semester Performance */}
                            <Card className="border-stone-100 hover:shadow-xl transition-all rounded-2xl">
                                <CardContent className="p-8 space-y-4">
                                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600"><TrendingUp size={24} /></div>
                                    <h3 className="text-lg font-black text-stone-800">Semester Performance</h3>
                                    <p className="text-xs text-stone-400">Pass/Fail, top performers, fail list</p>
                                    <div className="space-y-3 pt-2">
                                        <Sel value={reportSemId} onChange={(e: any) => setReportSemId(e.target.value)}><option value="">Select Semester</option>{semesters.map(s => <option key={s.id} value={s.id}>Sem {s.semester_number}</option>)}</Sel>
                                        <Button className="w-full h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-black text-xs" disabled={!reportSemId} onClick={async () => {
                                            try {
                                                const [res, fl] = await Promise.all([getSemesterResultsAction(reportSemId), getFailListAction(reportSemId)]);
                                                exportCSV(res.map(r => ({ uid: r.student_uid, name: r.students?.name, sgpa: r.sgpa, cgpa: r.cgpa, result: r.result_status, credits: `${r.earned_credits}/${r.total_credits}` })), 'semester_performance');
                                            } catch (err: any) { alert(err.message); }
                                        }}><Download size={12} className="mr-1" /> Export Results</Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Fail List Report */}
                            <Card className="border-stone-100 hover:shadow-xl transition-all rounded-2xl">
                                <CardContent className="p-8 space-y-4">
                                    <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600"><XCircle size={24} /></div>
                                    <h3 className="text-lg font-black text-stone-800">Fail List</h3>
                                    <p className="text-xs text-stone-400">Students who failed in selected semester</p>
                                    <div className="space-y-3 pt-2">
                                        <Sel value={reportSemId} onChange={(e: any) => setReportSemId(e.target.value)}><option value="">Select Semester</option>{semesters.map(s => <option key={s.id} value={s.id}>Sem {s.semester_number}</option>)}</Sel>
                                        <Button className="w-full h-10 rounded-xl bg-red-500 hover:bg-red-600 font-black text-xs text-white" disabled={!reportSemId} onClick={async () => {
                                            try {
                                                const fl = await getFailListAction(reportSemId);
                                                exportCSV(fl.map(f => ({ uid: f.student_uid, name: f.students?.name, roll: f.students?.roll_number, sgpa: f.sgpa, course: f.students?.courses?.code })), 'fail_list');
                                            } catch (err: any) { alert(err.message); }
                                        }}><Download size={12} className="mr-1" /> Export Fail List</Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Top Performers */}
                            <Card className="border-stone-100 hover:shadow-xl transition-all rounded-2xl">
                                <CardContent className="p-8 space-y-4">
                                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600"><Award size={24} /></div>
                                    <h3 className="text-lg font-black text-stone-800">Top Performers</h3>
                                    <p className="text-xs text-stone-400">Highest SGPA achievers per semester</p>
                                    <div className="space-y-3 pt-2">
                                        <Sel value={reportSemId} onChange={(e: any) => setReportSemId(e.target.value)}><option value="">Select Semester</option>{semesters.map(s => <option key={s.id} value={s.id}>Sem {s.semester_number}</option>)}</Sel>
                                        <Button className="w-full h-10 rounded-xl bg-amber-500 hover:bg-amber-600 font-black text-xs" disabled={!reportSemId} onClick={async () => {
                                            try {
                                                const tp = await getTopPerformersAction(reportSemId, 50);
                                                exportCSV(tp.map((t, i) => ({ rank: i + 1, uid: t.student_uid, name: t.students?.name, sgpa: t.sgpa, course: t.students?.courses?.name })), 'top_performers');
                                            } catch (err: any) { alert(err.message); }
                                        }}><Download size={12} className="mr-1" /> Export Top List</Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Semester Lock Status */}
                            <Card className="border-stone-100 hover:shadow-xl transition-all rounded-2xl">
                                <CardContent className="p-8 space-y-4">
                                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600"><Lock size={24} /></div>
                                    <h3 className="text-lg font-black text-stone-800">Semester Status</h3>
                                    <p className="text-xs text-stone-400">Active, locked & finalized semesters</p>
                                    <div className="space-y-2 pt-2">
                                        {semesters.slice(0, 6).map(s => {
                                            const course = courses.find(c => c.id === s.course_id);
                                            return (
                                                <div key={s.id} className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
                                                    <span className="text-[10px] font-black text-stone-600">{course?.code} Sem {s.semester_number}</span>
                                                    <div className="flex gap-1">
                                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${s.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-200 text-stone-400'}`}>{s.is_active ? 'Active' : 'Inactive'}</span>
                                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${s.is_locked ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{s.is_locked ? 'Locked' : 'Open'}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
