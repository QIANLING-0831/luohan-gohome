import { useMemo, useState } from 'react'
import type { Technician } from '../types'
import { distanceKm } from '../data'
import { usePersistedState } from '../hooks/usePersistedState'
import { MapPanel } from './MapPanel'
import { Logo } from './Logo'

interface Props {
  technicians: Technician[]
  onOpen: (id: number) => void
  onNavigate: (screen: 'messages' | 'profile') => void
  onNotify: (message: string) => void
}

export function HomeScreen({ technicians, onOpen, onNavigate, onNotify }: Props) {
  const [filter, setFilter] = useState<'all' | 'fast' | 'top' | 'fav'>('all')
  const [search, setSearch] = useState('')
  const [favorites, setFavorites] = usePersistedState<number[]>('luohan_favorites_v1', [])
  const [mapVisible, setMapVisible] = useState(true)
  const visible = useMemo(() => technicians.map((tech) => ({ ...tech, distance: distanceKm(tech) })).filter((tech) => {
    const matchesFilter = filter === 'all' || filter === 'fast' && tech.distance < 2.2 || filter === 'top' && tech.rating >= 4.95 || filter === 'fav' && favorites.includes(tech.id)
    const keyword = search.trim().toLowerCase()
    return matchesFilter && (!keyword || `${tech.name}${tech.title}${tech.intro}`.toLowerCase().includes(keyword))
  }).sort((a, b) => a.distance - b.distance), [technicians, filter, favorites, search])

  const focus = (id: number) => {
    const card = document.querySelector(`[data-tech-id="${id}"]`)
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    card?.classList.add('map-focus')
    setTimeout(() => card?.classList.remove('map-focus'), 1500)
  }
  const toggleFavorite = (tech: Technician) => {
    const active = favorites.includes(tech.id)
    setFavorites((current) => active ? current.filter((id) => id !== tech.id) : [...current, tech.id])
    onNotify(active ? `已取消收藏 ${tech.name}` : `已收藏 ${tech.name}`)
  }
  const clearFilters = () => { setSearch(''); setFilter('all') }

  return <section className="screen active">
    <header><div className="brand"><Logo/>罗汉到家</div><div className="header-action"><button className="icon-btn" aria-label="打开消息" onClick={() => onNavigate('messages')}>♢</button><button className="icon-btn" aria-label="打开我的" onClick={() => onNavigate('profile')}>我</button></div></header>
    <div className="location"><i className="pulse"/>上海市 · 静安区 <span>定位准确至 50m</span></div>
    <div className="hero-strip"><span><small>晚高峰安心到家</small><b>金牌技师最快 12 分钟</b></span><strong>12′</strong></div>
    <div className="tech-search"><span>⌕</span><input aria-label="搜索技师或擅长项目" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索技师、肩颈、精油…"/>{search && <button aria-label="清空搜索" onClick={() => setSearch('')}>×</button>}</div>
    <div className="quick-row">{([['all','全部服务'],['fast','⚡ 30分钟内'],['top','★ 4.95以上'],['fav',`♥ 我的收藏${favorites.length ? ` ${favorites.length}` : ''}`]] as const).map(([value,label]) => <button key={value} aria-pressed={filter === value} className={`quick ${filter === value ? 'active' : ''}`} onClick={() => setFilter(value)}>{label}</button>)}</div>
    {mapVisible && <div className="map-wrap"><MapPanel technicians={technicians} onSelect={focus}/><div className="map-chip"><i className="live-dot"/>{technicians.length} 位技师正在附近</div></div>}
    <div className="section-head"><div><h2>{filter === 'fav' ? '我的收藏' : '附近技师'}</h2><span>{visible.length} 位可约 · 实时排序</span></div><div className="view-toggle"><button aria-pressed={mapVisible} className={mapVisible ? 'active' : ''} onClick={() => setMapVisible(true)}>地图</button><button aria-pressed={!mapVisible} className={!mapVisible ? 'active' : ''} onClick={() => setMapVisible(false)}>列表</button></div></div>
    <div className="tech-list">{visible.map((tech, index) => <div className="tech-card-shell" data-tech-id={tech.id} key={tech.id}><button className="tech-card" onClick={() => onOpen(tech.id)}><img className="avatar" src={tech.img} alt={`${tech.name}头像`}/><div><div className="tech-name">{tech.name} <span className="tag">{index === 0 ? '离你最近' : tech.title}</span></div><div className="meta"><span className="rating">★ {tech.rating}</span><span>已服务 {tech.orders}</span></div><div className="meta"><span className="distance">⌖ {tech.distance.toFixed(1)}km</span><span>约 {Math.max(8, Math.round(tech.distance * 8))} 分钟</span></div></div><div className="price"><strong>¥{tech.price}<small>起</small></strong><span className="chev">›</span></div></button><button className={`favorite-btn ${favorites.includes(tech.id) ? 'active' : ''}`} aria-label={`${favorites.includes(tech.id) ? '取消收藏' : '收藏'}${tech.name}`} aria-pressed={favorites.includes(tech.id)} onClick={() => toggleFavorite(tech)}>♥</button></div>)}{visible.length === 0 && <div className="search-empty"><span>{filter === 'fav' ? '♡' : '⌕'}</span><b>{filter === 'fav' ? '还没有收藏技师' : '没有找到匹配的技师'}</b><p>{filter === 'fav' ? '点击技师卡片右上角的爱心即可收藏' : '试试搜索姓名，或放宽筛选条件'}</p><button className="secondary" onClick={clearFilters}>查看全部技师</button></div>}</div>
  </section>
}
