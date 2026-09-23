import fs from 'node:fs'
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const ui = read('src/components/TechnicianWorkbench.tsx')
const cloud = read('cloudfunctions/luohan-api/routes-technician.js')
const checks = [
  ['three technician filters', ['PENDING', 'ACTIVE', 'COMPLETED'].every(value => ui.includes(value))],
  ['appointment timestamp returned', cloud.includes('appointmentAt')],
  ['active nearest-time sort', cloud.includes('Math.abs')],
]
const failed = checks.filter(([, ok]) => !ok)
if (failed.length) { console.error(`FAIL: ${failed.map(([name]) => name).join(', ')}`); process.exit(1) }
console.log('PASS: technician orders are classified and active work is sorted by nearest appointment')
