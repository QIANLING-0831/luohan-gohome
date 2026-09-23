import { request } from './client'

export interface PublicReview { id: number; rating: number; tags: string[]; text: string; createdAt: string; customer: string }
export interface ReviewSummary { items: PublicReview[]; total: number; average: number | null }

export const reviewClient = {
  forTechnician: (technicianId: number) => request<ReviewSummary>(`/api/technicians/${technicianId}/reviews`),
}
