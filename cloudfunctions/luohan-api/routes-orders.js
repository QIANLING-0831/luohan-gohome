const crypto = require('node:crypto')
const c = require('./core')

async function handle(event, path, method) {
  const identity = c.actor(event, 'USER')
  if (path === '/api/orders' && method === 'GET') { const rows = c.result(await c.db.from('Order').select('*').eq('userId', identity.sub)); return rows.sort((a, b) => c.iso(b.createdAt).localeCompare(c.iso(a.createdAt))).map(c.presentOrder) }
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
    const sameTech = c.result(await c.db.from('Order').select('id,status,appointmentAt').eq('technicianId', technician.id))
    c.assert(!sameTech.some(o => o.status !== 'CANCELLED' && new Date(o.appointmentAt).getTime() === date.getTime()), 409, '该时段刚刚被预约，请选择其他时间')
    const allowedCoupons = { '新客立减券': service.price >= 199 ? 30 : 0, '金卡会员券': 20, '不使用优惠券': 0 }
    const couponLabel = Object.hasOwn(allowedCoupons, input.couponLabel) ? input.couponLabel : '不使用优惠券'
    const discount = Math.min(service.price, allowedCoupons[couponLabel])
    const now = new Date().toISOString()
    const id = `LH${Date.now().toString().slice(-8)}${crypto.randomInt(10, 99)}`
    const row = c.result(await c.db.from('Order').insert({ id, userId: identity.sub, technicianId: technician.id, serviceId: service.id, status: 'PENDING', dateLabel: input.dateLabel || input.dateKey, appointmentAt: date.toISOString(), intensity: input.intensity || '适中', paymentMethod: input.paymentMethod || 'wechat', etaSeconds: 720, addressLabel: input.address.label, addressDetail: input.address.detail, note: input.note || '', originalPrice: service.price, discount, paidAmount: service.price - discount, couponLabel, reviewed: false, createdAt: now, updatedAt: now }).select('*'))[0]
    c.assert(row, 500, '下单失败')
    c.result(await c.db.from('OrderStatusLog').insert({ orderId: id, status: 'PENDING' }))
    return c.presentOrder(row)
  }
  const reviewMatch = path.match(/^\/api\/orders\/([^/]+)\/review$/)
  if (reviewMatch && method === 'POST') {
    const input = c.body(event); const rating = Number(input.rating)
    c.assert(Number.isInteger(rating) && rating >= 1 && rating <= 5, 400, '请选择 1–5 星评分')
    const order = await c.first('Order', 'id', reviewMatch[1]); c.assert(order && order.userId === identity.sub, 404, '订单不存在')
    c.assert(order.status === 'COMPLETED', 409, '服务完成后才能评价'); c.assert(!order.reviewed, 409, '该订单已经评价')
    const updated = c.result(await c.db.from('Order').update({ reviewed: true, reviewRating: rating, updatedAt: new Date().toISOString() }).eq('id', order.id).select('*'))[0]
    const reviewed = c.result(await c.db.from('Order').select('reviewRating').eq('technicianId', order.technicianId).eq('reviewed', true))
    const average = reviewed.length ? Math.round(reviewed.reduce((sum, item) => sum + Number(item.reviewRating || 0), 0) / reviewed.length * 100) / 100 : 5
    c.result(await c.db.from('Technician').update({ rating: average }).eq('id', order.technicianId))
    return c.presentOrder(updated)
  }
  const match = path.match(/^\/api\/orders\/([^/]+)\/(advance|cancel)$/)
  if (match && method === 'POST') {
    const order = await c.first('Order', 'id', match[1]); c.assert(order && order.userId === identity.sub, 404, '订单不存在')
    if (match[2] === 'advance') return c.presentOrder(await c.advanceOrder(order))
    c.assert(['PENDING', 'ACCEPTED'].includes(order.status), 409, '当前状态不能取消订单')
    c.result(await c.db.from('Order').update({ status: 'CANCELLED', updatedAt: new Date().toISOString() }).eq('id', order.id))
    c.result(await c.db.from('OrderStatusLog').insert({ orderId: order.id, status: 'CANCELLED' }))
    return null
  }
  throw new c.HttpError(404, '接口不存在')
}
module.exports = { handle }
