'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard, Users, Settings, ChevronLeft, ChevronRight,
  LogOut, User, ArrowLeftRight, ChevronDown,
  LayoutGrid, Boxes, Cloud, HardDrive, Phone, Monitor, Globe, MapPin,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  userRole: string
  userName: string
  locale: string
  linkedClientId?: string | null
  clients?: { id: string; name: string }[]
}

type NavChild = { href: string; label: string; icon: React.ElementType }
type NavItem = { href: string; label: string; icon: React.ElementType; children?: NavChild[] }


export function Sidebar({ userRole, userName, locale, linkedClientId, clients = [] }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const t = useTranslations('nav')

  // Propagate selected client to all nav links
  const clientId = searchParams.get('client')
  const withClient = (h: string) => clientId ? `${h}?client=${clientId}` : h

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => ({
    '/transactions': pathname.startsWith('/transactions'),
    '/clients': pathname.startsWith('/clients') || pathname.startsWith('/sites') || pathname.startsWith('/contacts'),
  }))

  function toggleSection(href: string) {
    setOpenSections((prev) => ({ ...prev, [href]: !prev[href] }))
  }

  const navItems: NavItem[] =
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
          { href: '/clients', label: t('clients'), icon: Users, children: [
            { href: '/clients',  label: 'Sociétés',   icon: Users },
            { href: '/sites',    label: 'Sites',      icon: MapPin },
            { href: '/contacts', label: 'Contacts',   icon: User },
          ]},
          { href: '/parc',    label: 'Parc',     icon: Monitor },
          { href: '/mouvements', label: 'Entrées / Sorties', icon: ArrowLeftRight },
          { href: '/dns',         label: 'DNS & Mails',   icon: Globe },
          { href: '/m365',        label: 'Microsoft 365', icon: LayoutGrid },
          { href: '/saas',        label: 'Autre SaaS',    icon: Boxes },
          { href: '/cloud',       label: 'Cloud',         icon: Cloud },
          { href: '/sauvegarde',  label: 'Sauvegarde',    icon: HardDrive },
          { href: '/voip', label: 'Tél. VoIP', icon: Phone },
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

      {/* Client actif */}
      {!collapsed && (
        <div className="px-3 py-2 border-b border-border bg-muted/30">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Client</div>
          <div className="text-xs font-medium truncate text-foreground">
            {clientId
              ? (clients.find(c => c.id === clientId)?.name ?? '—')
              : 'Tous les clients'}
          </div>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, children }) => {
          if (!children) {
            return (
              <Link
                key={href}
                href={withClient(href)}
                title={collapsed ? label : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 text-sm transition-colors',
                  pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                    ? 'text-foreground bg-secondary border-l-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
                )}
              >
                <Icon size={16} className="flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            )
          }

          // Item with children
          const isOpen = openSections[href] ?? false
          const anyChildActive = children.some((c) => pathname.startsWith(c.href))

          if (collapsed) {
            return (
              <Link
                key={href}
                href={withClient(children[0].href)}
                title={label}
                className={cn(
                  'flex items-center justify-center px-3 py-2 text-sm transition-colors',
                  anyChildActive
                    ? 'text-foreground bg-secondary border-l-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
                )}
              >
                <Icon size={16} className="flex-shrink-0" />
              </Link>
            )
          }

          return (
            <div key={href}>
              <button
                onClick={() => toggleSection(href)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 text-sm transition-colors w-full',
                  anyChildActive
                    ? 'text-foreground bg-secondary border-l-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                )}
              >
                <Icon size={16} className="flex-shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                <ChevronDown
                  size={12}
                  className={cn('transition-transform flex-shrink-0', isOpen && 'rotate-180')}
                />
              </button>
              {isOpen && (
                <div className="ml-3 border-l border-border pl-2 py-0.5">
                  {children.map((child) => {
                    const ChildIcon = child.icon
                    return (
                      <Link
                        key={child.href}
                        href={withClient(child.href)}
                        className={cn(
                          'flex items-center gap-2 px-2 py-1.5 text-xs rounded transition-colors',
                          pathname.startsWith(child.href)
                            ? 'text-foreground font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                        )}
                      >
                        <ChildIcon size={13} className="flex-shrink-0" />
                        {child.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-border py-2">
        {userRole === 'ADMIN' && (() => {
          const settingsHref = clientId ? `/clients/${clientId}/parametres` : '/admin'
          const settingsActive = clientId
            ? pathname === `/clients/${clientId}/parametres`
            : pathname.startsWith('/admin')
          return (
            <Link
              href={settingsHref}
              title={collapsed ? 'Paramètres' : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2 text-sm transition-colors',
                settingsActive
                  ? 'text-foreground bg-secondary border-l-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              )}
            >
              <Settings size={16} className="flex-shrink-0" />
              {!collapsed && <span>Paramètres</span>}
            </Link>
          )
        })()}

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
