import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const [app, ordersUi, booking, detail, cloudOrders, localOrders, cloudAdmin] = await Promise.all([
  read('src/App.tsx'), read('src/components/OrdersScreen.tsx'), read('src/components/BookingScreen.tsx'), read('src/components/TechnicianDetail.tsx'),
  read('cloudfunctions/luohan-api/routes-orders.js'), read('server/src/modules/orders/order.service.ts'), read('cloudfunctions/luohan-api/routes-admin.js'),
])

const checks = [
  ['生产环境禁用离线假成功', app.includes('import.meta.env.DEV') && app.includes('服务暂时不可用')],
  ['用户端不能推进履约状态', !ordersUi.includes('推进到「') && !cloudOrders.includes("match[2] === 'advance'")],
  ['档期加载失败时关闭预约', booking.includes('availabilityError') && detail.includes('availabilityError')],
  ['预约校验服务结束时间', cloudOrders.includes('service.duration') && localOrders.includes('service.duration')],
  ['冲突校验覆盖时段重叠', cloudOrders.includes('existingEnd') && localOrders.includes('existingEnd')],
  ['用户历史包含已取消订单', localOrders.includes('findMany({ where: { userId }, orderBy:')],
  ['管理端分布包含取消状态', cloudAdmin.includes("[...c.statuses, 'CANCELLED']")],
]

const failed = checks.filter(([, passed]) => !passed)
for (const [name, passed] of checks) console.log(`${passed ? 'PASS' : 'FAIL'}: ${name}`)
if (failed.length) throw new Error(`生产保护检查失败 ${failed.length} 项`)
