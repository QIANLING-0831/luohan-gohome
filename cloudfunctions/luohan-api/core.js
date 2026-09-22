const cloudbase = require('@cloudbase/js-sdk')
const crypto = require('node:crypto')

const app = cloudbase.init({ env: 'test-d1geapfamc8dccbc4', accessKey: process.env.CLOUDBASE_APIKEY })
const db = app.rdb()
const statuses = ['PENDING', 'ACCEPTED', 'DEPARTED', 'ARRIVED', 'IN_SERVICE', 'COMPLETED']

class HttpError extends Error {
  constructor(status, message, code = 'REQUEST_FAILED') { super(message); this.status = status; this.code = code }
}
function result(value) { if (value.error) throw new Error(value.error.message || '数据库请求失败'); return value.data || [] }
async function all(table) { return result(await db.from(table).select('*')) }
async function first(table, column, value) { return result(await db.from(table).select('*').eq(column, value).limit(1))[0] }
function success(data, statusCode = 200) { return { statusCode, headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': 'https://luohan-home-care-cn.surge.sh', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'access-control-allow-headers': 'Content-Type,Authorization', 'vary': 'Origin' }, body: JSON.stringify({ data }) } }
function failure(error) { const status = error instanceof HttpError ? error.status : 500; if (status === 500) console.error(error); return { ...success(null, status), body: JSON.stringify({ error: { code: error.code || 'SERVER_ERROR', message: status === 500 ? '服务器暂时不可用' : error.message } }) } }
function assert(condition, status, message) { if (!condition) throw new HttpError(status, message) }
function body(event) { try { return JSON.parse(event.body || '{}') } catch { throw new HttpError(400, '请求内容不是有效的 JSON') } }
function iso(value) { return new Date(value).toISOString() }
function mask(phone) { return String(phone).replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') }
function token(payload) { const secret = process.env.JWT_SECRET; assert(secret && secret.length >= 32, 503, '服务端登录配置未完成'); const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'); const content = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 604800 })).toString('base64url'); const signature = crypto.createHmac('sha256', secret).update(`${header}.${content}`).digest('base64url'); return `${header}.${content}.${signature}` }
function actor(event, role) { const value = (event.headers?.authorization || event.headers?.Authorization || '').replace(/^Bearer /i, ''); const parts = value.split('.'); assert(parts.length === 3, 401, '请先登录'); const expected = crypto.createHmac('sha256', process.env.JWT_SECRET || '').update(`${parts[0]}.${parts[1]}`).digest('base64url'); assert(parts[2].length === expected.length && crypto.timingSafeEqual(Buffer.from(parts[2]), Buffer.from(expected)), 401, '登录已过期，请重新登录'); let payload; try { payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) } catch { throw new HttpError(401, '登录信息无效') } assert(payload.exp > Date.now() / 1000, 401, '登录已过期，请重新登录'); if (role) assert(payload.role === role, 403, '当前身份无权访问'); return payload }
function passwordMatches(password, hash) { const [algorithm, salt, hex] = String(hash || '').split(':'); if (algorithm !== 'scrypt' || !salt || !hex) return false; const expected = Buffer.from(hex, 'hex'); if (expected.length !== 64) return false; return crypto.timingSafeEqual(crypto.scryptSync(password, salt, 64), expected) }
function passwordHash(password) { const salt = crypto.randomBytes(16).toString('hex'); return `scrypt:${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}` }
function presentOrder(o) { return { id: o.id, techId: o.technicianId, serviceId: o.serviceId, dateLabel: o.dateLabel, time: beijingSlot(o.appointmentAt).split('|')[1], intensity: o.intensity, paymentMethod: o.paymentMethod, status: statuses.indexOf(o.status), etaSeconds: o.etaSeconds, address: { id: 'saved', label: o.addressLabel, detail: o.addressDetail }, note: o.note, originalPrice: o.originalPrice, discount: o.discount, paidAmount: o.paidAmount, couponLabel: o.couponLabel, reviewed: o.reviewed, reviewRating: o.reviewRating || undefined } }
async function advanceOrder(o) { const index = statuses.indexOf(o.status); assert(index >= 0 && index < 5, 409, '订单已经完成或取消'); const status = statuses[index + 1]; const updated = result(await db.from('Order').update({ status, updatedAt: new Date().toISOString() }).eq('id', o.id).select('*'))[0]; result(await db.from('OrderStatusLog').insert({ orderId: o.id, status })); if (status === 'ARRIVED') { const technician = await first('Technician', 'id', o.technicianId); const onTime = Date.now() <= new Date(o.appointmentAt).getTime() + 15 * 60 * 1000; result(await db.from('Technician').update({ arrivalTotal: technician.arrivalTotal + 1, onTimeArrivals: technician.onTimeArrivals + (onTime ? 1 : 0) }).eq('id', technician.id)) } if (status === 'COMPLETED') { const user = await first('User', 'id', o.userId); const reward = Math.floor(o.paidAmount / 10); result(await db.from('User').update({ points: user.points + reward, updatedAt: new Date().toISOString() }).eq('id', o.userId)); result(await db.from('PointRecord').insert({ userId: o.userId, amount: reward, reason: `完成订单 ${o.id}` })) } return updated }

function beijingDateKey(date = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date) }
function beijingSlot(date) { const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(date)).map(v => [v.type, v.value])); return `${beijingDateKey(new Date(date))}|${parts.hour}:${parts.minute}` }

module.exports = { db, statuses, HttpError, result, all, first, success, failure, assert, body, iso, mask, token, actor, passwordMatches, passwordHash, presentOrder, advanceOrder, beijingDateKey, beijingSlot }
