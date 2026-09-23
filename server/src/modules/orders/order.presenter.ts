import type { Order } from '@prisma/client'
import { statusIndex } from '../../shared/order-status.js'

export function presentOrder(order: Order) {
  return {
    id: order.id, techId: order.technicianId, serviceId: order.serviceId,
    dateLabel: order.dateLabel, time: new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(order.appointmentAt),
    intensity: order.intensity, paymentMethod: order.paymentMethod, status: statusIndex(order.status),
    etaSeconds: order.etaSeconds,
    address: { id: 'saved', label: order.addressLabel, detail: order.addressDetail },
    note: order.note, originalPrice: order.originalPrice, discount: order.discount,
    paidAmount: order.paidAmount, couponLabel: order.couponLabel,
    reviewed: order.reviewed, reviewRating: order.reviewRating ?? undefined,
    createdAt: order.createdAt.toISOString(),
    expiresAt: order.status === 'PENDING' ? new Date(order.createdAt.getTime() + 15 * 60 * 1000).toISOString() : undefined,
  }
}
