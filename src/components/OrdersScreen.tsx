import { useEffect } from 'react'
import type { Order, Service, Technician } from '../types'
import { orderStatuses } from '../data'
import { OrderTrackingMap, trackedDistance } from './OrderTrackingMap'

interface Props { order: Order | null; technician?: Technician; service?: Service; onHome: () => void; onUpdate: (order: Order) => void; onNotify: (message: string) => void }

export function OrdersScreen({ order, technician, service, onHome, onUpdate, onNotify }: Props) {
  useEffect(() => {
    if (!order || order.status < 2 || order.status >= 4 || order.etaSeconds <= 0) return
    const timer = setInterval(() => onUpdate({ ...order, etaSeconds: Math.max(0, order.etaSeconds - 1) }), 1000)
    return () => clearInterval(timer)
  }, [order, onUpdate])
  if (!order || !technician || !service) return <section className="screen active"><header><div className="brand">我的订单</div></header><div className="orders-empty"><div style={{ fontSize: 52 }}>⌛</div><b>暂无进行中的订单</b><p>选择一位附近技师，开始预约服务</p><button className="secondary" onClick={onHome}>去看看</button></div></section>
  const distance = trackedDistance(technician, order.status)
  const eta = order.status < 2 ? '等待接单' : order.status < 4 ? `${String(Math.floor(order.etaSeconds / 60)).padStart(2,'0')}:${String(order.etaSeconds % 60).padStart(2,'0')}` : order.status === 4 ? '进行中' : '已结束'
  const advance = () => {
    if (order.status === 5) return onNotify('本次服务已完成，感谢你的使用')
    onUpdate({ ...order, status: order.status + 1 }); onNotify(`订单已更新为「${orderStatuses[order.status + 1]}」`)
  }
  return <section className="screen active"><header><div className="brand">我的订单</div><button className="icon-btn" aria-label="电话联系技师" onClick={() => onNotify(`正在呼叫${technician.name}（演示）`)}>☏</button></header><div className="section-head"><h2>服务进度</h2><span><i className="live-dot"/>实时同步</span></div><div className="orders"><div className="order-card"><div className="order-top"><img src={technician.img}/><span><b>{technician.name} · {service.name}</b><small>{order.dateLabel} {order.time} · {order.intensity}力度</small></span><span className="status-badge">{orderStatuses[order.status]}</span></div><div className="eta"><span><small>{order.status < 4 ? '预计抵达' : '当前进度'}</small><b>{order.status < 4 ? '安心等待，状态实时更新' : '服务全程由平台保障'}</b></span><strong>{eta}</strong></div><div className="order-map-wrap"><OrderTrackingMap technician={technician} status={order.status}/><div className="track-legend"><span><b>{order.status < 2 ? '技师位置已确认' : order.status < 4 ? '技师正前往服务地址' : '技师已到达服务地址'}</b><small>蓝色标记为你的服务地址</small></span><span className="track-distance">{distance < .05 ? '已到达' : `${distance.toFixed(1)}km`}<small>{technician.name} → 我</small></span></div></div><div className="safe-code"><span><small>本次服务安全码</small><br/><b>见面后请核验</b></span><strong>8 6 1 9</strong></div><div className="timeline">{orderStatuses.map((item,index) => <div key={item} className={`step ${index < order.status ? 'done' : index === order.status ? 'current' : ''}`}><i className="step-dot"/><span><b>{item}</b><br/><small>{index === order.status ? '当前状态' : index < order.status ? '已完成' : '等待更新'}</small></span></div>)}</div><div className="status-actions"><button className="secondary" onClick={() => onNotify(`已打开与${technician.name}的在线会话`)}>在线联系</button><button className="primary" onClick={advance}>{order.status === 5 ? '服务已完成' : `推进到「${orderStatuses[order.status + 1]}」`}</button></div></div></div></section>
}
