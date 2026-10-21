import { Link } from 'react-router-dom'
import { cn } from '../../lib/utils'

export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="rgb(var(--primary))" />
      <path
        d="M43.8 18.6c-9.9.2-17.7 3.5-21.7 9.3-3.5 5.1-2.6 11.9 2.2 15.4 4.6 3.4 11.1 2.5 14.5-2.2 3.5-4.9 3.7-12.2 1.2-20.9.3 7.4-.3 16.8-7.4 23.4"
        stroke="#fff"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M32.6 38.2c1.2-5.6 4.9-9.4 10.4-11.5" stroke="rgb(var(--accent))" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({ to = '/', className, compact = false }: { to?: string; className?: string; compact?: boolean }) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2.5 rounded-md focus-visible:outline-offset-4', className)} aria-label="LEAF home">
      <BrandMark size={32} />
      {!compact && (
        <span className="text-[1.15rem] font-black tracking-[0.16em] text-ink">
          LEAF<span className="text-primary">.</span>
        </span>
      )}
    </Link>
  )
}
