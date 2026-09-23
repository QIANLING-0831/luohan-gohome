import { database } from '../../shared/database.js'
import { AppError } from '../../shared/errors.js'
import { nextOrderStatus, statusIndex } from '../../shared/order-status.js'

async function profileForUser(userId: string) {
  const technician = await database.technician.findUnique({ where: { userId } })
  if (!technician) throw new AppError(404, '当前账号没有关联技师档案')
  return technician
}

export async function technicianOverview(userId: string) {
  const technician = await profileForUser(userId)
  const orders = await database.order.findMany({
    where: { technicianId: technician.id, status: { not: 'CANCELLED' } },
    include: { user: true, service: true },
  })
  const rank = (status: string) => status === 'PENDING' ? 0 : status === 'COMPLETED' ? 2 : 1
  orders.sort((a, b) => { const group = rank(a.status) - rank(b.status); if (group) return group; if (rank(a.status) === 1) return Math.abs(a.appointmentAt.getTime() - Date.now()) - Math.abs(b.appointmentAt.getTime() - Date.now()); return rank(a.status) === 2 ? b.appointmentAt.getTime() - a.appointmentAt.getTime() : a.appointmentAt.getTime() - b.appointmentAt.getTime() })
  return {
    technician: { id: technician.id, name: technician.name, title: technician.title, active: technician.active, rating: technician.rating },
    metrics: {
      todayOrders: orders.filter((item) => item.appointmentAt.toDateString() === new Date().toDateString()).length,
      pendingOrders: orders.filter((item) => item.status === 'PENDING').length,
      completedOrders: orders.filter((item) => item.status === 'COMPLETED').length,
      income: orders.filter((item) => item.status === 'COMPLETED').reduce((sum, item) => sum + item.paidAmount, 0),
    },
    orders: orders.map((item) => ({
      id: item.id, status: item.status, statusIndex: statusIndex(item.status), appointmentAt: item.appointmentAt.toISOString(), customer: item.user.name,
      phone: item.user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'), service: item.service.name,
      amount: item.paidAmount, schedule: `${item.dateLabel} ${new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(item.appointmentAt)}`,
      address: item.addressLabel, detail: item.addressDetail, intensity: item.intensity, note: item.note,
    })),
  }
}

export async function advanceTechnicianOrder(userId: string, orderId: string) {
  const technician = await profileForUser(userId)
  const order = await database.order.findFirst({ where: { id: orderId, technicianId: technician.id } })
  if (!order) throw new AppError(404, '订单不存在或未分配给当前技师')
  const next = nextOrderStatus(order.status)
  if (!next) throw new AppError(409, '订单已经完成')
  const updated = await database.$transaction(async (tx) => {
    const result = await tx.order.update({ where: { id: order.id }, data: { status: next } })
    await tx.orderStatusLog.create({ data: { orderId: order.id, status: next } })
    if (next === 'ARRIVED') await tx.technician.update({ where: { id: order.technicianId }, data: { arrivalTotal: { increment: 1 }, ...(Date.now() <= order.appointmentAt.getTime() + 15 * 60 * 1000 ? { onTimeArrivals: { increment: 1 } } : {}) } })
    return result
  })
  return { id: updated.id, status: updated.status, statusIndex: statusIndex(updated.status) }
}
