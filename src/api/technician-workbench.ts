import { request } from './client'

export interface TechnicianOrder {
  id: string; status: string; statusIndex: number; customer: string; phone: string; service: string
  amount: number; appointmentAt: string; schedule: string; address: string; detail: string; intensity: string; note: string
}
export interface TechnicianOverview {
  technician: { id: number; name: string; title: string; active: boolean; rating: number }
  metrics: { todayOrders: number; pendingOrders: number; completedOrders: number; income: number }
  orders: TechnicianOrder[]
}

export const technicianWorkbenchClient = {
  overview: () => request<TechnicianOverview>('/api/technician-workbench/overview'),
  advance: (id: string) => request<{ id: string; status: string; statusIndex: number }>(`/api/technician-workbench/orders/${id}/advance`, { method: 'POST' }),
}
