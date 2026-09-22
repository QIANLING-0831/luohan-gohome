import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { AppError } from '../shared/errors.js'
import { database } from '../shared/database.js'
import { sessionVersion } from '../shared/session-version.js'

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return next(new AppError(401, '请先登录', 'UNAUTHENTICATED'))
  try {
    const secret = process.env.JWT_SECRET
    if (process.env.NODE_ENV === 'production' && (!secret || secret.length < 32)) throw new Error('Missing JWT secret')
    const payload = jwt.verify(token, secret ?? 'luohan-development-secret') as Request['auth']
    const user = await database.user.findUnique({ where: { id: payload?.sub } })
    if (!user || user.role !== payload?.role || payload.ver !== sessionVersion(user.passwordHash)) throw new Error('Stale session')
    req.auth = payload
    next()
  } catch {
    next(new AppError(401, '登录状态已失效，请重新登录', 'TOKEN_EXPIRED'))
  }
}
