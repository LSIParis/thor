import { requireAuth, getClientLinkedToUser } from '@/lib/access'
import { prisma } from '@/lib/db'
import { AppLayout } from '@/components/layout/app-layout'
import { ProfilForm } from '@/components/profil/profil-form'

export default async function ProfilPage() {
  const session = await requireAuth()
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) return null

  let linkedClient = null
  if (session.user.role === 'CLIENT') {
    const clientId = await getClientLinkedToUser(session.user.id)
    if (clientId) {
      linkedClient = await prisma.client.findUnique({ where: { id: clientId } })
    }
  }

  return (
    <AppLayout>
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold mb-6">Mon profil</h1>
        <ProfilForm user={user} linkedClient={linkedClient} />
      </div>
    </AppLayout>
  )
}
