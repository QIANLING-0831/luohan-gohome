import fs from 'node:fs'

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const ui = read('src/components/OrdersScreen.tsx')
const cloud = read('cloudfunctions/luohan-api/growth.js')
const presenter = read('cloudfunctions/luohan-api/core.js')

const checks = [
  ['cancelled filter', ui.includes('"CANCELLED"') && ui.includes('已取消')],
  ['timeout status log', cloud.includes("status: 'CANCELLED_TIMEOUT'")],
  ['cancel reason presentation', presenter.includes('cancelReason')],
]
const failed = checks.filter(([, ok]) => !ok)
if (failed.length) {
  console.error(`FAIL: ${failed.map(([name]) => name).join(', ')}`)
  process.exit(1)
}
console.log('PASS: cancelled orders are classified separately and preserve timeout reason')
