import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute, GuestOnly } from './components/layout/Routes'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { Home } from './pages/public/Home'
import { SharedCV } from './pages/public/SharedCV'
import { PublicLandingPage } from './pages/public/PublicLandingPage'
import { LegalPage } from './pages/public/Legal'
import { NotFound } from './pages/public/NotFound'
import { Login, Register, ForgotPassword, ResetPassword, VerifyEmail } from './pages/auth/AuthPages'
import { DashboardHome } from './pages/app/DashboardHome'
import { CVDocuments } from './pages/app/CVDocuments'
import { LetterDocuments } from './pages/app/LetterDocuments'
import { LandingDocuments } from './pages/app/LandingDocuments'
import { ProfilePage } from './pages/app/ProfilePage'
import { SettingsPage } from './pages/app/SettingsPage'
import { AssistantPage } from './pages/app/AssistantPage'
import { CVEditor } from './pages/app/CVEditor'
import { LetterEditor } from './pages/app/LetterEditor'
import { LandingEditor } from './pages/app/LandingEditor'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/cv/:shareId" element={<SharedCV />} />
      <Route path="/p/:slug" element={<PublicLandingPage />} />
      <Route path="/privacy" element={<LegalPage kind="privacy" />} />
      <Route path="/terms" element={<LegalPage kind="terms" />} />

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="cvs" element={<CVDocuments />} />
        <Route path="cvs/:id" element={<CVEditor />} />
        <Route path="letters" element={<LetterDocuments />} />
        <Route path="letters/:id" element={<LetterEditor />} />
        <Route path="pages" element={<LandingDocuments />} />
        <Route path="pages/:id" element={<LandingEditor />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="assistant" element={<AssistantPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
