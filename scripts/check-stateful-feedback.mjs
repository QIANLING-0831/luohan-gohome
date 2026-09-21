import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const detail = readFileSync(join(process.cwd(), 'src', 'components', 'TechnicianDetail.tsx'), 'utf8')
const profile = readFileSync(join(process.cwd(), 'src', 'components', 'ProfileScreen.tsx'), 'utf8')
const failures = []

if (!/<button[^>]+slot-pill/.test(detail) || !/selectedSlot/.test(detail) || !/onSlotSelect/.test(detail)) {
  failures.push('近期可约时间必须可选择、显示选中态，并把选择传给预约流程')
}

if (!/selectedPreferences/.test(profile) || !/togglePreference/.test(profile) || !/selectedPreferences\.includes/.test(profile)) {
  failures.push('按摩偏好必须在点击后切换可见选中态')
}

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('PASS: stateful interaction feedback is present')
