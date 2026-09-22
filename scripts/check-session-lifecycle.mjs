import puppeteer from 'puppeteer-core'

const url = process.env.APP_URL ?? 'http://127.0.0.1:5173/'
const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, args: ['--no-sandbox'] })

try {
  const page = await browser.newPage()
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('luohan_auth_v2', 'true')
    localStorage.setItem('luohan_session_user_v1', JSON.stringify({ id: 'legacy', role: 'USER', name: '旧静态账号', phone: '13800138000' }))
    localStorage.setItem('luohan_access_token_v1', 'legacy-static-token')
  })
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.waitForSelector('.login-screen')
  const migration = await page.evaluate(() => ({
    oldAuth: localStorage.getItem('luohan_auth_v2'),
    oldUser: localStorage.getItem('luohan_session_user_v1'),
    oldToken: localStorage.getItem('luohan_access_token_v1'),
    sessionToken: sessionStorage.getItem('luohan_access_token_v1'),
  }))
  if (Object.values(migration).some(Boolean)) throw new Error(`旧缓存未清干净：${JSON.stringify(migration)}`)
  console.log(`PASS: 旧版持久登录已清除，直接访问显示登录页 ${JSON.stringify(migration)}`)

  await page.evaluate(() => {
    sessionStorage.setItem('luohan_auth_v2', 'true')
    sessionStorage.setItem('luohan_session_user_v1', JSON.stringify({ id: 'stale', role: 'USER', name: '假登录账号', phone: '13800138000' }))
    sessionStorage.removeItem('luohan_access_token_v1')
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.login-screen')
  const stale = await page.evaluate(() => ({ authenticated: sessionStorage.getItem('luohan_auth_v2'), user: sessionStorage.getItem('luohan_session_user_v1') }))
  if (stale.authenticated !== 'false' || stale.user !== 'null') throw new Error(`假登录状态未重置：${JSON.stringify(stale)}`)
  console.log(`PASS: 页面身份存在但 Token 缺失时自动返回登录页 ${JSON.stringify(stale)}`)

  await page.click('input[aria-label="手机号"]')
  await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control')
  await page.type('input[aria-label="手机号"]', '13800138000')
  await page.evaluate(() => [...document.querySelectorAll('.login-method-tabs button')].find((button) => button.textContent?.includes('密码登录'))?.click())
  await page.waitForSelector('input[aria-label="密码"]')
  await page.type('input[aria-label="密码"]', 'Demo@2026')
  await page.click('.login-card button.primary')
  await page.waitForFunction(() => !document.querySelector('.login-screen'), { timeout: 10000 })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !document.querySelector('.login-screen'), { timeout: 10000 })
  console.log('PASS: 当前标签页刷新后保持登录')

  const newVisit = await browser.newPage()
  await newVisit.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await newVisit.waitForSelector('.login-screen')
  console.log('PASS: 新标签页直接访问需要重新登录')
  await newVisit.close()
} finally {
  await browser.close()
}
