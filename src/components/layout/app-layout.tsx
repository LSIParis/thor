import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Sidebar } from './sidebar'
import { getClientLinkedToUser } from '@/lib/access'

export async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const cookieStore = await cookies()
  const locale = cookieStore.get('NEXT_LOCALE')?.value ?? 'fr'

  const linkedClientId =
    session.user.role === 'CLIENT'
      ? await getClientLinkedToUser(session.user.id)
      : null

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userRole={session.user.role}
        userName={session.user.name ?? ''}
        locale={locale}
        linkedClientId={linkedClientId}
      />
      <main className="flex-1 overflow-y-auto bg-background p-6">
        {children}
      </main>
    </div>
  )
}
