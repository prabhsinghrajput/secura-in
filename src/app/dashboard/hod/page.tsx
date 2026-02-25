'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
    getStudentsAction,
    getEmployeesAction,
    getSubjectsAction,
    approveMarksAction,
    logAuditEventAction,
    getPendingMarksAction,
    getAttendanceShortageAction,
    getDepartmentAnalyticsAction,
    allocateSubjectAction,
    recommendMarksAction,
    getSubjectAllocationsAction
} from '@/lib/actions';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
    Users, Briefcase, CheckCircle2, AlertCircle,
    TrendingUp, FileCheck, Layers, PieChart, Check,
    ClipboardList, BarChart3, GraduationCap, CalendarRange,
    Settings, Search, ArrowRight, UserCheck, Plus
} from 'lucide-react';
import { useSession } from 'next-auth/react';

type HodTab = 'overview' | 'staffing' | 'students' | 'academic' | 'analytics';

export default function HodDashboard() {
    const { data: session } = useSession();
    const user = session?.user as any;

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<HodTab>('overview');

    // Dept Data
    const [students, setStudents] = useState<any[]>([]);
    const [faculty, setFaculty] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [pendingMarks, setPendingMarks] = useState<any[]>([]);
    const [shortageList, setShortageList] = useState<any[]>([]);
    const [analytics, setAnalytics] = useState<any>(null);
    const [allocations, setAllocations] = useState<any[]>([]);

    useEffect(() => {
        if (user?.department_id) {
            fetchDeptData();
        }
    }, [user?.department_id]);

    const fetchDeptData = async () => {
        setLoading(true);
        try {
            const [s, f, sub, pending, shortage, stats, alloc] = await Promise.all([
                getStudentsAction(user.department_id),
                getEmployeesAction(user.department_id),
                getSubjectsAction(),
                getPendingMarksAction(user.department_id),
                getAttendanceShortageAction(user.department_id),
                getDepartmentAnalyticsAction(user.department_id),
                getSubjectAllocationsAction()
            ]);
            setStudents(s);
            setFaculty(f);
            setSubjects(sub);
            setPendingMarks(pending || []);
            setShortageList(shortage || []);
            setAnalytics(stats);
            setAllocations(alloc || []);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const handleAllocate = async (eid: string) => {
        const subId = prompt('Enter Subject ID/Code:');
        if (!subId) return;
        setLoading(true);
        try {
            // This is a simplified call, in a real UI we'd have a dropdown/modal
            await allocateSubjectAction({
                faculty_eid: eid,
                subject_id: subId, // Assuming ID is passed
                semester_id: 'auto' // Logic would be more complex
            });
            alert('Subject allocated successfully.');
            fetchDeptData();
        } catch (err: any) {
            alert(err.message);
        }
        setLoading(false);
    };

    const handleRecommendMark = async (ids: string[]) => {
        if (!confirm('Recommend these marks for final administrative approval?')) return;
        setLoading(true);
        try {
            await recommendMarksAction(ids);
            alert('Marks recommendations submitted to Academic Admin.');
            fetchDeptData();
        } catch (err: any) {
            alert(err.message);
        }
        setLoading(false);
    };

    const TabButton = ({ id, label, icon: Icon }: { id: HodTab, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-3 px-6 py-3 text-sm font-black rounded-2xl transition-all ${activeTab === id
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100'
                : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'
                }`}
        >
            <Icon size={18} />
            {label}
        </button>
    );

    return (
        <DashboardLayout>
            <div className="space-y-10 pb-20">
                {/* Dept Header */}
                <div className="bg-white p-12 rounded-[4rem] border border-stone-100 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 text-indigo-500/5 pointer-events-none">
                        <Layers size={320} />
                    </div>
                    <div className="relative z-10 space-y-2">
                        <h1 className="text-5xl font-black text-stone-900 tracking-tight leading-none">Command Center</h1>
                        <p className="text-indigo-600 font-extrabold uppercase tracking-[0.2em] text-xs">Department Coordination • Level 70 Authority</p>
                    </div>

                    <div className="flex flex-wrap gap-2 p-1.5 bg-stone-50 rounded-[2.5rem] relative z-10">
                        <TabButton id="overview" label="Overview" icon={Layers} />
                        <TabButton id="staffing" label="Staffing" icon={Briefcase} />
                        <TabButton id="students" label="Registry" icon={Users} />
                        <TabButton id="academic" label="Control" icon={FileCheck} />
                        <TabButton id="analytics" label="Pulse" icon={BarChart3} />
                    </div>
                </div>

                {activeTab === 'overview' && (
                    <div className="space-y-10 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            <Card className="border-0 bg-stone-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                                <div className="absolute -right-4 -bottom-4 text-white/5">
                                    <Users size={120} />
                                </div>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-6">Student Registry</p>
                                <h3 className="text-6xl font-black mb-1">{students.length}</h3>
                                <p className="text-emerald-400 font-bold text-[10px] uppercase tracking-widest">+12% vs last term</p>
                            </Card>

                            <Card className="border-stone-100 p-10 rounded-[3rem] shadow-sm flex flex-col justify-between">
                                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-8">
                                    <Briefcase size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-2">Faculty Strength</p>
                                    <h4 className="text-3xl font-black text-stone-800">{faculty.length}</h4>
                                </div>
                            </Card>

                            <Card className="border-stone-100 p-10 rounded-[3rem] shadow-sm flex flex-col justify-between">
                                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 mb-8">
                                    <FileCheck size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-2">Queue Length</p>
                                    <h4 className="text-3xl font-black text-stone-800">{pendingMarks.length}</h4>
                                </div>
                            </Card>

                            <Card className="border-stone-100 p-10 rounded-[3rem] shadow-sm flex flex-col justify-between">
                                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-8">
                                    <TrendingUp size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-2">Pass Velocity</p>
                                    <h4 className="text-3xl font-black text-stone-800">88%</h4>
                                </div>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                            <Card className="p-10 rounded-[3rem] border-stone-100 shadow-sm space-y-8">
                                <h3 className="text-xl font-black text-stone-800 tracking-tight">Recent Critical Shortages</h3>
                                <div className="space-y-6">
                                    {shortageList.map((s, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-6 bg-red-50/50 rounded-2xl border border-red-50">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600 font-black text-xs">
                                                    {s.percentage}%
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-stone-800">{s.name}</p>
                                                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Attendance Alert</p>
                                                </div>
                                            </div>
                                            <Button size="sm" variant="outline" className="h-10 rounded-xl border-stone-200 text-[10px] font-black uppercase">Notify Parent</Button>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            <Card className="p-10 rounded-[3rem] border-stone-100 shadow-sm bg-indigo-50/30 space-y-8">
                                <h3 className="text-xl font-black text-stone-800 tracking-tight">Faculty Load Tracking</h3>
                                <div className="space-y-6">
                                    {faculty.slice(0, 4).map((f, idx) => (
                                        <div key={idx} className="space-y-2">
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                                <span className="text-stone-400">{f.name}</span>
                                                <span className="text-indigo-600">85% Utilization</span>
                                            </div>
                                            <div className="h-2 bg-white rounded-full overflow-hidden border border-stone-100 p-0.5">
                                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: '85%' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {activeTab === 'staffing' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center px-4">
                            <h2 className="text-3xl font-black text-stone-900 tracking-tight">Faculty Resource Allocation</h2>
                            <Button className="h-14 rounded-2xl bg-stone-900 text-white font-black px-8 shadow-2xl" onClick={fetchDeptData}>
                                <Check size={20} className="mr-2" /> Sync Allocations
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {faculty.map(f => {
                                const facultyAllocations = allocations.filter(a => a.faculty_eid === f.eid);
                                return (
                                    <Card key={f.eid} className="border-stone-100 hover:shadow-xl transition-all group overflow-hidden rounded-[2.5rem]">
                                        <div className="p-10 space-y-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg ring-4 ring-indigo-50">
                                                    {f.name[0]}
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-stone-900">{f.name}</h3>
                                                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{f.designation}</p>
                                                </div>
                                            </div>
                                            <div className="h-px bg-stone-100" />
                                            <div className="space-y-4">
                                                <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest">Assigned Modules</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {facultyAllocations.map((a, i) => (
                                                        <span key={i} className="px-3 py-1.5 bg-indigo-50 rounded-lg text-[10px] font-black text-indigo-600 border border-indigo-100" title={a.subjects?.name}>
                                                            {a.subjects?.subject_code || 'MOD'}
                                                        </span>
                                                    ))}
                                                    <Button size="sm" variant="outline" className="h-8 rounded-lg border-dashed border-stone-200 text-[10px] font-black" onClick={() => handleAllocate(f.eid)}>+</Button>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                        <Card className="border-stone-100 overflow-hidden rounded-[3rem] shadow-sm">
                            <div className="p-10 border-b border-stone-50 bg-stone-50/30 flex items-center justify-between">
                                <h3 className="text-xl font-black text-stone-900">Student Governance List</h3>
                                <div className="relative w-72">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                                    <input className="w-full h-12 pl-12 pr-6 rounded-2xl bg-white border border-stone-200 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-50" placeholder="Filter registry..." />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                        <tr>
                                            <th className="px-10 py-6 text-left">Entity</th>
                                            <th className="px-10 py-6 text-left">Course / Semester</th>
                                            <th className="px-10 py-6 text-left">Attendance</th>
                                            <th className="px-10 py-6 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-50">
                                        {students.map(s => (
                                            <tr key={s.uid} className="hover:bg-indigo-50/5 transition-colors group">
                                                <td className="px-10 py-8">
                                                    <p className="font-black text-stone-900 text-sm tracking-tight">{s.name}</p>
                                                    <p className="text-[10px] font-bold text-stone-400 uppercase">{s.uid}</p>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <p className="text-xs font-bold text-stone-600">{s.courses?.name || 'B.Tech CSE'}</p>
                                                    <p className="text-[10px] font-black text-indigo-400 uppercase">Semester {s.current_semester || 4}</p>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-16 h-1 bg-stone-100 rounded-full">
                                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '82%' }} />
                                                        </div>
                                                        <span className="text-xs font-black text-stone-400">82%</span>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8 text-right">
                                                    <Button variant="outline" size="sm" className="rounded-xl h-10 border-stone-200 text-stone-400 opacity-0 group-hover:opacity-100 transition-all font-black uppercase text-[10px]">Portal View</Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'academic' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center px-4">
                            <div>
                                <h2 className="text-3xl font-black text-stone-900 tracking-tight">Academic Validation Queue</h2>
                                <p className="text-stone-400 text-xs font-bold mt-1 uppercase tracking-widest">Awaiting HOD Recommendation</p>
                            </div>
                            <Button variant="secondary" className="h-12 rounded-xl text-[10px] font-black uppercase tracking-widest px-8" onClick={() => fetchDeptData()}>Refresh Queue</Button>
                        </div>
                        <Card className="border-stone-100 overflow-hidden shadow-2xl shadow-indigo-100/20 rounded-[3rem]">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-indigo-600 border-b border-indigo-700 text-[10px] font-black text-white/60 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-10 py-8">Recipient Entity</th>
                                            <th className="px-10 py-8">Academic Module</th>
                                            <th className="px-10 py-8">Validation Metric (I/M/P)</th>
                                            <th className="px-10 py-8 text-right">Decision Path</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-50 bg-white">
                                        {pendingMarks.map(m => (
                                            <tr key={m.id} className="hover:bg-indigo-50/10 transition-colors">
                                                <td className="px-10 py-8">
                                                    <p className="font-black text-stone-900 text-sm tracking-tight">{m.students?.name}</p>
                                                    <p className="text-[10px] text-stone-400 font-bold uppercase">{m.student_uid}</p>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <p className="text-xs font-bold text-indigo-600">{m.subjects?.name}</p>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <div className="flex gap-3">
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-[10px] font-black text-stone-300 uppercase mb-1">Int</span>
                                                            <span className="px-3 py-1 bg-stone-100 rounded-lg text-xs font-black">{m.internal_marks}</span>
                                                        </div>
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-[10px] font-black text-stone-300 uppercase mb-1">Mid</span>
                                                            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-black">{m.mid_term_marks}</span>
                                                        </div>
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-[10px] font-black text-stone-300 uppercase mb-1">Prac</span>
                                                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-black">{m.practical_marks}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button className="bg-indigo-600 hover:bg-indigo-700 h-12 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100" onClick={() => handleRecommendMark([m.id])}>
                                                            Recommend Approval
                                                        </Button>
                                                        <Button variant="outline" className="h-12 w-12 rounded-2xl border-red-100 text-red-500 hover:bg-red-50">
                                                            <AlertCircle size={20} />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {pendingMarks.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-8 py-32 text-center">
                                                    <div className="flex flex-col items-center gap-4">
                                                        <CheckCircle2 size={64} className="text-stone-100" />
                                                        <p className="text-stone-300 font-black uppercase tracking-[0.2em] text-sm">Validation Queue Empty</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'analytics' && (
                    <div className="space-y-10 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                            <Card className="xl:col-span-2 p-12 rounded-[4rem] border-stone-100 shadow-sm space-y-12">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-2xl font-black text-stone-900 tracking-tight">Performance Velocity</h3>
                                    <select className="h-10 px-4 bg-stone-50 border-0 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-4 focus:ring-indigo-50">
                                        <option>Current Semester</option>
                                        <option>Previous Semester</option>
                                    </select>
                                </div>
                                <div className="h-80 flex items-end justify-between gap-6 px-4">
                                    {[65, 82, 45, 90, 75, 88].map((h, i) => (
                                        <div key={i} className="flex-1 space-y-4">
                                            <div className="relative group">
                                                <div className="bg-indigo-600 rounded-[1.5rem] w-full transition-all duration-700 hover:scale-x-110 hover:shadow-2xl hover:shadow-indigo-200" style={{ height: `${h}%` }} />
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-[10px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                    {h}% Pass Rate
                                                </div>
                                            </div>
                                            <p className="text-center text-[10px] font-black text-stone-300 uppercase tracking-widest leading-relaxed">Sec {['A', 'B', 'C', 'D', 'E', 'F'][i]}</p>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            <div className="space-y-10">
                                <Card className="p-10 rounded-[3rem] border-0 bg-emerald-600 text-white shadow-2xl relative overflow-hidden">
                                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-6">Attendance Aggregate</h4>
                                    <div className="flex items-end gap-2 mb-4">
                                        <span className="text-6xl font-black">79</span>
                                        <span className="text-xl font-bold mb-2">%</span>
                                    </div>
                                    <p className="text-sm font-medium text-white/60 leading-relaxed mb-6">Subject-wise attendance is stable across all core modules.</p>
                                    <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-white rounded-full" style={{ width: '79%' }} />
                                    </div>
                                </Card>

                                <Card className="p-10 rounded-[3rem] border-stone-100 shadow-sm space-y-6">
                                    <h4 className="text-[10px] font-black text-stone-300 uppercase tracking-widest">Resource Health</h4>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                            <span className="text-sm font-black text-stone-800 tracking-tight">Faculty Load</span>
                                        </div>
                                        <span className="text-xs font-black text-indigo-600">Optimal</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span className="text-sm font-black text-stone-800 tracking-tight">Syllabus Coverage</span>
                                        </div>
                                        <span className="text-xs font-black text-emerald-600">On Track</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                                            <span className="text-sm font-black text-stone-800 tracking-tight">Lab Utilization</span>
                                        </div>
                                        <span className="text-xs font-black text-orange-600">High</span>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
