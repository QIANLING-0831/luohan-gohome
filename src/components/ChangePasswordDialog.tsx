import { useEffect, useState } from 'react'
import { authClient } from '../api/auth'

interface Props { open: boolean; onClose: () => void; onChanged: () => void }

export function ChangePasswordDialog({ open, onClose, onChanged }: Props) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (!open) { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setError(''); setShowPassword(false) } }, [open])
  const save = async () => {
    if (currentPassword.length < 6) return setError('请输入正确的当前密码')
    if (newPassword.length < 6) return setError('新密码至少需要 6 位')
    if (newPassword !== confirmPassword) return setError('两次输入的新密码不一致')
    if (currentPassword === newPassword) return setError('新密码不能与当前密码相同')
    setSaving(true); setError('')
    try { await authClient.changePassword(currentPassword, newPassword); onChanged(); onClose() }
    catch (reason) { setError(reason instanceof Error ? reason.message : '密码修改失败，请稍后重试') }
    finally { setSaving(false) }
  }
  return <div className={`account-dialog-mask ${open ? 'open' : ''}`} onClick={onClose}><section className="account-dialog" role="dialog" aria-modal="true" aria-label="修改登录密码" onClick={(event) => event.stopPropagation()}><header><span><small>账户安全</small><h2>修改登录密码</h2></span><button aria-label="关闭修改密码" onClick={onClose}>×</button></header><p>修改后请使用新密码登录。公共演示账号为保证面试访问，不允许修改。</p><label><span>当前密码</span><input aria-label="当前密码" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)}/></label><label><span>新密码</span><input aria-label="新密码" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="6–64 位"/></label><label><span>确认新密码</span><input aria-label="确认新密码" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)}/></label><button className="password-visibility" type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? '隐藏密码' : '显示密码'}</button>{error && <div className="account-dialog-error" role="alert">{error}</div>}<footer><button onClick={onClose}>取消</button><button className="primary" disabled={saving} onClick={() => void save()}>{saving ? '保存中…' : '确认修改'}</button></footer></section></div>
}
