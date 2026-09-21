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
}

export interface Service {
  id: string
  name: string
  desc: string
  price: number
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
}
