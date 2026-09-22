const c = require('./core')
const crypto = require('node:crypto')
const admin = require('./routes-admin')
const orders = require('./routes-orders')
const technician = require('./routes-technician')

function accountData(user) {
  try { const parsed = JSON.parse(user.preferences || '[]'); return Array.isArray(parsed) ? { preferences: parsed, addresses: [] } : { preferences: Array.isArray(parsed.preferences) ? parsed.preferences : [], addresses: Array.isArray(parsed.addresses) ? parsed.addresses : [] } }
  catch { return { preferences: [], addresses: [] } }
}

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
      const passwordHash = c.passwordHash(input.password)
      c.result(await c.db.from('User').insert({ id, phone: input.phone, name: input.name.trim(), role: 'USER', points: 0, preferences: '[]', passwordHash, createdAt: now, updatedAt: now }))
      const user = { id, phone: input.phone, name: input.name.trim(), role: 'USER' }
      return c.success({ token: c.token({ sub: id, role: 'USER', ver: c.sessionVersion({ passwordHash }) }), user })
    }
    if (path === '/api/auth/login' && method === 'POST') {
      const input = c.body(event)
      const user = await c.first('User', 'phone', input.phone)
      c.assert(user, 401, '账号或凭据不正确')
      const verified = input.method === 'password' ? c.passwordMatches(input.credential, user.passwordHash) : input.method === 'code' && user.role !== 'ADMIN' && ['13800138000', '13900139000'].includes(user.phone) && input.credential === '888888'
      c.assert(verified, 401, '账号或凭据不正确')
      return c.success({ token: c.token({ sub: user.id, role: user.role, ver: c.sessionVersion(user) }), user: { id: user.id, phone: user.phone, name: user.name, role: user.role } })
    }
    if (path === '/api/auth/me' && method === 'GET') {
      const identity = await c.authenticatedActor(event)
      const user = await c.first('User', 'id', identity.sub)
      c.assert(user && user.role === identity.role, 401, '账号不存在')
      return c.success({ id: user.id, phone: user.phone, name: user.name, role: user.role })
    }
    if (path === '/api/auth/password' && method === 'PUT') {
      const identity = await c.authenticatedActor(event)
      const input = c.body(event)
      const user = await c.first('User', 'id', identity.sub)
      c.assert(user, 404, '账号不存在')
      c.assert(!['13800138000', '13900139000', '13700137000'].includes(user.phone), 403, '公共演示账号为保证面试访问，不允许修改密码')
      c.assert(typeof input.currentPassword === 'string' && c.passwordMatches(input.currentPassword, user.passwordHash), 400, '当前密码不正确')
      c.assert(typeof input.newPassword === 'string' && input.newPassword.length >= 6 && input.newPassword.length <= 64, 400, '新密码需要 6–64 位')
      c.assert(input.currentPassword !== input.newPassword, 400, '新密码不能与当前密码相同')
      c.result(await c.db.from('User').update({ passwordHash: c.passwordHash(input.newPassword), updatedAt: new Date().toISOString() }).eq('id', identity.sub))
      return c.success({ changed: true })
    }
    if (path === '/api/profile' && method === 'GET') {
      const identity = await c.authenticatedActor(event, 'USER')
      const user = await c.first('User', 'id', identity.sub)
      c.assert(user, 404, '用户不存在')
      const [records, favorites] = await Promise.all([
        c.db.from('PointRecord').select('*').eq('userId', identity.sub),
        c.db.from('Favorite').select('*').eq('userId', identity.sub),
      ])
      const data = accountData(user)
      return c.success({ name: user.name, phone: user.phone, points: user.points, preferences: data.preferences, addresses: data.addresses, favoriteIds: c.result(favorites).map(item => item.technicianId), pointRecords: c.result(records).sort((a, b) => c.iso(b.createdAt).localeCompare(c.iso(a.createdAt))).slice(0, 20) })
    }
    if (path === '/api/profile/preferences' && method === 'PUT') {
      const identity = await c.authenticatedActor(event, 'USER')
      const input = c.body(event)
      c.assert(Array.isArray(input.preferences) && input.preferences.length <= 10 && input.preferences.every(value => typeof value === 'string' && value.length <= 30), 400, '按摩偏好无效')
      const user = await c.first('User', 'id', identity.sub); const data = accountData(user)
      c.result(await c.db.from('User').update({ preferences: JSON.stringify({ ...data, preferences: input.preferences }), updatedAt: new Date().toISOString() }).eq('id', identity.sub))
      return c.success({ preferences: input.preferences })
    }
    if (path === '/api/profile/addresses' && method === 'PUT') {
      const identity = await c.authenticatedActor(event, 'USER'); const input = c.body(event)
      c.assert(Array.isArray(input.addresses) && input.addresses.length <= 5 && input.addresses.every(item => typeof item.id === 'string' && item.id.length <= 40 && typeof item.label === 'string' && item.label.trim().length >= 2 && item.label.length <= 40 && typeof item.detail === 'string' && item.detail.trim().length >= 5 && item.detail.length <= 120), 400, '地址信息无效，最多保存 5 个地址')
      const ids = input.addresses.map(item => item.id); c.assert(new Set(ids).size === ids.length, 400, '地址编号重复')
      const addresses = input.addresses.map((item, index) => ({ id: item.id, label: item.label.trim(), detail: item.detail.trim(), isDefault: Boolean(item.isDefault) || !input.addresses.some(value => value.isDefault) && index === 0 })).map((item, index, all) => ({ ...item, isDefault: item.isDefault && all.findIndex(value => value.isDefault) === index }))
      const user = await c.first('User', 'id', identity.sub); const data = accountData(user)
      c.result(await c.db.from('User').update({ preferences: JSON.stringify({ ...data, addresses }), updatedAt: new Date().toISOString() }).eq('id', identity.sub))
      return c.success({ addresses })
    }
    if (path.startsWith('/api/profile/favorites/') && method === 'PUT') {
      const identity = await c.authenticatedActor(event, 'USER')
      const technicianId = Number(path.slice('/api/profile/favorites/'.length))
      c.assert(Number.isSafeInteger(technicianId) && technicianId > 0, 400, '技师编号无效')
      const technician = await c.first('Technician', 'id', technicianId)
      c.assert(technician && technician.active && !technician.archivedAt, 404, '技师不存在或已下架')
      const existing = c.result(await c.db.from('Favorite').select('*').eq('userId', identity.sub).eq('technicianId', technicianId).limit(1))[0]
      if (existing) c.result(await c.db.from('Favorite').delete().eq('userId', identity.sub).eq('technicianId', technicianId))
      else c.result(await c.db.from('Favorite').insert({ userId: identity.sub, technicianId }))
      return c.success({ favorite: !existing })
    }
    if (path.startsWith('/api/admin/')) return c.success(await admin.handle(event, path, method))
    if (path.startsWith('/api/orders')) return c.success(await orders.handle(event, path, method))
    if (path.startsWith('/api/technician-workbench/')) return c.success(await technician.handle(event, path, method))
    throw new c.HttpError(404, '页面不存在')
  } catch (error) { return c.failure(error) }
}
