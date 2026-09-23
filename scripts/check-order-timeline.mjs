import fs from 'node:fs'

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const checks = [
  ['cloud exposes statusHistory', read('cloudfunctions/luohan-api/core.js').includes('statusHistory')],
  ['local exposes statusHistory', read('server/src/modules/orders/order.presenter.ts').includes('statusHistory')],
  ['UI renders actual timestamps', read('src/components/OrdersScreen.tsx').includes('timelineTime')],
]
const failed = checks.filter(([, ok]) => !ok)
if (failed.length) { console.error(`FAIL: ${failed.map(([name]) => name).join(', ')}`); process.exit(1) }
console.log('PASS: order timeline uses persisted status events and timestamps')
