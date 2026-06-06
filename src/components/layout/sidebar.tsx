'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { LayoutDashboard, Users, Settings, ChevronLeft, ChevronRight, LogOut, User, ArrowLeftRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  userRole: string
  userName: string
  locale: string
  linkedClientId?: string | null
}

export function Sidebar({ userRole, userName, locale, linkedClientId }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const t = useTranslations('nav')

  const navItems =
    userRole === 'CLIENT'
      ? [
          { href: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
          ...(linkedClientId
            ? [{ href: `/clients/${linkedClientId}`, label: 'Mon espace', icon: Users }]
            : []),
          { href: '/mouvements', label: 'Entrées / Sorties', icon: ArrowLeftRight },
        ]
      : [
          { href: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
          { href: '/clients', label: t('clients'), icon: Users },
          { href: '/mouvements', label: 'Entrées / Sorties', icon: ArrowLeftRight },
          ...(userRole === 'ADMIN'
            ? [{ href: '/admin', label: t('admin'), icon: Settings }]
            : []),
        ]

  const switchLocale = () => {
    const next = locale === 'fr' ? 'en' : 'fr'
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000`
    window.location.reload()
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-card border-r border-border transition-all duration-200 flex-shrink-0',
        collapsed ? 'w-[52px]' : 'w-[180px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center px-3 py-4 border-b border-border min-h-[56px]">
        {!collapsed && (
          <div>
            <div className="text-primary font-bold text-sm tracking-widest">LSI</div>
            <div className="text-muted-foreground text-[10px] tracking-wider">MAINTENANCE</div>
          </div>
        )}
        {collapsed && <div className="text-primary font-bold text-xs mx-auto">L</div>}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-2">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            className={cn(
              'flex items-center gap-3 px-3 py-2 text-sm transition-colors',
              pathname.startsWith(href)
                ? 'text-foreground bg-secondary border-l-2 border-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            )}
          >
            <Icon size={16} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-border py-2">
        <button
          onClick={switchLocale}
          title="Switch language"
          className="flex items-center gap-3 px-3 py-2 text-xs text-muted-foreground hover:text-foreground w-full"
        >
          <span className="text-xs font-mono flex-shrink-0">
            {locale.toUpperCase()}
          </span>
          {!collapsed && <span>{locale === 'fr' ? 'English' : 'Français'}</span>}
        </button>

        <Link
          href="/profil"
          title={collapsed ? 'Mon profil' : undefined}
          className="flex items-center gap-3 px-3 py-2 text-xs text-muted-foreground hover:text-foreground w-full"
        >
          <User size={14} className="flex-shrink-0" />
          {!collapsed && <span className="truncate">{userName}</span>}
        </Link>

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          title={t('logout')}
          className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-destructive w-full"
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && <span>{t('logout')}</span>}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2 text-xs text-muted-foreground hover:text-foreground w-full"
        >
          {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>Réduire</span></>}
        </button>
      </div>
    </aside>
  )
}
