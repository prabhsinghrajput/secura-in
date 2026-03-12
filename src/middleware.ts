import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const path = req.nextUrl.pathname;

        // Hierarchy-based redirection (Numeric)
        const roleLevel = (token as any)?.role_level || 0;

        if (path.startsWith("/dashboard/student") && roleLevel < 10) {
            return NextResponse.redirect(new URL("/auth/login", req.url));
        }
        if (path.startsWith("/dashboard/assistant-faculty") && roleLevel < 50) {
            return NextResponse.redirect(new URL("/auth/login", req.url));
        }
        if (path.startsWith("/dashboard/faculty") && roleLevel < 60) {
            return NextResponse.redirect(new URL("/auth/login", req.url));
        }
        if (path.startsWith("/dashboard/hod") && roleLevel < 70) {
            return NextResponse.redirect(new URL("/auth/login", req.url));
        }
        if (path.startsWith("/dashboard/academic-admin") && roleLevel < 80) {
            return NextResponse.redirect(new URL("/auth/login", req.url));
        }
        if (path.startsWith("/dashboard/admin") && roleLevel < 100) {
            return NextResponse.redirect(new URL("/auth/login", req.url));
        }
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
    }
);

export const config = {
    matcher: ["/dashboard/:path*"],
};
