'use client';

import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import {
    GraduationCap,
    LogOut,
    User,
    Settings,
    FileText,
    Users,
    LayoutDashboard
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    const roleLevel = (session?.user as any)?.role_level || 0;
    const uid_eid = session?.user?.uid_eid;

    const getDashboardPath = () => {
        if (roleLevel >= 100) return '/dashboard/admin'; // Super Admin
        if (roleLevel >= 80) return '/dashboard/admin'; // Acad Admin
        if (roleLevel >= 70) return '/dashboard/hod';
        if (roleLevel >= 60) return '/dashboard/faculty';
        if (roleLevel >= 50) return '/dashboard/assistant-faculty';
        return '/dashboard/student';
    };

    const dashboardPath = getDashboardPath();

    const menuItems = [
        { label: 'Intelligence', icon: LayoutDashboard, href: dashboardPath, minLevel: 10 },
        { label: 'Registry', icon: Users, href: '/dashboard/admin?tab=users', minLevel: 80 },
        { label: 'Curriculum', icon: FileText, href: '/dashboard/admin?tab=subjects', minLevel: 80 },
        { label: 'Staffing', icon: Users, href: '/dashboard/hod', minLevel: 70 },
        { label: 'Personal Identity', icon: User, href: `/dashboard/student`, minLevel: 10 },
    ].filter(item => roleLevel >= item.minLevel);


    return (
        <div className="min-h-screen bg-stone-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-stone-900 text-stone-300 hidden md:flex flex-col border-r border-stone-800">
                <div className="p-6">
                    <div className="flex items-center gap-3 text-white mb-8">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                            <GraduationCap size={20} />
                        </div>
                        <span className="font-bold text-lg">secura.in</span>
                    </div>

                    <nav className="space-y-1">
                        {menuItems.map((item) => (
                            <a
                                key={item.label}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-stone-800 hover:text-white",
                                    pathname === item.href && "bg-stone-800 text-white"
                                )}
                            >
                                <item.icon size={18} />
                                <span className="text-sm font-medium">{item.label}</span>
                            </a>
                        ))}
                    </nav>
                </div>

                <div className="mt-auto p-6 space-y-4">
                    <div className="flex items-center gap-3 px-3">
                        <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-xs font-bold text-indigo-400">
                            {session?.user?.name?.[0] || 'U'}
                        </div>
                        <div className="truncate">
                            <p className="text-sm font-medium text-white truncate">{session?.user?.name || session?.user?.uid_eid}</p>
                            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-tight">Level {roleLevel} Access</p>
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
                <header className="md:hidden h-16 bg-white border-b border-stone-200 flex items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <GraduationCap className="text-indigo-600" />
                        <span className="font-bold">secura.in</span>
                    </div>
                    <button onClick={() => signOut({ callbackUrl: '/auth/login' })}>
                        <LogOut size={20} className="text-stone-400" />
                    </button>
                </header>

                <div className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
