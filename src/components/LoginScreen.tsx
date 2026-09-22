import { useEffect, useState } from 'react'
import type { LoginMethod } from '../api/auth'
import { Logo } from './Logo'

interface Props { onLogin: (phone: string, method: LoginMethod, credential: string) => Promise<void>; onRegister: (name: string, phone: string, password: string) => Promise<void>; onNotify: (message: string) => void }

export function LoginScreen({ onLogin, onRegister, onNotify }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [phone, setPhone] = useState('13800138000'), [name, setName] = useState(''), [code, setCode] = useState('888888'), [password, setPassword] = useState(''), [confirmPassword, setConfirmPassword] = useState('')
  const [method, setMethod] = useState<LoginMethod>('code'), [showPassword, setShowPassword] = useState(false), [error, setError] = useState(''), [countdown, setCountdown] = useState(0), [submitting, setSubmitting] = useState(false), [roleOpen, setRoleOpen] = useState(false)
  const accounts = [{ role: '用户', phone: '13800138000', icon: '客', note: '预约与订单跟踪' }, { role: '技师', phone: '13900139000', icon: '技', note: '接单与履约工作台' }, { role: '管理员', phone: '13700137000', icon: '管', note: '经营数据与平台管理 · 密码登录' }]
  const selectedAccount = accounts.find((account) => account.phone === phone) ?? { role: '自定义用户', phone, icon: '客', note: '使用注册时的密码登录' }
  const supportsDemoCode = phone === '13800138000' || phone === '13900139000'
  useEffect(() => { if (!supportsDemoCode && method === 'code') setMethod('password') }, [supportsDemoCode, method])
  useEffect(() => { if (!countdown) return; const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000); return () => window.clearTimeout(timer) }, [countdown])
  const getCode = () => { if (!/^1\d{10}$/.test(phone)) return setError('请先输入正确的手机号'); if (!supportsDemoCode) return setError('该账号请使用密码登录'); setError(''); setCountdown(60); onNotify('当前是演示模式：不会发送短信，请使用 888888') }
  const submit = async () => {
    if (submitting) return
    if (!/^1\d{10}$/.test(phone)) return setError('请输入正确的 11 位手机号')
    if (mode === 'register') {
      if (name.trim().length < 2) return setError('昵称至少需要 2 个字符')
      if (password.length < 6) return setError('密码至少需要 6 个字符')
      if (password !== confirmPassword) return setError('两次输入的密码不一致')
    } else if ((method === 'code' ? code : password).length < 4) return setError(`请输入正确的${method === 'code' ? '验证码' : '密码'}`)
    setError(''); setSubmitting(true)
    try { if (mode === 'register') await onRegister(name.trim(), phone, password); else await onLogin(phone, method, method === 'code' ? code : password) }
    catch (reason) { setError(reason instanceof Error ? reason.message : `${mode === 'register' ? '注册' : '登录'}失败，请稍后重试`) }
    finally { setSubmitting(false) }
  }
  return <section className="login-screen"><div className="login-brand"><Logo/><span>罗汉到家<p>专业技师，安心到家</p></span></div><div className="login-card"><div className="auth-mode"><button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError('') }}>登录</button><button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setPhone(''); setPassword(''); setError('') }}>注册用户</button></div><h1>{mode === 'login' ? '欢迎回来' : '创建用户账号'}</h1><p>{mode === 'login' ? '手机号是账号，可选择密码或演示验证码登录' : '注册后可跨设备查看自己的预约和订单'}</p>
    {mode === 'login' ? <><div className={`role-select ${roleOpen ? 'open' : ''}`}><label>演示身份</label><button type="button" className="role-select-trigger" aria-expanded={roleOpen} onClick={() => setRoleOpen((value) => !value)}><i>{selectedAccount.icon}</i><span><b>{selectedAccount.role}</b><small>{selectedAccount.note}</small></span><em>⌄</em></button><div className="role-dropdown" aria-hidden={!roleOpen}>{accounts.map((account) => <button type="button" key={account.phone} className={phone === account.phone ? 'active' : ''} aria-pressed={phone === account.phone} onClick={() => { setPhone(account.phone); setCode('888888'); setPassword(''); setMethod(account.role === '管理员' ? 'password' : 'code'); setError(''); setRoleOpen(false) }}><i>{account.icon}</i><span><b>{account.role}</b><small>{account.note}</small></span>{phone === account.phone && <em>✓</em>}</button>)}</div></div><div className="login-method-tabs" role="tablist" aria-label="登录方式"><button type="button" role="tab" aria-selected={method === 'password'} className={method === 'password' ? 'active' : ''} onClick={() => { setMethod('password'); setError('') }}>密码登录</button><button type="button" role="tab" aria-selected={method === 'code'} disabled={!supportsDemoCode} className={method === 'code' ? 'active' : ''} onClick={() => { setMethod('code'); setError('') }}>验证码登录</button></div></> : <div className="phone-field"><input aria-label="昵称" value={name} onChange={(event) => setName(event.target.value)} maxLength={20} placeholder="请输入昵称"/></div>}
    <div className="phone-field"><span>+86</span><input aria-label="手机号" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" maxLength={11} placeholder="请输入手机号"/></div>
    {mode === 'login' && method === 'code' ? <div className="code-row"><div className="phone-field" style={{ margin: 0 }}><input aria-label="演示验证码" value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" maxLength={6}/></div><button type="button" disabled={Boolean(countdown)} onClick={getCode}>{countdown ? `${countdown}s` : '获取验证码'}</button></div> : <><div className="phone-field password-field"><input aria-label="密码" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'register' ? '设置至少 6 位密码' : '请输入密码'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'}/><button type="button" aria-label={showPassword ? '隐藏密码' : '显示密码'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? '隐藏' : '显示'}</button></div>{mode === 'register' && <div className="phone-field"><input aria-label="确认密码" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="再次输入密码" autoComplete="new-password"/></div>}</>}
    {error && <p className="auth-error" aria-live="polite">{error}</p>}<button className="primary" disabled={submitting} style={{ marginTop: 18 }} onClick={submit}>{submitting ? '正在提交…' : mode === 'register' ? '注册并登录' : '登录'}</button><div className="login-note">{mode === 'register' ? '面试演示：暂不发送真实短信，注册信息会保存到云端示例数据库' : phone === '13700137000' ? '管理员使用独立密码，验证码不可登录' : method === 'code' ? '演示验证码：888888（不会发送短信）' : accounts.some((account) => account.phone === phone) ? '演示账号密码：Demo@2026' : '请使用注册时设置的密码登录'}</div></div></section>
}
