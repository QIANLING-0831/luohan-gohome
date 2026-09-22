import jwt from 'jsonwebtoken'
import { database } from '../../shared/database.js'
import { AppError } from '../../shared/errors.js'
import { hashPassword, verifyPassword } from '../../shared/password.js'

const demoPhones = new Set(['13800138000', '13900139000', '13700137000'])

export async function login(phone: string, method: 'code' | 'password', credential: string) {
  const user = await database.user.findUnique({ where: { phone } })
  if (!user) throw new AppError(401, '账号或凭据不正确', 'INVALID_CREDENTIALS')
  if (method === 'code') {
    if (!demoPhones.has(phone) || user.role === 'ADMIN' || credential !== (process.env.DEMO_LOGIN_CODE ?? '888888')) {
      throw new AppError(401, '演示验证码不正确或该账号仅支持密码登录', 'INVALID_CREDENTIALS')
    }
  } else if (!user.passwordHash || !await verifyPassword(credential, user.passwordHash)) {
    throw new AppError(401, '账号或密码不正确', 'INVALID_CREDENTIALS')
  }
  const secret = process.env.JWT_SECRET
  if (process.env.NODE_ENV === 'production' && (!secret || secret.length < 32)) throw new AppError(503, '服务端登录配置未完成', 'AUTH_NOT_CONFIGURED')
  const token = jwt.sign({ sub: user.id, role: user.role }, secret ?? 'luohan-development-secret', { expiresIn: '7d' })
  return { token, user: { id: user.id, phone: user.phone, name: user.name, role: user.role } }
}

export async function register(name: string, phone: string, password: string) {
  if (await database.user.findUnique({ where: { phone } })) throw new AppError(409, '该手机号已经注册，请直接登录')
  await database.user.create({ data: { name, phone, passwordHash: await hashPassword(password), role: 'USER', points: 0, preferences: '[]' } })
  return login(phone, 'password', password)
}
