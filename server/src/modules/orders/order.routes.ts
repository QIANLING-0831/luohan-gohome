import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authentication.js'
import { cancelOrder, createOrder, listOrders, reviewOrder } from './order.service.js'

export const orderRouter = Router()
orderRouter.use(authenticate)

orderRouter.get('/', async (req, res, next) => {
  try { res.json({ data: await listOrders(req.auth!.sub) }) } catch (error) { next(error) }
})

orderRouter.post('/', async (req, res, next) => {
  try {
    const input = z.object({
      technicianId: z.number().int().positive(), serviceId: z.string().min(1), dateLabel: z.string().min(1), dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      time: z.string().regex(/^\d{2}:\d{2}$/), intensity: z.string().min(1), paymentMethod: z.string().min(1),
      address: z.object({ label: z.string().min(1), detail: z.string().min(1) }), note: z.string().optional(),
      discount: z.number().int().nonnegative().optional(), couponLabel: z.string().optional(),
      requestId: z.string().regex(/^[A-Za-z0-9-]{8,80}$/).optional(),
    }).parse(req.body)
    res.status(201).json({ data: await createOrder(req.auth!.sub, input) })
  } catch (error) { next(error) }
})

orderRouter.post('/:id/cancel', async (req, res, next) => {
  try { await cancelOrder(req.auth!.sub, req.params.id); res.status(204).end() } catch (error) { next(error) }
})

orderRouter.post('/:id/review', async (req, res, next) => {
  try { const { rating, tags, text } = z.object({ rating: z.number().int().min(1).max(5), tags: z.array(z.enum(['手法专业', '准时到达', '沟通细致', '环境整洁', '力度合适', '值得推荐'])).max(4).default([]), text: z.string().trim().max(300).default('') }).parse(req.body); res.json({ data: await reviewOrder(req.auth!.sub, req.params.id, rating, tags, text) }) }
  catch (error) { next(error) }
})
