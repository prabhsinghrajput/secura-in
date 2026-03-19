'use client';

import React, { useEffect, useState, useMemo, useRef, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    getStudentDashboardAction,
    getStudentProfileAction,
    updateStudentProfileAction,
    getAttendanceAction,
    getInternalAssessmentsAction,
    getStudentMarksAction,
    getStudentResultsPublishedAction,
    getStudentLabMarksAction,
    getStudentAssignmentsAction,
    submitStudentAssignmentAction,
    getTimetableAction,
    getStudentNotificationsAction,
    markNotificationReadAction,
    markAllNotificationsReadAction,
    getQualificationsAction,
} from '@/lib/actions';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
    GraduationCap, Award, Calendar, User, Mail, Building,
    CheckCircle2, AlertCircle, Clock, MapPin, BookOpen,
    Phone, Home, Shield, FileText, Download, Bell,
    Search, RefreshCw, ChevronRight, BarChart2,
    ClipboardList, Activity, Eye, Send, X, BellRing,
    Printer, AlertTriangle
} from 'lucide-react';

type TabType = 'overview' | 'profile' | 'attendance' | 'marks' | 'results' | 'assignments' | 'timetable' | 'notifications';

export default function StudentDashboard() {
    return (
        <Suspense fallback={
            <DashboardLayout>
                <div className="flex h-[50vh] items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            </DashboardLayout>
        }>
            <StudentDashboardContent />
        </Suspense>
    );
}

