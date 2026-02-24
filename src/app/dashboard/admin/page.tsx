'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
    createUserAction,
    getAllUsersAction,
    resetUserPasswordAction,
    updateUserRoleAction,
    getSubjectsAction,
    getStudentsAction,
    getEmployeesAction,
    updateStudentProfileActionFull,
    getAllTimetablesAction,
    getDepartmentsAction,
    getCoursesAction,
    bulkUploadStudentsAction,
    getAuditLogsAction
} from '@/lib/actions';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
    UserPlus, Shield, Users, UserCheck, Key, Settings,
    Trash2, RefreshCw, Calendar, BookOpen, Search,
    Filter, MoreVertical, LayoutGrid, List, CheckCircle2,
    Briefcase, GraduationCap, MapPin, Phone, Mail, Globe,
    ArrowRight, Info, Plus, Printer
} from 'lucide-react';
import { UserRole, Student, Employee, Subject } from '@/types';

type AdminTab = 'users' | 'registry' | 'subjects' | 'timetables' | 'analytics' | 'audit';

export default function AdminDashboard() {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<AdminTab>('users');

    // Master Data
    const [users, setUsers] = useState<any[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [allTimetables, setAllTimetables] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);

    // Filtering
    const [userSearch, setUserSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');

    // Registration Form
    const [regRole, setRegRole] = useState<UserRole>('student');
    const [regLevel, setRegLevel] = useState(10);
    const [regData, setRegData] = useState({
        uid_eid: '', name: '', email: '', department: '', password: '',
        department_id: '', course_id: '',
        year: 1, designation: '', dob: '', blood_group: '',
        admission_year: new Date().getFullYear(), program_code: 'B.TECH',
        current_semester: 1, address: '', contact_number: ''
    });

    // Profile Management Modal
    const [selectedEntity, setSelectedEntity] = useState<Student | Employee | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [u, s, e, sub, timetables, depts, crs, logs] = await Promise.all([
                getAllUsersAction(),
                getStudentsAction(),
                getEmployeesAction(),
                getSubjectsAction(),
                getAllTimetablesAction(),
                getDepartmentsAction(),
                getCoursesAction(),
                getAuditLogsAction()
            ]);
            setUsers(u);
            setStudents(s);
            setEmployees(e);
            setSubjects(sub);
            setAllTimetables(timetables);
            setDepartments(depts);
            setCourses(crs);
            setAuditLogs(logs);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createUserAction(regData, regRole, regLevel);
            alert('Account provisioned successfully');
            setRegData({
                uid_eid: '', name: '', email: '', department: '', password: '',
                department_id: '', course_id: '',
                year: 1, designation: '', dob: '', blood_group: '',
                admission_year: new Date().getFullYear(), program_code: 'B.TECH',
                current_semester: 1, address: '', contact_number: ''
            });
            fetchInitialData();
            setActiveTab('users');
        } catch (error: any) {
            alert(error.message);
        }
        setLoading(false);
    };

    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const matchesSearch = u.uid_eid.toLowerCase().includes(userSearch.toLowerCase());
            const matchesRole = roleFilter === 'All' || u.role === roleFilter;
            return matchesSearch && matchesRole;
        });
    }, [users, userSearch, roleFilter]);

    const TabButton = ({ id, label, icon: Icon }: { id: AdminTab, label: string, icon: any }) => (
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
                {/* Global Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
                    <div>
                        <h1 className="text-4xl font-black text-stone-900 tracking-tight">System Core</h1>
                        <p className="text-stone-400 font-bold mt-1 uppercase tracking-widest text-[10px]">Academic Records Institutional Hub</p>
                    </div>
                    <div className="grid grid-cols-2 sm:flex gap-2 p-1.5 bg-stone-50 rounded-2xl">
                        <TabButton id="users" label="Directory" icon={Users} />
                        <TabButton id="registry" label="Provision" icon={UserPlus} />
                        <TabButton id="subjects" label="Curriculum" icon={BookOpen} />
                        <TabButton id="timetables" label="Schedule" icon={Calendar} />
                        <TabButton id="analytics" label="Pulse" icon={Globe} />
                        <TabButton id="audit" label="Audit" icon={Shield} />
                    </div>
                </div>

                {activeTab === 'users' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Stats Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {[
                                { label: 'Total Users', val: users.length, icon: Users, color: 'text-indigo-600' },
                                { label: 'Active Students', val: students.length, icon: GraduationCap, color: 'text-blue-600' },
                                { label: 'Faculty Staff', val: employees.filter(e => e.designation !== 'Administrator').length, icon: Briefcase, color: 'text-orange-600' },
                                { label: 'Super Admins', val: users.filter(u => u.role === 'admin').length, icon: Shield, color: 'text-stone-900' }
                            ].map((stat, i) => (
                                <Card key={i} className="border-stone-100 hover:shadow-lg transition-all">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-1">{stat.label}</p>
                                                <h3 className="text-3xl font-black text-stone-900">{stat.val}</h3>
                                            </div>
                                            <div className={`p-3 rounded-2xl bg-stone-50 ${stat.color}`}>
                                                <stat.icon size={24} />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Search & Filter Bar */}
                        <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-3xl border border-stone-100 shadow-sm">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-indigo-600 transition-colors" size={20} />
                                <input
                                    className="w-full h-14 pl-12 pr-6 bg-stone-50 border-0 rounded-2xl text-stone-800 font-bold placeholder:text-stone-300 focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
                                    placeholder="Search by Identity (UID/EID)..."
                                    value={userSearch}
                                    onChange={e => setUserSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2 bg-stone-50 p-1.5 rounded-2xl h-14 items-center">
                                {['All', 'student', 'faculty', 'admin'].map(r => (
                                    <button
                                        key={r}
                                        onClick={() => setRoleFilter(r)}
                                        className={`px-4 h-10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${roleFilter === r ? 'bg-white text-indigo-600 shadow-md' : 'text-stone-400 hover:text-stone-600'
                                            }`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* User Table */}
                        <Card className="border-stone-100 overflow-hidden shadow-xl shadow-stone-100/30">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-stone-50 text-stone-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-stone-100">
                                        <tr>
                                            <th className="px-8 py-6">Unique Identity</th>
                                            <th className="px-8 py-6">Status/Role</th>
                                            <th className="px-8 py-6">Registry Timestamp</th>
                                            <th className="px-8 py-6 text-right">Provisioning Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-50">
                                        {filteredUsers.map(user => (
                                            <tr key={user.uid_eid} className="hover:bg-indigo-50/20 transition-all group">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm ${user.role === 'admin' ? 'bg-stone-900 text-white' :
                                                            user.role === 'faculty' ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'
                                                            }`}>
                                                            {user.uid_eid[0]}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-stone-800 tracking-tight">{user.uid_eid}</p>
                                                            <p className="text-[10px] text-stone-300 font-bold uppercase tracking-widest">Global Account</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${user.role === 'admin' ? 'bg-red-500' : user.role === 'faculty' ? 'bg-orange-500' : 'bg-indigo-500'
                                                            }`} />
                                                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-stone-500">{user.role}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <p className="text-xs font-bold text-stone-400">{new Date(user.created_at).toLocaleDateString()} at {new Date(user.created_at).toLocaleTimeString().slice(0, 5)}</p>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="secondary" className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 border-transparent hover:border-indigo-100">
                                                            <Key size={14} className="mr-2" /> Reset
                                                        </Button>
                                                        <Button variant="outline" className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 border-stone-100 hover:bg-stone-50">
                                                            <Settings size={14} className="mr-2" /> Modify
                                                        </Button>
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

                {activeTab === 'registry' && (
                    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
                        <Card className="border-0 shadow-2xl rounded-[3rem] overflow-hidden">
                            <div className="grid grid-cols-1 md:grid-cols-12">
                                <div className="md:col-span-4 bg-indigo-600 p-12 text-white flex flex-col justify-between">
                                    <div>
                                        <Shield size={48} className="text-white/20 mb-8" />
                                        <h2 className="text-4xl font-black tracking-tight leading-tight">Account Provisioning</h2>
                                        <p className="text-white/60 font-bold mt-4 leading-relaxed">Establish new credentials and profile parameters within the institutional database.</p>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4 text-white/40 font-black text-xs uppercase tracking-widest">
                                            <div className="w-12 h-0.5 bg-white/10" />
                                            Security Policy active
                                        </div>
                                    </div>
                                </div>
                                <div className="md:col-span-8 p-12 bg-white">
                                    <div className="space-y-4 mb-12">
                                        <label className="text-[10px] font-black text-stone-300 uppercase tracking-widest ml-1">Hierarchical Role Assignment</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {[
                                                { id: 'student', level: 10, label: 'Student' },
                                                { id: 'assistant_faculty', level: 50, label: 'Asst. Faculty' },
                                                { id: 'faculty', level: 60, label: 'Professor' },
                                                { id: 'hod', level: 70, label: 'HOD' },
                                                { id: 'admin', level: 80, label: 'Acad Admin' },
                                                { id: 'admin', level: 100, label: 'Super Admin' }
                                            ].map(r => (
                                                <button
                                                    key={`${r.id}-${r.level}`}
                                                    type="button"
                                                    onClick={() => { setRegRole(r.id as UserRole); setRegLevel(r.level); }}
                                                    className={`py-3 px-4 text-[10px] font-black rounded-xl uppercase tracking-widest transition-all border-2 ${regLevel === r.level ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-stone-50 text-stone-300 border-transparent hover:text-stone-500'
                                                        }`}
                                                >
                                                    {r.label} (L{r.level})
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <form onSubmit={handleCreateAccount} className="space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-stone-300 uppercase tracking-widest ml-1">Database Identity (UID/EID)</label>
                                                <Input
                                                    className="h-14 bg-stone-50 border-0 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-50"
                                                    placeholder="Ex: STU-2024-001"
                                                    required
                                                    value={regData.uid_eid}
                                                    onChange={e => setRegData({ ...regData, uid_eid: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-stone-300 uppercase tracking-widest ml-1">Legal Full Name</label>
                                                <Input
                                                    className="h-14 bg-stone-50 border-0 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-50"
                                                    placeholder="Enter name as per documents"
                                                    required
                                                    value={regData.name}
                                                    onChange={e => setRegData({ ...regData, name: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-stone-300 uppercase tracking-widest ml-1">Official Email Address</label>
                                                <Input
                                                    type="email"
                                                    className="h-14 bg-stone-50 border-0 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-50"
                                                    placeholder="entity@rkade.in"
                                                    required
                                                    value={regData.email}
                                                    onChange={e => setRegData({ ...regData, email: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-stone-300 uppercase tracking-widest ml-1">Organization Unit (Dept)</label>
                                                <select
                                                    className="w-full h-14 px-6 bg-stone-50 border-0 rounded-2xl font-bold text-stone-800 outline-none focus:ring-4 focus:ring-indigo-50 appearance-none"
                                                    value={regData.department_id}
                                                    onChange={e => {
                                                        const dept = departments.find(d => d.id === e.target.value);
                                                        setRegData({ ...regData, department_id: e.target.value, department: dept?.name || '' });
                                                    }}
                                                    required
                                                >
                                                    <option value="">Select Department</option>
                                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                                </select>
                                            </div>
                                            {regRole === 'student' && (
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-stone-300 uppercase tracking-widest ml-1">Academic Program (Course)</label>
                                                    <select
                                                        className="w-full h-14 px-6 bg-stone-50 border-0 rounded-2xl font-bold text-stone-800 outline-none focus:ring-4 focus:ring-indigo-50 appearance-none"
                                                        value={regData.course_id}
                                                        onChange={e => setRegData({ ...regData, course_id: e.target.value })}
                                                        required
                                                    >
                                                        <option value="">Select Course</option>
                                                        {courses.filter(c => c.dept_id === regData.department_id).map(c => (
                                                            <option key={c.id} value={c.id}>{c.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-stone-300 uppercase tracking-widest ml-1">Security Credential</label>
                                                <Input
                                                    type="password"
                                                    className="h-14 bg-stone-50 border-0 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-50"
                                                    placeholder="Strong alphanumeric required"
                                                    required
                                                    value={regData.password}
                                                    onChange={e => setRegData({ ...regData, password: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-6">
                                            <Button type="submit" className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-lg font-black shadow-2xl shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-95" isLoading={loading}>
                                                Authorize & Generate Account
                                            </Button>
                                        </div>
                                    </form>
                                    <div className="my-10 h-px bg-stone-100 relative">
                                        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-[10px] font-black text-stone-300 uppercase tracking-widest">Or Multi-Provision</span>
                                    </div>

                                    <div className="p-8 rounded-3xl bg-indigo-50 border border-indigo-100 group hover:border-indigo-300 transition-all cursor-pointer relative overflow-hidden">
                                        <div className="relative z-10 flex items-center justify-between">
                                            <div className="flex items-center gap-6">
                                                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                                    <RefreshCw size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-stone-900">Bulk System Ingest</h3>
                                                    <p className="text-xs font-bold text-indigo-400">Upload CSV/Excel Spreadsheet</p>
                                                </div>
                                            </div>
                                            <Button variant="outline" className="h-12 px-6 rounded-xl font-black bg-white border-transparent shadow-sm">
                                                Select Archive
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'subjects' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-black text-stone-800 tracking-tight">Curriculum Inventory</h2>
                            <Button variant="primary" className="h-12 rounded-xl font-black px-6 shadow-lg shadow-indigo-100">
                                <Plus size={20} className="mr-2" /> Add Module
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {subjects.map(sub => (
                                <Card key={sub.subject_code} className="border-stone-100 hover:shadow-xl transition-all group">
                                    <CardContent className="p-8">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black border border-stone-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                {sub.subject_code.slice(0, 2)}
                                            </div>
                                            <span className="text-[10px] font-black text-stone-300 uppercase tracking-widest bg-stone-50 px-3 py-1 rounded-lg">{sub.subject_type}</span>
                                        </div>
                                        <h3 className="text-lg font-black text-stone-800 tracking-tight leading-7 h-14 overflow-hidden mb-4">{sub.name}</h3>
                                        <div className="flex items-center justify-between pt-6 border-t border-stone-50">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest">Weightage</p>
                                                <p className="text-sm font-black text-stone-800">{sub.credits} Credits</p>
                                            </div>
                                            <div className="space-y-1 text-right">
                                                <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest">Internal</p>
                                                <p className="text-sm font-black text-stone-800">Upto {sub.max_internal}M</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'timetables' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="flex justify-between items-center bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
                            <div>
                                <h2 className="text-2xl font-black text-stone-800 tracking-tight">Schedule Orchestrator</h2>
                                <p className="text-stone-400 font-bold text-xs uppercase tracking-widest mt-1">Institutional Time Management</p>
                            </div>
                            <Button variant="primary" className="h-12 px-6 rounded-xl font-black shadow-lg shadow-indigo-100">
                                <Plus size={18} className="mr-2" /> New Slot
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                            {/* Schedule Grid */}
                            <Card className="xl:col-span-8 border-stone-100 overflow-hidden shadow-xl shadow-stone-100/30">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-stone-50 text-stone-400 text-[10px] font-black uppercase tracking-widest border-b border-stone-100">
                                            <tr>
                                                <th className="px-6 py-4">Day</th>
                                                <th className="px-6 py-4">Timeline</th>
                                                <th className="px-6 py-4">Subject</th>
                                                <th className="px-6 py-4">Faculty</th>
                                                <th className="px-6 py-4">Room</th>
                                                <th className="px-6 py-4 text-right">Ops</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-stone-50">
                                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                                                const daySlots = allTimetables.filter(t => t.day === day);
                                                if (daySlots.length === 0) return null;
                                                return (
                                                    <React.Fragment key={day}>
                                                        <tr className="bg-stone-50/50">
                                                            <td colSpan={6} className="px-6 py-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest">{day}</td>
                                                        </tr>
                                                        {daySlots.map((slot) => (
                                                            <tr key={slot.id} className="hover:bg-indigo-50/20 transition-all group">
                                                                <td className="px-6 py-4">
                                                                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <p className="text-xs font-black text-stone-800">{slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}</p>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <p className="text-sm font-black text-stone-800">{slot.subjects?.name}</p>
                                                                    <p className="text-[10px] text-stone-400 font-bold uppercase">{slot.subject_code}</p>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 text-[10px] font-black">
                                                                            {slot.employees?.name?.[0] || 'ST'}
                                                                        </div>
                                                                        <span className="text-xs font-bold text-stone-500">{slot.employees?.name}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className="px-2 py-1 rounded-lg bg-stone-100 text-[10px] font-black text-stone-600">{slot.room}</span>
                                                                </td>
                                                                <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg">
                                                                        <Settings size={12} />
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </React.Fragment>
                                                );
                                            })}
                                            {allTimetables.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-20 text-center text-stone-300 font-bold italic">No institutional slots recorded yet.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>

                            {/* Quick Tool Sidebar */}
                            <div className="xl:col-span-4 space-y-6">
                                <Card className="border-indigo-100 bg-indigo-50/30 p-8 rounded-[2rem]">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                            <Info size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-stone-900">Auto-Resolver</h3>
                                            <p className="text-xs font-bold text-stone-400">Conflict Detection Engine</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-stone-600 leading-relaxed font-medium mb-8">
                                        The system automatically prevents booking overlapping slots for the same faculty or room within the same institutional timeline.
                                    </p>
                                    <Button className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black shadow-xl shadow-indigo-100">
                                        Run Conflict Audit
                                    </Button>
                                </Card>

                                <Card className="border-stone-100 p-8 rounded-[2rem]">
                                    <h4 className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-6">Utilization Metrics</h4>
                                    <div className="space-y-6">
                                        {[
                                            { label: 'Room Occupancy', val: 78, color: 'bg-indigo-600' },
                                            { label: 'Faculty Load', val: 62, color: 'bg-orange-500' },
                                            { label: 'Student Core Hours', val: 85, color: 'bg-blue-600' }
                                        ].map((m, i) => (
                                            <div key={i} className="space-y-2">
                                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                                    <span className="text-stone-400">{m.label}</span>
                                                    <span className="text-stone-900">{m.val}%</span>
                                                </div>
                                                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                                                    <div className={`h-full ${m.color}`} style={{ width: `${m.val}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'analytics' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <Card className="border-0 bg-stone-900 text-white p-10 rounded-[3rem] overflow-hidden relative col-span-1 md:col-span-2 shadow-2xl">
                                <div className="absolute top-0 right-0 p-12 text-white/5 pointer-events-none">
                                    <Globe size={240} />
                                </div>
                                <div className="relative z-10 space-y-8">
                                    <div>
                                        <h2 className="text-4xl font-black tracking-tight">Institutional Pulse</h2>
                                        <p className="text-white/40 font-bold mt-2 uppercase tracking-widest text-xs">Real-time Performance Metrics</p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-10 border-t border-white/10">
                                        <div className="space-y-2">
                                            <p className="text-xs font-black text-white/40 uppercase tracking-widest">Global Attendance</p>
                                            <h4 className="text-4xl font-black">94.2%</h4>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-xs font-black text-white/40 uppercase tracking-widest">Avg CGPA</p>
                                            <h4 className="text-4xl font-black">8.42</h4>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-xs font-black text-white/40 uppercase tracking-widest">Subject Coverage</p>
                                            <h4 className="text-4xl font-black">100%</h4>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                            <Card className="border-stone-100 p-10 rounded-[3rem] shadow-xl shadow-stone-100/50 flex flex-col justify-between">
                                <div className="space-y-4">
                                    <div className="w-16 h-16 bg-green-50 rounded-3xl flex items-center justify-center text-green-600">
                                        <CheckCircle2 size={32} />
                                    </div>
                                    <h3 className="text-2xl font-black text-stone-800 tracking-tight">GPA Logic Engine</h3>
                                    <p className="text-stone-400 font-bold text-sm leading-relaxed">Automated calculation of credit-weighted SGPAs based on validated grade entries.</p>
                                </div>
                                <Button variant="primary" className="h-14 rounded-2xl font-black bg-stone-900 text-white w-full shadow-lg">
                                    Recalculate Global GPA
                                </Button>
                            </Card>
                        </div>
                    </div>
                )}
                {activeTab === 'audit' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
                            <div>
                                <h2 className="text-2xl font-black text-stone-900 tracking-tight">Institutional Audit Vault</h2>
                                <p className="text-stone-400 font-bold text-xs uppercase tracking-widest mt-1">Immutable Transaction History</p>
                            </div>
                            <Button variant="secondary" className="h-12 px-6 rounded-xl font-black border-2 border-stone-100">
                                <Printer size={18} className="mr-2" /> Export Log
                            </Button>
                        </div>

                        <Card className="border-stone-100 overflow-hidden shadow-xl shadow-stone-100/30">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-stone-50 text-stone-400 text-[10px] font-black uppercase tracking-widest border-b border-stone-100">
                                        <tr>
                                            <th className="px-8 py-6">Timestamp</th>
                                            <th className="px-8 py-6">Agent</th>
                                            <th className="px-8 py-6">Action</th>
                                            <th className="px-8 py-6">Entity</th>
                                            <th className="px-8 py-6 text-right">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-50">
                                        {auditLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-indigo-50/10 transition-colors">
                                                <td className="px-8 py-6">
                                                    <p className="text-xs font-bold text-stone-400">{new Date(log.created_at).toLocaleString()}</p>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-[8px] font-black">
                                                            {log.performed_by?.[0]}
                                                        </div>
                                                        <span className="text-xs font-black text-indigo-600">{log.performed_by}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${log.action.includes('CREATE') ? 'bg-emerald-100 text-emerald-600' :
                                                        log.action.includes('UPDATE') ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'
                                                        }`}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <p className="text-xs font-bold text-stone-600">{log.entity_type} • {log.entity_id}</p>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <Button variant="outline" size="sm" className="h-8 rounded-lg text-[8px] font-black uppercase">Inspect JSON</Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
