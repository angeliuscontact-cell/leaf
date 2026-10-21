import { createApp } from './app'
import { env } from './env'
import { getDb } from './db'
import { closePdfBrowser } from './pdf'

getDb()

const app = createApp()
const server = app.listen(env.port, () => {
  console.log(`[leaf] API ready at http://localhost:${env.port}`)
  console.log(`[leaf] public URLs: ${env.publicUrl}`)
  console.log(`[leaf] AI: ${env.ai.apiKey ? `configured (${env.ai.model})` : 'not configured — manual editing remains available'}`)
  if (!env.mail.resendKey) console.log('[leaf] email: development console mode (set RESEND_API_KEY to deliver mail)')
  if (!env.isProd) console.log('[leaf] dev shortcuts: verification and reset links are returned by the API and logged to this console')
})

function shutdown(signal: string) {
  console.log(`\n[leaf] ${signal} — shutting down`)
  server.close(() => {
    closePdfBrowser().finally(() => process.exit(0))
  })
  setTimeout(() => process.exit(1), 8000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
