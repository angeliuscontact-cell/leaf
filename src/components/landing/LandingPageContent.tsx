import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  CalendarDays,
  Download,
  Github,
  Globe2,
  GraduationCap,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Sparkles,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { DEFAULT_LANDING_SECTIONS } from '../../../shared/templates'
import type {
  CVCertification,
  CVEducation,
  CVExperience,
  CVProject,
  CVSkill,
  LandingData,
  LandingPageDocument,
  LandingSection,
} from '../../../shared/types'

type LandingPageLike = Pick<
  LandingPageDocument,
  'title' | 'template' | 'primaryColor' | 'secondaryColor' | 'accentColor' | 'font'
> & { data: LandingData }

function safeColor(value: string | undefined, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value || '') ? (value as string) : fallback
}

function rgba(hex: string, alpha: number) {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function externalUrl(value: string, kind: 'website' | 'social' | 'link' = 'link') {
  const raw = (value || '').trim()
  if (!raw) return ''
  if (/^(https?:\/\/|mailto:|tel:)/i.test(raw)) {
    try {
      const parsed = new URL(raw)
      if (['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) return raw
    } catch {
      return ''
    }
  }
  if (!['website', 'social', 'link'].includes(kind)) return ''
  const withProtocol = `https://${raw.replace(/^\/+/, '')}`
  try {
    const parsed = new URL(withProtocol)
    return parsed.hostname.includes('.') ? withProtocol : ''
  } catch {
    return ''
  }
}

function displayUrl(value: string) {
  return (value || '').replace(/^https?:\/\//i, '').replace(/\/$/, '')
}

function dateRange(start: string, end: string, current = false) {
  const to = current ? 'Present' : end
  return [start, to].filter(Boolean).join(' — ')
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])
  return reduced
}

function Reveal({ children, className, enabled = true, delay = 0 }: { children: ReactNode; className?: string; enabled?: boolean; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const [visible, setVisible] = useState(!enabled || reduced)

  useEffect(() => {
    if (!enabled || reduced) {
      setVisible(true)
      return
    }
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [enabled, reduced])

  return (
    <div
      ref={ref}
      className={cn('landing-reveal', visible && 'is-visible', className)}
      style={{ '--reveal-delay': `${Math.min(delay, 320)}ms` } as CSSProperties}
    >
      {children}
    </div>
  )
}

function TiltPortrait({
  name,
  photoUrl,
  primary,
  accent,
  template,
  enabled,
}: {
  name: string
  photoUrl: string
  primary: string
  accent: string
  template: string
  enabled: boolean
}) {
  const reduced = useReducedMotion()
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const initials = (name || 'Your Name')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  const active = enabled && !reduced

  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <div
        className="absolute inset-6 rounded-[2.5rem] blur-2xl"
        style={{ background: rgba(primary, 0.28) }}
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative rounded-[2rem] border border-white/20 bg-white/95 p-3 shadow-[0_30px_80px_-30px_rgba(15,23,42,.55)] transition-transform duration-300 will-change-transform',
          template === 'student' && 'rotate-2',
        )}
        style={{
          transform: active ? `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` : undefined,
          transformStyle: 'preserve-3d',
        }}
        onPointerMove={
          active
            ? (event) => {
                const rect = event.currentTarget.getBoundingClientRect()
                const px = (event.clientX - rect.left) / rect.width - 0.5
                const py = (event.clientY - rect.top) / rect.height - 0.5
                setTilt({ x: -py * 8, y: px * 10 })
              }
            : undefined
        }
        onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem]" style={{ background: rgba(primary, 0.09) }}>
          {photoUrl ? (
            <img src={photoUrl} alt={`Portrait of ${name}`} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="font-serif text-[5.5rem] font-semibold leading-none" style={{ color: primary }}>
                {initials || 'L'}
              </span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/35 to-transparent" aria-hidden="true" />
        </div>
        <div className="flex items-center justify-between gap-3 px-3 py-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-slate-900">{name || 'Your name'}</p>
            <p className="mt-0.5 truncate text-[10px] text-slate-500">Personal portfolio</p>
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white" style={{ background: primary }}>
            <Sparkles size={13} />
          </span>
        </div>
      </div>
      <span
        className="absolute -right-5 -top-5 hidden h-16 w-16 items-center justify-center rounded-full text-white shadow-lg sm:flex"
        style={{ background: accent, transform: 'translateZ(30px)' }}
        aria-hidden="true"
      >
        <ArrowDownRight size={22} />
      </span>
    </div>
  )
}

function SectionTitle({ label, title, color, dark = false }: { label: string; title: string; color: string; dark?: boolean }) {
  return (
    <div className="max-w-2xl">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color }}>{label}</p>
      <h2 className={cn('mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl', dark ? 'text-white' : 'text-slate-900')}>{title}</h2>
    </div>
  )
}

