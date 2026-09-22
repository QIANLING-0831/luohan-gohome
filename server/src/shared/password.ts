import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const derived = await scrypt(password, salt, 64) as Buffer
  return `scrypt:${salt}:${derived.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, hex] = stored.split(':')
  if (algorithm !== 'scrypt' || !salt || !hex) return false
  const expected = Buffer.from(hex, 'hex')
  if (expected.length !== 64) return false
  const actual = await scrypt(password, salt, 64) as Buffer
  return timingSafeEqual(actual, expected)
}
