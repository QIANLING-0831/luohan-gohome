import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { Technician } from '../types'
import { center, distanceKm } from '../data'

interface Props { technicians: Technician[]; onSelect: (id: number) => void }

export function MapPanel({ technicians, onSelect }: Props) {
  const nodeRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef(new Map<number, L.Marker>())
  const selectRef = useRef(onSelect)
  selectRef.current = onSelect

  useEffect(() => {
    if (!nodeRef.current || mapRef.current) return
    const map = L.map(nodeRef.current, { zoomControl: false, attributionControl: true }).setView([center.lat, center.lng], 14)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM' }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.marker([center.lat, center.lng], { icon: L.divIcon({ className: 'marker-shell', html: '<div class="user-marker"></div>', iconSize: [22, 22] }) }).addTo(map).bindTooltip('我的位置')
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null; markersRef.current.clear() }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    technicians.forEach((tech) => {
      let marker = markersRef.current.get(tech.id)
      if (!marker) {
        marker = L.marker([tech.lat, tech.lng], { icon: L.divIcon({ className: 'marker-shell', html: `<img class="tech-marker" src="${tech.img}" alt="">`, iconSize: [42, 42] }) }).addTo(map)
        marker.on('click', () => selectRef.current(tech.id))
        markersRef.current.set(tech.id, marker)
      }
      marker.setLatLng([tech.lat, tech.lng]).setTooltipContent(`${tech.name} · ${distanceKm(tech).toFixed(1)}km`)
    })
  }, [technicians])

  return <div ref={nodeRef} className="map" aria-label="附近技师地图" />
}
