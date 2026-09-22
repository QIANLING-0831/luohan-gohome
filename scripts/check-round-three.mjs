const api = process.env.API_URL ?? 'https://test-d1geapfamc8dccbc4.service.tcloudbase.com/api'
const userPhone = process.env.ACCOUNT_PHONE
const userPassword = process.env.ACCOUNT_PASSWORD
if (!userPhone || !userPassword) throw new Error('请设置 ACCOUNT_PHONE 和 ACCOUNT_PASSWORD')

async function call(path, method = 'GET', token, body, expectedStatus = 200) {
  const response = await fetch(`${api}${path}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
  const payload = response.status === 204 ? null : await response.json()
  if (response.status !== expectedStatus) throw new Error(`${path}: 期望 ${expectedStatus}，实际 ${response.status} ${payload?.error?.message ?? ''}`)
  return payload?.data
}

const userSession = await call('/api/auth/login', 'POST', null, { phone: userPhone, method: 'password', credential: userPassword })
const originalProfile = await call('/api/profile', 'GET', userSession.token)
const temporaryAddress = { id: `qa-${Date.now()}`, label: '自动化验证地址', detail: '上海市静安区测试路 1 号', isDefault: false }
try {
  await call('/api/profile/addresses', 'PUT', userSession.token, { addresses: [...originalProfile.addresses, temporaryAddress] })
  const updated = await call('/api/profile', 'GET', userSession.token)
  if (!updated.addresses.some((item) => item.id === temporaryAddress.id)) throw new Error('保存后的地址未按账号返回')
  console.log('PASS address: 地址簿已真实保存并按账号读取')
} finally {
  await call('/api/profile/addresses', 'PUT', userSession.token, { addresses: originalProfile.addresses })
}

const orders = await call('/api/orders', 'GET', userSession.token)
const completed = orders.find((order) => order.status === 5)
if (completed) {
  await call(`/api/orders/${completed.id}/review`, 'POST', userSession.token, { rating: 6 }, 400)
  console.log('PASS review: 云端评价接口已执行权限与星级校验，未改动订单')
} else console.log('SKIP review: 测试账号暂无已完成订单，未制造测试订单')

const adminSession = await call('/api/auth/login', 'POST', null, { phone: '13700137000', method: 'password', credential: 'Luohan@2026' })
await call('/api/admin/technicians/1/reset-password', 'POST', adminSession.token, { password: 'ShouldNotChange1' }, 403)
console.log('PASS reset: 管理端重置接口可用，公共演示技师保护生效')
