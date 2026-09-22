import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminClient } from '../api/admin'
import type { AdminDashboardData, ManagedOrder, ManagedService, ManagedTechnician, ManagedUser } from '../api/admin'
import type { SessionUser } from '../api/auth'
import { ApiUnavailableError } from '../api/client'
import { Logo } from './Logo'
import technicianChen from '../assets/technician-chen.jpg'
import technicianZhou from '../assets/technician-zhou.jpg'
import technicianLin from '../assets/technician-lin.jpg'
import { preparePortrait } from '../lib/portrait'
import { bookingTimes } from '../lib/availability'

const statusName: Record<string, string> = { PENDING: '待接单', ACCEPTED: '已接单', DEPARTED: '已出发', ARRIVED: '已到达', IN_SERVICE: '服务中', COMPLETED: '已完成', CANCELLED: '已取消' }
type Tab = 'dashboard' | 'orders' | 'technicians' | 'users'
const demoServices: ManagedService[] = [{ id: 'neck', name: '肩颈深度放松', description: '60分钟 · 针对久坐疲劳', price: 239, duration: 60, active: true, technicianCount: 2 }, { id: 'oil', name: '精油推背', description: '80分钟 · 全背舒缓', price: 299, duration: 80, active: true, technicianCount: 3 }, { id: 'tuina', name: '中式经络推拿', description: '90分钟 · 全身经络疏解', price: 369, duration: 90, active: true, technicianCount: 2 }]
const technicianImages: Record<string, string> = { chen: technicianChen, zhou: technicianZhou, lin: technicianLin }
const TECHNICIANS_PER_PAGE = 12
const weekOptions = [{ id: 1, label: '周一' }, { id: 2, label: '周二' }, { id: 3, label: '周三' }, { id: 4, label: '周四' }, { id: 5, label: '周五' }, { id: 6, label: '周六' }, { id: 0, label: '周日' }]
const workdaySummary = (days: number[]) => days.length === 7 ? '每天接单' : weekOptions.filter((item) => days.includes(item.id)).map((item) => item.label).join('、') || '未排班'
const portrait = (key: string) => key.startsWith('data:image/') ? key : key === 'default' ? '/luohan-logo.jpg' : technicianImages[key]
const demoOrders: ManagedOrder[] = [{ id: 'LHDEMO1001', status: 'PENDING', statusIndex: 0, customer: '罗女士', phone: '138****8000', technician: '陈静', service: '肩颈深度放松', amount: 209, schedule: '明天 19:00', address: '静安嘉里中心 · 2号楼', createdAt: new Date().toISOString() }]
const demoTechnicians: ManagedTechnician[] = [
  { id: 1, name: '陈静', title: '金牌理疗师', rating: 4.98, active: true, archived: false, imageKey: 'chen', orderCount: 862, price: 239, experienceYears: 8, onTimeRate: 100, workStart: '10:00', workEnd: '22:00', workDays: [0,1,2,3,4,5,6], services: ['肩颈深度放松','精油推背','中式经络推拿'] },
  { id: 2, name: '周岚', title: '资深推拿师', rating: 4.96, active: true, archived: false, imageKey: 'zhou', orderCount: 619, price: 269, experienceYears: 6, onTimeRate: 100, workStart: '10:00', workEnd: '22:00', workDays: [0,1,2,3,4,5,6], services: ['肩颈深度放松','精油推背'] },
  { id: 3, name: '林悦', title: '芳疗师', rating: 4.93, active: true, archived: false, imageKey: 'lin', orderCount: 476, price: 299, experienceYears: 5, onTimeRate: 100, workStart: '10:00', workEnd: '22:00', workDays: [0,1,2,3,4,5,6], services: ['精油推背','中式经络推拿'] },
]
const demoUsers: ManagedUser[] = [
  { id: 'demo-user-1', name: '罗女士', phone: '13800138000', points: 1280, preferences: ['肩颈放松', '中等力度'], orderCount: 8, completedOrders: 7, totalSpent: 1883, lastOrderAt: new Date().toISOString(), createdAt: '2026-03-18T08:00:00.000Z' },
  { id: 'demo-user-2', name: '张先生', phone: '136****5271', points: 680, preferences: ['中式推拿'], orderCount: 4, completedOrders: 4, totalSpent: 996, lastOrderAt: '2026-09-20T12:30:00.000Z', createdAt: '2026-05-09T08:00:00.000Z' },
  { id: 'demo-user-3', name: '王女士', phone: '139****8316', points: 350, preferences: ['精油推背', '轻柔力度'], orderCount: 2, completedOrders: 1, totalSpent: 299, lastOrderAt: '2026-09-16T10:20:00.000Z', createdAt: '2026-08-02T08:00:00.000Z' },
  { id: 'demo-user-4', name: '李先生', phone: '135****2048', points: 100, preferences: [], orderCount: 0, completedOrders: 0, totalSpent: 0, lastOrderAt: null, createdAt: '2026-09-21T08:00:00.000Z' },
]
const demoDashboard: AdminDashboardData = { metrics: { totalOrders: 128, pendingOrders: 6, revenue: 28640, activeTechnicians: 3, userCount: 386 }, statusCounts: [{status:'PENDING',count:6},{status:'ACCEPTED',count:9},{status:'DEPARTED',count:4},{status:'ARRIVED',count:3},{status:'IN_SERVICE',count:5},{status:'COMPLETED',count:101}], trend: [{label:'9/16',count:12},{label:'9/17',count:16},{label:'9/18',count:19},{label:'9/19',count:15},{label:'9/20',count:23},{label:'9/21',count:18},{label:'9/22',count:25}], recentOrders: demoOrders }

