import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, args: ['--no-sandbox'] })
const appUrl = process.env.APP_URL ?? 'http://127.0.0.1:4173/'
let failed = false

function report(label, pass, detail) {
  console.log(`${pass ? 'PASS' : 'FAIL'} ${label}: ${JSON.stringify(detail)}`)
  if (!pass) failed = true
}

async function openAdmin(width) {
  const page = await browser.newPage()
  await page.setViewport({ width, height: 760 })
  await page.evaluateOnNewDocument(() => {
    localStorage.clear()
    localStorage.setItem('luohan_auth_v2', 'true')
    localStorage.setItem('luohan_session_user_v1', JSON.stringify({ id: 'admin-layout-test', phone: '13700137000', name: '平台管理员', role: 'ADMIN' }))
  })
  await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.waitForSelector('.admin-shell')
  return page
}

try {
  for (const width of [1280, 1024, 900, 720, 390]) {
    const page = await openAdmin(width)
    await page.evaluate(() => [...document.querySelectorAll('.admin-sidebar nav button')].find((button) => button.textContent?.includes('订单管理'))?.click())
    await page.waitForSelector('.order-query-panel')
    const geometry = await page.evaluate(() => {
      const panel = document.querySelector('.order-query-panel')?.getBoundingClientRect()
      const result = document.querySelector('.order-query-result')?.getBoundingClientRect()
      const select = document.querySelector('.order-tech-select')?.getBoundingClientRect()
      if (!panel || !result || !select) return { contained: false, reason: 'missing elements' }
      return {
        contained: result.left >= panel.left && result.right <= panel.right + 1 && result.top >= panel.top && result.bottom <= panel.bottom + 1 && select.right <= panel.right + 1,
        panel: { left: panel.left, right: panel.right, top: panel.top, bottom: panel.bottom },
        result: { left: result.left, right: result.right, top: result.top, bottom: result.bottom },
        selectRight: select.right,
      }
    })
    report(`order filter contained at ${width}px`, geometry.contained, geometry)
    await page.close()
  }

  const page = await openAdmin(1280)
  const userNav = await page.evaluate(() => [...document.querySelectorAll('.admin-sidebar nav button')].some((button) => button.textContent?.includes('用户管理')))
  report('admin exposes user management', userNav, { userNav })
  await page.close()
} finally {
  await browser.close()
}

if (failed) process.exit(1)
