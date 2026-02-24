import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const path = req.nextUrl.pathname;

        // Role-based redirection
        if (path.startsWith("/dashboard/student") && token?.role !== "student") {
            return NextResponse.redirect(new URL("/auth/login", req.url));
        }
        if (path.startsWith("/dashboard/faculty") && token?.role !== "faculty") {
            return NextResponse.redirect(new URL("/auth/login", req.url));
        }
        if (path.startsWith("/dashboard/admin") && token?.role !== "admin") {
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
