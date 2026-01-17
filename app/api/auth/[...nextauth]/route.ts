import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const parseUsers = () => {
  const usersStr = process.env.USERS || 'admin:admin';
  const users: Record<string, string> = {};
  usersStr.split(',').forEach(pair => {
    const [login, password] = pair.split(':');
    if (login && password) {
      users[login.trim()] = password.trim();
    }
  });
  return users;
};

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        login: { label: 'Логин', type: 'text' },
        password: { label: 'Пароль', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.login || !credentials?.password) return null;

        const users = parseUsers();
        if (users[credentials.login] === credentials.password) {
          return { id: credentials.login, name: credentials.login };
        }
        return null;
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
