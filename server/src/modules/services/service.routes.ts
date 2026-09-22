import { Router } from 'express'
import { database } from '../../shared/database.js'

export const serviceRouter = Router()
serviceRouter.get('/', async (_req, res, next) => {
  try { const services = await database.service.findMany({ where: { active: true }, orderBy: { name: 'asc' } }); res.json({ data: services.map((item) => ({ id: item.id, name: item.name, desc: item.description, price: item.price, duration: item.duration })) }) }
  catch (error) { next(error) }
})
