import { Logo } from './Logo'

export function DesktopShowcase() {
  return <aside className="desktop-showcase"><div className="show-logo"><Logo/>罗汉到家</div><h1>附近技师<br/>安心到家</h1><p>基于实时位置匹配专业技师，从预约、支付到上门服务，全流程清晰可追踪。</p><div className="show-points"><div className="show-point"><i>⌖</i><span><b>实时位置</b><br/><small>技师距离与路线动态更新</small></span></div><div className="show-point"><i>盾</i><span><b>平台保障</b><br/><small>实名认证与服务安全码</small></span></div><div className="show-point"><i>单</i><span><b>完整闭环</b><br/><small>预约、支付、跟踪与评价</small></span></div></div><div className="show-live"><i className="live-dot"/>右侧为可交互手机端原型</div></aside>
}
