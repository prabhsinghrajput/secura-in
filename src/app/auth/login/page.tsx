'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { GraduationCap, ShieldCheck, UserCheck } from 'lucide-react';

const loginSchema = z.object({
    uid_eid: z.string().min(3, 'UID/EID must be at least 3 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (values: LoginFormValues) => {
        setIsLoading(true);
        setError(null);

        const result = await signIn('credentials', {
            redirect: false,
            uid_eid: values.uid_eid,
            password: values.password,
        });

        if (result?.error) {
            setError('Invalid credentials. Please try again.');
            setIsLoading(false);
        } else {
            // Force session refresh and redirect
            const response = await fetch('/api/auth/session');
            const data = await response.json();

            const role = data?.user?.role;
            const level = data?.user?.role_level;

            if (level >= 100) router.push('/dashboard/admin');
            else if (level >= 80) router.push('/dashboard/academic-admin');
            else if (level >= 70 || role === 'hod') router.push('/dashboard/hod');
            else if (level >= 50 || role === 'faculty') router.push('/dashboard/faculty');
            else if (level === 10 || role === 'student') router.push('/dashboard/student');
            else router.push('/');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-blue-100 selection:text-blue-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-slate-50 to-white">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-900 text-white mb-5 shadow-xl shadow-blue-900/20 border border-blue-800">
                        <GraduationCap size={32} />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 leading-tight tracking-tight">
                        ARMS Portal
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Secura Institute of Technology</p>
                </div>

                <Card className="border border-slate-200 shadow-2xl shadow-slate-200/50 bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
                    <CardHeader className="text-center border-b border-slate-100 pb-6 pt-8 bg-slate-50/50">
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Access Your Account</h2>
                        <p className="text-sm text-slate-500 mt-1">Enter your credentials to continue</p>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6 px-8">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-sm text-center font-semibold shadow-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            <Input
                                label="University ID / Employee ID"
                                autoComplete="username"
                                placeholder="STU123 or EMP456"
                                error={errors.uid_eid?.message}
                                {...register('uid_eid')}
                            />
                            <Input
                                label="Password"
                                type="password"
                                autoComplete="current-password"
                                placeholder="••••••••"
                                error={errors.password?.message}
                                {...register('password')}
                            />
                            <div className="pt-2">
                                <Button type="submit" variant="primary" className="w-full h-12 text-base font-semibold shadow-md shadow-blue-900/10" isLoading={isLoading}>
                                    Sign In Securely
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                    <div className="px-8 pb-8 text-center pt-6 bg-slate-50/50 border-t border-slate-100">
                        <div className="flex justify-center gap-6 text-slate-400">
                            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                                <UserCheck size={14} /> <span>Students</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                                <GraduationCap size={14} /> <span>Faculty</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                                <ShieldCheck size={14} /> <span>Admin</span>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