export function AdminConsole({ user, onLogout, onChangePassword, onNotify }: { user: SessionUser; onLogout: () => void; onChangePassword: () => void; onNotify: (message: string) => void }) {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null)
  const [orders, setOrders] = useState<ManagedOrder[]>([])
  const [technicians, setTechnicians] = useState<ManagedTechnician[]>([])
  const [managedServices, setManagedServices] = useState<ManagedService[]>(demoServices)
  const serviceOptions = managedServices.filter((item) => item.active)
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [filter, setFilter] = useState('ALL')
  const [orderSearch, setOrderSearch] = useState('')
  const [orderTechnician, setOrderTechnician] = useState('ALL')
  const [selectedOrder, setSelectedOrder] = useState<ManagedOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDemoData, setIsDemoData] = useState(true)
  const [techSearch, setTechSearch] = useState('')
  const [techFilter, setTechFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE' | 'ARCHIVED'>('ALL')
  const [techPage, setTechPage] = useState(1)
  const [editing, setEditing] = useState<ManagedTechnician | null>(null)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newPrice, setNewPrice] = useState(239)
  const [newExperienceYears, setNewExperienceYears] = useState(1)
  const [newWorkStart, setNewWorkStart] = useState('10:00')
  const [newWorkEnd, setNewWorkEnd] = useState('22:00')
  const [newWorkDays, setNewWorkDays] = useState<number[]>([0,1,2,3,4,5,6])
  const [newIntro, setNewIntro] = useState('')
  const [newImageKey, setNewImageKey] = useState('')
  const [editImageKey, setEditImageKey] = useState('')
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [newServices, setNewServices] = useState<string[]>(['neck'])
  const [deleting, setDeleting] = useState<ManagedTechnician | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editPrice, setEditPrice] = useState(199)
  const [editExperienceYears, setEditExperienceYears] = useState(1)
  const [editWorkStart, setEditWorkStart] = useState('10:00')
  const [editWorkEnd, setEditWorkEnd] = useState('22:00')
  const [editWorkDays, setEditWorkDays] = useState<number[]>([0,1,2,3,4,5,6])
  const [editServices, setEditServices] = useState<string[]>([])
  const [resetPassword, setResetPassword] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [userFilter, setUserFilter] = useState<'ALL' | 'ACTIVE' | 'VIP' | 'NEW'>('ALL')
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null)
  const [serviceName, setServiceName] = useState('')
  const [serviceDescription, setServiceDescription] = useState('')
  const [servicePrice, setServicePrice] = useState(299)
  const [serviceDuration, setServiceDuration] = useState(60)
  const [serviceSaving, setServiceSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [nextDashboard, nextOrders, nextTechnicians, nextUsers, nextServices] = await Promise.all([adminClient.dashboard(), adminClient.orders(), adminClient.technicians(), adminClient.users(), adminClient.services()])
      setDashboard(nextDashboard); setOrders(nextOrders); setTechnicians(nextTechnicians); setUsers(nextUsers); setManagedServices(nextServices); setIsDemoData(false)
    } catch (error) {
      if (error instanceof ApiUnavailableError) { setDashboard(demoDashboard); setOrders(demoOrders); setTechnicians(demoTechnicians); setUsers(demoUsers); setManagedServices(demoServices); setIsDemoData(true); onNotify('当前为离线后台演示数据') }
      else onNotify(error instanceof Error ? error.message : '后台数据加载失败')
    }
    finally { setLoading(false) }
  }, [onNotify])
  useEffect(() => { void load() }, [load])

  const orderTechnicians = useMemo(() => [...new Set(orders.map((item) => item.technician))], [orders])
  const visibleOrders = useMemo(() => orders.filter((item) => {
    const statusMatch = filter === 'ALL' || item.status === filter
    const technicianMatch = orderTechnician === 'ALL' || item.technician === orderTechnician
    const query = orderSearch.trim().toLowerCase()
    const searchMatch = !query || `${item.id}${item.customer}${item.phone}${item.technician}${item.service}${item.address}`.toLowerCase().includes(query)
    return statusMatch && technicianMatch && searchMatch
  }), [orders, filter, orderTechnician, orderSearch])
  const filteredTechnicians = useMemo(() => technicians.filter((item) => {
    const statusMatch = techFilter === 'ALL' || techFilter === 'ONLINE' && item.active && !item.archived || techFilter === 'OFFLINE' && !item.active && !item.archived || techFilter === 'ARCHIVED' && item.archived
    const searchMatch = !techSearch.trim() || `${item.name}${item.title}${item.services.join('')}`.toLowerCase().includes(techSearch.trim().toLowerCase())
    return statusMatch && searchMatch
  }), [technicians, techFilter, techSearch])
  const techPageCount = Math.max(1, Math.ceil(filteredTechnicians.length / TECHNICIANS_PER_PAGE))
  const visibleTechnicians = useMemo(() => filteredTechnicians.slice((techPage - 1) * TECHNICIANS_PER_PAGE, techPage * TECHNICIANS_PER_PAGE), [filteredTechnicians, techPage])
  useEffect(() => { setTechPage(1) }, [techSearch, techFilter])
  useEffect(() => { if (techPage > techPageCount) setTechPage(techPageCount) }, [techPage, techPageCount])
  const visibleUsers = useMemo(() => users.filter((item) => {
    const query = userSearch.trim().toLowerCase()
    const searchMatch = !query || `${item.name}${item.phone}${item.preferences.join('')}`.toLowerCase().includes(query)
    const ageDays = (Date.now() - new Date(item.createdAt).getTime()) / 86400000
    const categoryMatch = userFilter === 'ALL' || userFilter === 'ACTIVE' && item.orderCount > 0 || userFilter === 'VIP' && item.totalSpent >= 1000 || userFilter === 'NEW' && ageDays <= 30
    return searchMatch && categoryMatch
  }), [users, userSearch, userFilter])
  const maxTrend = Math.max(1, ...(dashboard?.trend.map((item) => item.count) ?? [1]))
  const toggleTechnician = async (technician: ManagedTechnician) => {
    if (technician.archived) return onNotify('请先恢复该技师，再调整上线状态')
    const next = !technician.active
    setTechnicians((current) => current.map((item) => item.id === technician.id ? { ...item, active: next } : item))
    try { await adminClient.setTechnicianActive(technician.id, next); onNotify(`${technician.name}已${next ? '上线' : '下线'}`); await load() }
    catch (error) {
      if (error instanceof ApiUnavailableError) onNotify(`演示模式：${technician.name}已${next ? '上线' : '下线'}`)
      else { setTechnicians((current) => current.map((item) => item.id === technician.id ? technician : item)); onNotify(error instanceof Error ? error.message : '操作失败') }
    }
  }
  const openTechnician = (technician: ManagedTechnician) => {
    setEditing(technician); setEditTitle(technician.title); setEditPrice(technician.price); setEditExperienceYears(technician.experienceYears); setEditImageKey(technician.imageKey); setEditWorkStart(technician.workStart); setEditWorkEnd(technician.workEnd); setEditWorkDays(technician.workDays)
    setEditServices(serviceOptions.filter((option) => technician.services.includes(option.name)).map((option) => option.id))
    setResetPassword('')
  }
  const toggleService = (id: string) => setEditServices((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const choosePortrait = async (file: File | undefined, target: 'new' | 'edit') => {
    if (!file) return
    setAvatarBusy(true)
    try { const dataUrl = await preparePortrait(file); if (target === 'new') setNewImageKey(dataUrl); else setEditImageKey(dataUrl); onNotify('头像已压缩并预览，保存档案后生效') }
    catch (error) { onNotify(error instanceof Error ? error.message : '图片处理失败') }
    finally { setAvatarBusy(false) }
  }
  const addService = async () => {
    if (serviceName.trim().length < 2 || serviceDescription.trim().length < 4 || servicePrice < 1 || serviceDuration < 15) return onNotify('请填写服务名称、说明、价格和时长')
    setServiceSaving(true)
    try { const created = await adminClient.createService({ name: serviceName.trim(), description: serviceDescription.trim(), price: servicePrice, duration: serviceDuration }); setManagedServices((current) => [...current, created]); setServiceName(''); setServiceDescription(''); onNotify(`${created.name}已上架，可分配给技师`) }
    catch (error) { onNotify(error instanceof Error ? error.message : '新增服务失败') }
    finally { setServiceSaving(false) }
  }
  const setServiceActive = async (service: ManagedService) => {
    try { await adminClient.setServiceActive(service.id, !service.active); setManagedServices((current) => current.map((item) => item.id === service.id ? { ...item, active: !service.active } : item)); onNotify(`${service.name}已${service.active ? '下架' : '上架'}`) }
    catch (error) { onNotify(error instanceof Error ? error.message : '更新服务失败') }
  }
  const saveTechnician = async () => {
    if (!editing || !editTitle.trim() || !editServices.length) return onNotify('请填写职称并至少选择一个服务项目')
    if (!editWorkDays.length) return onNotify('请至少选择一个接单日')
    if (editWorkStart >= editWorkEnd) return onNotify('接单结束时间必须晚于开始时间')
    setSaving(true)
    const fallback = { ...editing, title: editTitle.trim(), price: editPrice, experienceYears: editExperienceYears, workStart: editWorkStart, workEnd: editWorkEnd, workDays: editWorkDays, services: serviceOptions.filter((item) => editServices.includes(item.id)).map((item) => item.name) }
    try {
      const updated = await adminClient.updateTechnician(editing.id, { title: editTitle.trim(), price: editPrice, experienceYears: editExperienceYears, imageKey: editImageKey, serviceIds: editServices, workStart: editWorkStart, workEnd: editWorkEnd, workDays: editWorkDays })
      setTechnicians((current) => current.map((item) => item.id === updated.id ? updated : item)); setEditing(null); onNotify(`${updated.name}的档案已保存`)
    } catch (error) {
      if (error instanceof ApiUnavailableError) { setTechnicians((current) => current.map((item) => item.id === fallback.id ? fallback : item)); setEditing(null); onNotify('演示模式：技师档案已在当前页面更新') }
      else onNotify(error instanceof Error ? error.message : '保存失败')
    } finally { setSaving(false) }
  }
  const resetTechnicianPassword = async () => {
    if (!editing) return
    if (resetPassword.length < 6) return onNotify('新的初始密码至少需要 6 位')
    setResettingPassword(true)
    try { await adminClient.resetTechnicianPassword(editing.id, resetPassword); setResetPassword(''); onNotify(`${editing.name}的登录密码已重置`) }
    catch (error) { onNotify(error instanceof Error ? error.message : '密码重置失败') }
    finally { setResettingPassword(false) }
  }
  const addTechnician = async () => {
    if (newName.trim().length < 2) return onNotify('技师姓名至少需要 2 个字符')
    if (!/^1\d{10}$/.test(newPhone)) return onNotify('请输入有效的 11 位技师登录手机号')
    if (newPassword.length < 6) return onNotify('技师初始密码至少需要 6 位')
    if (newTitle.trim().length < 2) return onNotify('展示职称至少需要 2 个字符')
    if (newIntro.trim().length < 2) return onNotify('个人简介至少需要 2 个字符')
    if (newPrice < 99 || newPrice > 1999) return onNotify('服务起步价应在 99–1999 元之间')
    if (newExperienceYears < 0 || newExperienceYears > 60) return onNotify('从业经验应在 0–60 年之间')
    if (!newImageKey.startsWith('data:image/')) return onNotify('请先为技师选择一张头像照片')
    if (!newServices.length) return onNotify('请至少选择一个服务项目')
    if (!newWorkDays.length) return onNotify('请至少选择一个接单日')
    if (newWorkStart >= newWorkEnd) return onNotify('接单结束时间必须晚于开始时间')
    if (avatarBusy) return onNotify('头像正在处理，请稍候')
    setSaving(true)
    try {
      const created = await adminClient.createTechnician({ name: newName.trim(), phone: newPhone, password: newPassword, title: newTitle.trim(), price: newPrice, experienceYears: newExperienceYears, imageKey: newImageKey, intro: newIntro.trim(), serviceIds: newServices, workStart: newWorkStart, workEnd: newWorkEnd, workDays: newWorkDays })
      setTechnicians((current) => [...current, created]); setAdding(false); setNewName(''); setNewPhone(''); setNewPassword(''); setNewTitle(''); setNewIntro(''); setNewImageKey(''); onNotify(`${created.name}已创建，技师账号可立即登录`)
      await load()
    } catch (error) { onNotify(error instanceof ApiUnavailableError ? '真实后端尚未连接，无法新增技师' : error instanceof Error ? error.message : '新增失败') }
    finally { setSaving(false) }
  }
  const archiveSelectedTechnician = async () => {
    if (!deleting) return
    setSaving(true)
    try {
      await adminClient.archiveTechnician(deleting.id)
      setTechnicians((current) => current.map((item) => item.id === deleting.id ? { ...item, archived: true, active: false } : item)); onNotify(`${deleting.name}已归档，历史订单保留`); setDeleting(null)
      await load()
    } catch (error) { onNotify(error instanceof ApiUnavailableError ? '真实后端尚未连接，无法删除技师' : error instanceof Error ? error.message : '删除失败') }
    finally { setSaving(false) }
  }
  const restoreTechnician = async (technician: ManagedTechnician) => {
    setSaving(true)
    try { await adminClient.restoreTechnician(technician.id); setTechnicians((current) => current.map((item) => item.id === technician.id ? { ...item, archived: false, active: false } : item)); onNotify(`${technician.name}已恢复为离线状态，可检查资料后再上线`); await load() }
    catch (error) { onNotify(error instanceof Error ? error.message : '恢复失败') }
    finally { setSaving(false) }
  }

  return <div className="admin-shell">
    <aside className="admin-sidebar"><div className="admin-logo"><Logo/><span><b>罗汉到家</b><small>运营管理中心</small></span></div><nav>
      {([['dashboard','▦','经营看板'],['orders','▤','订单管理'],['technicians','♙','技师管理'],['users','♧','用户管理']] as const).map(([id, icon, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><i>{icon}</i>{label}</button>)}
    </nav><div className="admin-user"><span>{user.name.slice(0, 1)}</span><div><b>{user.name}</b><small>超级管理员</small></div><div className="admin-account-actions"><button onClick={onChangePassword}>安全</button><button onClick={onLogout}>退出</button></div></div></aside>
    <main className="admin-main"><header className="admin-header"><div><h1>{tab === 'dashboard' ? '经营数据看板' : tab === 'orders' ? '订单管理' : tab === 'technicians' ? '技师管理' : '用户管理'}</h1><p>{isDemoData ? '离线面试演示数据' : '数据来自当前业务数据库'} · {new Date().toLocaleDateString('zh-CN')}</p></div><button className="admin-refresh" disabled={loading} onClick={() => void load()}>{loading ? '同步中…' : '↻ 刷新数据'}</button></header>
      {loading && !dashboard ? <div className="admin-loading"><i/><b>正在加载经营数据</b></div> : null}
      {tab === 'dashboard' && dashboard && <>
        <section className="admin-kpis">
          <div><i className="kpi-orange">单</i><span><small>累计订单</small><strong>{dashboard.metrics.totalOrders}</strong><em>{isDemoData ? '演示数据' : '实时数据库'}</em></span></div>
          <div><i className="kpi-blue">待</i><span><small>待接订单</small><strong>{dashboard.metrics.pendingOrders}</strong><em>需要及时处理</em></span></div>
          <div><i className="kpi-green">¥</i><span><small>已完成营收</small><strong>¥{dashboard.metrics.revenue.toLocaleString()}</strong><em>按实付金额统计</em></span></div>
          <div><i className="kpi-purple">技</i><span><small>在线技师</small><strong>{dashboard.metrics.activeTechnicians}</strong><em>注册用户 {dashboard.metrics.userCount}</em></span></div>
        </section>
        <section className="admin-grid"><div className="admin-panel"><div className="panel-title"><span><b>近 7 日订单趋势</b><small>按创建日期统计</small></span><em>动态数据</em></div><div className="trend-chart">{dashboard.trend.map((item) => <div key={item.label}><span><i style={{ height: `${Math.max(8, item.count / maxTrend * 100)}%` }}/><b>{item.count}</b></span><small>{item.label}</small></div>)}</div></div>
          <div className="admin-panel"><div className="panel-title"><span><b>订单状态分布</b><small>当前履约漏斗</small></span></div><div className="status-bars">{dashboard.statusCounts.map((item, index) => <div key={item.status}><span><i className={`status-color s${index}`}/>{statusName[item.status]}</span><b>{item.count}</b><em><i style={{ width: `${Math.max(4, item.count / Math.max(1, dashboard.metrics.totalOrders) * 100)}%` }}/></em></div>)}</div></div></section>
        <OrderTable orders={dashboard.recentOrders} compact onSelect={setSelectedOrder}/>
      </>}
      {tab === 'orders' && <><section className="order-query-panel"><div className="order-query-row"><div className="tech-search order-search"><i>⌕</i><input value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} placeholder="搜索用户、手机号、订单号或服务"/></div><label className="order-tech-select"><span>按技师查看</span><select value={orderTechnician} onChange={(event) => setOrderTechnician(event.target.value)}><option value="ALL">全部技师</option>{orderTechnicians.map((name) => <option key={name} value={name}>{name}</option>)}</select></label><div className="order-query-result"><b>{visibleOrders.length}</b><small>筛选结果</small></div></div><div className="admin-filters">{['ALL','PENDING','ACCEPTED','DEPARTED','ARRIVED','IN_SERVICE','COMPLETED','CANCELLED'].map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item === 'ALL' ? '全部状态' : statusName[item]}{item === 'ALL' ? ` ${orders.length}` : ''}</button>)}</div></section><OrderTable orders={visibleOrders} onSelect={setSelectedOrder}/></>}
      {tab === 'technicians' && <><div className="tech-admin-toolbar"><div className="tech-search"><i>⌕</i><input value={techSearch} onChange={(event) => setTechSearch(event.target.value)} placeholder="搜索技师、职称或服务"/></div><div className="tech-filter">{(['ALL','ONLINE','OFFLINE','ARCHIVED'] as const).map((item) => <button key={item} className={techFilter === item ? 'active' : ''} onClick={() => setTechFilter(item)}>{item === 'ALL' ? `全部 ${technicians.length}` : item === 'ONLINE' ? '仅在线' : item === 'OFFLINE' ? '仅离线' : '已归档'}</button>)}</div><button className="admin-add-tech" onClick={() => setAdding(true)}>＋ 新增技师</button></div><section className="technician-admin-grid">{visibleTechnicians.map((item) => <article key={item.id} className={`technician-admin-card ${item.archived ? 'archived' : ''}`}><div className="tech-admin-head">{portrait(item.imageKey) ? <img src={portrait(item.imageKey)} alt={`${item.name}头像`}/> : <span>{item.name.slice(0, 1)}</span>}<div><h3>{item.name}<i className={item.active && !item.archived ? 'online' : ''}>{item.archived ? '已归档' : item.active ? '在线' : '离线'}</i></h3><p>{item.title} · ★ {item.rating}</p></div><button disabled={item.archived} className={`admin-switch ${item.active && !item.archived ? 'on' : ''}`} aria-label={item.archived ? `${item.name}已归档` : `${item.active ? '下线' : '上线'}${item.name}`} onClick={() => void toggleTechnician(item)}><i/></button></div><div className="tech-admin-stats"><span><b>{item.orderCount}</b><small>平台订单</small></span><span><b>¥{item.price}</b><small>起步价</small></span></div><div className="tech-work-schedule"><b>{item.workStart}–{item.workEnd}</b><span>{workdaySummary(item.workDays)}</span></div><div className="tech-service-tags">{item.services.map((service) => <i key={service}>{service}</i>)}</div><div className="tech-card-actions">{item.archived ? <button className="tech-restore-btn" disabled={saving} onClick={() => void restoreTechnician(item)}>恢复技师</button> : <><button className="tech-detail-btn" onClick={() => openTechnician(item)}>编辑档案 →</button><button className="tech-archive-btn" onClick={() => setDeleting(item)}>归档</button></>}</div></article>)}{!visibleTechnicians.length && <div className="admin-empty tech-empty">没有找到符合条件的技师</div>}</section><Pagination page={techPage} pageCount={techPageCount} total={filteredTechnicians.length} onPage={setTechPage}/><section className="admin-panel service-management"><div className="panel-title"><span><b>服务项目管理</b><small>新增项目后，在技师档案中勾选分配；下架不影响历史订单</small></span></div><div className="service-admin-list">{managedServices.map((item) => <div key={item.id}><span><b>{item.name}</b><small>{item.description} · {item.duration} 分钟 · {item.technicianCount} 位技师</small></span><strong>¥{item.price}</strong><button onClick={() => void setServiceActive(item)}>{item.active ? '下架' : '上架'}</button></div>)}</div><div className="service-create-form"><input aria-label="新服务名称" placeholder="服务名称" maxLength={30} value={serviceName} onChange={(event) => setServiceName(event.target.value)}/><input aria-label="新服务说明" placeholder="服务说明" maxLength={100} value={serviceDescription} onChange={(event) => setServiceDescription(event.target.value)}/><label>价格 ¥<input aria-label="新服务价格" type="number" min="1" max="9999" value={servicePrice} onChange={(event) => setServicePrice(Number(event.target.value))}/></label><label>时长 分钟<input aria-label="新服务时长" type="number" min="15" max="240" value={serviceDuration} onChange={(event) => setServiceDuration(Number(event.target.value))}/></label><button disabled={serviceSaving} onClick={() => void addService()}>{serviceSaving ? '新增中…' : '＋ 新增服务'}</button></div></section></>}
      {tab === 'users' && <><section className="user-management-summary"><div><small>注册用户</small><b>{users.length}</b></div><div><small>有订单用户</small><b>{users.filter((item) => item.orderCount > 0).length}</b></div><div><small>高价值用户</small><b>{users.filter((item) => item.totalSpent >= 1000).length}</b></div><div><small>累计用户消费</small><b>¥{users.reduce((sum, item) => sum + item.totalSpent, 0).toLocaleString()}</b></div></section><div className="tech-admin-toolbar user-toolbar"><div className="tech-search"><i>⌕</i><input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="搜索用户姓名、手机号或偏好"/></div><div className="tech-filter">{(['ALL','ACTIVE','VIP','NEW'] as const).map((item) => <button key={item} className={userFilter === item ? 'active' : ''} onClick={() => setUserFilter(item)}>{item === 'ALL' ? `全部 ${users.length}` : item === 'ACTIVE' ? '有订单' : item === 'VIP' ? '高价值' : '新用户'}</button>)}</div></div><section className="admin-panel user-table-panel"><div className="user-table user-table-head"><span>用户</span><span>订单情况</span><span>累计消费</span><span>积分</span><span>最近下单</span><span>操作</span></div>{visibleUsers.map((item) => <button className="user-table user-table-row" key={item.id} onClick={() => setSelectedUser(item)}><span className="user-identity"><i>{item.name.slice(0, 1)}</i><b>{item.name}<small>{item.phone}</small></b></span><span><b>{item.orderCount} 单</b><small>完成 {item.completedOrders} 单</small></span><span><b>¥{item.totalSpent.toLocaleString()}</b><small>{item.totalSpent >= 1000 ? '高价值用户' : '普通用户'}</small></span><span><b>{item.points}</b><small>可用积分</small></span><span><b>{item.lastOrderAt ? new Date(item.lastOrderAt).toLocaleDateString('zh-CN') : '暂无'}</b><small>注册 {new Date(item.createdAt).toLocaleDateString('zh-CN')}</small></span><span><i className="user-view-action">查看详情 →</i></span></button>)}{!visibleUsers.length && <div className="admin-empty">没有找到符合条件的用户</div>}</section></>}
    </main>
    <div className={`admin-modal-mask ${adding ? 'open' : ''}`} onClick={() => setAdding(false)}><section className="admin-tech-modal technician-form-modal" onClick={(event) => event.stopPropagation()}>
      <div className="admin-modal-head"><span className="order-detail-icon">＋</span><span><small>技师管理</small><h2>新增技师</h2></span><button aria-label="关闭新增技师" onClick={() => setAdding(false)}>×</button></div>
      <div className="admin-form-grid">
      <label className="admin-form-field"><span>姓名</span><input value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={20} placeholder="例如：李安"/></label>
      <label className="admin-form-field"><span>展示职称</span><input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} maxLength={30} placeholder="例如：资深推拿师"/></label>
      <label className="admin-form-field"><span>登录手机号</span><input aria-label="技师登录手机号" value={newPhone} onChange={(event) => setNewPhone(event.target.value.replace(/\D/g, '').slice(0, 11))} inputMode="tel" placeholder="作为技师工作台账号"/></label>
      <label className="admin-form-field"><span>初始密码</span><input aria-label="技师初始密码" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} maxLength={64} placeholder="至少 6 位"/><small>创建后，技师使用手机号和该密码登录自己的工作台</small></label>
      <label className="admin-form-field"><span>服务起步价</span><div><i>¥</i><input type="number" min="99" max="1999" value={newPrice} onChange={(event) => setNewPrice(Number(event.target.value))}/></div></label>
      <label className="admin-form-field"><span>从业经验（年）</span><input type="number" min="0" max="60" value={newExperienceYears} onChange={(event) => setNewExperienceYears(Number(event.target.value))}/><small>由管理员根据资质资料填写；准时率由订单到达记录自动计算</small></label>
      </div>
      <div className="admin-form-field portrait-field"><span>技师头像 <em>必选</em></span><div className={`portrait-picker ${newImageKey ? 'has-image' : ''}`}>{newImageKey ? <img src={portrait(newImageKey)} alt="头像预览"/> : <i className="portrait-placeholder">＋</i>}<label>{newImageKey ? '重新选择照片' : '选择本地照片'}<input type="file" required accept="image/jpeg,image/png,image/webp" onChange={(event) => void choosePortrait(event.target.files?.[0], 'new')}/></label>{newImageKey && <button type="button" onClick={() => setNewImageKey('')}>移除照片</button>}<small>{avatarBusy ? '正在压缩头像…' : '必须上传 JPG / PNG / WebP；原图不超过 2 MB，自动压缩至 100 KB 内'}</small></div></div>
      <label className="admin-form-field intro-field"><span>个人简介</span><textarea value={newIntro} onChange={(event) => setNewIntro(event.target.value)} maxLength={300} placeholder="介绍手法和擅长领域"/></label>
      <div className="admin-form-field"><span>可提供的服务项目</span><div className="admin-service-options">{serviceOptions.map((service) => <button key={service.id} aria-pressed={newServices.includes(service.id)} className={newServices.includes(service.id) ? 'active' : ''} onClick={() => setNewServices((current) => current.includes(service.id) ? current.filter((id) => id !== service.id) : [...current, service.id])}>{newServices.includes(service.id) ? '✓ ' : '+ '}{service.name}</button>)}</div></div>
      <ScheduleEditor start={newWorkStart} end={newWorkEnd} days={newWorkDays} onStart={setNewWorkStart} onEnd={setNewWorkEnd} onDays={setNewWorkDays}/>
      <div className="admin-modal-actions"><button onClick={() => setAdding(false)}>取消</button><button className="save" disabled={saving} onClick={() => void addTechnician()}>{saving ? '保存中…' : '创建技师'}</button></div>
    </section></div>
    <div className={`admin-modal-mask ${deleting ? 'open' : ''}`} onClick={() => setDeleting(null)}><section className="admin-tech-modal" onClick={(event) => event.stopPropagation()}>
      <div className="admin-modal-head"><span className="order-detail-icon">档</span><span><small>确认归档</small><h2>{deleting?.name}</h2></span><button aria-label="关闭归档确认" onClick={() => setDeleting(null)}>×</button></div>
      <p>归档后技师将停止展示和接新订单，历史订单与经营数据完整保留。之后可在“已归档”中恢复；若还有进行中的订单，系统会阻止归档。</p>
      <div className="admin-modal-actions"><button onClick={() => setDeleting(null)}>取消</button><button className="save" disabled={saving} onClick={() => void archiveSelectedTechnician()}>{saving ? '处理中…' : '确认归档'}</button></div>
    </section></div>
    <div className={`admin-modal-mask ${editing ? 'open' : ''}`} onClick={() => setEditing(null)}><section className="admin-tech-modal technician-form-modal" onClick={(event) => event.stopPropagation()}><div className="admin-modal-head">{editing && portrait(editImageKey) && <img src={portrait(editImageKey)} alt={`${editing.name}头像`}/>}<span><small>技师档案管理</small><h2>{editing?.name}</h2></span><button aria-label="关闭技师档案" onClick={() => setEditing(null)}>×</button></div><div className="admin-form-field"><span>技师头像</span><div className="portrait-picker"><img src={portrait(editImageKey)} alt="头像预览"/><label>重新选择照片<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void choosePortrait(event.target.files?.[0], 'edit')}/></label><small>原图不超过 2 MB，自动压缩至 100 KB 内</small></div></div><div className="admin-form-grid"><label className="admin-form-field"><span>展示职称</span><input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} maxLength={30}/></label><label className="admin-form-field"><span>服务起步价</span><div><i>¥</i><input type="number" min="99" max="1999" value={editPrice} onChange={(event) => setEditPrice(Number(event.target.value))}/></div></label><label className="admin-form-field"><span>从业经验（年）</span><input type="number" min="0" max="60" value={editExperienceYears} onChange={(event) => setEditExperienceYears(Number(event.target.value))}/><small>当前准时率 {editing?.onTimeRate ?? 100}%，由履约到达记录自动计算</small></label></div><div className="admin-form-field"><span>可提供的服务项目</span><div className="admin-service-options">{serviceOptions.map((service) => <button key={service.id} className={editServices.includes(service.id) ? 'active' : ''} aria-pressed={editServices.includes(service.id)} onClick={() => toggleService(service.id)}>{editServices.includes(service.id) ? '✓ ' : '+ '}{service.name}</button>)}</div></div><div className="technician-login-security"><span><b>工作台登录账号</b><small>{editing?.loginPhone ? editing.loginPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '该旧档案尚未绑定登录账号'}</small></span><input aria-label="重置技师密码" type="password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} placeholder="输入 6–64 位新密码" maxLength={64}/><button disabled={!editing?.loginPhone || resettingPassword} onClick={() => void resetTechnicianPassword()}>{resettingPassword ? '重置中…' : '重置密码'}</button></div><ScheduleEditor start={editWorkStart} end={editWorkEnd} days={editWorkDays} onStart={setEditWorkStart} onEnd={setEditWorkEnd} onDays={setEditWorkDays}/><div className="admin-modal-actions"><button onClick={() => setEditing(null)}>取消</button><button className="save" disabled={saving || avatarBusy} onClick={() => void saveTechnician()}>{saving ? '保存中…' : '保存档案'}</button></div></section></div>
    <div className={`admin-modal-mask ${selectedOrder ? 'open' : ''}`} onClick={() => setSelectedOrder(null)}><section className="admin-tech-modal order-detail-modal" onClick={(event) => event.stopPropagation()}><div className="admin-modal-head"><span className="order-detail-icon">单</span><span><small>订单履约详情</small><h2>{selectedOrder?.id}</h2></span><button aria-label="关闭订单详情" onClick={() => setSelectedOrder(null)}>×</button></div>{selectedOrder && <div className="order-detail-grid"><span><small>用户</small><b>{selectedOrder.customer}</b><em>{selectedOrder.phone}</em></span><span><small>服务技师</small><b>{selectedOrder.technician}</b><em>负责本次上门服务</em></span><span><small>服务项目</small><b>{selectedOrder.service}</b><em>实付 ¥{selectedOrder.amount}</em></span><span><small>预约时间</small><b>{selectedOrder.schedule}</b><em>{selectedOrder.address}</em></span><span className="wide"><small>下单时间</small><b>{new Date(selectedOrder.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}</b><em>用户提交并生成订单的时间</em></span><span className="wide"><small>当前状态</small><i className={`admin-status status-${selectedOrder.status.toLowerCase()}`}>{statusName[selectedOrder.status]}</i></span></div>}<div className="admin-modal-actions"><button className="save" onClick={() => setSelectedOrder(null)}>知道了</button></div></section></div>
    <div className={`admin-modal-mask ${selectedUser ? 'open' : ''}`} onClick={() => setSelectedUser(null)}><section className="admin-tech-modal user-detail-modal" onClick={(event) => event.stopPropagation()}><div className="admin-modal-head"><span className="user-detail-avatar">{selectedUser?.name.slice(0, 1)}</span><span><small>用户资产与消费档案</small><h2>{selectedUser?.name}</h2></span><button aria-label="关闭用户详情" onClick={() => setSelectedUser(null)}>×</button></div>{selectedUser && <><div className="user-detail-metrics"><span><b>{selectedUser.orderCount}</b><small>累计订单</small></span><span><b>¥{selectedUser.totalSpent}</b><small>累计消费</small></span><span><b>{selectedUser.points}</b><small>账户积分</small></span></div><div className="order-detail-grid"><span><small>手机号</small><b>{selectedUser.phone}</b><em>用户唯一联系方式</em></span><span><small>完成率</small><b>{selectedUser.orderCount ? Math.round(selectedUser.completedOrders / selectedUser.orderCount * 100) : 0}%</b><em>完成 {selectedUser.completedOrders} / {selectedUser.orderCount} 单</em></span><span className="wide"><small>按摩偏好</small><b>{selectedUser.preferences.length ? selectedUser.preferences.join(' · ') : '尚未设置'}</b><em>可用于服务前准备</em></span><span className="wide"><small>账户时间</small><b>注册于 {new Date(selectedUser.createdAt).toLocaleString('zh-CN')}</b><em>{selectedUser.lastOrderAt ? `最近下单 ${new Date(selectedUser.lastOrderAt).toLocaleString('zh-CN')}` : '暂无下单记录'}</em></span></div></>}<div className="admin-modal-actions"><button className="save" onClick={() => setSelectedUser(null)}>知道了</button></div></section></div>
  </div>
}

