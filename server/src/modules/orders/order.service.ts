import { database } from '../../shared/database.js'
import { AppError } from '../../shared/errors.js'
import { nextOrderStatus } from '../../shared/order-status.js'
import { presentOrder } from './order.presenter.js'

export interface CreateOrderInput {
  technicianId: number
  serviceId: string
  dateLabel: string
  dateKey: string
  time: string
  intensity: string
  paymentMethod: string
  address: { label: string; detail: string }
  note?: string
  discount?: number
  couponLabel?: string
}

function appointmentDate(dateKey: string, time: string) { return new Date(`${dateKey}T${time}:00+08:00`) }

export async function createOrder(userId: string, input: CreateOrderInput) {
  const [technician, service] = await Promise.all([
    database.technician.findUnique({ where: { id: input.technicianId } }),
    database.service.findUnique({ where: { id: input.serviceId } }),
  ])
  if (!technician?.active || technician.archivedAt) throw new AppError(404, '技师不存在或暂不可预约')
  if (!service?.active) throw new AppError(404, '服务项目不存在或已下架')
  if (!await database.technicianService.findUnique({ where: { technicianId_serviceId: { technicianId: technician.id, serviceId: service.id } } })) throw new AppError(400, '该技师暂不提供此服务')
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const anchor = new Date(`${today}T00:00:00+08:00`)
  const allowed = Array.from({ length: 3 }, (_, index) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(anchor.getTime() + index * 86400000)))
  if (!allowed.includes(input.dateKey)) throw new AppError(400, '仅支持预约未来三天')
  const scheduledAt = appointmentDate(input.dateKey, input.time)
  if (scheduledAt.getTime() <= Date.now()) throw new AppError(400, '预约时间不能早于当前北京时间')
  const workDays = JSON.parse(technician.workDays) as number[]
  const weekday = new Date(`${input.dateKey}T12:00:00+08:00`).getUTCDay()
  if (!workDays.includes(weekday)) throw new AppError(409, '该技师当天休息，请选择其他日期')
  if (input.time < technician.workStart || input.time > technician.workEnd) throw new AppError(409, '所选时间不在该技师接单时段内')
  const conflict = await database.order.findFirst({
    where: { technicianId: technician.id, appointmentAt: scheduledAt, status: { not: 'CANCELLED' } },
  })
  if (conflict) throw new AppError(409, '该时段刚刚被预约，请选择其他时间', 'SLOT_UNAVAILABLE')
  const allowedCoupons: Record<string, number> = { '新客立减券': service.price >= 199 ? 30 : 0, '金卡会员券': 20, '不使用优惠券': 0 }
  const couponLabel = input.couponLabel && Object.hasOwn(allowedCoupons, input.couponLabel) ? input.couponLabel : '不使用优惠券'
  const discount = Math.min(service.price, allowedCoupons[couponLabel])
  const orderId = `LH${Date.now().toString().slice(-8)}`
  const order = await database.$transaction((tx) => tx.order.create({ data: {
    id: orderId, userId, technicianId: technician.id, serviceId: service.id,
    dateLabel: input.dateLabel, appointmentAt: scheduledAt, intensity: input.intensity,
    paymentMethod: input.paymentMethod, addressLabel: input.address.label, addressDetail: input.address.detail,
    note: input.note ?? '', originalPrice: service.price, discount, paidAmount: service.price - discount,
    couponLabel, statusLogs: { create: { status: 'PENDING' } },
  } }))
  return presentOrder(order)
}

export async function listOrders(userId: string) {
  return (await database.order.findMany({ where: { userId, status: { not: 'CANCELLED' } }, orderBy: { createdAt: 'desc' } })).map(presentOrder)
}

export async function advanceOrder(userId: string, orderId: string) {
  const order = await database.order.findFirst({ where: { id: orderId, userId } })
  if (!order) throw new AppError(404, '订单不存在')
  const next = nextOrderStatus(order.status)
  if (!next) throw new AppError(409, '订单已经完成，不能继续推进', 'INVALID_STATUS_TRANSITION')
  const updated = await database.$transaction(async (tx) => {
    const result = await tx.order.update({ where: { id: order.id }, data: { status: next } })
    await tx.orderStatusLog.create({ data: { orderId: order.id, status: next } })
    if (next === 'ARRIVED') await tx.technician.update({ where: { id: order.technicianId }, data: { arrivalTotal: { increment: 1 }, ...(Date.now() <= order.appointmentAt.getTime() + 15 * 60 * 1000 ? { onTimeArrivals: { increment: 1 } } : {}) } })
    if (next === 'COMPLETED') {
      const reward = Math.floor(order.paidAmount / 10)
      await tx.user.update({ where: { id: userId }, data: { points: { increment: reward } } })
      await tx.pointRecord.create({ data: { userId, amount: reward, reason: `完成订单 ${order.id}` } })
    }
    return result
  })
  return presentOrder(updated)
}

export async function cancelOrder(userId: string, orderId: string) {
  const order = await database.order.findFirst({ where: { id: orderId, userId } })
  if (!order) throw new AppError(404, '订单不存在')
  if (!['PENDING', 'ACCEPTED'].includes(order.status)) throw new AppError(409, '当前状态不能取消订单', 'CANNOT_CANCEL')
  await database.$transaction([
    database.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } }),
    database.orderStatusLog.create({ data: { orderId: order.id, status: 'CANCELLED' } }),
  ])
}

export async function reviewOrder(userId: string, orderId: string, rating: number) {
  const order = await database.order.findFirst({ where: { id: orderId, userId } })
  if (!order) throw new AppError(404, '订单不存在')
  if (order.status !== 'COMPLETED') throw new AppError(409, '服务完成后才能评价')
  if (order.reviewed) throw new AppError(409, '该订单已经评价')
  const updated = await database.$transaction(async (tx) => {
    const result = await tx.order.update({ where: { id: order.id }, data: { reviewed: true, reviewRating: rating } })
    const aggregate = await tx.order.aggregate({ where: { technicianId: order.technicianId, reviewed: true }, _avg: { reviewRating: true } })
    await tx.technician.update({ where: { id: order.technicianId }, data: { rating: Math.round((aggregate._avg.reviewRating ?? 5) * 100) / 100 } })
    return result
  })
  return presentOrder(updated)
}
