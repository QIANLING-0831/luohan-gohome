import { clearApiSession, request, saveApiSession } from './client'

export interface SessionUser { id: string; phone: string; name: string; role: 'USER' | 'TECHNICIAN' | 'ADMIN' }
export type LoginMethod = 'code' | 'password'

export const authClient = {
  async login(phone: string, method: LoginMethod, credential: string) {
    const session = await request<{ token: string; user: SessionUser }>('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ phone, method, credential }),
    })
    saveApiSession(session.token)
    return session.user
  },
  async register(name: string, phone: string, password: string) {
    const session = await request<{ token: string; user: SessionUser }>('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, phone, password }) })
    saveApiSession(session.token)
    return session.user
  },
  me: () => request<SessionUser>('/api/auth/me'),
  logout: clearApiSession,
}
