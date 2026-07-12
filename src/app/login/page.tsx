import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { LoginForm } from './login-form'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface Props {
  searchParams: Promise<{ activated?: string; reset?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const t = await getTranslations('login')
  const { activated, reset } = await searchParams
  const notice = activated === '1' ? 'Compte activé ! Vous pouvez vous connecter.'
    : reset === '1' ? 'Mot de passe réinitialisé. Vous pouvez vous connecter.'
    : undefined

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center gap-4">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/accueil.png')" }}
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60" />
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-4 w-full px-4">
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
          <h1 className="text-lg font-semibold">{t('title')}</h1>
        </CardHeader>
        <CardContent>
          {notice && (
            <p className="text-sm text-green-600 dark:text-green-400 mb-4 text-center">{notice}</p>
          )}
          <LoginForm />
        </CardContent>
      </Card>
      <p className="text-xs text-white/60">© LSI-Maintenance 2026</p>
      </div>
    </div>
  )
}
