import React from 'react';
import { cn } from '@/lib/utils';

export const Card = ({ className, children }: { className?: string; children: React.ReactNode }) => (
    <div className={cn('bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden', className)}>
        {children}
    </div>
);

export const CardHeader = ({ className, children }: { className?: string; children: React.ReactNode }) => (
    <div className={cn('px-6 py-4 border-b border-slate-100', className)}>
        {children}
    </div>
);

export const CardContent = ({ className, children }: { className?: string; children: React.ReactNode }) => (
    <div className={cn('p-6', className)}>
        {children}
    </div>
);

export const CardFooter = ({ className, children }: { className?: string; children: React.ReactNode }) => (
    <div className={cn('px-6 py-4 bg-slate-50 border-t border-slate-100', className)}>
        {children}
    </div>
);
