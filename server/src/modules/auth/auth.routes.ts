import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authentication.js'
import { database } from '../../shared/database.js'
import { changePassword, login, register } from './auth.service.js'

export const authRouter = Router()

authRouter.post('/register', async (req, res, next) => {
  try { const input = z.object({ name: z.string().trim().min(2).max(20), phone: z.string().regex(/^1\d{10}$/, '请输入正确的手机号'), password: z.string().min(6).max(64) }).parse(req.body); res.status(201).json({ data: await register(input.name, input.phone, input.password) }) }
  catch (error) { next(error) }
})

authRouter.post('/login', async (req, res, next) => {
  try {
    const input = z.object({ phone: z.string().regex(/^1\d{10}$/, '请输入正确的手机号'), method: z.enum(['code', 'password']), credential: z.string().min(4).max(128) }).parse(req.body)
    res.json({ data: await login(input.phone, input.method, input.credential) })
  } catch (error) { next(error) }
})

authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await database.user.findUniqueOrThrow({ where: { id: req.auth!.sub } })
    res.json({ data: { id: user.id, phone: user.phone, name: user.name, role: user.role } })
  } catch (error) { next(error) }
})

authRouter.put('/password', authenticate, async (req, res, next) => {
  try {
    const input = z.object({ currentPassword: z.string().min(6).max(64), newPassword: z.string().min(6).max(64) }).parse(req.body)
    res.json({ data: await changePassword(req.auth!.sub, input.currentPassword, input.newPassword) })
  } catch (error) { next(error) }
})
