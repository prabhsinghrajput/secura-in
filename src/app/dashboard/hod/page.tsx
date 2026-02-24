'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
    getStudentsAction,
    getEmployeesAction,
    getDepartmentsAction,
    getSubjectsAction,
    approveMarksAction,
    logAuditEventAction
} from '@/lib/actions';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
    Users, Briefcase, CheckCircle2, AlertCircle,
    TrendingUp, FileCheck, Layers, PieChart
} from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function HodDashboard() {
    const { data: session } = useSession();
    const user = session?.user as any;

    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<any[]>([]);
    const [faculty, setFaculty] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [pendingMarks, setPendingMarks] = useState<any[]>([]);

    useEffect(() => {
        if (user?.department_id) {
            fetchDeptData();
        }
    }, [user?.department_id]);

    const fetchDeptData = async () => {
        setLoading(true);
        try {
            const [s, f, sub] = await Promise.all([
                getStudentsAction(user.department_id),
                getEmployeesAction(user.department_id),
                getSubjectsAction()
            ]);
            setStudents(s);
            setFaculty(f);
            setSubjects(sub);
            setPendingMarks([]); // In production, fetch from marks_submissions where status='pending_hod'
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const handleApprove = async (ids: string[]) => {
        try {
            await approveMarksAction(ids, 'approved'); // If HOD level 70 can approve, or 'pending_admin' for level 80
            alert('Marks recommendations submitted.');
            fetchDeptData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-10 pb-20">
                {/* Dept Header */}
                <div className="bg-white p-12 rounded-[4rem] border border-stone-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 text-indigo-500/5 pointer-events-none">
                        <Layers size={320} />
                    </div>
                    <div className="relative z-10 space-y-2">
                        <h1 className="text-5xl font-black text-stone-900 tracking-tight leading-none">Command Center</h1>
                        <p className="text-indigo-600 font-extrabold uppercase tracking-[0.2em] text-xs">Department Coordination • Level 70 Authority</p>
                    </div>
                    <div className="flex gap-4 relative z-10">
                        <div className="px-8 py-4 bg-indigo-600 rounded-[2rem] text-white shadow-xl shadow-indigo-100">
                            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Department Scope</p>
                            <p className="text-sm font-black">Institutional Domain Verified</p>
                        </div>
                    </div>
                </div>

                {/* Status Bento */}
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
                            <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-2">Academic Staff</p>
                            <h3 className="text-4xl font-black text-stone-900">{faculty.length}</h3>
                        </div>
                    </Card>

                    <Card className="border-stone-100 p-10 rounded-[3rem] shadow-sm flex flex-col justify-between">
                        <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 mb-8">
                            <FileCheck size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-2">Submission Queue</p>
                            <h3 className="text-4xl font-black text-stone-900">{pendingMarks.length}</h3>
                        </div>
                    </Card>

                    <Card className="border-stone-100 p-10 rounded-[3rem] shadow-sm flex flex-col justify-between">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-8">
                            <PieChart size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-2">Dept Pulse</p>
                            <h3 className="text-4xl font-black text-stone-900">8.42</h3>
                        </div>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Faculty Management */}
                    <Card className="lg:col-span-8 border-stone-100 rounded-[3.5rem] overflow-hidden shadow-xl shadow-stone-100/30">
                        <div className="p-10 border-b border-stone-50 bg-white flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-stone-900 tracking-tight">Faculty Workload</h2>
                                <p className="text-stone-400 font-bold text-[10px] uppercase tracking-widest mt-1">Resource allocation and subject distribution</p>
                            </div>
                            <Button variant="outline" className="h-12 rounded-2xl font-black px-6 border-stone-100">Modify Assignments</Button>
                        </div>
                        <div className="p-0">
                            <table className="w-full text-left">
                                <thead className="bg-stone-50 text-stone-400 text-[10px] font-black uppercase tracking-widest border-b border-stone-100">
                                    <tr>
                                        <th className="px-10 py-6">Member</th>
                                        <th className="px-10 py-6">Load Factor</th>
                                        <th className="px-10 py-6 text-right">Ops</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-50">
                                    {faculty.map(f => (
                                        <tr key={f.eid} className="hover:bg-indigo-50/20 transition-all group">
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-14 h-14 rounded-[1.5rem] bg-indigo-50 flex items-center justify-center text-indigo-600 font-black">
                                                        {f.name[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-stone-800 tracking-tight text-lg">{f.name}</p>
                                                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{f.designation}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="w-full max-w-[200px] space-y-2">
                                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                                        <span className="text-stone-300">Utilization</span>
                                                        <span className="text-stone-700">75%</span>
                                                    </div>
                                                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-indigo-600" style={{ width: '75%' }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8 text-right">
                                                <Button size="sm" variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-white border-2 border-transparent hover:border-indigo-50">
                                                    <FileCheck size={18} className="text-stone-400 group-hover:text-indigo-600" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Analytics Sidebar */}
                    <div className="lg:col-span-4 space-y-8">
                        <Card className="border-0 bg-indigo-600 p-10 rounded-[3.5rem] text-white shadow-2xl shadow-indigo-100">
                            <div className="flex items-center gap-5 mb-10">
                                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                                    <TrendingUp size={28} />
                                </div>
                                <div>
                                    <h4 className="text-xl font-black">Domain Intel</h4>
                                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">Live Performance</p>
                                </div>
                            </div>
                            <div className="space-y-8">
                                {[
                                    { label: 'Attendance Benchmark', val: '92.4%', trend: '+1.2%', up: true },
                                    { label: 'Research Output', val: '24', trend: '+4', up: true },
                                    { label: 'Curriculum Progress', val: '88%', trend: '-2%', up: false }
                                ].map((stat, i) => (
                                    <div key={i} className="flex justify-between items-end border-b border-white/10 pb-6">
                                        <div>
                                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">{stat.label}</p>
                                            <p className="text-3xl font-black">{stat.val}</p>
                                        </div>
                                        <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl ${stat.up ? 'bg-emerald-400/20 text-emerald-300' : 'bg-red-400/20 text-red-300'}`}>
                                            {stat.trend}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card className="border-stone-100 p-10 rounded-[3.5rem] shadow-sm border-2">
                            <h4 className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-8">Priority Alerts</h4>
                            <div className="space-y-4">
                                <div className="p-6 rounded-[2rem] bg-orange-50 border border-orange-100 relative group overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12 group-hover:rotate-0 transition-transform">
                                        <AlertCircle size={40} />
                                    </div>
                                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">Submission Delay</p>
                                    <p className="text-sm font-bold text-stone-600 leading-relaxed">MST-1 Marks for CS-402 are overdue by 48 hours.</p>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
