import { useState } from 'react'
import type { Service, Technician } from '../types'

interface Settlement { discount: number; paidAmount: number; couponLabel: string }
interface Props { technician: Technician; service: Service; schedule: string; onBack: () => void; onPaid: (method: string, settlement: Settlement) => void }

export function PaymentScreen({ technician, service, schedule, onBack, onPaid }: Props) {
  const [method, setMethod] = useState('wechat')
  const [paying, setPaying] = useState(false)
  const [couponOpen, setCouponOpen] = useState(false)
  const [couponId, setCouponId] = useState('new30')
  const coupons = [{ id: 'new30', label: '新客立减券', note: '满199元可用', discount: 30 }, { id: 'member20', label: '金卡会员券', note: '全场通用', discount: 20 }, { id: 'none', label: '不使用优惠券', note: '保留到下次使用', discount: 0 }]
  const coupon = coupons.find((item) => item.id === couponId) ?? coupons[0]
  const paidAmount = Math.max(0, service.price - coupon.discount)
  const methods = [['wechat','微','微信支付','推荐使用'],['alipay','支','支付宝','安全快捷'],['card','卡','银行卡','尾号 6208']]
  const pay = () => {
    if (paying) return
    setPaying(true)
    setTimeout(() => onPaid(method, { discount: coupon.discount, paidAmount, couponLabel: coupon.label }), 1200)
  }

  return <section className="screen active"><div className="page-head"><button aria-label="返回预约" onClick={onBack}>‹</button><h1>支付订单</h1></div><div className="payment-body"><div className="pay-amount"><small>应付金额</small><strong>¥{paidAmount}</strong>{coupon.discount > 0 && <span>已优惠 ¥{coupon.discount}</span>}</div><div className="booking-summary"><img src={technician.img} alt={technician.name}/><span><b>{service.name}</b><small>{technician.name} · {schedule}</small></span></div><button className="coupon-row" onClick={() => setCouponOpen(true)}><span><i>券</i><b>优惠券</b></span><strong>{coupon.discount ? `-${coupon.discount}元` : '未使用'} <small>›</small></strong></button><div className="price-breakdown"><div><span>服务费</span><b>¥{service.price}</b></div><div><span>上门费</span><b>¥0</b></div><div className="discount-line"><span>{coupon.label}</span><b>-¥{coupon.discount}</b></div><div className="total-line"><span>合计</span><strong>¥{paidAmount}</strong></div></div><h2 className="sub-title">选择支付方式</h2><div className="pay-methods">{methods.map(([id,icon,name,note]) => <button key={id} aria-pressed={method === id} className={`pay-method ${method === id ? 'selected' : ''}`} onClick={() => setMethod(id)}><i>{icon}</i><span><b>{name}</b><small>{note}</small></span><b>{method === id ? '✓' : ''}</b></button>)}</div><button className="primary" disabled={paying} onClick={pay}>{paying && <i className="pay-spinner"/>}{paying ? '支付处理中' : `确认支付 ¥${paidAmount}`}</button><p className="notice" style={{ textAlign: 'center' }}>演示支付不会产生真实扣款</p></div><div className={`sheet-mask ${couponOpen ? 'open' : ''}`} onClick={() => setCouponOpen(false)}><div className="sheet" onClick={(event) => event.stopPropagation()}><div className="grab"/><h2>选择优惠券</h2><div className="coupon-options">{coupons.map((item) => <button key={item.id} aria-pressed={couponId === item.id} className={`coupon-option ${couponId === item.id ? 'selected' : ''}`} onClick={() => { setCouponId(item.id); setCouponOpen(false) }}><span><b>{item.label}</b><small>{item.note}</small></span><strong>{item.discount ? `¥${item.discount}` : '不用券'}</strong></button>)}</div><p className="sheet-tip">优惠券会自动计入实付金额，订单成功后仍可查看结算明细。</p></div></div></section>
}
