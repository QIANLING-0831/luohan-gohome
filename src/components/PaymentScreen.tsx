import { useState } from 'react'
import type { Service, Technician } from '../types'

interface Props { technician: Technician; service: Service; schedule: string; onBack: () => void; onPaid: (method: string) => void }

export function PaymentScreen({ technician, service, schedule, onBack, onPaid }: Props) {
  const [method, setMethod] = useState('wechat'), [paying, setPaying] = useState(false)
  const pay = () => { if (paying) return; setPaying(true); setTimeout(() => onPaid(method), 1200) }
  const methods = [['wechat','微','微信支付','推荐使用'],['alipay','支','支付宝','安全快捷'],['card','卡','银行卡','尾号 6208']]
  return <section className="screen active"><div className="page-head"><button onClick={onBack}>‹</button><h1>支付订单</h1></div><div className="payment-body"><div className="pay-amount"><small>应付金额</small><strong>¥{service.price}</strong></div><div className="booking-summary"><img src={technician.img} alt={technician.name}/><span><b>{service.name}</b><small>{technician.name} · {schedule}</small></span></div><h2 className="sub-title">选择支付方式</h2><div className="pay-methods">{methods.map(([id,icon,name,note]) => <button key={id} className={`pay-method ${method === id ? 'selected' : ''}`} onClick={() => setMethod(id)}><i>{icon}</i><span><b>{name}</b><small>{note}</small></span><b>{method === id ? '✓' : ''}</b></button>)}</div><button className="primary" disabled={paying} onClick={pay}>{paying && <i className="pay-spinner"/>}{paying ? '支付处理中' : `确认支付 ¥${service.price}`}</button><p className="notice" style={{ textAlign: 'center' }}>演示支付不会产生真实扣款</p></div></section>
}
