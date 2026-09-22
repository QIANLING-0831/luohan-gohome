import { Router } from 'express'
import { database } from '../../shared/database.js'

export const technicianRouter = Router()

function beijingSlot(date: Date) { const dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date); const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).map((item) => [item.type, item.value])); return `${dateKey}|${parts.hour}:${parts.minute}` }

technicianRouter.get('/', async (_req, res, next) => {
  try {
    const technicians = await database.technician.findMany({ where: { active: true, archivedAt: null }, orderBy: { id: 'asc' }, include: { services: { include: { service: true } } } })
    res.json({ data: technicians.filter((item) => item.services.some((link) => link.service.active)).map((item) => ({
      id: item.id, name: item.name, title: item.title, rating: item.rating, orders: item.orderCount,
      lat: item.latitude, lng: item.longitude, price: item.price, imageKey: item.imageKey, intro: item.intro,
      serviceIds: item.services.filter((link) => link.service.active).map((link) => link.serviceId), experienceYears: item.experienceYears,
      onTimeRate: item.arrivalTotal ? Math.round(item.onTimeArrivals / item.arrivalTotal * 100) : 100,
      workStart: item.workStart, workEnd: item.workEnd, workDays: JSON.parse(item.workDays) as number[],
    })) })
  } catch (error) { next(error) }
})

technicianRouter.get('/:id/availability', async (req, res, next) => {
  try { const technicianId = Number(req.params.id); const [technician, orders] = await Promise.all([database.technician.findFirstOrThrow({ where: { id: technicianId, active: true, archivedAt: null } }), database.order.findMany({ where: { technicianId, status: { not: 'CANCELLED' } }, select: { appointmentAt: true } })]); res.json({ data: { occupied: orders.map((item) => beijingSlot(item.appointmentAt)), workStart: technician.workStart, workEnd: technician.workEnd, workDays: JSON.parse(technician.workDays) as number[] } }) }
  catch (error) { next(error) }
})

technicianRouter.get('/:id', async (req, res, next) => {
  try {
    const technician = await database.technician.findUniqueOrThrow({
      where: { id: Number(req.params.id) }, include: { services: { include: { service: true } } },
    })
    res.json({ data: technician })
  } catch (error) { next(error) }
})
