import { request } from './client'
import type { Service } from '../types'

export const serviceClient = { list: () => request<Service[]>('/api/services') }
