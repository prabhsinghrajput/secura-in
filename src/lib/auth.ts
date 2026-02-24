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
                    .eq("uid_eid", credentials.uid_eid)
                    .single();

                if (error || !user) return null;

                const isValid = await comparePassword(credentials.password, user.password_hash);
                if (!isValid) return null;

                return {
                    id: user.id,
                    uid_eid: user.uid_eid,
                    role: user.role,
                };
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.uid_eid = user.uid_eid;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id;
                session.user.uid_eid = token.uid_eid;
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
