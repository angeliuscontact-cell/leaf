import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BriefcaseBusiness,
  ChevronRight,
  FileText,
  Globe2,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  UserRound,
  X,
  HelpCircle,
} from 'lucide-react'
import { Logo } from '../ui/Logo'
import { ThemeToggle } from '../ui/ThemeToggle'
import { Avatar } from '../ui/Feedback'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { cn } from '../../lib/utils'

const primaryNav = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/cvs', label: 'CVs', icon: FileText },
  { to: '/app/letters', label: 'Cover letters', icon: BriefcaseBusiness },
  { to: '/app/pages', label: 'Personal sites', icon: Globe2 },
  { to: '/app/assistant', label: 'AI assistant', icon: Sparkles },
]

const secondaryNav = [
  { to: '/app/profile', label: 'Career profile', icon: UserRound },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

export function DashboardLayout() {
  const { user, logout } = useAuth()
  const { addToast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const isEditor = /^\/app\/(cvs|letters|pages)\/\d+/.test(location.pathname)

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  const handleLogout = async () => {
    await logout()
    addToast({ type: 'info', title: 'Signed out', message: 'Your work is saved safely.' })
    navigate('/')
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Logo to="/app" />
        <button type="button" className="icon-btn lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation">
          <X size={19} />
        </button>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-4">
        <p className="px-3 pb-2 pt-4 text-[10px] font-bold uppercase tracking-[0.17em] text-muted/80">Workspace</p>
        <nav className="space-y-1" aria-label="Workspace">
          {primaryNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-semibold transition',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted hover:bg-raised hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} strokeWidth={isActive ? 2.2 : 1.9} />
                  <span className="flex-1">{label}</span>
                  {label === 'AI assistant' && (
                    <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                      New
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="my-4 mx-3 h-px bg-line" />
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.17em] text-muted/80">Account</p>
        <nav className="space-y-1" aria-label="Account">
          {secondaryNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-semibold transition',
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-raised hover:text-ink',
                )
              }
            >
              <Icon size={18} strokeWidth={1.9} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mx-3 mt-6 overflow-hidden rounded-lg border border-primary/15 bg-gradient-to-br from-primary/10 via-surface to-accent/5 p-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-ink">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Sparkles size={13} />
            </span>
            Build from your profile
          </div>
          <p className="mt-2 text-[11px] leading-5 text-muted">
            Keep one career profile and start every new document with your real details already in place.
          </p>
          <Link to="/app/profile" className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">
            Open profile <ChevronRight size={12} />
          </Link>
        </div>
      </div>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <Avatar name={user?.name || 'LEAF user'} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-ink">{user?.name}</p>
            <p className="truncate text-[10px] text-muted">{user?.email}</p>
          </div>
          <button type="button" className="icon-btn h-8 w-8" onClick={handleLogout} title="Sign out" aria-label="Sign out">
            <LogOut size={15} />
          </button>
        </div>
        {!user?.emailVerified && (
          <Link
            to="/app/settings#email"
            className="mt-1 flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-2 text-[10px] font-semibold text-amber-700 hover:bg-amber-500/15 dark:text-amber-300"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
            Verify your email address
          </Link>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh bg-canvas">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] border-r border-line bg-surface lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#091220]/50 backdrop-blur-[2px]"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] border-r border-line bg-surface shadow-lift">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur-md lg:hidden">
          <button type="button" className="icon-btn" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu size={21} />
          </button>
          <Logo to="/app" />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>

        {/* Editors render their own sticky toolbar at this height, so the floating
            theme switch would sit underneath it and could not be reached. */}
        {!isEditor && (
          <div className="pointer-events-none fixed right-5 top-4 z-20 hidden items-center gap-2 lg:flex">
            <a
              href="mailto:hello@leaf.app?subject=LEAF%20help"
              className="pointer-events-auto hidden items-center gap-1.5 rounded-full border border-line bg-surface/85 px-3 py-1.5 text-[11px] font-semibold text-muted shadow-sm backdrop-blur hover:text-ink xl:inline-flex"
            >
              <HelpCircle size={13} /> Help
            </a>
            <div className="pointer-events-auto">
              <ThemeToggle />
            </div>
          </div>
        )}

        <main id="main" className={cn(isEditor ? 'min-h-[calc(100dvh-4rem)]' : 'mx-auto w-full max-w-[1240px] px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-8')}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
