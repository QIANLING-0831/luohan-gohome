import { database } from '../../shared/database.js'
import { statusIndex } from '../../shared/order-status.js'
import { AppError } from '../../shared/errors.js'
import { hashPassword } from '../../shared/password.js'

function orderSummary(order: Awaited<ReturnType<typeof fetchOrders>>[number]) {
  return {
    id: order.id,
    status: order.status,
    statusIndex: statusIndex(order.status),
    customer: order.user.name,
    phone: order.user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
    technician: order.technician.name,
    service: order.service.name,
    amount: order.paidAmount,
    schedule: `${order.dateLabel} ${new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(order.appointmentAt)}`,
    address: order.addressLabel,
    createdAt: order.createdAt.toISOString(),
  }
}

function fetchOrders() {
  return database.order.findMany({ include: { user: true, technician: true, service: true }, orderBy: { createdAt: 'desc' } })
}

export async function getDashboard() {
  const [orders, activeTechnicians, userCount] = await Promise.all([
    fetchOrders(),
    database.technician.count({ where: { active: true } }),
    database.user.count({ where: { role: 'USER' } }),
  ])
  const revenue = orders.filter((item) => item.status === 'COMPLETED').reduce((sum, item) => sum + item.paidAmount, 0)
  const statusCounts = ['PENDING', 'ACCEPTED', 'DEPARTED', 'ARRIVED', 'IN_SERVICE', 'COMPLETED'].map((status) => ({
    status, count: orders.filter((item) => item.status === status).length,
  }))
  const trend = Array.from({ length: 7 }, (_, reverseIndex) => {
    const offset = 6 - reverseIndex
    const date = new Date(); date.setDate(date.getDate() - offset)
    const key = date.toISOString().slice(0, 10)
    return { label: `${date.getMonth() + 1}/${date.getDate()}`, count: orders.filter((item) => item.createdAt.toISOString().slice(0, 10) === key).length }
  })
  return {
    metrics: { totalOrders: orders.length, pendingOrders: orders.filter((item) => item.status === 'PENDING').length, revenue, activeTechnicians, userCount },
    statusCounts, trend, recentOrders: orders.slice(0, 8).map(orderSummary),
  }
}

export async function listAdminOrders() { return (await fetchOrders()).map(orderSummary) }

export async function listAdminUsers() {
  const users = await database.user.findMany({
    where: { role: 'USER' },
    orderBy: { createdAt: 'desc' },
    include: { orders: { orderBy: { createdAt: 'desc' } } },
  })
  return users.map((user) => {
    const completed = user.orders.filter((order) => order.status === 'COMPLETED')
    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      points: user.points,
      preferences: JSON.parse(user.preferences) as string[],
      orderCount: user.orders.length,
      completedOrders: completed.length,
      totalSpent: completed.reduce((sum, order) => sum + order.paidAmount, 0),
      lastOrderAt: user.orders[0]?.createdAt.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    }
  })
}

export async function listAdminTechnicians() {
  return database.technician.findMany({
    orderBy: { id: 'asc' },
    include: { user: true, services: { include: { service: true } }, _count: { select: { orders: true } } },
  }).then((items) => items.map((item) => ({
    id: item.id, name: item.name, title: item.title, rating: item.rating, active: item.active, archived: Boolean(item.archivedAt), imageKey: item.imageKey,
    orderCount: item._count.orders, price: item.price, experienceYears: item.experienceYears,
    onTimeRate: item.arrivalTotal ? Math.round(item.onTimeArrivals / item.arrivalTotal * 100) : 100,
    workStart: item.workStart, workEnd: item.workEnd, workDays: JSON.parse(item.workDays) as number[],
    services: item.services.map((entry) => entry.service.name),
    loginPhone: item.user?.phone,
  })))
}

export interface CreateTechnicianInput { name: string; phone: string; password: string; title: string; price: number; experienceYears: number; imageKey: string; intro: string; serviceIds: string[]; workStart: string; workEnd: string; workDays: number[] }

export async function listAdminServices() {
  const rows = await database.service.findMany({ include: { _count: { select: { technicians: true } } }, orderBy: { name: 'asc' } })
  return rows.map((item) => ({ id: item.id, name: item.name, description: item.description, price: item.price, duration: item.duration, active: item.active, technicianCount: item._count.technicians }))
}

export async function createService(input: { name: string; description: string; price: number; duration: number }) {
  const duplicate = await database.service.findFirst({ where: { name: input.name } })
  if (duplicate) throw new AppError(409, '服务名称已存在')
  const id = `service-${Date.now().toString(36)}`
  await database.service.create({ data: { id, ...input } })
  return { id, ...input, active: true, technicianCount: 0 }
}

export async function setServiceActive(id: string, active: boolean) {
  await database.service.update({ where: { id }, data: { active } })
  return { id, active }
}

export async function createTechnician(actorId: string, input: CreateTechnicianInput) {
  const serviceIds = [...new Set(input.serviceIds)]
  if (await database.user.findUnique({ where: { phone: input.phone } })) throw new AppError(409, '该手机号已被其他账号使用')
  const availableServices = await database.service.count({ where: { id: { in: serviceIds }, active: true } })
  if (availableServices !== serviceIds.length) throw new AppError(400, '包含不存在或已下架的服务项目')
  const created = await database.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name: input.name, phone: input.phone, passwordHash: await hashPassword(input.password), role: 'TECHNICIAN', points: 0, preferences: '[]' } })
    const technician = await tx.technician.create({ data: {
      name: input.name, title: input.title, price: input.price, experienceYears: input.experienceYears, imageKey: input.imageKey,
      intro: input.intro, rating: 5, orderCount: 0, active: true,
      workStart: input.workStart, workEnd: input.workEnd, workDays: JSON.stringify([...new Set(input.workDays)].sort()),
      latitude: 31.2304, longitude: 121.4737,
      userId: user.id,
      services: { create: serviceIds.map((serviceId) => ({ serviceId })) },
    } })
    await tx.auditLog.create({ data: { actorId, action: 'TECHNICIAN_CREATED', targetType: 'Technician', targetId: String(technician.id) } })
    return technician
  })
  return (await listAdminTechnicians()).find((item) => item.id === created.id)!
}

