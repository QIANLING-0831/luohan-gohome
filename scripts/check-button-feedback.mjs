import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const components = join(process.cwd(), 'src', 'components')
const missing = []

for (const file of readdirSync(components).filter((name) => name.endsWith('.tsx'))) {
  const source = readFileSync(join(components, file), 'utf8')
  for (const match of source.matchAll(/<button\b([^>]*)>/gis)) {
    if (!/onClick\s*=/.test(match[1])) {
      const line = source.slice(0, match.index).split('\n').length
      missing.push(`${file}:${line}`)
    }
  }
}

if (missing.length) {
  console.error(`Buttons without click feedback:\n${missing.join('\n')}`)
  process.exit(1)
}

console.log('PASS: every rendered button has click feedback')
