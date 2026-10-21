import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../../context/AuthContext'
import { BrandMark } from '../ui/Logo'
import { Spinner } from '../ui/Feedback'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas">
        <BrandMark size={42} />
        <div className="flex items-center gap-2 text-sm text-muted">
          <Spinner size={16} /> Opening your workspace…
        </div>
      </div>
    )
  }
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  return <>{children}</>
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas">
        <Spinner size={22} className="text-primary" />
      </div>
    )
  }
  if (user) return <Navigate to="/app" replace />
  return <>{children}</>
}
