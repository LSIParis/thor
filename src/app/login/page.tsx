import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { LoginForm } from './login-form'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default async function LoginPage() {
  const t = await getTranslations('login')
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
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  )
}
