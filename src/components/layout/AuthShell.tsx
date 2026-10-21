import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, Leaf, Sparkles } from 'lucide-react'
import { BrandMark, Logo } from '../ui/Logo'
import { ThemeToggle } from '../ui/ThemeToggle'

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  backTo = '/',
  backLabel = 'Back to LEAF',
}: {
  title: string
  subtitle: ReactNode
  children: ReactNode
  footer?: ReactNode
  backTo?: string
  backLabel?: string
}) {
  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(440px,0.88fr)]">
      <div className="flex min-h-dvh flex-col px-5 py-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to={backTo} className="btn-ghost btn-sm hidden sm:inline-flex">
              <ArrowLeft size={14} /> {backLabel}
            </Link>
          </div>
        </header>
        <main id="main" className="flex flex-1 items-center py-10 lg:py-14">
          <div className="mx-auto w-full max-w-[430px]">
            <div className="mb-7">
              <h1 className="text-3xl font-bold leading-tight text-ink sm:text-[2rem]">{title}</h1>
              <div className="mt-2 text-sm leading-6 text-muted">{subtitle}</div>
            </div>
            {children}
          </div>
        </main>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-muted">
          <span>© {new Date().getFullYear()} LEAF</span>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-ink">
              Terms
            </Link>
            <a href="mailto:hello@leaf.app" className="hover:text-ink">
              Contact
            </a>
          </div>
        </footer>
      </div>

      <aside className="relative hidden overflow-hidden bg-[#0d1b2e] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14" aria-label="About LEAF">
        <div className="absolute inset-0 opacity-50 surface-grid" aria-hidden="true" />
        <div className="absolute -right-32 top-16 h-96 w-96 rounded-full bg-brand-500/30 blur-[100px]" aria-hidden="true" />
        <div className="absolute -left-24 bottom-10 h-80 w-80 rounded-full bg-teal-400/15 blur-[100px]" aria-hidden="true" />
        <div className="relative flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-white/60">
          <BrandMark size={26} /> CAREER STORIES, BUILT TO GROW
        </div>

        <div className="relative">
          <div className="relative mx-auto mb-12 h-[390px] w-full max-w-[430px]" aria-hidden="true">
            <div className="absolute left-[7%] top-10 h-[290px] w-[205px] rotate-[-8deg] rounded-lg border border-white/10 bg-white/95 p-5 shadow-2xl">
              <div className="mb-5 h-1.5 w-10 rounded-full bg-brand-500" />
              <div className="space-y-2">
                <div className="h-4 w-32 rounded bg-slate-900/85" />
                <div className="h-2.5 w-24 rounded bg-brand-500/60" />
              </div>
              <div className="mt-6 space-y-1.5">
                {[100, 90, 96, 72].map((width, i) => (
                  <div key={i} className="h-1.5 rounded bg-slate-300" style={{ width: `${width}%` }} />
                ))}
              </div>
              <div className="mt-6 h-2 w-16 rounded bg-slate-800" />
              <div className="mt-3 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1">
                    <div className="h-1.5 w-4/5 rounded bg-slate-700/80" />
                    <div className="h-1.5 w-full rounded bg-slate-200" />
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute right-[5%] top-0 h-[320px] w-[225px] rotate-[6deg] rounded-lg border border-white/15 bg-white p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,.6)]">
              <div className="flex items-center justify-between">
                <div className="h-8 w-8 rounded-full bg-teal-500/20 p-2">
                  <Leaf size={16} className="text-teal-600" />
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-bold uppercase tracking-wide text-emerald-700">Published</span>
              </div>
              <div className="mt-7 h-5 w-36 rounded bg-slate-900" />
              <div className="mt-2 h-2.5 w-24 rounded bg-brand-500/70" />
              <div className="mt-6 grid grid-cols-2 gap-2">
                {['Figma', 'Research', 'Systems', 'TS'].map((skill) => (
                  <div key={skill} className="rounded border border-slate-200 px-2 py-1.5 text-center text-[9px] font-semibold text-slate-600">
                    {skill}
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-2.5">
                <div className="h-2 w-20 rounded bg-slate-800" />
                <div className="h-1.5 w-full rounded bg-slate-200" />
                <div className="h-1.5 w-[92%] rounded bg-slate-200" />
                <div className="h-1.5 w-[80%] rounded bg-slate-200" />
              </div>
              <div className="mt-7 flex items-center gap-2 rounded-lg bg-slate-50 p-2.5">
                <Sparkles size={13} className="text-brand-500" />
                <div className="h-1.5 flex-1 rounded bg-slate-200" />
              </div>
            </div>
            <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-white/80 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400" /> One profile. Every document.
            </div>
          </div>
          <p className="max-w-[42ch] font-serif text-2xl leading-snug text-white/90">
            “Your experience is already there. LEAF helps you tell it clearly.”
          </p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/55">
            {['Real A4 PDFs', 'QR sharing', 'Private by default'].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                <Check size={12} className="text-teal-400" /> {item}
              </span>
            ))}
          </div>
        </div>

        <p className="relative text-xs leading-5 text-white/40">
          LEAF does not sell your documents. Publishing and sharing are always explicit choices you control.
        </p>
      </aside>
    </div>
  )
}

export function usePageTitle(title: string) {
  useEffect(() => {
    const previous = document.title
    document.title = `${title} — LEAF`
    return () => {
      document.title = previous
    }
  }, [title])
}
