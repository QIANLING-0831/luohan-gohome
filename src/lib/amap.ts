import AMapLoader from '@amap/amap-jsapi-loader'

let loader: Promise<any> | null = null

export function loadAMap() {
  if (!loader) {
    const key = import.meta.env.VITE_AMAP_KEY?.trim()
    if (!key) return Promise.reject(new Error('未配置高德地图 Key'))

    const securityCode = import.meta.env.VITE_AMAP_SECURITY_CODE?.trim()
    if (securityCode) {
      ;(window as typeof window & { _AMapSecurityConfig?: { securityJsCode: string } })._AMapSecurityConfig = {
        securityJsCode: securityCode,
      }
    }

    const sdk = AMapLoader.load({
      key,
      version: '2.0',
      plugins: ['AMap.Scale', 'AMap.ToolBar'],
    })

    const timeout = new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error('高德地图加载超时')), 8000)
    })

    loader = Promise.race([sdk, timeout]).catch((error) => {
      loader = null
      throw error
    })
  }
  return loader
}
