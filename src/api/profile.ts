import { request } from './client'

export interface UserProfile {
  name: string
  phone: string
  points: number
  preferences: string[]
  favoriteIds: number[]
  pointRecords: Array<{ id: number; amount: number; reason: string; createdAt: string }>
}

export const profileClient = {
  get: () => request<UserProfile>('/api/profile'),
  savePreferences: (preferences: string[]) => request<{ preferences: string[] }>('/api/profile/preferences', { method: 'PUT', body: JSON.stringify({ preferences }) }),
  toggleFavorite: (technicianId: number) => request<{ favorite: boolean }>(`/api/profile/favorites/${technicianId}`, { method: 'PUT' }),
}
