'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
    getStudentsAction,
    getSubjectsAction,
    markAttendanceAction,
    getTimetableAction,
    getFacultyAssignmentsAction,
    getFacultyStudentsAction,
    saveFacultyMarksAction,
    getFacultyAnalyticsAction,
    getAcademicRecordsAction
} from '@/lib/actions';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
    Plus, Search, Edit2, Trash2, CheckCircle, XCircle, Filter,
    Eye, ArrowLeft, FileText, CheckCircle2, UserCheck, BarChart2,
    Calendar, BookOpen, Clock, MapPin, AlertCircle, Save,
    TrendingUp, PieChart, Activity, ClipboardList, ChevronRight,
    Users, ArrowRight
} from 'lucide-react';

type FacultyTab = 'pulse' | 'assignments' | 'attendance' | 'marks' | 'timetable';

export default function FacultyDashboard() {
    const { data: session } = useSession();
    const user = session?.user as any;

    const [activeTab, setActiveTab] = useState<FacultyTab>('pulse');
    const [loading, setLoading] = useState(true);

    // Context Data
    const [assignments, setAssignments] = useState<any[]>([]);
    const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
    const [activeStudents, setActiveStudents] = useState<any[]>([]);
    const [timetable, setTimetable] = useState<any[]>([]);
    const [analytics, setAnalytics] = useState<any>(null);

    // UI/Filter State
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceList, setAttendanceList] = useState<Record<string, string>>({});
    const [marksList, setMarksList] = useState<any[]>([]);

    useEffect(() => {
        if (user?.uid_eid) {
            fetchInitialContext();
        }
    }, [user?.uid_eid]);

    const fetchInitialContext = async () => {
        setLoading(true);
        try {
            const [assign, time, stats] = await Promise.all([
                getFacultyAssignmentsAction(),
                getTimetableAction('faculty', user.uid_eid),
                getFacultyAnalyticsAction()
            ]);
            setAssignments(assign || []);
            setTimetable(time || []);
            setAnalytics(stats);

            if (assign && assign.length > 0) {
                setSelectedAssignment(assign[0]);
                fetchClassStudents(assign[0]);
            }
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const fetchClassStudents = async (assignment: any) => {
        setLoading(true);
        try {
            const students = await getFacultyStudentsAction(assignment.semesters.id, assignment.section);
            setActiveStudents(students);
            // Initialize marks list for the class
            setMarksList(students.map(s => ({
                student_uid: s.uid,
                student_name: s.name,
                subject_id: assignment.subjects.id,
                semester_id: assignment.semesters.id,
                internal_marks: 0,
                mid_term_marks: 0,
                practical_marks: 0,
                status: 'draft'
            })));
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const handleSaveMarks = async () => {
        if (!confirm('Save these marks as drafts?')) return;
        setLoading(true);
        try {
            await saveFacultyMarksAction(marksList);
            alert('Marks saved successfully.');
        } catch (err: any) {
            alert(err.message);
        }
        setLoading(false);
    };

    const handleSubmitMarks = async () => {
        if (!confirm('Submit marks for HOD approval? This will lock these records for you.')) return;
        setLoading(true);
        try {
            const payload = marksList.map(m => ({ ...m, status: 'pending_hod' }));
            await saveFacultyMarksAction(payload);
            setMarksList(payload);
            alert('Marks submitted for HOD review.');
        } catch (err: any) {
            alert(err.message);
        }
        setLoading(false);
    };

    const handleMarkAttendance = async () => {
        if (!selectedAssignment || Object.keys(attendanceList).length === 0) return alert('No attendance records to save.');
        setLoading(true);
        try {
            const payload = Object.entries(attendanceList).map(([uid, status]) => ({
                student_uid: uid,
                subject_id: selectedAssignment.subjects.id,
                date: attendanceDate,
                status,
                marked_by: user.uid_eid
            }));
            await markAttendanceAction(payload as any);
            alert('Attendance Registry Updated.');
        } catch (err: any) {
            alert(err.message);
        }
        setLoading(false);
    };

    const currentDay = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());

    const TabButton = ({ id, label, icon: Icon }: { id: FacultyTab, label: string, icon: any }) => (
        <button
            onClick={() => {
                setActiveTab(id);
                if (id === 'pulse') fetchInitialContext();
            }}
            className={`flex items-center gap-3 px-6 py-3 text-sm font-black rounded-2xl transition-all ${activeTab === id
                ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-100'
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
                {/* Faculty Header */}
                <div className="bg-white p-12 rounded-[4rem] border border-stone-100 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 text-emerald-500/5 pointer-events-none">
                        <UserCheck size={320} />
                    </div>
                    <div className="relative z-10 space-y-2">
                        <h1 className="text-5xl font-black text-stone-900 tracking-tight leading-none">Faculty Hub</h1>
                        <p className="text-emerald-600 font-extrabold uppercase tracking-[0.2em] text-xs">
                            {user?.role_level === 50 ? "Academic Support • Level 50 Assistance" : "Subject Authority • Level 60 Governance"}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2 p-1.5 bg-stone-50 rounded-[2.5rem] relative z-10">
                        <TabButton id="pulse" label="Pulse" icon={Activity} />
                        <TabButton id="assignments" label="Classes" icon={BookOpen} />
                        <TabButton id="attendance" label="Registry" icon={CheckCircle2} />
                        <TabButton id="marks" label="Grading" icon={ClipboardList} />
                        <TabButton id="timetable" label="Schedule" icon={Calendar} />
                    </div>
                </div>

                {activeTab === 'pulse' && (
                    <div className="space-y-10 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {analytics?.classPerformance.map((stat: any, i: number) => (
                                <Card key={i} className="border-stone-100 p-10 rounded-[3rem] shadow-sm flex flex-col justify-between group hover:border-emerald-200 transition-all">
                                    <div className="flex justify-between items-start">
                                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                            {i === 0 ? <Users size={24} /> : i === 1 ? <TrendingUp size={24} /> : <Activity size={24} />}
                                        </div>
                                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest">Live</span>
                                    </div>
                                    <div className="mt-8">
                                        <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-2">{stat.name}</p>
                                        <h4 className="text-4xl font-black text-stone-800">{stat.value}%</h4>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                            <Card className="p-12 rounded-[4rem] border-stone-100 shadow-sm bg-stone-900 text-white space-y-10 relative overflow-hidden">
                                <div className="absolute -right-20 -bottom-20 text-white/5 pointer-events-none">
                                    <PieChart size={400} />
                                </div>
                                <h3 className="text-2xl font-black tracking-tight">Submission Pipeline</h3>
                                <div className="grid grid-cols-3 gap-8 relative z-10">
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Drafts</p>
                                        <p className="text-4xl font-black">{analytics?.submissionStatus.draft}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Pending</p>
                                        <p className="text-4xl font-black text-orange-400">{analytics?.submissionStatus.pending}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Validated</p>
                                        <p className="text-4xl font-black text-emerald-400">{analytics?.submissionStatus.approved}</p>
                                    </div>
                                </div>
                                <Button className="w-full h-14 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl font-black text-sm relative z-10 backdrop-blur-md">
                                    Generate Term Report
                                </Button>
                            </Card>

                            <Card className="p-12 rounded-[4rem] border-stone-100 shadow-sm space-y-10">
                                <h3 className="text-2xl font-black text-stone-800 tracking-tight">Active Class Oversight</h3>
                                <div className="space-y-6">
                                    {assignments.slice(0, 3).map((a, i) => (
                                        <div key={i} className="flex items-center justify-between p-6 bg-stone-50 rounded-3xl border border-stone-100 group hover:bg-white hover:shadow-xl transition-all cursor-pointer">
                                            <div className="flex items-center gap-6">
                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 font-black shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                                    {a.subjects.subject_code.slice(-1)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-stone-800 text-sm tracking-tight">{a.subjects.name}</p>
                                                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Sem {a.semesters.semester_number} • Section {a.section}</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="text-stone-300 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {activeTab === 'assignments' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-500">
                        {assignments.map((a, i) => (
                            <div key={i} onClick={() => {
                                setSelectedAssignment(a);
                                fetchClassStudents(a);
                                setActiveTab('attendance');
                            }}>
                                <Card className="border-stone-100 p-10 rounded-[3rem] shadow-sm space-y-8 group hover:shadow-2xl transition-all cursor-pointer">
                                    <div className="flex justify-between items-start">
                                        <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-600 font-black text-xl shadow-inner group-hover:scale-110 transition-transform">
                                            {a.subjects.subject_code}
                                        </div>
                                        <span className="px-4 py-2 bg-stone-100 rounded-xl text-[10px] font-black uppercase text-stone-500">Core Module</span>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-stone-800 tracking-tight leading-tight">{a.subjects.name}</h3>
                                        <p className="text-stone-400 text-xs font-bold mt-2 uppercase tracking-widest leading-relaxed">
                                            {a.semesters.courses.name}<br />Semester {a.semesters.semester_number} • Section {a.section}
                                        </p>
                                    </div>
                                    <div className="pt-6 border-t border-stone-100 flex justify-between items-center">
                                        <p className="text-[10px] font-black text-stone-300 uppercase">Assigned Entity</p>
                                        <p className="text-[10px] font-black text-emerald-600 uppercase">Manage Class <ArrowRight className="inline-block" size={12} /></p>
                                    </div>
                                </Card>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-4">
                            <div>
                                <h2 className="text-3xl font-black text-stone-900 tracking-tight">Session Registry</h2>
                                <p className="text-stone-400 text-xs font-bold mt-1 uppercase tracking-widest">{selectedAssignment?.subjects.name} • Section {selectedAssignment?.section}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <input
                                    type="date"
                                    className="h-14 px-6 rounded-2xl bg-white border border-stone-100 text-sm font-black shadow-sm outline-none focus:ring-4 focus:ring-emerald-50"
                                    value={attendanceDate}
                                    onChange={e => setAttendanceDate(e.target.value)}
                                />
                                <Button className="h-14 px-10 rounded-2xl bg-emerald-600 text-white font-black shadow-xl shadow-emerald-100" onClick={handleMarkAttendance}>
                                    <Save size={18} className="mr-3" /> Commit Registry
                                </Button>
                            </div>
                        </div>

                        <Card className="border-stone-100 overflow-hidden rounded-[3rem] shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                        <tr>
                                            <th className="px-10 py-8">Entity (UID)</th>
                                            <th className="px-10 py-8">Full Name</th>
                                            <th className="px-10 py-8 text-center">Status Assignment</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-50">
                                        {activeStudents.map(s => (
                                            <tr key={s.uid} className="hover:bg-emerald-50/10 transition-colors">
                                                <td className="px-10 py-8">
                                                    <span className="font-black text-emerald-600 text-sm">{s.uid}</span>
                                                </td>
                                                <td className="px-10 py-8 font-black text-stone-800 text-sm tracking-tight">{s.name}</td>
                                                <td className="px-10 py-8">
                                                    <div className="flex gap-2 justify-center">
                                                        {['Present', 'Absent', 'Leave'].map(st => (
                                                            <button
                                                                key={st}
                                                                onClick={() => setAttendanceList({ ...attendanceList, [s.uid]: st })}
                                                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${attendanceList[s.uid] === st
                                                                    ? st === 'Present' ? 'bg-emerald-600 text-white' : st === 'Absent' ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'
                                                                    : 'bg-stone-50 text-stone-300 hover:bg-stone-100'
                                                                    }`}
                                                            >
                                                                {st}
                                                            </button>
                                                        ))}
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

                {activeTab === 'marks' && (
                    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-4">
                            <div>
                                <h2 className="text-3xl font-black text-stone-900 tracking-tight">Academic Grading Console</h2>
                                <p className="text-stone-400 text-xs font-bold mt-1 uppercase tracking-widest">{selectedAssignment?.subjects.name} • Section {selectedAssignment?.section}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <Button variant="outline" className="h-14 px-8 rounded-2xl border-stone-200 font-black text-stone-600" onClick={handleSaveMarks}>
                                    <Save size={18} className="mr-3" /> Save Drafts
                                </Button>
                                {user?.role_level > 50 && (
                                    <Button className="h-14 px-10 rounded-2xl bg-indigo-600 text-white font-black shadow-xl shadow-indigo-100" onClick={handleSubmitMarks}>
                                        <CheckCircle2 size={18} className="mr-3" /> Submit to HOD
                                    </Button>
                                )}
                            </div>
                        </div>

                        <Card className="border-stone-100 overflow-hidden rounded-[4rem] shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                        <tr>
                                            <th className="px-10 py-10">Entity</th>
                                            <th className="px-10 py-10">Internal (30)</th>
                                            <th className="px-10 py-10">Mid (20)</th>
                                            <th className="px-10 py-10">Practical (50)</th>
                                            <th className="px-10 py-10">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-50">
                                        {marksList.map((m, i) => (
                                            <tr key={m.student_uid} className="hover:bg-indigo-50/5 transition-colors">
                                                <td className="px-10 py-8">
                                                    <p className="font-black text-stone-800 text-sm tracking-tight">{m.student_name}</p>
                                                    <p className="text-[10px] text-stone-400 font-bold uppercase">{m.student_uid}</p>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <input
                                                        type="number"
                                                        max={30}
                                                        className="w-20 h-12 bg-stone-50 border-0 rounded-xl text-center font-black outline-none focus:ring-4 focus:ring-indigo-50"
                                                        value={m.internal_marks}
                                                        disabled={m.status !== 'draft'}
                                                        onChange={e => {
                                                            const newList = [...marksList];
                                                            newList[i].internal_marks = Number(e.target.value);
                                                            setMarksList(newList);
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-10 py-8">
                                                    <input
                                                        type="number"
                                                        max={20}
                                                        className="w-20 h-12 bg-stone-50 border-0 rounded-xl text-center font-black outline-none focus:ring-4 focus:ring-indigo-50"
                                                        value={m.mid_term_marks}
                                                        disabled={m.status !== 'draft'}
                                                        onChange={e => {
                                                            const newList = [...marksList];
                                                            newList[i].mid_term_marks = Number(e.target.value);
                                                            setMarksList(newList);
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-10 py-8">
                                                    <input
                                                        type="number"
                                                        max={50}
                                                        className="w-20 h-12 bg-stone-50 border-0 rounded-xl text-center font-black outline-none focus:ring-4 focus:ring-indigo-50"
                                                        value={m.practical_marks}
                                                        disabled={m.status !== 'draft'}
                                                        onChange={e => {
                                                            const newList = [...marksList];
                                                            newList[i].practical_marks = Number(e.target.value);
                                                            setMarksList(newList);
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-10 py-8 text-right">
                                                    {m.status === 'draft' ? (
                                                        <span className="text-[10px] font-black text-stone-300 uppercase tracking-widest">Unsaved</span>
                                                    ) : (
                                                        <span className="text-[10px] font-black text-orange-500 bg-orange-50 px-3 py-1 rounded-lg uppercase tracking-widest">Locked / Pending</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'timetable' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-6 animate-in fade-in duration-500">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                            <div key={day} className="space-y-6">
                                <h4 className="text-sm font-black text-stone-300 uppercase tracking-widest text-center py-4 border-b border-stone-50">{day.slice(0, 3)}</h4>
                                <div className="space-y-4">
                                    {timetable.filter(t => t.day === day).map((item, idx) => (
                                        <Card key={idx} className="p-6 border-stone-100 shadow-sm space-y-4 group hover:bg-stone-900 hover:text-white transition-all">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-6 bg-emerald-600 rounded-full" />
                                                <p className="text-[10px] font-black uppercase tracking-tight truncate">{item.subjects.name}</p>
                                            </div>
                                            <div className="space-y-1.5 opacity-60">
                                                <p className="text-[10px] font-bold flex items-center gap-2"><Clock size={12} /> {item.start_time.slice(0, 5)}</p>
                                                <p className="text-[10px] font-bold flex items-center gap-2"><MapPin size={12} /> {item.room}</p>
                                            </div>
                                        </Card>
                                    ))}
                                    {timetable.filter(t => t.day === day).length === 0 && (
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
