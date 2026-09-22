import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../server/src/shared/password.ts'

const prisma = new PrismaClient()

async function main() {
  const demoPasswordHash = await hashPassword(process.env.DEMO_LOGIN_PASSWORD ?? 'Demo@2026')
  const services = [
    { id: 'neck', name: '肩颈深度放松', description: '60分钟 · 针对久坐疲劳', price: 239, duration: 60 },
    { id: 'oil', name: '精油推背', description: '80分钟 · 全背舒缓', price: 299, duration: 80 },
    { id: 'tuina', name: '中式经络推拿', description: '90分钟 · 全身经络疏解', price: 369, duration: 90 },
  ]
  for (const service of services) await prisma.service.upsert({ where: { id: service.id }, update: service, create: service })

  const technicians = [
    { id: 1, name: '陈静', title: '金牌理疗师', rating: 4.98, orderCount: 862, latitude: 31.2339, longitude: 121.4672, price: 239, imageKey: 'chen', intro: '8年经络理疗经验，擅长肩颈放松与久坐疲劳改善。手法沉稳，力度可按需调节。' },
    { id: 2, name: '周岚', title: '资深推拿师', rating: 4.96, orderCount: 619, latitude: 31.2301, longitude: 121.4603, price: 269, imageKey: 'zhou', intro: '专注中式推拿与精油舒缓，服务细致，善于针对性缓解腰背紧张。' },
    { id: 3, name: '林悦', title: '芳疗师', rating: 4.93, orderCount: 476, latitude: 31.2266, longitude: 121.4728, price: 299, imageKey: 'lin', intro: '国家认证芳疗师，结合呼吸节奏与精油按摩，打造舒缓放松体验。' },
  ]
  for (const technician of technicians) {
    await prisma.technician.upsert({ where: { id: technician.id }, update: technician, create: technician })
    for (const service of services) {
      await prisma.technicianService.upsert({
        where: { technicianId_serviceId: { technicianId: technician.id, serviceId: service.id } },
        update: {},
        create: { technicianId: technician.id, serviceId: service.id },
      })
    }
  }

  await prisma.user.upsert({
    where: { phone: '13800138000' },
    update: { passwordHash: demoPasswordHash },
    create: { phone: '13800138000', name: '罗女士', passwordHash: demoPasswordHash, preferences: JSON.stringify(['适中力度', '肩颈重点']) },
  })

  const technicianUser = await prisma.user.upsert({
    where: { phone: '13900139000' },
    update: { name: '陈静技师', role: 'TECHNICIAN', passwordHash: demoPasswordHash },
    create: { phone: '13900139000', name: '陈静技师', role: 'TECHNICIAN', passwordHash: demoPasswordHash },
  })
  await prisma.technician.update({ where: { id: 1 }, data: { userId: technicianUser.id } })

  const adminHash = await hashPassword(process.env.ADMIN_DEMO_PASSWORD ?? 'Luohan@2026')
  await prisma.user.upsert({
    where: { phone: '13700137000' },
    update: { name: '平台管理员', role: 'ADMIN', passwordHash: adminHash },
    create: { phone: '13700137000', name: '平台管理员', role: 'ADMIN', passwordHash: adminHash },
  })

  const demoUser = await prisma.user.findUniqueOrThrow({ where: { phone: '13800138000' } })
  const appointmentAt = new Date()
  appointmentAt.setDate(appointmentAt.getDate() + 1)
  appointmentAt.setHours(19, 0, 0, 0)
  await prisma.order.upsert({
    where: { id: 'LHDEMO1001' },
    update: {},
    create: {
      id: 'LHDEMO1001', userId: demoUser.id, technicianId: 1, serviceId: 'neck', status: 'PENDING',
      dateLabel: '明天', appointmentAt, intensity: '适中', paymentMethod: 'wechat', etaSeconds: 720,
      addressLabel: '静安嘉里中心 · 2号楼', addressDetail: '上海市静安区南京西路1515号',
      note: '肩颈重点放松', originalPrice: 239, discount: 30, paidAmount: 209, couponLabel: '新客立减券',
      statusLogs: { create: { status: 'PENDING' } },
    },
  })
}

main().finally(() => prisma.$disconnect())
