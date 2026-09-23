import type { Address, Order } from '../types'
import { request } from './client'

export interface CreateOrderInput {
  technicianId: number
  serviceId: string
  dateLabel: string
  dateKey: string
  time: string
  intensity: string
  paymentMethod: string
  address: Address
  note?: string
  discount?: number
  couponLabel?: string
  requestId: string
}

export const orderClient = {
  list: () => request<Order[]>('/api/orders'),
  create: (input: CreateOrderInput) => request<Order>('/api/orders', { method: 'POST', body: JSON.stringify(input) }),
  cancel: (id: string) => request<void>(`/api/orders/${id}/cancel`, { method: 'POST' }),
  review: (id: string, input: { rating: number; tags: string[]; text: string }) => request<Order>(`/api/orders/${id}/review`, { method: 'POST', body: JSON.stringify(input) }),
}
