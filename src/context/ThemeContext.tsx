import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import { useAuth } from './AuthContext'

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  mode: ThemeMode
  isDark: boolean
  setMode: (mode: ThemeMode) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function systemDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function readStoredMode(): ThemeMode {
  try {
    const value = localStorage.getItem('leaf-theme')
    if (value === 'light' || value === 'dark' || value === 'system') return value
  } catch {
    /* ignore */
  }
  return 'system'
}

export function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  const dark = mode === 'dark' || (mode === 'system' && systemDark())
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.dataset.themeMode = mode
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? '#0b1220' : '#f5f5f5')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode)
  const [isDark, setIsDark] = useState(() => mode === 'dark' || (mode === 'system' && systemDark()))
  const appliedForUser = useRef<number | null>(null)

  const commit = useCallback((next: ThemeMode, sync: boolean) => {
    setModeState(next)
    try {
      localStorage.setItem('leaf-theme', next)
    } catch {
      /* private mode */
    }
    applyTheme(next)
    setIsDark(next === 'dark' || (next === 'system' && systemDark()))
    if (sync && user) {
      void api.patch('/auth/account', { theme: next }).catch(() => undefined)
    }
  }, [user])

  const setMode = useCallback((next: ThemeMode) => commit(next, true), [commit])
  const toggle = useCallback(() => commit(isDark ? 'light' : 'dark', true), [commit, isDark])

  useEffect(() => {
    applyTheme(mode)
  }, [mode])

  // On sign-in, apply the preference saved with the account once.
  useEffect(() => {
    if (user && appliedForUser.current !== user.id) {
      appliedForUser.current = user.id
      if (user.theme !== mode) commit(user.theme, false)
    }
    if (!user) appliedForUser.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (mode === 'system') {
        applyTheme('system')
        setIsDark(systemDark())
      }
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [mode])

  const value = useMemo(() => ({ mode, isDark, setMode, toggle }), [mode, isDark, setMode, toggle])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}
