import { requestPasswordReset } from '@/actions/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import Image from 'next/image'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ sent?: string }>
}

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { sent } = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center gap-3">
          <Image
            src="/logo-lsi-800px.png"
            alt="LSI Maintenance"
            width={200}
            height={80}
            className="object-contain"
            priority
          />
          <h1 className="text-lg font-semibold">Mot de passe oublié</h1>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Si un compte existe avec cette adresse, un email de réinitialisation vous a été envoyé.
                Vérifiez votre boîte de réception (et vos spams).
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Retour à la connexion</Link>
              </Button>
            </div>
          ) : (
            <form action={requestPasswordReset} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Saisissez votre adresse email pour recevoir un lien de réinitialisation.
              </p>
              <div className="space-y-1">
                <Label htmlFor="email">Adresse email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  autoFocus
                  placeholder="votre@email.com"
                />
              </div>
              <Button type="submit" className="w-full">Envoyer le lien</Button>
              <div className="text-center">
                <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
                  Retour à la connexion
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
