import { prisma } from '@/lib/db'
import { resetPassword } from '@/actions/users'
import { ActivateForm } from '@/components/admin/activate-form'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Props {
  params: Promise<{ token: string }>
  searchParams: Promise<{ error?: string }>
}

export default async function ResetPasswordPage({ params, searchParams }: Props) {
  const { token } = await params
  const { error } = await searchParams

  const user = await prisma.user.findUnique({
    where: { passwordResetToken: token },
    select: { email: true, passwordResetExpiry: true },
  })

  if (!user || (user.passwordResetExpiry && user.passwordResetExpiry < new Date())) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-sm w-full space-y-4 text-center">
          <h1 className="text-xl font-semibold">Lien expiré ou invalide</h1>
          <p className="text-muted-foreground text-sm">
            Ce lien de réinitialisation est invalide ou a expiré (valable 1 heure).
          </p>
          <Button asChild>
            <Link href="/forgot-password">Demander un nouveau lien</Link>
          </Button>
        </div>
      </div>
    )
  }

  const action = resetPassword.bind(null, token)

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-sm w-full space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Nouveau mot de passe</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Choisissez un nouveau mot de passe pour votre compte.
          </p>
          <p className="text-muted-foreground text-xs mt-0.5">{user.email}</p>
        </div>
        {error === 'weak' && (
          <p className="text-destructive text-sm">Le mot de passe doit contenir au moins 8 caractères.</p>
        )}
        {error === 'expired' && (
          <p className="text-destructive text-sm">Ce lien a expiré. <Link href="/forgot-password" className="underline">Demander un nouveau lien</Link>.</p>
        )}
        <ActivateForm action={action} submitLabel="Enregistrer le mot de passe" />
      </div>
    </div>
  )
}
