import { DefaultSession } from "next-auth";
import { UserRole } from "./index";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            uid_eid: string;
            role: UserRole;
        } & DefaultSession["user"];
    }

    interface User {
        id: string;
        uid_eid: string;
        role: UserRole;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        uid_eid: string;
        role: UserRole;
    }
}
