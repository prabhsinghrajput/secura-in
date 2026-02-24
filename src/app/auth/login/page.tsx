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
            // Fetch session to determine role and redirect
            const response = await fetch('/api/auth/session');
            const session = await response.json();

            const role = session?.user?.role;
            if (role === 'student') router.push('/dashboard/student');
            else if (role === 'faculty') router.push('/dashboard/faculty');
            else if (role === 'admin') router.push('/dashboard/admin');
            else router.push('/');
        }
    };

    return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white mb-4 shadow-lg shadow-indigo-100">
                        <GraduationCap size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-stone-900 leading-tight">
                        Academic Records Portal
                    </h1>
                    <p className="text-stone-500 mt-2">Secure access to academic management</p>
                </div>

                <Card className="border-none shadow-xl">
                    <CardHeader className="text-center border-none pt-8">
                        <h2 className="text-xl font-semibold text-stone-800">Welcome Back</h2>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-2">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm text-center font-medium">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <Input
                                label="UID / EID"
                                autoComplete="username"
                                placeholder="Ex: STU123 or EMP456"
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
                            <Button type="submit" className="w-full" isLoading={isLoading}>
                                Sign In
                            </Button>
                        </form>
                    </CardContent>
                    <div className="px-6 pb-8 text-center border-t border-stone-50 pt-6">
                        <div className="flex justify-center gap-6 text-stone-400">
                            <div className="flex items-center gap-1.5 text-xs">
                                <UserCheck size={14} /> <span>Students</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs">
                                <GraduationCap size={14} /> <span>Faculty</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs">
                                <ShieldCheck size={14} /> <span>Admin</span>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