function ExperienceList({ items, primary, accent }: { items: CVExperience[]; primary: string; accent: string }) {
  return (
    <div className="mt-8 space-y-0">
      {items.map((item, index) => {
        const bullets = item.description.split(/\r?\n/).map((line) => line.trim().replace(/^[-•*]\s*/, '')).filter(Boolean)
        return (
          <Reveal key={item.id || `${item.role}-${index}`} delay={index * 70} enabled>
            <article className="grid gap-4 border-t border-slate-200/80 py-7 sm:grid-cols-[170px_1fr]">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">{dateRange(item.startDate, item.endDate, item.current) || 'Dates'}</p>
                {item.location && <p className="mt-1 text-[11px] text-slate-400">{item.location}</p>}
              </div>
              <div>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="text-base font-bold text-slate-900">{item.role || 'Role'}</h3>
                  <span className="text-sm font-semibold" style={{ color: primary }}>{item.company || 'Company'}</span>
                </div>
                {bullets.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {bullets.map((bullet, i) => (
                      <li key={i} className="flex gap-2.5 text-[13px] leading-6 text-slate-600">
                        <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full" style={{ background: accent }} />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          </Reveal>
        )
      })}
    </div>
  )
}

function EducationList({ items, primary }: { items: CVEducation[]; primary: string }) {
  return (
    <div className="mt-7 grid gap-3 sm:grid-cols-2">
      {items.map((item, index) => (
        <Reveal key={item.id || `${item.institution}-${index}`} delay={index * 60} enabled>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <GraduationCap size={18} style={{ color: primary }} />
            <h3 className="mt-3 text-sm font-bold text-slate-900">{item.institution || 'Institution'}</h3>
            <p className="mt-1 text-xs text-slate-500">{[item.degree, item.field].filter(Boolean).join(', ')}</p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-slate-400">{dateRange(item.startDate, item.endDate)}</p>
            {item.details && <p className="mt-2 text-[11px] leading-5 text-slate-500">{item.details}</p>}
          </div>
        </Reveal>
      ))}
    </div>
  )
}

function ProjectList({ items, primary, accent }: { items: CVProject[]; primary: string; accent: string }) {
  return (
    <div className="mt-7 grid gap-4 sm:grid-cols-2">
      {items.map((item, index) => {
        const url = externalUrl(item.url)
        return (
          <Reveal key={item.id || `${item.name}-${index}`} delay={index * 60} enabled>
            <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="absolute inset-x-0 top-0 h-1" style={{ background: index % 2 === 0 ? primary : accent }} />
              <div className="flex items-start justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">{item.role || 'Project'}</span>
                {url && (
                  <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${item.name}`} className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition group-hover:border-transparent group-hover:text-white" style={{ background: 'transparent' }}>
                    <ArrowUpRight size={13} />
                  </a>
                )}
              </div>
              <h3 className="mt-3 font-serif text-2xl font-semibold text-slate-900">{item.name || 'Project'}</h3>
              {item.description && <p className="mt-2 flex-1 whitespace-pre-line text-[12px] leading-6 text-slate-500">{item.description}</p>}
              <p className="mt-4 font-mono text-[10px] uppercase tracking-wide text-slate-400">{dateRange(item.startDate, item.endDate)}</p>
            </article>
          </Reveal>
        )
      })}
    </div>
  )
}

function SkillsList({ items, primary, accent }: { items: CVSkill[]; primary: string; accent: string }) {
  return (
    <div className="mt-7 flex flex-wrap gap-2">
      {items.filter((item) => item.name.trim()).map((skill, index) => (
        <Reveal key={skill.id || `${skill.name}-${index}`} delay={index * 35} enabled>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700">
            <span className="flex gap-0.5" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((level) => (
                <span key={level} className="h-1.5 w-1.5 rounded-full" style={{ background: level <= skill.level ? primary : rgba(primary, 0.14) }} />
              ))}
            </span>
            {skill.name}
            <span className="sr-only">Level {skill.level} of 5</span>
            {skill.level >= 4 && <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />}
          </span>
        </Reveal>
      ))}
    </div>
  )
}

function CertificationsList({ items, primary }: { items: CVCertification[]; primary: string }) {
  return (
    <div className="mt-7 grid gap-3 sm:grid-cols-2">
      {items.map((item, index) => (
        <Reveal key={item.id || `${item.name}-${index}`} delay={index * 50} enabled>
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <Award size={17} className="mt-0.5 shrink-0" style={{ color: primary }} />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900">{item.name || 'Certification'}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">{item.issuer}{item.date ? ` · ${item.date}` : ''}</p>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  )
}

function ContactBlock({
  data,
  primary,
  accent,
  ownerName,
  cvShareUrl,
  mode,
  dark = false,
}: {
  data: LandingData
  primary: string
  accent: string
  ownerName: string
  cvShareUrl: string | null
  mode: 'preview' | 'public'
  dark?: boolean
}) {
  const contact = data.contact
  const emailHref = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) ? `mailto:${contact.email}` : ''
  const phoneHref = contact.phone ? `tel:${contact.phone.replace(/[^\d+().\s-]/g, '')}` : ''
  const links = [
    contact.email && { label: contact.email, href: emailHref, icon: Mail },
    contact.phone && { label: contact.phone, href: phoneHref, icon: Phone },
    contact.website && { label: displayUrl(contact.website), href: externalUrl(contact.website, 'website'), icon: Globe2 },
    contact.linkedin && { label: 'LinkedIn', href: externalUrl(contact.linkedin, 'social'), icon: Linkedin },
    contact.github && { label: 'GitHub', href: externalUrl(contact.github, 'social'), icon: Github },
  ].filter(Boolean) as Array<{ label: string; href: string; icon: typeof Mail }>
  const location = contact.location || data.hero.location

  return (
    <div className={cn('relative overflow-hidden rounded-[2rem] p-6 sm:p-10', dark ? 'text-white' : 'text-slate-900')} style={{ background: dark ? 'rgba(255,255,255,.06)' : rgba(primary, 0.055) }}>
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-20 blur-2xl" style={{ background: accent }} aria-hidden="true" />
      <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: dark ? accent : primary }}>Get in touch</p>
          <h2 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">Let’s make something useful.</h2>
          <p className={cn('mt-3 max-w-lg text-sm leading-6', dark ? 'text-white/65' : 'text-slate-500')}>
            The fastest way to reach {ownerName || 'me'} is email. I read every thoughtful message.
          </p>
          {location && (
            <p className={cn('mt-4 inline-flex items-center gap-1.5 text-xs', dark ? 'text-white/50' : 'text-slate-400')}>
              <MapPin size={13} /> {location}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {emailHref ? (
            <a href={emailHref} className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5" style={{ background: primary }}>
              <Mail size={15} /> Say hello
            </a>
          ) : (
            <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-300 px-5 text-sm font-semibold text-slate-500">
              <Mail size={15} /> {mode === 'preview' ? 'Add a contact email' : 'Contact details unavailable'}
            </span>
          )}
          {cvShareUrl && (
            <a href={cvShareUrl} className={cn('inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition hover:-translate-y-0.5', dark ? 'border-white/20 text-white' : 'border-slate-300 text-slate-700')}>
              <Download size={15} /> Download CV
            </a>
          )}
        </div>
      </div>
      {links.length > 0 && (
        <div className={cn('relative mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t pt-5', dark ? 'border-white/10' : 'border-slate-200')}>
          {links.map(({ label, href, icon: Icon }) => (
            <a
              key={`${label}-${href}`}
              href={href || undefined}
              target={href?.startsWith('http') ? '_blank' : undefined}
              rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
              className={cn('inline-flex items-center gap-1.5 text-xs transition', dark ? 'text-white/65 hover:text-white' : 'text-slate-500 hover:text-slate-900')}
            >
              <Icon size={13} /> {label}
            </a>
          ))}
        </div>
      )}
      {data.interestLine && <p className={cn('relative mt-5 text-[11px] italic', dark ? 'text-white/40' : 'text-slate-400')}>{data.interestLine}</p>}
    </div>
  )
}

function SectionContent({
  section,
  data,
  primary,
  accent,
  ownerName,
  cvShareUrl,
  mode,
  dark,
}: {
  section: LandingSection
  data: LandingData
  primary: string
  accent: string
  ownerName: string
  cvShareUrl: string | null
  mode: 'preview' | 'public'
  dark: boolean
}) {
  if (section.type === 'about') {
    const paragraphs = (data.about || '').split(/\n\s*\n/).filter(Boolean)
    return (
      <>
        <SectionTitle label="About" title={section.title || 'A little context'} color={dark ? accent : primary} dark={dark} />
        <div className={cn('mt-6 grid gap-8', paragraphs.length > 0 && 'lg:grid-cols-[1fr_260px]')}>
          <div className={cn('space-y-4 text-[14px] leading-7', dark ? 'text-white/70' : 'text-slate-600')}>
            {paragraphs.length ? paragraphs.map((p, i) => <p key={i}>{p}</p>) : <p className="text-slate-400">A short introduction will appear here.</p>}
          </div>
          <div className={cn('rounded-xl border p-4', dark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white')}>
            <p className={cn('text-[10px] font-bold uppercase tracking-[0.18em]', dark ? 'text-white/40' : 'text-slate-400')}>At a glance</p>
            <dl className="mt-3 space-y-2.5 text-xs">
              {data.hero.location && (
                <div className="flex items-start gap-2">
                  <MapPin size={13} className="mt-0.5 shrink-0" style={{ color: primary }} />
                  <span className={dark ? 'text-white/70' : 'text-slate-600'}>{data.hero.location}</span>
                </div>
              )}
              {data.experiences[0] && (
                <div className="flex items-start gap-2">
                  <CalendarDays size={13} className="mt-0.5 shrink-0" style={{ color: primary }} />
                  <span className={dark ? 'text-white/70' : 'text-slate-600'}>{data.experiences[0].role} at {data.experiences[0].company}</span>
                </div>
              )}
              {data.skills.length > 0 && (
                <div className="flex items-start gap-2">
                  <Sparkles size={13} className="mt-0.5 shrink-0" style={{ color: primary }} />
                  <span className={dark ? 'text-white/70' : 'text-slate-600'}>{data.skills.slice(0, 3).map((s) => s.name).join(' · ')}</span>
                </div>
              )}
            </dl>
          </div>
        </div>
      </>
    )
  }
  if (section.type === 'skills') {
    if (!data.skills.length) return null
    return (
      <>
        <SectionTitle label="Capabilities" title={section.title || 'What I work with'} color={dark ? accent : primary} dark={dark} />
        <SkillsList items={data.skills} primary={primary} accent={accent} />
      </>
    )
  }
  if (section.type === 'experience') {
    if (!data.experiences.length) return null
    return (
      <>
        <SectionTitle label="Experience" title={section.title || 'Where I’ve worked'} color={dark ? accent : primary} dark={dark} />
        <ExperienceList items={data.experiences} primary={primary} accent={accent} />
      </>
    )
  }
  if (section.type === 'education') {
    if (!data.education.length) return null
    return (
      <>
        <SectionTitle label="Education" title={section.title || 'Learning'} color={dark ? accent : primary} dark={dark} />
        <EducationList items={data.education} primary={primary} />
      </>
    )
  }
  if (section.type === 'projects') {
    if (!data.projects.length) return null
    return (
      <>
        <SectionTitle label="Selected work" title={section.title || 'Things I’ve made'} color={dark ? accent : primary} dark={dark} />
        <ProjectList items={data.projects} primary={primary} accent={accent} />
      </>
    )
  }
  if (section.type === 'certifications') {
    if (!data.certifications.length) return null
    return (
      <>
        <SectionTitle label="Credentials" title={section.title || 'Certifications'} color={dark ? accent : primary} dark={dark} />
        <CertificationsList items={data.certifications} primary={primary} />
      </>
    )
  }
  if (section.type === 'contact') {
    return (
      <ContactBlock
        data={data}
        primary={primary}
        accent={accent}
        ownerName={ownerName}
        cvShareUrl={cvShareUrl}
        mode={mode}
        dark={dark}
      />
    )
  }
  return (
    <>
      <SectionTitle label="More" title={section.title || 'Notes'} color={dark ? accent : primary} dark={dark} />
      <p className={cn('mt-4 max-w-2xl whitespace-pre-line text-sm leading-7', dark ? 'text-white/70' : 'text-slate-600')}>{section.body || ''}</p>
    </>
  )
}

export function LandingPageContent({
  page,
  ownerName = '',
  cvShareUrl = null,
  mode = 'preview',
  animate = false,
}: {
  page: LandingPageLike
  ownerName?: string
  cvShareUrl?: string | null
  mode?: 'preview' | 'public'
  animate?: boolean
}) {
  const data = page.data
  const hero = data.hero
  const primary = safeColor(page.primaryColor, '#1677ff')
  const secondary = safeColor(page.secondaryColor, '#0f3b66')
  const accent = safeColor(page.accentColor, '#13c2c2')
  const template = page.template
  const darkHero = template === 'creative' || template === 'developer'
  const serif = page.font === 'serif' || template === 'minimal' || template === 'executive'
  const sections = (Array.isArray(data.sections) && data.sections.length ? data.sections : DEFAULT_LANDING_SECTIONS).filter((section) => section.visible)
  const name = hero.headline || ownerName || page.title || 'Your Name'
  const navSections = sections.filter((section) => section.type !== 'contact' && section.type !== 'custom')
  const background =
    template === 'creative' ? '#f8f4f0' :
    template === 'developer' ? '#f2f6f5' :
    template === 'student' ? '#fffdf6' :
    template === 'minimal' ? '#faf9f6' :
    template === 'executive' ? '#f7f5f0' :
    '#ffffff'
  const contactEmail = data.contact.email
  const emailHref = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) ? `mailto:${contactEmail}` : ''

  const rootStyle = {
    '--landing-primary': primary,
    '--landing-secondary': secondary,
    '--landing-accent': accent,
    background,
    fontFamily: serif ? "'Source Serif 4 Variable', Georgia, serif" : "'Inter Variable', -apple-system, 'Segoe UI', sans-serif",
    colorScheme: 'light',
  } as CSSProperties

  return (
    <div className={cn('landing-page min-h-full w-full overflow-hidden', serif && 'landing-serif')} style={rootStyle} data-template={template}>
      <header className={cn('relative z-20', darkHero ? 'text-white' : 'text-slate-900')} style={darkHero ? { background: secondary } : undefined}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <a href="#top" className="inline-flex items-center gap-2.5" aria-label={`${name} — home`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-black text-white" style={{ background: primary }}>
              {(name || 'L').split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')}
            </span>
            <span className="text-sm font-bold tracking-tight">{name.split(/\s+/).slice(0, 2).join(' ')}<span style={{ color: accent }}>.</span></span>
          </a>
          <nav className="hidden items-center gap-6 md:flex" aria-label="Page sections">
            {navSections.slice(0, 4).map((section) => (
              <a key={section.id} href={`#${section.id}`} className={cn('text-[11px] font-semibold transition hover:opacity-70', darkHero ? 'text-white/60' : 'text-slate-500')}>
                {section.title}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {hero.availability && (
              <span className={cn('hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold sm:inline-flex', darkHero ? 'border-white/15 text-white/65' : 'border-slate-200 text-slate-500')}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
                {hero.availability}
              </span>
            )}
            {emailHref && (
              <a href={emailHref} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-[11px] font-bold text-white transition hover:-translate-y-0.5" style={{ background: primary }}>
                <Mail size={12} /> Contact
              </a>
            )}
          </div>
        </div>
      </header>

      <main id="top">
        <section className="relative overflow-hidden">
          {darkHero && (
            <div className="absolute inset-x-0 top-0 h-[520px]" style={{ background: secondary }} aria-hidden="true" />
          )}
          <div className={cn('relative mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-16', template === 'minimal' || template === 'executive' ? 'lg:grid-cols-[1fr_300px] lg:items-end' : 'lg:grid-cols-[1fr_360px] lg:items-center')}>
            <Reveal enabled={animate} className={cn(darkHero && 'text-white')}>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: darkHero ? accent : primary }}>{hero.eyebrow || 'Portfolio'}</p>
                  {hero.location && (
                    <span className={cn('inline-flex items-center gap-1 text-[10px]', darkHero ? 'text-white/45' : 'text-slate-400')}>
                      <MapPin size={11} /> {hero.location}
                    </span>
                  )}
                </div>
                <h1 className={cn('mt-4 max-w-3xl text-balance font-serif text-[2.8rem] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-[4.5rem]', darkHero ? 'text-white' : 'text-slate-900')}>
                  {hero.headline || 'Your name, in your own words.'}
                </h1>
                {hero.subheadline && (
                  <p className={cn('mt-5 max-w-xl text-pretty text-[15px] leading-7 sm:text-base', darkHero ? 'text-white/65' : 'text-slate-500')}>
                    {hero.subheadline}
                  </p>
                )}
                <div className="mt-7 flex flex-wrap items-center gap-2.5">
                  {emailHref ? (
                    <a href={emailHref} className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5" style={{ background: primary }}>
                      {hero.ctaLabel || 'Get in touch'} <ArrowUpRight size={15} />
                    </a>
                  ) : (
                    <a href="#contact" className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5" style={{ background: primary }}>
                      {hero.ctaLabel || 'Get in touch'} <ArrowUpRight size={15} />
                    </a>
                  )}
                  {data.projects.length > 0 && (
                    <a href="#projects" className={cn('inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition hover:-translate-y-0.5', darkHero ? 'border-white/20 text-white' : 'border-slate-300 text-slate-700')}>
                      View selected work
                    </a>
                  )}
                </div>
                {data.interestLine && (
                  <p className={cn('mt-6 text-[11px]', darkHero ? 'text-white/40' : 'text-slate-400')}>{data.interestLine}</p>
                )}
              </div>
            </Reveal>
            <Reveal enabled={animate} delay={100}>
              <TiltPortrait
                name={name}
                photoUrl={data.photoUrl}
                primary={primary}
                accent={accent}
                template={template}
                enabled={mode === 'public'}
              />
            </Reveal>
          </div>
          <div className={cn('h-px w-full', darkHero ? 'bg-white/10' : 'bg-slate-200/80')} aria-hidden="true" />
        </section>

        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          {sections.map((section, index) => {
            if (section.type === 'contact') {
              return (
                <Reveal key={section.id} enabled={animate} delay={40} className="py-12 sm:py-16">
                  <section id={section.id} className="scroll-mt-24">
                    <SectionContent section={section} data={data} primary={primary} accent={accent} ownerName={ownerName || name} cvShareUrl={cvShareUrl} mode={mode} dark={false} />
                  </section>
                </Reveal>
              )
            }
            const content = (
              <SectionContent section={section} data={data} primary={primary} accent={accent} ownerName={ownerName || name} cvShareUrl={cvShareUrl} mode={mode} dark={false} />
            )
            if (!content) return null
            return (
              <Reveal key={section.id} enabled={animate} delay={Math.min(index * 30, 140)}>
                <section id={section.id} className="scroll-mt-24 border-t border-slate-200/80 py-12 sm:py-16">
                  {content}
                </section>
              </Reveal>
            )
          })}

          {!sections.some((section) => section.type === 'contact') && (
            <div className="border-t border-slate-200/80 py-12 sm:py-16">
              <ContactBlock data={data} primary={primary} accent={accent} ownerName={ownerName || name} cvShareUrl={cvShareUrl} mode={mode} />
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-200/80 bg-white/50">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-[10px] text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>© {new Date().getFullYear()} {name}. {data.hero.availability || 'All rights reserved.'}</span>
          <a href={mode === 'public' ? '/' : undefined} className="inline-flex items-center gap-1 font-semibold text-slate-500 transition hover:text-slate-900">
            Built with LEAF <Sparkles size={11} />
          </a>
        </div>
      </footer>
    </div>
  )
}
