import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabase, supabaseAdmin } from "./supabase";
import { comparePassword } from "./password";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                uid_eid: { label: "UID/EID", type: "text", placeholder: "Enter UID or EID" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.uid_eid || !credentials?.password) return null;

                const { data: user, error } = await supabaseAdmin
                    .from("users")
                    .select("*")
                    .ilike("uid_eid", credentials.uid_eid)
                    .single();

                if (error || !user) return null;

                // Simple check for now, in production use bcrypt
                const isValid = credentials.password === user.password_hash;
                if (!isValid) return null;

                return {
                    id: user.id,
                    uid_eid: user.uid_eid,
                    role_level: user.role_level,
                    department_id: user.department_id
                } as any;
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }: any) {
            if (user) {
                token.id = user.id;
                token.uid_eid = user.uid_eid;
                token.role_level = user.role_level;
                token.department_id = user.department_id;

                // Map numeric level to a string role for frontend convenience
                if (user.role_level >= 80) token.role = 'admin';
                else if (user.role_level >= 70) token.role = 'hod';
                else if (user.role_level >= 50) token.role = 'faculty';
                else token.role = 'student';
            }
            return token;
        },
        async session({ session, token }: any) {
            if (token) {
                session.user.id = token.id;
                session.user.uid_eid = token.uid_eid;
                session.user.role_level = token.role_level;
                session.user.department_id = token.department_id;
                session.user.role = token.role;
            }
            return session;
        }
    },

    pages: {
        signIn: "/auth/login",
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
};
