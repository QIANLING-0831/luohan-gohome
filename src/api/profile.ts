import { request } from './client'
import type { Address } from '../types'

export interface UserProfile {
  name: string
  phone: string
  points: number
  preferences: string[]
  addresses: Address[]
  favoriteIds: number[]
  pointRecords: Array<{ id: number; amount: number; reason: string; createdAt: string }>
}

export const profileClient = {
  get: () => request<UserProfile>('/api/profile'),
  savePreferences: (preferences: string[]) => request<{ preferences: string[] }>('/api/profile/preferences', { method: 'PUT', body: JSON.stringify({ preferences }) }),
  saveAddresses: (addresses: Address[]) => request<{ addresses: Address[] }>('/api/profile/addresses', { method: 'PUT', body: JSON.stringify({ addresses }) }),
  toggleFavorite: (technicianId: number) => request<{ favorite: boolean }>(`/api/profile/favorites/${technicianId}`, { method: 'PUT' }),
}
