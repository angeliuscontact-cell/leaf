import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  type: ToastType
  title: string
  message?: string
}

interface ToastContextValue {
  addToast: (toast: { type?: ToastType; title: string; message?: string; duration?: number }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const reduced = useReducedMotion()

  const remove = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const addToast = useCallback(
    ({ type = 'info', title, message, duration }: { type?: ToastType; title: string; message?: string; duration?: number }) => {
      const id = nextId.current++
      setItems((current) => [...current.slice(-3), { id, type, title, message }])
      const ms = duration ?? (type === 'error' ? 7000 : 4200)
      timers.current.set(id, setTimeout(() => remove(id), ms))
    },
    [remove],
  )

  const value = useMemo(() => ({ addToast }), [addToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[120] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:items-end">
          <AnimatePresence initial={false}>
            {items.map((item) => {
              const Icon = icons[item.type]
              return (
                <motion.div
                  key={item.id}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, x: 20, scale: 0.98 }}
                  transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
                  className="toast"
                  role={item.type === 'error' ? 'alert' : 'status'}
                  aria-live={item.type === 'error' ? 'assertive' : 'polite'}
                >
                  <Icon
                    size={18}
                    className={
                      item.type === 'success' ? 'mt-0.5 text-emerald-600 dark:text-emerald-400' : item.type === 'error' ? 'mt-0.5 text-danger' : 'mt-0.5 text-primary'
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{item.title}</p>
                    {item.message && <p className="mt-0.5 text-xs leading-5 text-muted">{item.message}</p>}
                  </div>
                  <button type="button" className="icon-btn -mr-1 -mt-1 h-7 w-7" aria-label="Dismiss notification" onClick={() => remove(item.id)}>
                    <X size={15} />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
