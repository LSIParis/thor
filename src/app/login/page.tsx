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
          <h1 className="text-lg font-semibold">{t('title')}</h1>
        </CardHeader>
        <CardContent>
          {notice && (
            <p className="text-sm text-green-600 dark:text-green-400 mb-4 text-center">{notice}</p>
          )}
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  )
}
