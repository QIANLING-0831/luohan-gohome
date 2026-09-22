const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const TOKEN_KEY = 'luohan_access_token_v1'
export const SESSION_EXPIRED_EVENT = 'luohan:session-expired'

// One-time migration from the old persistent-login implementation.
try { localStorage.removeItem(TOKEN_KEY) } catch { /* Storage may be unavailable. */ }

export class ApiError extends Error {
  constructor(message: string, public code = 'REQUEST_FAILED', public status = 0) { super(message) }
}

export class ApiUnavailableError extends ApiError {
  constructor() { super('后端暂时不可用，已切换到本机演示模式', 'API_UNAVAILABLE') }
}

export function hasApiSession() { return Boolean(sessionStorage.getItem(TOKEN_KEY)) }
export function clearApiSession() { sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY) }
export function saveApiSession(token: string) { localStorage.removeItem(TOKEN_KEY); sessionStorage.setItem(TOKEN_KEY, token) }

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 5000)
  try {
    const token = sessionStorage.getItem(TOKEN_KEY)
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
    })
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json') && response.status !== 204) throw new ApiUnavailableError()
    const body = response.status === 204 ? null : await response.json()
    if (!response.ok) {
      if (response.status === 401 && token) {
        clearApiSession()
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
      }
      throw new ApiError(body?.error?.message ?? '请求失败', body?.error?.code, response.status)
    }
    return body?.data as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiUnavailableError()
  } finally {
    window.clearTimeout(timer)
  }
}
