import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { services, technicians as seedTechnicians } from './data'
import type { Address, Order, Screen, Service, Technician } from './types'
import { useSessionState } from './hooks/useSessionState'
import { DesktopShowcase } from './components/DesktopShowcase'
import { LoginScreen } from './components/LoginScreen'
import { HomeScreen } from './components/HomeScreen'
import { TechnicianDetail } from './components/TechnicianDetail'
import type { AppointmentSlot } from './components/TechnicianDetail'
import { BookingScreen } from './components/BookingScreen'
import { PaymentScreen } from './components/PaymentScreen'
import { SuccessScreen } from './components/SuccessScreen'
import { OrdersScreen } from './components/OrdersScreen'
import { MessagesScreen } from './components/MessagesScreen'
import { ProfileScreen } from './components/ProfileScreen'
import { BottomNav } from './components/BottomNav'
import { authClient } from './api/auth'
import type { LoginMethod, SessionUser } from './api/auth'
import { ApiUnavailableError, hasApiSession, SESSION_EXPIRED_EVENT } from './api/client'
import { technicianClient } from './api/technicians'
import { orderClient } from './api/orders'
import { serviceClient } from './api/services'
import { profileClient } from './api/profile'
import type { UserProfile } from './api/profile'
import { AdminConsole } from './components/AdminConsole'
import { TechnicianWorkbench } from './components/TechnicianWorkbench'
import { ChangePasswordDialog } from './components/ChangePasswordDialog'

interface BookingDraft { dateLabel: string; dateKey: string; time: string; intensity: string; address: Address; note: string }
interface Settlement { discount: number; paidAmount: number; couponLabel: string }
const defaultAddress: Address = { id: 'home', label: '静安嘉里中心 · 2号楼', detail: '上海市静安区南京西路1515号' }
const offlineDemoEnabled = import.meta.env.DEV