function ScheduleEditor({ start, end, days, onStart, onEnd, onDays }: { start: string; end: string; days: number[]; onStart: (value: string) => void; onEnd: (value: string) => void; onDays: (value: number[]) => void }) {
  const toggleDay = (day: number) => onDays(days.includes(day) ? days.filter((item) => item !== day) : [...days, day])
  return <div className="admin-form-field schedule-editor"><span>接单排班 <small>每位技师独立设置</small></span><div className="schedule-time-row"><label><small>开始</small><select value={start} onChange={(event) => onStart(event.target.value)}>{bookingTimes.slice(0, -1).map((time) => <option key={time}>{time}</option>)}</select></label><i>至</i><label><small>结束</small><select value={end} onChange={(event) => onEnd(event.target.value)}>{bookingTimes.slice(1).map((time) => <option key={time}>{time}</option>)}</select></label></div><div className="schedule-day-options">{weekOptions.map((item) => <button type="button" key={item.id} aria-pressed={days.includes(item.id)} className={days.includes(item.id) ? 'active' : ''} onClick={() => toggleDay(item.id)}>{item.label}</button>)}</div><small>非接单日和工作时段外会自动显示不可约，不影响其他技师。</small></div>
}

function Pagination({ page, pageCount, total, onPage }: { page: number; pageCount: number; total: number; onPage: (page: number) => void }) {
  const first = total ? (page - 1) * TECHNICIANS_PER_PAGE + 1 : 0
  const last = Math.min(page * TECHNICIANS_PER_PAGE, total)
  return <nav className="tech-pagination" aria-label="技师列表分页"><span>第 {first}–{last} 位，共 {total} 位技师</span><div><button disabled={page === 1} onClick={() => onPage(page - 1)}>‹ 上一页</button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => <button key={item} aria-current={item === page ? 'page' : undefined} className={item === page ? 'active' : ''} onClick={() => onPage(item)}>{item}</button>)}<button disabled={page === pageCount} onClick={() => onPage(page + 1)}>下一页 ›</button></div><small>每页 12 位</small></nav>
}

function OrderTable({ orders, compact = false, onSelect }: { orders: ManagedOrder[]; compact?: boolean; onSelect?: (order: ManagedOrder) => void }) {
  return <section className="admin-panel order-table-panel"><div className="panel-title"><span><b>{compact ? '最新订单' : '订单明细'}</b><small>共 {orders.length} 条记录 · 点击任意订单查看详情</small></span></div><div className="admin-table"><div className="admin-tr admin-th"><span>订单 / 下单时间</span><span>用户 / 技师</span><span>预约信息</span><span>金额</span><span>状态</span></div>{orders.map((order) => <button type="button" className="admin-tr admin-order-row" key={order.id} onClick={() => onSelect?.(order)}><span><b>{order.id}</b><small>{order.service} · 下单 {new Date(order.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</small></span><span><b>{order.customer} → {order.technician}</b><small>{order.phone}</small></span><span><b>{order.schedule}</b><small>{order.address}</small></span><span><b>¥{order.amount}</b><small>实付</small></span><span><i className={`admin-status status-${order.status.toLowerCase()}`}>{statusName[order.status]}</i></span></button>)}{!orders.length && <div className="admin-empty">当前筛选条件下暂无订单</div>}</div></section>
}
