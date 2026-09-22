import { useCallback, useEffect, useState } from 'react'
import type { SessionUser } from '../api/auth'
import { technicianWorkbenchClient } from '../api/technician-workbench'
import type { TechnicianOverview } from '../api/technician-workbench'
import { ApiUnavailableError } from '../api/client'

const statusName = ['待接单','已接单','已出发','已到达','服务中','已完成']
const demoOverview: TechnicianOverview = { technician: { id: 1, name: '陈静', title: '金牌理疗师', active: true, rating: 4.98 }, metrics: { todayOrders: 2, pendingOrders: 1, completedOrders: 862, income: 12680 }, orders: [{ id: 'LHDEMO1001', status: 'PENDING', statusIndex: 0, customer: '罗女士', phone: '138****8000', service: '肩颈深度放松', amount: 209, schedule: '明天 19:00', address: '静安嘉里中心 · 2号楼', detail: '上海市静安区南京西路1515号', intensity: '适中', note: '肩颈重点放松' }] }

export function TechnicianWorkbench({ user, onLogout, onChangePassword, onNotify }: { user: SessionUser; onLogout: () => void; onChangePassword: () => void; onNotify: (message: string) => void }) {
  const [data, setData] = useState<TechnicianOverview | null>(null)
  const [busyId, setBusyId] = useState('')
  const [feedback, setFeedback] = useState('')
  const [routeOrderId, setRouteOrderId] = useState('')
  const load = useCallback(async () => {
    try { setData(await technicianWorkbenchClient.overview()) }
    catch (error) {
      if (error instanceof ApiUnavailableError) { setData(demoOverview); onNotify('当前为离线技师工作台演示数据') }
      else onNotify(error instanceof Error ? error.message : '工作台加载失败')
    }
  }, [onNotify])
  useEffect(() => { void load() }, [load])
  const advance = async (id: string) => {
    setBusyId(id)
    try { const updated = await technicianWorkbenchClient.advance(id); const message = `订单已更新为「${statusName[updated.statusIndex]}」`; setFeedback(message); onNotify(message); await load() }
    catch (error) {
      if (error instanceof ApiUnavailableError) {
        setData((current) => current ? { ...current, orders: current.orders.map((item) => item.id === id ? { ...item, statusIndex: Math.min(5, item.statusIndex + 1), status: ['PENDING','ACCEPTED','DEPARTED','ARRIVED','IN_SERVICE','COMPLETED'][Math.min(5, item.statusIndex + 1)] } : item) } : current)
        setFeedback('演示模式：订单状态已在当前页面推进'); onNotify('演示模式：订单状态已在当前页面推进')
      } else onNotify(error instanceof Error ? error.message : '状态更新失败')
    }
    finally { setBusyId('') }
  }
  if (!data) return <div className="workbench-loading"><i/><b>正在进入技师工作台</b></div>
  return <div className="workbench-shell"><header className="workbench-head"><div><small>罗汉到家 · 技师工作台</small><h1>{data.technician.name}，今天辛苦了</h1><p><i className={data.technician.active ? 'online-dot' : ''}/>{data.technician.active ? '当前在线接单' : '当前暂停接单'} · ★ {data.technician.rating}</p></div><div className="workspace-account-actions"><button onClick={onChangePassword}>修改密码</button><button onClick={onLogout}>退出工作台</button></div></header>
    <section className="workbench-metrics"><div><small>今日预约</small><b>{data.metrics.todayOrders}</b><i>单</i></div><div><small>等待接单</small><b>{data.metrics.pendingOrders}</b><i>单</i></div><div><small>累计完成</small><b>{data.metrics.completedOrders}</b><i>单</i></div><div><small>服务收入</small><b>¥{data.metrics.income}</b></div></section>
    <div className="workbench-title"><span><h2>我的服务订单</h2><p>订单状态会实时同步给用户和管理后台</p></span><button onClick={() => { setFeedback('订单列表已刷新'); void load() }}>↻ 刷新</button></div>
    {feedback && <div className="work-feedback" role="status"><i>✓</i><span>{feedback}</span><button aria-label="关闭操作提示" onClick={() => setFeedback('')}>×</button></div>}
    <section className="workbench-orders">{data.orders.map((order) => <article key={order.id} className="work-order-card"><div className="work-order-top"><span><small>{order.id}</small><h3>{order.service}</h3></span><i className={`work-status s${order.statusIndex}`}>{statusName[order.statusIndex]}</i></div><div className="work-customer"><b>{order.customer}</b><span>{order.phone}</span><button onClick={() => { const message = `正在呼叫${order.customer}（演示）`; setFeedback(message); onNotify(message) }}>☎ 联系用户</button></div><div className="work-order-info"><span><small>预约时间</small><b>{order.schedule}</b></span><span><small>服务要求</small><b>{order.intensity}力度{order.note ? ` · ${order.note}` : ''}</b></span><span><small>服务地址</small><b>{order.address}</b><em>{order.detail}</em></span></div>{routeOrderId === order.id && <div className="work-route-preview"><div><i>技</i><span/><b>我</b></div><p>预计 12 分钟到达 · 路线已规划</p></div>}<div className="work-order-actions"><button className={routeOrderId === order.id ? 'active' : ''} onClick={() => { const opening = routeOrderId !== order.id; setRouteOrderId(opening ? order.id : ''); setFeedback(opening ? '路线规划已展开' : '路线规划已收起') }}>⌖ {routeOrderId === order.id ? '收起路线' : '查看路线'}</button>{order.statusIndex < 5 ? <button className="work-primary" disabled={busyId === order.id} onClick={() => void advance(order.id)}>{busyId === order.id ? '更新中…' : `推进到「${statusName[order.statusIndex + 1]}」`}</button> : <button className="work-finished" onClick={() => { setFeedback('该订单已完成并计入服务记录'); onNotify('该订单已完成并计入服务记录') }}>✓ 服务已完成</button>}</div></article>)}{!data.orders.length && <div className="work-empty"><span>✓</span><b>当前没有待服务订单</b><p>新订单会自动出现在这里</p></div>}</section>
    <footer className="workbench-footer">当前账号：{user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')} · 所有状态变更均写入订单日志</footer>
  </div>
}
