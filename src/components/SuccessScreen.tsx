import type { Order, Technician } from '../types'

export function SuccessScreen({ order, technician, onTrack, onHome }: { order: Order; technician: Technician; onTrack: () => void; onHome: () => void }) {
  return <section className="screen active"><div className="success"><div className="success-icon">✓</div><h1>支付成功</h1><p>正在为你通知 {technician.name} 技师</p><div className="paid-pill">实付 <strong>¥{order.paidAmount ?? order.originalPrice ?? 0}</strong>{Boolean(order.discount) && <span>已省 ¥{order.discount}</span>}</div><div className="order-no"><span>订单编号</span><b>{order.id}</b></div><div className="order-no"><span>上门时间</span><b>{order.dateLabel} {order.time}</b></div><div className="order-no"><span>服务地址</span><b>{order.address.label}</b></div><div className="success-actions"><button className="primary" onClick={onTrack}>查看订单进度</button><button className="secondary" onClick={onHome}>返回首页</button></div></div></section>
}
