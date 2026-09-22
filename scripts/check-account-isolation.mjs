import puppeteer from 'puppeteer-core'

const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const appUrl = process.env.APP_URL ?? 'https://luohan-home-care-cn.surge.sh/'
const phone = process.env.ACCOUNT_PHONE
const password = process.env.ACCOUNT_PASSWORD
const expectedName = process.env.ACCOUNT_NAME
const forbiddenName = process.env.FORBIDDEN_NAME ?? '罗女士'
if (!phone || !password || !expectedName) throw new Error('请通过 ACCOUNT_PHONE、ACCOUNT_PASSWORD、ACCOUNT_NAME 设置待测账号')

async function loginAndOpenProfile(page, accountPhone, accountPassword) {
  await page.click('input[aria-label="手机号"]')
  await page.keyboard.down('Control')
  await page.keyboard.press('A')
  await page.keyboard.up('Control')
  await page.type('input[aria-label="手机号"]', accountPhone)
  await page.evaluate(() => [...document.querySelectorAll('.login-method-tabs button')].find((button) => button.textContent?.includes('密码登录'))?.click())
  await page.waitForSelector('input[aria-label="密码"]')
  await page.type('input[aria-label="密码"]', accountPassword)
  await page.waitForFunction(() => {
    const button = document.querySelector('.login-card button.primary')
    if (!button) return false
    const rect = button.getBoundingClientRect()
    return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) === button
  })
  await page.click('button.primary')
  await page.waitForFunction(() => !document.querySelector('.login-screen') || document.querySelector('.auth-error'), { timeout: 10000 }).catch(async (error) => {
    const state = await page.evaluate(() => ({ phone: document.querySelector('input[aria-label="手机号"]')?.value, passwordLength: document.querySelector('input[aria-label="密码"]')?.value.length, authenticated: localStorage.getItem('luohan_auth_v2'), user: localStorage.getItem('luohan_session_user_v1'), tokenPresent: Boolean(localStorage.getItem('luohan_access_token_v1')), text: document.body.innerText.slice(0, 220) }))
    throw new Error(`登录页面未离开：${JSON.stringify(state)}`, { cause: error })
  })
  const loginError = await page.$eval('.auth-error', (element) => element.textContent).catch(() => '')
  if (loginError) throw new Error(`登录失败：${loginError}`)
  await page.evaluate(() => [...document.querySelectorAll('.bottom-nav button')].find((button) => button.textContent?.includes('我的'))?.click())
  await page.waitForSelector('.profile-card')
  await new Promise((resolve) => setTimeout(resolve, 500))
}

const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox'] })
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844 })
  await page.evaluateOnNewDocument(() => localStorage.clear())
  await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await loginAndOpenProfile(page, phone, password)
  const result = await page.evaluate(({ expected, forbidden }) => {
    const text = document.body.innerText
    return { expectedVisible: text.includes(expected), forbiddenVisible: text.includes(forbidden), preview: text.slice(0, 300).replace(/\s+/g, ' ') }
  }, { expected: expectedName, forbidden: forbiddenName })
  const passed = result.expectedVisible && !result.forbiddenVisible
  console.log(`${passed ? 'PASS' : 'FAIL'} account isolation: ${JSON.stringify({ phone, expectedName, forbiddenName, ...result })}`)
  if (!passed) process.exitCode = 1
  if (process.env.SECOND_PHONE && process.env.SECOND_PASSWORD && process.env.SECOND_NAME) {
    await page.click('.logout')
    await page.waitForSelector('.login-screen')
    await loginAndOpenProfile(page, process.env.SECOND_PHONE, process.env.SECOND_PASSWORD)
    const second = await page.evaluate(({ expected, forbidden }) => {
      const text = document.querySelector('.profile-card')?.textContent ?? ''
      return { expectedVisible: text.includes(expected), forbiddenVisible: text.includes(forbidden), profileText: text.replace(/\s+/g, ' ') }
    }, { expected: process.env.SECOND_NAME, forbidden: expectedName })
    const secondPassed = second.expectedVisible && !second.forbiddenVisible
    console.log(`${secondPassed ? 'PASS' : 'FAIL'} same-browser account switch: ${JSON.stringify(second)}`)
    if (!secondPassed) process.exitCode = 1
  }
} finally {
  await browser.close()
}
