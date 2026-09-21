import { useCallback, useEffect, useMemo, useState } from 'react'
import { services, technicians as seedTechnicians } from './data'
import type { Address, Order, Screen, Service } from './types'
import { usePersistedState } from './hooks/usePersistedState'
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

interface BookingDraft { dateLabel: string; time: string; intensity: string; address: Address; note: string }
interface Settlement { discount: number; paidAmount: number; couponLabel: string }
const defaultAddress: Address = { id: 'home', label: '静安嘉里中心 · 2号楼', detail: '上海市静安区南京西路1515号' }

export function App() {
  const [authenticated, setAuthenticated] = usePersistedState('luohan_auth_v2', false)
  const [order, setOrder] = usePersistedState<Order | null>('luohan_order_v2', null)
  const [screen, setScreen] = useState<Screen>('home')
  const [technicians, setTechnicians] = useState(seedTechnicians)
  const [selectedTechId, setSelectedTechId] = useState(seedTechnicians[0].id)
  const [selectedService, setSelectedService] = useState<Service>(services[0])
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot>({ dateIndex: 0, dateLabel: '今天', time: '19:00' })
  const [draft, setDraft] = useState<BookingDraft>({ dateLabel: '今天', time: '19:00', intensity: '适中', address: defaultAddress, note: '' })
  const [toast, setToast] = useState('')
  const technician = technicians.find((item) => item.id === selectedTechId) ?? technicians[0]
  const orderTechnician = order ? technicians.find((item) => item.id === order.techId) : undefined
  const orderService = order ? services.find((item) => item.id === order.serviceId) : undefined

  useEffect(() => {
    const timer = setInterval(() => setTechnicians((current) => current.map((tech) => ({ ...tech, lat: tech.lat + (Math.random() - .5) * .00035, lng: tech.lng + (Math.random() - .5) * .00035 }))), 2200)
    return () => clearInterval(timer)
  }, [])

  const notify = (message: string) => { setToast(message); setTimeout(() => setToast(''), 1800) }
  const navigate = (next: Screen) => {
    const update = () => setScreen(next)
    if ('startViewTransition' in document) (document as Document & { startViewTransition: (callback: () => void) => void }).startViewTransition(update)
    else update()
  }
  const openTechnician = (id: number) => { setSelectedTechId(id); setSelectedService(services[0]); setSelectedSlot({ dateIndex: 0, dateLabel: '今天', time: '19:00' }); navigate('detail') }
  const pay = (paymentMethod: string, settlement: Settlement) => {
    const nextOrder: Order = { id: `LH${Date.now().toString().slice(-8)}`, techId: technician.id, serviceId: selectedService.id, ...draft, paymentMethod, status: 0, etaSeconds: 720, originalPrice: selectedService.price, ...settlement }
    setOrder(nextOrder); navigate('success'); notify('支付成功，预约已提交')
  }
  const updateOrder = useCallback((next: Order) => setOrder(next), [setOrder])
  const rebook = (techId: number, serviceId: string) => { const service = services.find((item) => item.id === serviceId) ?? services[0]; setSelectedTechId(techId); setSelectedService(service); setSelectedSlot({ dateIndex: 0, dateLabel: '今天', time: '19:00' }); navigate('booking'); notify('已载入历史预约配置') }
  const showNav = ['home','orders','messages','profile'].includes(screen)

  const content = useMemo(() => {
    if (screen === 'detail') return <TechnicianDetail technician={technician} services={services} selected={selectedService} selectedSlot={selectedSlot} onSelect={setSelectedService} onSlotSelect={(slot) => { setSelectedSlot(slot); notify(`已选择 ${slot.dateLabel} ${slot.time}`) }} onBack={() => navigate('home')} onBook={() => navigate('booking')}/>
    if (screen === 'booking') return <BookingScreen technician={technician} service={selectedService} initialDateIndex={selectedSlot.dateIndex} initialTime={selectedSlot.time} onBack={() => navigate('detail')} onContinue={(next) => { setDraft(next); navigate('payment') }}/>
    if (screen === 'payment') return <PaymentScreen technician={technician} service={selectedService} schedule={`${draft.dateLabel} ${draft.time}`} onBack={() => navigate('booking')} onPaid={pay}/>
    if (screen === 'success' && order) return <SuccessScreen order={order} technician={technician} onTrack={() => navigate('orders')} onHome={() => navigate('home')}/>
    if (screen === 'orders') return <OrdersScreen order={order} technician={orderTechnician} service={orderService} onHome={() => navigate('home')} onUpdate={updateOrder} onCancel={() => { setOrder(null); notify('订单已取消，退款将原路退回') }} onNotify={notify}/>
    if (screen === 'messages') return <MessagesScreen onNotify={notify}/>
    if (screen === 'profile') return <ProfileScreen order={order} technician={orderTechnician} service={orderService} onNotify={notify} onRebook={rebook} onLogout={() => { setAuthenticated(false); navigate('home') }}/>
    return <HomeScreen technicians={technicians} onOpen={openTechnician} onNavigate={navigate} onNotify={notify}/>
  }, [screen, technician, selectedService, selectedSlot, draft, order, orderTechnician, orderService, technicians, updateOrder])

  return <><DesktopShowcase/><main className="app">{!authenticated ? <LoginScreen onNotify={notify} onLogin={() => { setAuthenticated(true); notify('登录成功，欢迎回来') }}/> : <>{content}{showNav && <BottomNav screen={screen} onNavigate={navigate}/>}</>}<div className={`toast ${toast ? 'show' : ''}`}>{toast}</div></main></>
}
