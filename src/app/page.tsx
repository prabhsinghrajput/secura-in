import Link from 'next/link';
import { GraduationCap, ArrowRight, ShieldCheck, Database, Layout } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Navigation */}
      <nav className="h-20 border-b border-stone-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <GraduationCap size={24} />
            </div>
            <span className="font-bold text-xl tracking-tight text-stone-900">secura.in</span>
          </div>
          <Link href="/auth/login">
            <Button variant="outline" size="sm">Sign In Portal</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Next Generation Records Management
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-stone-900 leading-[1.1] mb-8">
            Secure Cloud-Based <br />
            <span className="text-indigo-600">Academic Records</span>
          </h1>
          <p className="text-xl text-stone-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            A comprehensive, modular platform for students, faculty, and administrators to securely manage and access academic performance data.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/login">
              <Button size="lg" className="px-8 h-14 text-lg">
                Enter Portal <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>
            <Button variant="ghost" size="lg" className="h-14 px-8 text-lg">Documentation</Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-white border-y border-stone-200">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-900">
              <ShieldCheck size={28} />
            </div>
            <h3 className="text-xl font-bold text-stone-900">Secure by Design</h3>
            <p className="text-stone-500">Role-based access control ensuring data privacy and integrity at every layer.</p>
          </div>
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-900">
              <Database size={28} />
            </div>
            <h3 className="text-xl font-bold text-stone-900">Supabase Integration</h3>
            <p className="text-stone-500">Powered by PostgreSQL with real-time capabilities and ultra-low latency.</p>
          </div>
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-900">
              <Layout size={28} />
            </div>
            <h3 className="text-xl font-bold text-stone-900">Modular Workspace</h3>
            <p className="text-stone-500">Clean, responsive dashboards tailored specifically for students and faculty.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 text-center text-stone-400 text-sm">
        <p>© 2026 RKADE Academic Records Platform. Built with Next.js 15.</p>
      </footer>
    </div>
  );
}
