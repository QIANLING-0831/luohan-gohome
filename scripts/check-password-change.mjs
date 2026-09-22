const api = process.env.API_URL ?? 'https://test-d1geapfamc8dccbc4.service.tcloudbase.com/api'
const phone = process.env.ACCOUNT_PHONE
const original = process.env.ACCOUNT_PASSWORD
const temporary = process.env.TEMP_PASSWORD
if (!phone || !original || !temporary) throw new Error('请设置 ACCOUNT_PHONE、ACCOUNT_PASSWORD 和 TEMP_PASSWORD')

async function request(path, method, token, body) {
  const response = await fetch(`${api}${path}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error?.message ?? `请求失败 ${response.status}`)
  return payload.data
}

async function requestStatus(path, token) { return fetch(`${api}${path}`, { headers: { authorization: `Bearer ${token}` } }) }

const session = await request('/api/auth/login', 'POST', null, { phone, method: 'password', credential: original })
let changed = false
let currentToken = session.token
try {
  await request('/api/auth/password', 'PUT', session.token, { currentPassword: original, newPassword: temporary })
  changed = true
  const stale = await requestStatus('/api/auth/me', session.token)
  if (stale.status !== 401) throw new Error(`旧登录令牌应失效，实际状态 ${stale.status}`)
  const verified = await request('/api/auth/login', 'POST', null, { phone, method: 'password', credential: temporary })
  currentToken = verified.token
  if (verified.user.phone !== phone) throw new Error('新密码登录到了错误账号')
  console.log('PASS: 修改密码后旧令牌失效，新密码可重新登录')
} finally {
  if (changed) {
    try { await request('/api/auth/password', 'PUT', currentToken, { currentPassword: temporary, newPassword: original }) }
    catch { const recovery = await request('/api/auth/login', 'POST', null, { phone, method: 'password', credential: temporary }); await request('/api/auth/password', 'PUT', recovery.token, { currentPassword: temporary, newPassword: original }) }
  }
}
