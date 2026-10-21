import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'public', 'fonts')
mkdirSync(out, { recursive: true })

const files = [
  ['@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', 'inter-latin.woff2'],
  ['@fontsource-variable/inter/files/inter-latin-wght-italic.woff2', 'inter-latin-italic.woff2'],
  ['@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2', 'inter-latin-ext.woff2'],
  ['@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2', 'source-serif-latin.woff2'],
  ['@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-italic.woff2', 'source-serif-latin-italic.woff2'],
  ['@fontsource-variable/source-serif-4/files/source-serif-4-latin-ext-wght-normal.woff2', 'source-serif-latin-ext.woff2'],
]

for (const [from, to] of files) {
  copyFileSync(join(root, 'node_modules', from), join(out, to))
  console.log(`copied ${to}`)
}
