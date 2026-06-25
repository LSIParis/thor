import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { authorize } from './auth.helpers'

const isProd = process.env.NODE_ENV === 'production'

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  basePath: '/api/auth',
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null
        return authorize({
          email: credentials.email as string,
          password: credentials.password as string,
        })
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      session.user.role = token.role as string
      session.user.id = token.id as string
      return session
    },
  },
  pages: { signIn: '/login' },
  session: {
    strategy: 'jwt',
    maxAge: 12 * 60 * 60, // 12 h max par sécurité
  },
  cookies: {
    sessionToken: {
      // Cookie de session : supprimé automatiquement à la fermeture du navigateur
      name: isProd ? '__Secure-authjs.session-token' : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProd,
        // Pas de maxAge → cookie de session (pas de date d'expiration persistante)
      },
    },
  },
})