export async function archiveTechnician(actorId: string, technicianId: number) {
  const technician = await database.technician.findUnique({ where: { id: technicianId } })
  if (!technician || technician.archivedAt) throw new AppError(404, '技师不存在')
  const activeOrders = await database.order.count({ where: { technicianId, status: { in: ['PENDING', 'ACCEPTED', 'DEPARTED', 'ARRIVED', 'IN_SERVICE'] } } })
  if (activeOrders) throw new AppError(409, '该技师还有进行中的订单，请先完成或取消订单')
  await database.$transaction(async (tx) => {
    await tx.technician.update({ where: { id: technicianId }, data: { active: false, archivedAt: new Date() } })
    await tx.auditLog.create({ data: { actorId, action: 'TECHNICIAN_ARCHIVED', targetType: 'Technician', targetId: String(technicianId) } })
  })
  return { id: technicianId, archived: true }
}

export async function restoreTechnician(actorId: string, technicianId: number) {
  const technician = await database.technician.findUnique({ where: { id: technicianId } })
  if (!technician?.archivedAt) throw new AppError(409, '该技师当前未归档')
  await database.$transaction(async (tx) => {
    await tx.technician.update({ where: { id: technicianId }, data: { active: false, archivedAt: null } })
    await tx.auditLog.create({ data: { actorId, action: 'TECHNICIAN_RESTORED', targetType: 'Technician', targetId: String(technicianId) } })
  })
  return { id: technicianId, archived: false, active: false }
}

export async function resetTechnicianPassword(technicianId: number, password: string) {
  const technician = await database.technician.findUnique({ where: { id: technicianId }, include: { user: true } })
  if (!technician?.user) throw new AppError(409, '该技师尚未绑定登录账号')
  if (technician.user.phone === '13900139000') throw new AppError(403, '公共演示技师账号不允许重置密码')
  await database.user.update({ where: { id: technician.user.id }, data: { passwordHash: await hashPassword(password) } })
  return { id: technicianId, reset: true }
}

export async function bindTechnicianAccount(actorId: string, technicianId: number, input: { phone: string; password: string }) {
  const technician = await database.technician.findUnique({ where: { id: technicianId } })
  if (!technician) throw new AppError(404, '技师不存在')
  if (technician.userId) throw new AppError(409, '该技师已经绑定登录账号')
  if (await database.user.findUnique({ where: { phone: input.phone } })) throw new AppError(409, '该手机号已被其他账号使用')
  await database.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name: technician.name, phone: input.phone, passwordHash: await hashPassword(input.password), role: 'TECHNICIAN', points: 0, preferences: '[]' } })
    await tx.technician.update({ where: { id: technicianId }, data: { userId: user.id } })
    await tx.auditLog.create({ data: { actorId, action: 'TECHNICIAN_ACCOUNT_BOUND', targetType: 'Technician', targetId: String(technicianId), metadata: JSON.stringify({ phone: input.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') }) } })
  })
  return { id: technicianId, loginPhone: input.phone }
}

export async function setTechnicianActive(actorId: string, technicianId: number, active: boolean) {
  const technician = await database.$transaction(async (tx) => {
    const updated = await tx.technician.update({ where: { id: technicianId, archivedAt: null }, data: { active } })
    await tx.auditLog.create({ data: { actorId, action: active ? 'TECHNICIAN_ACTIVATED' : 'TECHNICIAN_DEACTIVATED', targetType: 'Technician', targetId: String(technicianId) } })
    return updated
  })
  return { id: technician.id, active: technician.active }
}

export async function updateTechnicianProfile(actorId: string, technicianId: number, input: { title: string; price: number; experienceYears: number; imageKey?: string; serviceIds: string[]; workStart: string; workEnd: string; workDays: number[] }) {
  const availableServices = await database.service.count({ where: { id: { in: input.serviceIds }, active: true } })
  if (availableServices !== input.serviceIds.length) throw new AppError(400, '包含不存在或已下架的服务项目')
  await database.$transaction(async (tx) => {
    await tx.technician.update({ where: { id: technicianId }, data: { title: input.title, price: input.price, experienceYears: input.experienceYears, workStart: input.workStart, workEnd: input.workEnd, workDays: JSON.stringify([...new Set(input.workDays)].sort()), ...(input.imageKey ? { imageKey: input.imageKey } : {}) } })
    await tx.technicianService.deleteMany({ where: { technicianId } })
    await tx.technicianService.createMany({ data: input.serviceIds.map((serviceId) => ({ technicianId, serviceId })) })
    await tx.auditLog.create({ data: { actorId, action: 'TECHNICIAN_PROFILE_UPDATED', targetType: 'Technician', targetId: String(technicianId), metadata: JSON.stringify(input) } })
  })
  const updated = (await listAdminTechnicians()).find((item) => item.id === technicianId)
  if (!updated) throw new AppError(404, '技师不存在')
  return updated
}
