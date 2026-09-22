import { createHash } from 'node:crypto'

export function sessionVersion(passwordHash: string | null | undefined) {
  return createHash('sha256').update(passwordHash ?? '').digest('base64url').slice(0, 16)
}
