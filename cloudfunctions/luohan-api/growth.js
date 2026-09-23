const c = require('./core')

const ACCEPT_TIMEOUT_MS = 15 * 60 * 1000
const REVIEW_TAGS = ['手法专业', '准时到达', '沟通细致', '环境整洁', '力度合适', '值得推荐']

async function expirePendingOrders() {
  const rows = c.result(await c.db.from('Order').select('id,createdAt,status').eq('status', 'PENDING'))
  const expired = rows.filter(order => Date.now() - new Date(order.createdAt).getTime() >= ACCEPT_TIMEOUT_MS)
  for (const order of expired) {
    const updated = c.result(await c.db.from('Order').update({ status: 'CANCELLED', updatedAt: new Date().toISOString() }).eq('id', order.id).eq('status', 'PENDING').select('id'))
    if (updated.length) c.result(await c.db.from('OrderStatusLog').insert({ orderId: order.id, status: 'CANCELLED' }))
  }
  return expired.length
}

function reviewInput(input) {
  const rating = Number(input.rating)
  c.assert(Number.isInteger(rating) && rating >= 1 && rating <= 5, 400, '请选择 1–5 星评分')
  const tags = Array.isArray(input.tags) ? [...new Set(input.tags)] : []
  c.assert(tags.length <= 4 && tags.every(tag => REVIEW_TAGS.includes(tag)), 400, '评价标签无效')
  const text = typeof input.text === 'string' ? input.text.trim() : ''
  c.assert(text.length <= 300, 400, '评价内容最多 300 字')
  return { rating, tags, text }
}

function parseReview(row) {
  try {
    const metadata = JSON.parse(row.metadata || '{}')
    return { id: row.id, rating: Number(metadata.rating), tags: Array.isArray(metadata.tags) ? metadata.tags : [], text: metadata.text || '', createdAt: c.iso(row.createdAt), customer: '匿名用户', technicianId: Number(metadata.technicianId) }
  } catch { return null }
}

async function technicianReviews(technicianId) {
  const rows = c.result(await c.db.from('AuditLog').select('*').eq('action', 'ORDER_REVIEW'))
  const items = rows.map(parseReview).filter(item => item && item.technicianId === technicianId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return { items, total: items.length, average: items.length ? Math.round(items.reduce((sum, item) => sum + item.rating, 0) / items.length * 100) / 100 : null }
}

function analytics(snapshot, days = 30) {
  const start = days > 0 ? Date.now() - days * 86400000 : 0
  const orders = snapshot.orders.filter(order => new Date(order.createdAt).getTime() >= start)
  const completed = orders.filter(order => order.status === 'COMPLETED')
  const revenue = completed.reduce((sum, order) => sum + Number(order.paidAmount || 0), 0)
  const users = new Map()
  completed.forEach(order => users.set(order.userId, (users.get(order.userId) || 0) + 1))
  const technicianRanking = snapshot.technicians.map(tech => { const own = completed.filter(order => order.technicianId === tech.id); return { id: tech.id, name: tech.name, orders: own.length, revenue: own.reduce((sum, order) => sum + Number(order.paidAmount || 0), 0) } }).filter(item => item.orders).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  const serviceSales = snapshot.services.map(service => { const own = completed.filter(order => order.serviceId === service.id); return { id: service.id, name: service.name, orders: own.length, revenue: own.reduce((sum, order) => sum + Number(order.paidAmount || 0), 0) } }).filter(item => item.orders).sort((a, b) => b.orders - a.orders).slice(0, 5)
  return {
    days,
    averageOrderValue: completed.length ? Math.round(revenue / completed.length) : 0,
    repeatRate: users.size ? Math.round([...users.values()].filter(count => count >= 2).length / users.size * 100) : 0,
    completionRate: orders.length ? Math.round(completed.length / orders.length * 100) : 0,
    funnel: [
      { label: '创建订单', count: orders.length },
      { label: '技师接单', count: orders.filter(order => !['PENDING', 'CANCELLED'].includes(order.status)).length },
      { label: '完成服务', count: completed.length },
    ],
    technicianRanking,
    serviceSales,
  }
}

module.exports = { ACCEPT_TIMEOUT_MS, REVIEW_TAGS, expirePendingOrders, reviewInput, technicianReviews, analytics }
