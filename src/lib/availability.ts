export const bookingTimes = ['10:00', '11:30', '13:30', '15:00', '16:30', '18:00', '19:00', '20:30', '22:00']
export function fitsServiceBeforeEnd(start: string, duration: number, workEnd: string) {
  const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5))
  return minutes(start) + duration <= minutes(workEnd)
}
export function overlapsBooking(dateKey: string, start: string, duration: number, bookings: Array<{ slot: string; duration: number }>) {
  const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5))
  const candidateStart = minutes(start), candidateEnd = candidateStart + duration
  return bookings.some((booking) => { const [bookingDate, bookingTime] = booking.slot.split('|'); if (bookingDate !== dateKey) return false; const existingStart = minutes(bookingTime), existingEnd = existingStart + booking.duration; return existingStart < candidateEnd && existingEnd > candidateStart })
}

function beijingParts(date = new Date()) {
  const values = Object.fromEntries(new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).map((item) => [item.type, item.value]))
  return { dateKey: `${values.year}-${values.month}-${values.day}`, minutes: Number(values.hour) * 60 + Number(values.minute) }
}
export function bookingDates() {
  const now = beijingParts()
  const anchor = new Date(`${now.dateKey}T00:00:00+08:00`)
  return Array.from({ length: 3 }, (_, index) => { const date = new Date(anchor.getTime() + index * 86400000); const dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date); const [, month, day] = dateKey.split('-'); return { label: index === 0 ? '今天' : index === 1 ? '明天' : '后天', value: `${Number(month)}/${Number(day)}`, dateKey } })
}
export function slotIsPast(dateKey: string, time: string) { const now = beijingParts(); if (dateKey !== now.dateKey) return dateKey < now.dateKey; const [hour, minute] = time.split(':').map(Number); return hour * 60 + minute <= now.minutes }
export function weekdayForDate(dateKey: string) { return new Date(`${dateKey}T12:00:00+08:00`).getUTCDay() }
