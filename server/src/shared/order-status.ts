export const orderStatuses = ['PENDING', 'ACCEPTED', 'DEPARTED', 'ARRIVED', 'IN_SERVICE', 'COMPLETED'] as const
export type OrderStatus = typeof orderStatuses[number]

export function nextOrderStatus(current: string) {
  const index = orderStatuses.indexOf(current as OrderStatus)
  return index >= 0 && index < orderStatuses.length - 1 ? orderStatuses[index + 1] : null
}

export function statusIndex(status: string) {
  return Math.max(0, orderStatuses.indexOf(status as OrderStatus))
}
