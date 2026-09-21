import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { Technician } from '../types'
import { center } from '../data'

const progressByStatus = [0, .05, .28, .86, 1, 1]

export function trackedPosition(tech: Technician, status: number) {
  const progress = progressByStatus[status] ?? 0
  return { lat: tech.lat + (center.lat - tech.lat) * progress, lng: tech.lng + (center.lng - tech.lng) * progress }
}

export function trackedDistance(tech: Technician, status: number) {
  const point = trackedPosition(tech, status), x = (point.lng - center.lng) * 91.2, y = (point.lat - center.lat) * 111
  return Math.sqrt(x * x + y * y)
}

export function OrderTrackingMap({ technician, status }: { technician: Technician; status: number }) {
  const node = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!node.current) return
    const point = trackedPosition(technician, status)
    const map = L.map(node.current, { zoomControl: false, attributionControl: false, scrollWheelZoom: false })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)
    L.marker([center.lat, center.lng], { icon: L.divIcon({ className: 'marker-shell', html: '<div class="order-user-pin"></div><div class="pin-caption">服务地址</div>', iconSize: [40, 58], iconAnchor: [20, 20] }) }).addTo(map)
    L.marker([point.lat, point.lng], { icon: L.divIcon({ className: 'marker-shell', html: `<img class="order-tech-pin" src="${technician.img}" alt=""><div class="pin-caption">${technician.name}技师</div>`, iconSize: [52, 70], iconAnchor: [26, 23] }) }).addTo(map)
    L.polyline([[point.lat, point.lng], [center.lat, center.lng]], { color: '#0b6b6d', weight: 4, opacity: .85, dashArray: '8 9' }).addTo(map)
    map.fitBounds([[point.lat, point.lng], [center.lat, center.lng]], { padding: [48, 48], maxZoom: 15 })
    setTimeout(() => map.invalidateSize(), 50)
    return () => { map.remove() }
  }, [technician, status])
  return <div ref={node} className="order-map"/>
}
