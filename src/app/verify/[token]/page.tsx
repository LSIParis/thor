import { prisma } from '@/lib/db'
import { activateAccount } from '@/actions/users'
import { ActivateForm } from '@/components/admin/activate-form'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Props {
  params: Promise<{ token: string }>
}

export default async function VerifyPage({ params }: Props) {
  const { token } = await params

  const user = await prisma.user.findUnique({
    where: { verificationToken: token },
    select: { name: true, email: true, verificationTokenExpiry: true },
  })

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-sm w-full space-y-4 text-center">
          <h1 className="text-xl font-semibold">Lien invalide</h1>
          <p className="text-muted-foreground text-sm">Ce lien d'activation est invalide ou a déjà été utilisé.</p>
          <Button asChild><Link href="/login">Se connecter</Link></Button>
        </div>
      </div>
    )
  }

  if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-sm w-full space-y-4 text-center">
          <h1 className="text-xl font-semibold">Lien expiré</h1>
          <p className="text-muted-foreground text-sm">
            Ce lien a expiré (valable 72h). Contactez votre administrateur pour recevoir un nouveau lien.
          </p>
        </div>
      </div>
    )
  }

  const action = activateAccount.bind(null, token)

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-sm w-full space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Activation du compte</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Bonjour {user.name}, choisissez un mot de passe pour activer votre compte.
          </p>
          <p className="text-muted-foreground text-xs mt-0.5">{user.email}</p>
        </div>
        <ActivateForm action={action} />
      </div>
    </div>
  )
}
