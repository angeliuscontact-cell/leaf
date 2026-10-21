import { readFile } from 'node:fs/promises'
import { extname, join, basename } from 'node:path'
import { env } from './env'

/** Reads an uploaded photo and returns a data URI for the PDF renderer. */
export async function photoDataUri(photoUrl: string | undefined): Promise<string | undefined> {
  if (!photoUrl) return undefined
  if (photoUrl.startsWith('data:image/')) return photoUrl
  if (!photoUrl.startsWith('/uploads/')) return undefined
  const name = basename(photoUrl)
  if (!/^[a-f0-9]{24}\.(png|jpg|jpeg|webp)$/i.test(name)) return undefined
  try {
    const buffer = await readFile(join(process.cwd(), env.uploadsDir, name))
    const ext = extname(name).toLowerCase()
    const type = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
    return `data:${type};base64,${buffer.toString('base64')}`
  } catch {
    return undefined
  }
}
