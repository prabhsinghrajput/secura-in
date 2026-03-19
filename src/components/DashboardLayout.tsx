'use client';

import React, { Suspense } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
    GraduationCap,
    LogOut,
    User,
    Settings,
    FileText,
    Users,
    LayoutDashboard,
    Shield,
    Building2,
    BookOpen,
    Award,
    Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

function SidebarNav({ roleLevel, dashboardPath, pathname }: { roleLevel: number, dashboardPath: string, pathname: string }) {
    const searchParams = useSearchParams();
    const currentTab = searchParams.get('tab') || 'dashboard';

    const menuItems = (() => {
        if (roleLevel >= 100) {
            // Super Admin & Admin
            return [
                { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard/admin?tab=dashboard', tabIdx: 'dashboard' },
                { label: 'Roles', icon: Shield, href: '/dashboard/admin?tab=roles', tabIdx: 'roles' },
                { label: 'Depts', icon: Building2, href: '/dashboard/admin?tab=departments', tabIdx: 'departments' },
                { label: 'Academic', icon: BookOpen, href: '/dashboard/admin?tab=academic', tabIdx: 'academic' },
                { label: 'Users', icon: Users, href: '/dashboard/admin?tab=users', tabIdx: 'users' },
                { label: 'Grading', icon: Award, href: '/dashboard/admin?tab=grading', tabIdx: 'grading' },
                { label: 'Config', icon: Settings, href: '/dashboard/admin?tab=config', tabIdx: 'config' },
                { label: 'Audit', icon: Activity, href: '/dashboard/admin?tab=audit', tabIdx: 'audit' },
            ].filter(item => {
                if (roleLevel < 100 && ['roles', 'departments', 'config'].includes(item.tabIdx)) return false;
                return true;
            });
        }
        if (roleLevel >= 80) {
            // Academic Admin
            return [
                { label: 'Overview', icon: LayoutDashboard, href: '/dashboard/academic-admin?tab=dashboard', tabIdx: 'dashboard' },
                { label: 'Students', icon: GraduationCap, href: '/dashboard/academic-admin?tab=students', tabIdx: 'students' },
                { label: 'Faculty', icon: Users, href: '/dashboard/academic-admin?tab=faculty', tabIdx: 'faculty' },
                { label: 'Marks', icon: Award, href: '/dashboard/academic-admin?tab=marks', tabIdx: 'marks' },
                { label: 'Results', icon: FileText, href: '/dashboard/academic-admin?tab=results', tabIdx: 'results' },
                { label: 'Reports', icon: BookOpen, href: '/dashboard/academic-admin?tab=reports', tabIdx: 'reports' },
            ];
        }
        if (roleLevel >= 70) {
            // HOD
            return [
                { label: 'Overview', icon: LayoutDashboard, href: '/dashboard/hod?tab=overview', tabIdx: 'overview' },
                { label: 'Faculty', icon: Users, href: '/dashboard/hod?tab=faculty', tabIdx: 'faculty' },
                { label: 'Students', icon: GraduationCap, href: '/dashboard/hod?tab=students', tabIdx: 'students' },
                { label: 'Subjects', icon: BookOpen, href: '/dashboard/hod?tab=subjects', tabIdx: 'subjects' },
                { label: 'Attendance', icon: Activity, href: '/dashboard/hod?tab=attendance', tabIdx: 'attendance' },
                { label: 'Marks', icon: Award, href: '/dashboard/hod?tab=marks', tabIdx: 'marks' },
                { label: 'Assignments', icon: FileText, href: '/dashboard/hod?tab=assignments', tabIdx: 'assignments' },
                { label: 'Reports', icon: Settings, href: '/dashboard/hod?tab=reports', tabIdx: 'reports' },
            ];
        }
        if (roleLevel >= 60) {
            // Faculty
            return [
                { label: 'Overview', icon: LayoutDashboard, href: '/dashboard/faculty?tab=overview', tabIdx: 'overview' },
                { label: 'Subjects', icon: BookOpen, href: '/dashboard/faculty?tab=subjects', tabIdx: 'subjects' },
                { label: 'Attendance', icon: Activity, href: '/dashboard/faculty?tab=attendance', tabIdx: 'attendance' },
                { label: 'Marks', icon: Award, href: '/dashboard/faculty?tab=marks', tabIdx: 'marks' },
                { label: 'Analytics', icon: Activity, href: '/dashboard/faculty?tab=analytics', tabIdx: 'analytics' },
                { label: 'Schedule', icon: Settings, href: '/dashboard/faculty?tab=schedule', tabIdx: 'schedule' },
            ];
        }
        if (roleLevel >= 50) {
            // Assistant Faculty
            return [
                { label: 'Overview', icon: LayoutDashboard, href: '/dashboard/assistant-faculty?tab=overview', tabIdx: 'overview' },
                { label: 'Subjects', icon: BookOpen, href: '/dashboard/assistant-faculty?tab=subjects', tabIdx: 'subjects' },
                { label: 'Attendance', icon: Activity, href: '/dashboard/assistant-faculty?tab=attendance', tabIdx: 'attendance' },
                { label: 'Assignments', icon: FileText, href: '/dashboard/assistant-faculty?tab=assignments', tabIdx: 'assignments' },
                { label: 'Lab Marks', icon: Award, href: '/dashboard/assistant-faculty?tab=lab-marks', tabIdx: 'lab-marks' },
                { label: 'Issues', icon: Settings, href: '/dashboard/assistant-faculty?tab=issues', tabIdx: 'issues' },
                { label: 'Reports', icon: Activity, href: '/dashboard/assistant-faculty?tab=analytics', tabIdx: 'analytics' },
            ];
        }
        
        // Student
        return [
            { label: 'Overview', icon: LayoutDashboard, href: '/dashboard/student?tab=overview', tabIdx: 'overview' },
            { label: 'Profile', icon: User, href: '/dashboard/student?tab=profile', tabIdx: 'profile' },
            { label: 'Attendance', icon: Activity, href: '/dashboard/student?tab=attendance', tabIdx: 'attendance' },
            { label: 'Marks', icon: Award, href: '/dashboard/student?tab=marks', tabIdx: 'marks' },
            { label: 'Results', icon: FileText, href: '/dashboard/student?tab=results', tabIdx: 'results' },
            { label: 'Assignments', icon: BookOpen, href: '/dashboard/student?tab=assignments', tabIdx: 'assignments' },
            { label: 'Timetable', icon: Settings, href: '/dashboard/student?tab=timetable', tabIdx: 'timetable' },
            { label: 'Alerts', icon: Shield, href: '/dashboard/student?tab=notifications', tabIdx: 'notifications' },
        ];
    })();

    return (
        <nav className="space-y-1">
            {menuItems.map((item) => (
                <a
                    key={item.label}
                    href={item.href}
                    className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-all font-medium text-slate-400 hover:bg-slate-800 hover:text-white",
                        (pathname === '/' ? item.href === '/' : (currentTab === item.tabIdx && pathname.includes(dashboardPath))) && "bg-blue-900/40 text-blue-100 border-l-2 border-blue-500 rounded-l-none"
                    )}
                >
                    <item.icon size={18} />
                    <span className="text-sm font-medium">{item.label}</span>
                </a>
            ))}
        </nav>
    );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    const roleLevel = (session?.user as any)?.role_level || 0;
    const uid_eid = session?.user?.uid_eid;

    const getDashboardPath = () => {
        if (roleLevel >= 100) return '/dashboard/admin'; // Super Admin
        if (roleLevel >= 80) return '/dashboard/academic-admin'; // Acad Admin
        if (roleLevel >= 70) return '/dashboard/hod';
        if (roleLevel >= 60) return '/dashboard/faculty';
        if (roleLevel >= 50) return '/dashboard/assistant-faculty';
        return '/dashboard/student';
    };

    const dashboardPath = getDashboardPath();

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-950 text-slate-300 hidden md:flex flex-col border-r border-slate-800">
                <div className="p-6">
                    <div className="flex items-center gap-3 text-white mb-8">
                        <div className="w-8 h-8 rounded-lg bg-blue-900 flex items-center justify-center shadow-sm border border-blue-800">
                            <GraduationCap size={20} />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-lg leading-tight tracking-tight">ARMS</span>
                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Secura Institute</span>
                        </div>
                    </div>

                    <Suspense fallback={<div className="animate-pulse space-y-2 mt-4"><div className="h-8 bg-slate-800 rounded-lg"></div><div className="h-8 bg-slate-800 rounded-lg"></div></div>}>
                        <SidebarNav roleLevel={roleLevel} dashboardPath={dashboardPath} pathname={pathname} />
                    </Suspense>
                </div>

                <div className="mt-auto p-6 space-y-4 border-t border-slate-800/50">
                    <div className="flex items-center gap-3 px-3 bg-slate-900 py-3 rounded-lg border border-slate-800">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-blue-400">
                            {session?.user?.uid_eid?.[0] || 'U'}
                        </div>
                        <div className="truncate">
                            <p className="text-sm font-medium text-white truncate">{session?.user?.uid_eid || 'Unknown User'}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide truncate">{session?.user?.name || 'Academic User'}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: '/auth/login' })}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                        <LogOut size={18} />
                        <span className="text-sm font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
                {/* Mobile Header */}
                <header className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <GraduationCap className="text-blue-900" />
                        <span className="font-bold">ARMS</span>
                    </div>
                    <button onClick={() => signOut({ callbackUrl: '/auth/login' })}>
                        <LogOut size={20} className="text-slate-400" />
                    </button>
                </header>

                <div className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
