import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials, request) {
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        // Rate limit: 5 tentativas por 15 min por IP+email
        const ip =
          request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() ??
          'unknown'
        const key = `login:${ip}:${email.toLowerCase()}`
        const { allowed } = rateLimit(key, 5, 15 * 60 * 1000)

        if (!allowed) {
          console.error(`[auth] brute-force bloqueado ip=${ip} email=${email}`)
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          select: { id: true, email: true, name: true, password: true },
        })

        if (!user) return null

        const valid = await compare(password, user.password)
        if (!valid) return null

        return { id: user.id, email: user.email, name: user.name ?? undefined }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      return session
    },
  },
})
