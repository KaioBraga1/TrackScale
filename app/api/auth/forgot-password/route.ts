import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  let body: { email?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const email = (body.email ?? '').trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
  }

  // Sempre retorna sucesso para não vazar se o email existe
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } })
  if (!user) return NextResponse.json({ ok: true })

  // Invalida tokens anteriores
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  })

  const token = crypto.randomBytes(32).toString('hex')
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
    },
  })

  try {
    await sendPasswordResetEmail(user.email, token)
  } catch (e) {
    console.error('[forgot-password] email failed:', e)
    return NextResponse.json({ error: 'Não foi possível enviar o email. Tente novamente.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
