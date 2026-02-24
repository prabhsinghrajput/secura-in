'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
    getStudentsAction,
    getEmployeesAction,
    getDepartmentsAction,
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
    const [pendingMarks, setPendingMarks] = useState<any[]>([]); // This would need a specific action

    useEffect(() => {
        if (user?.department_id) {
            fetchDeptData();
        }
    }, [user?.department_id]);

    const fetchDeptData = async () => {
        setLoading(true);
        try {
            const [s, f] = await Promise.all([
                getStudentsAction(user.department_id),
                getEmployeesAction(user.department_id)
            ]);
            setStudents(s);
            setFaculty(f);
            // Mocking pending marks for now as we'd need a "getPendingMarksForDept" action
            setPendingMarks([]);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const handleApprove = async (ids: string[]) => {
        try {
            await approveMarksAction(ids, 'pending_admin');
            alert('Marks recommended for final approval.');
            fetchDeptData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-10 pb-20">
                {/* Dept Header */}
                <div className="bg-white p-10 rounded-[3rem] border border-stone-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 text-indigo-50/50 pointer-events-none">
                        <Layers size={180} />
                    </div>
                    <div className="relative z-10">
                        <h1 className="text-4xl font-black text-stone-900 tracking-tight">Department Oversight</h1>
                        <p className="text-indigo-600 font-bold mt-2 uppercase tracking-widest text-xs">HOD CONTROL PANEL • LEVEL 70 ACCESS</p>
                    </div>
                    <div className="flex gap-4 relative z-10">
                        <div className="px-6 py-3 bg-stone-50 rounded-2xl border border-stone-100">
                            <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest">Active Dept</p>
                            <p className="text-sm font-black text-stone-800">{user?.department_id ? 'Authenticated Domain' : 'Connecting...'}</p>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="border-0 bg-stone-900 text-white p-8 rounded-[2.5rem] shadow-xl">
                        <div className="flex justify-between items-start mb-8">
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                                <Users size={24} />
                            </div>
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Enrollment</span>
                        </div>
                        <h3 className="text-5xl font-black mb-2">{students.length}</h3>
                        <p className="text-white/40 font-bold text-xs uppercase tracking-widest">Total Students</p>
                    </Card>

                    <Card className="border-stone-100 p-8 rounded-[2.5rem] shadow-sm">
                        <div className="flex justify-between items-start mb-8">
                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                <Briefcase size={24} />
                            </div>
                            <span className="text-[10px] font-black text-stone-300 uppercase tracking-widest">Staffing</span>
                        </div>
                        <h3 className="text-5xl font-black mb-2 text-stone-900">{faculty.length}</h3>
                        <p className="text-stone-400 font-bold text-xs uppercase tracking-widest">Faculty Members</p>
                    </Card>

                    <Card className="border-stone-100 p-8 rounded-[2.5rem] shadow-sm">
                        <div className="flex justify-between items-start mb-8">
                            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
                                <FileCheck size={24} />
                            </div>
                            <span className="text-[10px] font-black text-stone-300 uppercase tracking-widest">Queue</span>
                        </div>
                        <h3 className="text-5xl font-black mb-2 text-stone-900">{pendingMarks.length}</h3>
                        <p className="text-stone-400 font-bold text-xs uppercase tracking-widest">Pending Approvals</p>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main Approval Table */}
                    <Card className="lg:col-span-8 border-stone-100 rounded-[3rem] overflow-hidden shadow-xl shadow-stone-100/30">
                        <CardHeader className="p-10 border-b border-stone-50 bg-white">
                            <h2 className="text-2xl font-black text-stone-900 tracking-tight">Marks Recommendation Queue</h2>
                            <p className="text-stone-400 font-bold text-xs uppercase tracking-widest mt-2">Validate and push department marks to Academic Admin</p>
                        </CardHeader>
                        <div className="p-0">
                            {pendingMarks.length === 0 ? (
                                <div className="p-20 text-center space-y-4">
                                    <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto text-stone-200">
                                        <CheckCircle2 size={40} />
                                    </div>
                                    <p className="text-stone-300 font-black italic">No pending marks for recommendation in this domain.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left">
                                    {/* Table Content */}
                                </table>
                            )}
                        </div>
                    </Card>

                    {/* Performance Analytics Sidebar */}
                    <div className="lg:col-span-4 space-y-8">
                        <Card className="border-0 bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-100">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                    <TrendingUp size={24} />
                                </div>
                                <div>
                                    <h4 className="font-black">Domain Analytics</h4>
                                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Dept Performance</p>
                                </div>
                            </div>
                            <div className="space-y-6">
                                {[
                                    { label: 'Avg CGPA', val: '8.4', trend: '+0.2' },
                                    { label: 'Attendance', val: '92%', trend: '-1%' },
                                    { label: 'Pass Rate', val: '96%', trend: '+4%' }
                                ].map((stat, i) => (
                                    <div key={i} className="flex justify-between items-end border-b border-white/10 pb-4">
                                        <div>
                                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{stat.label}</p>
                                            <p className="text-3xl font-black">{stat.val}</p>
                                        </div>
                                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${stat.trend.startsWith('+') ? 'bg-emerald-400/20 text-emerald-300' : 'bg-red-400/20 text-red-300'}`}>
                                            {stat.trend}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card className="border-stone-100 p-10 rounded-[2.5rem]">
                            <div className="flex items-center gap-4 mb-8">
                                <AlertCircle size={20} className="text-orange-500" />
                                <h4 className="font-black text-stone-800">Resource Alerts</h4>
                            </div>
                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100">
                                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Attendance Flag</p>
                                    <p className="text-xs font-bold text-stone-600">8 students in CS-SEC-A have attendance below 75%.</p>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
