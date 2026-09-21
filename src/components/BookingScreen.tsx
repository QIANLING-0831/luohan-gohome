import { useState } from 'react'
import type { Address, Service, Technician } from '../types'
import { futureDates } from '../data'

interface Props { technician: Technician; service: Service; initialDateIndex: number; initialTime: string; onBack: () => void; onContinue: (details: { dateLabel: string; time: string; intensity: string; address: Address; note: string }) => void }

const addresses: Address[] = [
  { id: 'home', label: '静安嘉里中心 · 2号楼', detail: '上海市静安区南京西路1515号' },
  { id: 'office', label: '恒隆广场 · 办公楼', detail: '上海市静安区南京西路1266号' },
  { id: 'hotel', label: '上海静安瑞吉酒店', detail: '上海市静安区北京西路1008号' },
]

export function BookingScreen({ technician, service, initialDateIndex, initialTime, onBack, onContinue }: Props) {
  const dates = futureDates(), times = ['15:00','16:30','18:00','19:00','20:30','22:00']
  const [dateIndex, setDateIndex] = useState(initialDateIndex), [time, setTime] = useState(initialTime), [intensity, setIntensity] = useState('适中')
  const [address, setAddress] = useState(addresses[0]), [addressOpen, setAddressOpen] = useState(false), [note, setNote] = useState('')
  const occupied = (day: number, item: string) => day === 0 && ['16:30','22:00'].includes(item) || day === 1 && item === '18:00'
  const selectDate = (index: number) => { setDateIndex(index); if (occupied(index, time)) setTime('19:00') }
  return <section className="screen active"><div className="page-head"><button onClick={onBack}>‹</button><h1>确认预约</h1></div><div className="form-body"><div className="stepper"><div className="book-step active"><i/>选择服务</div><div className="book-step active"><i/>预约时间</div><div className="book-step active"><i/>确认下单</div></div><div className="booking-summary"><img src={technician.img} alt={technician.name}/><span><b>{service.name}</b><small>{technician.name} · {service.desc.split(' · ')[0]}</small></span><span className="sum-price">¥{service.price}</span></div><div className="field"><label>选择日期</label><div className="date-row">{dates.map((date, index) => <button key={date.value} className={`choice ${dateIndex === index ? 'selected' : ''}`} onClick={() => selectDate(index)}><small>{date.label}</small><strong>{date.value}</strong></button>)}</div></div><div className="field"><label>选择上门时间 <small className="field-hint">档期实时更新</small></label><div className="time-grid">{times.map((item) => { const unavailable = occupied(dateIndex, item); return <button key={item} disabled={unavailable} className={`choice ${time === item ? 'selected' : ''}`} onClick={() => !unavailable && setTime(item)}>{item}{unavailable && <small>已约满</small>}</button> })}</div></div><div className="field"><label>偏好力度</label><div className="intensity">{['轻柔','适中','偏重'].map((item) => <button key={item} className={`choice ${intensity === item ? 'selected' : ''}`} onClick={() => setIntensity(item)}>{item}</button>)}</div></div><div className="field"><label>服务地址</label><button className="address-card" onClick={() => setAddressOpen(true)}><span>⌖</span><span><b>{address.label}</b><small>{address.detail}</small></span><strong>更换 ›</strong></button></div><div className="field"><label>给技师留言 <small className="field-hint">选填</small></label><textarea className="note-input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="如：肩颈比较疲劳，请提前电话联系" maxLength={80}/><div className="input-count">{note.length}/80</div></div><p className="notice">技师到达前 30 分钟可免费取消。平台全程隐私保护，服务过程支持紧急联系。</p><div className="paybar"><div className="total">合计<br/><strong>¥{service.price}</strong></div><button className="primary" onClick={() => onContinue({ dateLabel: `${dates[dateIndex].label} ${dates[dateIndex].value}`, time, intensity, address, note })}>确认并支付</button></div></div>
    <div className={`sheet-mask ${addressOpen ? 'open' : ''}`} onClick={() => setAddressOpen(false)}><div className="sheet" onClick={(event) => event.stopPropagation()}><div className="grab"/><h2>选择服务地址</h2><div className="address-options">{addresses.map((item) => <button key={item.id} className={`address-option ${address.id === item.id ? 'selected' : ''}`} onClick={() => { setAddress(item); setAddressOpen(false) }}><i>⌖</i><span><b>{item.label}</b><small>{item.detail}</small></span><strong>{address.id === item.id ? '✓' : '›'}</strong></button>)}</div><button className="secondary add-address" onClick={() => setAddressOpen(false)}>＋ 新增地址（演示）</button></div></div>
  </section>
}
