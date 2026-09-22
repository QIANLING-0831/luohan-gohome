import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--no-sandbox'],
})

let failed = false
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 375, height: 667 }, { width: 360, height: 640 }, { width: 320, height: 568 }]) {
    const page = await browser.newPage()
    await page.setViewport(viewport)
    await page.goto(process.env.APP_URL ?? 'http://127.0.0.1:5173/', { waitUntil: 'networkidle0' })
    await page.evaluate(() => localStorage.clear())
    await page.reload({ waitUntil: 'networkidle0' })
    const result = await page.evaluate(() => {
      const screen = document.querySelector('.login-screen')
      const submit = [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === '登录')
      if (!screen || !submit) return { visible: false, reason: 'missing login elements' }
      const rect = submit.getBoundingClientRect()
      return {
        visible: rect.top >= 0 && rect.bottom <= window.innerHeight,
        top: Math.round(rect.top), bottom: Math.round(rect.bottom), viewportHeight: window.innerHeight,
        scrollable: screen.scrollHeight <= screen.clientHeight || getComputedStyle(screen).overflowY !== 'hidden',
      }
    })
    await page.click('.role-select-trigger')
    const opened = await page.$eval('.role-select-trigger', (element) => element.getAttribute('aria-expanded') === 'true')
    await page.click('.role-dropdown button:nth-child(3)')
    const selection = await page.evaluate(() => ({
      phone: document.querySelector('.phone-field input')?.value,
      collapsed: document.querySelector('.role-select-trigger')?.getAttribute('aria-expanded') === 'false',
      passwordSelected: document.querySelector('[role="tab"][aria-selected="true"]')?.textContent === '密码登录',
      codeDisabled: document.querySelectorAll('[role="tab"]')[1]?.disabled === true,
      passwordInput: document.querySelector('input[aria-label="密码"]')?.type === 'password',
    }))
    const pass = result.visible && result.scrollable && opened && selection.phone === '13700137000' && selection.collapsed && selection.passwordSelected && selection.codeDisabled && selection.passwordInput
    console.log(`${pass ? 'PASS' : 'FAIL'} ${viewport.width}x${viewport.height}: ${JSON.stringify({ ...result, dropdownOpened: opened, selection })}`)
    if (!pass) failed = true
    await page.close()
  }
} finally {
  await browser.close()
}

if (failed) process.exit(1)
