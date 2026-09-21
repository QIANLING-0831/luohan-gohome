import { useEffect, useRef, useState } from 'react'
import type { Technician } from '../types'
import { center, distanceKm } from '../data'
import { loadAMap } from '../lib/amap'
import { LocalNearbyMap } from './LocalMap'

interface Props { technicians: Technician[]; onSelect: (id: number) => void }

export function MapPanel({ technicians, onSelect }: Props) {
  const nodeRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef(new Map<number, any>())
  const selectRef = useRef(onSelect)
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading')
  selectRef.current = onSelect

  useEffect(() => {
    if (!nodeRef.current || mapRef.current) return
    let cancelled = false
    loadAMap().then((AMap) => {
      if (cancelled || !nodeRef.current) return
      const map = new AMap.Map(nodeRef.current, { center: [center.lng, center.lat], zoom: 14.2, viewMode: '2D', resizeEnable: true })
      map.addControl(new AMap.Scale({ position: 'RB' }))
      map.add(new AMap.Marker({ position: [center.lng, center.lat], content: '<div class="user-marker"></div>', title: '我的位置', offset: new AMap.Pixel(-11, -11) }))
      mapRef.current = map
      setStatus('ready')
    }).catch(() => { if (!cancelled) setStatus('fallback') })
    return () => {
      cancelled = true
      mapRef.current?.destroy()
      mapRef.current = null
      markersRef.current.clear()
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    technicians.forEach((tech) => {
      let marker = markersRef.current.get(tech.id)
      if (!marker) {
        const AMap = (window as any).AMap
        marker = new AMap.Marker({ position: [tech.lng, tech.lat], content: `<div class="amap-tech-shell"><img class="tech-marker" src="${tech.img}" alt=""><span>${tech.name}</span></div>`, offset: new AMap.Pixel(-21, -21), title: tech.name })
        marker.on('click', () => selectRef.current(tech.id))
        map.add(marker)
        markersRef.current.set(tech.id, marker)
      }
      marker.setPosition([tech.lng, tech.lat])
      marker.setTitle(`${tech.name} · ${distanceKm(tech).toFixed(1)}km`)
    })
  }, [technicians, status])

  return <div className={`china-map-shell ${status}`}>
    <LocalNearbyMap technicians={technicians} onSelect={onSelect}/>
    <div ref={nodeRef} className="map amap-layer" aria-label="高德地图：附近技师位置" />
    {status !== 'ready' && <span className="map-source-badge">{status === 'loading' ? '正在加载高德地图…' : '本地地图模式 · 实时位置正常'}</span>}
  </div>
}
