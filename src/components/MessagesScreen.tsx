import { useMemo } from 'react'
import type { SessionUser } from '../api/auth'
import type { Order, Service, Technician } from '../types'
import { orderStatuses } from '../data'
import { usePersistedState } from '../hooks/usePersistedState'

interface Props { user: SessionUser; orders: Order[]; technicians: Technician[]; services: Service[]; onOpenOrder: (order: Order) => void; onNotify: (message: string) => void }

export function MessagesScreen({ user, orders, technicians, services, onOpenOrder, onNotify }: Props) {
  const [readIds, setReadIds] = usePersistedState<string[]>(`luohan_messages_read_${user.id}`, [])
  const messages = useMemo(() => {
    const orderMessages = orders.slice(0, 8).map((order) => {
      const technician = technicians.find((item) => item.id === order.techId)
      const service = services.find((item) => item.id === order.serviceId)
      const status = orderStatuses[order.status]
      const copy = order.status === 6 ? `${service?.name ?? '服务'}订单已取消，退款将按原支付渠道处理` : order.status === 0 ? `${technician?.name ?? '技师'}正在确认你的${service?.name ?? '服务'}预约` : order.status < 4 ? `${technician?.name ?? '技师'}的履约状态已更新为“${status}”` : order.status === 4 ? `${service?.name ?? '服务'}正在进行，平台持续提供安全保障` : `${service?.name ?? '服务'}已完成，可在订单页提交评价`
      return { id: `order-${order.id}-${order.status}`, icon: order.status === 5 ? '✓' : '⌖', title: `订单${status}`, copy, order }
    })
    return orderMessages.length ? orderMessages : [{ id: `welcome-${user.id}`, icon: '罗', title: `欢迎你，${user.name}`, copy: '完成首笔预约后，接单、出发和服务进度会实时出现在这里。', order: null }]
  }, [orders, services, technicians, user.id, user.name])
  const unread = messages.filter((item) => !readIds.includes(item.id)).length
  const read = (id: string, title: string, order: Order | null) => { setReadIds((current) => current.includes(id) ? current : [...current, id]); if (order) onOpenOrder(order); else onNotify(`已查看「${title}」`) }
  const readAll = () => { setReadIds((current) => [...new Set([...current, ...messages.map((item) => item.id)])]); onNotify('当前账号的消息已全部标记为已读') }
  return <section className="screen active"><header><div className="brand">消息中心</div><button className="icon-btn" aria-label="全部已读" onClick={readAll}>✓</button></header><div className="hero-strip"><span><small>{user.name}的服务动态</small><b>{unread ? `你有 ${unread} 条新动态` : '消息已全部读完'}</b></span><strong>{unread}</strong></div><div className="message-list">{messages.map((item) => <button className="message-card" key={item.id} onClick={() => read(item.id, item.title, item.order)}><span className="message-icon">{item.icon}</span><span><b>{item.title}</b><p>{item.copy}</p>{item.order && <small>订单 {item.order.id} · 点击查看详情</small>}</span>{!readIds.includes(item.id) && <i className="unread"/>}</button>)}</div></section>
}
