import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authentication.js'
import { database } from '../../shared/database.js'

export const profileRouter = Router()
profileRouter.use(authenticate)

profileRouter.get('/', async (req, res, next) => {
  try {
    const user = await database.user.findUniqueOrThrow({ where: { id: req.auth!.sub }, include: { favorites: true, pointRecords: { orderBy: { createdAt: 'desc' }, take: 20 } } })
    res.json({ data: { name: user.name, phone: user.phone, points: user.points, preferences: JSON.parse(user.preferences), favoriteIds: user.favorites.map((item) => item.technicianId), pointRecords: user.pointRecords } })
  } catch (error) { next(error) }
})

profileRouter.put('/preferences', async (req, res, next) => {
  try {
    const { preferences } = z.object({ preferences: z.array(z.string()).max(10) }).parse(req.body)
    await database.user.update({ where: { id: req.auth!.sub }, data: { preferences: JSON.stringify(preferences) } })
    res.json({ data: { preferences } })
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
