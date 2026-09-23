const crypto = require('node:crypto')
const c = require('./core')
const growth = require('./growth')

async function handle(event, path, method) {
  const identity = await c.authenticatedActor(event, 'USER')
  if (path === '/api/orders' && method === 'GET') { await growth.expirePendingOrders(); const rows = c.result(await c.db.from('Order').select('*').eq('userId', identity.sub)); const logs = c.result(await c.db.from('OrderStatusLog').select('orderId,status,createdAt')); const timedOut = new Set(rows.filter(order => { const own = logs.filter(log => log.orderId === order.id); if (own.some(log => log.status === 'CANCELLED_TIMEOUT')) return true; const cancelled = own.find(log => log.status === 'CANCELLED'); const progressed = own.some(log => !['PENDING', 'CANCELLED'].includes(log.status)); return Boolean(cancelled && !progressed && new Date(cancelled.createdAt).getTime() - new Date(order.createdAt).getTime() >= growth.ACCEPT_TIMEOUT_MS - 30000) }).map(order => order.id)); return rows.sort((a, b) => c.iso(b.createdAt).localeCompare(c.iso(a.createdAt))).map(order => { const ownLogs = logs.filter(log => log.orderId === order.id).sort((a, b) => c.iso(a.createdAt).localeCompare(c.iso(b.createdAt))); const history = ownLogs.map(log => ({ status: log.status === 'CANCELLED_TIMEOUT' ? 'CANCELLED' : log.status, occurredAt: c.iso(log.createdAt), reason: log.status === 'CANCELLED_TIMEOUT' || timedOut.has(order.id) && log.status === 'CANCELLED' ? 'TIMEOUT' : undefined })); return c.presentOrder(order, timedOut.has(order.id) ? 'TIMEOUT' : undefined, history) }) }
  if (path === '/api/orders' && method === 'POST') {
    const input = c.body(event)
    const [technician, service] = await Promise.all([c.first('Technician', 'id', Number(input.technicianId)), c.first('Service', 'id', input.serviceId)])
    c.assert(technician?.active && !technician.archivedAt, 404, '技师不存在或暂不可预约')
    c.assert(service?.active, 404, '服务项目不存在或已下架')
    const link = c.result(await c.db.from('TechnicianService').select('*').eq('technicianId', technician.id).eq('serviceId', service.id))
    c.assert(link.length > 0, 400, '该技师暂不提供此服务')
    c.assert(typeof input.time === 'string' && /^\d{2}:\d{2}$/.test(input.time) && /^\d{4}-\d{2}-\d{2}$/.test(input.dateKey), 400, '请选择有效预约时间')
    c.assert(input.address?.label && input.address?.detail, 400, '请选择服务地址')
    const allowedDates = Array.from({ length: 3 }, (_, i) => c.beijingDateKey(new Date(Date.now() + i * 86400000)))
    c.assert(allowedDates.includes(input.dateKey), 400, '仅支持预约未来三天')
    const workDays = JSON.parse(technician.workDays || '[]')
    const weekday = new Date(`${input.dateKey}T12:00:00+08:00`).getUTCDay()
    c.assert(workDays.includes(weekday), 409, '该技师当天休息，请选择其他日期')
    c.assert(input.time >= technician.workStart && input.time <= technician.workEnd, 409, '所选时间不在该技师接单时段内')
    const date = new Date(`${input.dateKey}T${input.time}:00+08:00`)
    c.assert(date.getTime() > Date.now(), 400, '预约时间不能早于当前北京时间')
    const end = new Date(date.getTime() + service.duration * 60000)
    const workEnd = new Date(`${input.dateKey}T${technician.workEnd}:00+08:00`)
    c.assert(end.getTime() <= workEnd.getTime(), 409, '该服务将在技师下班后结束，请选择更早时间')
    const [sameTechResult, allServicesResult] = await Promise.all([c.db.from('Order').select('id,status,appointmentAt,serviceId').eq('technicianId', technician.id), c.db.from('Service').select('id,duration')])
    const durations = new Map(c.result(allServicesResult).map(item => [item.id, item.duration]))
    const sameTech = c.result(sameTechResult)
    c.assert(!sameTech.some(o => { if (o.status === 'CANCELLED') return false; const existingStart = new Date(o.appointmentAt); const existingEnd = new Date(existingStart.getTime() + Number(durations.get(o.serviceId) || 0) * 60000); return existingStart < end && existingEnd > date }), 409, '该时段与已有预约重叠，请选择其他时间')
    const allowedCoupons = { '新客立减券': service.price >= 199 ? 30 : 0, '金卡会员券': 20, '不使用优惠券': 0 }
    const couponLabel = Object.hasOwn(allowedCoupons, input.couponLabel) ? input.couponLabel : '不使用优惠券'
    const discount = Math.min(service.price, allowedCoupons[couponLabel])
    const now = new Date().toISOString()
    const requestId = typeof input.requestId === 'string' && /^[A-Za-z0-9-]{8,80}$/.test(input.requestId) ? input.requestId : crypto.randomUUID()
    const id = `LH${crypto.createHash('sha256').update(`${identity.sub}:${requestId}`).digest('hex').slice(0, 14).toUpperCase()}`
    const existing = await c.first('Order', 'id', id)
    if (existing) return c.presentOrder(existing)
    const row = c.result(await c.db.from('Order').insert({ id, userId: identity.sub, technicianId: technician.id, serviceId: service.id, status: 'PENDING', dateLabel: input.dateLabel || input.dateKey, appointmentAt: date.toISOString(), intensity: input.intensity || '适中', paymentMethod: input.paymentMethod || 'wechat', etaSeconds: 720, addressLabel: input.address.label, addressDetail: input.address.detail, note: input.note || '', originalPrice: service.price, discount, paidAmount: service.price - discount, couponLabel, reviewed: false, createdAt: now, updatedAt: now }).select('*'))[0]
    c.assert(row, 500, '下单失败')
    const contenders = c.result(await c.db.from('Order').select('id,status,appointmentAt,serviceId,createdAt').eq('technicianId', technician.id)).filter(o => o.status !== 'CANCELLED' && o.id !== id).filter(o => { const existingStart = new Date(o.appointmentAt); const existingEnd = new Date(existingStart.getTime() + Number(durations.get(o.serviceId) || 0) * 60000); return existingStart < end && existingEnd > date })
    if (contenders.some(other => `${c.iso(other.createdAt)}:${other.id}` < `${now}:${id}`)) { await c.db.from('Order').delete().eq('id', id); throw new c.HttpError(409, '该时段刚被预约，请选择其他时间', 'SLOT_UNAVAILABLE') }
    c.result(await c.db.from('OrderStatusLog').insert({ orderId: id, status: 'PENDING' }))
    return c.presentOrder(row, undefined, [{ status: 'PENDING', occurredAt: now }])
  }
  const reviewMatch = path.match(/^\/api\/orders\/([^/]+)\/review$/)
  if (reviewMatch && method === 'POST') {
    const input = c.body(event); const { rating, tags, text } = growth.reviewInput(input)
    const order = await c.first('Order', 'id', reviewMatch[1]); c.assert(order && order.userId === identity.sub, 404, '订单不存在')
    c.assert(order.status === 'COMPLETED', 409, '服务完成后才能评价'); c.assert(!order.reviewed, 409, '该订单已经评价')
    const updated = c.result(await c.db.from('Order').update({ reviewed: true, reviewRating: rating, updatedAt: new Date().toISOString() }).eq('id', order.id).eq('reviewed', false).select('*'))[0]
    c.assert(updated, 409, '该订单已经评价')
    try { c.result(await c.db.from('AuditLog').insert({ actorId: identity.sub, action: 'ORDER_REVIEW', targetType: 'Order', targetId: order.id, metadata: JSON.stringify({ rating, tags, text, technicianId: order.technicianId, serviceId: order.serviceId }) })) }
    catch (error) { await c.db.from('Order').update({ reviewed: false, reviewRating: null }).eq('id', order.id); throw error }
    const reviewed = c.result(await c.db.from('Order').select('reviewRating').eq('technicianId', order.technicianId).eq('reviewed', true))
    const average = reviewed.length ? Math.round(reviewed.reduce((sum, item) => sum + Number(item.reviewRating || 0), 0) / reviewed.length * 100) / 100 : 5
    c.result(await c.db.from('Technician').update({ rating: average }).eq('id', order.technicianId))
    return c.presentOrder(updated)
  }
  const match = path.match(/^\/api\/orders\/([^/]+)\/(cancel)$/)
  if (match && method === 'POST') {
    const order = await c.first('Order', 'id', match[1]); c.assert(order && order.userId === identity.sub, 404, '订单不存在')
    c.assert(['PENDING', 'ACCEPTED'].includes(order.status), 409, '当前状态不能取消订单')
    c.result(await c.db.from('Order').update({ status: 'CANCELLED', updatedAt: new Date().toISOString() }).eq('id', order.id))
    c.result(await c.db.from('OrderStatusLog').insert({ orderId: order.id, status: 'CANCELLED' }))
    return null
  }
  throw new c.HttpError(404, '接口不存在')
}
module.exports = { handle }
