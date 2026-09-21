import type { Technician } from '../types'
import { center, distanceKm } from '../data'

const bounds = { north: 31.2405, south: 31.2205, east: 121.4845, west: 121.4525 }

function position(point: { lat: number; lng: number }) {
  return {
    left: `${((point.lng - bounds.west) / (bounds.east - bounds.west)) * 100}%`,
    top: `${((bounds.north - point.lat) / (bounds.north - bounds.south)) * 100}%`,
  }
}

function Roads() {
  return <svg className="local-map-roads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <path className="road major" d="M-5 28 C20 25 35 38 105 29" />
    <path className="road major" d="M15 -8 C24 24 19 58 30 108" />
    <path className="road major" d="M79 -8 C66 30 80 65 69 108" />
    <path className="road" d="M-8 72 C24 60 52 83 108 64" />
    <path className="road" d="M-8 48 C28 55 60 39 108 48" />
    <path className="road" d="M47 -8 C43 24 53 56 48 108" />
    <path className="water" d="M93 -5 C82 26 96 52 86 105" />
  </svg>
}

export function LocalNearbyMap({ technicians, onSelect }: { technicians: Technician[]; onSelect: (id: number) => void }) {
  return <div className="local-map" aria-label="本地地图降级模式">
    <Roads />
    <span className="map-label label-a">人民广场</span><span className="map-label label-b">南京东路</span><span className="map-label label-c">黄浦江</span>
    <span className="local-user" style={position(center)}><i />我的位置</span>
    {technicians.map((tech) => <button key={tech.id} className="local-tech" style={position(tech)} onClick={() => onSelect(tech.id)} aria-label={`查看${tech.name}`}>
      <img src={tech.img} alt=""/><span>{tech.name} · {distanceKm(tech).toFixed(1)}km</span>
    </button>)}
  </div>
}

export function LocalTrackingMap({ technician, point }: { technician: Technician; point: { lat: number; lng: number } }) {
  const user = position(center), tech = position(point)
  const x1 = Number.parseFloat(tech.left), y1 = Number.parseFloat(tech.top)
  const x2 = Number.parseFloat(user.left), y2 = Number.parseFloat(user.top)
  return <div className="local-map" aria-label="订单位置地图降级模式">
    <Roads />
    <svg className="local-track-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1={x1} y1={y1} x2={x2} y2={y2}/></svg>
    <span className="tracking-user" style={user}><i>我</i><b>服务地址</b></span>
    <span className="tracking-tech" style={tech}><img src={technician.img} alt=""/><b>{technician.name}技师</b></span>
  </div>
}
