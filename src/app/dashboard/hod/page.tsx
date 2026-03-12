'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
    getStudentsAction,
    getEmployeesAction,
    approveMarksAction,
    getPendingMarksAction,
    allocateSubjectAction,
    recommendMarksAction,
    getHodDashboardStatsAction,
    getDeptSubjectsAction,
    getDeptSemestersAction,
    getDeptCoursesAction,
    getDeptSubjectAllocationsAction,
    getDeptAttendanceSummaryAction,
    getDeptResultsStatsAction,
    hodRejectMarksAction,
    getHodAuditLogsAction
} from '@/lib/actions';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
    Users, Briefcase, CheckCircle2, AlertCircle, X,
    TrendingUp, FileCheck, Layers, BarChart3, Check,
    Search, ArrowRight, Plus, Save, RefreshCw,
    GraduationCap, Calendar, BookOpen, ClipboardCheck,
    XCircle, Download, Eye, Activity, Award
} from 'lucide-react';
import { useSession } from 'next-auth/react';

type HodTab = 'overview' | 'students' | 'faculty' | 'marks' | 'attendance' | 'analytics';

export default function HodDashboard() {
    const { data: session } = useSession();
    const user = session?.user as any;

    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<HodTab>('overview');

    // Dashboard
    const [stats, setStats] = useState<any>(null);
    const [recentLogs, setRecentLogs] = useState<any[]>([]);

    // Shared
    const [students, setStudents] = useState<any[]>([]);
    const [faculty, setFaculty] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [semesters, setSemesters] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);

    // Faculty
    const [allocations, setAllocations] = useState<any[]>([]);
    const [showAllocForm, setShowAllocForm] = useState(false);
    const [allocForm, setAllocForm] = useState({ subject_id: '', faculty_eid: '', semester_id: '', section: '' });

    // Marks
    const [pendingMarks, setPendingMarks] = useState<any[]>([]);
    const [selectedMarkIds, setSelectedMarkIds] = useState<string[]>([]);
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    // Attendance
    const [attendanceSummary, setAttendanceSummary] = useState<any[]>([]);
    const [attSemFilter, setAttSemFilter] = useState('');

    // Analytics
    const [resultStats, setResultStats] = useState<any>(null);
    const [analyticsSemId, setAnalyticsSemId] = useState('');

    // Student filters
    const [studentSearch, setStudentSearch] = useState('');

    /* ═══════════════════ FETCH ═══════════════════ */

    useEffect(() => { if (user?.department_id) fetchOverview(); }, [user?.department_id]);

    useEffect(() => {
        if (!user?.department_id) return;
        const loaders: Record<HodTab, () => void> = {
            overview: fetchOverview,
            students: fetchStudents,
            faculty: fetchFaculty,
            marks: fetchMarks,
            attendance: fetchAttendance,
            analytics: fetchAnalytics,
        };
        loaders[activeTab]();
    }, [activeTab]);

    const fetchOverview = async () => {
        setLoading(true);
        try {
            const [s, logs, sem, crs] = await Promise.all([
                getHodDashboardStatsAction(),
                getHodAuditLogsAction(10),
                getDeptSemestersAction(),
                getDeptCoursesAction(),
            ]);
            setStats(s); setRecentLogs(logs); setSemesters(sem); setCourses(crs);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const [studs, sem] = await Promise.all([
                getStudentsAction(user.department_id),
                getDeptSemestersAction(),
            ]);
            setStudents(studs); setSemesters(sem);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const fetchFaculty = async () => {
        setLoading(true);
        try {
            const [emps, allocs, subs, sem] = await Promise.all([
                getEmployeesAction(user.department_id),
                getDeptSubjectAllocationsAction(),
                getDeptSubjectsAction(),
                getDeptSemestersAction(),
            ]);
            setFaculty(emps); setAllocations(allocs); setSubjects(subs); setSemesters(sem);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const fetchMarks = async () => {
        setLoading(true);
        try {
            const [pm, subs] = await Promise.all([
                getPendingMarksAction(user.department_id),
                getDeptSubjectsAction(),
            ]);
            setPendingMarks(pm || []); setSubjects(subs);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const [att, sem] = await Promise.all([
                getDeptAttendanceSummaryAction(attSemFilter || undefined),
                getDeptSemestersAction(),
            ]);
            setAttendanceSummary(att); setSemesters(sem);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const [rs, sem] = await Promise.all([
                getDeptResultsStatsAction(analyticsSemId || undefined),
                getDeptSemestersAction(),
            ]);
            setResultStats(rs); setSemesters(sem);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    /* ═══════════════════ HANDLERS ═══════════════════ */

    const handleAllocate = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true);
        try {
            await allocateSubjectAction(allocForm);
            alert('Subject assigned to faculty.'); setShowAllocForm(false);
            setAllocForm({ subject_id: '', faculty_eid: '', semester_id: '', section: '' });
            fetchFaculty();
        } catch (err: any) { alert(err.message); }
        setLoading(false);
    };

    const handleRecommend = async () => {
        if (selectedMarkIds.length === 0) { alert('Select marks to recommend.'); return; }
        if (!confirm(`Recommend ${selectedMarkIds.length} submissions to Academic Admin for final approval?`)) return;
        setLoading(true);
        try {
            await recommendMarksAction(selectedMarkIds);
            alert(`${selectedMarkIds.length} submissions recommended for admin approval.`);
            setSelectedMarkIds([]); fetchMarks();
        } catch (err: any) { alert(err.message); }
        setLoading(false);
    };

    const handleReject = async () => {
        if (selectedMarkIds.length === 0 || !rejectReason.trim()) { alert('Select marks and provide rejection reason.'); return; }
        setLoading(true);
        try {
            await hodRejectMarksAction(selectedMarkIds, rejectReason);
            alert(`${selectedMarkIds.length} submissions sent back to faculty.`);
            setSelectedMarkIds([]); setRejectReason(''); setShowRejectForm(false); fetchMarks();
        } catch (err: any) { alert(err.message); }
        setLoading(false);
    };

    const toggleMark = (id: string) => setSelectedMarkIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const toggleAllMarks = () => {
        if (selectedMarkIds.length === pendingMarks.length) setSelectedMarkIds([]);
        else setSelectedMarkIds(pendingMarks.map(m => m.id));
    };

    const exportCSV = (data: any[], filename: string) => {
        if (data.length === 0) return;
        const keys = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object');
        const csv = [keys.join(','), ...data.map(r => keys.map(k => `"${r[k] ?? ''}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${filename}_${Date.now()}.csv`; a.click();
    };

    /* ═══════════════════ COMPUTED ═══════════════════ */

    const filteredStudents = useMemo(() => students.filter(s => {
        if (!studentSearch) return true;
        const q = studentSearch.toLowerCase();
        return s.name?.toLowerCase().includes(q) || s.uid?.toLowerCase().includes(q) || s.roll_number?.toLowerCase().includes(q);
    }), [students, studentSearch]);

    const shortageStudents = useMemo(() => attendanceSummary.filter(a => a.percentage < 75 && a.totalClasses > 0), [attendanceSummary]);

    /* ═══════════ UI HELPERS ═══════════ */

    const Label = ({ children }: { children: React.ReactNode }) => (
        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-1.5 ml-0.5">{children}</label>
    );

    const Sel = ({ value, onChange, children, ...rest }: any) => (
        <select className="w-full h-12 px-4 bg-stone-50 border-0 rounded-xl font-bold text-stone-800 outline-none focus:ring-4 focus:ring-indigo-50 appearance-none" value={value} onChange={onChange} {...rest}>
            {children}
        </select>
    );

    const TabBtn = ({ id, label, icon: Icon, count }: { id: HodTab; label: string; icon: any; count?: number }) => (
        <button onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-black rounded-xl transition-all relative ${activeTab === id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'}`}>
            <Icon size={15} /> {label}
            {count !== undefined && count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[8px] font-black ${activeTab === id ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-600'}`}>{count}</span>
            )}
        </button>
    );

    const SectionHeader = ({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) => (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm">
            <div>
                <h2 className="text-2xl font-black text-stone-900 tracking-tight">{title}</h2>
                {sub && <p className="text-stone-400 font-bold text-[10px] uppercase tracking-widest mt-1">{sub}</p>}
            </div>
            <div className="flex items-center gap-3 flex-wrap">{children}</div>
        </div>
    );

    /* ═══════════════════ RENDER ═══════════════════ */

    return (
        <DashboardLayout>
            <div className="space-y-8 pb-20">
                {/* ─── HEADER ─── */}
                <div className="bg-white p-8 rounded-[3rem] border border-stone-100 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 text-indigo-500/5 pointer-events-none"><Layers size={260} /></div>
                    <div className="relative z-10 space-y-1">
                        <h1 className="text-4xl font-black text-stone-900 tracking-tight">Department Command</h1>
                        <p className="text-indigo-600 font-extrabold uppercase tracking-[0.2em] text-[10px]">HOD Console&nbsp;•&nbsp;Level 70&nbsp;•&nbsp;Department Scope Only</p>
                    </div>
                    <div className="flex flex-wrap gap-1 p-1.5 bg-stone-50 rounded-2xl relative z-10">
                        <TabBtn id="overview" label="Overview" icon={BarChart3} />
                        <TabBtn id="students" label="Students" icon={GraduationCap} />
                        <TabBtn id="faculty" label="Faculty" icon={Briefcase} />
                        <TabBtn id="marks" label="Marks" icon={ClipboardCheck} count={stats?.pendingMarks} />
                        <TabBtn id="attendance" label="Attendance" icon={Calendar} />
                        <TabBtn id="analytics" label="Analytics" icon={TrendingUp} />
                    </div>
                </div>

                {loading && <div className="fixed top-0 left-0 w-full z-50"><div className="h-1 bg-indigo-600 animate-pulse" /></div>}

                {/* ╔══════════════════════════════════════╗
                   ║      TAB: OVERVIEW                   ║
                   ╚══════════════════════════════════════╝ */}
                {activeTab === 'overview' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Stat Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                            {[
                                { label: 'Dept Students', val: stats?.students, icon: GraduationCap, color: 'text-indigo-600 bg-indigo-50' },
                                { label: 'Dept Faculty', val: stats?.faculty, icon: Briefcase, color: 'text-blue-600 bg-blue-50' },
                                { label: 'Dept Subjects', val: stats?.subjects, icon: BookOpen, color: 'text-emerald-600 bg-emerald-50' },
                                { label: 'Pending Marks', val: stats?.pendingMarks, icon: AlertCircle, color: 'text-yellow-600 bg-yellow-50' },
                                { label: 'Active Semesters', val: stats?.activeSemesters, icon: Calendar, color: 'text-violet-600 bg-violet-50' },
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
                                        { label: 'Review Pending Marks', onClick: () => setActiveTab('marks') },
                                        { label: 'View Attendance Shortages', onClick: () => setActiveTab('attendance') },
                                        { label: 'Assign Faculty Subjects', onClick: () => { setActiveTab('faculty'); setTimeout(() => setShowAllocForm(true), 100); } },
                                        { label: 'Department Analytics', onClick: () => setActiveTab('analytics') },
                                    ].map((a, i) => (
                                        <button key={i} onClick={a.onClick} className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group">
                                            <span className="text-sm font-bold">{a.label}</span>
                                            <ArrowRight size={16} className="text-white/30 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    ))}
                                </div>
                            </Card>

                            <Card className="xl:col-span-2 border-stone-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                                <div className="p-6 border-b border-stone-50"><h3 className="font-black text-stone-800 tracking-tight">My Recent Activity</h3></div>
                                <div className="divide-y divide-stone-50">
                                    {recentLogs.map((log, i) => (
                                        <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-stone-50/50 transition-colors">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white ${log.action?.includes('RECOMMEND') ? 'bg-indigo-500' : log.action?.includes('REJECT') ? 'bg-red-500' : 'bg-blue-500'}`}>
                                                {log.action?.[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-stone-800 truncate">{log.action} → {log.entity_type}</p>
                                                <p className="text-[10px] text-stone-400 font-medium">{new Date(log.created_at).toLocaleString()}</p>
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
                        <SectionHeader title="Department Students" sub="Students enrolled in your department only">
                            <Button variant="outline" className="h-11 rounded-xl border-stone-200 font-black text-xs uppercase tracking-widest px-6" onClick={() => exportCSV(students.map(s => ({ uid: s.uid, name: s.name, roll: s.roll_number, email: s.email, course: s.courses?.name, section: s.section })), 'dept_students')}>
                                <Download size={14} className="mr-2" /> Export
                            </Button>
                        </SectionHeader>

                        {/* Search */}
                        <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={16} />
                                <input className="w-full h-10 pl-10 pr-4 bg-stone-50 border-0 rounded-xl font-bold text-sm placeholder:text-stone-300 focus:ring-4 focus:ring-indigo-50 outline-none" placeholder="Search by name, UID, or roll number..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
                            </div>
                        </div>

                        {/* Student Table */}
                        <Card className="border-stone-100 overflow-hidden rounded-[2.5rem] shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                        <tr>
                                            <th className="px-6 py-5">Student</th>
                                            <th className="px-6 py-5">Roll No</th>
                                            <th className="px-6 py-5">Course</th>
                                            <th className="px-6 py-5">Section</th>
                                            <th className="px-6 py-5">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-50">
                                        {filteredStudents.map(s => (
                                            <tr key={s.uid} className="hover:bg-indigo-50/20 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div><p className="font-black text-stone-800 text-sm">{s.name}</p><p className="text-[10px] text-stone-400 font-bold">{s.uid}</p></div>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-bold text-stone-600">{s.roll_number || '—'}</td>
                                                <td className="px-6 py-4 text-xs font-bold text-stone-600">{s.courses?.name || '—'}</td>
                                                <td className="px-6 py-4"><span className="text-[10px] font-black bg-stone-100 text-stone-500 px-2 py-0.5 rounded uppercase">{s.section || '—'}</span></td>
                                                <td className="px-6 py-4">
                                                    <span className={`w-2 h-2 rounded-full inline-block mr-1 ${s.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                    <span className="text-[10px] font-black uppercase text-stone-500">{s.is_active ? 'Active' : 'Inactive'}</span>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredStudents.length === 0 && <tr><td colSpan={5} className="py-20 text-center text-stone-300 font-bold">No students in your department.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-4 bg-stone-50 border-t border-stone-100 text-xs font-bold text-stone-400 text-center">
                                Showing {filteredStudents.length} of {students.length} department students
                            </div>
                        </Card>
                    </div>
                )}

                {/* ╔══════════════════════════════════════╗
                   ║      TAB: FACULTY                    ║
                   ╚══════════════════════════════════════╝ */}
                {activeTab === 'faculty' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SectionHeader title="Faculty & Subject Assignment" sub="Department faculty and their teaching allocations">
                            <Button className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-black text-xs uppercase tracking-widest px-6 shadow-lg shadow-indigo-100" onClick={() => setShowAllocForm(!showAllocForm)}>
                                <Plus size={16} className="mr-2" /> Assign Subject
                            </Button>
                        </SectionHeader>

                        {/* Allocation Form */}
                        {showAllocForm && (
                            <Card className="border-indigo-100 bg-indigo-50/30 rounded-[2.5rem] p-8 shadow-sm">
                                <form onSubmit={handleAllocate} className="space-y-6">
                                    <div className="flex items-center justify-between"><h3 className="text-lg font-black text-stone-900">Assign Faculty to Subject</h3><button type="button" onClick={() => setShowAllocForm(false)}><X size={20} className="text-stone-400" /></button></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div><Label>Faculty (Dept Only)</Label><Sel required value={allocForm.faculty_eid} onChange={(e: any) => setAllocForm({ ...allocForm, faculty_eid: e.target.value })}><option value="">Select Faculty</option>{faculty.map(f => <option key={f.eid} value={f.eid}>{f.name} ({f.eid})</option>)}</Sel></div>
                                        <div><Label>Subject (Dept Only)</Label><Sel required value={allocForm.subject_id} onChange={(e: any) => setAllocForm({ ...allocForm, subject_id: e.target.value })}><option value="">Select Subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.subject_code})</option>)}</Sel></div>
                                        <div><Label>Semester</Label><Sel required value={allocForm.semester_id} onChange={(e: any) => setAllocForm({ ...allocForm, semester_id: e.target.value })}><option value="">Select Semester</option>{semesters.filter(s => s.is_active).map(s => <option key={s.id} value={s.id}>Sem {s.semester_number} – {s.courses?.code}</option>)}</Sel></div>
                                        <div><Label>Section</Label><Input className="h-12 bg-white border-0 rounded-xl font-bold" placeholder="e.g. A" value={allocForm.section} onChange={e => setAllocForm({ ...allocForm, section: e.target.value })} /></div>
                                    </div>
                                    <Button type="submit" className="h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-black px-10 shadow-lg" isLoading={loading}><Save size={16} className="mr-2" /> Assign</Button>
                                </form>
                            </Card>
                        )}

                        {/* Faculty Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {faculty.map(f => {
                                const fAllocs = allocations.filter(a => a.faculty_eid === f.eid);
                                return (
                                    <Card key={f.eid} className="border-stone-100 hover:shadow-xl transition-all rounded-[2.5rem] overflow-hidden">
                                        <CardContent className="p-8 space-y-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg ring-4 ring-indigo-50">
                                                    {f.name[0]}
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-stone-900 text-sm">{f.name}</h3>
                                                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{f.designation} • {f.eid}</p>
                                                </div>
                                            </div>
                                            <div className="h-px bg-stone-100" />
                                            <div>
                                                <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-3">Assigned Subjects</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {fAllocs.map((a, i) => (
                                                        <span key={i} className="px-3 py-1.5 bg-indigo-50 rounded-lg text-[10px] font-black text-indigo-600 border border-indigo-100">
                                                            {a.subjects?.subject_code || '—'} {a.section ? `(${a.section})` : ''}
                                                        </span>
                                                    ))}
                                                    {fAllocs.length === 0 && <span className="text-[10px] text-stone-300 font-bold">No subjects assigned</span>}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                            {faculty.length === 0 && <p className="col-span-3 text-center text-stone-300 font-bold py-16">No faculty in your department.</p>}
                        </div>
                    </div>
                )}

                {/* ╔══════════════════════════════════════╗
                   ║      TAB: MARKS APPROVAL             ║
                   ╚══════════════════════════════════════╝ */}
                {activeTab === 'marks' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SectionHeader title="Marks Approval Queue" sub="Faculty-submitted marks awaiting your recommendation (department only)">
                            <Button variant="outline" className="h-11 rounded-xl border-stone-200 font-black text-xs uppercase tracking-widest px-6" onClick={fetchMarks}><RefreshCw size={14} className="mr-2" /> Refresh</Button>
                        </SectionHeader>

                        {/* Bulk Actions */}
                        {selectedMarkIds.length > 0 && (
                            <div className="flex gap-3 items-center bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                                <span className="text-xs font-black text-indigo-600">{selectedMarkIds.length} selected</span>
                                <Button size="sm" className="h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 font-black text-[10px] px-4" onClick={handleRecommend}>
                                    <Check size={12} className="mr-1" /> Recommend to Admin
                                </Button>
                                <Button size="sm" variant="outline" className="h-9 rounded-lg border-red-200 text-red-500 font-black text-[10px] px-4" onClick={() => setShowRejectForm(true)}>
                                    <XCircle size={12} className="mr-1" /> Reject
                                </Button>
                            </div>
                        )}

                        {showRejectForm && (
                            <div className="flex items-center gap-4 bg-red-50 p-4 rounded-2xl border border-red-100">
                                <Input className="flex-1 h-10 bg-white border-0 rounded-xl font-bold" placeholder="Rejection reason (required)..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                                <Button size="sm" className="h-10 rounded-lg bg-red-500 hover:bg-red-600 font-black text-xs px-6" onClick={handleReject}>Confirm Reject</Button>
                                <button onClick={() => { setShowRejectForm(false); setRejectReason(''); }}><X size={16} className="text-stone-400" /></button>
                            </div>
                        )}

                        {/* Marks Table */}
                        <Card className="border-stone-100 overflow-hidden rounded-[2.5rem] shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-indigo-600 text-[10px] font-black text-white/60 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-5"><input type="checkbox" className="w-4 h-4 rounded accent-white" checked={selectedMarkIds.length === pendingMarks.length && pendingMarks.length > 0} onChange={toggleAllMarks} /></th>
                                            <th className="px-6 py-5">Student</th>
                                            <th className="px-6 py-5">Subject</th>
                                            <th className="px-6 py-5">Internal</th>
                                            <th className="px-6 py-5">Mid-term</th>
                                            <th className="px-6 py-5">Practical</th>
                                            <th className="px-6 py-5">Total</th>
                                            <th className="px-6 py-5">Submitted By</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-50 bg-white">
                                        {pendingMarks.map(m => (
                                            <tr key={m.id} className="hover:bg-indigo-50/20 transition-colors">
                                                <td className="px-6 py-4"><input type="checkbox" className="w-4 h-4 rounded accent-indigo-500" checked={selectedMarkIds.includes(m.id)} onChange={() => toggleMark(m.id)} /></td>
                                                <td className="px-6 py-4">
                                                    <div><p className="font-black text-stone-800 text-sm">{m.students?.name}</p><p className="text-[10px] text-stone-400 font-bold">{m.student_uid}</p></div>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-bold text-indigo-600">{m.subjects?.name || '—'}</td>
                                                <td className="px-6 py-4 text-sm font-black text-stone-900">{m.internal_marks ?? '—'}</td>
                                                <td className="px-6 py-4 text-sm font-black text-stone-900">{m.mid_term_marks ?? '—'}</td>
                                                <td className="px-6 py-4 text-sm font-black text-stone-900">{m.practical_marks ?? '—'}</td>
                                                <td className="px-6 py-4 text-sm font-black text-indigo-600">{m.total_marks ?? '—'}</td>
                                                <td className="px-6 py-4 text-[10px] font-bold text-stone-400">{m.submitted_by || '—'}</td>
                                            </tr>
                                        ))}
                                        {pendingMarks.length === 0 && (
                                            <tr><td colSpan={8} className="py-20 text-center">
                                                <CheckCircle2 size={40} className="text-emerald-300 mx-auto mb-4" />
                                                <p className="text-lg font-black text-stone-400">Queue Empty</p>
                                                <p className="text-xs text-stone-300">No marks pending your review</p>
                                            </td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}

                {/* ╔══════════════════════════════════════╗
                   ║      TAB: ATTENDANCE                 ║
                   ╚══════════════════════════════════════╝ */}
                {activeTab === 'attendance' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SectionHeader title="Attendance Monitoring" sub="Department attendance overview and shortage alerts">
                            <div className="flex items-center gap-3">
                                <Sel value={attSemFilter} onChange={(e: any) => setAttSemFilter(e.target.value)} className="!w-auto !h-10 !px-3 !rounded-lg !text-xs min-w-[120px]">
                                    <option value="">All Semesters</option>
                                    {semesters.filter(s => s.is_active).map(s => <option key={s.id} value={s.id}>Sem {s.semester_number}</option>)}
                                </Sel>
                                <Button variant="outline" size="sm" className="h-10 rounded-lg border-stone-200 font-black text-xs" onClick={fetchAttendance}><RefreshCw size={12} className="mr-1" /> Apply</Button>
                            </div>
                        </SectionHeader>

                        {/* Shortage Alert */}
                        {shortageStudents.length > 0 && (
                            <Card className="border-red-100 bg-red-50/30 rounded-[2.5rem] p-8 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <AlertCircle size={20} className="text-red-500" />
                                    <h3 className="font-black text-red-800">Attendance Shortage Alert — {shortageStudents.length} students below 75%</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {shortageStudents.slice(0, 9).map(s => (
                                        <div key={s.uid} className="flex items-center justify-between p-4 bg-white rounded-xl border border-red-100">
                                            <div>
                                                <p className="text-sm font-black text-stone-800">{s.name}</p>
                                                <p className="text-[10px] text-stone-400 font-bold">{s.uid} • {s.roll_number}</p>
                                            </div>
                                            <span className={`text-lg font-black ${s.percentage < 50 ? 'text-red-600' : 'text-yellow-600'}`}>{s.percentage}%</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {/* Attendance Table */}
                        <Card className="border-stone-100 overflow-hidden rounded-[2.5rem] shadow-sm">
                            <div className="p-6 border-b border-stone-50 flex items-center justify-between">
                                <h3 className="font-black text-stone-800">Student Attendance Summary</h3>
                                <Button variant="outline" size="sm" className="rounded-xl text-[10px] font-black uppercase border-stone-200" onClick={() => exportCSV(attendanceSummary, 'dept_attendance')}>
                                    <Download size={12} className="mr-1" /> Export
                                </Button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                        <tr><th className="px-6 py-5">Student</th><th className="px-6 py-5">Roll No</th><th className="px-6 py-5">Section</th><th className="px-6 py-5">Present / Total</th><th className="px-6 py-5">Percentage</th><th className="px-6 py-5">Status</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-50">
                                        {attendanceSummary.map(a => (
                                            <tr key={a.uid} className="hover:bg-stone-50/50 transition-colors">
                                                <td className="px-6 py-4"><div><p className="font-black text-stone-800 text-sm">{a.name}</p><p className="text-[10px] text-stone-400 font-bold">{a.uid}</p></div></td>
                                                <td className="px-6 py-4 text-xs font-bold text-stone-600">{a.roll_number || '—'}</td>
                                                <td className="px-6 py-4"><span className="text-[10px] font-black bg-stone-100 text-stone-500 px-2 py-0.5 rounded uppercase">{a.section || '—'}</span></td>
                                                <td className="px-6 py-4 text-sm font-black text-stone-900">{a.presentClasses} / {a.totalClasses}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-20 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${a.percentage >= 75 ? 'bg-emerald-500' : a.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(a.percentage, 100)}%` }} />
                                                        </div>
                                                        <span className="text-xs font-black text-stone-600">{a.percentage}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {a.totalClasses === 0
                                                        ? <span className="text-[10px] font-black bg-stone-100 text-stone-400 px-2 py-0.5 rounded uppercase">No Data</span>
                                                        : a.percentage >= 75
                                                            ? <span className="text-[10px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded uppercase">OK</span>
                                                            : <span className="text-[10px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded uppercase">Shortage</span>
                                                    }
                                                </td>
                                            </tr>
                                        ))}
                                        {attendanceSummary.length === 0 && <tr><td colSpan={6} className="py-20 text-center text-stone-300 font-bold">No attendance data available.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}

                {/* ╔══════════════════════════════════════╗
                   ║      TAB: ANALYTICS                  ║
                   ╚══════════════════════════════════════╝ */}
                {activeTab === 'analytics' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <SectionHeader title="Department Analytics" sub="Performance metrics scoped to your department">
                            <div className="flex items-center gap-3">
                                <Sel value={analyticsSemId} onChange={(e: any) => setAnalyticsSemId(e.target.value)} className="!w-auto !h-10 !px-3 !rounded-lg !text-xs min-w-[120px]">
                                    <option value="">All Semesters</option>
                                    {semesters.map(s => <option key={s.id} value={s.id}>Sem {s.semester_number}</option>)}
                                </Sel>
                                <Button variant="outline" size="sm" className="h-10 rounded-lg border-stone-200 font-black text-xs" onClick={fetchAnalytics}><RefreshCw size={12} className="mr-1" /> Refresh</Button>
                            </div>
                        </SectionHeader>

                        {/* Stats Cards */}
                        {resultStats && (
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                {[
                                    { label: 'Total Results', val: resultStats.total, color: 'text-stone-600 bg-stone-50' },
                                    { label: 'Passed', val: resultStats.pass, color: 'text-emerald-600 bg-emerald-50' },
                                    { label: 'Failed', val: resultStats.fail, color: 'text-red-600 bg-red-50' },
                                    { label: 'Avg SGPA', val: resultStats.avgSgpa, color: 'text-indigo-600 bg-indigo-50' },
                                    { label: 'Top SGPA', val: resultStats.topSgpa, color: 'text-amber-600 bg-amber-50' },
                                ].map((s, i) => (
                                    <Card key={i} className="border-stone-100">
                                        <CardContent className="p-6 text-center">
                                            <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest">{s.label}</p>
                                            <h3 className="text-3xl font-black text-stone-900 mt-2">{s.val ?? '–'}</h3>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {/* Pass Rate Visual */}
                        {resultStats && resultStats.total > 0 && (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                <Card className="border-0 bg-indigo-600 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                                    <div className="absolute -right-8 -bottom-8 text-white/5"><Award size={200} /></div>
                                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-6">Department Pass Rate</h4>
                                    <div className="flex items-end gap-2 mb-6">
                                        <span className="text-6xl font-black">{resultStats.total > 0 ? Math.round((resultStats.pass / resultStats.total) * 100) : 0}</span>
                                        <span className="text-2xl font-bold mb-2">%</span>
                                    </div>
                                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${resultStats.total > 0 ? (resultStats.pass / resultStats.total) * 100 : 0}%` }} />
                                    </div>
                                    <p className="text-sm font-medium text-white/60 mt-4">{resultStats.pass} passed out of {resultStats.total} results</p>
                                </Card>

                                <Card className="border-stone-100 p-10 rounded-[3rem] shadow-sm space-y-6">
                                    <h4 className="text-lg font-black text-stone-800 tracking-tight">Department Health</h4>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
                                            <span className="text-sm font-black text-stone-600">Students</span>
                                            <span className="text-xl font-black text-indigo-600">{stats?.students || '—'}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
                                            <span className="text-sm font-black text-stone-600">Faculty</span>
                                            <span className="text-xl font-black text-indigo-600">{stats?.faculty || '—'}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
                                            <span className="text-sm font-black text-stone-600">Student:Faculty Ratio</span>
                                            <span className="text-xl font-black text-indigo-600">{stats?.faculty ? `${Math.round((stats?.students || 0) / stats.faculty)}:1` : '—'}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
                                            <span className="text-sm font-black text-stone-600">Avg SGPA</span>
                                            <span className="text-xl font-black text-emerald-600">{resultStats.avgSgpa || '—'}</span>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        )}

                        {resultStats && resultStats.total === 0 && (
                            <Card className="border-stone-100 rounded-2xl">
                                <CardContent className="p-16 text-center">
                                    <BarChart3 size={40} className="text-stone-200 mx-auto mb-4" />
                                    <p className="text-lg font-black text-stone-400">No Result Data</p>
                                    <p className="text-xs text-stone-300 mt-1">Results haven't been generated for this semester yet</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
