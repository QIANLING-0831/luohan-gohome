import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authentication.js'
import { database } from '../../shared/database.js'

export const profileRouter = Router()
profileRouter.use(authenticate)
function accountData(value: string) { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? { preferences: parsed as string[], addresses: [] } : { preferences: Array.isArray(parsed.preferences) ? parsed.preferences as string[] : [], addresses: Array.isArray(parsed.addresses) ? parsed.addresses : [] } } catch { return { preferences: [], addresses: [] } } }

profileRouter.get('/', async (req, res, next) => {
  try {
    const user = await database.user.findUniqueOrThrow({ where: { id: req.auth!.sub }, include: { favorites: true, pointRecords: { orderBy: { createdAt: 'desc' }, take: 20 } } })
    const data = accountData(user.preferences)
    res.json({ data: { name: user.name, phone: user.phone, points: user.points, preferences: data.preferences, addresses: data.addresses, favoriteIds: user.favorites.map((item) => item.technicianId), pointRecords: user.pointRecords } })
  } catch (error) { next(error) }
})

profileRouter.put('/preferences', async (req, res, next) => {
  try {
    const { preferences } = z.object({ preferences: z.array(z.string()).max(10) }).parse(req.body)
    const user = await database.user.findUniqueOrThrow({ where: { id: req.auth!.sub } }); const data = accountData(user.preferences)
    await database.user.update({ where: { id: req.auth!.sub }, data: { preferences: JSON.stringify({ ...data, preferences }) } })
    res.json({ data: { preferences } })
  } catch (error) { next(error) }
})

profileRouter.put('/addresses', async (req, res, next) => {
  try {
    const input = z.object({ addresses: z.array(z.object({ id: z.string().max(40), label: z.string().trim().min(2).max(40), detail: z.string().trim().min(5).max(120), isDefault: z.boolean().optional() })).max(5) }).parse(req.body)
    const user = await database.user.findUniqueOrThrow({ where: { id: req.auth!.sub } }); const data = accountData(user.preferences)
    const addresses = input.addresses.map((item, index) => ({ ...item, isDefault: Boolean(item.isDefault) || !input.addresses.some((value) => value.isDefault) && index === 0 })).map((item, index, all) => ({ ...item, isDefault: item.isDefault && all.findIndex((value) => value.isDefault) === index }))
    await database.user.update({ where: { id: req.auth!.sub }, data: { preferences: JSON.stringify({ ...data, addresses }) } })
    res.json({ data: { addresses } })
  } catch (error) { next(error) }
})

profileRouter.put('/favorites/:technicianId', async (req, res, next) => {
  try {
    const technicianId = Number(req.params.technicianId)
    const key = { userId_technicianId: { userId: req.auth!.sub, technicianId } }
    const existing = await database.favorite.findUnique({ where: key })
    if (existing) await database.favorite.delete({ where: key })
    else await database.favorite.create({ data: key.userId_technicianId })
    res.json({ data: { favorite: !existing } })
  } catch (error) { next(error) }
})
