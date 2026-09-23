export type Screen = 'home' | 'detail' | 'booking' | 'payment' | 'success' | 'orders' | 'messages' | 'profile'

export interface Technician {
  id: number
  name: string
  title: string
  rating: number
  orders: number
  lat: number
  lng: number
  price: number
  img: string
  intro: string
  serviceIds?: string[]
  experienceYears: number
  onTimeRate: number
  workStart: string
  workEnd: string
  workDays: number[]
}

export interface Service {
  id: string
  name: string
  desc: string
  price: number
  duration?: number
}

export interface Address {
  id: string
  label: string
  detail: string
  isDefault?: boolean
}

export interface Order {
  id: string
  techId: number
  serviceId: string
  dateLabel: string
  time: string
  intensity: string
  paymentMethod: string
  status: number
  etaSeconds: number
  address: Address
  note: string
  originalPrice?: number
  discount?: number
  paidAmount?: number
  couponLabel?: string
  reviewed?: boolean
  reviewRating?: number
  createdAt?: string
  expiresAt?: string
}
