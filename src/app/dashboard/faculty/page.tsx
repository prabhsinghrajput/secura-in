'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
    getStudentsAction,
    createAcademicRecordAction,
    getAcademicRecordsAction,
    updateAcademicRecordAction,
    getSubjectsAction,
    markAttendanceAction,
    upsertInternalMarksAction,
    getTimetableAction,
    submitMarksForApprovalAction
} from '@/lib/actions';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Student, AcademicRecord, Subject, Attendance, InternalAssessment, Timetable } from '@/types';
import {
    Plus, Search, Edit2, Trash2, CheckCircle, XCircle, Filter,
    Eye, ArrowLeft, FileText, CheckCircle2, UserCheck, BarChart2,
    Calendar, BookOpen, Clock, MapPin, AlertCircle, Save
} from 'lucide-react';

type FacultyTab = 'students' | 'attendance' | 'assessments' | 'timetable';

export default function FacultyDashboard() {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState<FacultyTab>('students');
    const [loading, setLoading] = useState(true);

    // Master Data
    const [students, setStudents] = useState<Student[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [timetable, setTimetable] = useState<(Timetable & { subjects: { name: string }, employees: { name: string } })[]>([]);

    // UI/Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDept, setFilterDept] = useState('All');

    // Detailed View State
    const [viewMode, setViewMode] = useState<'list' | 'records'>('list');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [studentRecords, setStudentRecords] = useState<AcademicRecord[]>([]);

    // Attendance Marking State
    const [targetSubject, setTargetSubject] = useState('');
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceList, setAttendanceList] = useState<Record<string, 'Present' | 'Absent' | 'Leave'>>({});

    // Internal Marks State
    const [asTargetSubject, setAsTargetSubject] = useState('');
    const [asType, setAsType] = useState<InternalAssessment['assessment_type']>('MST1');
    const [asMaxMarks, setAsMaxMarks] = useState(100);
    const [asMarksList, setAsMarksList] = useState<Record<string, number>>({});

    useEffect(() => {
        if (session?.user?.uid_eid) {
            fetchInitialData();
        }
    }, [session]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [s, sub, t] = await Promise.all([
                getStudentsAction(),
                getSubjectsAction(),
                getTimetableAction('faculty', session?.user?.uid_eid!)
            ]);
            setStudents(s);
            setSubjects(sub);
            setTimetable(t);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const fetchRecords = async (student: Student) => {
        setLoading(true);
        try {
            const data = await getAcademicRecordsAction(student.uid);
            setStudentRecords(data);
            setSelectedStudent(student);
            setViewMode('records');
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const handleBatchAttendance = async () => {
        if (!targetSubject) return alert('Select a subject');
        setLoading(true);
        try {
            const payload = Object.entries(attendanceList).map(([uid, status]) => ({
                uid,
                subject_code: targetSubject,
                date: attendanceDate,
                status
            }));
            await markAttendanceAction(payload);
            alert('Attendance marked successfully');
            setAttendanceList({});
        } catch (error: any) {
            alert(error.message);
        }
        setLoading(false);
    };

    const handleBatchInternals = async () => {
        if (!asTargetSubject) return alert('Select a subject');
        setLoading(true);
        try {
            const payload = Object.entries(asMarksList).map(([uid, marks]) => ({
                uid,
                subject_code: asTargetSubject,
                assessment_type: asType,
                marks_obtained: marks,
                max_marks: asMaxMarks
            }));
            await upsertInternalMarksAction(payload);
            alert('Internal marks updated successfully');
            setAsMarksList({});
        } catch (error: any) {
            alert(error.message);
        }
        setLoading(false);
    };

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.uid.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDept = filterDept === 'All' || s.department === filterDept;
            return matchesSearch && matchesDept;
        });
    }, [students, searchQuery, filterDept]);

    const currentDay = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());

    const TabButton = ({ id, label, icon: Icon }: { id: FacultyTab, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-6 py-2.5 text-sm font-black rounded-xl transition-all ${activeTab === id
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100'
                : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
                }`}
        >
            <Icon size={16} />
            {label}
        </button>
    );

    return (
        <DashboardLayout>
            <div className="space-y-8 pb-20">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-stone-900 tracking-tight">Faculty Control</h1>
                        <p className="text-stone-500 font-medium">Manage student performance and institutional records</p>
                    </div>
                    <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-stone-100 shadow-sm">
                        <TabButton id="students" label="Students" icon={UserCheck} />
                        <TabButton id="attendance" label="Attendance" icon={CheckCircle2} />
                        <TabButton id="assessments" label="Assessments" icon={BookOpen} />
                        <TabButton id="timetable" label="Schedule" icon={Calendar} />
                    </div>
                </div>

                {activeTab === 'students' && (
                    <div className="space-y-8">
                        {viewMode === 'list' ? (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="lg:col-span-2 relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={20} />
                                        <Input
                                            className="pl-12 h-14 bg-white border-stone-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-indigo-50"
                                            placeholder="Search by UID or Student Name..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <div className="relative">
                                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                                        <select
                                            className="w-full h-14 pl-12 pr-4 bg-white border border-stone-100 rounded-2xl shadow-sm text-stone-600 font-bold focus:ring-4 focus:ring-indigo-50 appearance-none"
                                            value={filterDept}
                                            onChange={(e) => setFilterDept(e.target.value)}
                                        >
                                            <option value="All">All Departments</option>
                                            {[...new Set(students.map(s => s.department))].map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {filteredStudents.map((student) => (
                                        <Card key={student.uid} className="border-stone-100 hover:shadow-xl hover:shadow-indigo-100/30 transition-all group overflow-hidden">
                                            <CardContent className="p-0">
                                                <div className="p-6">
                                                    <div className="flex items-center gap-4 mb-6">
                                                        <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 font-black text-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                            {student.name[0]}
                                                        </div>
                                                        <div>
                                                            <h3 className="text-lg font-black text-stone-800 leading-none">{student.name}</h3>
                                                            <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mt-1">{student.uid}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 mb-8">
                                                        <div className="px-3 py-1 bg-stone-50 border border-stone-100 text-stone-400 text-[10px] font-black rounded-lg uppercase tracking-widest">{student.department}</div>
                                                        <div className="px-3 py-1 bg-stone-50 border border-stone-100 text-stone-400 text-[10px] font-black rounded-lg uppercase tracking-widest">Year {student.year}</div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button variant="primary" className="flex-1 rounded-xl h-12 font-black shadow-lg shadow-indigo-100 group-hover:bg-indigo-600" onClick={() => fetchRecords(student)}>
                                                            <Eye size={18} className="mr-2" /> Performance Results
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="space-y-8">
                                <Button variant="secondary" size="sm" onClick={() => setViewMode('list')} className="rounded-xl font-black">
                                    <ArrowLeft size={16} className="mr-2" /> Back to Directory
                                </Button>

                                <Card className="border-stone-100 bg-stone-900 text-white shadow-2xl overflow-hidden relative">
                                    <div className="absolute top-0 right-0 p-12 text-white/5 pointer-events-none">
                                        <BarChart2 size={160} />
                                    </div>
                                    <CardContent className="p-10 relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                                        <div className="flex items-center gap-8">
                                            <div className="w-24 h-24 rounded-3xl bg-white/10 flex items-center justify-center text-white text-4xl font-black backdrop-blur-md border border-white/20 shadow-2xl">
                                                {selectedStudent?.name[0]}
                                            </div>
                                            <div className="space-y-1">
                                                <h2 className="text-4xl font-black tracking-tight">{selectedStudent?.name}</h2>
                                                <p className="text-white/40 font-bold uppercase tracking-[0.2em] text-xs">{selectedStudent?.uid} • {selectedStudent?.department} • Year {selectedStudent?.year}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="grid grid-cols-1 gap-6">
                                    {studentRecords.length > 0 ? (
                                        <Card className="border-stone-100 overflow-hidden shadow-sm">
                                            <table className="w-full text-left">
                                                <thead className="bg-stone-50 text-stone-400 text-[10px] font-black uppercase tracking-widest">
                                                    <tr>
                                                        <th className="px-8 py-6">Subject Title</th>
                                                        <th className="px-8 py-6">Semester</th>
                                                        <th className="px-8 py-6">Performance</th>
                                                        <th className="px-8 py-6">Letter Grade</th>
                                                        <th className="px-8 py-6 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-stone-100">
                                                    {studentRecords.map(record => (
                                                        <tr key={record.record_id} className="hover:bg-stone-50/50 transition-colors">
                                                            <td className="px-8 py-6 font-black text-stone-800 tracking-tight">{record.subject}</td>
                                                            <td className="px-8 py-6 text-stone-500 font-bold">Sem {record.semester}</td>
                                                            <td className="px-8 py-6">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-12 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                                                        <div className="h-full bg-indigo-600 rounded-full opacity-60" style={{ width: `${record.marks}%` }} />
                                                                    </div>
                                                                    <span className="text-lg font-black text-stone-900">{record.marks}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6">
                                                                <span className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-black border border-indigo-100">{record.grade}</span>
                                                            </td>
                                                            <td className="px-8 py-6 text-right">
                                                                <button className="p-3 text-stone-300 hover:text-indigo-600 hover:bg-stone-100 rounded-2xl transition-all">
                                                                    <Edit2 size={20} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </Card>
                                    ) : (
                                        <div className="py-24 text-center bg-white rounded-3xl border border-dashed border-stone-200">
                                            <FileText className="mx-auto text-stone-200 mb-6" size={80} />
                                            <h3 className="text-2xl font-black text-stone-400">No Assessment Data</h3>
                                            <p className="text-stone-300 font-medium max-w-sm mx-auto mt-2">Final results for this student have not been published by the examination cell.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="space-y-8">
                        <Card className="border-stone-100 shadow-xl shadow-stone-100/50">
                            <CardHeader className="p-8 border-b border-stone-50 bg-stone-50/50">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                    <h3 className="text-2xl font-black text-stone-800 tracking-tight">Batch Attendance Marker</h3>
                                    <div className="flex flex-wrap gap-4 items-center">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-stone-300 uppercase tracking-widest block ml-1">Subject</label>
                                            <select
                                                className="h-12 px-4 rounded-xl border border-stone-200 bg-white text-xs font-black text-stone-600 focus:ring-4 focus:ring-indigo-50"
                                                value={targetSubject}
                                                onChange={e => setTargetSubject(e.target.value)}
                                            >
                                                <option value="">Select Module</option>
                                                {subjects.map(s => <option key={s.subject_code} value={s.subject_code}>{s.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-stone-300 uppercase tracking-widest block ml-1">Session Date</label>
                                            <input
                                                type="date"
                                                className="h-12 px-4 rounded-xl border border-stone-200 bg-white text-xs font-black text-stone-600 focus:ring-4 focus:ring-indigo-50"
                                                value={attendanceDate}
                                                onChange={e => setAttendanceDate(e.target.value)}
                                            />
                                        </div>
                                        <Button
                                            variant="primary"
                                            className="h-12 mt-4 md:mt-0 rounded-xl px-8 font-black shadow-lg shadow-indigo-100"
                                            onClick={handleBatchAttendance}
                                            disabled={loading || !targetSubject}
                                        >
                                            <Save size={18} className="mr-2" /> Finalize Registry
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-stone-50/50 text-stone-400 text-[10px] font-black uppercase tracking-widest border-b border-stone-100">
                                        <tr>
                                            <th className="px-10 py-6">Student UID</th>
                                            <th className="px-10 py-6">Name</th>
                                            <th className="px-10 py-6">Department</th>
                                            <th className="px-10 py-6 text-center">Status Selection</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100">
                                        {filteredStudents.map(student => (
                                            <tr key={student.uid} className="hover:bg-stone-50/30 transition-colors">
                                                <td className="px-10 py-6 font-black text-indigo-600 text-sm">{student.uid}</td>
                                                <td className="px-10 py-6 font-bold text-stone-800">{student.name}</td>
                                                <td className="px-10 py-6 text-xs text-stone-400 font-bold uppercase tracking-widest">{student.department}</td>
                                                <td className="px-10 py-6">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {(['Present', 'Absent', 'Leave'] as const).map(status => (
                                                            <button
                                                                key={status}
                                                                onClick={() => setAttendanceList({ ...attendanceList, [student.uid]: status })}
                                                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all border-2 ${attendanceList[student.uid] === status
                                                                    ? status === 'Present' ? 'bg-green-600 border-green-600 text-white' : status === 'Absent' ? 'bg-red-600 border-red-600 text-white' : 'bg-orange-600 border-orange-600 text-white'
                                                                    : 'border-stone-100 bg-stone-50 text-stone-300 hover:border-stone-200'
                                                                    }`}
                                                            >
                                                                {status}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'assessments' && (
                    <div className="space-y-8">
                        <Card className="border-stone-100 shadow-xl shadow-stone-100/50">
                            <CardHeader className="p-8 border-b border-stone-50 bg-stone-50/50">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                    <h3 className="text-2xl font-black text-stone-800 tracking-tight">Internal Marks Console</h3>
                                    <div className="flex flex-wrap gap-4 items-center">
                                        <select
                                            className="h-12 px-4 rounded-xl border border-stone-200 bg-white text-xs font-black text-stone-600 focus:ring-4 focus:ring-indigo-50"
                                            value={asTargetSubject}
                                            onChange={e => setAsTargetSubject(e.target.value)}
                                        >
                                            <option value="">Select Subject</option>
                                            {subjects.map(s => <option key={s.subject_code} value={s.subject_code}>{s.name}</option>)}
                                        </select>
                                        <select
                                            className="h-12 px-4 rounded-xl border border-stone-200 bg-white text-xs font-black text-stone-600 focus:ring-4 focus:ring-indigo-50"
                                            value={asType}
                                            onChange={e => setAsType(e.target.value as any)}
                                        >
                                            {['Assignment', 'Quiz', 'MST1', 'MST2', 'Lab', 'Project', 'Surprise Test'].map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <Input
                                            className="h-12 w-32 border-stone-200 text-center font-black"
                                            type="number"
                                            value={asMaxMarks}
                                            onChange={e => setAsMaxMarks(Number(e.target.value))}
                                            placeholder="Max Marks"
                                        />
                                        <Button
                                            variant="secondary"
                                            className="h-12 rounded-xl px-8 font-black border-2 border-indigo-100 text-indigo-600"
                                            onClick={async () => {
                                                if (confirm('Submit all draft marks to HOD for recommendation?')) {
                                                    // This would need more complex logic to get IDs, keeping it simple for now
                                                    alert('Batch submission feature coming soon. Currently marks are auto-saved as draft.');
                                                }
                                            }}
                                        >
                                            Submit to HOD
                                        </Button>
                                        <Button
                                            variant="primary"
                                            className="h-12 rounded-xl px-8 font-black shadow-lg shadow-indigo-100"
                                            onClick={handleBatchInternals}
                                            disabled={loading || !asTargetSubject}
                                        >
                                            <Save size={18} className="mr-2" /> Sync Marks
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <table className="w-full text-left">
                                    <thead className="bg-stone-50/50 text-stone-400 text-[10px] font-black uppercase tracking-widest border-b border-stone-100">
                                        <tr>
                                            <th className="px-10 py-6">Student Info</th>
                                            <th className="px-10 py-6">Engagement Score</th>
                                            <th className="px-10 py-6">Max</th>
                                            <th className="px-10 py-6">Workflow Status</th>
                                            <th className="px-10 py-6 text-center">Efficiency Tracker</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100">
                                        {filteredStudents.map(student => (
                                            <tr key={student.uid} className="hover:bg-stone-50/30 transition-colors">
                                                <td className="px-10 py-6">
                                                    <p className="font-black text-stone-800 text-sm tracking-tight">{student.name}</p>
                                                    <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">{student.uid}</p>
                                                </td>
                                                <td className="px-10 py-6">
                                                    <input
                                                        type="number"
                                                        className="w-24 h-11 border-2 border-stone-100 rounded-xl bg-stone-50 text-center font-black text-stone-800 transition-colors focus:border-indigo-600 focus:bg-white outline-none"
                                                        value={asMarksList[student.uid] || ''}
                                                        onChange={e => setAsMarksList({ ...asMarksList, [student.uid]: Number(e.target.value) })}
                                                    />
                                                </td>
                                                <td className="px-10 py-6 text-sm font-bold text-stone-300">{asMaxMarks}</td>
                                                <td className="px-10 py-6">
                                                    <span className="px-3 py-1 bg-stone-50 border border-stone-100 rounded-lg text-[10px] font-black uppercase text-stone-400">Draft</span>
                                                </td>
                                                <td className="px-10 py-6">
                                                    <div className="flex items-center justify-center gap-3">
                                                        <div className="w-32 h-2 bg-stone-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${((asMarksList[student.uid] || 0) / asMaxMarks) * 100}%` }} />
                                                        </div>
                                                        <span className="text-xs font-black text-stone-800 w-8">{Math.round(((asMarksList[student.uid] || 0) / asMaxMarks) * 100)}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'timetable' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                                const dayLectures = timetable.filter(t => t.day === day);
                                return (
                                    <div key={day} className={`space-y-4 ${day === currentDay ? 'opacity-100 scale-105 active-day' : 'opacity-60 hover:opacity-100 transition-all'}`}>
                                        <div className="flex items-center justify-between pb-3 border-b-2 border-stone-100">
                                            <h4 className={`text-sm font-black uppercase tracking-widest ${day === currentDay ? 'text-indigo-600' : 'text-stone-300'}`}>
                                                {day.slice(0, 3)}
                                            </h4>
                                            {day === currentDay && <div className="w-2 h-2 rounded-full bg-indigo-600 shadow-lg shadow-indigo-200 animate-pulse" />}
                                        </div>
                                        <div className="space-y-4">
                                            {dayLectures.length > 0 ? dayLectures.map(l => (
                                                <Card key={l.id} className="border-stone-100 shadow-sm hover:shadow-xl hover:shadow-stone-200/50 transition-all group overflow-hidden">
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                                                            <p className="text-[10px] font-black text-stone-800 uppercase tracking-tighter leading-tight">{l.subjects.name}</p>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-2 text-[10px] font-black text-stone-400">
                                                                <Clock size={12} className="text-stone-300" />
                                                                {l.start_time.slice(0, 5)} - {l.end_time.slice(0, 5)}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] font-black text-stone-400">
                                                                <MapPin size={12} className="text-stone-300" />
                                                                Room {l.room}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400">
                                                                <AlertCircle size={12} className="text-indigo-300" />
                                                                Sem {l.semester}
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )) : (
                                                <div className="py-8 rounded-2xl border-2 border-dashed border-stone-50 flex items-center justify-center">
                                                    <span className="text-[10px] font-black text-stone-200 uppercase tracking-widest">No Class</span>
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
