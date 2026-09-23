import fs from 'node:fs'

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const checks = [
  ['cloud review content', read('cloudfunctions/luohan-api/routes-orders.js').includes("action: 'ORDER_REVIEW'")],
  ['public reviews endpoint', read('cloudfunctions/luohan-api/index.js').includes('/reviews$/')],
  ['idempotent order key', read('cloudfunctions/luohan-api/routes-orders.js').includes('requestId')],
  ['pending timeout', read('cloudfunctions/luohan-api/growth.js').includes('ACCEPT_TIMEOUT_MS')],
  ['analytics module', read('cloudfunctions/luohan-api/growth.js').includes('technicianRanking')],
  ['review UI uses API', read('src/components/TechnicianDetail.tsx').includes('reviewClient.forTechnician')],
  ['duplicate submit guard', read('src/App.tsx').includes('paymentRequestId')],
]
const failed = checks.filter(([, ok]) => !ok)
if (failed.length) { console.error(`Growth feature checks failed: ${failed.map(([name]) => name).join(', ')}`); process.exit(1) }
console.log(`Growth feature checks passed (${checks.length})`)
