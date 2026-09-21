import { useEffect, useRef, useState } from 'react'
import type { Technician } from '../types'
import { center } from '../data'
import { loadAMap } from '../lib/amap'
import { LocalTrackingMap } from './LocalMap'

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
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'fallback'>('loading')
  const point = trackedPosition(technician, status)
  useEffect(() => {
    if (!node.current) return
    let cancelled = false
    let map: any = null
    setMapStatus('loading')
    loadAMap().then((AMap) => {
      if (cancelled || !node.current) return
      map = new AMap.Map(node.current, { zoom: 14.5, viewMode: '2D', dragEnable: false, zoomEnable: false })
      const user = new AMap.Marker({ position: [center.lng, center.lat], content: '<div class="order-user-pin"></div><div class="pin-caption">服务地址</div>', offset: new AMap.Pixel(-20, -20) })
      const tech = new AMap.Marker({ position: [point.lng, point.lat], content: `<img class="order-tech-pin" src="${technician.img}" alt=""><div class="pin-caption">${technician.name}技师</div>`, offset: new AMap.Pixel(-26, -23) })
      const route = new AMap.Polyline({ path: [[point.lng, point.lat], [center.lng, center.lat]], strokeColor: '#0b6b6d', strokeWeight: 4, strokeOpacity: .85, strokeStyle: 'dashed' })
      map.add([route, user, tech])
      map.setFitView([user, tech], false, [48, 48, 48, 48], 15)
      setMapStatus('ready')
    }).catch(() => { if (!cancelled) setMapStatus('fallback') })
    return () => { cancelled = true; map?.destroy() }
  }, [technician, status])
  return <div className={`china-map-shell order-china-map ${mapStatus}`}>
    <LocalTrackingMap technician={technician} point={point}/>
    <div ref={node} className="order-map amap-layer" aria-label="高德地图：技师与服务地址"/>
    {mapStatus !== 'ready' && <span className="map-source-badge">{mapStatus === 'loading' ? '正在加载高德地图…' : '本地地图模式'}</span>}
  </div>
}
