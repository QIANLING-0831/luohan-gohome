import { useState } from 'react'
import type { Order, Service, Technician } from '../types'
import { usePersistedState } from '../hooks/usePersistedState'

interface Props { order: Order | null; technician?: Technician; service?: Service; onLogout: () => void; onNotify: (message: string) => void }
type Panel = 'history' | 'preferences' | 'points' | 'safety' | null

export function ProfileScreen({ order, technician, service, onLogout, onNotify }: Props) {
  const [panel, setPanel] = useState<Panel>(null)
  const [selectedPreferences, setSelectedPreferences] = usePersistedState<string[]>('luohan_preferences_v1', ['适中力度', '肩颈重点'])
  const [points, setPoints] = usePersistedState('luohan_points_v1', 1280)
  const [checkedIn, setCheckedIn] = usePersistedState('luohan_checked_in_v1', false)
  const [safetySettings, setSafetySettings] = usePersistedState('luohan_safety_v1', { contact: true, recording: true })
  const title = { history: '按摩历史', preferences: '按摩偏好', points: '积分明细', safety: '安心守护' }
  const choose = (next: Exclude<Panel, null>) => setPanel(next)
  const togglePreference = (preference: string) => setSelectedPreferences((current) => current.includes(preference) ? current.filter((item) => item !== preference) : [...current, preference])
  const checkIn = () => { if (checkedIn) return onNotify('今天已经签到过了'); setCheckedIn(true); setPoints((value) => value + 10); onNotify('签到成功，积分 +10') }
  const toggleSafety = (key: 'contact' | 'recording') => setSafetySettings((current) => ({ ...current, [key]: !current[key] }))
  const preferenceSummary = selectedPreferences.length ? selectedPreferences.join(' · ') : '尚未设置'
  return <section className="screen active"><header><div className="brand">我的</div><button className="icon-btn" aria-label="账户设置" onClick={() => choose('safety')}>⚙</button></header><div className="profile-card"><div className="user-row"><div className="user-avatar">罗</div><span><h2>罗女士</h2><small>138****8000</small></span><div className="level">金卡会员</div></div></div><div className="point-card"><div><strong>{points.toLocaleString()}</strong><small>可用积分</small></div><div><strong>12</strong><small>服务次数</small></div><div><strong>¥2,860</strong><small>累计消费</small></div></div><div className="menu-list">{order && technician && service && <div className="menu-item"><span className="menu-icon">单</span><span><b>最近预约 · {service.name}</b><small>{technician.name} · {order.dateLabel} {order.time}</small></span></div>}<button className="menu-item" onClick={() => choose('history')}><span className="menu-icon">单</span><span><b>按摩历史</b><small>查看历史服务与再次预约</small></span><span>›</span></button><button className="menu-item" onClick={() => choose('preferences')}><span className="menu-icon">好</span><span><b>按摩偏好</b><small>{preferenceSummary}</small></span><span>›</span></button><button className="menu-item" onClick={() => choose('points')}><span className="menu-icon">积</span><span><b>消费积分</b><small>签到、下单赚积分</small></span><span>›</span></button><button className="menu-item" onClick={() => choose('safety')}><span className="menu-icon">盾</span><span><b>安心守护</b><small>紧急联系人与服务录音</small></span><span>›</span></button></div><button className="logout" onClick={onLogout}>退出登录</button>
    <div className={`sheet-mask ${panel ? 'open' : ''}`} onClick={() => setPanel(null)}><div className="sheet" onClick={(event) => event.stopPropagation()}><div className="grab"/><h2>{panel ? title[panel] : ''}</h2>
      {panel === 'history' && <><div className="history-item"><span><b>精油推背</b><small>李静技师 · 2026-09-18</small></span><strong>¥299</strong></div><div className="history-item"><span><b>肩颈舒缓</b><small>王师傅 · 2026-09-03</small></span><strong>¥199</strong></div><button className="primary" onClick={() => onNotify('已为你载入上次预约配置')}>再次预约</button></>}
      {panel === 'preferences' && <><p>点击标签可多选或取消，选择会同步显示在“我的”页面。</p><div className="filter-tags">{['轻柔力度','适中力度','偏重力度','肩颈重点','腰背重点','无香精油'].map((preference) => { const active = selectedPreferences.includes(preference); return <button key={preference} className={active ? 'active' : ''} aria-pressed={active} onClick={() => togglePreference(preference)}>{active ? '✓ ' : '+ '}{preference}</button> })}</div><button className="primary" onClick={() => { onNotify(`已保存 ${selectedPreferences.length} 项按摩偏好`); setPanel(null) }}>保存偏好</button></>}
      {panel === 'points' && <><div className="point-log"><span>完成上门服务<small>9月18日</small></span><b className="point-plus">+299</b></div>{checkedIn && <div className="point-log"><span>每日签到<small>今天</small></span><b className="point-plus">+10</b></div>}<button className="primary" disabled={checkedIn} onClick={checkIn}>{checkedIn ? '今日已签到' : '每日签到 · 领取10积分'}</button></>}
      {panel === 'safety' && <><p>服务过程中可随时调整，状态会保存在当前设备。</p><div className="safety-grid"><button className={`safety-item ${safetySettings.contact ? 'active' : ''}`} aria-pressed={safetySettings.contact} onClick={() => toggleSafety('contact')}><span>☎</span><b>紧急联系人</b><small>{safetySettings.contact ? '已开启到达提醒' : '已关闭提醒'}</small><i className="switch"/></button><button className={`safety-item ${safetySettings.recording ? 'active' : ''}`} aria-pressed={safetySettings.recording} onClick={() => toggleSafety('recording')}><span>◉</span><b>服务录音</b><small>{safetySettings.recording ? '自动加密保存' : '本次不录音'}</small><i className="switch"/></button></div><button className="primary" style={{ marginTop: 16 }} onClick={() => { onNotify('安全设置已保存'); setPanel(null) }}>保存安全设置</button></>}
    </div></div>
  </section>
}
