const c = require('./core')
const growth = require('./growth')

async function handle(event, path, method) {
  const identity = await c.authenticatedActor(event, 'TECHNICIAN')
  const profile = await c.first('Technician', 'userId', identity.sub)
  c.assert(profile && !profile.archivedAt, 404, '当前账号没有关联技师档案')
  await growth.expirePendingOrders()
  if (path === '/api/technician-workbench/overview' && method === 'GET') {
    const [allOrders, users, services] = await Promise.all(['Order', 'User', 'Service'].map(c.all))
    const orders = allOrders.filter(o => o.technicianId === profile.id && o.status !== 'CANCELLED').sort((a, b) => c.iso(a.appointmentAt).localeCompare(c.iso(b.appointmentAt)))
    return { technician: { id: profile.id, name: profile.name, title: profile.title, active: profile.active, rating: profile.rating }, metrics: { todayOrders: orders.filter(o => c.beijingDateKey(new Date(o.appointmentAt)) === c.beijingDateKey()).length, pendingOrders: orders.filter(o => o.status === 'PENDING').length, completedOrders: orders.filter(o => o.status === 'COMPLETED').length, income: orders.filter(o => o.status === 'COMPLETED').reduce((n, o) => n + o.paidAmount, 0) }, orders: orders.map(o => { const user = users.find(u => u.id === o.userId); const service = services.find(v => v.id === o.serviceId); return { id: o.id, status: o.status, statusIndex: c.statuses.indexOf(o.status), customer: user?.name || '用户', phone: c.mask(user?.phone || ''), service: service?.name || '服务项目', amount: o.paidAmount, schedule: `${o.dateLabel} ${c.beijingSlot(o.appointmentAt).split('|')[1]}`, address: o.addressLabel, detail: o.addressDetail, intensity: o.intensity, note: o.note } }) }
  }
  const match = path.match(/^\/api\/technician-workbench\/orders\/([^/]+)\/advance$/)
  if (match && method === 'POST') { const order = await c.first('Order', 'id', match[1]); c.assert(order && order.technicianId === profile.id, 404, '订单不存在或未分配给当前技师'); const updated = await c.advanceOrder(order); return { id: updated.id, status: updated.status, statusIndex: c.statuses.indexOf(updated.status) } }
  throw new c.HttpError(404, '接口不存在')
}
module.exports = { handle }