function StudentDashboardContent() {
    const { data: session } = useSession();
    const user = session?.user as any;
    const router = useRouter();
    const searchParams = useSearchParams();

    const activeTab = (searchParams.get('tab') as TabType) || 'overview';
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

    // Dashboard
    const [dashboard, setDashboard] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);

    // Attendance
    const [attendance, setAttendance] = useState<any[]>([]);
    const [attDateFilter, setAttDateFilter] = useState('');

    // Marks
    const [modularMarks, setModularMarks] = useState<any[]>([]);
    const [assessments, setAssessments] = useState<any[]>([]);
    const [labMarks, setLabMarks] = useState<any[]>([]);

    // Results
    const [publishedResults, setPublishedResults] = useState<any[]>([]);

    // Assignments
    const [assignments, setAssignments] = useState<any[]>([]);
    const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
    const [submitComments, setSubmitComments] = useState('');

    // Timetable
    const [timetable, setTimetable] = useState<any[]>([]);

    // Notifications
    const [notifications, setNotifications] = useState<any[]>([]);

    // Profile editing
    const [editMode, setEditMode] = useState(false);
    const [editPhone, setEditPhone] = useState('');
    const [editAddress, setEditAddress] = useState('');

    // Qualifications
    const [qualifications, setQualifications] = useState<any[]>([]);

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
            const [dash, att, assess, tt, notifs, quals] = await Promise.all([
                getStudentDashboardAction(),
                getAttendanceAction(user.uid_eid),
                getInternalAssessmentsAction(user.uid_eid),
                getTimetableAction('student', user.uid_eid),
                getStudentNotificationsAction(),
                getQualificationsAction(user.uid_eid),
            ]);
            setDashboard(dash);
            setProfile(dash.profile);
            setAttendance(att || []);
            setAssessments(assess || []);
            setTimetable(tt || []);
            setNotifications(notifs || []);
            setQualifications(quals || []);
        } catch (err: any) {
            flash('err', err.message);
        }
        setLoading(false);
    };

    const loadMarks = async () => {
        setLoading(true);
        try {
            const [marks, lab] = await Promise.all([
                getStudentMarksAction(user.uid_eid),
                getStudentLabMarksAction(),
            ]);
            setModularMarks(marks || []);
            setLabMarks(lab || []);
        } catch (err: any) {
            flash('err', err.message);
        }
        setLoading(false);
    };

    const loadResults = async () => {
        setLoading(true);
        try {
            const data = await getStudentResultsPublishedAction();
            setPublishedResults(data || []);
        } catch (err: any) {
            flash('err', err.message);
        }
        setLoading(false);
    };

    const loadAssignments = async () => {
        setLoading(true);
        try {
            const data = await getStudentAssignmentsAction();
            setAssignments(data || []);
        } catch (err: any) {
            flash('err', err.message);
        }
        setLoading(false);
    };

    const handleSubmitAssignment = async (assignmentId: string) => {
        setLoading(true);
        try {
            await submitStudentAssignmentAction(assignmentId, submitComments);
            flash('ok', 'Assignment submitted.');
            setSelectedAssignment(null);
            setSubmitComments('');
            loadAssignments();
        } catch (err: any) {
            flash('err', err.message);
        }
        setLoading(false);
    };

    const handleUpdateProfile = async () => {
        setLoading(true);
        try {
            await updateStudentProfileAction(user.uid_eid, {
                contact_number: editPhone || profile?.contact_number,
                address: editAddress || profile?.address,
            });
            flash('ok', 'Profile updated successfully.');
            setEditMode(false);
            loadDashboard();
        } catch (err: any) {
            flash('err', err.message);
        }
        setLoading(false);
    };

    const handleMarkRead = async (id: string) => {
        try {
            await markNotificationReadAction(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (err: any) {
            flash('err', err.message);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllNotificationsReadAction();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            flash('ok', 'All notifications marked as read.');
        } catch (err: any) {
            flash('err', err.message);
        }
    };

    // Computed
    const attendanceStats = useMemo(() => {
        const stats: Record<string, { total: number; present: number; name: string }> = {};
        attendance.forEach(entry => {
            const code = entry.subjects?.subject_code || entry.subject_id;
            if (!stats[code]) stats[code] = { total: 0, present: 0, name: entry.subjects?.name || 'Unknown' };
            stats[code].total++;
            if (entry.status === 'Present' || entry.status === 'Late') stats[code].present++;
        });
        return Object.entries(stats).map(([code, data]) => ({
            subject: data.name,
            code,
            percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
            attended: data.present,
            total: data.total,
        }));
    }, [attendance]);

    const overallAttendance = useMemo(() => {
        if (attendanceStats.length === 0) return 0;
        return Math.round(attendanceStats.reduce((a, b) => a + b.percentage, 0) / attendanceStats.length);
    }, [attendanceStats]);

    const lowAttendanceSubjects = useMemo(() => attendanceStats.filter(s => s.percentage < 75), [attendanceStats]);

    const filteredAttendance = useMemo(() => {
        if (!attDateFilter) return attendance.slice(0, 100);
        return attendance.filter(a => a.date === attDateFilter);
    }, [attendance, attDateFilter]);

    const gpaData = useMemo(() => {
        const gradePoints: Record<string, number> = { 'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'P': 4, 'F': 0 };
        const semGroups: Record<number, { points: number; credits: number }> = {};

        publishedResults.forEach((r: any) => {
            const semNum = r.semesters?.semester_number || 0;
            if (!semGroups[semNum]) semGroups[semNum] = { points: 0, credits: 0 };
            (r.marks || []).forEach((m: any) => {
                const credit = m.subjects?.credits || 0;
                const gp = gradePoints[m.grade] ?? 0;
                semGroups[semNum].points += gp * credit;
                semGroups[semNum].credits += credit;
            });
        });

        const sortedSems = Object.keys(semGroups).map(Number).sort();
        let cumPoints = 0, cumCredits = 0;
        return sortedSems.map(sem => {
            const sg = semGroups[sem];
            const sgpa = sg.credits > 0 ? sg.points / sg.credits : 0;
            cumPoints += sg.points;
            cumCredits += sg.credits;
            return {
                semester: sem,
                sgpa: Number(sgpa.toFixed(2)),
                cgpa: Number((cumCredits > 0 ? cumPoints / cumCredits : 0).toFixed(2)),
            };
        });
    }, [publishedResults]);

    const currentCgpa = gpaData.length > 0 ? gpaData[gpaData.length - 1].cgpa : 0;

    const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);

    const currentDay = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());

    const exportCSV = (rows: any[], filename: string) => {
        if (rows.length === 0) return;
        const keys = Object.keys(rows[0]);
        const csv = [keys.join(','), ...rows.map(r => keys.map(k => `"${r[k] ?? ''}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    };

    const notifIcon: Record<string, any> = {
        attendance: CheckCircle2, marks: BarChart2, result: Award, assignment: FileText, general: Bell,
    };

    const statusColors: Record<string, string> = {
        Pending: 'bg-amber-50 text-amber-600',
        Submitted: 'bg-blue-50 text-blue-600',
        Evaluated: 'bg-emerald-50 text-emerald-600',
        Overdue: 'bg-red-50 text-red-600',
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
                    <div className="absolute top-0 right-0 p-12 text-indigo-500/5 pointer-events-none">
                        <GraduationCap size={320} />
                    </div>
                    <div className="relative z-10 space-y-2">
                        <h1 className="text-5xl font-black text-stone-900 tracking-tight leading-none">Student Portal</h1>
                        <p className="text-indigo-600 font-extrabold uppercase tracking-[0.2em] text-xs">
                            {profile?.name || 'Student'} • {profile?.courses?.code || 'Academic Access'} • {user?.uid_eid || 'STU'}
                        </p>
                    </div>
                </div>

                {loading && (
                    <div className="flex justify-center py-20">
                        <RefreshCw className="animate-spin text-indigo-400" size={32} />
                    </div>
                )}

                {/* ======== OVERVIEW ======== */}
                {!loading && activeTab === 'overview' && (
                    <div className="space-y-10 animate-in fade-in duration-500">
                        {/* Stats Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
                            {[
                                { label: 'Course', value: profile?.courses?.name || '—', icon: BookOpen, color: 'indigo' },
                                { label: 'Semester', value: profile?.semesters?.semester_number ? `Sem ${profile.semesters.semester_number}` : '—', icon: Calendar, color: 'blue' },
                                { label: 'Attendance', value: `${dashboard?.attendancePercentage ?? 0}%`, icon: CheckCircle2, color: dashboard?.attendancePercentage >= 75 ? 'emerald' : 'red' },
                                { label: 'Pending Tasks', value: dashboard?.pendingAssignments ?? 0, icon: ClipboardList, color: 'amber' },
                                { label: 'Latest SGPA', value: dashboard?.latestResult?.sgpa?.toFixed(2) || '—', icon: Award, color: 'violet' },
                            ].map((stat, i) => (
                                <Card key={i} className="border-stone-100 p-8 rounded-[3rem] shadow-sm group hover:shadow-xl transition-all">
                                    <div className="flex justify-between items-start">
                                        <div className={`w-11 h-11 bg-${stat.color}-50 rounded-2xl flex items-center justify-center text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
                                            <stat.icon size={20} />
                                        </div>
                                    </div>
                                    <div className="mt-6">
                                        <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-1">{stat.label}</p>
                                        <h4 className="text-2xl font-black text-stone-800">{stat.value}</h4>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {/* Attendance Alerts */}
                        {lowAttendanceSubjects.length > 0 && (
                            <Card className="p-8 rounded-[3rem] border-red-100 bg-red-50/30 shadow-sm space-y-4">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="text-red-500" size={20} />
                                    <h3 className="font-black text-red-700">Attendance Warning</h3>
                                </div>
                                <div className="space-y-2">
                                    {lowAttendanceSubjects.map((s, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-red-100">
                                            <span className="font-black text-stone-800 text-sm">{s.subject}</span>
                                            <span className="px-3 py-1 rounded-lg text-[10px] font-black bg-red-100 text-red-600">{s.percentage}% — Below 75%</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                            {/* Quick Actions */}
                            <Card className="p-10 rounded-[4rem] border-stone-100 shadow-sm space-y-6">
                                <h3 className="text-2xl font-black text-stone-800 tracking-tight">Quick Actions</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: 'View Attendance', tab: 'attendance' as TabType, icon: CheckCircle2, color: 'bg-indigo-600' },
                                        { label: 'View Marks', tab: 'marks' as TabType, icon: BarChart2, color: 'bg-violet-600' },
                                        { label: 'View Results', tab: 'results' as TabType, icon: Award, color: 'bg-emerald-600' },
                                        { label: 'Assignments', tab: 'assignments' as TabType, icon: ClipboardList, color: 'bg-amber-600' },
                                        { label: 'Timetable', tab: 'timetable' as TabType, icon: Calendar, color: 'bg-blue-600' },
                                        { label: 'Notifications', tab: 'notifications' as TabType, icon: BellRing, color: 'bg-rose-600' },
                                    ].map((btn, i) => (
                                        <button key={i} onClick={() => {
                                            router.push(`/dashboard/student?tab=${btn.tab}`);
                                            if (btn.tab === 'marks') loadMarks();
                                            if (btn.tab === 'results') loadResults();
                                            if (btn.tab === 'assignments') loadAssignments();
                                        }}
                                            className={`${btn.color} text-white p-5 rounded-3xl flex items-center gap-3 font-black text-sm hover:opacity-90 transition-all shadow-lg`}>
                                            <btn.icon size={18} /> {btn.label}
                                        </button>
                                    ))}
                                </div>
                            </Card>

                            {/* Today's Schedule */}
                            <Card className="p-10 rounded-[4rem] border-stone-100 shadow-sm space-y-6">
                                <h3 className="text-2xl font-black text-stone-800 tracking-tight">Today&apos;s Lectures</h3>
                                <div className="space-y-3">
                                    {timetable.filter(t => t.day === currentDay).length > 0 ? (
                                        timetable.filter(t => t.day === currentDay).map((t: any) => (
                                            <div key={t.id} className="flex items-center justify-between p-5 bg-stone-50 rounded-2xl border border-stone-100 group hover:bg-white hover:shadow-lg transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex flex-col items-center justify-center text-indigo-600 shadow-sm">
                                                        <Clock size={14} />
                                                        <span className="text-[8px] font-black">{t.start_time?.slice(0, 5)}</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-stone-800 text-sm">{t.subjects?.name || 'Unknown'}</p>
                                                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                                                            {t.employees?.name || 'Faculty TBD'} • Room {t.room}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-black text-stone-300 uppercase">{t.start_time?.slice(0, 5)}-{t.end_time?.slice(0, 5)}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-10 text-stone-300 font-bold text-sm">No lectures scheduled today</div>
                                    )}
                                </div>
                            </Card>
                        </div>

                        {/* GPA Overview */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            <Card className="bg-indigo-600 text-white border-0 shadow-2xl shadow-indigo-200 p-10 rounded-[4rem]">
                                <div className="flex justify-between items-start mb-10">
                                    <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center">
                                        <Award size={24} />
                                    </div>
                                    <span className="px-3 py-1 bg-white/20 rounded-lg text-[10px] font-black uppercase">Cumulative</span>
                                </div>
                                <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest">Current CGPA</p>
                                <h3 className="text-6xl font-black mt-2">{currentCgpa || '—'}</h3>
                                <div className="mt-8 pt-6 border-t border-white/10 flex justify-between">
                                    <div>
                                        <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Semesters</p>
                                        <p className="text-lg font-black">{gpaData.length || 0}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Attendance</p>
                                        <p className="text-lg font-black">{overallAttendance}%</p>
                                    </div>
                                </div>
                            </Card>
                            {gpaData.length > 0 && (
                                <Card className="xl:col-span-2 p-10 rounded-[4rem] border-stone-100 shadow-sm">
                                    <h3 className="text-lg font-black text-stone-800 tracking-tight mb-6">Semester Progress</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {gpaData.map((g, i) => (
                                            <div key={i} className="p-5 bg-stone-50 rounded-2xl text-center border border-stone-100">
                                                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Sem {g.semester}</p>
                                                <p className="text-2xl font-black text-indigo-600 mt-2">{g.sgpa}</p>
                                                <p className="text-[10px] font-bold text-stone-400 mt-1">CGPA: {g.cgpa}</p>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}
                        </div>
                    </div>
                )}

                {/* ======== PROFILE ======== */}
                {!loading && activeTab === 'profile' && (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Profile Card */}
                        <div className="space-y-8">
                            <Card className="border-stone-100 overflow-hidden rounded-[3rem] shadow-sm">
                                <div className="h-32 bg-indigo-600 relative">
                                    <div className="absolute -bottom-12 left-8 w-24 h-24 rounded-3xl bg-white p-2 shadow-xl shadow-stone-200/50">
                                        <div className="w-full h-full rounded-2xl bg-stone-100 flex items-center justify-center text-indigo-600">
                                            <User size={40} />
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-16 pb-8 px-8">
                                    <h2 className="text-2xl font-black text-stone-900">{profile?.name}</h2>
                                    <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px] mt-1">{profile?.uid}</p>
                                    <div className="mt-8 space-y-4">
                                        <div className="flex items-center gap-3 text-sm font-medium text-stone-600">
                                            <Mail size={16} className="text-stone-300" /> {profile?.email}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm font-medium text-stone-600">
                                            <Phone size={16} className="text-stone-300" /> {profile?.contact_number || 'Not provided'}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm font-medium text-stone-600">
                                            <Building size={16} className="text-stone-300" /> {profile?.departments?.name}
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <Card className="border-stone-100 bg-stone-900 text-white p-8 rounded-[3rem]">
                                <p className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-4">Academic Info</p>
                                <div className="space-y-3">
                                    {[
                                        { label: 'Course', value: profile?.courses?.name },
                                        { label: 'Semester', value: profile?.semesters?.semester_number ? `Semester ${profile.semesters.semester_number}` : 'N/A' },
                                        { label: 'Section', value: profile?.section || 'Not assigned' },
                                        { label: 'Roll Number', value: profile?.roll_number || 'N/A' },
                                        { label: 'Enrollment No.', value: profile?.enrollment_number || 'N/A' },
                                        { label: 'Admission Year', value: profile?.admission_year || 'N/A' },
                                    ].map((item, i) => (
                                        <div key={i} className="flex justify-between items-center py-2 border-b border-white/5">
                                            <span className="text-white/40 text-xs font-bold">{item.label}</span>
                                            <span className="text-white font-black text-sm">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>

                        {/* Details + Edit */}
                        <div className="xl:col-span-2 space-y-8">
                            <Card className="p-10 rounded-[3rem] border-stone-100 shadow-sm">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-2xl font-black text-stone-800 tracking-tight">Personal Information</h3>
                                    <Button className="h-10 px-6 rounded-xl bg-indigo-600 text-white font-black text-xs" onClick={() => {
                                        setEditMode(!editMode);
                                        setEditPhone(profile?.contact_number || '');
                                        setEditAddress(profile?.address || '');
                                    }}>
                                        {editMode ? 'Cancel' : 'Edit Details'}
                                    </Button>
                                </div>

                                {editMode ? (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Phone Number</label>
                                                <input className="w-full h-14 px-5 rounded-2xl bg-stone-50 border-0 font-bold outline-none focus:ring-4 focus:ring-indigo-50"
                                                    value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Phone number" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Address</label>
                                                <input className="w-full h-14 px-5 rounded-2xl bg-stone-50 border-0 font-bold outline-none focus:ring-4 focus:ring-indigo-50"
                                                    value={editAddress} onChange={e => setEditAddress(e.target.value)} placeholder="Address" />
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-stone-400 font-bold">Only Phone Number and Address can be updated. For other changes, contact Academic Admin.</p>
                                        <Button className="h-12 px-8 rounded-xl bg-indigo-600 text-white font-black" onClick={handleUpdateProfile}>
                                            Save Changes
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {[
                                            { label: 'Date of Birth', value: profile?.dob || 'Not provided' },
                                            { label: 'Gender', value: profile?.gender || 'Not provided' },
                                            { label: 'Blood Group', value: profile?.blood_group || 'Not provided' },
                                            { label: 'Category', value: profile?.category || 'Not provided' },
                                            { label: 'Guardian Name', value: profile?.guardian_name || 'Not provided' },
                                            { label: 'Guardian Contact', value: profile?.guardian_contact || 'Not provided' },
                                        ].map((item, i) => (
                                            <div key={i}>
                                                <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-1">{item.label}</p>
                                                <p className="font-bold text-stone-800">{item.value}</p>
                                            </div>
                                        ))}
                                        <div className="md:col-span-2">
                                            <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-1">Address</p>
                                            <p className="font-bold text-stone-800">{profile?.address || 'Not provided'}</p>
                                        </div>
                                    </div>
                                )}
                            </Card>

                            {/* Qualifications */}
                            <Card className="p-10 rounded-[3rem] border-stone-100 shadow-sm space-y-6">
                                <h3 className="text-2xl font-black text-stone-800 tracking-tight">Academic Qualifications</h3>
                                {qualifications.length > 0 ? qualifications.map((q: any) => (
                                    <div key={q.id} className="flex items-center gap-4 p-5 bg-stone-50 rounded-2xl border border-stone-100">
                                        <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-indigo-600">
                                            <GraduationCap size={18} />
                                        </div>
                                        <div>
                                            <p className="font-black text-stone-800 text-sm">{q.degree} — {q.percentage_cgpa}%</p>
                                            <p className="text-xs text-stone-500 font-medium">{q.institution} • Class of {q.year_of_passing}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-stone-400 font-bold text-sm text-center py-8">No qualifications recorded.</p>
                                )}
                            </Card>
                        </div>
                    </div>
                )}

                {/* ======== ATTENDANCE ======== */}
                {!loading && activeTab === 'attendance' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Subject-wise Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                            {attendanceStats.map((stat, i) => (
                                <Card key={i} className="border-stone-100 p-8 rounded-[2.5rem] shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest truncate max-w-[140px]">{stat.subject}</p>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${stat.percentage >= 75 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                            {stat.percentage >= 75 ? 'SAFE' : 'LOW'}
                                        </span>
                                    </div>
                                    <h3 className="text-3xl font-black text-stone-900">{stat.percentage}%</h3>
                                    <div className="mt-4 flex items-center justify-between text-xs font-bold">
                                        <span className="text-stone-400">{stat.attended} Present</span>
                                        <span className="text-stone-300">/ {stat.total}</span>
                                    </div>
                                    <div className="mt-2 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-700 ${stat.percentage >= 75 ? 'bg-indigo-600' : 'bg-red-500'}`} style={{ width: `${stat.percentage}%` }} />
                                    </div>
                                </Card>
                            ))}
                            {attendanceStats.length === 0 && <div className="col-span-full text-center py-16 text-stone-300 font-black">No attendance data available.</div>}
                        </div>

                        {/* Overall */}
                        <Card className="p-8 rounded-[3rem] border-stone-100 shadow-sm flex items-center gap-8">
                            <div className="relative w-24 h-24 flex-shrink-0">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-stone-100" />
                                    <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent"
                                        strokeDasharray={251.2} strokeDashoffset={251.2 * (1 - overallAttendance / 100)}
                                        className={`${overallAttendance >= 75 ? 'text-indigo-600' : 'text-red-500'} transition-all duration-1000`} strokeLinecap="round" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xl font-black text-stone-900">{overallAttendance}%</span>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-stone-800">Overall Attendance</h3>
                                <p className="text-stone-400 text-sm font-bold mt-1">
                                    {dashboard?.presentClasses || 0} present out of {dashboard?.totalClasses || 0} total classes
                                </p>
                                {overallAttendance < 75 && <p className="text-red-500 text-xs font-black mt-2 uppercase tracking-widest">⚠ Below minimum 75% requirement</p>}
                            </div>
                        </Card>

                        {/* Attendance History */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 px-4">
                                <h3 className="text-lg font-black text-stone-800">Attendance History</h3>
                                <input type="date" className="h-10 px-4 rounded-xl bg-white border border-stone-100 text-sm font-bold outline-none"
                                    value={attDateFilter} onChange={e => setAttDateFilter(e.target.value)} />
                                {attDateFilter && <button onClick={() => setAttDateFilter('')} className="text-indigo-600 font-bold text-xs uppercase hover:underline">Clear</button>}
                                <button onClick={() => exportCSV(filteredAttendance.map(a => ({
                                    Date: a.date, Subject: a.subjects?.name || '', Status: a.status
                                })), 'attendance-history.csv')} className="ml-auto px-5 py-2 rounded-xl text-[10px] font-black uppercase bg-stone-100 text-stone-600 hover:bg-stone-200 flex items-center gap-2">
                                    <Download size={14} /> CSV
                                </button>
                            </div>
                            <Card className="border-stone-100 overflow-hidden rounded-[2.5rem] shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                            <tr>
                                                <th className="px-8 py-5">Date</th>
                                                <th className="px-8 py-5">Subject</th>
                                                <th className="px-8 py-5">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-stone-50">
                                            {filteredAttendance.map((a: any) => (
                                                <tr key={a.id} className="hover:bg-stone-50/50">
                                                    <td className="px-8 py-4 text-sm font-bold text-stone-600">{a.date}</td>
                                                    <td className="px-8 py-4 font-black text-stone-800 text-sm">{a.subjects?.name || 'Unknown'}</td>
                                                    <td className="px-8 py-4">
                                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${a.status === 'Present' ? 'bg-emerald-50 text-emerald-600' : a.status === 'Absent' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                                                            {a.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredAttendance.length === 0 && <tr><td colSpan={3} className="text-center py-16 text-stone-300 font-black">No records found.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {/* ======== MARKS ======== */}
                {!loading && activeTab === 'marks' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Internal Assessment Marks */}
                        <div className="space-y-4">
                            <h3 className="text-2xl font-black text-stone-900 tracking-tight px-4">Internal Assessment Marks</h3>
                            <Card className="border-stone-100 overflow-hidden rounded-[2.5rem] shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                            <tr>
                                                <th className="px-8 py-5">Subject</th>
                                                <th className="px-8 py-5">Type</th>
                                                <th className="px-8 py-5 text-center">Obtained</th>
                                                <th className="px-8 py-5 text-center">Max</th>
                                                <th className="px-8 py-5 text-center">%</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-stone-50">
                                            {assessments.length > 0 ? assessments.map((a: any) => {
                                                const pct = a.max_marks > 0 ? Math.round((a.marks_obtained / a.max_marks) * 100) : 0;
                                                return (
                                                    <tr key={a.id} className="hover:bg-stone-50/50">
                                                        <td className="px-8 py-5">
                                                            <p className="font-black text-stone-800 text-sm">{a.subjects?.name || 'Unknown'}</p>
                                                            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{a.subject_code}</p>
                                                        </td>
                                                        <td className="px-8 py-5 text-xs font-black text-indigo-600 uppercase tracking-widest">{a.assessment_type}</td>
                                                        <td className="px-8 py-5 text-center text-lg font-black text-stone-900">{a.marks_obtained}</td>
                                                        <td className="px-8 py-5 text-center text-sm font-bold text-stone-400">{a.max_marks}</td>
                                                        <td className="px-8 py-5 text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <div className="w-12 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                                                    <div className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-indigo-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                                                                </div>
                                                                <span className="text-[10px] font-black text-stone-600">{pct}%</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            }) : (
                                                <tr><td colSpan={5} className="text-center py-16 text-stone-300 font-black">No internal marks available yet.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>

                        {/* Approved Semester Marks */}
                        <div className="space-y-4">
                            <h3 className="text-2xl font-black text-stone-900 tracking-tight px-4">Semester Marks (Approved)</h3>
                            <Card className="border-stone-100 overflow-hidden rounded-[2.5rem] shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                            <tr>
                                                <th className="px-8 py-5">Subject</th>
                                                <th className="px-8 py-5 text-center">Internal</th>
                                                <th className="px-8 py-5 text-center">Mid-term</th>
                                                <th className="px-8 py-5 text-center">Practical</th>
                                                <th className="px-8 py-5 text-center">External</th>
                                                <th className="px-8 py-5 text-center">Total</th>
                                                <th className="px-8 py-5 text-center">Grade</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-stone-50">
                                            {modularMarks.length > 0 ? modularMarks.map((m: any) => (
                                                <tr key={m.id} className="hover:bg-stone-50/50">
                                                    <td className="px-8 py-5">
                                                        <p className="font-black text-stone-800 text-sm">{m.subjects?.name || 'Unknown'}</p>
                                                        <p className="text-[10px] text-stone-400 font-bold uppercase">Sem {m.semesters?.semester_number}</p>
                                                    </td>
                                                    <td className="px-8 py-5 text-center font-bold text-stone-700">{m.internal_marks || 0}</td>
                                                    <td className="px-8 py-5 text-center font-bold text-stone-700">{m.mid_term_marks || 0}</td>
                                                    <td className="px-8 py-5 text-center font-bold text-stone-700">{m.practical_marks || 0}</td>
                                                    <td className="px-8 py-5 text-center font-bold text-stone-700">{m.external_marks || 0}</td>
                                                    <td className="px-8 py-5 text-center font-black text-stone-900 text-lg">{m.total_marks || 0}</td>
                                                    <td className="px-8 py-5 text-center">
                                                        <span className={`w-10 h-10 inline-flex items-center justify-center rounded-xl font-black text-sm ${m.grade === 'F' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                            {m.grade || '—'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan={7} className="text-center py-16 text-stone-300 font-black">No approved marks yet.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>

                        {/* Lab Marks */}
                        {labMarks.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-2xl font-black text-stone-900 tracking-tight px-4">Lab / Practical Marks</h3>
                                <Card className="border-stone-100 overflow-hidden rounded-[2.5rem] shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                                <tr>
                                                    <th className="px-8 py-5">Subject</th>
                                                    <th className="px-8 py-5 text-center">Experiment</th>
                                                    <th className="px-8 py-5 text-center">Practical</th>
                                                    <th className="px-8 py-5 text-center">Viva</th>
                                                    <th className="px-8 py-5 text-center">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-50">
                                                {labMarks.map((m: any) => (
                                                    <tr key={m.id} className="hover:bg-stone-50/50">
                                                        <td className="px-8 py-5">
                                                            <p className="font-black text-stone-800 text-sm">{m.subjects?.name}</p>
                                                            <p className="text-[10px] text-stone-400 font-bold uppercase">Sem {m.semesters?.semester_number}</p>
                                                        </td>
                                                        <td className="px-8 py-5 text-center font-bold text-stone-700">{m.experiment_marks}</td>
                                                        <td className="px-8 py-5 text-center font-bold text-stone-700">{m.practical_marks}</td>
                                                        <td className="px-8 py-5 text-center font-bold text-stone-700">{m.viva_marks}</td>
                                                        <td className="px-8 py-5 text-center font-black text-stone-900 text-lg">{m.total_marks}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </div>
                        )}
                    </div>
                )}

                {/* ======== RESULTS ======== */}
                {!loading && activeTab === 'results' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center px-4">
                            <h2 className="text-2xl font-black text-stone-900 tracking-tight">Semester Results</h2>
                            <Button className="h-12 px-8 rounded-xl bg-stone-900 text-white font-black shadow-xl shadow-stone-200" onClick={() => window.print()}>
                                <Printer size={16} className="mr-2" /> Print Transcript
                            </Button>
                        </div>

                        {/* SGPA/CGPA Summary */}
                        {gpaData.length > 0 && (
                            <Card className="p-8 rounded-[3rem] border-stone-100 shadow-sm">
                                <div className="flex flex-wrap gap-6">
                                    {gpaData.map((g, i) => (
                                        <div key={i} className="flex-1 min-w-[120px] p-5 bg-stone-50 rounded-2xl text-center border border-stone-100">
                                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Sem {g.semester}</p>
                                            <p className="text-2xl font-black text-indigo-600 mt-2">{g.sgpa}</p>
                                            <p className="text-[10px] font-bold text-stone-400 mt-1">CGPA: {g.cgpa}</p>
                                        </div>
                                    ))}
                                    <div className="flex-1 min-w-[120px] p-5 bg-indigo-600 rounded-2xl text-center text-white">
                                        <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">Cumulative</p>
                                        <p className="text-2xl font-black mt-2">{currentCgpa}</p>
                                        <p className="text-[10px] font-bold text-indigo-200 mt-1">CGPA</p>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* Semester-wise results */}
                        {publishedResults.length > 0 ? publishedResults.map((r: any, ri: number) => {
                            const semGpa = gpaData.find(g => g.semester === r.semesters?.semester_number);
                            return (
                                <div key={ri} className="space-y-4">
                                    <div className="flex items-center justify-between px-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm">
                                                S{r.semesters?.semester_number}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-stone-800">Semester {r.semesters?.semester_number}</h3>
                                                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                                                    {r.result_status} • SGPA: {r.sgpa?.toFixed(2)} • Credits: {r.earned_credits}/{r.total_credits}
                                                </p>
                                            </div>
                                        </div>
                                        <button onClick={() => exportCSV((r.marks || []).map((m: any) => ({
                                            Subject: m.subjects?.name, Code: m.subjects?.subject_code, Internal: m.internal_marks, External: m.external_marks, Total: m.total_marks, Grade: m.grade
                                        })), `result-sem-${r.semesters?.semester_number}.csv`)} className="px-5 py-2 rounded-xl text-[10px] font-black uppercase bg-stone-100 text-stone-600 hover:bg-stone-200 flex items-center gap-2">
                                            <Download size={14} /> CSV
                                        </button>
                                    </div>
                                    <Card className="border-stone-100 overflow-hidden rounded-[2.5rem] shadow-sm">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead className="bg-stone-50 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                                    <tr>
                                                        <th className="px-8 py-5">Subject</th>
                                                        <th className="px-8 py-5 text-center">Credits</th>
                                                        <th className="px-8 py-5 text-center">Internal</th>
                                                        <th className="px-8 py-5 text-center">External</th>
                                                        <th className="px-8 py-5 text-center">Total</th>
                                                        <th className="px-8 py-5 text-center">Grade</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-stone-50">
                                                    {(r.marks || []).map((m: any, mi: number) => (
                                                        <tr key={mi} className="hover:bg-stone-50/50">
                                                            <td className="px-8 py-5">
                                                                <p className="font-black text-stone-800 text-sm">{m.subjects?.name}</p>
                                                                <p className="text-[10px] text-stone-400 font-bold uppercase">{m.subjects?.subject_code}</p>
                                                            </td>
                                                            <td className="px-8 py-5 text-center font-bold text-stone-500">{m.subjects?.credits}</td>
                                                            <td className="px-8 py-5 text-center font-bold text-stone-700">{m.internal_marks || 0}</td>
                                                            <td className="px-8 py-5 text-center font-bold text-stone-700">{m.external_marks || 0}</td>
                                                            <td className="px-8 py-5 text-center font-black text-stone-900 text-lg">{m.total_marks || 0}</td>
                                                            <td className="px-8 py-5 text-center">
                                                                <span className={`w-10 h-10 inline-flex items-center justify-center rounded-xl font-black text-sm border ${m.grade === 'F' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'}`}>
                                                                    {m.grade || '—'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Card>
                                </div>
                            );
                        }) : (
                            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-stone-200">
                                <FileText className="mx-auto text-stone-200 mb-4" size={64} />
                                <h3 className="text-xl font-black text-stone-800">No Published Results</h3>
                                <p className="text-stone-400 mt-2 font-medium">Semester results will appear here once published by admin.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ======== ASSIGNMENTS ======== */}
                {!loading && activeTab === 'assignments' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-2xl font-black text-stone-900 tracking-tight px-4">My Assignments</h2>

                        {/* Submit modal */}
                        {selectedAssignment && (
                            <Card className="p-8 rounded-3xl border-indigo-100 shadow-md space-y-5">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h4 className="font-black text-stone-800">Submit: {selectedAssignment.title}</h4>
                                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{selectedAssignment.subjects?.name} • Due: {selectedAssignment.due_date}</p>
                                    </div>
                                    <button onClick={() => setSelectedAssignment(null)}><X size={18} className="text-stone-400" /></button>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Comments (optional)</label>
                                    <textarea className="w-full h-24 px-5 py-4 rounded-2xl bg-stone-50 border-0 font-bold outline-none focus:ring-4 focus:ring-indigo-50 resize-none"
                                        placeholder="Add any comments or notes..."
                                        value={submitComments} onChange={e => setSubmitComments(e.target.value)} />
                                </div>
                                <Button className="h-12 px-8 rounded-xl bg-indigo-600 text-white font-black" onClick={() => handleSubmitAssignment(selectedAssignment.id)}>
                                    <Send size={16} className="mr-2" /> Submit Assignment
                                </Button>
                            </Card>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {assignments.map((a: any) => (
                                <Card key={a.id} className="border-stone-100 p-8 rounded-[2.5rem] shadow-sm space-y-4 hover:shadow-xl transition-all">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-black text-stone-800 text-sm leading-tight flex-1">{a.title}</h4>
                                        <span className={`ml-3 flex-shrink-0 px-3 py-1 rounded-lg text-[10px] font-black uppercase ${statusColors[a.status] || 'bg-stone-100 text-stone-500'}`}>
                                            {a.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-stone-500">{a.subjects?.name} ({a.subjects?.subject_code})</p>
                                    {a.description && <p className="text-xs text-stone-400">{a.description}</p>}
                                    <div className="grid grid-cols-2 gap-3 py-3 border-t border-stone-100">
                                        <div>
                                            <p className="text-[10px] font-black text-stone-300 uppercase">Due Date</p>
                                            <p className="text-xs font-black text-stone-700">{a.due_date}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-stone-300 uppercase">Max Marks</p>
                                            <p className="text-xs font-black text-stone-700">{a.max_marks}</p>
                                        </div>
                                    </div>
                                    {a.submission?.marks_obtained !== undefined && a.submission?.marks_obtained !== null && (
                                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                            <p className="text-[10px] font-black text-emerald-600 uppercase">Score: {a.submission.marks_obtained}/{a.max_marks}</p>
                                            {a.submission.remarks && <p className="text-xs text-emerald-700 mt-1">{a.submission.remarks}</p>}
                                        </div>
                                    )}
                                    {a.status === 'Pending' && (
                                        <button onClick={() => setSelectedAssignment(a)}
                                            className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all">
                                            Submit Assignment
                                        </button>
                                    )}
                                </Card>
                            ))}
                            {assignments.length === 0 && <div className="col-span-full text-center py-16 text-stone-300 font-black">No assignments found for your semester.</div>}
                        </div>
                    </div>
                )}

                {/* ======== TIMETABLE ======== */}
                {!loading && activeTab === 'timetable' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center px-4">
                            <h2 className="text-2xl font-black text-stone-900 tracking-tight">Weekly Timetable</h2>
                            <button onClick={() => window.print()} className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase bg-stone-100 text-stone-600 hover:bg-stone-200 flex items-center gap-2">
                                <Printer size={14} /> Print
                            </button>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                                const dayLectures = timetable.filter((t: any) => t.day === day);
                                return (
                                    <div key={day} className={`space-y-4 ${day === currentDay ? 'opacity-100' : 'opacity-60 hover:opacity-100 transition-opacity'}`}>
                                        <div className="flex items-center justify-between pb-2 border-b-2 border-stone-100">
                                            <h4 className={`text-xs font-black uppercase tracking-widest ${day === currentDay ? 'text-indigo-600' : 'text-stone-400'}`}>
                                                {day.slice(0, 3)}
                                            </h4>
                                            {day === currentDay && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />}
                                        </div>
                                        <div className="space-y-3">
                                            {dayLectures.length > 0 ? dayLectures.map((l: any) => (
                                                <div key={l.id} className="p-4 rounded-2xl bg-white border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
                                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter truncate">{l.subjects?.name || 'Unknown'}</p>
                                                    <div className="mt-2 space-y-1">
                                                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-stone-400">
                                                            <Clock size={10} /> {l.start_time?.slice(0, 5)} - {l.end_time?.slice(0, 5)}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-stone-400">
                                                            <MapPin size={10} /> {l.room}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-stone-400">
                                                            <User size={10} /> {l.employees?.name || 'TBD'}
                                                        </div>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="p-4 rounded-2xl border border-dashed border-stone-200 text-center">
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

                {/* ======== NOTIFICATIONS ======== */}
                {!loading && activeTab === 'notifications' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center px-4">
                            <h2 className="text-2xl font-black text-stone-900 tracking-tight">Notifications</h2>
                            {unreadCount > 0 && (
                                <Button className="h-10 px-6 rounded-xl bg-indigo-600 text-white font-black text-xs" onClick={handleMarkAllRead}>
                                    Mark All Read ({unreadCount})
                                </Button>
                            )}
                        </div>
                        <div className="space-y-3">
                            {notifications.map((n: any) => {
                                const NIcon = notifIcon[n.type] || Bell;
                                return (
                                    <Card key={n.id}
                                        className={`p-6 rounded-2xl border-stone-100 shadow-sm flex items-start gap-4 transition-all ${!n.is_read ? 'bg-indigo-50/30 border-indigo-100' : ''}`}>
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${!n.is_read ? 'bg-indigo-100 text-indigo-600' : 'bg-stone-100 text-stone-400'}`}>
                                            <NIcon size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className={`text-sm ${!n.is_read ? 'font-black text-stone-900' : 'font-bold text-stone-600'}`}>{n.title}</h4>
                                                <span className="text-[10px] text-stone-400 font-bold flex-shrink-0 ml-4">{new Date(n.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-xs text-stone-500 mt-1">{n.message}</p>
                                        </div>
                                        {!n.is_read && (
                                            <button onClick={() => handleMarkRead(n.id)} className="text-indigo-600 hover:text-indigo-700 flex-shrink-0">
                                                <Eye size={16} />
                                            </button>
                                        )}
                                    </Card>
                                );
                            })}
                            {notifications.length === 0 && (
                                <div className="text-center py-20 text-stone-300 font-black">
                                    <Bell className="mx-auto mb-4 text-stone-200" size={48} />
                                    <p>No notifications yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
