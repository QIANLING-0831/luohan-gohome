import puppeteer from 'puppeteer-core'

const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const appUrl = process.env.APP_URL ?? 'https://luohan-home-care-cn.surge.sh/'
const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox'] })
let failed = false

async function openRole(role, viewport, onRequest) {
  const page = await browser.newPage()
  await page.setViewport(viewport)
  if (onRequest) page.on('request', onRequest)
  await page.evaluateOnNewDocument(() => localStorage.clear())
  await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.click('.role-select-trigger')
  await page.evaluate((nextRole) => [...document.querySelectorAll('.role-dropdown button')].find((button) => button.textContent?.includes(nextRole === 'ADMIN' ? '管理员' : '技师'))?.click(), role)
  if (role === 'ADMIN') await page.type('input[aria-label="密码"]', 'Luohan@2026')
  await page.click('button.primary')
  await page.waitForSelector(role === 'ADMIN' ? '.admin-shell' : '.workbench-shell', { timeout: 10000 })
  return page
}

function report(label, pass, detail) {
  console.log(`${pass ? 'PASS' : 'FAIL'} ${label}: ${JSON.stringify(detail)}`)
  if (!pass) failed = true
}

try {
  let adminRequests = 0
  const admin = await openRole('ADMIN', { width: 1280, height: 760 }, (request) => { if (request.url().includes('/api/admin/') && request.method() !== 'OPTIONS') adminRequests += 1 })
  await new Promise((resolve) => setTimeout(resolve, 2200))
  report('admin request frequency', adminRequests <= 5, { requestsIn2_2Seconds: adminRequests, expectedMax: 5 })
  await admin.evaluate(() => [...document.querySelectorAll('.admin-sidebar nav button')].find((button) => button.textContent?.includes('技师管理'))?.click())
  await admin.waitForSelector('.technician-admin-card .tech-admin-head > img')
  await admin.waitForFunction(() => [...document.querySelectorAll('.technician-admin-card .tech-admin-head > img')].every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0), { timeout: 10000 })
  const photoCount = await admin.$$eval('.technician-admin-card .tech-admin-head > img', (images) => images.filter((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0).length)
  report('technician photo avatars', photoCount >= 3, { loadedPhotos: photoCount, expectedMin: 3 })
  const pagination = await admin.evaluate(() => ({ cards: document.querySelectorAll('.technician-admin-card').length, label: document.querySelector('.tech-pagination')?.textContent?.replace(/\s+/g, '') ?? '' }))
  report('technician pagination at 12 per page', pagination.cards <= 12 && pagination.label.includes('每页12位'), pagination)
  await admin.click('.tech-detail-btn')
  const editorOpen = await admin.$eval('.admin-modal-mask.open .admin-tech-modal', (element) => Boolean(element))
  report('technician editor opens', editorOpen, { editorOpen })
  const scheduleEditor = await admin.evaluate(() => ({
    timeSelects: document.querySelectorAll('.admin-modal-mask.open .schedule-time-row select').length,
    dayButtons: document.querySelectorAll('.admin-modal-mask.open .schedule-day-options button').length,
    selectedDays: document.querySelectorAll('.admin-modal-mask.open .schedule-day-options button.active').length,
  }))
  report('independent technician schedule editor', scheduleEditor.timeSelects === 2 && scheduleEditor.dayButtons === 7 && scheduleEditor.selectedDays >= 1, scheduleEditor)
  const technicianFormLayout = await admin.evaluate(() => {
    const modal = document.querySelector('.admin-modal-mask.open .technician-form-modal')?.getBoundingClientRect()
    const fields = [...document.querySelectorAll('.admin-modal-mask.open .admin-form-grid .admin-form-field')].slice(0, 2).map((item) => item.getBoundingClientRect())
    const portrait = document.querySelector('.admin-modal-mask.open .portrait-picker')?.getBoundingClientRect()
    return { modalWidth: modal?.width ?? 0, twoColumns: fields.length === 2 && Math.abs(fields[0].top - fields[1].top) < 3 && fields[1].left > fields[0].left, portraitHeight: portrait?.height ?? 0 }
  })
  report('technician form desktop layout', technicianFormLayout.modalWidth >= 650 && technicianFormLayout.twoColumns && technicianFormLayout.portraitHeight >= 90, technicianFormLayout)
  await admin.click('.admin-modal-mask.open .admin-modal-head > button')
  await admin.click('.admin-add-tech')
  const createForm = await admin.evaluate(() => {
    const portrait = document.querySelector('.admin-modal-mask.open .portrait-field')?.getBoundingClientRect()
    const intro = document.querySelector('.admin-modal-mask.open .intro-field')?.getBoundingClientRect()
    const upload = document.querySelector('.admin-modal-mask.open .portrait-field input[type=file]')
    return { required: upload instanceof HTMLInputElement && upload.required, gap: portrait && intro ? intro.top - portrait.bottom : -1, placeholder: Boolean(document.querySelector('.admin-modal-mask.open .portrait-placeholder')) }
  })
  report('required avatar and separated introduction', createForm.required && createForm.placeholder && createForm.gap >= 0, createForm)
  await admin.click('.admin-modal-mask.open .admin-modal-head > button')
  await admin.evaluate(() => [...document.querySelectorAll('.admin-sidebar nav button')].find((button) => button.textContent?.includes('订单管理'))?.click())
  await admin.waitForSelector('.order-query-panel')
  await admin.select('.order-tech-select select', '陈静')
  await admin.type('.order-search input', '罗女士')
  const filteredRows = await admin.$$('.admin-order-row')
  report('order user and technician filters', filteredRows.length >= 1, { matchingRows: filteredRows.length })
  await admin.click('.admin-order-row')
  const orderDetailOpen = await admin.$eval('.order-detail-modal', (element) => element.closest('.admin-modal-mask')?.classList.contains('open'))
  report('order detail opens', Boolean(orderDetailOpen), { orderDetailOpen })
  await admin.click('.order-detail-modal .admin-modal-head > button')
  await admin.evaluate(() => [...document.querySelectorAll('.admin-sidebar nav button')].find((button) => button.textContent?.includes('用户管理'))?.click())
  await admin.waitForSelector('.user-table-row')
  const userRows = await admin.$$('.user-table-row')
  await admin.click('.user-table-row')
  const userDetailOpen = await admin.$eval('.user-detail-modal', (element) => element.closest('.admin-modal-mask')?.classList.contains('open'))
  report('user management and detail', userRows.length >= 1 && Boolean(userDetailOpen), { userRows: userRows.length, userDetailOpen })
  await admin.close()

  for (const width of [800, 900, 1024]) {
    const page = await openRole('ADMIN', { width, height: 760 })
    await page.waitForSelector('.admin-grid > .admin-panel', { timeout: 10000 })
    const layout = await page.evaluate(() => {
      const panels = [...document.querySelectorAll('.admin-grid > .admin-panel')].map((element) => element.getBoundingClientRect())
      return panels.length === 2 ? { firstBottom: panels[0].bottom, secondTop: panels[1].top, stacked: panels[1].top >= panels[0].bottom - 1 } : { stacked: false, panelCount: panels.length }
    })
    report(`admin chart layout ${width}px`, layout.stacked, layout)
    await page.close()
  }

  const mobileAdmin = await openRole('ADMIN', { width: 390, height: 844 })
  await mobileAdmin.evaluate(() => [...document.querySelectorAll('.admin-sidebar nav button')].find((button) => button.textContent?.includes('技师管理'))?.click())
  await mobileAdmin.waitForSelector('.admin-add-tech')
  await mobileAdmin.click('.admin-add-tech')
  const mobileForm = await mobileAdmin.evaluate(() => {
    const modal = document.querySelector('.admin-modal-mask.open .technician-form-modal')?.getBoundingClientRect()
    const fields = [...document.querySelectorAll('.admin-modal-mask.open .admin-form-grid .admin-form-field')].slice(0, 2).map((item) => item.getBoundingClientRect())
    const footer = document.querySelector('.admin-modal-mask.open .admin-modal-actions')?.getBoundingClientRect()
    const portrait = document.querySelector('.admin-modal-mask.open .portrait-field')?.getBoundingClientRect()
    const intro = document.querySelector('.admin-modal-mask.open .intro-field')?.getBoundingClientRect()
    return { modalWidth: modal?.width ?? 0, singleColumn: fields.length === 2 && fields[1].top > fields[0].bottom, footerVisible: Boolean(footer && footer.top < innerHeight && footer.bottom <= innerHeight + 1), avatarIntroGap: portrait && intro ? intro.top - portrait.bottom : -1 }
  })
  report('technician form mobile layout', mobileForm.modalWidth <= 366 && mobileForm.singleColumn && mobileForm.footerVisible && mobileForm.avatarIntroGap >= 0, mobileForm)
  await mobileAdmin.close()

  let techRequests = 0
  const tech = await openRole('TECHNICIAN', { width: 1280, height: 620 }, (request) => { if (request.url().includes('/api/technician-workbench/') && request.method() !== 'OPTIONS') techRequests += 1 })
  await new Promise((resolve) => setTimeout(resolve, 2200))
  report('technician request frequency', techRequests <= 1, { requestsIn2_2Seconds: techRequests, expectedMax: 1 })
  const scrolling = await tech.evaluate(() => {
    const shell = document.querySelector('.workbench-shell')
    if (!shell) return { scrollable: false, reason: 'missing shell' }
    const style = getComputedStyle(shell)
    const before = shell.scrollTop
    shell.scrollTop = 200
    return { scrollable: shell.scrollHeight > shell.clientHeight && shell.scrollTop > before, overflowY: style.overflowY, clientHeight: shell.clientHeight, scrollHeight: shell.scrollHeight }
  })
  report('technician workspace scrolling', scrolling.scrollable, scrolling)
  await tech.click('.work-order-actions button')
  await tech.waitForSelector('.work-route-preview')
  const interaction = await tech.evaluate(() => ({ route: Boolean(document.querySelector('.work-route-preview')), feedback: document.querySelector('.work-feedback')?.textContent?.trim() ?? '' }))
  report('technician route feedback', interaction.route && interaction.feedback.includes('路线规划'), interaction)
  await tech.close()
} finally {
  await browser.close()
}

if (failed) process.exit(1)
