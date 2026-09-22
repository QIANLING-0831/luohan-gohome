const api = process.env.API_URL ?? 'https://test-d1geapfamc8dccbc4.service.tcloudbase.com/api'
const accounts = [
  { phone: process.env.ACCOUNT_PHONE, password: process.env.ACCOUNT_PASSWORD },
  { phone: process.env.SECOND_PHONE, password: process.env.SECOND_PASSWORD },
]
if (accounts.some(({ phone, password }) => !phone || !password)) throw new Error('请设置两个测试账号的手机号和密码')

async function call(path, method = 'GET', token, body) {
  const response = await fetch(`${api}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(`${path}: ${response.status} ${payload.error?.message ?? '请求失败'}`)
  return payload.data
}

const sessions = await Promise.all(accounts.map(({ phone, password }) => call('/api/auth/login', 'POST', null, { phone, method: 'password', credential: password })))
const [first, second] = sessions
if (first.user.id === second.user.id) throw new Error('两个账号被识别为同一用户')
const [beforeFirst, beforeSecond] = await Promise.all(sessions.map(({ token }) => call('/api/profile', 'GET', token)))
const technicians = await call('/api/technicians', 'GET', first.token)
const technicianId = technicians[0]?.id
if (!technicianId) throw new Error('没有可用于收藏测试的技师')
const firstHadFavorite = beforeFirst.favoriteIds.includes(technicianId)
const secondHadFavorite = beforeSecond.favoriteIds.includes(technicianId)

try {
  const changed = await call(`/api/profile/favorites/${technicianId}`, 'PUT', first.token)
  if (changed.favorite === firstHadFavorite) throw new Error('收藏状态没有发生变化')
  const [afterFirst, afterSecond] = await Promise.all(sessions.map(({ token }) => call('/api/profile', 'GET', token)))
  if (afterFirst.favoriteIds.includes(technicianId) === firstHadFavorite) throw new Error('账号 A 的收藏未更新')
  if (afterSecond.favoriteIds.includes(technicianId) !== secondHadFavorite) throw new Error('账号 B 的收藏被账号 A 改动')
  console.log('PASS: 两个账号的技师收藏互不影响，后端已持久化')
} finally {
  const restored = await call(`/api/profile/favorites/${technicianId}`, 'PUT', first.token)
  if (restored.favorite !== firstHadFavorite) throw new Error('测试后未能恢复账号 A 原有收藏状态')
}
