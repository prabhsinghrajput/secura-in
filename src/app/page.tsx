import Link from 'next/link';
import { GraduationCap, ArrowRight, ShieldCheck, Database, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation */}
      <nav className="h-20 border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-900 flex items-center justify-center text-white shadow-md shadow-blue-900/20">
              <GraduationCap size={24} />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tight text-slate-900 leading-none">ARMS</span>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">Secura Institute</span>
            </div>
          </div>
          <Link href="/auth/login">
            <Button variant="primary" className="bg-blue-900 hover:bg-blue-800 text-white shadow-md shadow-blue-900/10 transition-all rounded-md px-6">
              Portal Access
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-24 px-4 overflow-hidden border-b border-slate-200 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-white border-b border-slate-100"></div>
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-800 text-xs font-semibold uppercase tracking-wider mb-8 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
            </span>
            Spring Semester Active
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-6">
            Academic Excellence, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-900 to-blue-600">Digitally Unified.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            The comprehensive record management platform designed exclusively for the Secura Institute of Technology. Secure, role-based, and built for modern academia.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/login">
              <Button size="lg" className="px-8 h-14 text-lg bg-blue-900 hover:bg-blue-800 shadow-xl shadow-blue-900/20 rounded-lg group transition-all duration-300">
                Sign In to Portal 
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="h-14 px-8 text-lg border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-semibold">
              View Documentation
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Institutional Core Capabilities</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">A modular architecture that supports every aspect of the academic lifecycle, from daily attendance to final degree conferral.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center text-blue-900 mb-6 border border-blue-100">
                <ShieldCheck size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">6-Tier Authorization</h3>
              <p className="text-slate-600 leading-relaxed">
                Hierarchical role-based access from Super Admin down to Student, ensuring strict data isolation across departments and strict approval pipelines.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center text-blue-900 mb-6 border border-blue-100">
                <BarChart3 size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Academic Analytics</h3>
              <p className="text-slate-600 leading-relaxed">
                Real-time computation of SGPA/CGPA, attendance shortage alerts, and rich faculty dashboards for continuous student performance tracking.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center text-blue-900 mb-6 border border-blue-100">
                <Database size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Enterprise Data Model</h3>
              <p className="text-slate-600 leading-relaxed">
                Supported by a robust 28-table PostgreSQL schema capturing assignments, lab evaluations, timetables, and comprehensive audit logs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12 px-4 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-2 mb-6 text-slate-300">
            <GraduationCap size={24} />
            <span className="font-bold text-xl tracking-tight">ARMS</span>
          </div>
          <p className="text-slate-400 text-sm mb-2">
            Academic Records Management System
          </p>
          <p className="text-slate-500 text-xs">
            © 2026 RKADE Academic Records Platform. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
