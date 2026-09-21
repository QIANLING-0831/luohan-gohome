import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const detail = readFileSync(join(process.cwd(), 'src', 'components', 'TechnicianDetail.tsx'), 'utf8')
const profile = readFileSync(join(process.cwd(), 'src', 'components', 'ProfileScreen.tsx'), 'utf8')
const booking = readFileSync(join(process.cwd(), 'src', 'components', 'BookingScreen.tsx'), 'utf8')
const orders = readFileSync(join(process.cwd(), 'src', 'components', 'OrdersScreen.tsx'), 'utf8')
const home = readFileSync(join(process.cwd(), 'src', 'components', 'HomeScreen.tsx'), 'utf8')
const payment = readFileSync(join(process.cwd(), 'src', 'components', 'PaymentScreen.tsx'), 'utf8')
const failures = []

if (!/<button[^>]+slot-pill/.test(detail) || !/selectedSlot/.test(detail) || !/onSlotSelect/.test(detail)) {
  failures.push('近期可约时间必须可选择、显示选中态，并把选择传给预约流程')
}

if (!/selectedPreferences/.test(profile) || !/togglePreference/.test(profile) || !/selectedPreferences\.includes/.test(profile)) {
  failures.push('按摩偏好必须在点击后切换可见选中态')
}

if (!/onRebook/.test(profile) || !/history-item/.test(profile)) {
  failures.push('历史订单必须能够进入再次预约流程')
}

if (!/addressOpen/.test(booking) || !/occupied/.test(booking) || !/address-option/.test(booking)) {
  failures.push('预约表单必须支持档期占用与地址选择')
}

if (!/Panel = ["']chat["'] \| ["']cancel["'] \| ["']review["']/.test(orders) || !/sendMessage/.test(orders) || !/submitReview/.test(orders)) {
  failures.push('订单页必须包含聊天、取消和评价闭环')
}

if (!/luohan_favorites_v1/.test(home) || !/tech-search/.test(home) || !/favorite-btn/.test(home) || !/search-empty/.test(home)) {
  failures.push('首页必须支持搜索、收藏筛选和空状态反馈')
}

if (!/couponOpen/.test(payment) || !/paidAmount/.test(payment) || !/price-breakdown/.test(payment) || !/coupon-options/.test(payment)) {
  failures.push('支付页必须支持优惠券选择和实付金额联动')
}

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('PASS: stateful interaction feedback is present')
