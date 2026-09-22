import type { Service, Technician } from './types'
import technicianChen from './assets/technician-chen.jpg'
import technicianZhou from './assets/technician-zhou.jpg'
import technicianLin from './assets/technician-lin.jpg'

export const center = { lat: 31.2304, lng: 121.4737 }

export const technicians: Technician[] = [
  { id: 1, name: '陈静', title: '金牌理疗师', rating: 4.98, orders: 862, lat: 31.2339, lng: 121.4672, price: 239, img: technicianChen, intro: '8年经络理疗经验，擅长肩颈放松与久坐疲劳改善。手法沉稳，力度可按需调节。', experienceYears: 8, onTimeRate: 100, workStart: '10:00', workEnd: '22:00', workDays: [0,1,2,3,4,5,6] },
  { id: 2, name: '周岚', title: '资深推拿师', rating: 4.96, orders: 619, lat: 31.2301, lng: 121.4603, price: 269, img: technicianZhou, intro: '专注中式推拿与精油舒缓，服务细致，善于针对性缓解腰背紧张。', experienceYears: 6, onTimeRate: 100, workStart: '10:00', workEnd: '22:00', workDays: [0,1,2,3,4,5,6] },
  { id: 3, name: '林悦', title: '芳疗师', rating: 4.93, orders: 476, lat: 31.2266, lng: 121.4728, price: 299, img: technicianLin, intro: '国家认证芳疗师，结合呼吸节奏与精油按摩，打造舒缓放松体验。', experienceYears: 5, onTimeRate: 100, workStart: '10:00', workEnd: '22:00', workDays: [0,1,2,3,4,5,6] },
]

export const services: Service[] = [
  { id: 'neck', name: '肩颈深度放松', desc: '60分钟 · 针对久坐疲劳', price: 239 },
  { id: 'oil', name: '精油推背', desc: '80分钟 · 全背舒缓', price: 299 },
  { id: 'tuina', name: '中式经络推拿', desc: '90分钟 · 全身经络疏解', price: 369 },
]

export const orderStatuses = ['待接单', '已接单', '已出发', '已到达', '服务中', '已完成']

export function distanceKm(tech: Pick<Technician, 'lat' | 'lng'>) {
  const x = (tech.lng - center.lng) * 91.2
  const y = (tech.lat - center.lat) * 111
  return Math.sqrt(x * x + y * y)
}

export function futureDates() {
  return Array.from({ length: 3 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() + index)
    return { label: index === 0 ? '今天' : index === 1 ? '明天' : '后天', value: `${date.getMonth() + 1}/${date.getDate()}` }
  })
}
