import puppeteer from 'puppeteer-core'

const url = process.env.APP_URL ?? 'https://luohan-home-care-cn.surge.sh/'
const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, args: ['--no-sandbox'] })

async function pageFor(phone, password) {
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844 })
  await page.evaluateOnNewDocument(() => localStorage.clear())
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.click('input[aria-label="手机号"]')
  await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control')
  await page.type('input[aria-label="手机号"]', phone)
  await page.evaluate(() => [...document.querySelectorAll('.login-method-tabs button')].find((button) => button.textContent?.includes('密码登录'))?.click())
  await page.waitForSelector('input[aria-label="密码"]')
  await page.type('input[aria-label="密码"]', password)
  await page.click('.login-card button.primary')
  await page.waitForFunction(() => !document.querySelector('.login-screen'), { timeout: 10000 })
  return page
}

try {
  const customer = await pageFor('13800138000', 'Demo@2026')
  await customer.evaluate(() => [...document.querySelectorAll('.bottom-nav button')].find((button) => button.textContent?.includes('订单'))?.click())
  await customer.waitForSelector('.user-order-overview')
  const orders = await customer.$$eval('.user-order-item', (items) => items.length)
  await customer.evaluate(() => [...document.querySelectorAll('.user-order-filters button')].find((button) => button.textContent?.includes('已完成'))?.click())
  const completedItem = await customer.$('.user-order-item')
  if (completedItem) {
    await completedItem.click()
    const reviewButton = await customer.$('.status-actions .primary')
    if (reviewButton && (await reviewButton.evaluate((button) => button.textContent ?? '')).includes('评价')) { await reviewButton.click(); await customer.waitForSelector('.rating-stars'); await customer.evaluate(() => document.querySelector('.sheet-mask.open')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))) }
  }
  await customer.evaluate(() => [...document.querySelectorAll('.bottom-nav button')].find((button) => button.textContent?.includes('消息'))?.click())
  await customer.waitForSelector('.message-list')
  const messageText = await customer.$eval('.screen.active', (element) => element.textContent)
  if (!orders || !messageText.includes('罗女士') || !messageText.includes('订单')) throw new Error('用户订单或账号消息未正确呈现')
  await customer.evaluate(() => [...document.querySelectorAll('.bottom-nav button')].find((button) => button.textContent?.includes('我的'))?.click())
  await customer.waitForSelector('.profile-card')
  const hasAddressBook = await customer.evaluate(() => [...document.querySelectorAll('.menu-item')].some((button) => button.textContent?.includes('服务地址')))
  if (!hasAddressBook) throw new Error('用户端缺少服务地址管理入口')
  await customer.evaluate(() => [...document.querySelectorAll('.menu-item')].find((button) => button.textContent?.includes('修改登录密码'))?.click())
  await customer.waitForSelector('.account-dialog-mask.open')
  console.log(`PASS customer: ${orders} 条订单可切换，消息按罗女士账号生成`)
  await customer.close()

  const technician = await pageFor('13900139000', 'Demo@2026')
  await technician.waitForSelector('.workbench-shell')
  const technicianText = await technician.$eval('.workbench-shell', (element) => element.textContent)
  if (!technicianText.includes('陈静') || !technicianText.includes('139****9000')) throw new Error('技师账号没有进入对应工作台')
  await technician.evaluate(() => [...document.querySelectorAll('.workspace-account-actions button')].find((button) => button.textContent?.includes('修改密码'))?.click())
  await technician.waitForSelector('.account-dialog-mask.open')
  console.log('PASS technician: 登录账号进入陈静的独立工作台')
  await technician.close()

  const admin = await pageFor('13700137000', 'Luohan@2026')
  await admin.waitForSelector('.admin-shell')
  await admin.evaluate(() => [...document.querySelectorAll('.admin-account-actions button')].find((button) => button.textContent?.includes('安全'))?.click())
  await admin.waitForSelector('.account-dialog-mask.open')
  await admin.click('.account-dialog header button')
  await admin.evaluate(() => [...document.querySelectorAll('.admin-sidebar button')].find((button) => button.textContent?.includes('技师管理'))?.click())
  await admin.waitForSelector('.admin-add-tech')
  await admin.waitForSelector('.tech-detail-btn')
  await admin.click('.tech-detail-btn')
  await admin.waitForSelector('.admin-modal-mask.open input[aria-label="重置技师密码"]')
  await admin.evaluate(() => [...document.querySelectorAll('.admin-modal-mask.open button')].find((button) => button.getAttribute('aria-label')?.includes('关闭技师档案'))?.click())
  await admin.click('.admin-add-tech')
  await admin.waitForSelector('input[aria-label="技师登录手机号"]')
  const hasPassword = Boolean(await admin.$('input[aria-label="技师初始密码"]'))
  if (!hasPassword) throw new Error('新增技师表单缺少独立账号字段')
  console.log('PASS admin: 新增技师表单包含登录手机号和初始密码')
  await admin.close()
} finally {
  await browser.close()
}
