import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface MenuItem {
  label: string
  icon?: ReactNode
  onClick?: () => void
  href?: string
  danger?: boolean
  disabled?: boolean
  separator?: boolean
}

export function ActionMenu({
  items,
  label = 'More actions',
  trigger,
  align = 'end',
  className,
}: {
  items: MenuItem[]
  label?: string
  trigger?: ReactNode
  align?: 'start' | 'end'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')
    window.setTimeout(() => first?.focus(), 20)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className={cn('relative inline-flex', className)}>
      <button
        ref={buttonRef}
        type="button"
        className={trigger ? 'inline-flex' : 'icon-btn'}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setOpen(true)
          }
        }}
      >
        {trigger || <MoreHorizontal size={18} />}
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          className={cn(
            'absolute top-[calc(100%+4px)] z-40 min-w-[190px] rounded-lg border border-line bg-surface p-1.5 shadow-lift',
            align === 'end' ? 'right-0' : 'left-0',
          )}
          onKeyDown={(event) => {
            const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') || [])
            const index = items.indexOf(document.activeElement as HTMLElement)
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              items[(index + 1) % items.length]?.focus()
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              items[(index - 1 + items.length) % items.length]?.focus()
            } else if (event.key === 'Tab') {
              setOpen(false)
            }
          }}
        >
          {items.map((item, index) =>
            item.separator ? (
              <div key={`sep-${index}`} role="separator" className="my-1 h-px bg-line" />
            ) : item.href ? (
              <a
                key={item.label}
                role="menuitem"
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition hover:bg-raised',
                  item.danger ? 'text-danger' : 'text-ink',
                  item.disabled && 'pointer-events-none opacity-40',
                )}
                onClick={() => setOpen(false)}
              >
                {item.icon}
                {item.label}
              </a>
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition hover:bg-raised disabled:pointer-events-none disabled:opacity-40',
                  item.danger ? 'text-danger' : 'text-ink',
                )}
                onClick={() => {
                  setOpen(false)
                  item.onClick?.()
                }}
              >
                {item.icon}
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}
