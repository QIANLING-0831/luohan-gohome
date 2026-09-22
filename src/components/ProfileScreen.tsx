import { useState } from 'react'
import type { Address, Order, Service, Technician } from '../types'
import type { SessionUser } from '../api/auth'
import type { UserProfile } from '../api/profile'
import { profileClient } from '../api/profile'
import { usePersistedState } from '../hooks/usePersistedState'

interface Props { user: SessionUser; profile: UserProfile | null; orders: Order[]; technicians: Technician[]; services: Service[]; onProfileChange: (value: UserProfile) => void; onLogout: () => void; onChangePassword: () => void; onNotify: (message: string) => void; onRebook: (techId: number, serviceId: string) => void }
type Panel = 'history' | 'preferences' | 'addresses' | 'points' | 'safety' | null

export function ProfileScreen({ user, profile, orders, technicians, services, onProfileChange, onLogout, onChangePassword, onNotify, onRebook }: Props) {
  const [panel, setPanel] = useState<Panel>(null)
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>(profile?.preferences ?? [])
  const [saving, setSaving] = useState(false)
  const [draftAddresses, setDraftAddresses] = useState<Address[]>(profile?.addresses ?? [])
  const [addressLabel, setAddressLabel] = useState('')
  const [addressDetail, setAddressDetail] = useState('')
  const [editingAddressId, setEditingAddressId] = useState('')
  const [safetySettings, setSafetySettings] = usePersistedState(`luohan_safety_${user.id}`, { contact: true, recording: false })
  const title = { history: '按摩历史', preferences: '按摩偏好', addresses: '服务地址', points: '积分明细', safety: '安心守护' }
  const choose = (next: Exclude<Panel, null>) => { if (next === 'preferences') setSelectedPreferences(profile?.preferences ?? []); if (next === 'addresses') { setDraftAddresses(profile?.addresses ?? []); setAddressLabel(''); setAddressDetail(''); setEditingAddressId('') } setPanel(next) }
  const togglePreference = (preference: string) => setSelectedPreferences((current) => current.includes(preference) ? current.filter((item) => item !== preference) : [...current, preference])
  const savePreferences = async () => {
    if (!profile) return onNotify('个人资料尚未同步，请稍后重试')
    setSaving(true)
    try { await profileClient.savePreferences(selectedPreferences); onProfileChange({ ...profile, preferences: selectedPreferences }); onNotify(`已保存 ${selectedPreferences.length} 项按摩偏好`); setPanel(null) }
    catch (error) { onNotify(error instanceof Error ? error.message : '保存偏好失败') }
    finally { setSaving(false) }
  }
  const toggleSafety = (key: 'contact' | 'recording') => setSafetySettings((current) => ({ ...current, [key]: !current[key] }))
  const stageAddress = () => {
    if (addressLabel.trim().length < 2 || addressDetail.trim().length < 5) return onNotify('请填写完整的地址名称和详细地址')
    if (!editingAddressId && draftAddresses.length >= 5) return onNotify('最多保存 5 个服务地址')
    const id = editingAddressId || `addr-${Date.now()}`
    const next = { id, label: addressLabel.trim(), detail: addressDetail.trim(), isDefault: draftAddresses.length === 0 }
    setDraftAddresses((current) => editingAddressId ? current.map((item) => item.id === editingAddressId ? { ...item, ...next, isDefault: item.isDefault } : item) : [...current, next])
    setAddressLabel(''); setAddressDetail(''); setEditingAddressId('')
  }
  const saveAddresses = async () => {
    if (!profile) return onNotify('个人资料尚未同步，请稍后重试')
    setSaving(true)
    try { const result = await profileClient.saveAddresses(draftAddresses); onProfileChange({ ...profile, addresses: result.addresses }); onNotify('服务地址已保存到当前账号'); setPanel(null) }
    catch (error) { onNotify(error instanceof Error ? error.message : '地址保存失败') }
    finally { setSaving(false) }
  }
  const completed = orders.filter((item) => item.status === 5)
  const totalSpent = completed.reduce((sum, item) => sum + (item.paidAmount ?? item.originalPrice ?? 0), 0)
  const preferenceSummary = profile?.preferences.length ? profile.preferences.join(' · ') : '尚未设置'
  const latest = orders[0]
  const maskPhone = user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
  return <section className="screen active"><header><div className="brand">我的</div><button className="icon-btn" aria-label="账户设置" onClick={onChangePassword}>⚙</button></header><div className="profile-card"><div className="user-row"><div className="user-avatar">{user.name.slice(0, 1)}</div><span><h2>{user.name}</h2><small>{maskPhone}</small></span><div className="level">{completed.length >= 10 ? '金卡会员' : '普通会员'}</div></div></div><div className="point-card"><div><strong>{(profile?.points ?? 0).toLocaleString()}</strong><small>可用积分</small></div><div><strong>{completed.length}</strong><small>服务次数</small></div><div><strong>¥{totalSpent.toLocaleString()}</strong><small>累计消费</small></div></div><div className="menu-list">{latest && <div className="menu-item"><span className="menu-icon">单</span><span><b>最近预约 · {services.find((item) => item.id === latest.serviceId)?.name ?? '服务项目'}</b><small>{technicians.find((item) => item.id === latest.techId)?.name ?? '服务技师'} · {latest.dateLabel} {latest.time}</small></span></div>}<button className="menu-item" onClick={() => choose('history')}><span className="menu-icon">单</span><span><b>按摩历史</b><small>{orders.length ? `共 ${orders.length} 条预约记录` : '暂无预约记录'}</small></span><span>›</span></button><button className="menu-item" onClick={() => choose('preferences')}><span className="menu-icon">好</span><span><b>按摩偏好</b><small>{preferenceSummary}</small></span><span>›</span></button><button className="menu-item" onClick={() => choose('addresses')}><span className="menu-icon">址</span><span><b>服务地址</b><small>{profile?.addresses?.length ? `${profile.addresses.length} 个已保存地址` : '尚未保存地址'}</small></span><span>›</span></button><button className="menu-item" onClick={() => choose('points')}><span className="menu-icon">积</span><span><b>消费积分</b><small>完成服务后自动累计</small></span><span>›</span></button><button className="menu-item" onClick={() => choose('safety')}><span className="menu-icon">盾</span><span><b>安心守护</b><small>本机演示设置</small></span><span>›</span></button><button className="menu-item" onClick={onChangePassword}><span className="menu-icon">密</span><span><b>修改登录密码</b><small>验证当前密码后更新</small></span><span>›</span></button></div><button className="logout" onClick={onLogout}>退出登录</button>
    <div className={`sheet-mask ${panel ? 'open' : ''}`} onClick={() => setPanel(null)}><div className="sheet" onClick={(event) => event.stopPropagation()}><div className="grab"/><h2>{panel ? title[panel] : ''}</h2>
      {panel === 'history' && <>{orders.length ? orders.map((item) => <button key={item.id} className="history-item" onClick={() => { onRebook(item.techId, item.serviceId); setPanel(null) }}><span><b>{services.find((service) => service.id === item.serviceId)?.name ?? '服务项目'}</b><small>{technicians.find((tech) => tech.id === item.techId)?.name ?? '服务技师'} · {item.dateLabel} {item.time}</small></span><strong>¥{item.paidAmount ?? item.originalPrice ?? 0}<br/><small>再次预约 ›</small></strong></button>) : <p className="sheet-tip">这个账号还没有预约记录。</p>}</>}
      {panel === 'preferences' && <><p>偏好会保存到当前账号，换设备登录后仍可查看。</p><div className="filter-tags">{['轻柔力度','适中力度','偏重力度','肩颈重点','腰背重点','无香精油'].map((preference) => { const active = selectedPreferences.includes(preference); return <button key={preference} className={active ? 'active' : ''} aria-pressed={active} onClick={() => togglePreference(preference)}>{active ? '✓ ' : '+ '}{preference}</button> })}</div><button className="primary" disabled={saving} onClick={() => void savePreferences()}>{saving ? '保存中…' : '保存偏好'}</button></>}
      {panel === 'addresses' && <><p>地址仅当前账号可见，预约时会优先选择默认地址。</p><div className="profile-address-list">{draftAddresses.map((item) => <div key={item.id}><button className="profile-address-main" onClick={() => { setEditingAddressId(item.id); setAddressLabel(item.label); setAddressDetail(item.detail) }}><b>{item.label}{item.isDefault ? ' · 默认' : ''}</b><small>{item.detail}</small></button><span><button disabled={item.isDefault} onClick={() => setDraftAddresses((current) => current.map((value) => ({ ...value, isDefault: value.id === item.id })))}>设为默认</button><button onClick={() => setDraftAddresses((current) => { const next = current.filter((value) => value.id !== item.id); return next.map((value, index) => ({ ...value, isDefault: value.isDefault || index === 0 && !next.some((entry) => entry.isDefault) })) })}>删除</button></span></div>)}</div><div className="address-editor"><input aria-label="地址名称" value={addressLabel} onChange={(event) => setAddressLabel(event.target.value)} placeholder="地址名称，如：家" maxLength={40}/><textarea aria-label="详细地址" value={addressDetail} onChange={(event) => setAddressDetail(event.target.value)} placeholder="省市区、道路、门牌和房间号" maxLength={120}/><button className="secondary" onClick={stageAddress}>{editingAddressId ? '更新该地址' : '＋ 添加地址'}</button></div><button className="primary" disabled={saving} onClick={() => void saveAddresses()}>{saving ? '保存中…' : '保存地址簿'}</button></>}
      {panel === 'points' && <>{profile?.pointRecords.length ? profile.pointRecords.map((record) => <div className="point-log" key={record.id}><span>{record.reason}<small>{new Date(record.createdAt).toLocaleDateString('zh-CN')}</small></span><b className="point-plus">+{record.amount}</b></div>) : <p className="sheet-tip">暂无积分记录，完成服务后会自动获得积分。</p>}</>}
      {panel === 'safety' && <><p>以下为保存在本设备、仅当前账号可见的演示设置。</p><div className="safety-grid"><button className={`safety-item ${safetySettings.contact ? 'active' : ''}`} aria-pressed={safetySettings.contact} onClick={() => toggleSafety('contact')}><span>☎</span><b>紧急联系人</b><small>{safetySettings.contact ? '已开启到达提醒' : '已关闭提醒'}</small><i className="switch"/></button><button className={`safety-item ${safetySettings.recording ? 'active' : ''}`} aria-pressed={safetySettings.recording} onClick={() => toggleSafety('recording')}><span>◉</span><b>服务录音</b><small>{safetySettings.recording ? '演示开关已开启' : '演示开关已关闭'}</small><i className="switch"/></button></div><button className="primary" style={{ marginTop: 16 }} onClick={() => { onNotify('本机安全设置已保存'); setPanel(null) }}>保存安全设置</button></>}
    </div></div>
  </section>
}
