import { useEffect, useState } from 'react'

export function useSessionState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      // Authentication used to be persistent. Remove the legacy value so an
      // existing visitor also sees the login screen after this release.
      localStorage.removeItem(key)
      const stored = sessionStorage.getItem(key)
      return stored ? (JSON.parse(stored) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage can be unavailable in private browsing; state still works.
    }
  }, [key, value])

  return [value, setValue] as const
}
