import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  await prisma.metaConnection.deleteMany({ where: { userId: session.user.id } })

  redirect('/campaigns?disconnected=1')
}
