import { useState } from 'react'
import { Logo } from './Logo'

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [phone, setPhone] = useState('13800138000')
  const [code, setCode] = useState('888888')
  const [error, setError] = useState('')
  const submit = () => {
    if (!/^1\d{10}$/.test(phone) || code.length < 4) return setError('请输入正确的手机号和验证码')
    onLogin()
  }
  return <section className="login-screen">
    <div className="login-brand"><Logo/><span>罗汉到家<p>专业技师，安心到家</p></span></div>
    <div className="login-card"><h1>欢迎回来</h1><p>登录后预约技师并查看服务进度</p>
      <div className="phone-field"><span>+86</span><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" maxLength={11}/></div>
      <div className="code-row"><div className="phone-field" style={{ margin: 0 }}><input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6}/></div><button type="button">获取验证码</button></div>
      {error && <p style={{ color: '#c65342', marginTop: 12 }}>{error}</p>}
      <button className="primary" style={{ marginTop: 18 }} onClick={submit}>登录 / 注册</button><div className="login-note">演示账号已预填，点击即可登录</div>
    </div>
  </section>
}
