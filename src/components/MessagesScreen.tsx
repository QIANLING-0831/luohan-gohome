import { useState } from 'react'

const messages = [['⌖','订单助手','技师已收到你的预约需求，预计 2 分钟内确认'],['券','限时福利','今晚下单，精油推背立减 30 元'],['盾','安全播报','平台本月已完成 8,320 次资质复核']]

export function MessagesScreen({ onNotify }: { onNotify: (message: string) => void }) {
  const [unread, setUnread] = useState(() => new Set(messages.map((_, index) => index)))
  const read = (index: number, title: string) => { setUnread((current) => { const next = new Set(current); next.delete(index); return next }); onNotify(`已查看「${title}」`) }
  const readAll = () => { setUnread(new Set()); onNotify('已全部标记为已读') }
  return <section className="screen active"><header><div className="brand">消息中心</div><button className="icon-btn" aria-label="全部已读" onClick={readAll}>✓</button></header><div className="hero-strip"><span><small>智能服务助手</small><b>{unread.size ? `你有 ${unread.size} 条新动态` : '消息已全部读完'}</b></span><strong>{unread.size}</strong></div><div className="message-list">{messages.map(([icon,title,copy], index) => <button className="message-card" key={title} onClick={() => read(index, title)}><span className="message-icon">{icon}</span><span><b>{title}</b><p>{copy}</p></span>{unread.has(index) && <i className="unread"/>}</button>)}</div></section>
}
