const c = require('./core')
const crypto = require('node:crypto')
const admin = require('./routes-admin')
const orders = require('./routes-orders')
const technician = require('./routes-technician')

exports.main = async (event) => {
  try {
    const method = event.httpMethod || 'GET'
    const incoming = (event.path || '/').replace(/\/$/, '')
    const path = incoming.startsWith('/api/') ? incoming : `/api${incoming}`
    if (method === 'OPTIONS') return c.success(null, 204)
    if (path === '/api/health') return c.success({ status: 'ok', backend: 'cloudbase-function' })
    if (path === '/api/technicians' && method === 'GET') {
      const [rows, links, services] = await Promise.all([c.db.from('Technician').select('*').eq('active', true).is('archivedAt', null), c.db.from('TechnicianService').select('*'), c.db.from('Service').select('id,active')])
      const activeIds = new Set(c.result(services).filter(v => v.active).map(v => v.id))
      return c.success(c.result(rows).map(t => ({ id: t.id, name: t.name, title: t.title, rating: t.rating, orders: t.orderCount, lat: t.latitude, lng: t.longitude, price: t.price, imageKey: t.imageKey, intro: t.intro, experienceYears: t.experienceYears, onTimeRate: t.arrivalTotal ? Math.round(t.onTimeArrivals / t.arrivalTotal * 100) : 100, workStart: t.workStart, workEnd: t.workEnd, workDays: JSON.parse(t.workDays || '[]'), serviceIds: c.result(links).filter(link => link.technicianId === t.id && activeIds.has(link.serviceId)).map(link => link.serviceId) })).filter(t => t.serviceIds.length))
    }
    const availabilityMatch = path.match(/^\/api\/technicians\/(\d+)\/availability$/)
    if (availabilityMatch && method === 'GET') { const id = Number(availabilityMatch[1]); const [orders, tech] = await Promise.all([c.db.from('Order').select('appointmentAt,status').eq('technicianId', id), c.first('Technician', 'id', id)]); c.assert(tech && tech.active && !tech.archivedAt, 404, '技师不存在或暂不可约'); return c.success({ occupied: c.result(orders).filter(o => o.status !== 'CANCELLED').map(o => c.beijingSlot(o.appointmentAt)), workStart: tech.workStart, workEnd: tech.workEnd, workDays: JSON.parse(tech.workDays || '[]') }) }
    if (path === '/api/services' && method === 'GET') return c.success(c.result(await c.db.from('Service').select('*').eq('active', true)).map(s => ({ id: s.id, name: s.name, desc: s.description, price: s.price, duration: s.duration })))
    if (path === '/api/auth/register' && method === 'POST') {
      const input = c.body(event)
      c.assert(/^1\d{10}$/.test(input.phone || ''), 400, '请输入正确的手机号')
      c.assert(typeof input.name === 'string' && input.name.trim().length >= 2 && input.name.trim().length <= 20, 400, '昵称需要 2–20 个字符')
      c.assert(typeof input.password === 'string' && input.password.length >= 6 && input.password.length <= 64, 400, '密码需要 6–64 个字符')
      c.assert(!await c.first('User', 'phone', input.phone), 409, '该手机号已经注册，请直接登录')
      const id = `user-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`
      const now = new Date().toISOString()
      c.result(await c.db.from('User').insert({ id, phone: input.phone, name: input.name.trim(), role: 'USER', points: 0, preferences: '[]', passwordHash: c.passwordHash(input.password), createdAt: now, updatedAt: now }))
      const user = { id, phone: input.phone, name: input.name.trim(), role: 'USER' }
      return c.success({ token: c.token({ sub: id, role: 'USER' }), user })
    }
    if (path === '/api/auth/login' && method === 'POST') {
      const input = c.body(event)
      const user = await c.first('User', 'phone', input.phone)
      c.assert(user, 401, '账号或凭据不正确')
      const verified = input.method === 'password' ? c.passwordMatches(input.credential, user.passwordHash) : input.method === 'code' && user.role !== 'ADMIN' && ['13800138000', '13900139000'].includes(user.phone) && input.credential === '888888'
      c.assert(verified, 401, '账号或凭据不正确')
      return c.success({ token: c.token({ sub: user.id, role: user.role }), user: { id: user.id, phone: user.phone, name: user.name, role: user.role } })
    }
    if (path === '/api/auth/me' && method === 'GET') {
      const identity = c.actor(event)
      const user = await c.first('User', 'id', identity.sub)
      c.assert(user && user.role === identity.role, 401, '账号不存在')
      return c.success({ id: user.id, phone: user.phone, name: user.name, role: user.role })
    }
    if (path.startsWith('/api/admin/')) return c.success(await admin.handle(event, path, method))
    if (path.startsWith('/api/orders')) return c.success(await orders.handle(event, path, method))
    if (path.startsWith('/api/technician-workbench/')) return c.success(await technician.handle(event, path, method))
    throw new c.HttpError(404, '页面不存在')
  } catch (error) { return c.failure(error) }
}
