import { useMemo, useState } from 'react'
import type { Technician } from '../types'
import { distanceKm } from '../data'
import { MapPanel } from './MapPanel'
import { Logo } from './Logo'

interface Props { technicians: Technician[]; onOpen: (id: number) => void; onNavigate: (screen: 'messages' | 'profile') => void }

export function HomeScreen({ technicians, onOpen, onNavigate }: Props) {
  const [filter, setFilter] = useState<'all' | 'fast' | 'top'>('all')
  const [mapVisible, setMapVisible] = useState(true)
  const visible = useMemo(() => technicians.map((tech) => ({ ...tech, distance: distanceKm(tech) })).filter((tech) => filter === 'all' || filter === 'fast' && tech.distance < 2.2 || filter === 'top' && tech.rating >= 4.95).sort((a, b) => a.distance - b.distance), [technicians, filter])
  const focus = (id: number) => {
    const card = document.querySelector(`[data-tech-id="${id}"]`)
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    card?.classList.add('map-focus'); setTimeout(() => card?.classList.remove('map-focus'), 1500)
  }
  return <section className="screen active">
    <header><div className="brand"><Logo/>罗汉到家</div><div className="header-action"><button className="icon-btn" onClick={() => onNavigate('messages')}>♢</button><button className="icon-btn" onClick={() => onNavigate('profile')}>我</button></div></header>
    <div className="location"><i className="pulse"/>上海市 · 静安区 <span>定位准确至 50m</span></div>
    <div className="hero-strip"><span><small>晚高峰安心到家</small><b>金牌技师最快 12 分钟</b></span><strong>12′</strong></div>
    <div className="quick-row">{([['all','全部服务'],['fast','⚡ 30分钟内'],['top','★ 4.95以上']] as const).map(([value,label]) => <button key={value} className={`quick ${filter === value ? 'active' : ''}`} onClick={() => setFilter(value)}>{label}</button>)}</div>
    {mapVisible && <div className="map-wrap"><MapPanel technicians={technicians} onSelect={focus}/><div className="map-chip"><i className="live-dot"/>{technicians.length} 位技师正在附近</div></div>}
    <div className="section-head"><div><h2>附近技师</h2><span>{visible.length} 位可约 · 实时排序</span></div><div className="view-toggle"><button className={mapVisible ? 'active' : ''} onClick={() => setMapVisible(true)}>地图</button><button className={!mapVisible ? 'active' : ''} onClick={() => setMapVisible(false)}>列表</button></div></div>
    <div className="tech-list">{visible.map((tech, index) => <button className="tech-card" data-tech-id={tech.id} key={tech.id} onClick={() => onOpen(tech.id)}><img className="avatar" src={tech.img} alt={`${tech.name}头像`}/><div><div className="tech-name">{tech.name} <span className="tag">{index === 0 ? '离你最近' : tech.title}</span></div><div className="meta"><span className="rating">★ {tech.rating}</span><span>已服务 {tech.orders}</span></div><div className="meta"><span className="distance">⌖ {tech.distance.toFixed(1)}km</span><span>约 {Math.max(8, Math.round(tech.distance * 8))} 分钟</span></div></div><div className="price"><strong>¥{tech.price}<small>起</small></strong><span className="chev">›</span></div></button>)}</div>
  </section>
}
