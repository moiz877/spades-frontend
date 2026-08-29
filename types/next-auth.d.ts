import type { TeamRole } from '@/lib/types';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      companyId: string;
      companyName: string;
      role: TeamRole;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    companyId: string;
    companyName: string;
    role: TeamRole;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    companyId: string;
    companyName: string;
    role: TeamRole;
  }
}
