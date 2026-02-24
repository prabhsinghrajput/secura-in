'use client';

import React, { useEffect, useState } from 'react';
import {
    getStudentsAction,
    getSubjectsAction,
    markAttendanceAction,
    submitMarksAction
} from '@/lib/actions';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
    Users, Calendar, FileEdit, CheckCircle2,
    Search, Filter, Clock, BookOpen, UserCheck
} from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function AssistantFacultyDashboard() {
    const { data: session } = useSession();
    const user = session?.user as any;

    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'attendance' | 'marks'>('attendance');

    const [selectedSubject, setSelectedSubject] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (user?.department_id) {
            fetchInitialData();
        }
    }, [user?.department_id]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [s, sub] = await Promise.all([
                getStudentsAction(user.department_id),
                getSubjectsAction()
            ]);
            setStudents(s);
            setSubjects(sub);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.uid.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="space-y-10 pb-20">
                {/* Header */}
                <div className="bg-white p-10 rounded-[3rem] border border-stone-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div>
                        <h1 className="text-4xl font-black text-stone-900 tracking-tight">Academic Assistance</h1>
                        <p className="text-indigo-600 font-bold mt-2 uppercase tracking-widest text-xs">Assistant Faculty Portal • Level 50 Access</p>
                    </div>
                    <div className="flex bg-stone-50 p-1.5 rounded-2xl">
                        <button
                            onClick={() => setActiveTab('attendance')}
                            className={`px-6 py-3 text-sm font-black rounded-xl transition-all ${activeTab === 'attendance' ? 'bg-indigo-600 text-white shadow-lg' : 'text-stone-400 hover:text-stone-600'}`}
                        >
                            Attendance
                        </button>
                        <button
                            onClick={() => setActiveTab('marks')}
                            className={`px-6 py-3 text-sm font-black rounded-xl transition-all ${activeTab === 'marks' ? 'bg-indigo-600 text-white shadow-lg' : 'text-stone-400 hover:text-stone-600'}`}
                        >
                            Assignment Marks
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Control Panel */}
                    <Card className="lg:col-span-12 border-stone-100 rounded-[2.5rem] p-8 shadow-sm">
                        <div className="flex flex-col md:flex-row gap-6 items-end">
                            <div className="flex-1 space-y-2">
                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Select Module (Subject)</label>
                                <select
                                    className="w-full h-14 px-6 bg-stone-50 border-0 rounded-2xl font-bold text-stone-800 outline-none focus:ring-4 focus:ring-indigo-50 appearance-none"
                                    value={selectedSubject}
                                    onChange={e => setSelectedSubject(e.target.value)}
                                >
                                    <option value="">Choose a subject...</option>
                                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.subject_code})</option>)}
                                </select>
                            </div>
                            <div className="flex-1 space-y-2">
                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Search Student Registry</label>
                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-indigo-600 transition-colors" size={20} />
                                    <input
                                        className="w-full h-14 pl-12 pr-6 bg-stone-50 border-0 rounded-2xl text-stone-800 font-bold placeholder:text-stone-300 outline-none"
                                        placeholder="Name or UID..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            <Button className="h-14 px-8 rounded-2xl font-black bg-stone-900 border-0 shadow-lg" onClick={() => fetchInitialData()}>
                                Refresh Data
                            </Button>
                        </div>
                    </Card>

                    {/* Student List */}
                    <Card className="lg:col-span-12 border-stone-100 rounded-[3rem] overflow-hidden shadow-xl shadow-stone-100/30">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-stone-50 text-stone-400 text-[10px] font-black uppercase tracking-widest border-b border-stone-100">
                                    <tr>
                                        <th className="px-8 py-6">Student Identity</th>
                                        <th className="px-8 py-6">Engagement Status</th>
                                        <th className="px-8 py-6 text-right">Data Entry Ops</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-50">
                                    {filteredStudents.map(student => (
                                        <tr key={student.uid} className="hover:bg-indigo-50/20 transition-all group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center font-black text-stone-500">
                                                        {student.name[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-stone-800 tracking-tight">{student.name}</p>
                                                        <p className="text-[10px] text-stone-400 font-bold uppercase">{student.uid}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">Active Pipeline</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {activeTab === 'attendance' ? (
                                                        <>
                                                            <Button variant="outline" className="h-10 px-4 rounded-xl text-[10px] font-black text-emerald-600 border-emerald-100 hover:bg-emerald-50">
                                                                Present
                                                            </Button>
                                                            <Button variant="outline" className="h-10 px-4 rounded-xl text-[10px] font-black text-red-600 border-red-100 hover:bg-red-50">
                                                                Absent
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <Input className="h-10 w-24 bg-stone-50 border-0 font-bold text-center rounded-xl" placeholder="Marks" type="number" />
                                                            <Button className="h-10 px-4 rounded-xl text-[10px] font-black bg-indigo-600">Save</Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
