import { request } from './client'

export interface TechnicianAvailability { occupied: string[]; bookings: Array<{ slot: string; duration: number }>; workStart: string; workEnd: string; workDays: number[] }
export const availabilityClient = { get: (technicianId: number) => request<TechnicianAvailability>(`/api/technicians/${technicianId}/availability`) }
