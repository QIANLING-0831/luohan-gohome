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

const session = await request('/api/auth/login', 'POST', null, { phone, method: 'password', credential: original })
let changed = false
try {
  await request('/api/auth/password', 'PUT', session.token, { currentPassword: original, newPassword: temporary })
  changed = true
  const verified = await request('/api/auth/login', 'POST', null, { phone, method: 'password', credential: temporary })
  if (verified.user.phone !== phone) throw new Error('新密码登录到了错误账号')
  console.log('PASS: 自注册账号修改密码后可用新密码登录')
} finally {
  if (changed) await request('/api/auth/password', 'PUT', session.token, { currentPassword: temporary, newPassword: original })
}
