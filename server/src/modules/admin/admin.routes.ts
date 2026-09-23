import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authentication.js'
import { authorize } from '../../middleware/authorization.js'
import { archiveTechnician, bindTechnicianAccount, createService, createTechnician, getDashboard, listAdminOrders, listAdminServices, listAdminTechnicians, listAdminUsers, resetTechnicianPassword, restoreTechnician, setServiceActive, setTechnicianActive, updateTechnicianProfile } from './admin.service.js'

export const adminRouter = Router()
adminRouter.use(authenticate, authorize('ADMIN'))

adminRouter.get('/dashboard', async (req, res, next) => {
  try { const days = Math.max(0, Math.min(365, Number(req.query.days ?? 30))); res.json({ data: await getDashboard(days) }) } catch (error) { next(error) }
})
adminRouter.get('/orders', async (_req, res, next) => {
  try { res.json({ data: await listAdminOrders() }) } catch (error) { next(error) }
})
adminRouter.get('/users', async (_req, res, next) => {
  try { res.json({ data: await listAdminUsers() }) } catch (error) { next(error) }
})
adminRouter.get('/technicians', async (_req, res, next) => {
  try { res.json({ data: await listAdminTechnicians() }) } catch (error) { next(error) }
})
adminRouter.get('/services', async (_req, res, next) => {
  try { res.json({ data: await listAdminServices() }) } catch (error) { next(error) }
})
adminRouter.post('/services', async (req, res, next) => {
  try { const input = z.object({ name: z.string().trim().min(2).max(30), description: z.string().trim().min(4).max(100), price: z.number().int().min(1).max(9999), duration: z.number().int().min(15).max(240) }).parse(req.body); res.status(201).json({ data: await createService(input) }) }
  catch (error) { next(error) }
})
adminRouter.patch('/services/:id', async (req, res, next) => {
  try { const { active } = z.object({ active: z.boolean() }).parse(req.body); res.json({ data: await setServiceActive(String(req.params.id), active) }) }
  catch (error) { next(error) }
})
adminRouter.post('/technicians', async (req, res, next) => {
  try {
    const input = z.object({
      name: z.string().trim().min(2).max(20), phone: z.string().regex(/^1\d{10}$/), password: z.string().min(6).max(64), title: z.string().trim().min(2).max(30),
      price: z.number().int().min(99).max(1999), experienceYears: z.number().int().min(0).max(60), imageKey: z.string().refine((value) => value.startsWith('data:image/') && validPortrait(value), '新增技师必须上传 100 KB 内的头像照片'),
      intro: z.string().trim().min(2).max(300), serviceIds: z.array(z.string()).min(1), workStart: z.string().regex(/^\d{2}:\d{2}$/), workEnd: z.string().regex(/^\d{2}:\d{2}$/), workDays: z.array(z.number().int().min(0).max(6)).min(1),
    }).refine((value) => value.workStart < value.workEnd, { message: '接单结束时间必须晚于开始时间' }).parse(req.body)
    res.status(201).json({ data: await createTechnician(req.auth!.sub, input) })
  } catch (error) { next(error) }
})
adminRouter.delete('/technicians/:id', async (req, res, next) => {
  try { res.json({ data: await archiveTechnician(req.auth!.sub, Number(req.params.id)) }) } catch (error) { next(error) }
})
adminRouter.patch('/technicians/:id/restore', async (req, res, next) => {
  try { res.json({ data: await restoreTechnician(req.auth!.sub, Number(req.params.id)) }) } catch (error) { next(error) }
})
adminRouter.post('/technicians/:id/reset-password', async (req, res, next) => {
  try { const { password } = z.object({ password: z.string().min(6).max(64) }).parse(req.body); res.json({ data: await resetTechnicianPassword(Number(req.params.id), password) }) }
  catch (error) { next(error) }
})
adminRouter.post('/technicians/:id/bind-account', async (req, res, next) => {
  try { const input = z.object({ phone: z.string().regex(/^1\d{10}$/), password: z.string().min(6).max(64) }).parse(req.body); res.status(201).json({ data: await bindTechnicianAccount(req.auth!.sub, Number(req.params.id), input) }) }
  catch (error) { next(error) }
})
adminRouter.patch('/technicians/:id/status', authorize('ADMIN'), async (req, res, next) => {
  try {
    const { active } = z.object({ active: z.boolean() }).parse(req.body)
    res.json({ data: await setTechnicianActive(req.auth!.sub, Number(req.params.id), active) })
  } catch (error) { next(error) }
})
adminRouter.patch('/technicians/:id', authorize('ADMIN'), async (req, res, next) => {
  try {
    const input = z.object({ title: z.string().trim().min(2).max(30), price: z.number().int().min(99).max(1999), experienceYears: z.number().int().min(0).max(60), imageKey: z.string().refine(validPortrait, '头像格式无效或超过 100 KB').optional(), serviceIds: z.array(z.string()).min(1), workStart: z.string().regex(/^\d{2}:\d{2}$/), workEnd: z.string().regex(/^\d{2}:\d{2}$/), workDays: z.array(z.number().int().min(0).max(6)).min(1) }).refine((value) => value.workStart < value.workEnd, { message: '接单结束时间必须晚于开始时间' }).parse(req.body)
    res.json({ data: await updateTechnicianProfile(req.auth!.sub, Number(req.params.id), input) })
  } catch (error) { next(error) }
})

function validPortrait(value: string) { return ['default', 'chen', 'zhou', 'lin'].includes(value) || /^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(value) && Buffer.byteLength(value.split(',')[1], 'base64') <= 100 * 1024 }
