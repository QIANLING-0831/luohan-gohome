import { request } from './client'

export interface ManagedOrder {
  id: string; status: string; statusIndex: number; customer: string; phone: string; technician: string
  service: string; amount: number; schedule: string; address: string; createdAt: string
}
export interface ManagedTechnician {
  id: number; name: string; title: string; rating: number; active: boolean; archived: boolean; imageKey: string; orderCount: number; price: number; experienceYears: number; onTimeRate: number; workStart: string; workEnd: string; workDays: number[]; services: string[]; loginPhone?: string
}
export interface ManagedService { id: string; name: string; description: string; price: number; duration: number; active: boolean; technicianCount: number }
export interface ManagedUser {
  id: string; name: string; phone: string; points: number; preferences: string[]; orderCount: number
  completedOrders: number; totalSpent: number; lastOrderAt: string | null; createdAt: string
}
export interface AdminDashboardData {
  metrics: { totalOrders: number; pendingOrders: number; revenue: number; activeTechnicians: number; userCount: number }
  statusCounts: Array<{ status: string; count: number }>
  trend: Array<{ label: string; count: number }>
  recentOrders: ManagedOrder[]
  analytics?: {
    days: number; averageOrderValue: number; repeatRate: number; completionRate: number
    funnel: Array<{ label: string; count: number }>
    technicianRanking: Array<{ id: number; name: string; orders: number; revenue: number }>
    serviceSales: Array<{ id: string; name: string; orders: number; revenue: number }>
  }
}

export const adminClient = {
  dashboard: (days = 30) => request<AdminDashboardData>(`/api/admin/dashboard?days=${days}`),
  orders: () => request<ManagedOrder[]>('/api/admin/orders'),
  users: () => request<ManagedUser[]>('/api/admin/users'),
  technicians: () => request<ManagedTechnician[]>('/api/admin/technicians'),
  services: () => request<ManagedService[]>('/api/admin/services'),
  createService: (input: { name: string; description: string; price: number; duration: number }) => request<ManagedService>('/api/admin/services', { method: 'POST', body: JSON.stringify(input) }),
  setServiceActive: (id: string, active: boolean) => request<{ id: string; active: boolean }>(`/api/admin/services/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) }),
  setTechnicianActive: (id: number, active: boolean) => request<{ id: number; active: boolean }>(`/api/admin/technicians/${id}/status`, { method: 'PATCH', body: JSON.stringify({ active }) }),
  updateTechnician: (id: number, input: { title: string; price: number; experienceYears: number; imageKey?: string; serviceIds: string[]; workStart: string; workEnd: string; workDays: number[] }) => request<ManagedTechnician>(`/api/admin/technicians/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  createTechnician: (input: { name: string; phone: string; password: string; title: string; price: number; experienceYears: number; imageKey: string; intro: string; serviceIds: string[]; workStart: string; workEnd: string; workDays: number[] }) => request<ManagedTechnician>('/api/admin/technicians', { method: 'POST', body: JSON.stringify(input) }),
  archiveTechnician: (id: number) => request<{ id: number; archived: boolean }>(`/api/admin/technicians/${id}`, { method: 'DELETE' }),
  restoreTechnician: (id: number) => request<{ id: number; archived: boolean; active: boolean }>(`/api/admin/technicians/${id}/restore`, { method: 'PATCH' }),
  resetTechnicianPassword: (id: number, password: string) => request<{ id: number; reset: boolean }>(`/api/admin/technicians/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ password }) }),
  bindTechnicianAccount: (id: number, input: { phone: string; password: string }) => request<{ id: number; loginPhone: string }>(`/api/admin/technicians/${id}/bind-account`, { method: 'POST', body: JSON.stringify(input) }),
}
