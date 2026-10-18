import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

const registerSchema = z.object({
  name: z.string().min(1).max(80).trim(),
  email: z.string().email().max(254).toLowerCase(),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .max(128, 'Máximo 128 caracteres'),
})

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  // Rate limit: 5 cadastros por hora por IP
  const { allowed } = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Muitas tentativas. Tente mais tarde.' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Dados inválidos.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const { name, email, password } = parsed.data

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })

  if (existing) {
    // Não vaza se o email já existe (enumeração de usuários)
    // Retorna sucesso genérico — o login falhará depois
    return NextResponse.json({ ok: true })
  }

  const passwordHash = await hash(password, 12)

  await prisma.user.create({
    data: { name, email, password: passwordHash },
  })

  return NextResponse.json({ ok: true })
}
