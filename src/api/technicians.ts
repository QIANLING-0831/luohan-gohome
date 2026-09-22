import type { Technician } from '../types'
import { request } from './client'

type TechnicianDto = Omit<Technician, 'img'> & { imageKey: string; serviceIds?: string[] }
export const technicianClient = { list: () => request<TechnicianDto[]>('/api/technicians') }
