import type { Screen } from '../types'

export function BottomNav({ screen, onNavigate }: { screen: Screen; onNavigate: (screen: Screen) => void }) {
  const items: Array<[Screen,string,string]> = [['home','⌂','首页'],['orders','▤','订单'],['messages','◇','消息'],['profile','○','我的']]
  const index = Math.max(0, items.findIndex(([id]) => id === screen))
  return <nav className="bottom-nav" style={{ '--nav-index': index } as React.CSSProperties}><i className="nav-indicator"/>{items.map(([id,icon,label]) => <button key={id} className={`nav-item ${screen === id ? 'active' : ''}`} onClick={() => onNavigate(id)}><span style={{ fontSize: 22 }}>{icon}</span>{label}</button>)}</nav>
}
