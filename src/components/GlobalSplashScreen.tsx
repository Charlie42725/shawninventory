'use client'

import { useEffect, useState } from 'react'
import SplashScreen from './SplashScreen'

export default function GlobalSplashScreen({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true)
  const [isFirstVisit, setIsFirstVisit] = useState(false)

  useEffect(() => {
    // 檢查是否是首次訪問 (這個 session)
    const hasVisited = sessionStorage.getItem('hasVisited')

    if (!hasVisited) {
      // 首次訪問,顯示 Splash Screen
      setIsFirstVisit(true)
      sessionStorage.setItem('hasVisited', 'true')
    } else {
      // 不是首次訪問,直接顯示內容
      setShowSplash(false)
    }
  }, [])

  if (isFirstVisit && showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />
  }

  return <>{children}</>
}
