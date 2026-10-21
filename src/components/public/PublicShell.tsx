import { Link } from 'react-router-dom'
import { ArrowRight, LockKeyhole, Mail, Sparkles } from 'lucide-react'
import { BrandMark, Logo } from '../ui/Logo'
import { ThemeToggle } from '../ui/ThemeToggle'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'
import type { ReactNode } from 'react'

/**
 * Lightweight chrome for standalone public pages (shared CVs, legal, errors).
 * The personal-site renderer keeps its own chrome so it stays fully branded.
 */
export function PublicShell({
  children,
  context,
  className,
}: {
  children: ReactNode
  context?: string
  className?: string
}) {
  const { user } = useAuth()

  return (
    <div className={cn('flex min-h-dvh flex-col bg-canvas', className)}>
      <a href="#public-main" className="skip-link">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center gap-3 px-4 sm:px-6">
          <Logo />
          {context && (
            <>
              <span className="hidden h-4 w-px bg-line sm:block" aria-hidden="true" />
              <span className="hidden text-[11px] font-semibold text-muted sm:block">{context}</span>
            </>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <Link to="/" className="btn-ghost btn-sm hidden sm:inline-flex">
              Home
            </Link>
            <ThemeToggle className="hidden sm:block" />
            {user ? (
              <Link to="/app" className="btn-primary btn-sm">
                Workspace <ArrowRight size={13} />
              </Link>
            ) : (
              <Link to="/login" className="btn-secondary btn-sm">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main id="public-main" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-line bg-surface/60">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-3 px-4 py-6 text-[10px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
              <Sparkles size={11} className="text-primary" /> Built with LEAF
            </span>
            <Link to="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-ink">
              Terms
            </Link>
            <a href="mailto:hello@leaf.app" className="inline-flex items-center gap-1 hover:text-ink">
              <Mail size={10} /> hello@leaf.app
            </a>
          </div>
          <span className="inline-flex items-center gap-1.5">
            <LockKeyhole size={10} /> No payment step. Your documents belong to you.
          </span>
        </div>
      </footer>
    </div>
  )
}

export function PublicStatus({
  code,
  title,
  body,
  children,
}: {
  code: string
  title: string
  body: string
  children?: ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-[62vh] w-full max-w-[720px] flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <BrandMark size={44} className="shadow-lift" />
      <p className="mt-6 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">{code}</p>
      <h1 className="mt-2 text-balance text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-[52ch] text-pretty text-sm leading-7 text-muted">{body}</p>
      {children && <div className="mt-6 flex flex-wrap justify-center gap-2.5">{children}</div>}
    </div>
  )
}