export function App() {
  const [authenticated, setAuthenticated] = useSessionState('luohan_auth_v2', false)
  const [sessionUser, setSessionUser] = useSessionState<SessionUser | null>('luohan_session_user_v1', null)
  const [order, setOrder] = useState<Order | null>(null)
  const [userOrders, setUserOrders] = useState<Order[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [screen, setScreen] = useState<Screen>('home')
  const [technicians, setTechnicians] = useState(seedTechnicians)
  const [availableServices, setAvailableServices] = useState(services)
  const [selectedTechId, setSelectedTechId] = useState(seedTechnicians[0].id)
  const [selectedService, setSelectedService] = useState<Service>(services[0])
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot>({ dateIndex: 0, dateLabel: '今天', time: '19:00' })
  const [draft, setDraft] = useState<BookingDraft>({ dateLabel: '今天', dateKey: '', time: '19:00', intensity: '适中', address: defaultAddress, note: '' })
  const [toast, setToast] = useState('')
  const [passwordOpen, setPasswordOpen] = useState(false)
  const toastTimer = useRef<number | null>(null)
  const paymentRequestId = useRef(crypto.randomUUID())
  const technician = technicians.find((item) => item.id === selectedTechId) ?? technicians[0]
  const orderTechnician = order ? technicians.find((item) => item.id === order.techId) : undefined
  const orderService = order ? availableServices.find((item) => item.id === order.serviceId) : undefined
  const technicianServices = availableServices.filter((item) => !technician.serviceIds || technician.serviceIds.includes(item.id))

  useEffect(() => {
    if (!authenticated || sessionUser?.role !== 'USER' || !hasApiSession()) return
    let cancelled = false
    Promise.all([technicianClient.list(), orderClient.list(), serviceClient.list(), profileClient.get()]).then(([remoteTechnicians, remoteOrders, remoteServices, remoteProfile]) => {
      if (cancelled) return
      setTechnicians(remoteTechnicians.map((item) => ({
        ...item,
        img: item.imageKey.startsWith('data:image/') ? item.imageKey : item.imageKey === 'default' ? '/luohan-logo.jpg' : seedTechnicians.find((seed) => seed.id === item.id)?.img ?? seedTechnicians[0].img,
      })))
      setAvailableServices(remoteServices)
      setOrder(remoteOrders[0] ?? null)
      setUserOrders(remoteOrders)
      setProfile(remoteProfile)
    }).catch(() => {
      if (!cancelled) notify('个人数据暂时无法同步，请刷新重试')
    })
    return () => { cancelled = true }
  }, [authenticated, sessionUser?.id])

  useEffect(() => {
    if (!authenticated) return
    if (!hasApiSession()) {
      setAuthenticated(false); setSessionUser(null); setOrder(null); setUserOrders([]); setProfile(null); setScreen('home')
      return
    }
    let cancelled = false
    authClient.me().then((user) => { if (!cancelled) setSessionUser(user) }).catch(() => {
      if (cancelled) return
      authClient.logout(); setAuthenticated(false); setSessionUser(null)
    })
    return () => { cancelled = true }
  }, [authenticated, setAuthenticated, setSessionUser])

  useEffect(() => {
    if (!authenticated || sessionUser?.role !== 'USER' || !hasApiSession() || !['orders', 'messages'].includes(screen)) return
    let cancelled = false
    const refreshOrders = () => orderClient.list().then((next) => {
      if (cancelled) return
      setUserOrders(next)
      setOrder((current) => next.find((item) => item.id === current?.id) ?? next[0] ?? null)
    }).catch(() => { /* Keep the last successful snapshot and retry later. */ })
    void refreshOrders()
    const timer = window.setInterval(refreshOrders, 20000)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [authenticated, sessionUser?.id, sessionUser?.role, screen])

  useEffect(() => {
    const timer = setInterval(() => setTechnicians((current) => current.map((tech) => ({ ...tech, lat: tech.lat + (Math.random() - .5) * .00035, lng: tech.lng + (Math.random() - .5) * .00035 }))), 2200)
    return () => clearInterval(timer)
  }, [])

  const notify = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 1800)
  }, [])
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current) }, [])
  useEffect(() => {
    if (!['booking', 'payment'].includes(screen)) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [screen])
  useEffect(() => {
    const expire = () => { setAuthenticated(false); setSessionUser(null); setOrder(null); setUserOrders([]); setProfile(null); setPasswordOpen(false); setScreen('home'); notify('登录状态已失效，请重新登录') }
    window.addEventListener(SESSION_EXPIRED_EVENT, expire)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expire)
  }, [notify, setAuthenticated, setSessionUser])
  const navigate = (next: Screen) => {
    const update = () => setScreen(next)
    if ('startViewTransition' in document) (document as Document & { startViewTransition: (callback: () => void) => void }).startViewTransition(update)
    else update()
  }
  const openTechnician = (id: number) => { const tech = technicians.find((item) => item.id === id); setSelectedTechId(id); setSelectedService(availableServices.find((item) => !tech?.serviceIds || tech.serviceIds.includes(item.id)) ?? availableServices[0] ?? services[0]); setSelectedSlot({ dateIndex: 0, dateLabel: '今天', time: '19:00' }); navigate('detail') }
  const pay = async (paymentMethod: string, settlement: Settlement) => {
    const localOrder: Order = { id: `LH${Date.now().toString().slice(-8)}`, techId: technician.id, serviceId: selectedService.id, ...draft, paymentMethod, status: 0, etaSeconds: 720, originalPrice: selectedService.price, ...settlement }
    let nextOrder = localOrder
    if (hasApiSession()) {
      try {
        nextOrder = await orderClient.create({ technicianId: technician.id, serviceId: selectedService.id, ...draft, paymentMethod, ...settlement, requestId: paymentRequestId.current })
      } catch (error) {
        if (!(error instanceof ApiUnavailableError)) {
          notify(error instanceof Error ? error.message : '下单失败，请稍后重试')
          throw error
        }
        if (!offlineDemoEnabled) { notify('服务暂时不可用，订单未提交，请稍后重试'); throw new Error('服务暂时不可用，订单未提交') }
        notify('后端暂时离线，本次订单保存在当前设备')
      }
    }
    paymentRequestId.current = crypto.randomUUID()
    setOrder(nextOrder); setUserOrders((current) => current.some((item) => item.id === nextOrder.id) ? current : [nextOrder, ...current]); navigate('success'); notify('支付成功，预约已提交')
  }
  const updateOrder = useCallback((next: Order) => {
    setOrder(next)
    setUserOrders((current) => current.map((item) => item.id === next.id ? next : item))
  }, [])
  const cancelOrder = useCallback(() => {
    const current = order
    if (!current) return
    const cancelled = { ...current, status: 6 }
    setOrder(cancelled)
    setUserOrders((items) => items.map((item) => item.id === current.id ? cancelled : item))
    notify('订单已取消，退款将原路退回')
    if (hasApiSession()) orderClient.cancel(current.id).catch((error) => {
      setOrder(current)
      setUserOrders((items) => items.map((item) => item.id === current.id ? current : item))
      notify(error instanceof Error ? error.message : '取消订单失败')
    })
  }, [order, setOrder])
  const reviewOrder = useCallback(async (current: Order, rating: number, tags: string[], text: string) => {
    try {
      const updated = await orderClient.review(current.id, { rating, tags, text })
      setOrder(updated); setUserOrders((items) => items.map((item) => item.id === updated.id ? updated : item))
    } catch (error) { notify(error instanceof Error ? error.message : '评价提交失败'); throw error }
  }, [notify])
  const login = async (phone: string, method: LoginMethod, credential: string) => {
    try {
      const user = await authClient.login(phone, method, credential)
      setOrder(null); setUserOrders([]); setProfile(null)
      setSessionUser(user)
      setAuthenticated(true); notify('登录成功，数据已与后端同步')
    } catch (error) {
      if (!(error instanceof ApiUnavailableError)) throw error
      if (!offlineDemoEnabled) throw new Error('服务暂时不可用，请稍后重试')
      const demoCredentials: Record<string, { code?: string; password: string }> = {
        '13800138000': { code: '888888', password: 'Demo@2026' },
        '13900139000': { code: '888888', password: 'Demo@2026' },
        '13700137000': { password: 'Luohan@2026' },
      }
      const account = demoCredentials[phone]
      if (!account || credential !== account[method]) throw new Error('账号或凭据不正确')
      const role: SessionUser['role'] = phone === '13700137000' ? 'ADMIN' : phone === '13900139000' ? 'TECHNICIAN' : 'USER'
      setSessionUser({ id: `offline-${role}`, phone, name: role === 'ADMIN' ? '平台管理员' : role === 'TECHNICIAN' ? '陈静技师' : '罗女士', role })
      setOrder(null); setUserOrders([]); setProfile(null)
      setAuthenticated(true); notify('后端未启动，已进入本机演示模式')
    }
  }
  const register = async (name: string, phone: string, password: string) => {
    const user = await authClient.register(name, phone, password)
    setOrder(null); setUserOrders([]); setProfile(null)
    setSessionUser(user); setAuthenticated(true); notify('注册成功，欢迎使用罗汉到家')
  }
  const logout = () => { authClient.logout(); setAuthenticated(false); setSessionUser(null); setOrder(null); setUserOrders([]); setProfile(null); setPasswordOpen(false); navigate('home') }
  const toggleFavorite = async (tech: Technician) => {
    if (!profile) return notify('收藏尚未加载，请稍后重试')
    try {
      const { favorite } = await profileClient.toggleFavorite(tech.id)
      setProfile((current) => current ? { ...current, favoriteIds: favorite ? [...new Set([...(current.favoriteIds ?? []), tech.id])] : (current.favoriteIds ?? []).filter((id) => id !== tech.id) } : current)
      notify(favorite ? `已收藏 ${tech.name}` : `已取消收藏 ${tech.name}`)
    } catch (error) { notify(error instanceof Error ? error.message : '收藏操作失败，请重试') }
  }
  const rebook = (techId: number, serviceId: string) => { const service = availableServices.find((item) => item.id === serviceId) ?? availableServices[0] ?? services[0]; setSelectedTechId(techId); setSelectedService(service); setSelectedSlot({ dateIndex: 0, dateLabel: '今天', time: '19:00' }); navigate('booking'); notify('已载入历史预约配置') }
  const showNav = ['home','orders','messages','profile'].includes(screen)

  const content = useMemo(() => {
    if (screen === 'detail') return <TechnicianDetail technician={technician} services={technicianServices} selected={selectedService} selectedSlot={selectedSlot} onSelect={setSelectedService} onSlotSelect={(slot) => { setSelectedSlot(slot); notify(`已选择 ${slot.dateLabel} ${slot.time}`) }} onBack={() => navigate('home')} onBook={() => navigate('booking')}/>
    if (screen === 'booking') return <BookingScreen technician={technician} service={selectedService} addresses={profile?.addresses ?? []} initialDateIndex={selectedSlot.dateIndex} initialTime={selectedSlot.time} onBack={() => navigate('detail')} onContinue={(next) => { setDraft(next); navigate('payment') }}/>
    if (screen === 'payment') return <PaymentScreen technician={technician} service={selectedService} schedule={`${draft.dateLabel} ${draft.time}`} onBack={() => navigate('booking')} onPaid={pay}/>
    if (screen === 'success' && order) return <SuccessScreen order={order} technician={technician} onTrack={() => navigate('orders')} onHome={() => navigate('home')}/>
    if (screen === 'orders') return <OrdersScreen order={order} orders={userOrders} technicians={technicians} services={availableServices} technician={orderTechnician} service={orderService} onSelect={setOrder} onHome={() => navigate('home')} onUpdate={updateOrder} onCancel={cancelOrder} onReview={reviewOrder} onNotify={notify}/>
    if (screen === 'messages' && sessionUser) return <MessagesScreen user={sessionUser} orders={userOrders} technicians={technicians} services={availableServices} onOpenOrder={(next) => { setOrder(next); navigate('orders') }} onNotify={notify}/>
    if (screen === 'profile' && sessionUser) return <ProfileScreen key={sessionUser.id} user={sessionUser} profile={profile} orders={userOrders} technicians={technicians} services={availableServices} onProfileChange={setProfile} onNotify={notify} onRebook={rebook} onLogout={logout} onChangePassword={() => setPasswordOpen(true)}/>
    return <HomeScreen technicians={technicians} favorites={profile?.favoriteIds ?? []} onToggleFavorite={(tech) => void toggleFavorite(tech)} onOpen={openTechnician} onNavigate={navigate}/>
  }, [screen, technician, technicianServices, selectedService, selectedSlot, draft, order, orderTechnician, orderService, technicians, availableServices, sessionUser, profile, userOrders, updateOrder, cancelOrder, reviewOrder])

  const passwordDialog = <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} onChanged={() => { logout(); notify('密码修改成功，请使用新密码重新登录') }}/>
  if (authenticated && sessionUser?.role === 'ADMIN') return <><AdminConsole user={sessionUser} onLogout={logout} onChangePassword={() => setPasswordOpen(true)} onNotify={notify}/>{passwordDialog}<div className={`toast global-toast ${toast ? 'show' : ''}`}>{toast}</div></>
  if (authenticated && sessionUser?.role === 'TECHNICIAN') return <><TechnicianWorkbench user={sessionUser} onLogout={logout} onChangePassword={() => setPasswordOpen(true)} onNotify={notify}/>{passwordDialog}<div className={`toast global-toast ${toast ? 'show' : ''}`}>{toast}</div></>
  return <><DesktopShowcase/><main className="app">{!authenticated ? <LoginScreen onNotify={notify} onLogin={login} onRegister={register}/> : <>{content}{showNav && <BottomNav screen={screen} onNavigate={navigate}/>}</>}<div className={`toast ${toast ? 'show' : ''}`}>{toast}</div></main>{authenticated && passwordDialog}</>
}
