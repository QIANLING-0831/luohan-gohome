import type { Service, Technician } from './types'

export const center = { lat: 31.2304, lng: 121.4737 }

export const technicians: Technician[] = [
  { id: 1, name: '陈静', title: '金牌理疗师', rating: 4.98, orders: 862, lat: 31.2339, lng: 121.4672, price: 239, img: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=300&q=85', intro: '8年经络理疗经验，擅长肩颈放松与久坐疲劳改善。手法沉稳，力度可按需调节。' },
  { id: 2, name: '周岚', title: '资深推拿师', rating: 4.96, orders: 619, lat: 31.2301, lng: 121.4603, price: 269, img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=85', intro: '专注中式推拿与精油舒缓，服务细致，善于针对性缓解腰背紧张。' },
  { id: 3, name: '林悦', title: '芳疗师', rating: 4.93, orders: 476, lat: 31.2266, lng: 121.4728, price: 299, img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=85', intro: '国家认证芳疗师，结合呼吸节奏与精油按摩，打造舒缓放松体验。' },
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
