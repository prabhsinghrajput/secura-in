'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
    getAcademicRecordsAction,
    getStudentProfileAction,
    getAttendanceAction,
    getInternalAssessmentsAction,
    getTimetableAction,
    getQualificationsAction
} from '@/lib/actions';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AcademicRecord, Student, Attendance, InternalAssessment, Timetable, Qualification } from '@/types';
import {
    FileText, Award, Calendar, User, Mail, Building, GraduationCap,
    LayoutDashboard, CheckCircle2, AlertCircle, Clock, MapPin,
    BookOpen, History, Phone, Home, Shield, Printer
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    LineChart, Line
} from 'recharts';

type TabType = 'overview' | 'results' | 'assessments' | 'attendance' | 'timetable' | 'profile';

export default function StudentDashboard() {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [loading, setLoading] = useState(true);

    // Data States
    const [profile, setProfile] = useState<Student | null>(null);
    const [records, setRecords] = useState<AcademicRecord[]>([]);
    const [attendance, setAttendance] = useState<(Attendance & { subjects: { name: string } })[]>([]);
    const [assessments, setAssessments] = useState<(InternalAssessment & { subjects: { name: string } })[]>([]);
    const [timetable, setTimetable] = useState<(Timetable & { subjects: { name: string }, employees: { name: string } })[]>([]);
    const [qualifications, setQualifications] = useState<Qualification[]>([]);

    useEffect(() => {
        if (session?.user?.uid_eid) {
            fetchAllData();
        }
    }, [session]);

    const fetchAllData = async () => {
        setLoading(true);
        const uid = session?.user?.uid_eid!;
        try {
            const [p, r, a, as, t, q] = await Promise.all([
                getStudentProfileAction(uid),
                getAcademicRecordsAction(uid),
                getAttendanceAction(uid),
                getInternalAssessmentsAction(uid),
                getTimetableAction('student', uid),
                getQualificationsAction(uid)
            ]);
            setProfile(p);
            setRecords(r);
            setAttendance(a);
            setAssessments(as);
            setTimetable(t);
            setQualifications(q);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
        setLoading(false);
    };

    // --- COMPUTED DATA ---

    const attendanceStats = useMemo(() => {
        const stats: Record<string, { total: number; present: number; name: string }> = {};
        attendance.forEach(entry => {
            const code = entry.subject_code;
            if (!stats[code]) stats[code] = { total: 0, present: 0, name: entry.subjects.name };
            stats[code].total++;
            if (entry.status === 'Present') stats[code].present++;
        });
        return Object.entries(stats).map(([code, data]) => ({
            subject: data.name,
            code,
            percentage: Math.round((data.present / data.total) * 100) || 0,
            attended: data.present,
            total: data.total
        }));
    }, [attendance]);

    const gpaData = useMemo(() => {
        const gradePoints: Record<string, number> = { 'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'P': 4, 'F': 0 };
        const semGroups: Record<number, { points: number; count: number }> = {};

        records.forEach(r => {
            if (!semGroups[r.semester]) semGroups[r.semester] = { points: 0, count: 0 };
            semGroups[r.semester].points += gradePoints[r.grade] || 0;
            semGroups[r.semester].count++;
        });

        const sortedSems = Object.keys(semGroups).map(Number).sort();
        let cumulativePoints = 0;
        let cumulativeCount = 0;

        return sortedSems.map(sem => {
            const semGpa = semGroups[sem].points / semGroups[sem].count;
            cumulativePoints += semGroups[sem].points;
            cumulativeCount += semGroups[sem].count;
            return {
                semester: `Sem ${sem}`,
                sgpa: Number(semGpa.toFixed(2)),
                cgpa: Number((cumulativePoints / cumulativeCount).toFixed(2))
            };
        });
    }, [records]);

    const groupedRecords = useMemo(() => {
        return records.reduce((acc, record) => {
            const sem = record.semester;
            if (!acc[sem]) acc[sem] = [];
            acc[sem].push(record);
            return acc;
        }, {} as Record<number, AcademicRecord[]>);
    }, [records]);

    const currentDay = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());

    // --- RENDER HELPERS ---

    const TabButton = ({ id, label, icon: Icon }: { id: TabType, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
                }`}
        >
            <Icon size={16} />
            {label}
        </button>
    );

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-stone-400 font-bold animate-pulse">Synchronizing Academic Data...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-8 pb-20">
                {/* Header & Tabs */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                            <GraduationCap size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-stone-900 tracking-tight">Student Portal</h1>
                            <p className="text-stone-500 font-medium">{profile?.name} • {profile?.program_code || 'Academic Access'}</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-2xl border border-stone-100 shadow-sm">
                        <TabButton id="overview" label="Overview" icon={LayoutDashboard} />
                        <TabButton id="results" label="Results" icon={Award} />
                        <TabButton id="assessments" label="Assessments" icon={BookOpen} />
                        <TabButton id="attendance" label="Attendance" icon={CheckCircle2} />
                        <TabButton id="timetable" label="Timetable" icon={Calendar} />
                        <TabButton id="profile" label="Profile" icon={User} />
                    </div>
                </div>

                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            {/* GPA Chart */}
                            <Card className="border-stone-100">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <h3 className="font-black text-stone-800 tracking-tight">Performance Trend</h3>
                                    <div className="flex items-center gap-4 text-xs">
                                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-600" /> SGPA</div>
                                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-stone-300" /> CGPA</div>
                                    </div>
                                </CardHeader>
                                <CardContent className="h-[300px] w-full pt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={gpaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="semester" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} />
                                            <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} />
                                            <Tooltip
                                                cursor={{ fill: '#f8fafc' }}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Bar dataKey="sgpa" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={24} />
                                            <Bar dataKey="cgpa" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={24} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Today's Schedule Mini */}
                            <Card className="border-stone-100">
                                <CardHeader>
                                    <h3 className="font-black text-stone-800 tracking-tight">Today's Lectures</h3>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {timetable.filter(t => t.day === currentDay).length > 0 ? (
                                        timetable.filter(t => t.day === currentDay).map(t => (
                                            <div key={t.id} className="flex items-center gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-100 group hover:border-indigo-200 transition-colors">
                                                <div className="w-12 h-12 rounded-xl bg-white border border-stone-200 flex flex-col items-center justify-center text-stone-400 group-hover:text-indigo-600 transition-colors">
                                                    <Clock size={18} />
                                                    <span className="text-[10px] font-black uppercase tracking-tighter">{t.start_time.slice(0, 5)}</span>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-black text-stone-800">{t.subjects.name}</p>
                                                    <p className="text-xs text-stone-500 font-medium">{t.employees.name} • {t.room}</p>
                                                </div>
                                                <div className="px-3 py-1 bg-white rounded-lg border border-stone-200 text-[10px] font-black text-stone-600 uppercase tracking-widest">
                                                    Active
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                                            <AlertCircle className="mx-auto text-stone-300 mb-2" size={32} />
                                            <p className="text-xs text-stone-400 font-bold uppercase tracking-widest">No lectures scheduled today</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-8">
                            {/* GPA Stats */}
                            <Card className="bg-indigo-600 text-white border-0 shadow-2xl shadow-indigo-200">
                                <CardContent className="p-8">
                                    <div className="flex justify-between items-start mb-12">
                                        <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center">
                                            <Award size={24} />
                                        </div>
                                        <div className="text-right">
                                            <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest">Status</p>
                                            <div className="px-2 py-1 bg-green-400 text-stone-900 rounded-lg text-[10px] font-black mt-1">EXCELLENT</div>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest">Current CGPA</p>
                                        <h3 className="text-6xl font-black">{gpaData[gpaData.length - 1]?.cgpa || '0.00'}</h3>
                                    </div>
                                    <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center">
                                        <div>
                                            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Credits Earned</p>
                                            <p className="text-lg font-black">{records.length * 4}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Semesters</p>
                                            <p className="text-lg font-black">{Object.keys(groupedRecords).length}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Attendance Pulse */}
                            <Card className="border-stone-100">
                                <CardHeader>
                                    <h3 className="font-black text-stone-800 tracking-tight">Global Attendance</h3>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-6">
                                        <div className="relative w-24 h-24">
                                            <svg className="w-full h-full transform -rotate-90">
                                                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-stone-100" />
                                                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 * (1 - (attendanceStats.reduce((a, b) => a + b.percentage, 0) / attendanceStats.length / 100))} className="text-indigo-600 transition-all duration-1000" strokeLinecap="round" />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-xl font-black text-stone-900">{Math.round(attendanceStats.reduce((a, b) => a + b.percentage, 0) / attendanceStats.length) || 0}%</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <div className="flex justify-between items-center text-xs font-bold text-stone-400 uppercase tracking-widest">
                                                <span>Lectures</span>
                                                <span>Attended</span>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <span className="text-2xl font-black text-stone-900">{attendanceStats.reduce((a, b) => a + b.total, 0)}</span>
                                                <span className="text-lg font-bold text-indigo-600">{attendanceStats.reduce((a, b) => a + b.attended, 0)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1 space-y-8">
                            <Card className="border-stone-100 overflow-hidden">
                                <div className="h-32 bg-indigo-600 relative">
                                    <div className="absolute -bottom-12 left-8 w-24 h-24 rounded-3xl bg-white p-2 shadow-xl shadow-stone-200/50">
                                        <div className="w-full h-full rounded-2xl bg-stone-100 flex items-center justify-center text-indigo-600">
                                            <User size={40} />
                                        </div>
                                    </div>
                                </div>
                                <CardContent className="pt-16 pb-8 px-8">
                                    <h2 className="text-2xl font-black text-stone-900">{profile?.name}</h2>
                                    <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px] mt-1">{profile?.uid}</p>

                                    <div className="mt-8 space-y-4">
                                        <div className="flex items-center gap-3 text-sm font-medium text-stone-600">
                                            <Mail size={16} className="text-stone-300" />
                                            {profile?.email}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm font-medium text-stone-600">
                                            <Phone size={16} className="text-stone-300" />
                                            {profile?.contact_number || '+91 XXXXX XXXXX'}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm font-medium text-stone-600">
                                            <Building size={16} className="text-stone-300" />
                                            {profile?.department}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-stone-100 bg-stone-900 text-white">
                                <CardHeader>
                                    <h3 className="font-black tracking-tight text-white/50 text-[10px] font-bold uppercase tracking-widest">Designated Mentor</h3>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                                            <Shield size={24} />
                                        </div>
                                        <div>
                                            <p className="font-bold">Prof. Rajesh Kumar</p>
                                            <p className="text-xs text-stone-400 font-medium italic">Computer Science Dept.</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-2 space-y-8">
                            <Card className="border-stone-100">
                                <CardHeader>
                                    <h3 className="font-black text-stone-800 tracking-tight">Personal Information</h3>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-1">Date of Birth</p>
                                        <p className="font-bold text-stone-800">{profile?.dob || 'Not Provided'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-1">Blood Group</p>
                                        <p className="font-bold text-red-500">{profile?.blood_group || 'O+'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-1">Admission Year</p>
                                        <p className="font-bold text-stone-800">{profile?.admission_year || profile?.year}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-1">Current Semester</p>
                                        <p className="font-bold text-stone-800">Semester {profile?.current_semester || (profile?.year ? profile.year * 2 - 1 : 1)}</p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-1 text-flex items-center gap-2"><Home size={10} /> Residential Address</p>
                                        <p className="font-bold text-stone-800 leading-relaxed">{profile?.address || '123 Academic Lane, Campus View, IT Nagar, 560001'}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-stone-100">
                                <CardHeader>
                                    <h3 className="font-black text-stone-800 tracking-tight">Academic Qualifications</h3>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-6">
                                        {qualifications.length > 0 ? qualifications.map(q => (
                                            <div key={q.id} className="flex gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-100">
                                                <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-stone-400">
                                                    <History size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-stone-800">{q.degree} • {q.percentage_cgpa}%</p>
                                                    <p className="text-xs text-stone-500 font-medium">{q.institution} • Class of {q.year_of_passing}</p>
                                                </div>
                                            </div>
                                        )) : (
                                            <p className="text-sm text-stone-400 font-medium italic">Background history not yet populated.</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {activeTab === 'results' && (
                    <div className="space-y-8">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-black text-stone-900 tracking-tight">Semester Grade Reports</h2>
                            <Button variant="secondary" size="sm" className="font-bold text-xs rounded-xl" onClick={() => window.print()}>
                                <Printer size={16} className="mr-2" /> Print Full Transcript
                            </Button>
                        </div>

                        {Object.keys(groupedRecords).length > 0 ? (
                            Object.keys(groupedRecords).sort((a, b) => Number(b) - Number(a)).map(sem => {
                                const semGpa = gpaData.find(g => g.semester === `Sem ${sem}`)?.sgpa;
                                return (
                                    <div key={sem} className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm">
                                                    S{sem}
                                                </div>
                                                <h3 className="text-lg font-black text-stone-800">Semester {sem}</h3>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className="px-3 py-1 bg-stone-100 text-stone-500 rounded-lg text-[10px] font-black uppercase tracking-widest">SGPA: {semGpa}</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {groupedRecords[Number(sem)].map(record => (
                                                <Card key={record.record_id} className="border-stone-100 hover:shadow-xl hover:shadow-indigo-100/50 transition-all group overflow-hidden">
                                                    <CardContent className="p-6">
                                                        <div className="flex justify-between items-start mb-6">
                                                            <div className="flex-1">
                                                                <h4 className="font-black text-stone-800 leading-tight group-hover:text-indigo-600 transition-colors uppercase tracking-tight text-sm mb-1">{record.subject}</h4>
                                                                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">4 Credits • External Exam</p>
                                                            </div>
                                                            <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-stone-900 font-black text-sm border border-stone-100">
                                                                {record.grade}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex-1 h-1.5 bg-stone-100 rounded-full mr-4">
                                                                <div className="h-full bg-indigo-600 rounded-full opacity-60" style={{ width: `${record.marks}%` }} />
                                                            </div>
                                                            <span className="text-lg font-black text-stone-900">{record.marks}</span>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-stone-200">
                                <FileText className="mx-auto text-stone-200 mb-4" size={64} />
                                <h3 className="text-xl font-black text-stone-800">Registry is Empty</h3>
                                <p className="text-stone-400 mt-2 font-medium">Final semester results have not been published yet.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {attendanceStats.map(stat => (
                                <Card key={stat.code} className="border-stone-100">
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest truncate max-w-[120px]">{stat.subject}</p>
                                            <span className={`text-[10px] font-black ${stat.percentage >= 75 ? 'text-green-500' : 'text-red-500'}`}>
                                                {stat.percentage >= 75 ? 'SAFE' : 'LOW'}
                                            </span>
                                        </div>
                                        <h3 className="text-3xl font-black text-stone-900">{stat.percentage}%</h3>
                                        <div className="mt-4 flex items-center justify-between text-xs font-bold">
                                            <span className="text-stone-400">{stat.attended} Attended</span>
                                            <span className="text-stone-300">/ {stat.total}</span>
                                        </div>
                                        <div className="mt-2 h-1 bg-stone-100 rounded-full overflow-hidden">
                                            <div className="h-full transition-all duration-700 bg-indigo-600" style={{ width: `${stat.percentage}%` }} />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <Card className="border-stone-100 overflow-hidden">
                            <CardHeader className="bg-stone-50 border-b border-stone-100">
                                <h3 className="font-black text-stone-800 tracking-tight">Analytical Attendance Tracker</h3>
                            </CardHeader>
                            <CardContent className="h-[400px] w-full pt-8">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={attendanceStats} layout="vertical" margin={{ top: 0, right: 30, left: 100, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                        <XAxis type="number" domain={[0, 100]} hide />
                                        <YAxis
                                            dataKey="subject"
                                            type="category"
                                            axisLine={false}
                                            tickLine={false}
                                            width={100}
                                            tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 800 }}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#f8fafc' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Bar dataKey="percentage" radius={[0, 4, 4, 0]} barSize={20}>
                                            {attendanceStats.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.percentage < 75 ? '#f43f5e' : '#4f46e5'} opacity={0.8} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'assessments' && (
                    <Card className="border-stone-100 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-stone-50 text-stone-400 text-[10px] font-black uppercase tracking-widest border-b border-stone-100">
                                    <tr>
                                        <th className="px-6 py-5">Subject Component</th>
                                        <th className="px-6 py-5">Assessment Type</th>
                                        <th className="px-6 py-5">Obtained</th>
                                        <th className="px-6 py-5">Max Marks</th>
                                        <th className="px-6 py-5">Efficiency</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {assessments.length > 0 ? assessments.map(as => {
                                        const perc = (as.marks_obtained / as.max_marks) * 100;
                                        return (
                                            <tr key={as.id} className="hover:bg-stone-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="font-black text-stone-800 text-sm tracking-tight">{as.subjects.name}</p>
                                                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{as.subject_code}</p>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-black text-indigo-600 uppercase tracking-widest">
                                                    {as.assessment_type}
                                                </td>
                                                <td className="px-6 py-4 text-lg font-black text-stone-900">{as.marks_obtained}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-stone-400">{as.max_marks}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-12 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                                            <div className={`h-full ${perc >= 80 ? 'bg-green-500' : perc >= 40 ? 'bg-indigo-500' : 'bg-red-500'}`} style={{ width: `${perc}%` }} />
                                                        </div>
                                                        <span className="text-[10px] font-black text-stone-600">{Math.round(perc)}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-20 text-center">
                                                <AlertCircle className="mx-auto text-stone-200 mb-2" size={48} />
                                                <p className="text-stone-400 font-bold uppercase tracking-widest text-xs">No internal marks recorded yet</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {activeTab === 'timetable' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                                const dayLectures = timetable.filter(t => t.day === day);
                                return (
                                    <div key={day} className={`space-y-4 ${day === currentDay ? 'opacity-100' : 'opacity-60 hover:opacity-100 transition-opacity'}`}>
                                        <div className="flex items-center justify-between pb-2 border-b-2 border-stone-100">
                                            <h4 className={`text-xs font-black uppercase tracking-widest ${day === currentDay ? 'text-indigo-600' : 'text-stone-400'}`}>
                                                {day.slice(0, 3)}
                                            </h4>
                                            {day === currentDay && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />}
                                        </div>
                                        <div className="space-y-3">
                                            {dayLectures.length > 0 ? dayLectures.map(l => (
                                                <div key={l.id} className="p-3 rounded-xl bg-white border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
                                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter truncate">{l.subjects.name}</p>
                                                    <div className="mt-2 space-y-1">
                                                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-stone-400">
                                                            <Clock size={10} /> {l.start_time.slice(0, 5)} - {l.end_time.slice(0, 5)}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-stone-400">
                                                            <MapPin size={10} /> {l.room}
                                                        </div>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="p-3 rounded-xl border border-dashed border-stone-200 text-center">
                                                    <span className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">Free</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
